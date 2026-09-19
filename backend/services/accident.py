from pathlib import Path
from math import radians, sin, cos, sqrt, atan2

import pandas as pd


DATASET_PATH = (
    Path(__file__).resolve().parents[2]
    / "data"
    / "raw"
    / "sehaj1104_accidents"
    / "indian_roads_dataset.csv"
)


def load_accident_data() -> pd.DataFrame:
    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            f"Accident dataset not found: {DATASET_PATH}"
        )

    data = pd.read_csv(DATASET_PATH)

    required_columns = {
        "latitude",
        "longitude",
        "accident_severity",
        "date",
        "city",
        "state",
    }

    missing_columns = required_columns - set(data.columns)

    if missing_columns:
        raise ValueError(
            f"Missing accident dataset columns: {missing_columns}"
        )

    data = data.dropna(
        subset=[
            "latitude",
            "longitude",
            "accident_severity",
        ]
    ).copy()

    return data


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


def find_nearby_accidents(
    latitude: float,
    longitude: float,
    radius_km: float = 1.0,
    accident_data: pd.DataFrame | None = None,
) -> pd.DataFrame:
    if accident_data is None:
        accident_data = load_accident_data()

    lat_delta = radius_km / 111.0

    longitude_scale = max(
        cos(radians(latitude)),
        0.1,
    )

    lng_delta = radius_km / (
        111.0 * longitude_scale
    )

    candidates = accident_data[
        accident_data["latitude"].between(
            latitude - lat_delta,
            latitude + lat_delta,
        )
        & accident_data["longitude"].between(
            longitude - lng_delta,
            longitude + lng_delta,
        )
    ].copy()

    if candidates.empty:
        return candidates

    candidates["distance_km"] = (
        (
            candidates["latitude"] - latitude
        ) ** 2
        + (
            (
                candidates["longitude"]
                - longitude
            )
            * longitude_scale
        ) ** 2
    ) ** 0.5 * 111.0

    candidates = candidates[
        candidates["distance_km"] <= radius_km
    ].copy()

    return candidates.sort_values(
        "distance_km"
    )


def calculate_accident_risk(
    accidents: pd.DataFrame,
    segment_length_km: float,
) -> dict:
    if accidents.empty:
        return {
            "risk_score": 0,
            "accident_count": 0,
            "fatal_count": 0,
            "major_count": 0,
            "minor_count": 0,
        }

    severity_weights = {
        "minor": 1,
        "major": 3,
        "fatal": 5,
    }

    weighted_score = accidents[
        "accident_severity"
    ].map(
        severity_weights
    ).fillna(1).sum()

    if segment_length_km <= 0:
        accident_density = weighted_score
    else:
        accident_density = (
            weighted_score
            / segment_length_km
        )

    # Convert weighted accident density into
    # a bounded 0-100 risk score.
    #
    # The dataset is prototype data and contains
    # dense city-level clusters, so a logarithmic
    # scale prevents those clusters from immediately
    # forcing the score to 100.
    risk_score = round(
        min(
            100,
            18 * (
                accident_density
                ** 0.5
            ),
        )
    )

    severity_counts = (
        accidents["accident_severity"]
        .value_counts()
    )

    return {
        "risk_score": risk_score,
        "accident_count": len(accidents),
        "fatal_count": int(
            severity_counts.get("fatal", 0)
        ),
        "major_count": int(
            severity_counts.get("major", 0)
        ),
        "minor_count": int(
            severity_counts.get("minor", 0)
        ),
    }


def get_segment_accident_summary(
    segment: dict,
    accident_data: pd.DataFrame | None = None,
    radius_km: float = 1.0,
) -> dict:
    if accident_data is None:
        accident_data = load_accident_data()

    coordinates = segment.get(
        "coordinates",
        [],
    )

    if not coordinates:
        return calculate_accident_risk(
            pd.DataFrame(),
            segment.get("distance_km", 0),
        )

    latitudes = [
        point[1]
        for point in coordinates
    ]

    longitudes = [
        point[0]
        for point in coordinates
    ]

    min_lat = min(latitudes) - (
        radius_km / 111.0
    )

    max_lat = max(latitudes) + (
        radius_km / 111.0
    )

    center_lat = (
        min_lat + max_lat
    ) / 2

    longitude_scale = max(
        cos(radians(center_lat)),
        0.1,
    )

    lng_delta = radius_km / (
        111.0 * longitude_scale
    )

    min_lng = min(longitudes) - lng_delta
    max_lng = max(longitudes) + lng_delta

    candidates = accident_data[
        accident_data["latitude"].between(
            min_lat,
            max_lat,
        )
        & accident_data["longitude"].between(
            min_lng,
            max_lng,
        )
    ].copy()

    if candidates.empty:
        return calculate_accident_risk(
            pd.DataFrame(),
            segment.get("distance_km", 0),
        )

    matched_indexes = set()

    for point in coordinates:
        longitude, latitude = point

        local_candidates = candidates[
            candidates["latitude"].between(
                latitude - radius_km / 111.0,
                latitude + radius_km / 111.0,
            )
        ].copy()

        if local_candidates.empty:
            continue

        local_longitude_scale = max(
            cos(radians(latitude)),
            0.1,
        )

        local_lng_delta = radius_km / (
            111.0 * local_longitude_scale
        )

        local_candidates = local_candidates[
            local_candidates["longitude"].between(
                longitude - local_lng_delta,
                longitude + local_lng_delta,
            )
        ]

        if local_candidates.empty:
            continue

        distances = (
            (
                local_candidates["latitude"]
                - latitude
            ) ** 2
            + (
                (
                    local_candidates["longitude"]
                    - longitude
                )
                * local_longitude_scale
            ) ** 2
        ) ** 0.5 * 111.0

        matches = local_candidates[
            distances <= radius_km
        ]

        matched_indexes.update(
            matches.index.tolist()
        )

    if not matched_indexes:
        return calculate_accident_risk(
            pd.DataFrame(),
            segment.get("distance_km", 0),
        )

    accidents = accident_data.loc[
        list(matched_indexes)
    ].copy()

    return calculate_accident_risk(
        accidents=accidents,
        segment_length_km=segment.get(
            "distance_km",
            0,
        ),
    )