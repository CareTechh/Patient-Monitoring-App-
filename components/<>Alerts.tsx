import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Activity, ArrowLeft, AlertTriangle, Check, Clock, Heart, Droplet, Loader2 } from 'lucide-react';
import { alertsAPI } from '../utils/api';
import { toast } from 'sonner@2.0.3';

interface AlertsProps {
  user: { id: string; name: string; role: string; email: string };
  onNavigate: (page: any) => void;
  onLogout: () => void;
}

interface Alert {
  id: string;
  patientId: string;
  patientName?: string;
  patientAge?: number | null;
  patientEmail?: string;
  type: string;
  severity: 'critical' | 'warning';
  value: number;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export default function Alerts({ user, onNavigate, onLogout }: AlertsProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, [user.id, user.role]);

  const loadAlerts = async () => {
    try {
      let data;
      if (user.role === 'doctor') {
        // Doctors see all alerts
        data = await alertsAPI.getAll();
      } else {
        // Patients see only their own alerts
        data = await alertsAPI.getForPatient(user.id);
      }
      
      setAlerts(data.alerts || []);
    } catch (error: any) {
      console.error('Error loading alerts:', error);
      if (error.message !== 'API request failed') {
        toast.error('Failed to load alerts');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      await alertsAPI.acknowledge(alertId);
      toast.success('Alert acknowledged');
      loadAlerts();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast.error('Failed to acknowledge alert');
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return `${Math.floor(diff / 86400)} days ago`;
  };

  const activeAlerts = alerts.filter(a => !a.acknowledged);
  const resolvedAlerts = alerts.filter(a => a.acknowledged);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => onNavigate('dashboard')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-slate-900">Alert Notifications</h1>
              <p className="text-sm text-slate-600">Monitor critical patient alerts</p>
            </div>
            {loading && (
              <Loader2 className="w-5 h-5 animate-spin text-blue-600 ml-auto" />
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-red-900">Active Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-900">{activeAlerts.length}</p>
              <p className="text-xs text-red-700 mt-1">Require attention</p>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-emerald-900">Resolved</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-emerald-900">{resolvedAlerts.length}</p>
              <p className="text-xs text-emerald-700 mt-1">Successfully handled</p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-orange-900">Critical Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-orange-900">{activeAlerts.filter(a => a.severity === 'critical').length}</p>
              <p className="text-xs text-orange-700 mt-1">High priority</p>
            </CardContent>
          </Card>
        </div>

        {/* Active Alerts */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-slate-900">Active Alerts</h2>
            <Button variant="outline" size="sm" onClick={loadAlerts} disabled={loading}>
              Refresh
            </Button>
          </div>
          <div className="space-y-4">
            {loading && alerts.length === 0 ? (
              <Card className="border-slate-200">
                <CardContent className="py-12 text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-3" />
                  <p className="text-slate-600">Loading alerts...</p>
                </CardContent>
              </Card>
            ) : activeAlerts.length === 0 ? (
              <Card className="border-slate-200">
                <CardContent className="py-12 text-center">
                  <Check className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                  <p className="text-slate-600">No active alerts. All patients are stable.</p>
                </CardContent>
              </Card>
            ) : (
              activeAlerts.map((alert) => (
                <Card 
                  key={alert.id} 
                  className={`border-2 ${
                    alert.severity === 'critical' 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-orange-300 bg-orange-50'
                  }`}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            alert.severity === 'critical' ? 'bg-red-200' : 'bg-orange-200'
                          }`}>
                            {alert.type.includes('Heart') ? (
                              <Heart className={`w-5 h-5 ${
                                alert.severity === 'critical' ? 'text-red-700' : 'text-orange-700'
                              }`} />
                            ) : (
                              <AlertTriangle className={`w-5 h-5 ${
                                alert.severity === 'critical' ? 'text-red-700' : 'text-orange-700'
                              }`} />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-slate-900">
                                {user.role === 'doctor' && alert.patientName 
                                  ? alert.patientName 
                                  : 'Your Health Alert'}
                              </h3>
                              <Badge 
                                variant="outline" 
                                className={
                                  alert.severity === 'critical' 
                                    ? 'bg-red-100 text-red-700 border-red-300' 
                                    : 'bg-orange-100 text-orange-700 border-orange-300'
                                }
                              >
                                {alert.severity === 'critical' ? 'Critical' : 'Warning'}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600">
                              {alert.patientAge && user.role === 'doctor' && `Age: ${alert.patientAge} | `}
                              {alert.type}: {alert.value} - {alert.message}
                            </p>
                          </div>
                        </div>
                        
                        <div className="bg-white rounded-lg p-3 mb-3">
                          <p className="text-sm text-slate-700">{alert.message}</p>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Clock className="w-3 h-3" />
                          <span>{getTimeAgo(alert.timestamp)}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => handleAcknowledge(alert.id)}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Acknowledge
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Resolved Alerts */}
        {resolvedAlerts.length > 0 && (
          <div>
            <h2 className="text-slate-900 mb-4">Recently Resolved</h2>
            <div className="space-y-3">
              {resolvedAlerts.slice(0, 5).map((alert) => (
                <Card key={alert.id} className="border-slate-200 opacity-60">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-emerald-600" />
                        <div>
                          <p className="text-slate-900">
                            {user.role === 'doctor' && alert.patientName 
                              ? alert.patientName 
                              : 'Your Alert'}
                          </p>
                          <p className="text-sm text-slate-600">
                            {alert.type} - {alert.message}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                        Resolved
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
