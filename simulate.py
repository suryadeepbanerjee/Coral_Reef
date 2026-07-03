# ============================================================
# simulate.py — Coral Bleaching What-If Scenario Simulator
# Coral Reef Bleaching Prediction Dashboard
# ============================================================

import pandas as pd
import numpy as np
import pickle
import os

# ─────────────────────────────────────────────
# REEF ZONE BASELINE DATA
# ─────────────────────────────────────────────

ZONE_BASELINES = {
    'Great Barrier Reef': {
        'Temperature_Mean_Celsius': 26.8,
        'Temperature_Mean':         26.8,
        'SSTA':                      0.45,
        'SSTA_DHW':                  3.2,
        'TSA_DHW':                   2.9,
        'Turbidity':                 0.03,
        'Cyclone_Frequency':        42.0,
        'Windspeed':                 5.5,
        'Depth_m':                  12.0,
        'SSTA_FrequencyMax':         6.5,
        'TSA_Mean':                  0.6,
        'ClimSST':                  26.5,
        'SSTA_Mean':                 0.3,
        'TSA_Frequency':             0.2,
    },
    'Coral Triangle': {
        'Temperature_Mean_Celsius': 27.5,
        'Temperature_Mean':         27.5,
        'SSTA':                      0.35,
        'SSTA_DHW':                  2.8,
        'TSA_DHW':                   2.5,
        'Turbidity':                 0.04,
        'Cyclone_Frequency':        38.0,
        'Windspeed':                 6.0,
        'Depth_m':                  14.0,
        'SSTA_FrequencyMax':         5.5,
        'TSA_Mean':                  0.5,
        'ClimSST':                  27.2,
        'SSTA_Mean':                 0.25,
        'TSA_Frequency':             0.18,
    },
    'Caribbean Reef': {
        'Temperature_Mean_Celsius': 26.2,
        'Temperature_Mean':         26.2,
        'SSTA':                     -0.1,
        'SSTA_DHW':                  1.5,
        'TSA_DHW':                   1.2,
        'Turbidity':                 0.02,
        'Cyclone_Frequency':        25.0,
        'Windspeed':                 7.5,
        'Depth_m':                  18.0,
        'SSTA_FrequencyMax':         3.5,
        'TSA_Mean':                  0.3,
        'ClimSST':                  26.8,
        'SSTA_Mean':                 0.1,
        'TSA_Frequency':             0.12,
    },
    'Red Sea': {
        'Temperature_Mean_Celsius': 27.9,
        'Temperature_Mean':         27.9,
        'SSTA':                      0.8,
        'SSTA_DHW':                  4.5,
        'TSA_DHW':                   4.0,
        'Turbidity':                 0.05,
        'Cyclone_Frequency':        35.0,
        'Windspeed':                 5.0,
        'Depth_m':                  10.0,
        'SSTA_FrequencyMax':         8.0,
        'TSA_Mean':                  0.9,
        'ClimSST':                  27.5,
        'SSTA_Mean':                 0.6,
        'TSA_Frequency':             0.28,
    },
    'Indian Ocean': {
        'Temperature_Mean_Celsius': 27.1,
        'Temperature_Mean':         27.1,
        'SSTA':                      0.25,
        'SSTA_DHW':                  2.2,
        'TSA_DHW':                   2.0,
        'Turbidity':                 0.03,
        'Cyclone_Frequency':        30.0,
        'Windspeed':                 6.5,
        'Depth_m':                  15.0,
        'SSTA_FrequencyMax':         4.5,
        'TSA_Mean':                  0.4,
        'ClimSST':                  27.0,
        'SSTA_Mean':                 0.2,
        'TSA_Frequency':             0.15,
    },
}


# ─────────────────────────────────────────────
# LOAD MODEL
# ─────────────────────────────────────────────

def load_model(model_dir='model_files'):
    """Load trained model, scaler and features"""
    print("📦 Loading model for simulation...")
    with open(os.path.join(model_dir, 'coral_model.pkl'), 'rb') as f:
        model = pickle.load(f)
    with open(os.path.join(model_dir, 'scaler.pkl'), 'rb') as f:
        scaler = pickle.load(f)
    with open(os.path.join(model_dir, 'features.pkl'), 'rb') as f:
        features = pickle.load(f)
    print("✅ Model loaded!")
    return model, scaler, features


# ─────────────────────────────────────────────
# CORE PREDICTION HELPER
# ─────────────────────────────────────────────

