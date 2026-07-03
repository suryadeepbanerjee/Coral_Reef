# ============================================================
# predict.py — Coral Bleaching Risk Predictor
# Coral Reef Bleaching Prediction Dashboard
# ============================================================
# This file:
# 1. Loads the trained model from model_files/
# 2. Takes new reef input data
# 3. Returns bleaching risk prediction
# 4. Can be called by dashboard.py directly
# ============================================================

import pandas as pd
import numpy as np
import pickle
import os

# ─────────────────────────────────────────────
# STEP 1 — LOAD SAVED MODEL
# ─────────────────────────────────────────────

def load_model(model_dir='model_files'):
    """Load the trained model, scaler and features from disk"""
    print("[INFO] Loading trained model...")

    model_path    = os.path.join(model_dir, 'coral_model.pkl')
    scaler_path   = os.path.join(model_dir, 'scaler.pkl')
    features_path = os.path.join(model_dir, 'features.pkl')

    # Check if model files exist
    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"❌ Model not found at '{model_path}'\n"
            f"   Please run model.py first to train and save the model!"
        )

    with open(model_path, 'rb') as f:
        model = pickle.load(f)

    with open(scaler_path, 'rb') as f:
        scaler = pickle.load(f)

    with open(features_path, 'rb') as f:
        features = pickle.load(f)

    print("[OK] Model loaded successfully!")
    print(f"[OK] Features: {features}")
    return model, scaler, features


# ─────────────────────────────────────────────
# STEP 2 — VALIDATE INPUT DATA
# ─────────────────────────────────────────────

def validate_input(input_data, features):
    """Check that all required features are present and valid"""
    errors = []

    for feature in features:
        if feature not in input_data:
            errors.append(f"Missing feature: '{feature}'")
        elif input_data[feature] is None:
            errors.append(f"Feature '{feature}' cannot be None")
        else:
            try:
                float(input_data[feature])
            except (ValueError, TypeError):
                errors.append(f"Feature '{feature}' must be a number")

    if errors:
        print("[ERROR] Input validation failed:")
        for e in errors:
            print(f"   - {e}")
        return False

    print("[OK] Input data validated successfully!")
    return True


# ─────────────────────────────────────────────
# STEP 3 — PREDICT RISK
# ─────────────────────────────────────────────

def predict_risk(model, scaler, features, input_data):
    """
    Predict coral bleaching risk for a reef zone.

    Parameters:
        model      : trained Random Forest model
        scaler     : fitted StandardScaler
        features   : list of feature names
        input_data : dict of feature values

    Returns:
        dict with risk level, label, message, probability
    """

    # Risk label definitions
    RISK_LABELS = {
        0: {
            'label':   '🟢 LOW RISK',
            'status':  'SAFE',
            'message': 'Reef conditions are stable. No immediate threat detected.',
            'action':  'Continue regular monitoring.',
            'color':   'green'
        },
        1: {
            'label':   '🟡 MEDIUM RISK',
            'status':  'WARNING',
            'message': 'Reef is showing signs of thermal stress.',
            'action':  'Increase monitoring frequency. Prepare intervention teams.',
            'color':   'yellow'
        },
        2: {
            'label':   '🔴 HIGH RISK',
            'status':  'DANGER',
            'message': 'Bleaching event highly likely! Immediate action required.',
            'action':  'Deploy conservation teams immediately. Alert authorities.',
            'color':   'red'
        }
    }

    # --- Validate input ---
    if not validate_input(input_data, features):
        return None

    # --- Convert input to DataFrame ---
    input_df = pd.DataFrame([input_data])[features]

    # --- Scale input ---
    input_scaled = scaler.transform(input_df)

    # --- Predict ---
    prediction    = model.predict(input_scaled)[0]
    probabilities = model.predict_proba(input_scaled)[0]

    # --- Build result ---
    risk_info = RISK_LABELS[prediction]

    result = {
        'risk_level':        int(prediction),
        'risk_label':        risk_info['label'],
        'risk_status':       risk_info['status'],
        'risk_message':      risk_info['message'],
        'recommended_action': risk_info['action'],
        'risk_color':        risk_info['color'],
        'confidence':        round(probabilities[prediction] * 100, 2),
        'probabilities': {
            'Low Risk':    round(probabilities[0] * 100, 2),
            'Medium Risk': round(probabilities[1] * 100, 2),
            'High Risk':   round(probabilities[2] * 100, 2),
        },
        'input_summary': {
            'Temperature (°C)':    input_data['Temperature_Mean_Celsius'],
            'SSTA':                input_data['SSTA'],
            'DHW (SSTA)':         input_data['SSTA_DHW'],
            'DHW (TSA)':          input_data['TSA_DHW'],
            'Turbidity':           input_data['Turbidity'],
            'Cyclone Frequency':   input_data['Cyclone_Frequency'],
            'Windspeed':           input_data['Windspeed'],
            'Depth (m)':           input_data['Depth_m'],
        }
    }

    return result


