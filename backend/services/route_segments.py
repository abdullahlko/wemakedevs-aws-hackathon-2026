from math import atan2, cos, radians, sin, sqrt


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