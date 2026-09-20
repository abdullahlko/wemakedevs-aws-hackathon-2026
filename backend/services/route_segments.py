from datetime import datetime, timedelta
from math import atan2, cos, radians, sin, sqrt

from services.sunlight import calculate_sunlight


EARTH_RADIUS_KM = 6371.0

MIN_SECTION_DISTANCE_KM = 8.0
TARGET_SECTION_DISTANCE_KM = 15.0
MAX_SECTION_DISTANCE_KM = 30.0

MAJOR_TURN_DEGREES = 35.0
BEARING_LOOKAHEAD_POINTS = 3


def haversine_distance_km(
    lat1: float,
    lng1: float,
    lat2: float,
    lng2: float,
) -> float:
    lat1_rad = radians(lat1)
    lat2_rad = radians(lat2)

    delta_lat = radians(lat2 - lat1)
    delta_lng = radians(lng2 - lng1)

    a = (
        sin(delta_lat / 2) ** 2
        + cos(lat1_rad)
        * cos(lat2_rad)
        * sin(delta_lng / 2) ** 2
    )

    return EARTH_RADIUS_KM * 2 * atan2(
        sqrt(a),
        sqrt(1 - a),
    )


def calculate_bearing(
    start: tuple[float, float],
    end: tuple[float, float],
) -> float:
    start_lng, start_lat = start
    end_lng, end_lat = end

    start_lat_rad = radians(start_lat)
    end_lat_rad = radians(end_lat)

    delta_lng = radians(end_lng - start_lng)

    x = sin(delta_lng) * cos(end_lat_rad)

    y = (
        cos(start_lat_rad) * sin(end_lat_rad)
        - sin(start_lat_rad)
        * cos(end_lat_rad)
        * cos(delta_lng)
    )

    bearing = atan2(x, y)

    return (
        bearing * 180 / 3.141592653589793 + 360
    ) % 360


def bearing_difference(
    first: float,
    second: float,
) -> float:
    difference = abs(first - second)

    if difference > 180:
        difference = 360 - difference

    return difference


def _point_distance_km(
    first: list[float],
    second: list[float],
) -> float:
    return haversine_distance_km(
        first[1],
        first[0],
        second[1],
        second[0],
    )


def _section_bearing(
    coordinates: list[list[float]],
) -> float:
    if len(coordinates) < 2:
        return 0.0

    return round(
        calculate_bearing(
            coordinates[0],
            coordinates[-1],
        ),
        1,
    )


def _has_major_turn(
    coordinates: list[list[float]],
    index: int,
) -> bool:
    if index < BEARING_LOOKAHEAD_POINTS:
        return False

    if (
        index + BEARING_LOOKAHEAD_POINTS
        >= len(coordinates)
    ):
        return False

    previous = coordinates[
        index - BEARING_LOOKAHEAD_POINTS
    ]

    current = coordinates[index]

    following = coordinates[
        index + BEARING_LOOKAHEAD_POINTS
    ]

    incoming_bearing = calculate_bearing(
        previous,
        current,
    )

    outgoing_bearing = calculate_bearing(
        current,
        following,
    )

    return (
        bearing_difference(
            incoming_bearing,
            outgoing_bearing,
        )
        >= MAJOR_TURN_DEGREES
    )


def _append_segment(
    segments: list[dict],
    segment_id: int,
    points: list[list[float]],
    distance_km: float,
):
    if len(points) < 2:
        return

    segments.append(
        {
            "segment_id": segment_id,
            "distance_km": round(
                distance_km,
                2,
            ),
            "coordinates": points,
            "bearing": _section_bearing(
                points
            ),
        }
    )


def create_route_segments(
    coordinates: list[list[float]],
):
    """
    Create meaningful route sections from route geometry.

    Sections are normally around 15 km. A significant direction
    change can end a section after the minimum distance is reached.
    No section is allowed to exceed 30 km.
    """

    if len(coordinates) < 2:
        return []

    segments = []

    current_points = [coordinates[0]]
    current_distance = 0.0
    segment_id = 1

    for index in range(1, len(coordinates)):
        previous = coordinates[index - 1]
        current = coordinates[index]

        point_distance = _point_distance_km(
            previous,
            current,
        )

        current_distance += point_distance
        current_points.append(current)

        major_turn = _has_major_turn(
            coordinates,
            index,
        )

        should_split = False

        # Always enforce the maximum section length.
        if current_distance >= MAX_SECTION_DISTANCE_KM:
            should_split = True

        # Once the target distance is reached, a meaningful
        # direction change can create a new section.
        elif (
            current_distance
            >= TARGET_SECTION_DISTANCE_KM
            and current_distance
            >= MIN_SECTION_DISTANCE_KM
            and major_turn
        ):
            should_split = True

        if should_split:
            _append_segment(
                segments=segments,
                segment_id=segment_id,
                points=current_points,
                distance_km=current_distance,
            )

            segment_id += 1

            # Keep the boundary point so there is no gap
            # between consecutive route sections.
            current_points = [current]
            current_distance = 0.0

    # Preserve the final section.
    if len(current_points) >= 2:
        _append_segment(
            segments=segments,
            segment_id=segment_id,
            points=current_points,
            distance_km=current_distance,
        )

    return segments


def add_segment_timing(
    segments: list[dict],
    departure_time: str,
    total_duration_minutes: int,
):
    """
    Allocate TomTom's total route duration across sections
    according to each section's share of route distance.
    """

    if not segments:
        return segments

    departure = datetime.fromisoformat(
        departure_time
    )

    total_distance = sum(
        segment["distance_km"]
        for segment in segments
    )

    if total_distance <= 0:
        return segments

    elapsed_minutes = 0.0

    for index, segment in enumerate(segments):
        is_last_segment = (
            index == len(segments) - 1
        )

        if is_last_segment:
            segment_duration = (
                total_duration_minutes
                - elapsed_minutes
            )
        else:
            segment_duration = (
                segment["distance_km"]
                / total_distance
                * total_duration_minutes
            )

        segment_start = (
            departure
            + timedelta(
                minutes=elapsed_minutes
            )
        )

        elapsed_minutes += segment_duration

        segment_end = (
            departure
            + timedelta(
                minutes=elapsed_minutes
            )
        )

        segment["start_time"] = (
            segment_start.isoformat()
        )

        segment["end_time"] = (
            segment_end.isoformat()
        )

        segment["duration_minutes"] = max(
            1,
            round(segment_duration),
        )

    return segments


def add_segment_sunlight(
    segments: list[dict],
):
    for segment in segments:
        coordinates = segment["coordinates"]

        midpoint_index = len(coordinates) // 2

        midpoint = coordinates[
            midpoint_index
        ]

        midpoint_lng = midpoint[0]
        midpoint_lat = midpoint[1]

        sunlight = calculate_sunlight(
            latitude=midpoint_lat,
            longitude=midpoint_lng,
            timestamp=segment["start_time"],
            vehicle_bearing=segment["bearing"],
        )

        segment["sunlight"] = sunlight

    return segments