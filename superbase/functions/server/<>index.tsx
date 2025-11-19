import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Helper function to verify user authentication
async function verifyUser(authHeader: string | null) {
  if (!authHeader) {
    return { error: 'No authorization header', status: 401 };
  }
  
  const accessToken = authHeader.split(' ')[1];
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  );
  
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (error || !user) {
    return { error: 'Unauthorized', status: 401 };
  }
  
  return { user };
}

// Health check endpoint
app.get("/make-server-3d5bb2df/health", (c) => {
  return c.json({ status: "ok" });
});

// Signup endpoint - creates a new user with role metadata and patient profile
app.post("/make-server-3d5bb2df/signup", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    );

    const body = await c.req.json();
    const { email, password, name, role } = body;

    if (!email || !password || !name || !role) {
      console.log('Signup error: Missing required fields', { email, name, role });
      return c.json({ error: 'Email, password, name, and role are required' }, 400);
    }

    // Create user with admin API to auto-confirm email
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { 
        name,
        role // 'doctor' | 'patient' | 'family'
      },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log('Signup error from Supabase:', error.message);
      return c.json({ error: error.message }, 400);
    }

    const userId = data.user?.id;
    
    // Store patient/user profile in KV store
    const profile = {
      id: userId,
      email: data.user?.email,
      name,
      role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Patient-specific fields
      ...(role === 'patient' && {
        age: null,
        gender: null,
        bloodType: null,
        allergies: [],
        medications: [],
        emergencyContact: null,
        assignedDoctorId: null
      })
    };

    await kv.set(`profile:${userId}`, profile);
    console.log('User profile created successfully:', userId);

    return c.json({ 
      user: {
        id: userId,
        email: data.user?.email,
        name,
        role
      }
    });

  } catch (error) {
    console.log('Signup error during user creation:', error);
    return c.json({ error: 'Failed to create user account' }, 500);
  }
});

// Get user profile
app.get("/make-server-3d5bb2df/profile/:userId", async (c) => {
  try {
    const authResult = await verifyUser(c.req.header('Authorization'));
    if (authResult.error) {
      return c.json({ error: authResult.error }, authResult.status);
    }

    const userId = c.req.param('userId');
    const profile = await kv.get(`profile:${userId}`);

    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    return c.json({ profile });
  } catch (error) {
    console.log('Error fetching profile:', error);
    return c.json({ error: 'Failed to fetch profile' }, 500);
  }
});

// Update user profile
app.put("/make-server-3d5bb2df/profile/:userId", async (c) => {
  try {
    const authResult = await verifyUser(c.req.header('Authorization'));
    if (authResult.error) {
      return c.json({ error: authResult.error }, authResult.status);
    }

    const userId = c.req.param('userId');
    const updates = await c.req.json();

    const existingProfile = await kv.get(`profile:${userId}`);
    if (!existingProfile) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    const updatedProfile = {
      ...existingProfile,
      ...updates,
      id: userId, // Prevent ID override
      updatedAt: new Date().toISOString()
    };

    await kv.set(`profile:${userId}`, updatedProfile);
    console.log('Profile updated successfully:', userId);

    return c.json({ profile: updatedProfile });
  } catch (error) {
    console.log('Error updating profile:', error);
    return c.json({ error: 'Failed to update profile' }, 500);
  }
});

// Add vital reading
app.post("/make-server-3d5bb2df/vitals", async (c) => {
  try {
    const authResult = await verifyUser(c.req.header('Authorization'));
    if (authResult.error) {
      return c.json({ error: authResult.error }, authResult.status);
    }

    const body = await c.req.json();
    const { patientId, heartRate, bloodPressure, oxygenLevel, temperature, notes } = body;

    if (!patientId) {
      return c.json({ error: 'Patient ID is required' }, 400);
    }

    const timestamp = new Date().toISOString();
    const vitalId = `vitals:${patientId}:${Date.now()}`;

    const vitalReading = {
      id: vitalId,
      patientId,
      heartRate: heartRate || null,
      bloodPressure: bloodPressure || null,
      oxygenLevel: oxygenLevel || null,
      temperature: temperature || null,
      notes: notes || '',
      timestamp,
      recordedBy: authResult.user.id
    };

    await kv.set(vitalId, vitalReading);
    console.log('Vital reading recorded:', vitalId);

    // Check for abnormal readings and create alerts
    const alerts = [];
    
    if (heartRate && (heartRate < 60 || heartRate > 100)) {
      alerts.push({
        type: 'Heart Rate',
        severity: heartRate < 40 || heartRate > 120 ? 'critical' : 'warning',
        value: heartRate,
        message: `Heart rate ${heartRate < 60 ? 'below' : 'above'} normal range`
      });
    }
    
    if (oxygenLevel && oxygenLevel < 95) {
      alerts.push({
        type: 'Oxygen Level',
        severity: oxygenLevel < 90 ? 'critical' : 'warning',
        value: oxygenLevel,
        message: `Oxygen saturation below normal (${oxygenLevel}%)`
      });
    }
    
    if (temperature && (temperature < 36.1 || temperature > 37.2)) {
      alerts.push({
        type: 'Temperature',
        severity: temperature < 35 || temperature > 38.5 ? 'critical' : 'warning',
        value: temperature,
        message: `Body temperature ${temperature < 36.1 ? 'below' : 'above'} normal range`
      });
    }

    // Store alerts
    for (const alert of alerts) {
      const alertId = `alert:${patientId}:${Date.now()}-${alert.type}`;
      await kv.set(alertId, {
        id: alertId,
        patientId,
        vitalId,
        ...alert,
        timestamp,
        acknowledged: false
      });
    }

    return c.json({ 
      vitalReading,
      alerts: alerts.length > 0 ? alerts : null
    });
  } catch (error) {
    console.log('Error recording vital reading:', error);
    return c.json({ error: 'Failed to record vital reading' }, 500);
  }
});

