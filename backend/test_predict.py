import urllib.request, json

scenarios = [
    ("MILD (expect LOW, NO)",       dict(Temperature_Mean_Celsius=22,SSTA=-1.5,SSTA_DHW=0.5,TSA_DHW=0.3,Turbidity=0.01,Cyclone_Frequency=5,Windspeed=14,Depth_m=38,SSTA_FrequencyMax=1.5,TSA_Mean=0.1,ClimSST=22.5,SSTA_Mean=-0.8,TSA_Frequency=0.02)),
    ("GBR BASELINE (expect MOD)",   dict(Temperature_Mean_Celsius=26.8,SSTA=0.45,SSTA_DHW=3.2,TSA_DHW=2.9,Turbidity=0.03,Cyclone_Frequency=42,Windspeed=5.5,Depth_m=12,SSTA_FrequencyMax=6.5,TSA_Mean=0.6,ClimSST=26.5,SSTA_Mean=0.3,TSA_Frequency=0.2)),
    ("EL NINO (expect HIGH, YES)",  dict(Temperature_Mean_Celsius=31.5,SSTA=3.8,SSTA_DHW=16.5,TSA_DHW=15.8,Turbidity=0.12,Cyclone_Frequency=82,Windspeed=2.5,Depth_m=4,SSTA_FrequencyMax=24,TSA_Mean=3.5,ClimSST=28.5,SSTA_Mean=2.8,TSA_Frequency=0.88)),
    ("EXTREME (expect HIGH, YES)",  dict(Temperature_Mean_Celsius=34.0,SSTA=4.8,SSTA_DHW=19.5,TSA_DHW=18.0,Turbidity=0.45,Cyclone_Frequency=95,Windspeed=1.5,Depth_m=2,SSTA_FrequencyMax=29,TSA_Mean=4.8,ClimSST=30.0,SSTA_Mean=3.8,TSA_Frequency=0.95)),
    ("MILD2 (slider change factors)", dict(Temperature_Mean_Celsius=22,SSTA=-1.5,SSTA_DHW=0.5,TSA_DHW=0.3,Turbidity=0.45,Cyclone_Frequency=90,Windspeed=1,Depth_m=2,SSTA_FrequencyMax=1.5,TSA_Mean=0.1,ClimSST=22.5,SSTA_Mean=-0.8,TSA_Frequency=0.02)),
]

for name, payload in scenarios:
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        "http://localhost:8000/predict", data=data,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        res = json.loads(r.read())
    risk  = res["risk_level"]
    prob  = res["probability_percent"]
    blch  = res["bleaching_prediction"]
    f1    = res["top_factors"][0]["label"]
    f2    = res["top_factors"][1]["label"]
    raw   = res["raw_proba"]
    print(f"{name}")
    print(f"  risk={risk:8}  score={prob:5.1f}%  bleaching={blch}")
    print(f"  raw p1={raw['p_bleach']:.3f}  top=[{f1}, {f2}]")
    print()
