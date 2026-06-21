import os
import json
import uuid
import math
from flask import jsonify
import functions_framework
from pydantic import ValidationError
from google import genai
from google.genai import types
import firebase_admin
from firebase_admin import credentials, firestore

from schema import ComputeRequest, ComputeResponse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(BASE_DIR, 'cities.json'), 'r') as f:
    CITIES = json.load(f)

try:
    with open(os.path.join(BASE_DIR, '..', 'data', 'mock_hotspots.json'), 'r') as f:
        HOTSPOTS = json.load(f)
except Exception:
    HOTSPOTS = [
        {
            "id": "HS001", "lat": 31.3260, "lng": 75.3412, "weight": 0.95, "aqi_index": 412, "hcho_ppb": 22.4,
            "label": "Jalandhar - Punjab Stubble Burning", "source": "Paddy Residue Fires", "city_region": "Punjab", "satellite": "TROPOMI/Sentinel-5P"
        }
    ]

# Initialize Gemini Client using google-genai
try:
    api_key = os.environ.get("GOOGLE_API_KEY")
    client = genai.Client(api_key=api_key) if api_key else genai.Client()
except Exception as e:
    client = None
    print(f"Failed to initialize Gemini client: {e}")

# Initialize Firebase Admin
try:
    firebase_admin.initialize_app()
    db = firestore.client()
except Exception as e:
    db = None
    print(f"Failed to initialize Firebase Admin: {e}")

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2) * math.sin(dlat/2) + \
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
        math.sin(dlon/2) * math.sin(dlon/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def calculate_baseline(req: ComputeRequest) -> float:
    score = 0.0
    
    # Travel
    if req.travel.transport == 'car':
        score += req.travel.distance_km * 0.192
    elif req.travel.transport == 'motorcycle':
        score += req.travel.distance_km * 0.103
    elif req.travel.transport == 'public':
        score += req.travel.distance_km * 0.04
        
    flight_map = {'never': 0, 'once': 250, 'twice': 500, 'often': 1000}
    score += flight_map.get(req.travel.flights, 0)
    
    # Energy
    energy_factor = 0.2 if req.energy.renewable else 0.82
    if req.energy.household_size > 0:
        score += (req.energy.electricity_kwh * energy_factor) / req.energy.household_size
    
    # Diet
    diet_map = {'vegan': 50, 'vegetarian': 70, 'omnivore': 150}
    score += diet_map.get(req.personal.diet, 100)
    
    return score

@functions_framework.http
def compute_footprint(request):
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)
        
    headers = {'Access-Control-Allow-Origin': '*'}

    try:
        req_data = request.get_json()
        req_obj = ComputeRequest(**req_data)
    except ValidationError as e:
        return (jsonify({"error": "Validation Error", "details": e.errors()}), 400, headers)
    except Exception as e:
        return (jsonify({"error": "Bad Request"}), 400, headers)

    baseline_score = calculate_baseline(req_obj)

    city = req_obj.personal.city
    city_coords = CITIES.get(city, {"lat": 28.6139, "lng": 77.2090})
    
    nearest_hotspot = HOTSPOTS[0]
    min_dist = float('inf')
    
    for hs in HOTSPOTS:
        dist = haversine(city_coords['lat'], city_coords['lng'], hs['lat'], hs['lng'])
        if dist < min_dist:
            min_dist = dist
            nearest_hotspot = hs

    if min_dist < 50:
        risk_level = "critical"
    elif min_dist < 150:
        risk_level = "high"
    elif min_dist < 300:
        risk_level = "moderate"
    else:
        risk_level = "low"

    actions = []
    if client:
        prompt = f"""
        Act as an atmospheric scientist analyzing a user's carbon footprint and their proximity to HCHO/VOC agricultural burning plumes in India.
        
        User Profile:
        - City: {req_obj.personal.city}
        - Diet: {req_obj.personal.diet}
        - Transport: {req_obj.travel.transport} ({req_obj.travel.distance_km} km/month)
        - Energy: {req_obj.energy.electricity_kwh} kWh/month (Renewable: {req_obj.energy.renewable})
        - Estimated CO2e Footprint: {baseline_score:.1f} kg/month
        
        Nearest Atmospheric Hotspot:
        - Distance: {min_dist:.1f} km
        - Name: {nearest_hotspot.get('label', 'Unknown')}
        - Source: {nearest_hotspot.get('source', 'Unknown')}
        - HCHO: {nearest_hotspot.get('hcho_ppb', 0.0)} ppb
        - AQI: {nearest_hotspot.get('aqi_index', 0)}
        
        Based on this, suggest exactly 3 highly personalized, actionable micro-actions the user can take to mitigate both their carbon footprint and local atmospheric risk.
        Format your response as a JSON object matching this schema:
        {{
            "actions": [
                {{
                    "icon": "an emoji",
                    "title": "short action title",
                    "description": "scientific reasoning linking their habit to the local atmosphere",
                    "impact_estimate": "e.g., -50 kg CO2e/month"
                }}
            ]
        }}
        """
        try:
            response = client.models.generate_content(
                model='gemini-1.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                ),
            )
            gemini_data = json.loads(response.text)
            actions = gemini_data.get("actions", [])
        except Exception as e:
            print(f"Gemini API error: {e}")
            actions = [
                {"icon": "⚠️", "title": "Gemini API Unavailable", "description": "Could not connect to Gemini 1.5 Flash.", "impact_estimate": "0"}
            ] * 3
    else:
        actions = [
            {"icon": "⚠️", "title": "Missing API Key", "description": "Gemini API Key not configured.", "impact_estimate": "0"}
        ] * 3

    hs_info = {
        "id": nearest_hotspot.get("id", "HS000"),
        "lat": nearest_hotspot.get("lat", 0.0),
        "lng": nearest_hotspot.get("lng", 0.0),
        "label": nearest_hotspot.get("label", ""),
        "city_region": nearest_hotspot.get("city_region", ""),
        "aqi_index": nearest_hotspot.get("aqi_index", 0),
        "hcho_ppb": nearest_hotspot.get("hcho_ppb", 0.0),
        "source": nearest_hotspot.get("source", "Unknown"),
        "satellite": nearest_hotspot.get("satellite", "TROPOMI")
    }

    session_id = str(uuid.uuid4())
    resp_obj = ComputeResponse(
        baseline_score=baseline_score,
        proximity_km=min_dist,
        risk_level=risk_level,
        nearest_hotspot=hs_info,
        actions=actions[:3],
        session_id=session_id
    )

    # Save to Firestore
    if db:
        try:
            doc_ref = db.collection('sessions').document(session_id)
            doc_data = resp_obj.model_dump()
            doc_data['inputs'] = req_obj.model_dump()
            doc_ref.set(doc_data)
        except Exception as e:
            print(f"Firestore save error: {e}")

    return (jsonify(resp_obj.model_dump()), 200, headers)
