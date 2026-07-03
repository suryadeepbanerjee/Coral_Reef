# ============================================================
# predict.py — Coral Bleaching Risk Predictor
# Coral Reef Bleaching Prediction Dashboard
# ============================================================
# Pipeline:   Random Forest (200 trees, max_depth=15)
#             + StandardScaler + SMOTE-balanced training
# Risk Levels:
#   0 → 🟢 LOW RISK    (0–3%   bleaching)
#   1 → 🟡 MEDIUM RISK (3–25%  bleaching)
#   2 → 🔴 HIGH RISK   (25–100% bleaching)
# ============================================================

import os
import pickle
import pandas as pd
import numpy as np


# ─────────────────────────────────────────────
# CONSTANTS
# ─────────────────────────────────────────────

FEATURE_ORDER = [
    'Temperature_Mean_Celsius',
    'SSTA',
    'SSTA_DHW',
    'TSA_DHW',
    'Turbidity',
    'Cyclone_Frequency',
    'Windspeed',
    'Depth_m',
    'SSTA_FrequencyMax',
    'TSA_Mean',
    'ClimSST',
    'SSTA_Mean',
    'TSA_Frequency',
]

RISK_META = {
    0: {
        'label':              '🟢 LOW RISK',
        'status':             'SAFE',
        'message':            (
            'Reef conditions are stable. Sea surface temperatures '
            'and thermal stress indicators are within safe bounds. '
            'No bleaching threat detected at this time.'
        ),
        'recommended_action': (
            'Continue routine monitoring. Maintain existing marine '
            'protected area protocols and document baseline coral '
            'cover for future comparison.'
        ),
    },
    1: {
        'label':              '🟡 MEDIUM RISK',
        'status':             'WARNING',
        'message':            (
            'Reef is showing early signs of thermal stress. '
            'Elevated sea surface temperatures and anomaly values '
            'suggest conditions are approaching bleaching thresholds.'
        ),
        'recommended_action': (
            'Increase monitoring frequency to bi-weekly surveys. '
            'Alert local conservation teams and prepare intervention '
            'resources. Restrict high-impact activities such as '
            'anchoring and intensive diving near vulnerable zones.'
        ),
    },
    2: {
        'label':              '🔴 HIGH RISK',
        'status':             'DANGER',
        'message':            (
            'Critical bleaching conditions detected! Prolonged '
            'thermal stress and extreme DHW values indicate an '
            'imminent or active mass bleaching event.'
        ),
        'recommended_action': (
            'Deploy conservation response teams immediately. '
            'Issue formal bleaching alert to marine authorities '
            'and government environmental agencies. Enforce full '
            'no-take and no-entry zones. Begin coral fragment '
            'rescue and assisted migration protocols where possible.'
        ),
    },
}


# ─────────────────────────────────────────────
# STEP 1 — ARTIFACT LOADING
# ─────────────────────────────────────────────

def load_model(model_dir='model_files'):
    """
    Safely load the trained Random Forest model, StandardScaler,
    and feature name list from serialised pickle artifacts on disk.

    Parameters
    ----------
    model_dir : str
        Path to the directory containing coral_model.pkl,
        scaler.pkl, and features.pkl.

    Returns
    -------
    tuple : (model, scaler, features)
        model    — trained RandomForestClassifier
        scaler   — fitted StandardScaler
        features — ordered list of 13 feature name strings

    Raises
    ------
    FileNotFoundError
        If any of the three required artifact files are missing.
    """
    print(f"📦 Loading model artifacts from '{model_dir}/'...")

    paths = {
        'model':    os.path.join(model_dir, 'coral_model.pkl'),
        'scaler':   os.path.join(model_dir, 'scaler.pkl'),
        'features': os.path.join(model_dir, 'features.pkl'),
    }

    for name, path in paths.items():
        if not os.path.exists(path):
            raise FileNotFoundError(
                f"❌ Required artifact '{path}' not found.\n"
                f"   Please run model.py first to train and save the model."
            )

    with open(paths['model'],    'rb') as f:
        model = pickle.load(f)
    with open(paths['scaler'],   'rb') as f:
        scaler = pickle.load(f)
    with open(paths['features'], 'rb') as f:
        features = pickle.load(f)

    print(f"✅ Model loaded  — {model.n_estimators} trees, "
          f"max_depth={model.max_depth}")
    print(f"✅ Scaler loaded — {len(features)} features")
    return model, scaler, features