// Get vital readings for a patient
app.get("/make-server-3d5bb2df/vitals/:patientId", async (c) => {
  try {
    const authResult = await verifyUser(c.req.header('Authorization'));
    if (authResult.error) {
      return c.json({ error: authResult.error }, authResult.status);
    }

    const patientId = c.req.param('patientId');
    const limit = parseInt(c.req.query('limit') || '50');

    const allVitals = await kv.getByPrefix(`vitals:${patientId}:`);
    
    // Sort by timestamp (newest first) and limit
    const vitals = allVitals
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    return c.json({ vitals });
  } catch (error) {
    console.log('Error fetching vitals:', error);
    return c.json({ error: 'Failed to fetch vital readings' }, 500);
  }
});

// Get alerts for a patient
app.get("/make-server-3d5bb2df/alerts/:patientId", async (c) => {
  try {
    const authResult = await verifyUser(c.req.header('Authorization'));
    if (authResult.error) {
      return c.json({ error: authResult.error }, authResult.status);
    }

    const patientId = c.req.param('patientId');
    const allAlerts = await kv.getByPrefix(`alert:${patientId}:`);
    
    // Sort by timestamp (newest first)
    const alerts = allAlerts
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return c.json({ alerts });
  } catch (error) {
    console.log('Error fetching alerts:', error);
    return c.json({ error: 'Failed to fetch alerts' }, 500);
  }
});

// Acknowledge an alert
app.put("/make-server-3d5bb2df/alerts/:alertId/acknowledge", async (c) => {
  try {
    const authResult = await verifyUser(c.req.header('Authorization'));
    if (authResult.error) {
      return c.json({ error: authResult.error }, authResult.status);
    }

    const alertId = c.req.param('alertId');
    const alert = await kv.get(alertId);

    if (!alert) {
      return c.json({ error: 'Alert not found' }, 404);
    }

    const updatedAlert = {
      ...alert,
      acknowledged: true,
      acknowledgedBy: authResult.user.id,
      acknowledgedAt: new Date().toISOString()
    };

    await kv.set(alertId, updatedAlert);
    console.log('Alert acknowledged:', alertId);

    return c.json({ alert: updatedAlert });
  } catch (error) {
    console.log('Error acknowledging alert:', error);
    return c.json({ error: 'Failed to acknowledge alert' }, 500);
  }
});

// Get all patients (for doctors)
app.get("/make-server-3d5bb2df/patients", async (c) => {
  try {
    const authResult = await verifyUser(c.req.header('Authorization'));
    if (authResult.error) {
      return c.json({ error: authResult.error }, authResult.status);
    }

    const allProfiles = await kv.getByPrefix('profile:');
    const patients = allProfiles
      .filter(profile => profile.role === 'patient')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return c.json({ patients });
  } catch (error) {
    console.log('Error fetching patients:', error);
    return c.json({ error: 'Failed to fetch patients' }, 500);
  }
});

// Assign doctor to patient
app.put("/make-server-3d5bb2df/patients/:patientId/assign-doctor", async (c) => {
  try {
    const authResult = await verifyUser(c.req.header('Authorization'));
    if (authResult.error) {
      return c.json({ error: authResult.error }, authResult.status);
    }

    const patientId = c.req.param('patientId');
    const { doctorId } = await c.req.json();

    const patientProfile = await kv.get(`profile:${patientId}`);
    if (!patientProfile) {
      return c.json({ error: 'Patient not found' }, 404);
    }

    const updatedProfile = {
      ...patientProfile,
      assignedDoctorId: doctorId,
      updatedAt: new Date().toISOString()
    };

    await kv.set(`profile:${patientId}`, updatedProfile);
    console.log('Doctor assigned to patient:', { patientId, doctorId });

    return c.json({ profile: updatedProfile });
  } catch (error) {
    console.log('Error assigning doctor to patient:', error);
    return c.json({ error: 'Failed to assign doctor' }, 500);
  }
});

