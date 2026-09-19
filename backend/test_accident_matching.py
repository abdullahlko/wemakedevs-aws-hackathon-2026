import asyncio

from services.routing import calculate_route


async def main():
    print("Calculating Delhi → Chandigarh route...")

    route = await calculate_route(
        origin_lat=28.6139,
        origin_lng=77.2090,
        destination_lat=30.7333,
        destination_lng=76.7794,
        departure_time="2026-09-18T08:00:00+05:30",
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

    print("\n=== SEGMENT ACCIDENT RISK ===")

    for segment in route["segments"]:
        accident = segment.get(
            "accident",
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
            f"  Accident risk: "
            f"{accident.get('risk_score', 0)}"
        )

        print(
            f"  Accident count: "
            f"{accident.get('accident_count', 0)}"
        )

        print(
            f"  Fatal: "
            f"{accident.get('fatal_count', 0)}"
        )

        print(
            f"  Major: "
            f"{accident.get('major_count', 0)}"
        )

        print(
            f"  Minor: "
            f"{accident.get('minor_count', 0)}"
        )

        print(
            f"  Sun glare risk: "
            f"{segment.get('factors', {}).get('sun_glare', 0)}"
        )

        print(
            f"  Night risk: "
            f"{segment.get('factors', {}).get('night', 0)}"
        )

        print(
            f"  Overall segment risk: "
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
        f"Sun glare factor: "
        f"{overall.get('factors', {}).get('sun_glare', 0)}"
    )

    print(
        f"Night factor: "
        f"{overall.get('factors', {}).get('night', 0)}"
    )


if __name__ == "__main__":
    asyncio.run(main())