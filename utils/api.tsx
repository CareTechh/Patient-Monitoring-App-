import { projectId, publicAnonKey } from './supabase/info';
import { createClient } from './supabase/client';

const API_BASE = "http://localhost:8000/make-server-3d5bb2df";



// Get auth token
async function getAuthToken(): Promise<string> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || publicAnonKey;
}

// API call helper
async function apiCall(endpoint: string, options: RequestInit = {}) {
  try {
    const token = await getAuthToken();
    
    console.log(`API Call: ${API_BASE}${endpoint}`);
    
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    console.log(`API Response Status: ${response.status}`);

    if (!response.ok) {
      let errorMessage = 'API request failed';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
      console.error(`API Error: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error: any) {
    console.error(`API Call Failed:`, error);
    throw error;
  }
}

// Profile APIs
export const profileAPI = {
  get: async (userId: string) => {
    return apiCall(`/profile/${userId}`);
  },
  
  update: async (userId: string, updates: any) => {
    return apiCall(`/profile/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },
};

// Vitals APIs
export const vitalsAPI = {
  add: async (data: {
    patientId: string;
    heartRate?: number;
    bloodPressure?: string;
    oxygenLevel?: number;
    temperature?: number;
    notes?: string;
  }) => {
    return apiCall('/vitals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  getForPatient: async (patientId: string, limit: number = 50) => {
    return apiCall(`/vitals/${patientId}?limit=${limit}`);
  },
};

// Alerts APIs
export const alertsAPI = {
  getForPatient: async (patientId: string) => {
    return apiCall(`/alerts/${patientId}`);
  },
  
  acknowledge: async (alertId: string) => {
    return apiCall(`/alerts/${alertId}/acknowledge`, {
      method: 'PUT',
    });
  },
  
  getAll: async () => {
    return apiCall('/alerts/all');
  },
};

// Patients APIs
export const patientsAPI = {
  getAll: async () => {
    return apiCall('/patients');
  },
  
  assignDoctor: async (patientId: string, doctorId: string) => {
    return apiCall(`/patients/${patientId}/assign-doctor`, {
      method: 'PUT',
      body: JSON.stringify({ doctorId }),
    });
  },
};

// Analytics APIs
export const analyticsAPI = {
  getForPatient: async (patientId: string, period: string = '7days') => {
    return apiCall(`/analytics/${patientId}?period=${period}`);
  },
  
  getAggregate: async (period: string = '7days') => {
    return apiCall(`/analytics/aggregate/all?period=${period}`);
  },
};