# ─────────────────────────────────────────────
# STEP 2 — INPUT VALIDATION
# ─────────────────────────────────────────────

def validate_input(input_data, features):
    """
    Validate an incoming prediction request dictionary.

    Checks performed (in order):
      1. All required feature keys are present.
      2. No feature value is None.
      3. Every value can be safely cast to a Python float.

    Parameters
    ----------
    input_data : dict
        Dictionary mapping feature names to their values.
    features : list[str]
        Ordered list of expected feature names.

    Returns
    -------
    bool
        True if all checks pass, False otherwise.
        Prints a descriptive error message for every failure found.
    """
    errors = []

    for feature in features:

        # Check 1 — key presence
        if feature not in input_data:
            errors.append(f"  Missing key       : '{feature}'")
            continue

        # Check 2 — non-null
        if input_data[feature] is None:
            errors.append(f"  None value        : '{feature}' must not be None")
            continue

        # Check 3 — numeric castability
        try:
            float(input_data[feature])
        except (ValueError, TypeError):
            errors.append(
                f"  Non-numeric value : '{feature}' = "
                f"'{input_data[feature]}' cannot be cast to float"
            )

    if errors:
        print("❌ Input validation failed:")
        for e in errors:
            print(e)
        return False

    return True


# ─────────────────────────────────────────────
# STEP 3 — AUTOMATED UNIT & DATA CORRECTIONS
# ─────────────────────────────────────────────

def _apply_corrections(raw_input):
    """
    Apply three automated data corrections to align user-supplied
    values with the scale and distribution of the NOAA training data.

    Corrections applied (in order):

    1. ClimSST  — Users supply values in Celsius via the dashboard
                  slider. The NOAA training dataset stores ClimSST
                  in Kelvin (range ≈ 262–307 K). If the incoming
                  value is < 100 (clearly Celsius), add 273.15 to
                  convert to Kelvin.

    2. TSA_Mean — The training dataset's TSA_Mean column spans only
                  negative values (≈ −8.88 to 0.0). A positive
                  dashboard input is automatically negated to place
                  it within the learned distribution.

    3. SSTA_Mean — This feature is constant at 0.0 across the entire
                   training dataset. To simplify the UI we removed
                   its slider entirely. The value is hardcoded to 0.0
                   regardless of anything the caller supplies.

    Parameters
    ----------
    raw_input : dict
        Original user-supplied input dictionary.

    Returns
    -------
    dict
        A corrected copy of the input dictionary. The original is
        never mutated.
    """
    corrected = raw_input.copy()

    # Correction 1 — ClimSST: Celsius → Kelvin
    clim = float(corrected.get('ClimSST', 0))
    if clim < 100:
        corrected['ClimSST'] = clim + 273.15

    # Correction 2 — TSA_Mean: force into negative domain
    tsa = float(corrected.get('TSA_Mean', 0))
    if tsa > 0:
        corrected['TSA_Mean'] = -tsa

    # Correction 3 — SSTA_Mean: hardcode to training-data constant
    corrected['SSTA_Mean'] = 0.0

    return corrected


# ─────────────────────────────────────────────
# STEP 4 — CORE PREDICTION
# ─────────────────────────────────────────────

