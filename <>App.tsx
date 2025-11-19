import { useState, useEffect } from "react";
import LoginPage from "./components/LoginPage";
import PatientDashboard from "./components/PatientDashboard";
import DoctorDashboard from "./components/DoctorDashboard";
import AddReading from "./components/AddReading";
import Alerts from "./components/Alerts";
import Analytics from "./components/Analytics";
import Settings from "./components/Settings";
import { Toaster } from "./components/ui/sonner";
import { createClient } from "./utils/supabase/client";

export default function App() {
  console.log(
    "Patient Monitoring System - Version 3.0 - Loaded Successfully ✅",
  );

  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
    role: "doctor" | "patient" | "family";
    email: string;
  } | null>(null);

  const [currentPage, setCurrentPage] = useState<
    | "dashboard"
    | "add-reading"
    | "alerts"
    | "analytics"
    | "settings"
  >("dashboard");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        setCurrentUser({
          id: session.user.id,
          email: session.user.email || "",
          name: session.user.user_metadata?.name || "User",
          role: session.user.user_metadata?.role || "patient",
        });
      }

      setIsCheckingAuth(false);
    };

    checkSession();
  }, []);

  const handleLogin = (user: {
    id: string;
    email: string;
    name: string;
    role: "doctor" | "patient" | "family";
  }) => {
    setCurrentUser(user);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setCurrentUser(null);
    setCurrentPage("dashboard");
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-100 via-blue-50 to-teal-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      <div className="min-h-screen bg-slate-50">
        {currentUser.role === "patient" ||
        currentUser.role === "family" ? (
          <PatientDashboard
            user={currentUser}
            currentPage={currentPage}
            onNavigate={setCurrentPage}
            onLogout={handleLogout}
          />
        ) : (
          <>
            {currentPage === "dashboard" && (
              <DoctorDashboard
                user={currentUser}
                onNavigate={setCurrentPage}
                onLogout={handleLogout}
              />
            )}
            {currentPage === "add-reading" && (
              <AddReading
                user={currentUser}
                onNavigate={setCurrentPage}
                onLogout={handleLogout}
              />
            )}
            {currentPage === "alerts" && (
              <Alerts
                user={currentUser}
                onNavigate={setCurrentPage}
                onLogout={handleLogout}
              />
            )}
            {currentPage === "analytics" && (
              <Analytics
                user={currentUser}
                onNavigate={setCurrentPage}
                onLogout={handleLogout}
              />
            )}
            {currentPage === "settings" && (
              <Settings
                user={currentUser}
                onNavigate={setCurrentPage}
                onLogout={handleLogout}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}
