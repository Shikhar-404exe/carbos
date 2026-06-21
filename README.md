# 🌿 VayuSense — Atmospheric Intelligence Platform

> **Hackathon Edition · ISRO × Google Cloud**
> Connecting personal carbon footprints with real-time satellite HCHO/AQI atmospheric plumes over India.

---

## 📋 Overview

VayuSense reverse-engineers the multi-step categorical input workflow of a client-side carbon calculator and transforms it into a full enterprise, Google-native ecosystem. Raw user lifestyle inputs (travel, diet, energy, waste, consumption) are dispatched to a Python Google Cloud Function that:

1. Computes an IEA-methodology baseline CO₂e score server-side
2. Calculates the user's spatial proximity (Haversine distance) to the nearest active HCHO/VOC agricultural burning hotspot detected by TROPOMI/Sentinel-5P
3. Packages the profile + proximity risk into a structured Gemini 1.5 Flash prompt
4. Returns 3 hyper-personalized micro-actions linking personal carbon behaviour to local atmospheric health risks
5. Persists the complete session to Firebase Firestore `/sessions`

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│              VayuSense Web Frontend                  │
│  (Firebase Hosting · HTML + Vanilla JS)              │
│                                                      │
│  5-tab form → collectFormState() → JSON POST         │
│  Google Maps HeatmapLayer ← mock_hotspots.json       │
└──────────────────────┬──────────────────────────────┘
                       │  HTTPS POST
                       ▼
┌─────────────────────────────────────────────────────┐
│         Google Cloud Function (Python 3.11)          │
│         functions/main.py                            │
│                                                      │
│  1. Validate payload (Pydantic schema.py)            │
│  2. Compute baseline score (IEA emission factors)    │
│  3. Haversine proximity → nearest HCHO hotspot       │
│  4. Gemini 1.5 Flash → 3 personalized actions        │
│  5. Save session to Firestore /sessions              │
└──────────────────────┬──────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
┌─────────────────┐    ┌──────────────────────────────┐
│  Gemini 1.5     │    │  Firebase Firestore           │
│  Flash API      │    │  /sessions/{sessionId}        │
│  (google-genai) │    │  (inputs · score · actions)  │
└─────────────────┘    └──────────────────────────────┘
```

---

## 📁 File Structure

```
carbon-tracker/
│
├── index.html                 # Main SPA — VayuSense UI
├── style.css                  # Dual-theme design system
│                                (light form + dark space results)
├── app.js                     # Frontend logic
│                                (state capture, POST dispatch,
│                                 Maps heatmap, results renderer)
├── data/
│   └── mock_hotspots.json     # 20 HCHO/VOC satellite hotspots (India)
│
├── functions/
│   ├── main.py                # Cloud Function endpoint
│   ├── schema.py              # Pydantic input/output models
│   ├── cities.json            # Indian city lat/lng lookup
│   └── requirements.txt       # Python dependencies
│
├── firebase.json              # Firebase Hosting + Firestore config
├── firestore.rules            # Security rules for /sessions
├── firestore_schema.md        # Firestore document layout docs
├── deploy.sh                  # One-command deploy script
└── README.md                  # This file
```

---

## ✨ Features

### 🌿 Multi-Step Input Framework
- **5 categorical tabs**: Personal (+ Indian city selector) · Travel · Waste · Energy · Consumption
- Real-time slider value display, dropdown selection, checkbox state
- Multilingual UI: English 🇬🇧 · Arabic 🇸🇦 · French 🇫🇷 · German 🇩🇪

### 🛰️ Satellite Atmospheric Overlay
- Google Maps JavaScript API with `visualization.HeatmapLayer`
- 20 HCHO/VOC agricultural burning hotspots across Punjab, Haryana, UP, Rajasthan, Maharashtra, Bihar
- Weighted by measured HCHO ppb and AQI index values
- Clickable markers with info windows showing satellite source, ppb, and AQI

### ✨ Gemini 1.5 Flash AI Analysis
- Server-side IEA-methodology baseline score computation
- Haversine proximity risk to nearest active hotspot
- `response_mime_type="application/json"` for structured output
- 3 hyper-personalized micro-actions as an atmospheric scientist

### 🔥 Firebase Persistence
- Session data auto-saved to Firestore `/sessions` collection
- Inputs + computed score + Gemini actions stored per session

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (for Firebase CLI)
- Python 3.11+ (for Cloud Functions local testing)
- Google Cloud project with Billing enabled
- Firebase project (can be the same GCP project)
- Google Maps JavaScript API key (with Maps + Visualization libraries)
- Gemini API key (`GOOGLE_API_KEY`)

### Local Development

1. **Clone the repository and open the frontend:**
   ```bash
   # Open index.html in a browser
   # The form will render; clicking "Analyze" will fail until the backend is running
   ```

2. **Start the Cloud Function locally:**
   ```bash
   cd functions
   pip install -r requirements.txt
   GOOGLE_API_KEY=your_gemini_key functions-framework --target compute_footprint --debug
   ```

3. **Set your Cloud Function URL in `app.js`:**
   ```javascript
   const CLOUD_FUNCTION_URL = 'http://localhost:8080/compute_footprint';
   ```

4. **Set your Maps API Key in `index.html`:**
   ```html
   <!-- Replace YOUR_MAPS_API_KEY in both the config and script src -->
   ```

### Deployment

```bash
# Make the deploy script executable and run
chmod +x deploy.sh
./deploy.sh
```

The `deploy.sh` script will:
- Deploy the Cloud Function to Google Cloud
- Build and deploy the frontend to Firebase Hosting

---

## 🧮 Backend Computation

The Cloud Function (`functions/main.py`) performs:

| Step | Method |
|---|---|
| Baseline Score | IEA 2024 emission factors per category |
| Proximity Risk | Haversine formula over all 20 hotspot coordinates |
| Gemini Prompt | Atmospheric scientist persona + user profile + hotspot context |
| Response Schema | Pydantic `ComputeResponse` enforced via `response_mime_type` |

---

## 🎨 Technologies

| Layer | Technology |
|---|---|
| Frontend | HTML5 · Vanilla JS (ES2022) · CSS Custom Properties |
| Maps | Google Maps JavaScript API + Visualization Library |
| Backend | Python 3.11 · Flask · Functions Framework |
| AI | Gemini 1.5 Flash via `google-genai` SDK |
| Persistence | Firebase Firestore |
| Hosting | Firebase Hosting |
| Satellite Data | TROPOMI/Sentinel-5P · MODIS/Terra · VIIRS/Suomi-NPP |

---

## 📄 License

Open source — MIT License. See [LICENSE](LICENSE).
