from datetime import datetime, timedelta
from math import atan2, cos, radians, sin, sqrt
from services.sunlight import calculate_sunlight

def haversine_distance_km(
    lat1: float,
    lng1: float,
    lat2: float,
    lng2: float,
) -> float:
    earth_radius_km = 6371.0

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

    return earth_radius_km * 2 * atan2(
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

    return (bearing * 180 / 3.141592653589793 + 360) % 360


def create_route_segments(
    coordinates: list[list[float]],
    segment_size_km: float = 25.0,
):
    if len(coordinates) < 2:
        return []

    segments = []
    current_points = [coordinates[0]]
    current_distance = 0.0
    segment_id = 1

    for index in range(1, len(coordinates)):
        previous = coordinates[index - 1]
        current = coordinates[index]

        point_distance = haversine_distance_km(
            previous[1],
            previous[0],
            current[1],
            current[0],
        )

        current_distance += point_distance
        current_points.append(current)

        if current_distance >= segment_size_km:
            segments.append(
                {
                    "segment_id": segment_id,
                    "distance_km": round(current_distance, 2),
                    "coordinates": current_points,
                    "bearing": round(
                        calculate_bearing(
                            current_points[0],
                            current_points[-1],
                        ),
                        1,
                    ),
                }
            )

            segment_id += 1
            current_points = [current]
            current_distance = 0.0

    if len(current_points) >= 2:
        segments.append(
            {
                "segment_id": segment_id,
                "distance_km": round(current_distance, 2),
                "coordinates": current_points,
                "bearing": round(
                    calculate_bearing(
                        current_points[0],
                        current_points[-1],
                    ),
                    1,
                ),
            }
        )

    return segments


def add_segment_timing(
    segments: list[dict],
    departure_time: str,
    total_duration_minutes: int,
):
    if not segments:
        return segments

    departure = datetime.fromisoformat(departure_time)

    total_distance = sum(
        segment["distance_km"]
        for segment in segments
    )

    if total_distance <= 0:
        return segments

    elapsed_minutes = 0.0

    for segment in segments:
        segment_duration = (
            segment["distance_km"]
            / total_distance
            * total_duration_minutes
        )

        segment_start = departure + timedelta(
            minutes=elapsed_minutes
        )

        elapsed_minutes += segment_duration

        segment_end = departure + timedelta(
            minutes=elapsed_minutes
        )

        segment["start_time"] = segment_start.isoformat()
        segment["end_time"] = segment_end.isoformat()
        segment["duration_minutes"] = round(
            segment_duration
        )

def add_segment_sunlight(segments: list[dict]):
    for segment in segments:
        coordinates = segment["coordinates"]

        midpoint_index = len(coordinates) // 2
        midpoint = coordinates[midpoint_index]

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