def _predict(model, scaler, features, input_data):
    """Internal prediction — used by all simulations"""
    RISK_LABELS = {0: '🟢 LOW', 1: '🟡 MEDIUM', 2: '🔴 HIGH'}

    df         = pd.DataFrame([input_data])[features]
    scaled     = scaler.transform(df)
    prediction = model.predict(scaled)[0]
    probs      = model.predict_proba(scaled)[0]

    return {
        'risk_level':  int(prediction),
        'risk_label':  RISK_LABELS[prediction],
        'confidence':  round(probs[prediction] * 100, 2),
        'prob_low':    round(probs[0] * 100, 2),
        'prob_medium': round(probs[1] * 100, 2),
        'prob_high':   round(probs[2] * 100, 2),
    }


# ─────────────────────────────────────────────
# SIMULATION 1 — TEMPERATURE RISE
# ─────────────────────────────────────────────

def simulate_temperature_rise(model, scaler, features,
                               zone_name, temp_increases=None):
    """
    Simulate how bleaching risk changes as temperature rises.
    Returns list of results for each temperature increase step.
    """
    if temp_increases is None:
        temp_increases = [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0]

    baseline = ZONE_BASELINES[zone_name].copy()
    results  = []

    print(f"\n🌡️  Temperature Rise Simulation — {zone_name}")
    print(f"    Baseline Temp: {baseline['Temperature_Mean_Celsius']}°C")
    print("-" * 58)
    print(f"  {'Increase':<12} {'Temp (°C)':<14} {'Risk':<12} {'Confidence'}")
    print("-" * 58)

    for increase in temp_increases:
        simulated = baseline.copy()
        # Raise temperature and related parameters
        simulated['Temperature_Mean']          += increase
        simulated['Temperature_Mean_Celsius']  += increase
        simulated['SSTA']                      += increase * 0.8
        simulated['SSTA_DHW']                  += increase * 2.5
        simulated['TSA_DHW']                   += increase * 2.2
        simulated['SSTA_Mean']                 += increase * 0.4
        simulated['TSA_Mean']                  += increase * 0.3

        result = _predict(model, scaler, features, simulated)
        result['temp_increase'] = increase
        result['temperature']   = round(
            simulated['Temperature_Mean_Celsius'], 2)
        result['zone_name']     = zone_name
        results.append(result)

        print(f"  +{increase}°C        "
              f"{result['temperature']}°C          "
              f"{result['risk_label']:<12} "
              f"{result['confidence']}%")

    return results


# ─────────────────────────────────────────────
# SIMULATION 2 — CLIMATE CHANGE YEAR BY YEAR
# ─────────────────────────────────────────────

def simulate_climate_change(model, scaler, features,
                             zone_name,
                             start_year=2024,
                             end_year=2050):
    """
    Simulate bleaching risk year by year under climate change.
    Uses IPCC projection of +0.2°C per year.
    """
    baseline = ZONE_BASELINES[zone_name].copy()
    results  = []
    years    = range(start_year, end_year + 1, 2)

    TEMP_RISE_PER_YEAR = 0.2
    DHW_RISE_PER_YEAR  = 0.3
    SSTA_RISE_PER_YEAR = 0.08

    print(f"\n🌍 Climate Change Simulation — {zone_name}")
    print(f"    Period: {start_year} → {end_year}")
    print(f"    Rate: +{TEMP_RISE_PER_YEAR}°C/year (IPCC projection)")
    print("-" * 62)
    print(f"  {'Year':<8} {'Temp (°C)':<12} {'DHW':<10} {'Risk':<12} {'Confidence'}")
    print("-" * 62)

    for year in years:
        n         = year - start_year
        simulated = baseline.copy()

        simulated['Temperature_Mean']         += n * TEMP_RISE_PER_YEAR
        simulated['Temperature_Mean_Celsius'] += n * TEMP_RISE_PER_YEAR
        simulated['SSTA']                     += n * SSTA_RISE_PER_YEAR
        simulated['SSTA_DHW']                 += n * DHW_RISE_PER_YEAR
        simulated['TSA_DHW']                  += n * DHW_RISE_PER_YEAR * 0.9
        simulated['SSTA_FrequencyMax']        += n * 0.5
        simulated['TSA_Mean']                 += n * 0.05
        simulated['SSTA_Mean']                += n * 0.04

        result = _predict(model, scaler, features, simulated)
        result['year']        = year
        result['temperature'] = round(
            simulated['Temperature_Mean_Celsius'], 2)
        result['dhw']         = round(simulated['SSTA_DHW'], 2)
        result['zone_name']   = zone_name
        results.append(result)

        print(f"  {year:<8} {result['temperature']:<12} "
              f"{result['dhw']:<10} {result['risk_label']:<12} "
              f"{result['confidence']}%")

    return results


# ─────────────────────────────────────────────
# SIMULATION 3 — CUSTOM PARAMETER CHANGE
# ─────────────────────────────────────────────

