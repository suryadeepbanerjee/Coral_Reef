import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

import httpx
import asyncio
from datetime import datetime, timezone, timedelta
from functools import lru_cache
from collections import defaultdict

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

from predict import load_model, predict_risk, predict_multiple_zones, display_result
from simulate import simulate_scenario, generate_zone_distribution

# ── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="Coral Reef Bleaching Predictor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://*.vercel.app",
        "*",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Startup check — warn if model files are missing (e.g. first Render deploy) ─
MODEL_DIR = os.path.join(os.path.dirname(__file__), "model_files")
if not os.path.exists(os.path.join(MODEL_DIR, "coral_model.pkl")):
    print("WARNING: model_files/coral_model.pkl not found.")
    print("Please upload coral_model.pkl, scaler.pkl, and features.pkl")
    print("to the backend/model_files/ folder on Render before starting.")
else:
    model, scaler, features = load_model(MODEL_DIR)
    print(f"[OK] Model ready — features: {features}")


# ── NOAA ERDDAP Live Data ─────────────────────────────────────────────────────

NOAA_BASE = "https://coastwatch.pfeg.noaa.gov/erddap/griddap/NOAA_DHW.csv"

ZONES = {
    "Great Barrier Reef": {"lat": -18.0, "lon": 147.0},
    "Coral Triangle":     {"lat":  0.0,  "lon": 125.0},
    "Caribbean":          {"lat": 15.0,  "lon": -66.0},
    "Red Sea":            {"lat": 21.0,  "lon":  38.0},
    "Indian Ocean":       {"lat": -5.0,  "lon":  73.0},
}

VARIABLES = ["CRW_SST", "CRW_SSTANOMALY", "CRW_DHW", "CRW_BAA"]

# ── In-memory cache ───────────────────────────────────────────────────────────
_live_cache = {
    "data": None,
    "fetched_at": None,
    "ttl_minutes": 60,
}

# ── Per-IP rate limit tracker ─────────────────────────────────────────────────
# { ip_str: [timestamp, timestamp, ...] }
_rate_limit_tracker: dict[str, list] = defaultdict(list)
RATE_LIMIT_MAX = 10       # requests
RATE_LIMIT_WINDOW = 60    # seconds


def _check_rate_limit(ip: str) -> bool:
    """Returns True if IP is within rate limit, False if exceeded."""
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(seconds=RATE_LIMIT_WINDOW)
    timestamps = _rate_limit_tracker[ip]
    # Purge old entries outside the window
    _rate_limit_tracker[ip] = [t for t in timestamps if t > window_start]
    if len(_rate_limit_tracker[ip]) >= RATE_LIMIT_MAX:
        return False
    _rate_limit_tracker[ip].append(now)
    return True


def _build_noaa_url(var_name: str, lat: float, lon: float) -> str:
    return (
        f"{NOAA_BASE}?{var_name}"
        f"[(last)][({lat:.1f}):1:({lat:.1f})][({lon:.1f}):1:({lon:.1f})]"
    )


async def fetch_zone_variable(
    client: httpx.AsyncClient,
    zone_name: str,
    var_name: str,
    lat: float,
    lon: float,
) -> Optional[float]:
    """Fetch a single variable for a single zone. Never raises — returns None on any error."""
    try:
        url = _build_noaa_url(var_name, lat, lon)
        resp = await client.get(url, timeout=12.0)
        resp.raise_for_status()
        lines = resp.text.strip().split("\n")
        # lines[0] = header, lines[1] = units, lines[2] = data
        if len(lines) < 3:
            return None
        parts = lines[2].split(",")
        return float(parts[-1].strip())
    except Exception:
        return None


