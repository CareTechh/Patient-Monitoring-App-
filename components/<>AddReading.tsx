import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Activity, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { Textarea } from './ui/textarea';
import { vitalsAPI, patientsAPI } from '../utils/api';
import { toast } from 'sonner@2.0.3';

interface AddReadingProps {
  user: { id: string; name: string; role: string; email: string };
  onNavigate: (page: any) => void;
  onLogout: () => void;
}

export default function AddReading({ user, onNavigate, onLogout }: AddReadingProps) {
  const [formData, setFormData] = useState({
    patientId: '',
    heartRate: '',
    systolic: '',
    diastolic: '',
    spo2: '',
    temperature: '',
    notes: ''
  });

  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const { patients } = await patientsAPI.getAll();
      setPatients(patients || []);
    } catch (error) {
      console.error('Error loading patients:', error);
      toast.error('Failed to load patients');
    } finally {
      setLoadingPatients(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.patientId) {
      toast.error('Please select a patient');
      return;
    }

    if (!formData.heartRate && !formData.systolic && !formData.spo2 && !formData.temperature) {
      toast.error('Please enter at least one vital reading');
      return;
    }

    setLoading(true);

    try {
      const bloodPressure = formData.systolic && formData.diastolic 
        ? `${formData.systolic}/${formData.diastolic}`
        : undefined;

      const result = await vitalsAPI.add({
        patientId: formData.patientId,
        heartRate: formData.heartRate ? parseInt(formData.heartRate) : undefined,
        bloodPressure,
        oxygenLevel: formData.spo2 ? parseInt(formData.spo2) : undefined,
        temperature: formData.temperature ? parseFloat(formData.temperature) : undefined,
        notes: formData.notes
      });

      setSubmitted(true);
      
      if (result.alerts && result.alerts.length > 0) {
        toast.warning(`Vitals recorded with ${result.alerts.length} alert(s) generated`);
      } else {
        toast.success('Vital signs recorded successfully!');
      }

      // Reset form after 2 seconds
      setTimeout(() => {
        setSubmitted(false);
        setFormData({
          patientId: '',
          heartRate: '',
          systolic: '',
          diastolic: '',
          spo2: '',
          temperature: '',
          notes: ''
        });
      }, 2000);

    } catch (error: any) {
      console.error('Error recording vitals:', error);
      toast.error(error.message || 'Failed to record vital signs');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onNavigate('dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => onNavigate('dashboard')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-slate-900">Add New Reading</h1>
              <p className="text-sm text-slate-600">Record patient vital signs</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {submitted && (
          <Alert className="mb-6 bg-emerald-50 border-emerald-200">
            <Check className="w-4 h-4 text-emerald-600" />
            <AlertDescription className="text-emerald-900">
              Reading saved successfully! Data has been recorded.
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900">Patient Vital Signs</CardTitle>
            <CardDescription>Select patient and record vital measurements</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Patient Selection */}
              <div className="space-y-2">
                <Label htmlFor="patient">Select Patient *</Label>
                {loadingPatients ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-slate-600">Loading patients...</span>
                  </div>
                ) : (
                  <Select 
                    value={formData.patientId} 
                    onValueChange={(value) => setFormData({ ...formData, patientId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.length === 0 ? (
                        <SelectItem value="none" disabled>No patients found - Create a patient account first</SelectItem>
                      ) : (
                        patients.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.name} ({patient.email})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Vital Signs */}
              <div className="space-y-4">
                <h3 className="text-slate-900">Vital Signs</h3>
                <p className="text-sm text-slate-500">Enter at least one vital measurement</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="heartRate">Heart Rate (bpm)</Label>
                    <Input
                      id="heartRate"
                      type="number"
                      placeholder="e.g., 72"
                      value={formData.heartRate}
                      onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
                    />
                    <p className="text-xs text-slate-500">Normal: 60-100 bpm</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="spo2">SpO₂ Level (%)</Label>
                    <Input
                      id="spo2"
                      type="number"
                      placeholder="e.g., 98"
                      value={formData.spo2}
                      onChange={(e) => setFormData({ ...formData, spo2: e.target.value })}
                      min="0"
                      max="100"
                    />
                    <p className="text-xs text-slate-500">Normal: 95-100%</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Blood Pressure (mmHg)</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="number"
                      placeholder="Systolic (e.g., 120)"
                      value={formData.systolic}
                      onChange={(e) => setFormData({ ...formData, systolic: e.target.value })}
                    />
                    <Input
                      type="number"
                      placeholder="Diastolic (e.g., 80)"
                      value={formData.diastolic}
                      onChange={(e) => setFormData({ ...formData, diastolic: e.target.value })}
                    />
                  </div>
                  <p className="text-xs text-slate-500">Normal: 90/60 - 120/80 mmHg</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperature (°C)</Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    placeholder="e.g., 37.0"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                  />
                  <p className="text-xs text-slate-500">Normal: 36.1-37.2°C</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any observations or notes about the patient..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6 border-t border-slate-200">
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Save Vitals
                    </>
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> The system automatically detects abnormal readings and creates alerts. 
              Critical alerts are generated for: Heart rate {'<'}40 or {'>'}120 bpm, Oxygen {'<'}90%, Temperature {'<'}35°C or {'>'}38.5°C.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