def simulate_custom(model, scaler, features,
                    zone_name, parameter, values, label=None):
    """
    Simulate how changing ANY single parameter affects risk.
    Perfect for dashboard sliders!
    """
    baseline = ZONE_BASELINES[zone_name].copy()
    results  = []
    label    = label or parameter

    print(f"\n🎛️  Custom Simulation — {zone_name}")
    print(f"    Varying: {label}")
    print("-" * 55)
    print(f"  {label:<22} {'Risk':<14} {'Confidence'}")
    print("-" * 55)

    for val in values:
        simulated            = baseline.copy()
        simulated[parameter] = val

        result = _predict(model, scaler, features, simulated)
        result['parameter_value'] = val
        result['parameter_name']  = label
        result['zone_name']       = zone_name
        results.append(result)

        print(f"  {str(val):<22} {result['risk_label']:<14} "
              f"{result['confidence']}%")

    return results


# ─────────────────────────────────────────────
# SIMULATION 4 — ALL ZONES COMPARISON
# ─────────────────────────────────────────────

def simulate_all_zones(model, scaler, features, temp_increase=0):
    """
    Compare bleaching risk across all 5 reef zones.
    Optionally apply a temperature increase to all zones.
    """
    results = []

    title = "Current Conditions"
    if temp_increase > 0:
        title = f"With +{temp_increase}°C Temperature Rise"

    print(f"\n🌍 All Zones — {title}")
    print("-" * 62)
    print(f"  {'Zone':<25} {'Risk':<12} {'Confidence':<14} {'High Risk %'}")
    print("-" * 62)

    for zone_name, baseline in ZONE_BASELINES.items():
        simulated = baseline.copy()
        simulated['Temperature_Mean']         += temp_increase
        simulated['Temperature_Mean_Celsius'] += temp_increase
        simulated['SSTA']                     += temp_increase * 0.8
        simulated['SSTA_DHW']                 += temp_increase * 2.5
        simulated['TSA_DHW']                  += temp_increase * 2.2

        result              = _predict(model, scaler, features, simulated)
        result['zone_name'] = zone_name
        results.append(result)

        print(f"  {zone_name:<25} {result['risk_label']:<12} "
              f"{result['confidence']}%          {result['prob_high']}%")

    results.sort(key=lambda x: x['risk_level'], reverse=True)
    return results


# ─────────────────────────────────────────────
# SIMULATION 5 — FULL REPORT (for dashboard)
# ─────────────────────────────────────────────

def run_full_simulation(model, scaler, features, zone_name):
    """
    Run ALL simulations for one zone.
    Dashboard calls this to get complete scenario data.
    Returns everything needed to draw graphs.
    """
    print("\n" + "=" * 60)
    print(f"  🪸 FULL SIMULATION REPORT — {zone_name}")
    print("=" * 60)

    report = {
        'zone_name':        zone_name,
        'baseline':         ZONE_BASELINES[zone_name],
        'temperature_rise': simulate_temperature_rise(
                                model, scaler, features, zone_name),
        'climate_change':   simulate_climate_change(
                                model, scaler, features, zone_name),
        'dhw_impact':       simulate_custom(
                                model, scaler, features, zone_name,
                                'SSTA_DHW',
                                [0, 2, 4, 6, 8, 10, 12, 15],
                                'Degree Heating Weeks'),
        'all_zones_now':    simulate_all_zones(
                                model, scaler, features,
                                temp_increase=0),
        'all_zones_2050':   simulate_all_zones(
                                model, scaler, features,
                                temp_increase=2.0),
    }

    print("\n✅ Full Simulation Complete!")
    return report


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("  🪸 CORAL BLEACHING SCENARIO SIMULATOR")
    print("=" * 60)

    model, scaler, features = load_model()

    # Test 1 — Temperature Rise
    simulate_temperature_rise(
        model, scaler, features, 'Great Barrier Reef')

    # Test 2 — Climate Change
    simulate_climate_change(
        model, scaler, features, 'Great Barrier Reef', 2024, 2050)

    # Test 3 — DHW Impact
    simulate_custom(
        model, scaler, features,
        zone_name='Coral Triangle',
        parameter='SSTA_DHW',
        values=[0, 2, 4, 6, 8, 10, 12, 15],
        label='Degree Heating Weeks')

    # Test 4 — All Zones Now
    simulate_all_zones(model, scaler, features, temp_increase=0)

    # Test 5 — All Zones 2050
    simulate_all_zones(model, scaler, features, temp_increase=2.0)

    print("\n✅ All simulations complete!")
    print("💡 Dashboard can now use these results for graphs!")