import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Activity, ArrowLeft, Download, TrendingUp, Users, Loader2 } from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar,
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer 
} from 'recharts';
import { analyticsAPI } from '../utils/api';
import { toast } from 'sonner@2.0.3';

interface AnalyticsProps {
  user: { id: string; name: string; role: string; email: string };
  onNavigate: (page: any) => void;
  onLogout: () => void;
}

export default function Analytics({ user, onNavigate, onLogout }: AnalyticsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('7days');
  const [selectedMetric, setSelectedMetric] = useState('all');
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod, user.id, user.role]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      let data;
      if (user.role === 'doctor') {
        data = await analyticsAPI.getAggregate(selectedPeriod);
      } else {
        data = await analyticsAPI.getForPatient(user.id, selectedPeriod);
      }
      setAnalyticsData(data);
    } catch (error: any) {
      console.error('Error loading analytics:', error);
      if (error.message !== 'API request failed') {
        toast.error('Failed to load analytics');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      // Dynamic import to keep bundle size smaller
      const jsPDF = (await import('npm:jspdf')).default;
      
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.text('Health Report', 20, 20);
      
      // Add date
      doc.setFontSize(12);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);
      doc.text(`Period: ${selectedPeriod}`, 20, 37);
      
      // Add patient/doctor info
      doc.setFontSize(14);
      doc.text(`Name: ${user.name}`, 20, 47);
      doc.text(`Email: ${user.email}`, 20, 54);
      doc.text(`Role: ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}`, 20, 61);
      
      if (analyticsData?.stats) {
        // Add statistics
        doc.setFontSize(16);
        doc.text('Statistics', 20, 75);
        
        doc.setFontSize(12);
        let yPos = 85;
        
        if (user.role === 'doctor') {
          doc.text(`Total Patients: ${analyticsData.stats.totalPatients}`, 20, yPos);
          yPos += 7;
        }
        
        doc.text(`Total Readings: ${analyticsData.stats.totalReadings}`, 20, yPos);
        yPos += 7;
        
        if (analyticsData.stats.normalReadings !== undefined) {
          doc.text(`Normal Readings: ${analyticsData.stats.normalReadings}`, 20, yPos);
          yPos += 7;
        }
        
        doc.text(`Total Alerts: ${analyticsData.stats.totalAlerts}`, 20, yPos);
        yPos += 7;
        doc.text(`Critical Alerts: ${analyticsData.stats.criticalAlerts}`, 20, yPos);
        yPos += 7;
        doc.text(`Warning Alerts: ${analyticsData.stats.warningAlerts}`, 20, yPos);
        yPos += 7;
        
        if (analyticsData.stats.avgHeartRate) {
          doc.text(`Average Heart Rate: ${analyticsData.stats.avgHeartRate} bpm`, 20, yPos);
          yPos += 7;
        }
        
        if (analyticsData.stats.avgOxygenLevel) {
          doc.text(`Average Oxygen Level: ${analyticsData.stats.avgOxygenLevel}%`, 20, yPos);
          yPos += 7;
        }
      }
      
      // Add footer
      doc.setFontSize(10);
      doc.text('Patient Monitoring System - Confidential Health Report', 20, 280);
      
      // Save PDF
      doc.save(`health-report-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF report');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Process vitals data for charts
  const processChartData = () => {
    if (!analyticsData?.vitals || analyticsData.vitals.length === 0) {
      return { timeSeriesData: [], dailyData: [] };
    }

    const vitals = analyticsData.vitals;
    
    // Group by day for time series
    const dayMap = new Map();
    vitals.forEach((vital: any) => {
      const date = new Date(vital.timestamp);
      const dayKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, {
          day: dayKey,
          heartRates: [],
          oxygenLevels: [],
          temperatures: [],
          bpSystolic: [],
          bpDiastolic: []
        });
      }
      
      const dayData = dayMap.get(dayKey);
      if (vital.heartRate) dayData.heartRates.push(vital.heartRate);
      if (vital.oxygenLevel) dayData.oxygenLevels.push(vital.oxygenLevel);
      if (vital.temperature) dayData.temperatures.push(vital.temperature);
      if (vital.bloodPressure) {
        const [sys, dia] = vital.bloodPressure.split('/').map((v: string) => parseInt(v));
        dayData.bpSystolic.push(sys);
        dayData.bpDiastolic.push(dia);
      }
    });

    const timeSeriesData = Array.from(dayMap.values()).map(day => ({
      day: day.day,
      avgHR: day.heartRates.length > 0 
        ? Math.round(day.heartRates.reduce((a: number, b: number) => a + b, 0) / day.heartRates.length)
        : null,
      avgSpO2: day.oxygenLevels.length > 0
        ? Math.round(day.oxygenLevels.reduce((a: number, b: number) => a + b, 0) / day.oxygenLevels.length)
        : null,
      avgTemp: day.temperatures.length > 0
        ? (day.temperatures.reduce((a: number, b: number) => a + b, 0) / day.temperatures.length).toFixed(1)
        : null,
      avgBPSys: day.bpSystolic.length > 0
        ? Math.round(day.bpSystolic.reduce((a: number, b: number) => a + b, 0) / day.bpSystolic.length)
        : null,
      readings: day.heartRates.length + day.oxygenLevels.length + day.temperatures.length
    }));

    return { timeSeriesData, dailyData: timeSeriesData };
  };

  const { timeSeriesData } = processChartData();

  const stats = analyticsData?.stats || {
    totalReadings: 0,
    normalReadings: 0,
    totalAlerts: 0,
    criticalAlerts: 0,
    warningAlerts: 0,
    totalPatients: 0,
    avgHeartRate: 0,
    avgOxygenLevel: 0
  };

  const normalPercentage = stats.totalReadings > 0 
    ? Math.round((stats.normalReadings / stats.totalReadings) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => onNavigate('dashboard')}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-slate-900">Health Reports & Analytics</h1>
                <p className="text-sm text-slate-600">View trends and insights</p>
              </div>
              {loading && (
                <Loader2 className="w-5 h-5 animate-spin text-blue-600 ml-4" />
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                Print Report
              </Button>
              <Button 
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700"
                onClick={handleDownloadPDF}
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="border-slate-200 shadow-sm mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm text-slate-600 mb-2 block">Time Period</label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7days">Last 7 Days</SelectItem>
                    <SelectItem value="30days">Last 30 Days</SelectItem>
                    <SelectItem value="3months">Last 3 Months</SelectItem>
                    <SelectItem value="1year">Last Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="text-sm text-slate-600 mb-2 block">Vital Type</label>
                <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vitals</SelectItem>
                    <SelectItem value="heartRate">Heart Rate</SelectItem>
                    <SelectItem value="bloodPressure">Blood Pressure</SelectItem>
                    <SelectItem value="spo2">SpO₂ Level</SelectItem>
                    <SelectItem value="temperature">Temperature</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card className="border-slate-200">
            <CardContent className="py-20 text-center">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-slate-600">Loading analytics data...</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {user.role === 'doctor' && (
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-slate-600">Total Patients</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-900">{stats.totalPatients}</p>
                    <p className="text-xs text-blue-600 mt-1">Active monitoring</p>
                  </CardContent>
                </Card>
              )}

              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-slate-600">Total Readings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-900">{stats.totalReadings}</p>
                  <p className="text-xs text-slate-500 mt-1">In selected period</p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-slate-600">Normal Readings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-900">{normalPercentage}%</p>
                  <p className="text-xs text-emerald-600 mt-1">
                    {stats.normalReadings} of {stats.totalReadings}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm bg-red-50 border-red-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-red-900">Total Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-red-900">{stats.totalAlerts}</p>
                  <p className="text-xs text-red-700 mt-1">
                    {stats.criticalAlerts} critical, {stats.warningAlerts} warnings
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            {timeSeriesData.length === 0 ? (
              <Card className="border-slate-200">
                <CardContent className="py-20 text-center">
                  <Activity className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600">No data available for the selected period</p>
                  <p className="text-sm text-slate-500 mt-2">Add vital readings to see analytics</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Vital Signs Trend */}
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-slate-900">Vital Signs Trend</CardTitle>
                    <CardDescription>
                      {user.role === 'doctor' ? 'Average across all patients' : 'Your health trends over time'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <AreaChart data={timeSeriesData}>
                        <defs>
                          <linearGradient id="colorHR" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorSpO2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="day" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'white', 
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend />
                        {(selectedMetric === 'all' || selectedMetric === 'heartRate') && (
                          <Area 
                            type="monotone" 
                            dataKey="avgHR" 
                            name="Heart Rate (bpm)"
                            stroke="#ef4444" 
                            fillOpacity={1}
                            fill="url(#colorHR)"
                            strokeWidth={2}
                          />
                        )}
                        {(selectedMetric === 'all' || selectedMetric === 'spo2') && (
                          <Area 
                            type="monotone" 
                            dataKey="avgSpO2" 
                            name="SpO₂ (%)"
                            stroke="#3b82f6" 
                            fillOpacity={1}
                            fill="url(#colorSpO2)"
                            strokeWidth={2}
                          />
                        )}
                        {(selectedMetric === 'all' || selectedMetric === 'bloodPressure') && (
                          <Line 
                            type="monotone" 
                            dataKey="avgBPSys" 
                            name="Blood Pressure (sys)"
                            stroke="#8b5cf6" 
                            strokeWidth={2}
                            dot={{ fill: '#8b5cf6', r: 4 }}
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Daily Readings Activity */}
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-slate-900">Daily Activity</CardTitle>
                      <CardDescription>Number of readings per day</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={timeSeriesData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="day" stroke="#64748b" />
                          <YAxis stroke="#64748b" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px'
                            }}
                          />
                          <Bar dataKey="readings" name="Readings" fill="#10b981" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Alert Distribution */}
                  <Card className="border-slate-200 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-slate-900">Alert Distribution</CardTitle>
                      <CardDescription>Critical vs Warning alerts</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={[
                          { type: 'Critical', count: stats.criticalAlerts },
                          { type: 'Warning', count: stats.warningAlerts },
                          { type: 'Normal', count: stats.normalReadings }
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="type" stroke="#64748b" />
                          <YAxis stroke="#64748b" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px'
                            }}
                          />
                          <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                            {[
                              { fill: '#ef4444' },
                              { fill: '#f59e0b' },
                              { fill: '#10b981' }
                            ].map((entry, index) => (
                              <rect key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Insights Card */}
                <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-emerald-50">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      <CardTitle className="text-slate-900">Key Insights</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-600 mt-2" />
                      <p className="text-slate-700">
                        {normalPercentage}% of readings are within normal ranges across all vitals
                      </p>
                    </div>
                    {stats.avgHeartRate > 0 && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-600 mt-2" />
                        <p className="text-slate-700">
                          Average heart rate is {stats.avgHeartRate} bpm - {
                            stats.avgHeartRate >= 60 && stats.avgHeartRate <= 100 
                              ? 'within healthy range' 
                              : 'outside normal range'
                          }
                        </p>
                      </div>
                    )}
                    {stats.avgOxygenLevel > 0 && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-purple-600 mt-2" />
                        <p className="text-slate-700">
                          Average oxygen saturation is {stats.avgOxygenLevel}% - {
                            stats.avgOxygenLevel >= 95 
                              ? 'excellent levels' 
                              : 'below recommended levels'
                          }
                        </p>
                      </div>
                    )}
                    {stats.totalAlerts > 0 && (
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-600 mt-2" />
                        <p className="text-slate-700">
                          {stats.totalAlerts} alert{stats.totalAlerts > 1 ? 's' : ''} generated in this period 
                          ({stats.criticalAlerts} critical, {stats.warningAlerts} warning)
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
