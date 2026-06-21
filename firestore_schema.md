# Firestore Schema: VayuSense

## Collection: `/sessions`
Stores each user's footprint analysis session. Written by the Cloud Function.

### Document ID:
Auto-generated UUID (matches `session_id` in response).

### Document Fields:
- `baseline_score` (Number): Computed footprint in kg CO2e/month.
- `proximity_km` (Number): Distance to nearest hotspot.
- `risk_level` (String): Risk categorization (e.g., "high", "moderate").
- `nearest_hotspot` (Map):
  - `id` (String): Hotspot ID
  - `label` (String): Display name
  - `hcho_ppb` (Number): Formaldehyde concentration
  - `aqi_index` (Number): Air Quality Index
- `actions` (Array of Maps):
  - `title` (String): Micro-action title
  - `description` (String): Scientific reasoning
  - `impact_estimate` (String): Expected reduction
- `inputs` (Map): The raw inputs submitted by the user.
