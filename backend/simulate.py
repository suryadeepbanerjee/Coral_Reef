# ============================================================
# simulate.py — Climate Scenario Simulation Module
# Coral Reef Bleaching Prediction Dashboard
# ============================================================
# Simulates reef health degradation over a 10-year timeline
# under three climate scenarios using baseline user inputs.
#
# Output DataFrame columns (exactly):
#   'Year'                   — 0 to 10
#   'Overall Reef Health (%)' — health index per year
#   'Bleaching Probability (%)' — exactly 100 - health per year
# ============================================================

import copy
from typing import Dict, Any

import pandas as pd


# ─────────────────────────────────────────────
# CONSTANTS — SCENARIO DEGRADATION RATES
# ─────────────────────────────────────────────

SCENARIO_RATES: Dict[str, Dict[str, Any]] = {
    "optimistic": {
        "description":   "Optimistic — Strong global climate action",
        "annual_decline": 1.5,   # % health lost per year
        "recovery_boost": 0.5,   # % partial recovery if health is high
    },
    "status_quo": {
        "description":   "Status Quo — Current global trajectory",
        "annual_decline": 4.0,
        "recovery_boost": 0.0,
    },
    "worst_case": {
        "description":   "Worst Case — No climate mitigation",
        "annual_decline": 8.0,
        "recovery_boost": 0.0,
    },
}


# ─────────────────────────────────────────────
# BASELINE HEALTH CALCULATOR
# ─────────────────────────────────────────────

def _calculate_baseline_health(inputs: Dict[str, Any]) -> float:
    """
    Derive a starting Reef Health Index (0–100%) from the
    user's 13 environmental slider inputs.

    Higher thermal stress, temperature anomaly, and DHW values
    reduce the starting health. Deeper reefs and lower turbidity
    contribute positively to the baseline.

    Parameters
    ----------
    inputs : dict
        Baseline user input dictionary containing the 13 feature
        keys used by the prediction model.

    Returns
    -------
    float
        Starting reef health percentage, clamped to [0.0, 100.0].
    """
    health = 100.0

    # Temperature penalty — each degree above 26°C costs 2 health points
    temp  = float(inputs.get("Temperature_Mean_Celsius", 26.0))
    health -= max(0.0, (temp - 26.0) * 2.0)

    # SSTA penalty — positive anomaly degrades health
    ssta  = float(inputs.get("SSTA", 0.0))
    health -= max(0.0, ssta * 4.0)

    # DHW penalty — weeks of heat stress are the strongest bleaching driver
    dhw   = float(inputs.get("SSTA_DHW", 0.0))
    health -= max(0.0, dhw * 1.2)

    # Turbidity penalty — murky water reduces coral photosynthesis
    turb  = float(inputs.get("Turbidity", 0.03))
    health -= turb * 20.0

    # Depth bonus — deeper reefs are more thermally buffered
    depth = float(inputs.get("Depth_m", 10.0))
    health += min(5.0, depth * 0.15)

    # TSA_Mean penalty — chronic thermal stress reduces baseline
    tsa   = float(inputs.get("TSA_Mean", 0.0))
    health -= max(0.0, abs(tsa) * 1.5)

    return round(max(0.0, min(100.0, health)), 2)


# ─────────────────────────────────────────────
# CORE SIMULATION FUNCTION
# ─────────────────────────────────────────────

def simulate_scenario(
    baseline_inputs: Dict[str, Any],
    scenario:        str = "status_quo",
    years:           int = 10,
) -> pd.DataFrame:
    """
    Project coral reef health over a 10-year timeline under a
    selected climate scenario, starting from a baseline derived
    from the user's environmental slider inputs.

    The function never mutates the caller's input dictionary —
    a strict deep copy is made at entry.

    Parameters
    ----------
    baseline_inputs : dict
        The same 13-key input dictionary used for single-zone
        prediction. Must include at minimum:
          Temperature_Mean_Celsius, SSTA, SSTA_DHW, Turbidity,
          Depth_m, TSA_Mean.
    scenario : str, optional
        Climate pathway key. One of:
          'optimistic' | 'status_quo' | 'worst_case'
        Defaults to 'status_quo'.
    years : int, optional
        Number of years to simulate (Year 0 to Year N).
        Default is 10, producing 11 rows (Year 0 … Year 10).

    Returns
    -------
    pd.DataFrame
        Exactly three columns:
          'Year'                    — int, 0 to years (inclusive)
          'Overall Reef Health (%)'  — float, 0.0 to 100.0
          'Bleaching Probability (%)' — float, exactly 100 - health

    Raises
    ------
    ValueError
        If an unrecognised scenario key is supplied.
    """
    if scenario not in SCENARIO_RATES:
        raise ValueError(
            f"Unknown scenario '{scenario}'. "
            f"Valid options: {list(SCENARIO_RATES.keys())}"
        )

    # Deep copy — never mutate the live dashboard state
    inputs = copy.deepcopy(baseline_inputs)
    config = SCENARIO_RATES[scenario]

    # Year 0 baseline health derived from environmental inputs
    current_health = _calculate_baseline_health(inputs)

    records = []

    for year in range(years + 1):  # 0 to years inclusive

        health      = round(max(0.0, min(100.0, current_health)), 2)
        bleach_prob = round(100.0 - health, 2)

        records.append({
            "Year":                      year,
            "Overall Reef Health (%)":   health,
            "Bleaching Probability (%)": bleach_prob,
        })

        if year < years:
            # Apply annual health degradation for the next year
            current_health -= config["annual_decline"]

            # Optimistic scenario partial recovery when health is still high
            if config["recovery_boost"] > 0 and current_health > 70.0:
                current_health += config["recovery_boost"]

    df = pd.DataFrame(records)
    df["Year"] = df["Year"].astype(int)

    return df


