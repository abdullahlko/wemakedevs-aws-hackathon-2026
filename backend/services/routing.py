import os

import httpx
from dotenv import load_dotenv

from services.route_segments import (
    create_route_segments,
    add_segment_timing,
    add_segment_sunlight,
)

from services.weather import fetch_weather

from services.risk_engine import (
    add_segment_risk,
    calculate_overall_risk,
)

from services.rest_planner import (
    plan_rest_breaks,
)


load_dotenv()


TOMTOM_ROUTING_URL = (
    "https://api.tomtom.com/routing/1/calculateRoute"
)


async def calculate_route(
    origin_lat: float,
    origin_lng: float,
    destination_lat: float,
    destination_lng: float,
    departure_time: str,
):
    api_key = os.getenv("TOMTOM_API_KEY")

    if not api_key:
        raise RuntimeError(
            "TOMTOM_API_KEY is not configured"
        )

    locations = (
        f"{origin_lat},{origin_lng}:"
        f"{destination_lat},{destination_lng}"
    )

    params = {
        "key": api_key,
        "routeType": "fastest",
        "traffic": "true",
        "travelMode": "truck",
        "routeRepresentation": "polyline",
    }

    url = (
        f"{TOMTOM_ROUTING_URL}/"
        f"{locations}/json"
    )

    async with httpx.AsyncClient(
        timeout=30.0
    ) as client:
        response = await client.get(
            url,
            params=params,
        )

    if not response.is_success:
        raise RuntimeError(
            f"TomTom API returned "
            f"{response.status_code}: "
            f"{response.text}"
        )

    data = response.json()

    route = data["routes"][0]
    summary = route["summary"]

    route_coordinates = []

    for leg in route["legs"]:
        for point in leg["points"]:
            route_coordinates.append(
                [
                    point["longitude"],
                    point["latitude"],
                ]
            )

    total_duration_minutes = round(
        summary["travelTimeInSeconds"]
        / 60
    )

    segments = create_route_segments(
        route_coordinates
    )

    add_segment_timing(
        segments=segments,
        departure_time=departure_time,
        total_duration_minutes=(
            total_duration_minutes
        ),
    )

    add_segment_sunlight(
        segments
    )

    for segment in segments:
        segment_coordinates = segment[
            "coordinates"
        ]

        midpoint_index = (
            len(segment_coordinates)
            // 2
        )

        midpoint = segment_coordinates[
            midpoint_index
        ]

        longitude = midpoint[0]
        latitude = midpoint[1]

        try:
            weather = await fetch_weather(
                latitude=latitude,
                longitude=longitude,
                timestamp=segment[
                    "start_time"
                ],
            )

        except Exception as error:
            print(
                "Weather lookup failed for "
                f"segment {segment['segment_id']}: "
                f"{error}"
            )

            weather = {
                "temperature_c": None,
                "precipitation_mm": None,
                "visibility_m": None,
                "wind_speed_kmh": None,
                "weather_code": None,
                "risk_score": 0,
                "risk_level": "Unavailable",
                "risk_factors": [],
                "source": "Open-Meteo",
            }

        segment["weather"] = weather

    add_segment_risk(
        segments
    )

    overall_risk = calculate_overall_risk(
        segments
    )

    rest_plan = plan_rest_breaks(
        departure_time=departure_time,
        segments=segments,
    )

    return {
        "distance_km": round(
            summary["lengthInMeters"]
            / 1000,
            2,
        ),
        "duration_minutes": (
            total_duration_minutes
        ),
        "traffic_delay_minutes": round(
            summary.get(
                "trafficDelayInSeconds",
                0,
            )
            / 60
        ),
        "coordinates": route_coordinates,
        "segments": segments,
        "overall_risk": overall_risk,
        "rest_plan": rest_plan,
    }