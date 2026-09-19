from datetime import datetime, timezone
from math import isnan

import httpx


FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"


def classify_weather_risk(
    precipitation: float,
    visibility_m: float,
    wind_speed_kmh: float,
    weather_code: int,
) -> dict:
    risk = 0
    factors = []

    if precipitation >= 10:
        risk += 35
        factors.append("heavy rain")
    elif precipitation >= 2:
        risk += 25
        factors.append("rain")
    elif precipitation > 0:
        risk += 10
        factors.append("light precipitation")

    if visibility_m < 1000:
        risk += 35
        factors.append("very low visibility")
    elif visibility_m < 3000:
        risk += 20
        factors.append("reduced visibility")
    elif visibility_m < 5000:
        risk += 10
        factors.append("moderate visibility")

    if wind_speed_kmh >= 60:
        risk += 30
        factors.append("strong winds")
    elif wind_speed_kmh >= 40:
        risk += 20
        factors.append("high winds")
    elif wind_speed_kmh >= 25:
        risk += 10
        factors.append("moderate winds")

    if weather_code in {95, 96, 99}:
        risk += 30
        factors.append("thunderstorm")

    risk = min(risk, 100)

    if risk < 20:
        level = "Very Low"
    elif risk < 40:
        level = "Low"
    elif risk < 60:
        level = "Moderate"
    elif risk < 80:
        level = "High"
    else:
        level = "Very High"

    return {
        "risk_score": risk,
        "risk_level": level,
        "risk_factors": factors,
    }


def unavailable_weather(
    reason: str,
) -> dict:
    return {
        "status": "unavailable",
        "temperature_c": None,
        "precipitation_mm": None,
        "visibility_m": None,
        "wind_speed_kmh": None,
        "weather_code": None,
        "risk_score": None,
        "risk_level": "Unavailable",
        "risk_factors": [],
        "source": "Open-Meteo",
        "error": reason,
    }


async def fetch_weather(
    latitude: float,
    longitude: float,
    timestamp: str,
) -> dict:
    target_time = datetime.fromisoformat(timestamp)

    if target_time.tzinfo is None:
        target_time = target_time.replace(
            tzinfo=timezone.utc
        )

    target_utc = target_time.astimezone(timezone.utc)

    date_string = target_utc.strftime("%Y-%m-%d")
    target_hour = target_utc.strftime(
        "%Y-%m-%dT%H:00"
    )

    today = datetime.now(
        timezone.utc
    ).date()

    if target_utc.date() >= today:
        url = FORECAST_URL
    else:
        url = ARCHIVE_URL

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "hourly": (
            "temperature_2m,"
            "precipitation,"
            "weather_code,"
            "visibility,"
            "wind_speed_10m"
        ),
        "timezone": "UTC",
        "start_date": date_string,
        "end_date": date_string,
    }

    async with httpx.AsyncClient(
        timeout=15.0
    ) as client:
        response = await client.get(
            url,
            params=params,
        )

    if not response.is_success:
        raise RuntimeError(
            f"Open-Meteo returned "
            f"{response.status_code}: "
            f"{response.text}"
        )

    data = response.json()

    hourly = data.get(
        "hourly",
        {},
    )

    times = hourly.get(
        "time",
        [],
    )

    if target_hour not in times:
        raise RuntimeError(
            f"Weather data unavailable for "
            f"{target_hour}"
        )

    index = times.index(
        target_hour
    )

    temperature = hourly[
        "temperature_2m"
    ][index]

    precipitation = hourly[
        "precipitation"
    ][index]

    weather_code = hourly[
        "weather_code"
    ][index]

    visibility = hourly[
        "visibility"
    ][index]

    wind_speed = hourly[
        "wind_speed_10m"
    ][index]

    values = [
        temperature,
        precipitation,
        weather_code,
        visibility,
        wind_speed,
    ]

    if any(
        value is None
        or (
            isinstance(value, float)
            and isnan(value)
        )
        for value in values
    ):
        raise RuntimeError(
            "Incomplete weather data returned"
        )

    weather_risk = classify_weather_risk(
        precipitation=float(
            precipitation
        ),
        visibility_m=float(
            visibility
        ),
        wind_speed_kmh=float(
            wind_speed
        ),
        weather_code=int(
            weather_code
        ),
    )

    return {
        "status": "available",
        "temperature_c": round(
            float(temperature),
            1,
        ),
        "precipitation_mm": round(
            float(precipitation),
            2,
        ),
        "visibility_m": round(
            float(visibility)
        ),
        "wind_speed_kmh": round(
            float(wind_speed),
            1,
        ),
        "weather_code": int(
            weather_code
        ),
        "risk_score": weather_risk[
            "risk_score"
        ],
        "risk_level": weather_risk[
            "risk_level"
        ],
        "risk_factors": weather_risk[
            "risk_factors"
        ],
        "source": "Open-Meteo",
    }