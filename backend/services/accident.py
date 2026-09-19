import csv
import io
import os
import time
from math import asin, cos, floor, radians, sin, sqrt

import boto3
from dotenv import load_dotenv

load_dotenv()

S3_BUCKET = os.getenv(
    "TRUCKVIEW_S3_BUCKET",
    "truckview-accident-data",
)

S3_KEY = "indian_roads_dataset.csv"

_s3_client = boto3.client("s3")

_accident_data = None

# Grid index: built once per Lambda container, reused on every request.
# Cell size 0.02 degrees is about 2.2 km, which is larger than the 1 km
# search radius, so checking the 3x3 neighbouring cells never misses a match.
GRID_CELL_DEG = 0.02
_accident_grid = None


def load_accident_data() -> list[dict]:
    global _accident_data

    if _accident_data is not None:
        return _accident_data

    start = time.time()

    response = _s3_client.get_object(
        Bucket=S3_BUCKET,
        Key=S3_KEY,
    )

    content = response["Body"].read()

    reader = csv.DictReader(
        io.StringIO(
            content.decode("utf-8-sig")
        )
    )

    _accident_data = list(reader)

    if not _accident_data:
        raise ValueError(
            "Accident dataset is empty."
        )

    required_columns = {
        "latitude",
        "longitude",
    }

    missing_columns = (
        required_columns
        - set(_accident_data[0].keys())
    )

    if missing_columns:
        raise ValueError(
            "Accident dataset is missing required "
            f"columns: {sorted(missing_columns)}"
        )

    print(
        f"accident data loaded: {len(_accident_data)} rows "
        f"in {time.time() - start:.2f}s"
    )

    return _accident_data


def _grid_cell(latitude: float, longitude: float) -> tuple:
    return (
        int(floor(latitude / GRID_CELL_DEG)),
        int(floor(longitude / GRID_CELL_DEG)),
    )


def _get_accident_grid(accident_data: list[dict]) -> dict:
    global _accident_grid

    if _accident_grid is not None:
        return _accident_grid

    start = time.time()

    grid = {}

    for index, row in enumerate(accident_data):
        try:
            accident_lat = float(row["latitude"])
            accident_lng = float(row["longitude"])
        except (TypeError, ValueError, KeyError):
            continue

        cell = _grid_cell(accident_lat, accident_lng)

        if cell not in grid:
            grid[cell] = []

        grid[cell].append(
            (index, accident_lat, accident_lng)
        )

    _accident_grid = grid

    print(
        f"accident grid built: {len(grid)} cells "
        f"in {time.time() - start:.2f}s"
    )

    return _accident_grid


