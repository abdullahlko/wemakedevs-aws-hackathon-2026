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

    candidates["distance_km"] = candidates.apply(
        lambda row: haversine_distance_km(
            latitude,
            longitude,
            row["latitude"],
            row["longitude"],
        ),
        axis=1,
    )

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

    risk_score = min(
        round(accident_density * 10),
        100,
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