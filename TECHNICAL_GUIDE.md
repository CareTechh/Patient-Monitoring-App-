# Patient Monitoring System - Technical Architecture Guide

## 📡 Required Medical Sensors & Hardware

### 1. **Heart Rate Monitor (ECG/Pulse Sensor)**

**Purpose:** Measure heart rate in beats per minute (BPM)

**Sensor Options:**

- **ECG Electrodes** (Electrocardiogram) - Medical grade, 3-5 lead system
- **Pulse Oximeter Sensor** - Non-invasive finger/earlobe clip
- **Photoplethysmography (PPG) Sensor** - Optical sensor in wearables
- **Chest Strap Monitor** - Fitness-grade for continuous monitoring

**Connection Method:**

- Bluetooth Low Energy (BLE) 5.0+
- ANT+ protocol
- USB wired connection for bedside monitors
- Wi-Fi for advanced hospital-grade equipment

**Normal Range:** 60-100 bpm
**Alert Triggers:**

- Critical Low: < 50 bpm (Bradycardia)
- Critical High: > 120 bpm (Tachycardia)
- Irregular rhythm patterns

---

### 2. **Blood Pressure Monitor (Sphygmomanometer)**

**Purpose:** Measure systolic and diastolic blood pressure

**Sensor Options:**

- **Automatic Digital BP Cuff** - Upper arm oscillometric sensor
- **Wrist BP Monitor** - Portable but less accurate
- **Arterial Line Sensor** - Invasive, ICU-grade continuous monitoring
- **NIBP (Non-Invasive BP)** - Hospital automated cuffs

**Connection Method:**

- Bluetooth 5.0+ (consumer devices)
- Serial RS-232 or USB (clinical devices)
- Wi-Fi enabled smart cuffs
- HL7/FHIR API integration for hospital systems

**Normal Range:** 90/60 - 120/80 mmHg
**Alert Triggers:**

- Hypotension: < 90/60 mmHg
- Hypertension Stage 1: 130-139/80-89 mmHg
- Hypertension Stage 2: ≥ 140/90 mmHg
- Hypertensive Crisis: > 180/120 mmHg (IMMEDIATE ALERT)

---

### 3. **Pulse Oximeter (SpO₂ Sensor)**

**Purpose:** Measure blood oxygen saturation level

**Sensor Options:**

- **Fingertip Pulse Oximeter** - LED + photodiode sensor
- **Earlobe Clip Sensor** - For patients with poor finger circulation
- **Forehead/Wrist Sensors** - Alternative placement sites
- **Continuous Monitoring Probe** - Hospital-grade adhesive sensors

**Technology:**

- Red and infrared light absorption through tissue
- Detects oxygenated vs deoxygenated hemoglobin

**Connection Method:**

- Bluetooth Low Energy (BLE)
- USB connectivity
- Integrated into multi-parameter patient monitors
- MQTT protocol for IoT integration

**Normal Range:** 95-100%
**Alert Triggers:**

- Mild Hypoxemia: 90-94%
- Moderate Hypoxemia: 85-89% (WARNING)
- Severe Hypoxemia: < 85% (CRITICAL ALERT)

---

### 4. **Digital Thermometer (Temperature Sensor)**

**Purpose:** Measure body temperature

**Sensor Options:**

- **Infrared Forehead Thermometer** - Non-contact, quick reading
- **Tympanic (Ear) Thermometer** - Infrared ear canal sensor
- **Oral/Rectal Digital Thermometer** - Thermistor-based probe
- **Temporal Artery Thermometer** - Scans temple area
- **Continuous Skin Temperature Patch** - Adhesive wearable sensor

**Sensor Technology:**

- Thermistor (resistance changes with temperature)
- Infrared sensor (detects heat radiation)

**Connection Method:**

- Bluetooth (smart thermometers)
- Direct data entry (manual reading)
- NFC for data transfer
- Cloud-sync enabled devices

**Normal Range:** 97.0-99.0°F (36.1-37.2°C)
**Alert Triggers:**

