import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Heart, Droplet, Wind, Thermometer, Plus, LogOut, User, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Badge } from './ui/badge';
import { vitalsAPI } from '../utils/api';
import { toast } from 'sonner@2.0.3';

interface PatientDashboardProps {
  user: { id: string; name: string; role: string; email: string };
  currentPage: string;
  onNavigate: (page: any) => void;
  onLogout: () => void;
}

export default function PatientDashboard({ user, currentPage, onNavigate, onLogout }: PatientDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [vitals, setVitals] = useState<any[]>([]);
  const [readings, setReadings] = useState({
    heartRate: { value: 0, status: 'normal', lastUpdate: 'No data' },
    bloodPressure: { systolic: 0, diastolic: 0, status: 'normal', lastUpdate: 'No data' },
    oxygen: { value: 0, status: 'normal', lastUpdate: 'No data' },
    temperature: { value: 0, status: 'normal', lastUpdate: 'No data' },
  });

  useEffect(() => {
    loadVitals();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadVitals, 30000);
    return () => clearInterval(interval);
  }, [user.id]);

  const loadVitals = async () => {
    try {
      const { vitals: vitalsList } = await vitalsAPI.getForPatient(user.id, 10);
      setVitals(vitalsList || []);
      
      if (vitalsList && vitalsList.length > 0) {
        const latest = vitalsList[0];
        const timeAgo = getTimeAgo(latest.timestamp);
        
        setReadings({
          heartRate: {
            value: latest.heartRate || 0,
            status: getVitalStatus('heartRate', latest.heartRate),
            lastUpdate: timeAgo
          },
          bloodPressure: {
            systolic: latest.bloodPressure ? parseInt(latest.bloodPressure.split('/')[0]) : 0,
            diastolic: latest.bloodPressure ? parseInt(latest.bloodPressure.split('/')[1]) : 0,
            status: getVitalStatus('bloodPressure', latest.bloodPressure),
            lastUpdate: timeAgo
          },
          oxygen: {
            value: latest.oxygenLevel || 0,
            status: getVitalStatus('oxygen', latest.oxygenLevel),
            lastUpdate: timeAgo
          },
          temperature: {
            value: latest.temperature || 0,
            status: getVitalStatus('temperature', latest.temperature),
            lastUpdate: timeAgo
          }
        });
      }
    } catch (error: any) {
      console.error('Error loading vitals:', error);
      if (error.message !== 'API request failed') {
        toast.error('Failed to load vital signs');
      }
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  const getVitalStatus = (type: string, value: any) => {
    if (!value) return 'normal';
    
    switch (type) {
      case 'heartRate':
        return value >= 60 && value <= 100 ? 'normal' : 'abnormal';
      case 'oxygen':
        return value >= 95 ? 'normal' : 'abnormal';
      case 'temperature':
        return value >= 36.1 && value <= 37.2 ? 'normal' : 'abnormal';
      case 'bloodPressure':
        const [sys, dia] = value.split('/').map((v: string) => parseInt(v));
        return (sys >= 90 && sys <= 120 && dia >= 60 && dia <= 80) ? 'normal' : 'abnormal';
      default:
        return 'normal';
    }
  };

  // Generate chart data from vitals
  const heartRateData = vitals
    .filter(v => v.heartRate)
    .slice(0, 6)
    .reverse()
    .map((v, i) => ({
      time: i === vitals.length - 1 ? 'Now' : getTimeAgo(v.timestamp),
      value: v.heartRate
    }));

  const bpData = vitals
    .filter(v => v.bloodPressure)
    .slice(0, 6)
    .reverse()
    .map((v, i) => {
      const [sys, dia] = v.bloodPressure.split('/').map((n: string) => parseInt(n));
      return {
        time: i === vitals.length - 1 ? 'Now' : getTimeAgo(v.timestamp),
        systolic: sys,
        diastolic: dia
      };
    });

  const getStatusColor = (status: string) => {
    return status === 'normal' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-emerald-600" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-teal-100 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse-soft"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }}></div>
      </div>
      
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b-2 border-slate-200/50 sticky top-0 z-10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-teal-600 flex items-center justify-center shadow-xl shadow-blue-500/30 animate-fadeIn">
                <Heart className="w-7 h-7 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-teal-600">Patient Health Overview</h1>
                <p className="text-sm text-slate-600 font-medium">Welcome back, {user.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => {}} className="border-2 hover:bg-blue-50 hover:border-blue-300 transition-all font-medium">
                <User className="w-4 h-4 mr-2" />
                Profile
              </Button>
              <Button variant="outline" size="sm" onClick={onLogout} className="border-2 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all font-medium">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Action Button */}
        <div className="mb-8 flex items-center justify-between">
          <Button 
            className="bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 shadow-xl hover:shadow-2xl transition-all duration-300 h-12 px-6 text-base font-semibold rounded-xl disabled:opacity-50"
            onClick={loadVitals}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5 mr-2" />
                Refresh Data
              </>
            )}
          </Button>
          {vitals.length > 0 && (
            <p className="text-sm text-slate-600">
              {vitals.length} reading{vitals.length > 1 ? 's' : ''} recorded
            </p>
          )}
        </div>

        {loading && vitals.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-slate-600">Loading your health data...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Vital Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-fadeIn">
          {/* Heart Rate Card */}
          <Card className="border-2 border-red-200/60 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                    <Heart className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </div>
                  <CardTitle className="text-slate-900 font-bold">Heart Rate</CardTitle>
                </div>
                {getTrendIcon('stable')}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-slate-900">
                    {readings.heartRate.value}
                  </span>
                  <span className="text-lg text-slate-600 font-medium">bpm</span>
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-2 border-emerald-300 font-semibold px-3 py-1">
                  {readings.heartRate.status === 'normal' ? '✓ Normal' : '⚠ Abnormal'}
                </Badge>
                <p className="text-xs text-slate-500 font-medium">Updated {readings.heartRate.lastUpdate}</p>
              </div>
            </CardContent>
          </Card>

          {/* Blood Pressure Card */}
          <Card className="border-2 border-purple-200/60 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <Droplet className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </div>
                  <CardTitle className="text-slate-900 font-bold">Blood Pressure</CardTitle>
                </div>
                {getTrendIcon('stable')}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-slate-900">
                    {readings.bloodPressure.systolic}/{readings.bloodPressure.diastolic}
                  </span>
                  <span className="text-lg text-slate-600 font-medium">mmHg</span>
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-2 border-emerald-300 font-semibold px-3 py-1">
                  {readings.bloodPressure.status === 'normal' ? '✓ Normal' : '⚠ Abnormal'}
                </Badge>
                <p className="text-xs text-slate-500 font-medium">Updated {readings.bloodPressure.lastUpdate}</p>
              </div>
            </CardContent>
          </Card>

          {/* Oxygen Level Card */}
          <Card className="border-2 border-blue-200/60 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <Wind className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </div>
                  <CardTitle className="text-slate-900 font-bold">SpO₂ Level</CardTitle>
                </div>
                {getTrendIcon('up')}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-slate-900">
                    {readings.oxygen.value}
                  </span>
                  <span className="text-lg text-slate-600 font-medium">%</span>
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-2 border-emerald-300 font-semibold px-3 py-1">
                  {readings.oxygen.status === 'normal' ? '✓ Normal' : '⚠ Abnormal'}
                </Badge>
                <p className="text-xs text-slate-500 font-medium">Updated {readings.oxygen.lastUpdate}</p>
              </div>
            </CardContent>
          </Card>

          {/* Temperature Card */}
          <Card className="border-2 border-orange-200/60 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                    <Thermometer className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </div>
                  <CardTitle className="text-slate-900 font-bold">Temperature</CardTitle>
                </div>
                {getTrendIcon('stable')}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-slate-900">
                    {readings.temperature.value}
                  </span>
                  <span className="text-lg text-slate-600 font-medium">°F</span>
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-2 border-emerald-300 font-semibold px-3 py-1">
                  {readings.temperature.status === 'normal' ? '✓ Normal' : '⚠ Abnormal'}
                </Badge>
                <p className="text-xs text-slate-500 font-medium">Updated {readings.temperature.lastUpdate}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Health Trends Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Heart Rate Trend */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">Heart Rate Trend</CardTitle>
              <CardDescription>Recent history</CardDescription>
            </CardHeader>
            <CardContent>
              {heartRateData.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-slate-500">
                  <p>No heart rate data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={heartRateData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" stroke="#64748b" />
                  <YAxis stroke="#64748b" domain={[60, 90]} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={{ fill: '#ef4444', r: 4 }}
                  />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Blood Pressure Trend */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-slate-900">Blood Pressure Trend</CardTitle>
              <CardDescription>Recent history</CardDescription>
            </CardHeader>
            <CardContent>
              {bpData.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-slate-500">
                  <p>No blood pressure data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={bpData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="time" stroke="#64748b" />
                  <YAxis stroke="#64748b" domain={[60, 140]} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="systolic" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    dot={{ fill: '#8b5cf6', r: 4 }}
                  />
                    <Line 
                      type="monotone" 
                      dataKey="diastolic" 
                      stroke="#a78bfa" 
                      strokeWidth={2}
                      dot={{ fill: '#a78bfa', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* AI Health Status Card */}
        <Card className="mt-6 border-emerald-200 bg-gradient-to-r from-emerald-50 to-blue-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-slate-900">AI Health Assessment</CardTitle>
                <CardDescription>Based on your recent vitals</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {vitals.length === 0 ? (
              <p className="text-slate-600">No data available yet. Add your first reading to get started!</p>
            ) : readings.heartRate.status === 'normal' && readings.oxygen.status === 'normal' && 
                 readings.bloodPressure.status === 'normal' && readings.temperature.status === 'normal' ? (
              <div className="flex items-center gap-3">
                <Badge className="bg-emerald-600 hover:bg-emerald-700">Health Status: Normal</Badge>
                <p className="text-slate-700">All your vital signs are within healthy ranges. Keep up the good work!</p>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Badge className="bg-amber-600 hover:bg-amber-700">Health Status: Attention Needed</Badge>
                <p className="text-slate-700">Some vitals are outside normal ranges. Please consult with your doctor.</p>
              </div>
            )}
          </CardContent>
        </Card>
          </>
        )}
      </div>
    </div>
  );
}
