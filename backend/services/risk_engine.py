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

    weather_risk = float(
        weather.get(
            "risk_score",
            0,
        )
    )

    accident_risk = float(
        segment.get(
            "accident",
            {}
        ).get(
            "risk_score",
            0,
        )
    )

    road_risk = 0

    # Weighted combination.
    #
    # Accident history is the strongest historical
    # signal while weather and sunlight provide
    # current trip conditions.
    total_score = (
        accident_risk * 0.50
        + weather_risk * 0.25
        + sun_risk["sun_glare"] * 0.15
        + sun_risk["night"] * 0.10
        + road_risk * 0.05
    )

    total_score = min(
        total_score,
        100,
    )

    return {
        "risk_score": round(total_score),
        "risk_level": get_risk_level(
            total_score
        ),
        "factors": {
            "accident": round(
                accident_risk
            ),
            "weather": round(
                weather_risk
            ),
            "sun_glare": sun_risk[
                "sun_glare"
            ],
            "night": sun_risk[
                "night"
            ],
            "road": road_risk,
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

        if segment["segment_id"] in weather_by_segment:
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
        factors[factor] = round(
            sum(
                segment["factors"][factor]
                for segment in segments
            )
            / len(segments)
        )

    return {
        "risk_score": overall_score,
        "risk_level": get_risk_level(
            overall_score
        ),
        "factors": factors,
    }