async def fetch_all_live_data() -> dict:
    """
    Fan out all 20 requests (5 zones × 4 vars) simultaneously.
    Returns structured result dict ready for the /live-data response body.
    """
    async with httpx.AsyncClient(
        timeout=12.0,
        limits=httpx.Limits(max_connections=20),
    ) as client:
        tasks = []
        task_meta = []  # (zone_name, var_name)
        for zone_name, coords in ZONES.items():
            for var_name in VARIABLES:
                tasks.append(
                    fetch_zone_variable(
                        client, zone_name, var_name, coords["lat"], coords["lon"]
                    )
                )
                task_meta.append((zone_name, var_name))

        results = await asyncio.gather(*tasks, return_exceptions=True)

    # Map results back to zones
    zone_raw: dict[str, dict] = {z: {} for z in ZONES}
    for (zone_name, var_name), result in zip(task_meta, results):
        # If gather returned an exception object, treat as None
        zone_raw[zone_name][var_name] = result if not isinstance(result, Exception) else None

    # Build response structure
    zones_out = {}
    for zone_name in ZONES:
        raw = zone_raw[zone_name]
        sst         = raw.get("CRW_SST")
        sst_anomaly = raw.get("CRW_SSTANOMALY")
        dhw         = raw.get("CRW_DHW")
        baa_raw     = raw.get("CRW_BAA")

        # BAA is an integer-valued float
        alert_level = int(round(baa_raw)) if baa_raw is not None else None

        alert_labels = {
            0: "No Stress", 1: "Watch", 2: "Warning",
            3: "Alert 1", 4: "Alert 2", 5: "Alert 2+",
        }
        alert_label = alert_labels.get(alert_level, "Unknown") if alert_level is not None else "Unknown"

        # Risk from DHW / BAA
        if dhw is None and baa_raw is None:
            risk, risk_color = "UNKNOWN", "#64748b"
        elif dhw is not None and dhw < 4:
            risk, risk_color = "LOW", "#2ecc71"
        elif dhw is not None and 4 <= dhw <= 8:
            risk, risk_color = "MODERATE", "#f39c12"
        elif (dhw is not None and dhw > 8) or (alert_level is not None and alert_level >= 3):
            risk, risk_color = "HIGH", "#e74c3c"
        else:
            risk, risk_color = "UNKNOWN", "#64748b"

        # Data quality
        loaded = sum(1 for v in [sst, sst_anomaly, dhw, baa_raw] if v is not None)
        if loaded == 4:
            data_quality = "complete"
        elif loaded == 0:
            data_quality = "unavailable"
        else:
            data_quality = "partial"

        zones_out[zone_name] = {
            "sst":         round(sst, 2)         if sst is not None else None,
            "sst_anomaly": round(sst_anomaly, 2) if sst_anomaly is not None else None,
            "dhw":         round(dhw, 2)         if dhw is not None else None,
            "alert_level": alert_level,
            "alert_label": alert_label,
            "risk":        risk,
            "risk_color":  risk_color,
            "data_quality": data_quality,
        }

    return zones_out


# ── Schemas ───────────────────────────────────────────────────────────────────

class PredictInput(BaseModel):
    Temperature_Mean_Celsius: float
    SSTA:                     float
    SSTA_DHW:                 float
    TSA_DHW:                  float
    Turbidity:                float
    Cyclone_Frequency:        float
    Windspeed:                float
    Depth_m:                  float
    SSTA_FrequencyMax:        float
    TSA_Mean:                 float   # user gives positive; predict.py auto-negates
    ClimSST:                  float   # user gives Celsius; predict.py auto +273.15
    TSA_Frequency:            float


class BaselineInputs(BaseModel):
    Temperature_Mean_Celsius: float
    SSTA:                     float
    SSTA_DHW:                 float
    TSA_DHW:                  float
    Turbidity:                float
    Cyclone_Frequency:        float
    Windspeed:                float
    Depth_m:                  float
    SSTA_FrequencyMax:        float
    TSA_Mean:                 float
    ClimSST:                  float
    SSTA_Mean:                float = 0.0
    TSA_Frequency:            float


class SimulateInput(BaseModel):
    baseline_inputs: BaselineInputs
    scenario:        str = "status_quo"   # optimistic | status_quo | worst_case
    years:           int = 10


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "features": features}


