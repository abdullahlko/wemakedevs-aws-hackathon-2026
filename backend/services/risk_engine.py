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


def calculate_sun_risk(sunlight: dict) -> dict:
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


def calculate_segment_risk(segment: dict) -> dict:
    sunlight = segment.get("sunlight", {})

    sun_risk = calculate_sun_risk(sunlight)

    accident_risk = 0
    weather_risk = 0
    road_risk = 0

    total_score = (
        accident_risk
        + weather_risk
        + sun_risk["sun_glare"]
        + sun_risk["night"]
        + road_risk
    )

    total_score = min(total_score, 100)

    return {
        "risk_score": round(total_score),
        "risk_level": get_risk_level(total_score),
        "factors": {
            "accident": accident_risk,
            "weather": weather_risk,
            "sun_glare": sun_risk["sun_glare"],
            "night": sun_risk["night"],
            "road": road_risk,
        },
    }


def add_segment_risk(segments: list[dict]) -> list[dict]:
    for segment in segments:
        risk = calculate_segment_risk(segment)

        segment.update(risk)

    return segments


def calculate_overall_risk(segments: list[dict]) -> dict:
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
        "risk_level": get_risk_level(overall_score),
        "factors": factors,
    }