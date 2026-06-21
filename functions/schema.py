from pydantic import BaseModel
from typing import List, Optional

class PersonalInfo(BaseModel):
    city: str
    height: float
    weight: float
    gender: str
    diet: str
    social: str

class TravelInfo(BaseModel):
    transport: str
    distance_km: float
    flights: str

class WasteInfo(BaseModel):
    waste_kg_week: float
    recycling: str
    composting: bool

class EnergyInfo(BaseModel):
    electricity_kwh: float
    renewable: bool
    household_size: int
    heating: str

class ConsumptionInfo(BaseModel):
    clothes_monthly: int
    electronics_yearly: int
    food_waste_kg_week: float

class Metadata(BaseModel):
    language: str
    submitted_at: str
    client: str

class ComputeRequest(BaseModel):
    personal: PersonalInfo
    travel: TravelInfo
    waste: WasteInfo
    energy: EnergyInfo
    consumption: ConsumptionInfo
    metadata: Metadata

class HotspotInfo(BaseModel):
    id: str = "HS000"
    lat: float
    lng: float
    label: str
    city_region: str
    aqi_index: int
    hcho_ppb: float
    source: str
    satellite: str

class ActionItem(BaseModel):
    icon: str
    title: str
    description: str
    impact_estimate: str

class ComputeResponse(BaseModel):
    baseline_score: float
    proximity_km: float
    risk_level: str
    nearest_hotspot: HotspotInfo
    actions: List[ActionItem]
    session_id: Optional[str] = None
