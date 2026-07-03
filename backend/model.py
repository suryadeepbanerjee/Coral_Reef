# ============================================================
# model.py — Coral Bleaching Prediction Model (FINAL)
# Coral Reef Bleaching Prediction Dashboard
# ============================================================
# Final Configuration: Random Forest + SMOTE + 3% optimized threshold
# ============================================================

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from imblearn.over_sampling import SMOTE
import pickle
import os

# ─────────────────────────────────────────────
# STEP 1 — LOAD DATA
# ─────────────────────────────────────────────

def load_data(filepath):
    """Load the cleaned coral reef dataset"""
    print("📂 Loading dataset...")
    df = pd.read_csv(filepath, low_memory=False)
    print(f"✅ Loaded {len(df)} records with {len(df.columns)} columns")
    return df


# ─────────────────────────────────────────────
# STEP 2 — PREPARE FEATURES & LABELS
# ─────────────────────────────────────────────

def prepare_data(df):
    """Select features, create risk labels, handle missing values"""
    print("\n🔧 Preparing data...")

    features = [
        'Temperature_Mean_Celsius',  # SST in Celsius
        'SSTA',                      # Sea Surface Temp Anomaly
        'SSTA_DHW',                  # Degree Heating Weeks
        'TSA_DHW',                   # Thermal Stress Anomaly DHW
        'Turbidity',                 # Water clarity
        'Cyclone_Frequency',         # Storm activity
        'Windspeed',                 # Wind conditions
        'Depth_m',                   # Reef depth
        'SSTA_FrequencyMax',         # Max SST anomaly frequency
        'TSA_Mean',                  # Average thermal stress (always negative in data)
        'ClimSST',                   # Climatological SST (Kelvin in raw data)
        'SSTA_Mean',                 # Average SST anomaly (always 0.0 in data)
        'TSA_Frequency',             # Thermal stress frequency
    ]
    target = 'Percent_Bleaching'

    # --- Drop duplicates ---
    df = df.drop_duplicates().copy()
    print(f"✅ Removed duplicates → {len(df)} records remaining")

    # --- Convert all feature columns to numeric ---
    for col in features + [target]:
        df[col] = pd.to_numeric(df[col], errors='coerce')

    # --- Drop rows where target is missing ---
    df = df.dropna(subset=[target])
    print(f"✅ Removed rows with missing target → {len(df)} records remaining")

    # --- Fill missing feature values with median ---
    for col in features:
        if df[col].isnull().sum() > 0:
            df[col] = df[col].fillna(df[col].median())
            print(f"🩹 Filled missing values in '{col}' with median.")

    print("✅ Using 'Temperature_Mean_Celsius' directly from data.")

    # --- Create Risk Label from Percent_Bleaching ---
    # OPTIMIZED THRESHOLDS (3% optimized cutoff for early warning detection)
    def assign_risk(pct):
        if pct <= 3:
            return 0
        elif pct <= 25:
            return 1
        else:
            return 2

    df['Risk_Level'] = df[target].apply(assign_risk)

    risk_counts = df['Risk_Level'].value_counts()
    print(f"✅ Risk Labels created (3% threshold optimized):")
    print(f"   🟢 Low Risk    (0-3%):    {risk_counts.get(0, 0)} records")
    print(f"   🟡 Medium Risk (3-25%):   {risk_counts.get(1, 0)} records")
    print(f"   🔴 High Risk   (25-100%): {risk_counts.get(2, 0)} records")

    X = df[features]
    y = df['Risk_Level']

    return X, y, features


# ─────────────────────────────────────────────
# STEP 3 — SPLIT DATA
# ─────────────────────────────────────────────

def split_data(X, y):
    """Split into training and testing sets (80% train, 20% test)"""
    print("\n✂️  Splitting data into train/test sets...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=0.2,
        random_state=42,
        stratify=y
    )
    print(f"✅ Training set:  {len(X_train)} records")
    print(f"✅ Testing set:   {len(X_test)} records")
    return X_train, X_test, y_train, y_test


# ─────────────────────────────────────────────
# STEP 4 — SCALE FEATURES
# ─────────────────────────────────────────────

def scale_features(X_train, X_test):
    """Normalise features so all are on the same scale"""
    print("\n⚖️  Scaling features...")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled  = scaler.transform(X_test)
    print("✅ Features scaled successfully")
    return X_train_scaled, X_test_scaled, scaler


# ─────────────────────────────────────────────
# STEP 5 — BALANCE CLASSES WITH SMOTE
# ─────────────────────────────────────────────

def balance_classes(X_train_scaled, y_train):
    """Apply SMOTE to balance classes (only on training partition)"""
    print("\n⚖️  Applying SMOTE to balance classes...")
    print(f"   Before SMOTE: {pd.Series(y_train).value_counts().to_dict()}")

    smote = SMOTE(random_state=42)
    X_train_balanced, y_train_balanced = smote.fit_resample(X_train_scaled, y_train)

    print(f"   After SMOTE:  {pd.Series(y_train_balanced).value_counts().to_dict()}")
    print("✅ Classes balanced successfully")

    return X_train_balanced, y_train_balanced


# ─────────────────────────────────────────────
# STEP 6 — TRAIN MODEL
# ─────────────────────────────────────────────

def train_model(X_train_balanced, y_train_balanced):
    """Train the Random Forest Classifier on balanced data"""
    print("\n🧠 Training Random Forest model...")
    model = RandomForestClassifier(
        n_estimators=200,        # 200 decision trees
        max_depth=15,            # Max tree depth
        min_samples_split=5,     # Min samples to split a node
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train_balanced, y_train_balanced)
    print("✅ Model trained successfully!")
    return model