# ─────────────────────────────────────────────
# STEP 4 — DISPLAY RESULT
# ─────────────────────────────────────────────

def display_result(result):
    """Print prediction result in a clean readable format"""
    if result is None:
        print("❌ Prediction failed due to invalid input.")
        return

    print("\n" + "=" * 55)
    print("  🪸 CORAL BLEACHING RISK PREDICTION RESULT")
    print("=" * 55)

    print(f"\n  Risk Level   :  {result['risk_label']}")
    print(f"  Status       :  {result['risk_status']}")
    print(f"  Confidence   :  {result['confidence']}%")
    print(f"\n  📢 {result['risk_message']}")
    print(f"  ✅ Action    :  {result['recommended_action']}")

    print("\n  📊 Probability Breakdown:")
    for label, prob in result['probabilities'].items():
        bar = '█' * int(prob / 5)
        print(f"    {label:<15} {bar:<20} {prob}%")

    print("\n  📥 Input Parameters Used:")
    for param, value in result['input_summary'].items():
        print(f"    {param:<25} :  {value}")

    print("\n" + "=" * 55)


# ─────────────────────────────────────────────
# STEP 5 — PREDICT FOR MULTIPLE ZONES
# ─────────────────────────────────────────────

def predict_multiple_zones(model, scaler, features, zones_data):
    """
    Predict bleaching risk for multiple reef zones at once.

    Parameters:
        zones_data : list of dicts, each with zone_name + feature values

    Returns:
        list of results sorted by risk level (highest first)
    """
    print(f"\n🌍 Predicting risk for {len(zones_data)} reef zones...")
    results = []

    for zone in zones_data:
        zone_name  = zone.pop('zone_name', 'Unknown Zone')
        result     = predict_risk(model, scaler, features, zone)
        if result:
            result['zone_name'] = zone_name
            results.append(result)

    # Sort by risk level — highest risk first
    results.sort(key=lambda x: x['risk_level'], reverse=True)

    print(f"\n{'Zone':<25} {'Risk':<20} {'Confidence'}")
    print("-" * 55)
    for r in results:
        print(f"  {r['zone_name']:<23} {r['risk_label']:<20} {r['confidence']}%")

    return results


# ─────────────────────────────────────────────
# MAIN — RUN PREDICTIONS
# ─────────────────────────────────────────────

