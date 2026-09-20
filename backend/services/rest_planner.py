from datetime import datetime, timedelta

# Planning inputs based on the researched 2026 India OSH Code
# framework. Not compliance-grade: Gazette originals were not
# independently opened. Verify before legal use.
LEGAL_WORK_RULES = {
    "max_continuous_work_minutes": 300,   # S.O. 2517(E), 13 May 2026
    "minimum_break_minutes": 30,          # S.O. 2517(E), 13 May 2026
    "max_daily_work_minutes": 480,        # OSH Code s.25(1)(a)
    "max_weekly_work_minutes": 2880,      # OSH Central Rules 2026, r.64(1)
}

RULE_BASIS = "India OSH Code 2026 framework"


def format_minutes(minutes: float) -> str:
    minutes = int(round(minutes))
    hours, remaining = divmod(minutes, 60)
    if hours == 0:
        return f"{remaining} minutes"
    if remaining == 0:
        return f"{hours} hours"
    return f"{hours} hours {remaining} minutes"


def plan_rest_breaks(
    departure_time: str,
    segments: list[dict],
    rules: dict | None = None,
) -> dict:
    """
    Insert mandatory breaks so no more than 5 hours of continuous
    work occurs without a 30 minute break.

    Each segment needs: segment_id, duration_minutes.
    (start_time on segments is ignored; one running clock is used.)

    All segment time is treated as WORK time (driving, loading,
    unloading, upkeep). Nothing here is treated as rest except
    the breaks this function inserts.
    """
    active_rules = {**LEGAL_WORK_RULES, **(rules or {})}

    max_continuous = float(active_rules["max_continuous_work_minutes"])
    min_break = int(active_rules["minimum_break_minutes"])
    max_daily = float(active_rules["max_daily_work_minutes"])

    clock = datetime.fromisoformat(departure_time)
    departure = clock

    breaks = []
    continuous_work = 0.0
    total_work = 0.0
    total_break = 0

    for segment in segments:
        remaining = float(segment.get("duration_minutes", 0))

        while remaining > 0:
            room = max_continuous - continuous_work

            if room <= 0:
                # Limit already reached: break BEFORE more work.
                break_start = clock
                break_end = clock + timedelta(minutes=min_break)
                breaks.append({
                    "break_number": len(breaks) + 1,
                    "start_time": break_start.isoformat(),
                    "end_time": break_end.isoformat(),
                    "duration_minutes": min_break,
                    "after_continuous_work_minutes": continuous_work,
                    "segment_id": segment["segment_id"],
                    "reason": "Continuous work limit reached",
                })
                clock = break_end
                total_break += min_break
                continuous_work = 0.0
                continue

            work_now = min(remaining, room)
            clock += timedelta(minutes=work_now)
            continuous_work += work_now
            total_work += work_now
            remaining -= work_now

    # No trailing break is added: the trip ends at arrival.

    total_trip = total_work + total_break
    daily_exceeded = total_work > max_daily

    if daily_exceeded:
        status = "requires_multi_day_or_overtime_review"
    elif total_work == 0:
        status = "no_work"
    else:
        status = "planned"

    return {
        "status": status,
        "total_work_minutes": total_work,
        "total_work_time": format_minutes(total_work),
        "break_count": len(breaks),
        "total_break_minutes": total_break,
        "total_break_time": format_minutes(total_break),
        "planned_trip_minutes": total_trip,
        "planned_arrival_time": clock.isoformat(),
        "departure_time": departure.isoformat(),
        "daily_work_limit_minutes": max_daily,
        "exceeds_single_day_work_limit": daily_exceeded,
        "breaks": breaks,
        "rules": active_rules,
        "rule_basis": RULE_BASIS,
        "legal_note": (
            "Planning implementation only. Verify Gazette text "
            "and applicability before relying on this for compliance."
        ),
    }