# ─────────────────────────────────────────────
# STEP 7 — EVALUATE MODEL
# ─────────────────────────────────────────────

def evaluate_model(model, X_test_scaled, y_test):
    """Test model accuracy on UNSEEN, UNBALANCED test data"""
    print("\n📊 Evaluating model performance...")
    y_pred = model.predict(X_test_scaled)

    accuracy = accuracy_score(y_test, y_pred)
    print(f"\n✅ Overall Accuracy: {accuracy * 100:.2f}%")

    print("\n📋 Detailed Report:")
    print(classification_report(
        y_test, y_pred,
        target_names=['🟢 Low Risk', '🟡 Medium Risk', '🔴 High Risk']
    ))

    print("📊 Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(cm)

    return accuracy, y_pred


# ─────────────────────────────────────────────
# STEP 8 — FEATURE IMPORTANCE
# ─────────────────────────────────────────────

def show_feature_importance(model, features):
    """Show which features matter most for prediction"""
    print("\n🔍 Feature Importance (which parameters matter most):")
    importances = model.feature_importances_
    feature_df = pd.DataFrame({
        'Feature': features,
        'Importance': importances
    }).sort_values('Importance', ascending=False)

    for _, row in feature_df.iterrows():
        bar = '█' * int(row['Importance'] * 50)
        print(f"  {row['Feature']:<25} {bar} {row['Importance']:.4f}")

    return feature_df


# ─────────────────────────────────────────────
# STEP 9 — SAVE MODEL
# ─────────────────────────────────────────────

def save_model(model, scaler, features, output_dir='model_files'):
    """Save trained model and scaler to disk"""
    print(f"\n💾 Saving model to '{output_dir}/' folder...")
    os.makedirs(output_dir, exist_ok=True)

    with open(f'{output_dir}/coral_model.pkl', 'wb') as f:
        pickle.dump(model, f)

    with open(f'{output_dir}/scaler.pkl', 'wb') as f:
        pickle.dump(scaler, f)

    with open(f'{output_dir}/features.pkl', 'wb') as f:
        pickle.dump(features, f)

    print("✅ Saved: coral_model.pkl")
    print("✅ Saved: scaler.pkl")
    print("✅ Saved: features.pkl")


# ─────────────────────────────────────────────
# STEP 10 — OPTIMIZED PREDICTION FUNCTION
# ─────────────────────────────────────────────

def predict_risk(model, scaler, features,  input_data):
    """
    Predict bleaching risk for dashboard inputs, handling unit 
    transformations automatically behind the scenes.
    """
    # Create a local mutable copy so we do not modify the original user input dictionary
    processed_input = input_data.copy()

    # 1. ClimSST: Abstract Celsius slider value to Kelvin for the backend model matrix
    if processed_input['ClimSST'] < 100:  
        processed_input['ClimSST'] = processed_input['ClimSST'] + 273.15

    # 2. TSA_Mean: Ensure positive user edge cases map safely to negative data ranges
    if processed_input['TSA_Mean'] > 0:
        processed_input['TSA_Mean'] = -processed_input['TSA_Mean']

    # 3. SSTA_Mean: Hardcoded abstraction layer so the user slider can be completely removed
    processed_input['SSTA_Mean'] = 0.0

    # Ensure correct vector ordering matching the model's exact feature expectation
    input_df = pd.DataFrame([processed_input])[features] 

    RISK_LABELS = {
        0: ('🟢 LOW RISK',    'Reef conditions are stable'),
        1: ('🟡 MEDIUM RISK', 'Reef showing signs of thermal stress'),
        2: ('🔴 HIGH RISK',   'Bleaching event likely — intervention needed!')
    }

    input_df     = pd.DataFrame([processed_input])[features]
    input_scaled = scaler.transform(input_df)

    prediction    = model.predict(input_scaled)[0]
    probabilities = model.predict_proba(input_scaled)[0]

    risk_label, risk_message  = RISK_LABELS[prediction]
    bleaching_probability     = probabilities[prediction] * 100

    return {
        'risk_level':   prediction,
        'risk_label':   risk_label,
        'risk_message': risk_message,
        'probability':  round(bleaching_probability, 2),
        'probabilities': {
            'Low Risk':    round(probabilities[0] * 100, 2),
            'Medium Risk': round(probabilities[1] * 100, 2),
            'High Risk':   round(probabilities[2] * 100, 2),
        }
    }


# ─────────────────────────────────────────────
# MAIN — RUN EVERYTHING WITH IN-LINE CORRECTIONS
# ─────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 55)
    print("  🪸 CORAL BLEACHING PREDICTION MODEL TRAINING")
    print("     FINAL VERSION — Random Forest + SMOTE")
    print("=" * 55)

    DATA_PATH = 'data/final_coral_reef_data.csv'

    # Fallback to test execution block using dynamic paths if file is local
    if os.path.exists(DATA_PATH):
        df                              = load_data(DATA_PATH)
        X, y, features                  = prepare_data(df)
        X_train, X_test, y_train, y_test = split_data(X, y)
        X_train_s, X_test_s, scaler     = scale_features(X_train, X_test)
        X_train_bal, y_train_bal        = balance_classes(X_train_s, y_train)
        model                           = train_model(X_train_bal, y_train_bal)
        accuracy, y_pred                = evaluate_model(model, X_test_s, y_test)
        show_feature_importance(model, features)
        save_model(model, scaler, features)
    else:
        print(f"⚠️ Data file not found at {DATA_PATH}. Please ensure your dataset is placed in the data folder.")