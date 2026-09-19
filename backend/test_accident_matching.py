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

    factors = overall.get(
        "factors",
        {},
    )

    print(
        f"Accident factor: "
        f"{factors.get('accident', 0)}"
    )

    print(
        f"Weather factor: "
        f"{factors.get('weather', 0)}"
    )

    print(
        f"Sun glare factor: "
        f"{factors.get('sun_glare', 0)}"
    )

    print(
        f"Night factor: "
        f"{factors.get('night', 0)}"
    )

    print("\n=== INDIA WORK & REST PLAN ===")

    rest_plan = route.get(
        "rest_plan",
        {},
    )

    print(
        f"Status: "
        f"{rest_plan.get('status', 'Unknown')}"
    )

    print(
        f"Total work: "
        f"{rest_plan.get('total_work_time', 'Unknown')}"
    )

    print(
        f"Break count: "
        f"{rest_plan.get('break_count', 0)}"
    )

    print(
        f"Total break time: "
        f"{rest_plan.get('total_break_time', 'Unknown')}"
    )

    print(
        f"Planned trip time: "
        f"{rest_plan.get('planned_trip_minutes', 0)} minutes"
    )

    print(
        f"Departure: "
        f"{rest_plan.get('departure_time', 'Unknown')}"
    )

    print(
        f"Planned arrival: "
        f"{rest_plan.get('planned_arrival_time', 'Unknown')}"
    )

    print(
        f"Daily work limit: "
        f"{rest_plan.get('daily_work_limit_minutes', 0)} minutes"
    )

    print(
        f"Exceeds single-day work limit: "
        f"{rest_plan.get('exceeds_single_day_work_limit', False)}"
    )

    print(
        f"Rule basis: "
        f"{rest_plan.get('rule_basis', 'Unknown')}"
    )

    print(
        f"Legal note: "
        f"{rest_plan.get('legal_note', 'Unknown')}"
    )

    breaks = rest_plan.get(
        "breaks",
        [],
    )

    if breaks:
        print("\n--- Scheduled Breaks ---")

        for break_item in breaks:
            print(
                f"\nBreak {break_item['break_number']}"
            )

            print(
                f"  Start: "
                f"{break_item['start_time']}"
            )

            print(
                f"  End: "
                f"{break_item['end_time']}"
            )

            print(
                f"  Duration: "
                f"{break_item['duration_minutes']} minutes"
            )

            print(
                f"  After continuous work: "
                f"{break_item['after_continuous_work_minutes']} minutes"
            )

            print(
                f"  Segment: "
                f"{break_item['segment_id']}"
            )

            print(
                f"  Reason: "
                f"{break_item['reason']}"
            )

    else:
        print("\nNo mandatory break scheduled.")


if __name__ == "__main__":
    asyncio.run(main())