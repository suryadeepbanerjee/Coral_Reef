import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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