def predict_risk(model, scaler, features, input_data):
    """
    Predict coral bleaching risk for a single reef zone.

    Internal pipeline (in order):
      1. Copy and apply automated unit / data corrections.
      2. Validate all 13 feature keys and values.
      3. Build a single-row DataFrame ordered by feature list.
      4. Scale with the pre-fitted StandardScaler.
      5. Run inference through the Random Forest ensemble.
      6. Aggregate class votes into probabilities.
      7. Return a fully descriptive result dictionary.

    Parameters
    ----------
    model    : RandomForestClassifier — trained ensemble
    scaler   : StandardScaler        — fitted normaliser
    features : list[str]             — ordered feature names
    input_data : dict
        Raw user-supplied values. ClimSST may be in Celsius;
        TSA_Mean may be positive; SSTA_Mean may be anything —
        all three are corrected automatically before inference.

    Returns
    -------
    dict or None
        Prediction result dictionary on success, None on
        validation failure.

    Result dictionary keys
    ----------------------
    risk_level          : int   — 0, 1, or 2
    risk_label          : str   — emoji-prefixed label string
    risk_status         : str   — 'SAFE', 'WARNING', or 'DANGER'
    risk_message        : str   — environmental context message
    recommended_action  : str   — conservation guidance text
    confidence          : float — probability of winning class (%)
    probabilities       : dict  — {'Low Risk': %, 'Medium Risk': %, 'High Risk': %}
    input_summary       : dict  — human-readable parameter snapshot
    """

    # --- Step 3: apply automated corrections before anything else ---
    corrected = _apply_corrections(input_data)

    # --- Step 2: validate corrected values ---
    if not validate_input(corrected, features):
        return None

    # --- Build ordered single-row DataFrame ---
    input_df = pd.DataFrame(
        [[float(corrected[f]) for f in features]],
        columns=features
    )

    # --- Scale ---
    input_scaled = scaler.transform(input_df)

    # --- Inference ---
    prediction    = int(model.predict(input_scaled)[0])
    probabilities = model.predict_proba(input_scaled)[0]

    # --- Assemble result ---
    meta       = RISK_META[prediction]
    confidence = round(float(probabilities[prediction]) * 100, 2)

    result = {
        'risk_level':          prediction,
        'risk_label':          meta['label'],
        'risk_status':         meta['status'],
        'risk_message':        meta['message'],
        'recommended_action':  meta['recommended_action'],
        'confidence':          confidence,
        'probabilities': {
            'Low Risk':    round(float(probabilities[0]) * 100, 2),
            'Medium Risk': round(float(probabilities[1]) * 100, 2),
            'High Risk':   round(float(probabilities[2]) * 100, 2),
        },
        'input_summary': {
            'Sea Surface Temp (°C)':   corrected['Temperature_Mean_Celsius'],
            'SST Anomaly (SSTA)':      corrected['SSTA'],
            'DHW — SSTA (weeks)':      corrected['SSTA_DHW'],
            'DHW — TSA (weeks)':       corrected['TSA_DHW'],
            'Turbidity':               corrected['Turbidity'],
            'Cyclone Frequency':       corrected['Cyclone_Frequency'],
            'Windspeed':               corrected['Windspeed'],
            'Reef Depth (m)':          corrected['Depth_m'],
            'SSTA Frequency Max':      corrected['SSTA_FrequencyMax'],
            'TSA Mean':                corrected['TSA_Mean'],
            'Climatic SST (K)':        corrected['ClimSST'],
            'SSTA Mean (fixed)':       corrected['SSTA_Mean'],
            'TSA Frequency':           corrected['TSA_Frequency'],
        },
    }

    return result


# ─────────────────────────────────────────────
# STEP 4 — DISPLAY HELPER
# ─────────────────────────────────────────────

def display_result(result, zone_name='Reef Zone'):
    """
    Print a formatted, human-readable prediction result to the
    console including a text-based probability bar chart.

    Parameters
    ----------
    result    : dict   — output from predict_risk()
    zone_name : str    — display name of the reef zone
    """
    if result is None:
        print("❌ Cannot display result — prediction failed.")
        return

    print()
    print("=" * 60)
    print(f"  🪸 PREDICTION RESULT — {zone_name.upper()}")
    print("=" * 60)
    print(f"  Risk Level   :  {result['risk_label']}")
    print(f"  Status       :  {result['risk_status']}")
    print(f"  Confidence   :  {result['confidence']}%")
    print()
    print(f"  📢 {result['risk_message']}")
    print()
    print(f"  ✅ Action    :  {result['recommended_action']}")
    print()
    print("  📊 Probability Breakdown:")

    for label, prob in result['probabilities'].items():
        filled  = int(prob / 5)
        empty   = 20 - filled
        bar     = '█' * filled + '░' * empty
        print(f"    {label:<14}  [{bar}]  {prob:.2f}%")

    print()
    print("  📥 Input Parameters:")
    for param, value in result['input_summary'].items():
        print(f"    {param:<28}:  {value}")
    print("=" * 60)


