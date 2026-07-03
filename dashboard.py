import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go

from predict import load_model, predict_risk
from simulate import simulate_temperature_rise, simulate_climate_change, simulate_all_zones, ZONE_BASELINES

# ──────────────────────────────────────────────────────────────
# PAGE CONFIG
# ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="🪸 Coral Reef Bleaching Dashboard",
    page_icon="🪸",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ──────────────────────────────────────────────────────────────
# LOAD MODEL (cached — runs once)
# ──────────────────────────────────────────────────────────────
@st.cache_resource
def init_model():
    return load_model()

model, scaler, features = init_model()

# ──────────────────────────────────────────────────────────────
# LOAD CSV DATA (cached — runs once)
# ──────────────────────────────────────────────────────────────
@st.cache_data
def load_data():
    df = pd.read_csv("data/final_coral_reef_data.csv", low_memory=False)
    # Drop rows missing core numeric columns
    df = df.dropna(subset=["Latitude_Degrees", "Longitude_Degrees"])
    return df

df = load_data()

# ──────────────────────────────────────────────────────────────
# SIDEBAR — 13 SLIDERS
# ──────────────────────────────────────────────────────────────
st.sidebar.title("🎛️ Predictor Inputs")
st.sidebar.markdown("Adjust environmental parameters to get a live ML risk prediction.")
st.sidebar.markdown("---")

gbr = ZONE_BASELINES["Great Barrier Reef"]

temp     = st.sidebar.slider("🌡️ Temperature Mean (°C)",  20.0, 35.0, float(gbr["Temperature_Mean_Celsius"]), 0.1)
ssta     = st.sidebar.slider("📈 SSTA",                   -2.0,  5.0, float(gbr["SSTA"]),                    0.05)
ssta_dhw = st.sidebar.slider("🔥 SSTA DHW (°C-weeks)",     0.0, 20.0, float(gbr["SSTA_DHW"]),                0.1)
tsa_dhw  = st.sidebar.slider("🔥 TSA DHW (°C-weeks)",      0.0, 20.0, float(gbr["TSA_DHW"]),                 0.1)
turb     = st.sidebar.slider("💧 Turbidity",               0.0,  0.5, float(gbr["Turbidity"]),               0.01)
cyclone  = st.sidebar.slider("🌀 Cyclone Frequency",       0.0,100.0, float(gbr["Cyclone_Frequency"]),        1.0)
wind     = st.sidebar.slider("💨 Windspeed (m/s)",         0.0, 20.0, float(gbr["Windspeed"]),               0.1)
depth    = st.sidebar.slider("🏊 Depth (m)",               0.0, 50.0, float(gbr["Depth_m"]),                 0.5)
ssta_fmx = st.sidebar.slider("📊 SSTA Frequency Max",      0.0, 30.0, float(gbr["SSTA_FrequencyMax"]),       0.5)
tsa_mean = st.sidebar.slider("🌊 TSA Mean",                0.0,  5.0, float(gbr["TSA_Mean"]),                0.05)
clim_sst = st.sidebar.slider("🌍 Climatology SST (°C)",   20.0, 35.0, float(gbr["ClimSST"]),                 0.1)
ssta_mn  = st.sidebar.slider("📉 SSTA Mean",              -2.0,  5.0, float(gbr["SSTA_Mean"]),               0.05)
tsa_freq = st.sidebar.slider("🔁 TSA Frequency",           0.0,  1.0, float(gbr["TSA_Frequency"]),           0.01)

input_data = {
    "Temperature_Mean_Celsius": temp,
    "SSTA":                     ssta,
    "SSTA_DHW":                 ssta_dhw,
    "TSA_DHW":                  tsa_dhw,
    "Turbidity":                turb,
    "Cyclone_Frequency":        cyclone,
    "Windspeed":                wind,
    "Depth_m":                  depth,
    "SSTA_FrequencyMax":        ssta_fmx,
    "TSA_Mean":                 tsa_mean,
    "ClimSST":                  clim_sst,
    "SSTA_Mean":                ssta_mn,
    "TSA_Frequency":            tsa_freq,
}

# ──────────────────────────────────────────────────────────────
# RUN PREDICTION
# ──────────────────────────────────────────────────────────────
result = predict_risk(model, scaler, features, input_data)

# ──────────────────────────────────────────────────────────────
# HEADER
# ──────────────────────────────────────────────────────────────
st.title("🪸 Coral Reef Bleaching Prediction Dashboard")
st.caption("Data: final_coral_reef_data.csv  ·  Model: Random Forest (local pkl)  ·  No external API")
st.markdown("---")

# ──────────────────────────────────────────────────────────────
# TABS
# ──────────────────────────────────────────────────────────────
tab1, tab2, tab3 = st.tabs(["🎯 Live Prediction", "🌡️ Simulations", "📊 Dataset Explorer"])