- Hypothermia: < 95°F (35°C)
- Low-grade Fever: 99.1-100.4°F (37.3-38°C)
- Fever: 100.5-102.9°F (38.1-39.4°C)
- High Fever: ≥ 103°F (39.4°C) (ALERT)

---

### 5. **Additional Optional Sensors**

#### **Glucose Monitor (For Diabetic Patients)**

- **Continuous Glucose Monitor (CGM)** - Subcutaneous sensor
- **Glucometer** - Fingerstick blood glucose test
- **Non-invasive glucose sensors** - Emerging technology
- **Normal Range:** 70-140 mg/dL
- **Alerts:** < 70 mg/dL (Hypoglycemia), > 180 mg/dL (Hyperglycemia)

#### **Respiratory Rate Monitor**

- **Chest impedance sensor** - Measures breathing movements
- **Capnography sensor** - CO₂ levels in breath
- **Normal Range:** 12-20 breaths/minute
- **Alerts:** < 12 or > 24 breaths/minute

#### **Weight Scale (Smart Scale)**

- **Bioimpedance scale** - Measures weight + body composition
- **Hospital-grade bed scale** - For bedridden patients
- **Alerts:** Rapid weight gain/loss patterns

#### **Fall Detection Sensor**

- **Accelerometer + Gyroscope** - Detects sudden movements
- **Wearable pendant or smartwatch**
- **Pressure mat sensors** - Bedside fall detection

#### **Sleep Apnea Monitor**

- **Pulse oximeter with trend analysis**
- **Respiratory belt sensor**
- **Alerts:** Oxygen desaturation during sleep

---

## 🔗 System Architecture & Data Flow

### **Connection Layer (Device → Gateway)**

```
[SENSORS] → [CONNECTION METHOD] → [GATEWAY/HUB] → [CLOUD/SERVER] → [WEB APP]
```

#### **Step-by-Step Data Flow:**

1. **Sensor Reading**
   - Patient vital signs measured by medical sensor
   - Analog signal converted to digital data
   - Timestamp and patient ID attached

2. **Wireless/Wired Transmission**
   - **Bluetooth LE:** Most wearables and consumer devices
   - **Wi-Fi:** Hospital-grade equipment, smart home devices
   - **Zigbee/Z-Wave:** Low-power mesh network sensors
   - **LoRaWAN:** Long-range, low-power for remote monitoring
   - **4G/5G Cellular:** Standalone wearables with SIM cards

3. **Gateway/Hub Device**
   - **Options:**
     - Smartphone app (acts as BLE-to-Cloud bridge)
     - Dedicated health hub (like Amazon Echo with health skills)
     - Raspberry Pi or Arduino-based custom gateway
     - Hospital bedside monitor terminal
4. **Cloud Server/Backend**
   - **Technologies:**
     - Firebase Realtime Database (real-time sync)
     - AWS IoT Core (device management)
     - Azure IoT Hub (enterprise healthcare)
     - Supabase (PostgreSQL + real-time subscriptions)
5. **Web Application**
   - Your React app displays data
   - Real-time updates via WebSockets
   - Alert notifications triggered

---

## 🚨 Alert & Notification System

### **Alert Triggering Logic**

```javascript
// Example Alert Algorithm
function checkVitals(reading) {
  const alerts = [];

  // Heart Rate Check
  if (reading.heartRate < 50) {
    alerts.push({
      severity: 'CRITICAL',
      type: 'Bradycardia',
      message: 'Heart rate dangerously low',
      action: 'Call emergency services'
    });
  } else if (reading.heartRate > 120) {
    alerts.push({
      severity: 'HIGH',
      type: 'Tachycardia',
      message: 'Elevated heart rate detected'
    });
  }

  // Blood Pressure Check
  if (reading.systolic > 180 || reading.diastolic > 120) {
    alerts.push({
      severity: 'CRITICAL',
      type: 'Hypertensive Crisis',
      message: 'Immediate medical attention required'
    });
  }

  // Oxygen Level Check
  if (reading.spo2 < 90) {
    alerts.push({
      severity: 'CRITICAL',
      type: 'Hypoxemia',
      message: 'Low blood oxygen - administer oxygen'
    });
  }

  // Temperature Check
  if (reading.temperature >= 103) {
    alerts.push({
      severity: 'HIGH',
      type: 'High Fever',
      message: 'Antipyretic medication may be needed'
    });
  }

  return alerts;
}
```