# ─────────────────────────────────────────────
# ZONE DISTRIBUTION HELPER (for Plotly charts)
# ─────────────────────────────────────────────

def generate_zone_distribution(zone_results: list) -> pd.DataFrame:
    """
    Aggregate categorical risk labels from multi-zone prediction
    outputs into a value-counts DataFrame for Plotly pie/donut charts.

    Parameters
    ----------
    zone_results : list[dict]
        List of result dicts from predict_multiple_zones().
        Each must contain a 'risk_label' key.

    Returns
    -------
    pd.DataFrame
        Columns: 'Risk_Label', 'Count'
        Sorted High → Medium → Low for consistent chart rendering.
    """
    if not zone_results:
        return pd.DataFrame(columns=["Risk_Label", "Count"])

    labels = [r["risk_label"] for r in zone_results if "risk_label" in r]
    counts = pd.Series(labels).value_counts().reset_index()
    counts.columns = ["Risk_Label", "Count"]

    order_map = {
        "🔴 HIGH RISK":   0,
        "🟡 MEDIUM RISK": 1,
        "🟢 LOW RISK":    2,
    }
    counts["_order"] = counts["Risk_Label"].map(order_map).fillna(99)
    counts = (
        counts
        .sort_values("_order")
        .drop(columns="_order")
        .reset_index(drop=True)
    )

    return counts


# ─────────────────────────────────────────────
# TERMINAL VERIFICATION BLOCK
# ─────────────────────────────────────────────

if __name__ == "__main__":

    # Baseline input — same 13 sliders as predict.py
    baseline: Dict[str, Any] = {
        "Temperature_Mean_Celsius": 27.5,
        "SSTA":                      0.5,
        "SSTA_DHW":                  3.5,
        "TSA_DHW":                   3.0,
        "Turbidity":                 0.04,
        "Cyclone_Frequency":        35.0,
        "Windspeed":                 6.0,
        "Depth_m":                  14.0,
        "SSTA_FrequencyMax":        18.0,
        "TSA_Mean":                 -0.8,
        "ClimSST":                 300.65,
        "SSTA_Mean":                 0.0,
        "TSA_Frequency":             0.2,
    }

    print("=" * 65)
    print("  🪸 CORAL REEF CLIMATE SCENARIO SIMULATOR — DEMO")
    print("=" * 65)

    baseline_health = _calculate_baseline_health(baseline)
    print(f"\n  📍 Baseline Reef Health (Year 0): {baseline_health}%")
    print(f"  📍 Baseline Bleaching Probability: {round(100 - baseline_health, 2)}%")

    for scenario_key in ["optimistic", "status_quo", "worst_case"]:

        df = simulate_scenario(baseline, scenario=scenario_key, years=10)
        desc = SCENARIO_RATES[scenario_key]["description"]

        print(f"\n{'=' * 65}")
        print(f"  📈 {desc.upper()}")
        print(f"{'=' * 65}")
        print(
            f"  {'Year':<6}"
            f"{'Health (%)':<16}"
            f"{'Bleach Prob (%)':<18}"
        )
        print("  " + "-" * 40)

        for _, row in df.iterrows():
            print(
                f"  {int(row['Year']):<6}"
                f"{row['Overall Reef Health (%)']:<16}"
                f"{row['Bleaching Probability (%)']:<18}"
            )

        start_h = df.iloc[0]["Overall Reef Health (%)"]
        end_h   = df.iloc[-1]["Overall Reef Health (%)"]
        change  = round(end_h - start_h, 2)
        trend   = "▼ Degraded" if change < 0 else "▲ Improved"
        print(f"\n  Year 0 Health: {start_h}%  →  Year 10: {end_h}%  ({trend} by {abs(change)}%)")

    # Verify immutability
    print(f"\n{'=' * 65}")
    print("  🔒 Immutability check:")
    original_temp = baseline["Temperature_Mean_Celsius"]
    print(
        f"     baseline['Temperature_Mean_Celsius'] = {original_temp}  "
        f"{'✅ unchanged' if original_temp == 27.5 else '❌ MUTATED — bug!'}"
    )

    # Verify exact formula: Bleaching Probability = 100 - Health
    print("\n  🔢 Formula verification (Bleaching = 100 - Health):")
    df_check = simulate_scenario(baseline, scenario="status_quo")
    all_correct = all(
        abs((100 - row["Overall Reef Health (%)"]) - row["Bleaching Probability (%)"]) < 0.01
        for _, row in df_check.iterrows()
    )
    print(f"     All rows satisfy formula: {'✅ YES' if all_correct else '❌ NO — bug!'}")
    print(f"\n  ✅ Simulation demo complete!")
    print(f"  💡 Import into Streamlit via:")
    print(f"     from simulate import simulate_scenario, generate_zone_distribution")