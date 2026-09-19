import asyncio
from math import cos, radians, sqrt
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


def prepare_route(route_coordinates):
    """
    Convert TomTom [lng, lat] coordinates into
    a dataframe-friendly structure.
    """
    return [
        (point[1], point[0])
        for point in route_coordinates
    ]


def find_nearby_accidents(
    route_coordinates,
    accidents,
    radius_km,
):
    """
    Find accident records near the route.

    Uses a simple bounding-box pre-filter before
    calculating the more precise approximate distance.
    """

    route_lats = [
        point[0]
        for point in route_coordinates
    ]

    route_lngs = [
        point[1]
        for point in route_coordinates
    ]

    min_lat = min(route_lats)
    max_lat = max(route_lats)
    min_lng = min(route_lngs)
    max_lng = max(route_lngs)

    lat_padding = radius_km / 111.0

    average_lat = (
        min_lat + max_lat
    ) / 2

    lng_padding = radius_km / (
        111.0
        * cos(radians(average_lat))
    )

    candidates = accidents[
        (accidents["latitude"] >= min_lat - lat_padding)
        & (accidents["latitude"] <= max_lat + lat_padding)
        & (accidents["longitude"] >= min_lng - lng_padding)
        & (accidents["longitude"] <= max_lng + lng_padding)
    ]

    matches = []

    for _, accident in candidates.iterrows():
        accident_lat = accident["latitude"]
        accident_lng = accident["longitude"]

        minimum_distance = float("inf")

        for route_lat, route_lng in route_coordinates:
            lat_distance = (
                accident_lat - route_lat
            ) * 111.0

            lng_distance = (
                accident_lng - route_lng
            ) * 111.0 * cos(
                radians(
                    (
                        accident_lat
                        + route_lat
                    ) / 2
                )
            )

            distance = sqrt(
                lat_distance**2
                + lng_distance**2
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
                    "severity": accident[
                        "accident_severity"
                    ],
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

    route_coordinates = prepare_route(
        route["coordinates"]
    )

    print(
        f"Route distance: "
        f"{route['distance_km']} km"
    )

    print(
        f"Route points: "
        f"{len(route_coordinates)}"
    )

    print("\n=== RADIUS COMPARISON ===")

    for radius in [5.0, 2.0, 1.0, 0.5]:
        matches = find_nearby_accidents(
            route_coordinates,
            accidents,
            radius,
        )

        print(
            f"{radius:>4} km → "
            f"{len(matches)} accidents"
        )

    print("\n=== 1 KM MATCH DETAILS ===")

    matches = find_nearby_accidents(
        route_coordinates,
        accidents,
        1.0,
    )

    if not matches:
        print("No accidents found.")
        return

    matched_df = pd.DataFrame(matches)

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

    print("\n=== 1 KM SEVERITY BREAKDOWN ===")

    print(
        matched_df["severity"]
        .value_counts()
    )


if __name__ == "__main__":
    asyncio.run(main())