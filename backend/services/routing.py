import os
import re

import httpx
from dotenv import load_dotenv

from services.route_segments import (
    create_route_segments,
    add_segment_timing,
    add_segment_sunlight,
)

from services.weather import (
    fetch_weather,
    unavailable_weather,
)

from services.risk_engine import (
    add_segment_risk,
    calculate_overall_risk,
)

from services.rest_planner import (
    plan_rest_breaks,
)

load_dotenv()

TOMTOM_ROUTING_URL = "https://api.tomtom.com/routing/1/calculateRoute"


def clean_instruction_message(message: str | None) -> str:
    if not message:
        return ""

    cleaned = re.sub(r"<[^>]+>", "", message)

    return cleaned.strip()


def attach_instruction_context(
    instructions: list[dict],
    segments: list[dict],
) -> None:
    """
    Attach the TruckView risk section containing each
    TomTom maneuver.

    TomTom route_offset_m is the cumulative distance from
    the beginning of the route.
    """

    cumulative_segment_distance_m = 0.0

    segment_ranges = []

    for segment in segments:
        segment_distance_m = (
            float(segment.get("distance_km", 0)) * 1000
        )

        start_distance_m = cumulative_segment_distance_m
        end_distance_m = (
            cumulative_segment_distance_m
            + segment_distance_m
        )

        segment_ranges.append(
            {
                "segment": segment,
                "start_distance_m": start_distance_m,
                "end_distance_m": end_distance_m,
            }
        )

        cumulative_segment_distance_m = end_distance_m

    previous_offset_m = 0
    previous_time_seconds = 0

    for instruction in instructions:
        offset_m = float(
            instruction.get("route_offset_m") or 0
        )

        time_seconds = int(
            instruction.get("travel_time_seconds") or 0
        )

        distance_from_previous_m = max(
            0,
            round(offset_m - previous_offset_m),
        )

        duration_from_previous_seconds = max(
            0,
            time_seconds - previous_time_seconds,
        )

        matched_segment = None

        for segment_range in segment_ranges:
            is_inside_segment = (
                offset_m >= segment_range["start_distance_m"]
                and offset_m <= segment_range["end_distance_m"]
            )

            if is_inside_segment:
                matched_segment = segment_range["segment"]
                break

        if matched_segment is None and segments:
            matched_segment = segments[-1]

        instruction["clean_message"] = clean_instruction_message(
            instruction.get("message")
        )

        instruction["distance_from_previous_m"] = (
            distance_from_previous_m
        )

        instruction["duration_from_previous_seconds"] = (
            duration_from_previous_seconds
        )

        if matched_segment:
            instruction["segment_id"] = matched_segment.get(
                "segment_id"
            )

            instruction["risk_score"] = matched_segment.get(
                "risk_score",
                0,
            )

            instruction["risk_level"] = matched_segment.get(
                "risk_level",
                "Unknown",
            )

            instruction["accident"] = matched_segment.get(
                "accident",
                {},
            )

            instruction["weather"] = matched_segment.get(
                "weather",
                {},
            )

            instruction["sunlight"] = matched_segment.get(
                "sunlight",
                {},
            )

            instruction["factors"] = matched_segment.get(
                "factors",
                {},
            )

        previous_offset_m = offset_m
        previous_time_seconds = time_seconds


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
        "instructionsType": "tagged",
        "language": "en-GB",
    }

    url = f"{TOMTOM_ROUTING_URL}/{locations}/json"

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            url,
            params=params,
        )

    if not response.is_success:
        raise RuntimeError(
            f"TomTom API returned "
            f"{response.status_code}: {response.text}"
        )

    data = response.json()

    route = data["routes"][0]
    summary = route["summary"]

    print(
        "TOMTOM ROUTE KEYS:",
        route.keys(),
    )

    print(
        "TOMTOM GUIDANCE:",
        route.get("guidance"),
    )

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
        summary["travelTimeInSeconds"] / 60
    )

    segments = create_route_segments(
        route_coordinates
    )

    add_segment_timing(
        segments=segments,
        departure_time=departure_time,
        total_duration_minutes=total_duration_minutes,
    )

    add_segment_sunlight(segments)

    for segment in segments:
        segment_coordinates = segment["coordinates"]

        midpoint_index = (
            len(segment_coordinates) // 2
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
                timestamp=segment["start_time"],
            )

        except Exception as error:
            print(
                "Weather lookup failed for "
                f"segment "
                f"{segment['segment_id']}: "
                f"{error}"
            )

            weather = unavailable_weather(
                str(error)
            )

        segment["weather"] = weather

    add_segment_risk(segments)

    overall_risk = calculate_overall_risk(
        segments
    )

    rest_plan = plan_rest_breaks(
        departure_time=departure_time,
        segments=segments,
    )

    guidance = route.get("guidance", {})

    raw_instructions = guidance.get(
        "instructions",
        [],
    )

    instructions = []

    for index, instruction in enumerate(
        raw_instructions,
        start=1,
    ):
        instructions.append(
            {
                "instruction_id": index,
                "message": instruction.get(
                    "message",
                    "",
                ),
                "clean_message": clean_instruction_message(
                    instruction.get("message")
                ),
                "combined_message": instruction.get(
                    "combinedMessage"
                ),
                "maneuver": instruction.get(
                    "maneuver"
                ),
                "instruction_type": instruction.get(
                    "instructionType"
                ),
                "street": instruction.get(
                    "street"
                ),
                "road_numbers": instruction.get(
                    "roadNumbers",
                    [],
                ),
                "exit_number": instruction.get(
                    "exitNumber"
                ),
                "signpost_text": instruction.get(
                    "signpostText"
                ),
                "route_offset_m": instruction.get(
                    "routeOffsetInMeters",
                    0,
                ),
                "travel_time_seconds": instruction.get(
                    "travelTimeInSeconds",
                    0,
                ),
                "point": instruction.get(
                    "point"
                ),
                "point_index": instruction.get(
                    "pointIndex"
                ),
                "turn_angle": instruction.get(
                    "turnAngleInDecimalDegrees"
                ),
                "driving_side": instruction.get(
                    "drivingSide"
                ),
            }
        )

    attach_instruction_context(
        instructions=instructions,
        segments=segments,
    )

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
        "coordinates": route_coordinates,
        "instructions": instructions,
        "segments": segments,
        "overall_risk": overall_risk,
        "rest_plan": rest_plan,
    }