# ══════════════════════════════════════════════════════════════
# TAB 1 — LIVE PREDICTION
# ══════════════════════════════════════════════════════════════
with tab1:

    if result is None:
        st.error("Prediction failed. Check that all inputs are valid numbers.")
    else:
        risk_level  = result["risk_level"]
        risk_label  = result["risk_label"]
        risk_msg    = result["risk_message"]
        risk_action = result["recommended_action"]
        confidence  = result["confidence"]
        probs       = result["probabilities"]   # {"Low Risk": %, "Medium Risk": %, "High Risk": %}

        # ── Risk badge colour ──────────────────────
        badge_colour = {"SAFE": "green", "WARNING": "orange", "DANGER": "red"}
        colour = badge_colour.get(result["risk_status"], "blue")

        # ── Top KPI row ────────────────────────────
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("🏷️ Risk Level",    risk_label)
        c2.metric("🎯 Confidence",    f"{confidence}%")
        c3.metric("🌡️ Temperature",  f"{temp}°C")
        c4.metric("🔥 SSTA DHW",      f"{ssta_dhw} °C-wks")

        st.markdown("---")

        col_left, col_right = st.columns([1, 1])

        # ── Gauge chart ────────────────────────────
        with col_left:
            st.subheader("Bleaching Probability Gauge")
            high_pct = probs["High Risk"]
            fig_gauge = go.Figure(go.Indicator(
                mode="gauge+number+delta",
                value=high_pct,
                number={"suffix": "%"},
                title={"text": "High Risk Probability"},
                delta={"reference": 33, "increasing": {"color": "red"}, "decreasing": {"color": "green"}},
                gauge={
                    "axis": {"range": [0, 100], "tickwidth": 1},
                    "bar": {"color": "crimson" if high_pct > 60 else "orange" if high_pct > 30 else "green"},
                    "steps": [
                        {"range": [0,  33], "color": "#d4edda"},
                        {"range": [33, 66], "color": "#fff3cd"},
                        {"range": [66,100], "color": "#f8d7da"},
                    ],
                    "threshold": {
                        "line": {"color": "red", "width": 4},
                        "thickness": 0.75,
                        "value": 66
                    }
                }
            ))
            fig_gauge.update_layout(height=300, margin=dict(t=40, b=0))
            st.plotly_chart(fig_gauge, use_container_width=True)

        # ── Prob breakdown bar ──────────────────────
        with col_right:
            st.subheader("Risk Probability Breakdown")
            prob_df = pd.DataFrame({
                "Category": list(probs.keys()),
                "Probability (%)": list(probs.values())
            })
            colours = ["#28a745", "#ffc107", "#dc3545"]
            fig_bar = px.bar(
                prob_df, x="Category", y="Probability (%)",
                color="Category",
                color_discrete_sequence=colours,
                text="Probability (%)"
            )
            fig_bar.update_traces(texttemplate="%{text:.1f}%", textposition="outside")
            fig_bar.update_layout(showlegend=False, height=300, margin=dict(t=20, b=0))
            st.plotly_chart(fig_bar, use_container_width=True)

        st.markdown("---")

        # ── Message & Action ───────────────────────
        if result["risk_status"] == "SAFE":
            st.success(f"**{risk_label}** — {risk_msg}")
        elif result["risk_status"] == "WARNING":
            st.warning(f"**{risk_label}** — {risk_msg}")
        else:
            st.error(f"**{risk_label}** — {risk_msg}")

        st.info(f"✅ **Recommended Action:** {risk_action}")

