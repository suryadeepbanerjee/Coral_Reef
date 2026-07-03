import pandas as pd
import numpy as np

df = pd.read_csv('data/final_coral_reef_data.csv', low_memory=False)

# Force numeric where needed
for col in ['SSTA', 'SSTA_DHW', 'TSA_DHW', 'Temperature_Mean_Celsius',
            'Turbidity', 'Cyclone_Frequency', 'Windspeed', 'Depth_m',
            'SSTA_FrequencyMax', 'TSA_Mean', 'ClimSST', 'SSTA_Mean', 'TSA_Frequency',
            'Percent_Bleaching', 'bleaching_label']:
    df[col] = pd.to_numeric(df[col], errors='coerce')

def assign_zone(row):
    try:
        lat = float(row['Latitude_Degrees'])
        lon = float(row['Longitude_Degrees'])
    except:
        return None
    ocean = str(row.get('Ocean_Name', ''))
    if -35 < lat < 0 and 140 < lon < 160:
        return 'Great Barrier Reef'
    if -15 < lat < 20 and 100 < lon < 145:
        return 'Coral Triangle'
    if 10 < lat < 35 and 30 < lon < 45:
        return 'Red Sea'
    if ocean == 'Indian':
        return 'Indian Ocean'
    if ocean == 'Atlantic':
        return 'Caribbean'
    return None

df['zone'] = df.apply(assign_zone, axis=1)

zones = ['Great Barrier Reef', 'Coral Triangle', 'Red Sea', 'Indian Ocean', 'Caribbean']
for zone in zones:
    sub = df[df['zone'] == zone]
    print(f"\n=== {zone}: {len(sub)} records ===")
    print(f"  Avg Temp (C):      {sub['Temperature_Mean_Celsius'].mean():.2f}")
    print(f"  Avg SSTA:          {sub['SSTA'].mean():.2f}")
    print(f"  Avg SSTA_DHW:      {sub['SSTA_DHW'].mean():.2f}")
    print(f"  Avg TSA_DHW:       {sub['TSA_DHW'].mean():.2f}")
    print(f"  Avg Bleaching%:    {sub['Percent_Bleaching'].mean():.1f}")
    print(f"  Bleaching labels:  {sub['bleaching_label'].value_counts().to_dict()}")
    print(f"  Year range:        {int(sub['Date_Year'].min())} - {int(sub['Date_Year'].max())}")