# ─────────────────────────────────────────────
# STEP 5 — MULTI-ZONE COMPARISON
# ─────────────────────────────────────────────

def predict_multiple_zones(model, scaler, features, zones_data):
    """
    Run predictions across multiple reef zones in a single call
    and return results sorted by highest risk level first.

    Parameters
    ----------
    model      : RandomForestClassifier
    scaler     : StandardScaler
    features   : list[str]
    zones_data : list[dict]
        Each dictionary must contain a 'zone_name' string key
        plus all 13 feature keys required by predict_risk().

    Returns
    -------
    list[dict]
        List of prediction result dictionaries, each augmented
        with a 'zone_name' key, sorted descending by risk_level
        (highest risk zones appear first).
    """
    print(f"\n🌍 Running predictions for {len(zones_data)} reef zones...")
    results = []

    for zone in zones_data:
        zone_copy = zone.copy()
        zone_name = zone_copy.pop('zone_name', 'Unknown Zone')
        result    = predict_risk(model, scaler, features, zone_copy)

        if result:
            result['zone_name'] = zone_name
            results.append(result)

    # Sort by risk level descending — highest risk zones first
    results.sort(key=lambda x: x['risk_level'], reverse=True)

    # Print comparison table
    print()
    print("=" * 60)
    print("  🌍 MULTI-ZONE RISK SUMMARY")
    print("=" * 60)
    print(f"  {'Zone':<25} {'Risk':<16} {'Confidence':>10}")
    print("  " + "-" * 55)
    for r in results:
        print(f"  {r['zone_name']:<25} {r['risk_label']:<16} "
              f"{r['confidence']:>9.2f}%")
    print("=" * 60)

    return results


# ─────────────────────────────────────────────
# STEP 6 — CONSOLE DEMONSTRATION
# ─────────────────────────────────────────────

