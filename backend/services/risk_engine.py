from services.accident import (
    get_segment_accident_summary,
    load_accident_data,
)


def get_risk_level(score: float) -> str:
    if score < 20:
        return "Very Low"

    if score < 40:
        return "Low"

    if score < 60:
        return "Moderate"

    if score < 80:
        return "High"

    return "Very High"


def calculate_sun_risk(
    sunlight: dict,
) -> dict:
    light_condition = sunlight.get(
        "light_condition",
        "daylight",
    )

    glare_risk = float(
        sunlight.get(
            "glare_risk",
            0,
        )
    )

    if light_condition == "night":
        night_risk = 70
    elif light_condition == "twilight":
        night_risk = 45
    else:
        night_risk = 0

    return {
        "sun_glare": round(glare_risk),
        "night": night_risk,
    }


def calculate_segment_risk(
    segment: dict,
) -> dict:
    sunlight = segment.get(
        "sunlight",
        {},
    )

    weather = segment.get(
        "weather",
        {},
    )

    sun_risk = calculate_sun_risk(
        sunlight
    )

    weather_available = (
        weather.get("status")
        == "available"
    )

    weather_risk = weather.get(
        "risk_score"
    )

    if weather_risk is not None:
        weather_risk = float(
            weather_risk
        )

    accident_risk = float(
        segment.get(
            "accident",
            {},
        ).get(
            "risk_score",
            0,
        )
    )

    road_risk = 0

    if weather_available:
        total_score = (
            accident_risk * 0.50
            + weather_risk * 0.25
            + sun_risk["sun_glare"] * 0.15
            + sun_risk["night"] * 0.10
            + road_risk * 0.05
        )
    else:
        # Weather is unavailable, so do not
        # treat missing data as zero risk.
        #
        # Re-normalize the available factors
        # across their original weights.
        available_weight = (
            0.50
            + 0.15
            + 0.10
            + 0.05
        )

        available_score = (
            accident_risk * 0.50
            + sun_risk["sun_glare"] * 0.15
            + sun_risk["night"] * 0.10
            + road_risk * 0.05
        )

        total_score = (
            available_score
            / available_weight
        )

    total_score = min(
        total_score,
        100,
    )

    return {
        "risk_score": round(
            total_score
        ),
        "risk_level": get_risk_level(
            total_score
        ),
        "factors": {
            "accident": round(
                accident_risk
            ),
            "weather": (
                round(weather_risk)
                if weather_risk is not None
                else None
            ),
            "sun_glare": sun_risk[
                "sun_glare"
            ],
            "night": sun_risk[
                "night"
            ],
            "road": road_risk,
        },
        "data_status": {
            "accident": "available",
            "weather": (
                "available"
                if weather_available
                else "unavailable"
            ),
            "sunlight": "calculated",
        },
    }


def add_segment_risk(
    segments: list[dict],
    weather_by_segment: dict | None = None,
) -> list[dict]:
    weather_by_segment = (
        weather_by_segment or {}
    )

    accident_data = load_accident_data()

    for segment in segments:
        accident = get_segment_accident_summary(
            segment=segment,
            accident_data=accident_data,
            radius_km=1.0,
        )

        segment["accident"] = accident

        if (
            segment["segment_id"]
            in weather_by_segment
        ):
            segment["weather"] = (
                weather_by_segment[
                    segment["segment_id"]
                ]
            )

        risk = calculate_segment_risk(
            segment
        )

        segment.update(risk)

    return segments


def calculate_overall_risk(
    segments: list[dict],
) -> dict:
    if not segments:
        return {
            "risk_score": 0,
            "risk_level": "Very Low",
            "factors": {
                "accident": 0,
                "weather": 0,
                "sun_glare": 0,
                "night": 0,
                "road": 0,
            },
            "data_status": {
                "weather": "unavailable",
            },
        }

    overall_score = max(
        segment["risk_score"]
        for segment in segments
    )

    factor_names = [
        "accident",
        "weather",
        "sun_glare",
        "night",
        "road",
    ]

    factors = {}

    for factor in factor_names:
        values = [
            segment["factors"][factor]
            for segment in segments
            if segment["factors"][factor]
            is not None
        ]

        if values:
            factors[factor] = round(
                sum(values)
                / len(values)
            )
        else:
            factors[factor] = None

    weather_available_count = sum(
        1
        for segment in segments
        if segment.get(
            "data_status",
            {},
        ).get("weather")
        == "available"
    )

    if (
        weather_available_count
        == len(segments)
    ):
        weather_status = "available"
    elif weather_available_count == 0:
        weather_status = "unavailable"
    else:
        weather_status = "partial"

    return {
        "risk_score": overall_score,
        "risk_level": get_risk_level(
            overall_score
        ),
        "factors": factors,
        "data_status": {
            "weather": weather_status,
            "accident": "prototype_dataset",
            "sunlight": "calculated",
        },
    }