# ══════════════════════════════════════════════════════════════
# TAB 2 — SIMULATIONS
# ══════════════════════════════════════════════════════════════
with tab2:
    st.subheader("What-If Scenario Simulations")
    sim_zone = st.selectbox("Select Reef Zone for Simulation", list(ZONE_BASELINES.keys()))

    col_s1, col_s2 = st.columns(2)

    with col_s1:
        st.markdown("#### 🌡️ Temperature Rise Scenario")
        with st.spinner("Running simulation..."):
            tr_results = simulate_temperature_rise(model, scaler, features, sim_zone)
        tr_df = pd.DataFrame(tr_results)
        fig_tr = px.line(
            tr_df, x="temp_increase", y="prob_high", markers=True,
            labels={"temp_increase": "Temp Increase (°C)", "prob_high": "High Risk Prob (%)"},
            color_discrete_sequence=["#e74c3c"]
        )
        fig_tr.update_traces(line_width=3, marker_size=8)
        fig_tr.update_layout(height=350)
        st.plotly_chart(fig_tr, use_container_width=True)
        st.dataframe(tr_df[["temp_increase", "temperature", "risk_label", "confidence"]].rename(
            columns={"temp_increase": "+Temp (°C)", "temperature": "Final Temp (°C)",
                     "risk_label": "Risk", "confidence": "Confidence (%)"}
        ), use_container_width=True)

    with col_s2:
        st.markdown("#### 🌍 Climate Change (IPCC +0.2°C/yr)")
        with st.spinner("Running simulation..."):
            cc_results = simulate_climate_change(model, scaler, features, sim_zone, 2024, 2050)
        cc_df = pd.DataFrame(cc_results)
        fig_cc = px.area(
            cc_df, x="year", y="prob_high",
            labels={"year": "Year", "prob_high": "High Risk Prob (%)"},
            color_discrete_sequence=["#e67e22"]
        )
        fig_cc.update_layout(height=350)
        st.plotly_chart(fig_cc, use_container_width=True)
        st.dataframe(cc_df[["year", "temperature", "dhw", "risk_label", "confidence"]].rename(
            columns={"year": "Year", "temperature": "Temp (°C)", "dhw": "DHW",
                     "risk_label": "Risk", "confidence": "Confidence (%)"}
        ), use_container_width=True)

    st.markdown("---")
    st.markdown("#### 🌍 All Zones Comparison")
    temp_rise_compare = st.slider("Apply temperature increase to all zones", 0.0, 3.0, 0.0, 0.5)
    with st.spinner("Comparing all zones..."):
        all_zone_results = simulate_all_zones(model, scaler, features, temp_increase=temp_rise_compare)
    az_df = pd.DataFrame(all_zone_results)
    fig_az = px.bar(
        az_df, x="zone_name", y="prob_high",
        color="risk_label",
        color_discrete_map={"🟢 LOW": "#28a745", "🟡 MEDIUM": "#ffc107", "🔴 HIGH": "#dc3545"},
        labels={"zone_name": "Reef Zone", "prob_high": "High Risk Prob (%)", "risk_label": "Risk"},
        text="prob_high"
    )
    fig_az.update_traces(texttemplate="%{text:.1f}%", textposition="outside")
    fig_az.update_layout(height=400, showlegend=True)
    st.plotly_chart(fig_az, use_container_width=True)

# ══════════════════════════════════════════════════════════════
# TAB 3 — DATASET EXPLORER
# ══════════════════════════════════════════════════════════════
with tab3:
    st.subheader("Historical Coral Reef Dataset")
    st.caption(f"Total records: {len(df):,}  ·  Source: final_coral_reef_data.csv")

    # Quick stats
    col_d1, col_d2, col_d3, col_d4 = st.columns(4)
    col_d1.metric("Total Records",    f"{len(df):,}")
    col_d2.metric("Avg Temp (°C)",    f"{df['Temperature_Mean_Celsius'].mean():.1f}" if "Temperature_Mean_Celsius" in df.columns else "N/A")
    col_d3.metric("Bleached Sites",   f"{(df['bleaching_label']==1).sum():,}" if "bleaching_label" in df.columns else "N/A")
    col_d4.metric("Countries",        f"{df['Country_Name'].nunique()}" if "Country_Name" in df.columns else "N/A")

    st.markdown("---")

    # Map
    if "Latitude_Degrees" in df.columns:
        st.markdown("#### 🗺️ Site Locations")
        map_df = df[["Latitude_Degrees", "Longitude_Degrees"]].dropna().rename(
            columns={"Latitude_Degrees": "lat", "Longitude_Degrees": "lon"}
        )
        st.map(map_df.sample(min(2000, len(map_df))), zoom=1)

    st.markdown("---")

    # Filters
    st.markdown("#### 🔍 Filter & Explore")
    col_f1, col_f2 = st.columns(2)
    with col_f1:
        if "Ocean_Name" in df.columns:
            ocean_filter = st.multiselect("Filter by Ocean", df["Ocean_Name"].dropna().unique().tolist(), default=[])
    with col_f2:
        if "Date_Year" in df.columns:
            years = sorted(df["Date_Year"].dropna().unique().astype(int).tolist())
            year_range = st.select_slider("Filter by Year", options=years, value=(min(years), max(years)))

    filtered = df.copy()
    if ocean_filter:
        filtered = filtered[filtered["Ocean_Name"].isin(ocean_filter)]
    if "Date_Year" in df.columns:
        filtered = filtered[(filtered["Date_Year"] >= year_range[0]) & (filtered["Date_Year"] <= year_range[1])]

    st.dataframe(filtered.head(200), use_container_width=True)
    st.caption(f"Showing first 200 of {len(filtered):,} filtered records.")

    # Bleaching distribution
    if "bleaching_label" in df.columns:
        st.markdown("#### 📊 Bleaching Label Distribution")
        label_counts = filtered["bleaching_label"].value_counts().reset_index()
        label_counts.columns = ["Label", "Count"]
        label_counts["Label"] = label_counts["Label"].map({0: "No Bleaching", 1: "Bleaching", 2: "Severe"}).fillna(label_counts["Label"].astype(str))
        fig_dist = px.pie(label_counts, names="Label", values="Count",
                          color_discrete_sequence=["#28a745", "#ffc107", "#dc3545"])
        st.plotly_chart(fig_dist, use_container_width=True)
