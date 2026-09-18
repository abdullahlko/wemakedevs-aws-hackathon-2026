from services.sunlight import calculate_sunlight


result = calculate_sunlight(
    latitude=26.8467,
    longitude=80.9462,
    timestamp="2026-09-18T08:00:00+05:30",
    vehicle_bearing=90,
)

print(result)