@app.get("/live-data")
async def live_data(request: Request):
    # ── Rate limiting ─────────────────────────────────────────────────────────
    client_ip = request.client.host if request.client else "unknown"
    if not _check_rate_limit(client_ip):
        return JSONResponse(
            status_code=429,
            content={
                "status": "rate_limited",
                "message": "Too many requests — data refreshes every 60 minutes",
            },
        )

    now = datetime.now(timezone.utc)

    # ── Serve from cache if still fresh ──────────────────────────────────────
    if _live_cache["data"] is not None and _live_cache["fetched_at"] is not None:
        age_minutes = (now - _live_cache["fetched_at"]).total_seconds() / 60
        if age_minutes < _live_cache["ttl_minutes"]:
            zones = _live_cache["data"]
            zones_failed = sum(
                1 for z in zones.values() if z["data_quality"] == "unavailable"
            )
            return {
                "status": "cached",
                "fetched_at": _live_cache["fetched_at"].strftime("%Y-%m-%dT%H:%M:%SZ"),
                "cache_age_minutes": round(age_minutes, 1),
                "source": "NOAA Coral Reef Watch ERDDAP",
                "source_url": "https://coralreefwatch.noaa.gov",
                "zones": zones,
                "zones_loaded": len(ZONES) - zones_failed,
                "zones_failed": zones_failed,
            }

    # ── Fetch fresh data from NOAA ────────────────────────────────────────────
    try:
        zones = await fetch_all_live_data()
    except Exception:
        # If NOAA is completely unreachable, return 503
        return JSONResponse(
            status_code=503,
            content={
                "status": "unavailable",
                "message": "Live satellite feed temporarily unavailable",
                "fallback": "historical",
            },
        )

    # Check if everything is unavailable (total failure)
    all_unavailable = all(
        z["data_quality"] == "unavailable" for z in zones.values()
    )
    if all_unavailable:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unavailable",
                "message": "Live satellite feed temporarily unavailable",
                "fallback": "historical",
            },
        )

    # ── Update cache ──────────────────────────────────────────────────────────
    _live_cache["data"] = zones
    _live_cache["fetched_at"] = now

    zones_failed = sum(
        1 for z in zones.values() if z["data_quality"] == "unavailable"
    )

    return {
        "status": "live",
        "fetched_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "cache_age_minutes": 0,
        "source": "NOAA Coral Reef Watch ERDDAP",
        "source_url": "https://coralreefwatch.noaa.gov",
        "zones": zones,
        "zones_loaded": len(ZONES) - zones_failed,
        "zones_failed": zones_failed,
    }


@app.post("/predict")
def predict(body: PredictInput):
    # Build the 13-key input dict; SSTA_Mean is always hardcoded to 0.0
    input_data = {
        "Temperature_Mean_Celsius": body.Temperature_Mean_Celsius,
        "SSTA":                     body.SSTA,
        "SSTA_DHW":                 body.SSTA_DHW,
        "TSA_DHW":                  body.TSA_DHW,
        "Turbidity":                body.Turbidity,
        "Cyclone_Frequency":        body.Cyclone_Frequency,
        "Windspeed":                body.Windspeed,
        "Depth_m":                  body.Depth_m,
        "SSTA_FrequencyMax":        body.SSTA_FrequencyMax,
        "TSA_Mean":                 body.TSA_Mean,
        "ClimSST":                  body.ClimSST,
        "SSTA_Mean":                0.0,          # hardcoded — never exposed as slider
        "TSA_Frequency":            body.TSA_Frequency,
    }

    result = predict_risk(model, scaler, features, input_data)

    if result is None:
        raise HTTPException(status_code=422, detail="Input validation failed — check feature values.")

    return result


@app.post("/simulate")
def simulate(body: SimulateInput):
    valid_scenarios = {"optimistic", "status_quo", "worst_case"}
    if body.scenario not in valid_scenarios:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid scenario '{body.scenario}'. Valid: {sorted(valid_scenarios)}"
        )

    # Build the baseline dict (keep SSTA_Mean = 0.0 to match model training)
    baseline = body.baseline_inputs.model_dump()
    baseline["SSTA_Mean"] = 0.0

    df = simulate_scenario(
        baseline_inputs=baseline,
        scenario=body.scenario,
        years=body.years,
    )

    return df.to_dict(orient="records")
