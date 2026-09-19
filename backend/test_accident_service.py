from services.accident import (
    load_accident_data,
    find_nearby_accidents,
    calculate_accident_risk,
)


data = load_accident_data()

print("Accidents loaded:", len(data))

latitude = 30.7333
longitude = 76.7794

accidents = find_nearby_accidents(
    latitude=latitude,
    longitude=longitude,
    radius_km=1.0,
    accident_data=data,
)

print("Nearby accidents:", len(accidents))

risk = calculate_accident_risk(
    accidents=accidents,
    segment_length_km=25.0,
)

print("\nAccident risk:")
print(risk)