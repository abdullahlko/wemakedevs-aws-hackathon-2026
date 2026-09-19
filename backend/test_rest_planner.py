from services.rest_planner import plan_rest_breaks


def make_segments(durations: list[float]) -> list[dict]:
    return [
        {
            "segment_id": index + 1,
            "duration_minutes": duration,
        }
        for index, duration in enumerate(durations)
    ]


DEPARTURE = "2026-09-20T08:00:00+05:30"


def test_exactly_300_minutes():
    result = plan_rest_breaks(
        departure_time=DEPARTURE,
        segments=make_segments([300]),
    )

    assert result["total_work_minutes"] == 300
    assert result["break_count"] == 0
    assert result["total_break_minutes"] == 0
    assert result["planned_trip_minutes"] == 300
    assert result["exceeds_single_day_work_limit"] is False


def test_301_minutes():
    result = plan_rest_breaks(
        departure_time=DEPARTURE,
        segments=make_segments([301]),
    )

    assert result["total_work_minutes"] == 301
    assert result["break_count"] == 1
    assert result["total_break_minutes"] == 30
    assert result["planned_trip_minutes"] == 331

    assert (
        result["breaks"][0]["after_continuous_work_minutes"]
        == 300
    )


def test_600_minutes():
    result = plan_rest_breaks(
        departure_time=DEPARTURE,
        segments=make_segments([600]),
    )

    assert result["total_work_minutes"] == 600
    assert result["break_count"] == 1
    assert result["total_break_minutes"] == 30
    assert result["planned_trip_minutes"] == 630


def test_multiple_segments_cross_boundary():
    result = plan_rest_breaks(
        departure_time=DEPARTURE,
        segments=make_segments([150, 150, 100]),
    )

    assert result["total_work_minutes"] == 400
    assert result["break_count"] == 1
    assert result["total_break_minutes"] == 30

    first_break = result["breaks"][0]

    assert (
        first_break["after_continuous_work_minutes"]
        == 300
    )

    assert (
        first_break["segment_id"]
        == 3
    )


def test_eight_hour_limit():
    result = plan_rest_breaks(
        departure_time=DEPARTURE,
        segments=make_segments([480]),
    )

    assert result["total_work_minutes"] == 480
    assert result["exceeds_single_day_work_limit"] is False
    assert result["status"] == "planned"


def test_over_eight_hours_requires_review():
    result = plan_rest_breaks(
        departure_time=DEPARTURE,
        segments=make_segments([600]),
    )

    assert result["total_work_minutes"] == 600
    assert result["exceeds_single_day_work_limit"] is True

    assert (
        result["status"]
        == "requires_multi_day_or_overtime_review"
    )


if __name__ == "__main__":
    test_exactly_300_minutes()
    test_301_minutes()
    test_600_minutes()
    test_multiple_segments_cross_boundary()
    test_eight_hour_limit()
    test_over_eight_hours_requires_review()

    print("All rest planner tests passed.")