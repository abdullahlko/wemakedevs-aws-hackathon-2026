import os

import httpx
from dotenv import load_dotenv

from services.route_segments import (
    create_route_segments,
    add_segment_timing,
    add_segment_sunlight,
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

    url = f"{TOMTOM_ROUTING_URL}/{locations}/json"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            url,
            params=params,
        )

    if not response.is_success:
        raise RuntimeError(
            f"TomTom API returned {response.status_code}: "
            f"{response.text}"
        )

    data = response.json()

    route = data["routes"][0]
    summary = route["summary"]

    coordinates = []

    for leg in route["legs"]:
        for point in leg["points"]:
            coordinates.append(
                [
                    point["longitude"],
                    point["latitude"],
                ]
            )

    total_duration_minutes = round(
        summary["travelTimeInSeconds"] / 60
    )

    segments = create_route_segments(coordinates)

    add_segment_timing(
        segments=segments,
        departure_time=departure_time,
        total_duration_minutes=total_duration_minutes,
    )

    add_segment_sunlight(segments)

    return {
        "distance_km": round(
            summary["lengthInMeters"] / 1000,
            2,
        ),
        "duration_minutes": total_duration_minutes,
        "traffic_delay_minutes": round(
            summary.get(
                "trafficDelayInSeconds",
                0,
            )
            / 60
        ),
        "coordinates": coordinates,
        "segments": segments,
    }