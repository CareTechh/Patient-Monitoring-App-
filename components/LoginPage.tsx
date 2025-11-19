import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Heart, Activity, Stethoscope, Loader2 } from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface LoginPageProps {
  onLogin: (user: { id: string; email: string; name: string; role: 'doctor' | 'patient' | 'family' }) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<'doctor' | 'patient' | 'family'>('patient');
  const [isSignup, setIsSignup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = createClient();

      if (isSignup) {
        // Call server to create user with role metadata
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3d5bb2df/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ email, password, name, role: selectedRole })
        });

        const data = await response.json();

        if (!response.ok) {
          console.error('Signup error:', data.error);
          toast.error(data.error || 'Failed to create account');
          setIsLoading(false);
          return;
        }

        toast.success('Account created! Please log in.');
        setIsSignup(false);
        setPassword('');
        setIsLoading(false);
        return;
      }

      // Login with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error.message);
        toast.error(error.message || 'Failed to login');
        setIsLoading(false);
        return;
      }

      if (data.user) {
        const userName = data.user.user_metadata?.name || 'User';
        const userRole = data.user.user_metadata?.role || selectedRole;

        toast.success(`Welcome back, ${userName}!`);
        
        onLogin({
          id: data.user.id,
          email: data.user.email || email,
          name: userName,
          role: userRole
        });
      }
    } catch (error) {
      console.error('Authentication error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-sky-100 via-blue-50 to-teal-100 relative overflow-hidden">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-pulse-soft"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-400/20 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl animate-pulse-soft" style={{ animationDelay: '2s' }}></div>
      </div>
      
      {/* Version Badge */}
      <div className="fixed top-6 right-6 z-50 bg-gradient-to-r from-blue-600 to-teal-600 text-white px-5 py-2.5 rounded-full shadow-2xl border border-white/20 backdrop-blur-sm">
        <p className="text-sm font-semibold">v3.0 - Enhanced Healthcare UI ✨</p>
      </div>
      
      <div className="w-full max-w-6xl flex gap-8 items-center">
        {/* Left side - Branding */}
        <div className="hidden lg:flex flex-1 flex-col gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-600 to-teal-600 flex items-center justify-center shadow-2xl shadow-blue-500/30 animate-fadeIn">
              <Activity className="w-9 h-9 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-teal-600">HealthMonitor</h1>
              <p className="text-slate-700 font-medium">Smart Digital Health Monitoring</p>
            </div>
          </div>
          
          <div className="space-y-4 mt-8 animate-slideInRight">
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-white/80 backdrop-blur-md border-2 border-blue-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30">
                <Heart className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-slate-900 font-semibold text-lg">Real-time Monitoring</h3>
                <p className="text-slate-600 text-sm leading-relaxed">Track vital signs continuously with instant alerts</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-white/80 backdrop-blur-md border-2 border-emerald-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer" style={{ animationDelay: '0.1s' }}>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/30">
                <Stethoscope className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-slate-900 font-semibold text-lg">Professional Care</h3>
                <p className="text-slate-600 text-sm leading-relaxed">Connect with doctors and caregivers seamlessly</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-5 rounded-2xl bg-white/80 backdrop-blur-md border-2 border-cyan-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer" style={{ animationDelay: '0.2s' }}>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/30">
                <Activity className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-slate-900 font-semibold text-lg">Health Analytics</h3>
                <p className="text-slate-600 text-sm leading-relaxed">View trends and insights from your health data</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className="flex-1 max-w-md w-full relative z-10">
          <Card className="w-full max-w-md border-2 border-slate-200 shadow-2xl bg-white/95 backdrop-blur-sm">
            <CardHeader className="space-y-3">
              <CardTitle className="text-3xl text-center bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                Patient Monitoring System
              </CardTitle>
              <CardDescription className="text-center text-base">
                {isSignup ? 'Create your account to get started' : 'Sign in to access your dashboard'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="patient" onValueChange={(v) => setSelectedRole(v as any)} className="mb-6">
                <TabsList className="grid w-full grid-cols-3 bg-slate-100/80 p-1.5 h-auto">
                  <TabsTrigger value="patient" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg py-2.5 rounded-lg font-medium transition-all">
                    Patient
                  </TabsTrigger>
                  <TabsTrigger value="doctor" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg py-2.5 rounded-lg font-medium transition-all">
                    Doctor
                  </TabsTrigger>
                  <TabsTrigger value="family" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-lg py-2.5 rounded-lg font-medium transition-all">
                    Family
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <form onSubmit={handleSubmit} className="space-y-5">
                {isSignup && (
                  <div className="space-y-2.5">
                    <Label htmlFor="name" className="text-sm font-semibold text-slate-700">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="h-12 border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl bg-slate-50/50 transition-all"
                    />
                  </div>
                )}
                
                <div className="space-y-2.5">
                  <Label htmlFor="email" className="text-sm font-semibold text-slate-700">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl bg-slate-50/50 transition-all"
                  />
                </div>
                
                <div className="space-y-2.5">
                  <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl bg-slate-50/50 transition-all"
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all duration-300 text-base font-semibold rounded-xl disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {isSignup ? 'Creating Account...' : 'Logging in...'}
                    </>
                  ) : (
                    isSignup ? 'Sign Up' : 'Login'
                  )}
                </Button>

                {!isSignup && (
                  <div className="text-center">
                    <button
                      type="button"
                      className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                      onClick={() => alert('Password reset link would be sent to your email')}
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}

                <div className="text-center pt-6 border-t-2 border-slate-100">
                  <p className="text-sm text-slate-600">
                    {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button
                      type="button"
                      className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 transition-all"
                      onClick={() => {
                        setIsSignup(!isSignup);
                        setPassword('');
                        setName('');
                      }}
                    >
                      {isSignup ? 'Login' : 'Sign Up'}
                    </button>
                  </p>
                </div>
                
                {!isSignup && (
                  <div className="mt-4 p-4 bg-blue-50/80 border-2 border-blue-200/60 rounded-xl">
                    <p className="text-xs text-slate-600 font-medium text-center">
                      💡 <strong>First time?</strong> Create an account by clicking "Sign Up" above
                    </p>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