def haversine_distance_km(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    earth_radius_km = 6371.0

    lat1_rad = radians(lat1)
    lat2_rad = radians(lat2)

    delta_lat = radians(lat2 - lat1)
    delta_lon = radians(lon2 - lon1)

    value = (
        sin(delta_lat / 2) ** 2
        + cos(lat1_rad)
        * cos(lat2_rad)
        * sin(delta_lon / 2) ** 2
    )

    value = min(
        1.0,
        max(0.0, value),
    )

    return (
        2
        * earth_radius_km
        * asin(sqrt(value))
    )


def find_nearby_accidents(
    latitude: float,
    longitude: float,
    radius_km: float = 1.0,
) -> list[dict]:
    data = load_accident_data()

    latitude_delta = radius_km / 111.0

    longitude_delta = radius_km / (
        111.0
        * max(
            abs(cos(radians(latitude))),
            0.01,
        )
    )

    nearby = []

    min_lat = latitude - latitude_delta
    max_lat = latitude + latitude_delta
    min_lng = longitude - longitude_delta
    max_lng = longitude + longitude_delta

    for row in data:
        try:
            accident_lat = float(
                row["latitude"]
            )
            accident_lng = float(
                row["longitude"]
            )
        except (
            TypeError,
            ValueError,
            KeyError,
        ):
            continue

        if not (
            min_lat
            <= accident_lat
            <= max_lat
        ):
            continue

        if not (
            min_lng
            <= accident_lng
            <= max_lng
        ):
            continue

        distance_km = (
            haversine_distance_km(
                latitude,
                longitude,
                accident_lat,
                accident_lng,
            )
        )

        if distance_km <= radius_km:
            accident = dict(row)
            accident["distance_km"] = (
                distance_km
            )
            nearby.append(accident)

    return nearby


def _build_risk_result(
    severity_counts: dict,
    accident_count: int,
) -> dict:
    weighted_density = 0.0

    for severity, count in (
        severity_counts.items()
    ):
        severity_text = (
            str(severity).lower()
        )

        if "fatal" in severity_text:
            weight = 5
        elif "major" in severity_text:
            weight = 3
        else:
            weight = 1

        weighted_density += (
            float(count) * weight
        )

    risk_score = min(
        100,
        round(
            18 * sqrt(
                weighted_density
            )
        ),
    )

    if risk_score < 25:
        risk_level = "Low"
    elif risk_score < 50:
        risk_level = "Moderate"
    elif risk_score < 75:
        risk_level = "High"
    else:
        risk_level = "Very High"

    return {
        "status": "available",
        "risk_score": risk_score,
        "risk_level": risk_level,
        "accident_count": accident_count,
        "severity_counts": severity_counts,
    }


def _empty_risk_result() -> dict:
    return {
        "status": "available",
        "risk_score": 0,
        "risk_level": "Low",
        "accident_count": 0,
        "severity_counts": {},
    }


def calculate_accident_risk(
    latitude: float,
    longitude: float,
    radius_km: float = 1.0,
) -> dict:
    nearby = find_nearby_accidents(
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
    )

    if not nearby:
        return _empty_risk_result()

    severity_counts = {}

    for accident in nearby:
        severity = str(
            accident.get(
                "severity",
                "unknown",
            )
        )

        severity_counts[severity] = (
            severity_counts.get(
                severity,
                0,
            )
            + 1
        )

    return _build_risk_result(
        severity_counts,
        len(nearby),
    )


def get_segment_accident_summary(
    segment: dict,
    accident_data: list[dict],
    radius_km: float = 1.0,
) -> dict:
    coordinates = segment.get(
        "coordinates",
        [],
    )

    if not coordinates:
        return _empty_risk_result()

    start = time.time()

    grid = _get_accident_grid(accident_data)

    matched_accidents = {}

    for coordinate in coordinates:
        if len(coordinate) < 2:
            continue

        longitude = float(
            coordinate[0]
        )
        latitude = float(
            coordinate[1]
        )

        cell_lat, cell_lng = _grid_cell(
            latitude,
            longitude,
        )

        # Only look at this cell and the 8 around it
        for d_lat in (-1, 0, 1):
            for d_lng in (-1, 0, 1):
                candidates = grid.get(
                    (
                        cell_lat + d_lat,
                        cell_lng + d_lng,
                    )
                )

                if not candidates:
                    continue

                for (
                    index,
                    accident_lat,
                    accident_lng,
                ) in candidates:
                    if index in matched_accidents:
                        continue

                    distance_km = (
                        haversine_distance_km(
                            latitude,
                            longitude,
                            accident_lat,
                            accident_lng,
                        )
                    )

                    if distance_km <= radius_km:
                        matched_accidents[index] = (
                            accident_data[index]
                        )

    print(
        f"segment accident summary: {len(coordinates)} coords, "
        f"{len(matched_accidents)} matches, "
        f"{time.time() - start:.2f}s"
    )

    if not matched_accidents:
        return _empty_risk_result()

    severity_counts = {}

    for accident in matched_accidents.values():
        severity = str(
            accident.get(
                "severity",
                "unknown",
            )
        )

        severity_counts[severity] = (
            severity_counts.get(
                severity,
                0,
            )
            + 1
        )

    return _build_risk_result(
        severity_counts,
        len(matched_accidents),
    )