if __name__ == "__main__":

    # --- Load model ---
    model, scaler, features = load_model()

    # ── Single Zone Prediction ──────────────────
    print("\n" + "─" * 55)
    print("  TEST 1 — Single Zone Prediction (High Risk)")
    print("─" * 55)

    high_risk_input = {
        'Temperature_Mean_Celsius': 31.2,
        'SSTA':                      2.5,
        'SSTA_DHW':                 12.0,
        'TSA_DHW':                  11.5,
        'Turbidity':                 0.08,
        'Cyclone_Frequency':        65.0,
        'Windspeed':                 3.5,
        'Depth_m':                   5.0,
        'SSTA_FrequencyMax':        18.0,
        'TSA_Mean':                  2.1,
        'ClimSST':                  29.5,
        'SSTA_Mean':                 1.5,
        'TSA_Frequency':             0.6,
    }

    result = predict_risk(model, scaler, features, high_risk_input)
    display_result(result)

    # ── Low Risk Zone ───────────────────────────
    print("\n" + "─" * 55)
    print("  TEST 2 — Single Zone Prediction (Low Risk)")
    print("─" * 55)

    low_risk_input = {
        'Temperature_Mean_Celsius': 26.0,
        'SSTA':                     -0.5,
        'SSTA_DHW':                  1.0,
        'TSA_DHW':                   0.8,
        'Turbidity':                 0.02,
        'Cyclone_Frequency':        20.0,
        'Windspeed':                 7.0,
        'Depth_m':                  15.0,
        'SSTA_FrequencyMax':         3.0,
        'TSA_Mean':                  0.2,
        'ClimSST':                  26.5,
        'SSTA_Mean':                -0.1,
        'TSA_Frequency':             0.1,
    }

    result2 = predict_risk(model, scaler, features, low_risk_input)
    display_result(result2)

    # ── Multiple Zones Prediction ───────────────
    print("\n" + "─" * 55)
    print("  TEST 3 — Multiple Reef Zones Comparison")
    print("─" * 55)

    zones = [
        {
            'zone_name':               'Great Barrier Reef',
            'Temperature_Mean_Celsius': 30.5,
            'SSTA':                     2.1,
            'SSTA_DHW':                10.5,
            'TSA_DHW':                  9.8,
            'Turbidity':                0.06,
            'Cyclone_Frequency':       60.0,
            'Windspeed':                4.0,
            'Depth_m':                  8.0,
            'SSTA_FrequencyMax':       15.0,
            'TSA_Mean':                 1.8,
            'ClimSST':                 29.0,
            'SSTA_Mean':                1.2,
            'TSA_Frequency':            0.5,
        },
        {
            'zone_name':               'Coral Triangle',
            'Temperature_Mean_Celsius': 28.5,
            'SSTA':                     0.8,
            'SSTA_DHW':                 4.0,
            'TSA_DHW':                  3.5,
            'Turbidity':                0.03,
            'Cyclone_Frequency':       35.0,
            'Windspeed':                6.0,
            'Depth_m':                 12.0,
            'SSTA_FrequencyMax':        7.0,
            'TSA_Mean':                 0.6,
            'ClimSST':                 28.0,
            'SSTA_Mean':                0.4,
            'TSA_Frequency':            0.2,
        },
        {
            'zone_name':               'Caribbean Reef',
            'Temperature_Mean_Celsius': 26.5,
            'SSTA':                    -0.2,
            'SSTA_DHW':                 1.5,
            'TSA_DHW':                  1.2,
            'Turbidity':                0.02,
            'Cyclone_Frequency':       25.0,
            'Windspeed':                8.0,
            'Depth_m':                 18.0,
            'SSTA_FrequencyMax':        4.0,
            'TSA_Mean':                 0.3,
            'ClimSST':                 27.0,
            'SSTA_Mean':                0.1,
            'TSA_Frequency':            0.1,
        },
        {
            'zone_name':               'Red Sea',
            'Temperature_Mean_Celsius': 29.8,
            'SSTA':                     1.5,
            'SSTA_DHW':                 7.0,
            'TSA_DHW':                  6.5,
            'Turbidity':                0.05,
            'Cyclone_Frequency':       45.0,
            'Windspeed':                5.0,
            'Depth_m':                 10.0,
            'SSTA_FrequencyMax':       11.0,
            'TSA_Mean':                 1.1,
            'ClimSST':                 28.5,
            'SSTA_Mean':                0.9,
            'TSA_Frequency':            0.35,
        },
        {
            'zone_name':               'Indian Ocean',
            'Temperature_Mean_Celsius': 27.5,
            'SSTA':                     0.3,
            'SSTA_DHW':                 2.5,
            'TSA_DHW':                  2.0,
            'Turbidity':                0.03,
            'Cyclone_Frequency':       30.0,
            'Windspeed':                6.5,
            'Depth_m':                 14.0,
            'SSTA_FrequencyMax':        5.0,
            'TSA_Mean':                 0.4,
            'ClimSST':                 27.5,
            'SSTA_Mean':                0.2,
            'TSA_Frequency':            0.15,
        },
    ]

    zone_results = predict_multiple_zones(model, scaler, features, zones)

    print("\n✅ All predictions complete!")
    print("💡 These results can now be displayed on the dashboard.")