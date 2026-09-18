import asyncio
from pathlib import Path

import pandas as pd

from services.routing import calculate_route


DATA_PATH = (
    Path(__file__).resolve().parent.parent
    / "data"
    / "raw"
    / "sehaj1104_accidents"
    / "indian_roads_dataset.csv"
)


def distance_to_point_km(
    lat1: float,
    lng1: float,
    lat2: float,
    lng2: float,
) -> float:
    """
    Approximate distance between two geographic points.

    This is only used for the prototype matching test.
    """
    from math import cos, radians, sqrt

    lat_distance = (lat2 - lat1) * 111.0
    lng_distance = (
        (lng2 - lng1)
        * 111.0
        * cos(radians((lat1 + lat2) / 2))
    )

    return sqrt(
        lat_distance**2
        + lng_distance**2
    )


def find_nearby_accidents(
    route_coordinates: list[list[float]],
    accidents: pd.DataFrame,
    radius_km: float = 5.0,
):
    matches = []

    for _, accident in accidents.iterrows():
        accident_lat = accident["latitude"]
        accident_lng = accident["longitude"]

        minimum_distance = float("inf")

        for point in route_coordinates:
            route_lng = point[0]
            route_lat = point[1]

            distance = distance_to_point_km(
                route_lat,
                route_lng,
                accident_lat,
                accident_lng,
            )

            minimum_distance = min(
                minimum_distance,
                distance,
            )

        if minimum_distance <= radius_km:
            matches.append(
                {
                    "city": accident["city"],
                    "state": accident["state"],
                    "latitude": accident_lat,
                    "longitude": accident_lng,
                    "severity": accident["accident_severity"],
                    "date": accident["date"],
                    "distance_km": round(
                        minimum_distance,
                        2,
                    ),
                }
            )

    return matches


async def main():
    accidents = pd.read_csv(DATA_PATH)

    print("Calculating Delhi → Chandigarh route...")

    route = await calculate_route(
        origin_lat=28.6139,
        origin_lng=77.2090,
        destination_lat=30.7333,
        destination_lng=76.7794,
        departure_time="2026-09-18T08:00:00",
    )

    coordinates = route["coordinates"]

    print(
        f"Route distance: "
        f"{route['distance_km']} km"
    )

    print(
        f"Route points: "
        f"{len(coordinates)}"
    )

    print("\nSearching for accidents within 5 km...")

    matches = find_nearby_accidents(
        route_coordinates=coordinates,
        accidents=accidents,
        radius_km=5.0,
    )

    print(
        f"\nMatched accidents: "
        f"{len(matches)}"
    )

    if matches:
        matched_df = pd.DataFrame(matches)

        print("\n=== MATCHED ACCIDENTS ===")
        print(
            matched_df[
                [
                    "city",
                    "severity",
                    "date",
                    "distance_km",
                ]
            ]
            .sort_values("distance_km")
            .head(20)
            .to_string(index=False)
        )

        print("\n=== SEVERITY BREAKDOWN ===")
        print(
            matched_df["severity"]
            .value_counts()
        )
    else:
        print(
            "No accident records found "
            "within 5 km of this route."
        )


if __name__ == "__main__":
    asyncio.run(main())