// Get all alerts (for doctors - across all patients)
app.get("/make-server-3d5bb2df/alerts/all", async (c) => {
  try {
    const authResult = await verifyUser(c.req.header('Authorization'));
    if (authResult.error) {
      return c.json({ error: authResult.error }, authResult.status);
    }

    const allAlerts = await kv.getByPrefix('alert:');
    
    // Fetch patient profiles to enrich alert data
    const patientProfiles = await kv.getByPrefix('profile:');
    const patientMap = new Map(
      patientProfiles
        .filter(p => p.role === 'patient')
        .map(p => [p.id, p])
    );

    // Enrich alerts with patient information
    const enrichedAlerts = allAlerts.map(alert => ({
      ...alert,
      patientName: patientMap.get(alert.patientId)?.name || 'Unknown Patient',
      patientAge: patientMap.get(alert.patientId)?.age || null,
      patientEmail: patientMap.get(alert.patientId)?.email || null
    }));

    // Sort by timestamp (newest first)
    const alerts = enrichedAlerts
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return c.json({ alerts });
  } catch (error) {
    console.log('Error fetching all alerts:', error);
    return c.json({ error: 'Failed to fetch alerts' }, 500);
  }
});

// Get analytics data for a patient
app.get("/make-server-3d5bb2df/analytics/:patientId", async (c) => {
  try {
    const authResult = await verifyUser(c.req.header('Authorization'));
    if (authResult.error) {
      return c.json({ error: authResult.error }, authResult.status);
    }

    const patientId = c.req.param('patientId');
    const period = c.req.query('period') || '7days';

    // Get all vitals for patient
    const allVitals = await kv.getByPrefix(`vitals:${patientId}:`);
    const allAlerts = await kv.getByPrefix(`alert:${patientId}:`);

    // Filter based on period
    const now = new Date();
    let cutoffDate = new Date();
    switch (period) {
      case '7days':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case '3months':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case '1year':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    const vitals = allVitals
      .filter(v => new Date(v.timestamp) >= cutoffDate)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const alerts = allAlerts
      .filter(a => new Date(a.timestamp) >= cutoffDate)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Calculate statistics
    const stats = {
      totalReadings: vitals.length,
      normalReadings: vitals.filter(v => {
        const hrNormal = !v.heartRate || (v.heartRate >= 60 && v.heartRate <= 100);
        const o2Normal = !v.oxygenLevel || v.oxygenLevel >= 95;
        const tempNormal = !v.temperature || (v.temperature >= 36.1 && v.temperature <= 37.2);
        return hrNormal && o2Normal && tempNormal;
      }).length,
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
      warningAlerts: alerts.filter(a => a.severity === 'warning').length
    };

    return c.json({ vitals, alerts, stats });
  } catch (error) {
    console.log('Error fetching analytics:', error);
    return c.json({ error: 'Failed to fetch analytics' }, 500);
  }
});

// Get aggregate analytics for all patients (for doctors)
app.get("/make-server-3d5bb2df/analytics/aggregate/all", async (c) => {
  try {
    const authResult = await verifyUser(c.req.header('Authorization'));
    if (authResult.error) {
      return c.json({ error: authResult.error }, authResult.status);
    }

    const period = c.req.query('period') || '7days';

    // Get all vitals and alerts
    const allVitals = await kv.getByPrefix('vitals:');
    const allAlerts = await kv.getByPrefix('alert:');
    const allPatients = await kv.getByPrefix('profile:');
    const patients = allPatients.filter(p => p.role === 'patient');

    // Filter based on period
    const now = new Date();
    let cutoffDate = new Date();
    switch (period) {
      case '7days':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case '3months':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case '1year':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    const vitals = allVitals.filter(v => new Date(v.timestamp) >= cutoffDate);
    const alerts = allAlerts.filter(a => new Date(a.timestamp) >= cutoffDate);

    // Calculate aggregate statistics
    const stats = {
      totalPatients: patients.length,
      totalReadings: vitals.length,
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
      warningAlerts: alerts.filter(a => a.severity === 'warning').length,
      avgHeartRate: vitals.filter(v => v.heartRate).length > 0
        ? Math.round(vitals.filter(v => v.heartRate).reduce((sum, v) => sum + v.heartRate, 0) / vitals.filter(v => v.heartRate).length)
        : 0,
      avgOxygenLevel: vitals.filter(v => v.oxygenLevel).length > 0
        ? Math.round(vitals.filter(v => v.oxygenLevel).reduce((sum, v) => sum + v.oxygenLevel, 0) / vitals.filter(v => v.oxygenLevel).length)
        : 0
    };

    return c.json({ vitals, alerts, stats, patients });
  } catch (error) {
    console.log('Error fetching aggregate analytics:', error);
    return c.json({ error: 'Failed to fetch aggregate analytics' }, 500);
  }
});

Deno.serve(app.fetch);