### **Multi-Channel Alert Delivery**

1. **In-App Notifications**
   - Real-time push to doctor dashboard
   - Patient app warnings
   - Visual + audio alerts

2. **SMS Alerts**
   - Twilio API integration
   - Critical alerts sent to doctor's phone
   - Family members notified for severe issues

3. **Email Notifications**
   - SendGrid or AWS SES
   - Detailed health reports
   - Alert summaries

4. **Voice Calls**
   - Automated call system for critical alerts
   - Escalation protocol if no response

5. **Hospital Integration**
   - Nurse station monitors
   - Pager systems
   - Electronic Medical Record (EMR) integration

---

## 🏗️ Complete System Integration

### **Hardware Setup (Patient Side)**

**Option A: Home Monitoring Kit**

```
Patient wears/uses:
├── Smartwatch (Heart Rate + SpO₂ + Temp)
├── Smart BP Cuff (Bluetooth enabled)
├── Weight Scale (Wi-Fi connected)
├── Optional: CGM patch for diabetics
└── Smartphone (Gateway device running patient app)
```

**Option B: Hospital Bedside Setup**

```
Bedside Equipment:
├── Multi-parameter patient monitor
│   ├── ECG electrodes (5-lead)
│   ├── SpO₂ finger probe
│   ├── NIBP cuff (auto-inflate every 15 min)
│   └── Temperature probe
├── Ethernet/Wi-Fi connection to hospital network
└── Direct integration with Electronic Health Records (EHR)
```

### **Backend Architecture**

```
┌─────────────────────────────────────────────────┐
│              MEDICAL SENSORS                    │
│  (Heart Rate | BP | SpO₂ | Temperature)        │
└─────────────┬───────────────────────────────────┘
              │ Bluetooth/Wi-Fi
              ▼
┌─────────────────────────────────────────────────┐
│         GATEWAY DEVICE                          │
│  (Smartphone/Hub/Hospital Monitor)              │
│  • Collects sensor data                         │
│  • Validates readings                           │
│  • Adds timestamps                              │
└─────────────┬───────────────────────────────────┘
              │ HTTPS/WebSocket
              ▼
┌─────────────────────────────────────────────────┐
│           CLOUD BACKEND                         │
│  • Supabase/Firebase/AWS                        │
│  • Real-time database                           │
│  • Alert processing engine                      │
│  • Data analytics & ML models                   │
└─────────────┬───────────────────────────────────┘
              │ Real-time sync
              ▼
┌─────────────────────────────────────────────────┐
│         WEB APPLICATION                         │
│  • Doctor Dashboard (Monitor all patients)      │
│  • Patient Dashboard (View own data)            │
│  • Family Portal (Receive alerts)               │
│  • Analytics & Reports                          │
└─────────────────────────────────────────────────┘
```

---

## 📱 Recommended Devices & Brands

### **Consumer-Grade (Home Use)**

- **Withings BPM Connect** - Wi-Fi Blood Pressure Monitor
- **Apple Watch Series 8+** - ECG, Heart Rate, SpO₂, Temp
- **Fitbit Sense 2** - Multi-sensor wearable
- **iHealth Feel** - Wireless BP monitor
- **Nonin Onyx II** - Medical-grade pulse oximeter

### **Medical-Grade (Clinical Use)**

- **GE Healthcare CARESCAPE** - Multi-parameter monitor
- **Philips IntelliVue** - Patient monitoring system
- **Masimo Radical-7** - Pulse oximeter
- **Welch Allyn Connex** - Vital signs monitor
- **Omron Evolv** - Clinical BP monitor