if __name__ == "__main__":

    print("=" * 60)
    print("  🪸 CORAL BLEACHING RISK PREDICTOR — DEMO")
    print("=" * 60)

    # Load artifacts
    model, scaler, features = load_model('model_files')

    # ── Demo 1: HIGH RISK zone (raw Celsius ClimSST to test conversion)
    print("\n📍 Demo 1 — High Risk Zone (ClimSST supplied in Celsius)")
    high_risk_input = {
        'Temperature_Mean_Celsius': 32.0,
        'SSTA':                      4.5,
        'SSTA_DHW':                 15.0,
        'TSA_DHW':                  14.0,
        'Turbidity':                 0.3,
        'Cyclone_Frequency':        80.0,
        'Windspeed':                 8.0,
        'Depth_m':                   5.0,
        'SSTA_FrequencyMax':        40.0,
        'TSA_Mean':                  0.5,   # positive → auto-negated
        'ClimSST':                  32.0,   # Celsius  → auto +273.15
        'SSTA_Mean':                 9.9,   # any value → auto set to 0.0
        'TSA_Frequency':             0.8,
    }
    result_high = predict_risk(model, scaler, features, high_risk_input)
    display_result(result_high, 'Great Barrier Reef — Extreme')

    # ── Demo 2: LOW RISK zone
    print("\n📍 Demo 2 — Low Risk Zone")
    low_risk_input = {
        'Temperature_Mean_Celsius': 22.0,
        'SSTA':                     -1.5,
        'SSTA_DHW':                  0.5,
        'TSA_DHW':                   0.3,
        'Turbidity':                 0.05,
        'Cyclone_Frequency':        25.0,
        'Windspeed':                 3.0,
        'Depth_m':                  20.0,
        'SSTA_FrequencyMax':        10.0,
        'TSA_Mean':                  3.0,   # positive → auto-negated to -3.0
        'ClimSST':                  23.0,   # Celsius  → auto +273.15
        'SSTA_Mean':                 0.0,
        'TSA_Frequency':             0.05,
    }
    result_low = predict_risk(model, scaler, features, low_risk_input)
    display_result(result_low, 'Caribbean Reef — Mild')

    # ── Demo 3: MEDIUM RISK zone
    print("\n📍 Demo 3 — Medium Risk Zone")
    medium_risk_input = {
        'Temperature_Mean_Celsius': 28.5,
        'SSTA':                      1.0,
        'SSTA_DHW':                  5.0,
        'TSA_DHW':                   4.5,
        'Turbidity':                 0.1,
        'Cyclone_Frequency':        40.0,
        'Windspeed':                 6.0,
        'Depth_m':                  12.0,
        'SSTA_FrequencyMax':        20.0,
        'TSA_Mean':                  1.5,   # positive → auto-negated to -1.5
        'ClimSST':                  27.5,   # Celsius  → auto +273.15
        'SSTA_Mean':                 0.0,
        'TSA_Frequency':             0.3,
    }
    result_med = predict_risk(model, scaler, features, medium_risk_input)
    display_result(result_med, 'Red Sea — Borderline')

    # ── Demo 4: Multi-Zone Comparison
    print("\n📍 Demo 4 — Multi-Zone Comparison")
    zones = [
        {
            'zone_name':               'Great Barrier Reef',
            'Temperature_Mean_Celsius': 30.5,
            'SSTA':                      2.1,
            'SSTA_DHW':                 10.5,
            'TSA_DHW':                   9.8,
            'Turbidity':                 0.06,
            'Cyclone_Frequency':        60.0,
            'Windspeed':                 4.0,
            'Depth_m':                   8.0,
            'SSTA_FrequencyMax':        35.0,
            'TSA_Mean':                  1.8,
            'ClimSST':                  29.0,
            'SSTA_Mean':                 0.0,
            'TSA_Frequency':             0.5,
        },
        {
            'zone_name':               'Coral Triangle',
            'Temperature_Mean_Celsius': 27.5,
            'SSTA':                      0.5,
            'SSTA_DHW':                  3.5,
            'TSA_DHW':                   3.0,
            'Turbidity':                 0.04,
            'Cyclone_Frequency':        35.0,
            'Windspeed':                 6.0,
            'Depth_m':                  14.0,
            'SSTA_FrequencyMax':        18.0,
            'TSA_Mean':                  0.8,
            'ClimSST':                  27.2,
            'SSTA_Mean':                 0.0,
            'TSA_Frequency':             0.2,
        },
        {
            'zone_name':               'Caribbean Reef',
            'Temperature_Mean_Celsius': 23.0,
            'SSTA':                     -1.0,
            'SSTA_DHW':                  1.0,
            'TSA_DHW':                   0.8,
            'Turbidity':                 0.02,
            'Cyclone_Frequency':        22.0,
            'Windspeed':                 4.0,
            'Depth_m':                  18.0,
            'SSTA_FrequencyMax':         8.0,
            'TSA_Mean':                  2.0,
            'ClimSST':                  24.0,
            'SSTA_Mean':                 0.0,
            'TSA_Frequency':             0.08,
        },
        {
            'zone_name':               'Red Sea',
            'Temperature_Mean_Celsius': 29.5,
            'SSTA':                      1.5,
            'SSTA_DHW':                  7.0,
            'TSA_DHW':                   6.5,
            'Turbidity':                 0.05,
            'Cyclone_Frequency':        45.0,
            'Windspeed':                 5.0,
            'Depth_m':                  10.0,
            'SSTA_FrequencyMax':        28.0,
            'TSA_Mean':                  1.1,
            'ClimSST':                  28.5,
            'SSTA_Mean':                 0.0,
            'TSA_Frequency':             0.35,
        },
        {
            'zone_name':               'Indian Ocean',
            'Temperature_Mean_Celsius': 26.0,
            'SSTA':                      0.3,
            'SSTA_DHW':                  2.0,
            'TSA_DHW':                   1.8,
            'Turbidity':                 0.03,
            'Cyclone_Frequency':        30.0,
            'Windspeed':                 6.5,
            'Depth_m':                  15.0,
            'SSTA_FrequencyMax':        14.0,
            'TSA_Mean':                  0.5,
            'ClimSST':                  27.0,
            'SSTA_Mean':                 0.0,
            'TSA_Frequency':             0.15,
        },
    ]

    zone_results = predict_multiple_zones(model, scaler, features, zones)

    print("\n✅ All predictions complete!")
    print("💡 Integrate predict_risk() into dashboard.py via:")
    print("   from predict import load_model, predict_risk")