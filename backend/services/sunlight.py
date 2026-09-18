from datetime import datetime
from math import radians

from astral import Observer
from astral.sun import azimuth, elevation


def calculate_sunlight(
    latitude: float,
    longitude: float,
    timestamp: str,
    vehicle_bearing: float,
):
    time = datetime.fromisoformat(timestamp)

    observer = Observer(
        latitude=latitude,
        longitude=longitude,
    )

    sun_altitude = elevation(observer, time)
    sun_azimuth = azimuth(observer, time)

    if sun_altitude <= -6:
        light_condition = "night"
    elif sun_altitude <= 0:
        light_condition = "twilight"
    else:
        light_condition = "daylight"

    angle_difference = abs(
        ((sun_azimuth - vehicle_bearing + 180) % 360) - 180
    )

    glare_risk = 0

    if light_condition != "night":
        if sun_altitude <= 10:
            glare_risk = 70
        elif sun_altitude <= 20:
            glare_risk = 45
        elif sun_altitude <= 30:
            glare_risk = 20

        if angle_difference <= 20:
            glare_risk += 30
        elif angle_difference <= 40:
            glare_risk += 15

    glare_risk = min(glare_risk, 100)

    return {
        "sun_altitude": round(sun_altitude, 2),
        "sun_azimuth": round(sun_azimuth, 2),
        "light_condition": light_condition,
        "sun_angle_difference": round(angle_difference, 2),
        "glare_risk": glare_risk,
    }