---

## 🔐 Security & Compliance

### **Required Standards:**

- **HIPAA Compliance** (USA) - Patient data privacy
- **GDPR** (Europe) - Data protection
- **FDA Clearance** (Medical devices in USA)
- **CE Marking** (Medical devices in Europe)

### **Data Security:**

- End-to-end encryption (AES-256)
- Secure WebSocket connections (WSS)
- OAuth 2.0 authentication
- Role-based access control (RBAC)
- Audit logs for all data access

---

## 🛠️ Implementation Steps

### **Phase 1: Basic Setup (Week 1-2)**

1. Purchase Bluetooth-enabled sensors
2. Set up smartphone gateway app
3. Configure cloud database (Supabase/Firebase)
4. Connect sensors to phone via Bluetooth
5. Test data transmission

### **Phase 2: Web App Integration (Week 3-4)**

1. Set up real-time database listeners
2. Implement alert logic in backend
3. Connect React app to database
4. Test real-time data display
5. Add notification channels

### **Phase 3: Alert System (Week 5-6)**

1. Configure Twilio for SMS
2. Set up email service
3. Implement escalation protocols
4. Test alert delivery
5. Fine-tune threshold values

### **Phase 4: Analytics & ML (Week 7-8)**

1. Collect historical data
2. Build trend analysis
3. Implement anomaly detection
4. Add predictive alerts
5. Generate health reports

---

## 💡 Real-World Use Cases

### **Scenario 1: Chronic Heart Patient (Home)**

- Patient wears smartwatch 24/7
- BP checked twice daily with smart cuff
- Irregular heartbeat triggers instant alert to cardiologist
- Weekly trend report sent to doctor

### **Scenario 2: Post-Surgery Recovery (Hospital)**

- Bedside monitor tracks all vitals every 5 minutes
- SpO₂ drop triggers nurse station alarm
- Doctor receives mobile notification
- Vitals logged in Electronic Medical Record

### **Scenario 3: Elderly Care Facility**

- Multiple patients with wearable sensors
- Central monitoring station shows all residents
- Fall detection alerts caregivers immediately
- Family members receive daily health summaries

---

## 📊 Data Format Example

### **JSON Payload from Sensor to Cloud:**

```json
{
  "patientId": "PT-2024-001",
  "timestamp": "2025-01-27T14:30:00Z",
  "deviceId": "WATCH-ABC123",
  "readings": {
    "heartRate": {
      "value": 105,
      "unit": "bpm",
      "status": "abnormal"
    },
    "bloodPressure": {
      "systolic": 145,
      "diastolic": 95,
      "unit": "mmHg",
      "status": "abnormal"
    },
    "spo2": {
      "value": 94,
      "unit": "%",
      "status": "low"
    },
    "temperature": {
      "value": 99.2,
      "unit": "F",
      "status": "normal"
    }
  },
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "battery": 65
}
```

---

## 🚀 Next Steps to Make This Real

1. **Choose Your Sensors** - Start with basics (HR, BP, SpO₂)
2. **Select Backend** - Use Supabase for easy setup
3. **Enable Bluetooth** - Add Web Bluetooth API to your React app
4. **Set Up Real-time DB** - Configure Supabase real-time subscriptions
5. **Test with Mock Data** - Simulate sensor readings
6. **Connect Real Devices** - Pair actual medical sensors
7. **Deploy & Monitor** - Launch to production with proper security

---

## 📚 Additional Resources

- **HL7 FHIR** - Healthcare data exchange standard
- **IEEE 11073** - Medical device communication standard
- **Bluetooth Health Device Profile (HDP)** - Sensor protocol
- **Apple HealthKit / Google Fit** - Health data aggregation APIs
- **MQTT Protocol** - Lightweight IoT messaging

---

**Last Updated:** January 27, 2025
**Version:** 1.0
