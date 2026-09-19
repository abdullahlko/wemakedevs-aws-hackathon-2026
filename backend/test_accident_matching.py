import asyncio

from services.routing import calculate_route


async def main():
    print("Calculating Delhi → Chandigarh route...")

    route = await calculate_route(
        origin_lat=28.6139,
        origin_lng=77.2090,
        destination_lat=30.7333,
        destination_lng=76.7794,
        departure_time="2026-09-20T08:00:00+05:30",
    )

    print(
        f"Route distance: "
        f"{route['distance_km']} km"
    )

    print(
        f"Route duration: "
        f"{route['duration_minutes']} minutes"
    )

    print(
        f"Route points: "
        f"{len(route['coordinates'])}"
    )

    print(
        f"Route segments: "
        f"{len(route['segments'])}"
    )

    print("\n=== SEGMENT RISK ===")

    for segment in route["segments"]:
        accident = segment.get(
            "accident",
            {},
        )

        weather = segment.get(
            "weather",
            {},
        )

        factors = segment.get(
            "factors",
            {},
        )

        print(
            f"\nSegment {segment['segment_id']}"
        )

        print(
            f"  Distance: "
            f"{segment['distance_km']} km"
        )

        print(
            f"  Time: "
            f"{segment.get('start_time', 'Unknown')} "
            f"→ "
            f"{segment.get('end_time', 'Unknown')}"
        )

        print(
            f"  Accident: "
            f"{accident.get('risk_score', 0)} "
            f"({accident.get('accident_count', 0)} records)"
        )

        print(
            f"  Weather: "
            f"{weather.get('risk_score', 0)} "
            f"({weather.get('risk_level', 'Unavailable')})"
        )

        print(
            f"  Temperature: "
            f"{weather.get('temperature_c', 'N/A')} °C"
        )

        print(
            f"  Precipitation: "
            f"{weather.get('precipitation_mm', 'N/A')} mm"
        )

        print(
            f"  Visibility: "
            f"{weather.get('visibility_m', 'N/A')} m"
        )

        print(
            f"  Wind: "
            f"{weather.get('wind_speed_kmh', 'N/A')} km/h"
        )

        print(
            f"  Sun glare: "
            f"{factors.get('sun_glare', 0)}"
        )

        print(
            f"  Night: "
            f"{factors.get('night', 0)}"
        )

        print(
            f"  Overall: "
            f"{segment.get('risk_score', 0)} "
            f"({segment.get('risk_level', 'Unknown')})"
        )

    print("\n=== OVERALL ROUTE RISK ===")

    overall = route.get(
        "overall_risk",
        {},
    )

    print(
        f"Risk score: "
        f"{overall.get('risk_score', 0)}"
    )

    print(
        f"Risk level: "
        f"{overall.get('risk_level', 'Unknown')}"
    )

    print(
        f"Accident factor: "
        f"{overall.get('factors', {}).get('accident', 0)}"
    )

    print(
        f"Weather factor: "
        f"{overall.get('factors', {}).get('weather', 0)}"
    )

    print(
        f"Sun glare factor: "
        f"{overall.get('factors', {}).get('sun_glare', 0)}"
    )

    print(
        f"Night factor: "
        f"{overall.get('factors', {}).get('night', 0)}"
    )


if __name__ == "__main__":
    asyncio.run(main())