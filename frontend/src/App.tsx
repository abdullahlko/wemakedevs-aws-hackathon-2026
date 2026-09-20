import { useMemo, useState, type ReactNode } from "react"

import RouteMap from "./components/RouteMap"

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    "https://ma9mo4km5g.execute-api.ap-south-1.amazonaws.com/default"

type Location = {
    name: string
    lat: number
    lng: number
}

type RiskFactors = {
    accident: number | null
    weather: number | null
    sun_glare: number | null
    night: number | null
    road: number | null
}

type SunlightData = {
    sun_altitude?: number | null
    sun_azimuth?: number | null
    light_condition?: string | null
    sun_angle_difference?: number | null
    glare_risk?: number | null
}

type WeatherData = {
    status?: string
    temperature_c?: number | null
    precipitation_mm?: number | null
    visibility_m?: number | null
    wind_speed_kmh?: number | null
    weather_code?: number | null
    risk_score?: number | null
    risk_level?: string | null
    risk_factors?: string[]
    source?: string | null
}

type AccidentData = {
    status?: string
    risk_score?: number | null
    risk_level?: string | null
    accident_count?: number | null
    severity_counts?: Record<string, number>
}

type Segment = {
    segment_id?: number
    coordinates: [number, number][]
    bearing?: number | null
    start_time?: string | null
    end_time?: string | null
    duration_minutes?: number | null
    distance_km?: number | null
    sunlight?: SunlightData | null
    weather?: WeatherData | null
    accident?: AccidentData | null
    risk_score?: number | null
    risk_level?: string | null
    factors?: RiskFactors | null
    data_status?: {
        accident?: string | null
        weather?: string | null
        sunlight?: string | null
    }
}

type Instruction = {
    instruction_id: number
    clean_message: string
    maneuver?: string | null
    route_offset_m?: number | null
    distance_from_previous_m?: number | null
    duration_from_previous_seconds?: number | null
    segment_id?: number | null
    risk_score?: number | null
    risk_level?: string | null
    accident?: AccidentData | null
    weather?: WeatherData | null
    sunlight?: SunlightData | null
    factors?: RiskFactors | null
    point?: {
        latitude: number
        longitude: number
    } | null
}

type OverallRisk = {
    risk_score?: number | null
    risk_level?: string | null
    factors?: RiskFactors | null
    data_status?: {
        weather?: string | null
        accident?: string | null
        sunlight?: string | null
    }
}

type RestBreak = {
    break_number?: number
    start_time?: string
    end_time?: string
    duration_minutes?: number
    after_continuous_work_minutes?: number
    segment_id?: number
    reason?: string
}

type RestPlan = {
    status?: string
    total_work_minutes?: number
    total_work_time?: string
    break_count?: number
    total_break_minutes?: number
    total_break_time?: string
    planned_trip_minutes?: number
    planned_arrival_time?: string
    departure_time?: string
    daily_work_limit_minutes?: number
    exceeds_single_day_work_limit?: boolean
    breaks?: RestBreak[]
    rules?: {
        max_continuous_work_minutes?: number
        max_daily_work_minutes?: number
        max_weekly_work_minutes?: number
        minimum_break_minutes?: number
    }
    rule_basis?: string
    legal_note?: string
}

type RouteData = {
    distance_km: number
    duration_minutes: number
    traffic_delay_minutes: number
    coordinates: [number, number][]
    segments: Segment[]
    instructions?: Instruction[]
    overall_risk: OverallRisk
    rest_plan: RestPlan
}

type TripResponse = {
    origin: Location
    destination: Location
    route: RouteData
}

type ContextKind = "weather" | "incident" | "sun" | "risk"

function getDefaultDepartureTime() {
    const now = new Date()
    now.setHours(8, 0, 0, 0)

    const pad = (value: number) => String(value).padStart(2, "0")

    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
        now.getDate(),
    )}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

function formatDuration(minutes?: number | null) {
    if (minutes == null) return "N/A"

    const hours = Math.floor(minutes / 60)
    const remaining = Math.round(minutes % 60)

    if (hours === 0) return `${remaining} min`
    if (remaining === 0) return `${hours}h`

    return `${hours}h ${remaining}m`
}

function formatSeconds(seconds?: number | null) {
    if (seconds == null) return "N/A"
    if (seconds < 60) return `${Math.round(seconds)} sec`

    const minutes = Math.round(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const remaining = minutes % 60

    if (hours === 0) return `${minutes} min`
    if (remaining === 0) return `${hours}h`

    return `${hours}h ${remaining}m`
}

function formatDistance(meters?: number | null) {
    if (meters == null) return "N/A"
    if (meters < 1000) return `${Math.round(meters)} m`

    return `${(meters / 1000).toFixed(1)} km`
}

function formatTime(value?: string | null) {
    if (!value) return "N/A"

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value

    return date.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
    })
}

function riskRank(level?: string | null) {
    const value = level?.toLowerCase() || ""

    if (value.includes("very high") || value === "high") return 3
    if (value.includes("moderate")) return 2
    if (value.includes("low")) return 1

    return 0
}

function riskTone(level?: string | null) {
    const rank = riskRank(level)

    if (rank === 3) return "border-red-200 bg-red-50 text-red-700"
    if (rank === 2) return "border-amber-200 bg-amber-50 text-amber-700"
    if (rank === 1) return "border-emerald-200 bg-emerald-50 text-emerald-700"

    return "border-slate-200 bg-slate-50 text-slate-600"
}

function scoreTone(score?: number | null, level?: string | null) {
    if (score == null) {
        return riskTone(level)
    }

    if (score >= 70) {
        return "border-red-300 bg-red-50 text-red-700"
    }

    if (score >= 40) {
        return "border-amber-300 bg-amber-50 text-amber-700"
    }

    return "border-emerald-300 bg-emerald-50 text-emerald-700"
}

function factorLabel(value?: number | null) {
    if (value == null) return "Unavailable"
    if (value >= 70) return "High"
    if (value >= 40) return "Moderate"

    return "Low"
}

function factorTone(value?: number | null) {
    if (value == null) return "text-slate-400"
    if (value >= 70) return "text-red-700"
    if (value >= 40) return "text-amber-700"

    return "text-emerald-700"
}

function factorBar(value?: number | null) {
    if (value == null) return "bg-slate-200"
    if (value >= 70) return "bg-red-500"
    if (value >= 40) return "bg-amber-500"

    return "bg-emerald-500"
}

function availableWeather(weather?: WeatherData | null) {
    return Boolean(
        weather &&
        (weather.status === "available" ||
            weather.temperature_c != null ||
            weather.risk_score != null),
    )
}

function availableAccident(accident?: AccidentData | null) {
    return Boolean(
        accident &&
        (accident.status === "available" ||
            accident.accident_count != null ||
            accident.risk_score != null),
    )
}

function weatherCondition(weather?: WeatherData | null) {
    if (!weather) return "Unavailable"

    if ((weather.precipitation_mm ?? 0) > 0) return "Rain"

    if (
        weather.visibility_m != null &&
        weather.visibility_m < 5000
    ) {
        return "Reduced visibility"
    }

    return "Clear"
}

function sunlightCondition(sunlight?: SunlightData | null) {
    const condition = sunlight?.light_condition?.toLowerCase()

    if (!condition) return "Unavailable"
    if (condition.includes("night")) return "Night"

    return condition.replace(/_/g, " ")
}

function maneuverSymbol(maneuver?: string | null) {
    switch (maneuver) {
        case "TURN_LEFT":
        case "ROUNDABOUT_LEFT":
            return "←"

        case "TURN_RIGHT":
        case "ROUNDABOUT_RIGHT":
            return "→"

        case "KEEP_LEFT":
            return "↙"

        case "KEEP_RIGHT":
            return "↘"

        case "U_TURN":
            return "↶"

        case "STRAIGHT":
            return "↑"

        case "DEPART":
        case "ARRIVE":
            return "●"

        default:
            return "↻"
    }
}

function maneuverLabel(maneuver?: string | null) {
    const value = maneuver?.toLowerCase() || ""

    if (value.includes("roundabout")) return "Roundabout"
    if (value.includes("u_turn")) return "U-turn"
    if (value.includes("turn_left")) return "Turn left"
    if (value.includes("turn_right")) return "Turn right"
    if (value.includes("keep_left")) return "Keep left"
    if (value.includes("keep_right")) return "Keep right"
    if (value.includes("arrive")) return "Arrival"
    if (value.includes("depart")) return "Departure"
    if (value.includes("straight")) return "Continue"
    if (value.includes("exit")) return "Exit"

    return "Route instruction"
}

function ContextIcon({ kind }: { kind: ContextKind }) {
    if (kind === "weather") {
        return (
            <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
            >
                <path
                    d="M7.2 18.1h9.2a3.6 3.6 0 0 0 .4-7.2 5.4 5.4 0 0 0-10.6.7 3.2 3.2 0 0 0 1 6.5Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        )
    }

    if (kind === "incident") {
        return (
            <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
            >
                <path
                    d="M12 4.2 19.1 18H4.9L12 4.2Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                />
                <path
                    d="M12 9v4"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                />
                <circle
                    cx="12"
                    cy="15.7"
                    r=".7"
                    fill="currentColor"
                />
            </svg>
        )
    }

    if (kind === "sun") {
        return (
            <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
            >
                <circle
                    cx="12"
                    cy="12"
                    r="3.5"
                    stroke="currentColor"
                    strokeWidth="1.7"
                />
                <path
                    d="M12 2.8v2.1M12 19.1v2.1M21.2 12h-2.1M4.9 12H2.8M18.5 5.5 17 7M7 17l-1.5 1.5M18.5 18.5 17 17M7 7 5.5 5.5"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                />
            </svg>
        )
    }

    return (
        <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
        >
            <path
                d="M12 3.3 19 6v5.4c0 4.2-2.8 7.3-7 9.3-4.2-2-7-5.1-7-9.3V6l7-2.7Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
            />
            <path
                d="m9.2 12.1 1.8 1.8 3.8-4"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

function ContextIndicator({
    kind,
    instruction,
}: {
    kind: ContextKind
    instruction: Instruction
}) {
    const [hovered, setHovered] = useState(false)
    const [focused, setFocused] = useState(false)
    const [pinned, setPinned] = useState(false)

    const weatherScore = instruction.weather?.risk_score ?? null
    const incidentScore = instruction.accident?.risk_score ?? null
    const sunScore = instruction.sunlight?.glare_risk ?? null
    const riskScore = instruction.risk_score ?? null

    const score =
        kind === "weather"
            ? weatherScore
            : kind === "incident"
                ? incidentScore
                : kind === "sun"
                    ? sunScore
                    : riskScore

    let title = ""
    let body: ReactNode = null

    if (kind === "weather") {
        const weather = instruction.weather

        title = "Weather"

        body = (
            <div className="space-y-2">
                <div className="font-semibold text-slate-900">
                    {weatherCondition(weather)}
                    {weather?.temperature_c != null
                        ? ` · ${weather.temperature_c.toFixed(1)}°C`
                        : ""}
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    <span>Rain</span>
                    <span className="text-right font-medium text-slate-800">
                        {weather?.precipitation_mm != null
                            ? `${weather.precipitation_mm.toFixed(1)} mm`
                            : "N/A"}
                    </span>

                    <span>Wind</span>
                    <span className="text-right font-medium text-slate-800">
                        {weather?.wind_speed_kmh != null
                            ? `${weather.wind_speed_kmh.toFixed(1)} km/h`
                            : "N/A"}
                    </span>

                    <span>Visibility</span>
                    <span className="text-right font-medium text-slate-800">
                        {weather?.visibility_m != null
                            ? `${Math.round(weather.visibility_m)} m`
                            : "N/A"}
                    </span>
                </div>

                <div className="border-t border-slate-100 pt-2">
                    Weather risk{" "}
                    {weather?.risk_score != null
                        ? Math.round(weather.risk_score)
                        : "N/A"}
                    {weather?.source ? ` · ${weather.source}` : ""}
                </div>
            </div>
        )
    }

    if (kind === "incident") {
        const accident = instruction.accident

        title = "Historical accidents"

        body = (
            <div className="space-y-2">
                <div className="font-semibold text-slate-900">
                    {accident?.accident_count ?? 0} recorded historical
                    accidents
                </div>

                <div>
                    Accident risk{" "}
                    {accident?.risk_score != null
                        ? Math.round(accident.risk_score)
                        : "N/A"}
                </div>

                {accident?.severity_counts &&
                    Object.keys(accident.severity_counts).length > 0 && (
                        <div className="border-t border-slate-100 pt-2">
                            {Object.entries(
                                accident.severity_counts,
                            ).map(([severity, count]) => (
                                <div
                                    key={severity}
                                    className="flex justify-between gap-5 py-0.5"
                                >
                                    <span className="capitalize">
                                        {severity}
                                    </span>

                                    <span className="font-medium text-slate-800">
                                        {count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                <div className="border-t border-slate-100 pt-2 text-slate-500">
                    Historical road data, not live incidents.
                </div>
            </div>
        )
    }

    if (kind === "sun") {
        const sunlight = instruction.sunlight

        title = "Sunlight & glare"

        body = (
            <div className="space-y-2">
                <div className="font-semibold capitalize text-slate-900">
                    {sunlightCondition(sunlight)}
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    <span>Glare risk</span>
                    <span className="text-right font-medium text-slate-800">
                        {sunlight?.glare_risk != null
                            ? Math.round(sunlight.glare_risk)
                            : "N/A"}
                    </span>

                    <span>Sun altitude</span>
                    <span className="text-right font-medium text-slate-800">
                        {sunlight?.sun_altitude != null
                            ? `${sunlight.sun_altitude.toFixed(1)}°`
                            : "N/A"}
                    </span>

                    <span>Sun azimuth</span>
                    <span className="text-right font-medium text-slate-800">
                        {sunlight?.sun_azimuth != null
                            ? `${sunlight.sun_azimuth.toFixed(1)}°`
                            : "N/A"}
                    </span>
                </div>
            </div>
        )
    }

    if (kind === "risk") {
        const factors = instruction.factors

        title = "Combined route risk"

        body = (
            <div className="space-y-2">
                <div className="font-semibold text-slate-900">
                    Risk {riskScore != null ? Math.round(riskScore) : "N/A"}
                    {instruction.risk_level
                        ? ` · ${instruction.risk_level}`
                        : ""}
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    <span>Accident</span>
                    <span className="text-right font-medium text-slate-800">
                        {factors?.accident != null
                            ? Math.round(factors.accident)
                            : "N/A"}
                    </span>

                    <span>Weather</span>
                    <span className="text-right font-medium text-slate-800">
                        {factors?.weather != null
                            ? Math.round(factors.weather)
                            : "N/A"}
                    </span>

                    <span>Sun glare</span>
                    <span className="text-right font-medium text-slate-800">
                        {factors?.sun_glare != null
                            ? Math.round(factors.sun_glare)
                            : "N/A"}
                    </span>

                    <span>Night</span>
                    <span className="text-right font-medium text-slate-800">
                        {factors?.night != null
                            ? Math.round(factors.night)
                            : "N/A"}
                    </span>

                    <span>Road</span>
                    <span className="text-right font-medium text-slate-800">
                        {factors?.road != null
                            ? Math.round(factors.road)
                            : "N/A"}
                    </span>
                </div>
            </div>
        )
    }

    const tone = scoreTone(score, instruction.risk_level)

    const visible = hovered || focused || pinned

    return (
        <div
            className="relative"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <button
                type="button"
                aria-label={title}
                aria-expanded={visible}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onClick={() => setPinned((value) => !value)}
                className={`flex h-8 w-8 items-center justify-center border transition ${tone}`}
            >
                <ContextIcon kind={kind} />
            </button>

            {visible && (
                <div className="absolute right-0 top-10 z-50 w-72 border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-500 shadow-xl">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        {title}
                    </div>

                    {body}
                </div>
            )}
        </div>
    )
}

function getInstructionContext(instruction: Instruction) {
    return {
        hasWeather: availableWeather(instruction.weather),
        hasIncident: availableAccident(instruction.accident),
        hasSun: Boolean(instruction.sunlight),
        hasRisk: instruction.risk_score != null,
    }
}

function isHighValueInstruction(
    instruction: Instruction,
    index: number,
    all: Instruction[],
) {
    const maneuver = instruction.maneuver?.toUpperCase() || ""
    const message = instruction.clean_message.toLowerCase()
    const distance = instruction.distance_from_previous_m ?? 0
    const risk = instruction.risk_score ?? 0
    const context = getInstructionContext(instruction)

    const segmentChanged =
        index === 0 ||
        instruction.segment_id !== all[index - 1]?.segment_id

    const navigationEvent =
        maneuver.includes("TURN") ||
        maneuver.includes("ROUNDABOUT") ||
        maneuver.includes("EXIT") ||
        maneuver.includes("U_TURN") ||
        maneuver.includes("DEPART") ||
        maneuver.includes("ARRIVE")

    const meaningfulContext =
        risk >= 40 ||
        (instruction.weather?.precipitation_mm ?? 0) > 0 ||
        (instruction.sunlight?.glare_risk ?? 0) >= 40 ||
        (instruction.accident?.risk_score ?? 0) >= 40

    const meaningfulMessage =
        message.includes("exit") ||
        message.includes("roundabout") ||
        message.includes("turn")

    return (
        index === 0 ||
        index === all.length - 1 ||
        segmentChanged ||
        navigationEvent ||
        meaningfulMessage ||
        meaningfulContext ||
        distance >= 3000 ||
        (context.hasIncident &&
            (instruction.accident?.accident_count ?? 0) > 0 &&
            distance >= 1500)
    )
}

function getVisibleInstructions(
    instructions: Instruction[],
    showAll: boolean,
) {
    if (showAll) {
        return instructions.map((instruction, originalIndex) => ({
            instruction,
            originalIndex,
        }))
    }

    return instructions
        .map((instruction, originalIndex) => ({
            instruction,
            originalIndex,
        }))
        .filter(({ instruction, originalIndex }) =>
            isHighValueInstruction(
                instruction,
                originalIndex,
                instructions,
            ),
        )
}

function RiskMetric({
    label,
    value,
    score,
}: {
    label: string
    value: string
    score?: number | null
}) {
    return (
        <div className="border border-slate-200 bg-white px-4 py-4">
            <div className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                {label}
            </div>

            <div className="mt-1.5 flex items-end justify-between gap-3">
                <div className="text-xl font-semibold tracking-tight text-slate-900">
                    {value}
                </div>

                {score != null && (
                    <div
                        className={`text-xs font-semibold ${factorTone(
                            score,
                        )}`}
                    >
                        {Math.round(score)} / 100
                    </div>
                )}
            </div>

            {score != null && (
                <div className="mt-3 h-1 bg-slate-100">
                    <div
                        className={`h-full ${factorBar(score)}`}
                        style={{
                            width: `${Math.max(
                                0,
                                Math.min(100, score),
                            )}%`,
                        }}
                    />
                </div>
            )}
        </div>
    )
}

function JourneyFactor({
    label,
    value,
}: {
    label: string
    value?: number | null
}) {
    return (
        <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-slate-100 py-3 last:border-b-0">
            <div>
                <div className="text-sm font-medium text-slate-700">
                    {label}
                </div>

                <div className="mt-2 h-1 bg-slate-100">
                    <div
                        className={`h-full ${factorBar(value)}`}
                        style={{
                            width: `${Math.max(
                                0,
                                Math.min(100, value ?? 0),
                            )}%`,
                        }}
                    />
                </div>
            </div>

            <div className="text-right">
                <div
                    className={`text-sm font-semibold ${factorTone(
                        value,
                    )}`}
                >
                    {factorLabel(value)}
                </div>

                <div className="mt-0.5 text-xs tabular-nums text-slate-400">
                    {value != null ? Math.round(value) : "N/A"}
                </div>
            </div>
        </div>
    )
}

function RouteRiskStrip({
    segments,
    breaks,
}: {
    segments: Segment[]
    breaks: RestBreak[]
}) {
    const [activeSegment, setActiveSegment] = useState<number | null>(
        null,
    )

    if (segments.length === 0) return null

    return (
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Route risk by section
                    </div>

                    <div className="mt-1 text-sm text-slate-600">
                        Each section uses the same route-level risk signals shown in the itinerary.
                    </div>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 bg-emerald-500" />
                        Low
                    </span>

                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 bg-amber-500" />
                        Moderate
                    </span>

                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 bg-red-500" />
                        High
                    </span>
                </div>
            </div>

            <div className="mt-4 flex gap-1.5">
                {segments.map((segment, index) => {
                    const risk = segment.risk_score ?? 0

                    const rank =
                        risk >= 70 ? 3 : risk >= 40 ? 2 : 1

                    const hasBreak = breaks.some(
                        (item) =>
                            item.segment_id === segment.segment_id,
                    )

                    const active = activeSegment === index

                    const segmentClass =
                        rank === 3
                            ? "bg-red-500"
                            : rank === 2
                                ? "bg-amber-500"
                                : "bg-emerald-500"

                    return (
                        <div
                            key={`${segment.segment_id ?? index}-${index}`}
                            className="relative min-w-1"
                            style={{
                                flexGrow: Math.max(
                                    segment.distance_km ?? 0.1,
                                    0.1,
                                ),
                            }}
                        >
                            <button
                                type="button"
                                aria-label={`Route section ${index + 1}`}
                                className={`group h-2.5 w-full ${segmentClass} transition ${active
                                        ? "opacity-100 ring-2 ring-slate-900 ring-offset-2"
                                        : "opacity-80 hover:opacity-100"
                                    }`}
                                onMouseEnter={() =>
                                    setActiveSegment(index)
                                }
                                onMouseLeave={() =>
                                    setActiveSegment(null)
                                }
                                onFocus={() =>
                                    setActiveSegment(index)
                                }
                                onBlur={() =>
                                    setActiveSegment(null)
                                }
                            />
                            {hasBreak && (
                                <span className="absolute left-1/2 top-3.5 h-2 w-px -translate-x-1/2 bg-slate-700" />
                            )}

                            {active && (
                                <div className="absolute left-1/2 top-7 z-50 w-64 -translate-x-1/2 border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-500 shadow-xl">
                                    <div className="font-semibold text-slate-900">
                                        Section{" "}
                                        {segment.segment_id ??
                                            index + 1}
                                    </div>

                                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                                        <span>Risk</span>

                                        <span
                                            className={`text-right font-semibold ${factorTone(
                                                risk,
                                            )}`}
                                        >
                                            {Math.round(risk)} ·{" "}
                                            {segment.risk_level ||
                                                factorLabel(risk)}
                                        </span>

                                        <span>Distance</span>
                                        <span className="text-right font-medium text-slate-800">
                                            {segment.distance_km != null
                                                ? `${segment.distance_km.toFixed(1)} km`
                                                : "N/A"}
                                        </span>

                                        <span>Accidents</span>
                                        <span className="text-right font-medium text-slate-800">
                                            {segment.accident
                                                ?.accident_count ??
                                                0}{" "}
                                            historical
                                        </span>

                                        <span>Weather</span>
                                        <span className="text-right font-medium text-slate-800">
                                            {weatherCondition(
                                                segment.weather,
                                            )}
                                        </span>

                                        <span>Sun glare</span>
                                        <span className="text-right font-medium text-slate-800">
                                            {segment.sunlight
                                                ?.glare_risk != null
                                                ? Math.round(
                                                    segment
                                                        .sunlight
                                                        .glare_risk,
                                                )
                                                : "N/A"}
                                        </span>
                                    </div>

                                    {hasBreak && (
                                        <div className="mt-2 border-t border-slate-100 pt-2 text-slate-600">
                                            A planned break is associated with this route section.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {breaks.length > 0 && (
                <div className="mt-5 flex items-start gap-2 text-xs text-slate-500">
                    <span className="mt-1 h-2 w-2 bg-slate-700" />

                    <span>
                        {breaks.length === 1
                            ? "1 planned break"
                            : `${breaks.length} planned breaks`}
                        {breaks[0]?.duration_minutes
                            ? ` · ${breaks[0].duration_minutes} min`
                            : ""}
                        {breaks[0]?.start_time
                            ? ` · ${formatTime(
                                breaks[0].start_time,
                            )}`
                            : ""}
                    </span>
                </div>
            )}
        </div>
    )
}

function StepRow({
    instruction,
    originalIndex,
    isLast,
    isFirstInDisplayedSegment,
}: {
    instruction: Instruction
    originalIndex: number
    isLast: boolean
    isFirstInDisplayedSegment: boolean
}) {
    const context = getInstructionContext(instruction)

    return (
        <div className="grid grid-cols-[28px_minmax(0,1fr)_auto] gap-x-4">
            <div className="relative flex justify-center">
                {!isLast && (
                    <div className="absolute bottom-0 top-7 w-px bg-slate-200" />
                )}

                <div
                    className={`relative z-10 flex h-7 w-7 items-center justify-center border bg-white text-sm font-medium ${originalIndex === 0 ||
                            instruction.maneuver === "ARRIVE"
                            ? "border-slate-900 text-slate-900"
                            : "border-slate-300 text-slate-500"
                        }`}
                    aria-hidden="true"
                >
                    {maneuverSymbol(instruction.maneuver)}
                </div>
            </div>

            <div className="min-w-0 pb-8">
                {isFirstInDisplayedSegment &&
                    instruction.segment_id != null && (
                        <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                            Route section {instruction.segment_id}
                        </div>
                    )}

                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        {maneuverLabel(instruction.maneuver)}
                    </span>

                    {instruction.risk_score != null &&
                        instruction.risk_score >= 40 && (
                            <span
                                className={`border px-1.5 py-0.5 text-[10px] font-semibold ${riskTone(
                                    instruction.risk_level,
                                )}`}
                            >
                                {instruction.risk_score >= 70
                                    ? "High risk"
                                    : "Moderate risk"}
                            </span>
                        )}
                </div>

                <div className="mt-1 text-[15px] leading-6 text-slate-800">
                    {instruction.clean_message}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums text-slate-500">
                    <span>
                        {formatDistance(
                            instruction.distance_from_previous_m,
                        )}
                    </span>

                    <span className="text-slate-300">·</span>

                    <span>
                        {formatSeconds(
                            instruction.duration_from_previous_seconds,
                        )}
                    </span>

                    {instruction.route_offset_m != null && (
                        <>
                            <span className="text-slate-300">·</span>
                            <span>
                                {formatDistance(
                                    instruction.route_offset_m,
                                )}{" "}
                                into trip
                            </span>
                        </>
                    )}
                </div>
            </div>

            <div className="flex items-start gap-1.5 pb-8">
                {context.hasWeather && (
                    <ContextIndicator
                        kind="weather"
                        instruction={instruction}
                    />
                )}

                {context.hasIncident && (
                    <ContextIndicator
                        kind="incident"
                        instruction={instruction}
                    />
                )}

                {context.hasSun && (
                    <ContextIndicator
                        kind="sun"
                        instruction={instruction}
                    />
                )}

                {context.hasRisk && (
                    <ContextIndicator
                        kind="risk"
                        instruction={instruction}
                    />
                )}
            </div>
        </div>
    )
}

function StepGap({ count }: { count: number }) {
    return (
        <div className="mb-5 grid grid-cols-[28px_minmax(0,1fr)_auto] gap-x-4">
            <div className="flex justify-center">
                <div className="flex h-7 w-7 items-center justify-center text-sm text-slate-400">
                    ···
                </div>
            </div>

            <div className="border-y border-dashed border-slate-200 py-2.5 text-xs text-slate-500">
                {count} minor{" "}
                {count === 1
                    ? "instruction"
                    : "instructions"}{" "}
                hidden in the compact itinerary.
            </div>
        </div>
    )
}

function BreakPlanCard({
    restPlan,
}: {
    restPlan?: RestPlan
}) {
    const firstBreak = restPlan?.breaks?.[0]
    const breakCount = restPlan?.break_count ?? 0

    const breakDuration =
        firstBreak?.duration_minutes ??
        restPlan?.total_break_minutes

    const continuousMinutes =
        firstBreak?.after_continuous_work_minutes

    const ruleBasis = restPlan?.rule_basis

    return (
        <div className="border border-slate-800 bg-slate-950 p-6 text-white">
            <div className="flex items-start justify-between gap-5">
                <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                        Break plan
                    </div>

                    <div className="mt-2 text-2xl font-semibold tracking-tight">
                        {breakCount > 0
                            ? `${breakCount} planned ${breakCount === 1
                                ? "break"
                                : "breaks"
                            }`
                            : "No planned break"}
                    </div>
                </div>

                <div className="border border-slate-700 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                    Route plan
                </div>
            </div>

            {breakCount > 0 ? (
                <div className="mt-5 space-y-2 text-sm leading-6 text-slate-300">
                    <div>
                        {breakDuration != null
                            ? `${breakDuration} min`
                            : "Planned rest"}
                        {continuousMinutes != null
                            ? ` after about ${Math.round(
                                continuousMinutes / 60,
                            )} hours of continuous work`
                            : ""}
                    </div>

                    {(firstBreak?.start_time ||
                        firstBreak?.end_time) && (
                            <div className="text-slate-500">
                                {firstBreak?.start_time
                                    ? formatTime(
                                        firstBreak.start_time,
                                    )
                                    : "N/A"}
                                {firstBreak?.end_time
                                    ? ` – ${formatTime(
                                        firstBreak.end_time,
                                    )}`
                                    : ""}
                            </div>
                        )}
                </div>
            ) : (
                <div className="mt-5 text-sm leading-6 text-slate-300">
                    The returned route plan does not include a scheduled break.
                </div>
            )}

            <div className="mt-6 border-t border-slate-800 pt-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Expected arrival
                </div>

                <div className="mt-1 text-xl font-semibold">
                    {formatTime(restPlan?.planned_arrival_time)}
                </div>
            </div>

            {ruleBasis && (
                <div className="mt-4 border-t border-slate-800 pt-4 text-xs leading-5 text-slate-500">
                    Planning basis: {ruleBasis}
                </div>
            )}
        </div>
    )
}

function LocationInput({
    label,
    value,
    selected,
    onChange,
    onSelect,
}: {
    label: string
    value: string
    selected: Location | null
    onChange: (value: string) => void
    onSelect: (location: Location) => void
}) {
    const [results, setResults] = useState<Location[]>([])
    const [loading, setLoading] = useState(false)

    async function searchLocations(query: string) {
        onChange(query)

        if (query.trim().length < 2) {
            setResults([])
            return
        }

        setLoading(true)

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/locations/search?query=${encodeURIComponent(
                    query,
                )}`,
            )

            if (!response.ok) {
                throw new Error("Location search failed")
            }

            const data = await response.json()

            setResults(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error(error)
            setResults([])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="relative">
            <label className="mb-2 block text-sm font-medium text-slate-700">
                {label}
            </label>

            <input
                value={value}
                onChange={(event) =>
                    searchLocations(event.target.value)
                }
                placeholder={
                    label === "From"
                        ? "City, terminal or starting point"
                        : "City, terminal or destination"
                }
                className="w-full border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-900"
            />

            {selected && (
                <div className="mt-1 text-xs text-slate-500">
                    Selected: {selected.name}
                </div>
            )}

            {loading && (
                <div className="absolute left-0 right-0 top-full z-30 border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-lg">
                    Searching...
                </div>
            )}

            {!loading && results.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-30 max-h-56 overflow-y-auto border border-slate-200 bg-white shadow-lg">
                    {results.map((location, index) => (
                        <button
                            key={`${location.lat}-${location.lng}-${index}`}
                            type="button"
                            onClick={() => {
                                onSelect(location)
                                setResults([])
                            }}
                            className="block w-full border-b border-slate-100 px-4 py-3 text-left text-sm text-slate-700 last:border-0 hover:bg-slate-50"
                        >
                            {location.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

function App() {
    const [fromText, setFromText] = useState("")
    const [destinationText, setDestinationText] = useState("")

    const [fromLocation, setFromLocation] =
        useState<Location | null>(null)

    const [destinationLocation, setDestinationLocation] =
        useState<Location | null>(null)

    const [departureTime, setDepartureTime] = useState(
        getDefaultDepartureTime,
    )

    const [trip, setTrip] =
        useState<TripResponse | null>(null)

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [showAllSteps, setShowAllSteps] = useState(false)

    async function planRoute() {
        if (!fromLocation || !destinationLocation) {
            setError(
                "Select both the starting point and destination.",
            )
            return
        }

        setLoading(true)
        setError("")

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/route`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        from_location: fromLocation.name,
                        destination: destinationLocation.name,
                        departure_time: departureTime,
                        from_lat: fromLocation.lat,
                        from_lng: fromLocation.lng,
                        destination_lat:
                            destinationLocation.lat,
                        destination_lng:
                            destinationLocation.lng,
                    }),
                },
            )

            const data = await response.json()

            if (!response.ok || data.error) {
                throw new Error(
                    data.error ||
                    "Could not calculate route.",
                )
            }

            // Keep the user at the top. The map camera transition is
            // handled by RouteMap when the route data arrives.
            setTrip(data)
            setShowAllSteps(false)
        } catch (error) {
            console.error(error)

            setError(
                error instanceof Error
                    ? error.message
                    : "Something went wrong while planning the route.",
            )
        } finally {
            setLoading(false)
        }
    }

    const route = trip?.route
    const overallRisk = route?.overall_risk
    const restPlan = route?.rest_plan
    const instructions = route?.instructions ?? []
    const segments = route?.segments ?? []

    const incidentCount = useMemo(() => {
        const bySegment = new Map<number, number>()

        for (const instruction of instructions) {
            const segmentId = instruction.segment_id

            if (segmentId == null) continue

            const count =
                instruction.accident?.accident_count ?? 0

            const existing = bySegment.get(segmentId) ?? 0

            if (count > existing) {
                bySegment.set(segmentId, count)
            }
        }

        return Array.from(bySegment.values()).reduce(
            (total, count) => total + count,
            0,
        )
    }, [instructions])

    const compactItems = useMemo(
        () => getVisibleInstructions(instructions, false),
        [instructions],
    )

    const visibleItems = useMemo(
        () =>
            showAllSteps
                ? getVisibleInstructions(
                    instructions,
                    true,
                )
                : compactItems,
        [compactItems, instructions, showAllSteps],
    )

    const hiddenCount = Math.max(
        0,
        instructions.length - compactItems.length,
    )

    return (
        <main className="min-h-screen bg-[#f2f0ea] text-slate-950 selection:bg-amber-200">
            {/* ========================================================= */}
            {/* HEADER                                                    */}
            {/* ========================================================= */}

            <header className="sticky top-0 z-[60] border-b-2 border-slate-900 bg-[#f8f7f3] shadow-[0_2px_0_rgba(15,23,42,0.12)]">
                <div className="mx-auto flex h-[66px] max-w-[1440px] items-center justify-between px-5 sm:px-8">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-slate-900 bg-amber-400 shadow-[3px_3px_0_#0f172a]">
                            <svg
                                viewBox="0 0 32 32"
                                className="h-6 w-6"
                                fill="none"
                                aria-hidden="true"
                            >
                                <path
                                    d="M4 9h15v11H4zM19 13h5l4 4v3h-9z"
                                    fill="currentColor"
                                />
                                <circle
                                    cx="10"
                                    cy="23"
                                    r="3"
                                    fill="currentColor"
                                />
                                <circle
                                    cx="24"
                                    cy="23"
                                    r="3"
                                    fill="currentColor"
                                />
                            </svg>
                        </div>

                        <div>
                            <div className="text-lg font-black tracking-tight">
                                TruckView
                            </div>

                            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                Route & road intelligence
                            </div>
                        </div>
                    </div>

                    <div className="hidden items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 sm:flex">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        </span>
                        Live route planning
                    </div>
                </div>
            </header>

            {!trip ? (
                <section className="relative overflow-visible lg:h-[calc(100dvh-66px)] lg:overflow-hidden">
                    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-2 border-b border-slate-900 bg-[repeating-linear-gradient(135deg,#f59e0b_0,#f59e0b_12px,#111827_12px,#111827_24px)] opacity-90" />

                    <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-5 px-5 py-6 sm:px-8 lg:h-full lg:grid-cols-[0.76fr_1.24fr] lg:gap-6 lg:py-5">
                        {/* ------------------------------------------------- */}
                        {/* LEFT — PLANNER                                    */}
                        {/* ------------------------------------------------- */}

                        <div className="flex min-h-0 items-center">
                            <div className="w-full">
                                <div className="mb-3 inline-flex items-center gap-2 border-2 border-slate-900 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] shadow-[3px_3px_0_#0f172a]">
                                    <span className="h-2 w-2 bg-amber-400" />
                                    Plan before you roll
                                </div>

                                <h1 className="max-w-xl text-[2.65rem] font-black leading-[0.94] tracking-[-0.045em] sm:text-5xl xl:text-[3.4rem]">
                                    Know the road before you drive it.
                                </h1>

                                <p className="mt-3 max-w-xl text-sm leading-[1.375rem] text-slate-600 xl:text-[15px]">
                                    Plan a road journey and understand the route through weather, sunlight, historical accident data, road risk and planned rest points.
                                </p>

                                <div className="mt-4 border-2 border-slate-900 bg-[#fffdf8] p-4 shadow-[6px_6px_0_#0f172a] xl:p-[18px]">
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-xs font-black uppercase tracking-[0.14em]">
                                                Trip planner
                                            </div>

                                            <div className="mt-1 text-xs text-slate-500">
                                                Choose your route and departure.
                                            </div>
                                        </div>

                                        <div className="hidden border border-slate-300 bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:block">
                                            Live route data
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <LocationInput
                                            label="From"
                                            value={fromText}
                                            selected={fromLocation}
                                            onChange={setFromText}
                                            onSelect={(location) => {
                                                setFromLocation(location)
                                                setFromText(location.name)
                                            }}
                                        />

                                        <div className="relative flex justify-center">
                                            <div className="absolute left-4 top-1/2 h-px w-[calc(100%-32px)] -translate-y-1/2 bg-slate-200" />

                                            <div className="relative z-10 flex h-7 w-7 items-center justify-center border-2 border-slate-900 bg-amber-400 shadow-[2px_2px_0_#0f172a]">
                                                <span className="text-xs font-black">
                                                    ↓
                                                </span>
                                            </div>
                                        </div>

                                        <LocationInput
                                            label="Destination"
                                            value={destinationText}
                                            selected={destinationLocation}
                                            onChange={setDestinationText}
                                            onSelect={(location) => {
                                                setDestinationLocation(location)
                                                setDestinationText(location.name)
                                            }}
                                        />

                                        <div>
                                            <label className="mb-1.5 block text-sm font-bold text-slate-700">
                                                Departure
                                            </label>

                                            <input
                                                type="datetime-local"
                                                value={departureTime}
                                                onChange={(event) =>
                                                    setDepartureTime(
                                                        event.target.value,
                                                    )
                                                }
                                                className="w-full border-2 border-slate-300 bg-white px-4 py-2.5 text-sm font-medium outline-none transition focus:border-slate-900 focus:shadow-[3px_3px_0_#f59e0b]"
                                            />
                                        </div>

                                        {error && (
                                            <div className="border-2 border-red-700 bg-red-50 px-4 py-2.5 text-sm font-semibold leading-5 text-red-800">
                                                {error}
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            onClick={planRoute}
                                            disabled={loading}
                                            className="group flex w-full items-center justify-between border-2 border-slate-900 bg-slate-950 px-5 py-3.5 text-left text-sm font-black text-white shadow-[5px_5px_0_#f59e0b] transition duration-200 hover:-translate-y-0.5 hover:shadow-[7px_7px_0_#f59e0b] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[2px_2px_0_#f59e0b] disabled:cursor-wait disabled:opacity-60"
                                        >
                                            <span>
                                                {loading
                                                    ? "Analyzing route..."
                                                    : "Analyze this journey"}
                                            </span>

                                            <span className="text-xl transition-transform group-hover:translate-x-1">
                                                →
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ------------------------------------------------- */}
                        {/* RIGHT — ALWAYS LIVE MAP                           */}
                        {/* ------------------------------------------------- */}

                        <div className="relative min-h-[460px] lg:min-h-0">
                            <div className="absolute inset-3 rotate-[-1.2deg] border-2 border-slate-900 bg-[#e8e4d8] shadow-[8px_8px_0_#0f172a]" />

                            <div className="relative h-[460px] overflow-hidden border-2 border-slate-900 bg-white p-3 shadow-[8px_8px_0_#0f172a] lg:h-full">
                                <div className="relative h-full min-h-0 overflow-hidden border-2 border-slate-900">
                                    <RouteMap
                                        fromLocation={fromLocation}
                                        destinationLocation={
                                            destinationLocation
                                        }
                                        route={null}
                                    />
                                </div>

                                <div className="pointer-events-none absolute left-6 top-6 z-10 flex items-center gap-2 border-2 border-slate-900 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] shadow-[3px_3px_0_#0f172a]">
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                    </span>

                                    Live route map
                                </div>

                                <div className="pointer-events-none absolute bottom-5 right-5 z-10 hidden max-w-xs border-2 border-slate-900 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] shadow-[3px_3px_0_#0f172a] md:block">
                                    Drag · zoom · explore
                                </div>

                                {!fromLocation &&
                                    !destinationLocation && (
                                        <div className="pointer-events-none absolute bottom-5 left-5 z-10 max-w-xs border-2 border-slate-900 bg-white px-4 py-3 text-xs font-bold leading-5 shadow-[3px_3px_0_#0f172a]">
                                            Select your starting point and
                                            destination to prepare the route
                                            view.
                                        </div>
                                    )}
                            </div>
                        </div>
                    </div>
                </section>
            ) : (
                <>
                    {/* ===================================================== */}
                    {/* ANALYSIS HEADER                                       */}
                    {/* ===================================================== */}

                    <section className="border-b-2 border-slate-900 bg-[#f8f7f3]">
                        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-5 px-5 py-5 sm:px-8">
                            <div className="min-w-0">
                                <div className="mb-2 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                    </span>

                                    Journey analysis
                                </div>

                                <h1 className="truncate text-2xl font-black tracking-[-0.03em] sm:text-3xl">
                                    {trip.origin.name.split(",")[0]}

                                    <span className="mx-2 text-slate-400">
                                        →
                                    </span>

                                    {trip.destination.name.split(",")[0]}
                                </h1>

                                <p className="mt-1 hidden text-sm text-slate-500 sm:block">
                                    Route, road conditions and journey context for this trip.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setTrip(null)
                                    setError("")
                                }}
                                className="group flex shrink-0 items-center gap-3 border-2 border-slate-900 bg-amber-400 px-4 py-3 text-xs font-black uppercase tracking-[0.08em] shadow-[4px_4px_0_#0f172a] transition duration-200 hover:-translate-y-0.5 hover:bg-amber-300 hover:shadow-[5px_5px_0_#0f172a] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#0f172a]"
                            >
                                <span className="text-base transition-transform group-hover:-translate-x-1">
                                    ←
                                </span>

                                <span className="hidden sm:inline">
                                    Plan another trip
                                </span>

                                <span className="sm:hidden">
                                    New trip
                                </span>
                            </button>
                        </div>
                    </section>

                    {/* ===================================================== */}
                    {/* TOP ANALYSIS — TEXT LEFT / MAP RIGHT                 */}
                    {/* ===================================================== */}

                    <section className="mx-auto max-w-[1440px] px-5 py-6 sm:px-8">
                        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:items-stretch">
                            {/* LEFT — ANALYSIS */}
                            <div className="space-y-4">
                                <div className="border-2 border-slate-900 bg-white p-5 shadow-[4px_4px_0_#0f172a]">
                                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                                        Journey snapshot
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-3">
                                       <RiskMetric
                                            label="Distance"
                                            value={`${Math.round(
                                                route?.distance_km ?? 0,
                                            )} km`}
                                        />

                                        <RiskMetric
                                            label="Journey time"
                                            value={formatDuration(
                                                route?.duration_minutes ?? 0,
                                            )}
                                        />

                                        <RiskMetric
                                            label="Traffic delay"
                                            value={formatDuration(
                                                route?.traffic_delay_minutes ?? 0,
                                            )}
                                        />

                                        <RiskMetric
                                            label="Historical"
                                            value={`${incidentCount} accidents`}
                                        />
                                    </div>
                                </div>

                                <div
                                    className={`border-2 border-slate-900 p-5 shadow-[4px_4px_0_#0f172a] ${overallRisk?.risk_score == null
                                            ? "bg-slate-200"
                                            : overallRisk.risk_score >= 70
                                                ? "bg-red-400"
                                                : overallRisk.risk_score >= 40
                                                    ? "bg-amber-400"
                                                    : "bg-emerald-400"
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-[0.16em]">
                                                Overall route risk
                                            </div>

                                            <div className="mt-2 text-4xl font-black tabular-nums">
                                                {overallRisk?.risk_score !=
                                                    null
                                                    ? Math.round(
                                                        overallRisk.risk_score,
                                                    )
                                                    : "N/A"}
                                            </div>
                                        </div>

                                        <div
                                            className={`border-2 border-slate-900 bg-white px-3 py-2 text-xs font-black ${scoreTone(
                                                overallRisk?.risk_score,
                                                overallRisk?.risk_level,
                                            )}`}
                                        >
                                            {overallRisk?.risk_level ||
                                                "Unavailable"}
                                        </div>
                                    </div>

                                    <div className="mt-4 h-3 border-2 border-slate-900 bg-white">
                                        <div
                                            className={`h-full ${overallRisk?.risk_score ==
                                                    null
                                                    ? "bg-slate-400"
                                                    : overallRisk.risk_score >=
                                                        70
                                                        ? "bg-red-600"
                                                        : overallRisk.risk_score >=
                                                            40
                                                            ? "bg-amber-500"
                                                            : "bg-emerald-600"
                                                }`}
                                            style={{
                                                width: `${Math.max(
                                                    0,
                                                    Math.min(
                                                        100,
                                                        overallRisk?.risk_score ??
                                                        0,
                                                    ),
                                                )}%`,
                                            }}
                                        />
                                    </div>

                                    <p className="mt-3 text-xs font-semibold leading-5 text-slate-800">
                                        Score is based on the conditions along this route.
                                    </p>
                                </div>

                                <div className="border-2 border-slate-900 bg-white p-5 shadow-[4px_4px_0_#0f172a]">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                                                Journey factors
                                            </div>

                                            <div className="mt-1 text-sm font-bold">
                                                What shapes the score?
                                            </div>
                                        </div>

                                        <div className="text-lg">⚙</div>
                                    </div>

                                    <div className="mt-3">
                                        <JourneyFactor
                                            label="Accident history"
                                            value={
                                                overallRisk?.factors
                                                    ?.accident
                                            }
                                        />

                                        <JourneyFactor
                                            label="Weather"
                                            value={
                                                overallRisk?.factors?.weather
                                            }
                                        />

                                        <JourneyFactor
                                            label="Sun glare"
                                            value={
                                                overallRisk?.factors?.sun_glare
                                            }
                                        />

                                        <JourneyFactor
                                            label="Night driving"
                                            value={
                                                overallRisk?.factors?.night
                                            }
                                        />

                                        <JourneyFactor
                                            label="Road conditions"
                                            value={
                                                overallRisk?.factors?.road
                                            }
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT — MAP */}
                            <div className="relative min-h-[540px] lg:min-h-[620px]">
                                <div className="absolute inset-3 rotate-[1deg] border-2 border-slate-900 bg-[#e8e4d8] shadow-[8px_8px_0_#0f172a]" />

                                <div className="relative h-full min-h-[540px] overflow-hidden border-2 border-slate-900 bg-white p-3 shadow-[8px_8px_0_#0f172a] transition-all duration-700 ease-out lg:min-h-[620px]">
                                    <div className="relative h-full min-h-0 overflow-hidden border-2 border-slate-900">
                                        <RouteMap
                                            fromLocation={trip.origin}
                                            destinationLocation={
                                                trip.destination
                                            }
                                            route={route ?? null}
                                        />
                                    </div>

                                    <div className="pointer-events-none absolute left-6 top-6 z-10 flex items-center gap-2 border-2 border-slate-900 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] shadow-[3px_3px_0_#0f172a]">
                                        <span className="relative flex h-2.5 w-2.5">
                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                        </span>

                                        Route map
                                    </div>

                                    <div className="pointer-events-none absolute bottom-5 right-5 z-10 border-2 border-slate-900 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] shadow-[3px_3px_0_#0f172a]">
                                        Route analyzed
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* ===================================================== */}
                    {/* RISK ALONG THE ROUTE                                */}
                    {/* ===================================================== */}

                    <section
                        id="journey"
                        className="border-y-2 border-slate-900 bg-[#e9e5da]"
                    >
                        <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8">
                            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                                        Risk along the road
                                    </div>

                                    <h2 className="mt-1 text-2xl font-black tracking-tight">
                                        Where conditions change
                                    </h2>
                                </div>

                                <div className="flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                                    <span className="flex items-center gap-1.5">
                                        <i className="h-2.5 w-2.5 bg-emerald-500" />
                                        Low
                                    </span>

                                    <span className="flex items-center gap-1.5">
                                        <i className="h-2.5 w-2.5 bg-amber-500" />
                                        Moderate
                                    </span>

                                    <span className="flex items-center gap-1.5">
                                        <i className="h-2.5 w-2.5 bg-red-500" />
                                        High
                                    </span>
                                </div>
                            </div>

                            <div className="border-2 border-slate-900 bg-white shadow-[5px_5px_0_#0f172a]">
                                <RouteRiskStrip
                                    segments={segments}
                                    breaks={restPlan?.breaks ?? []}
                                />
                            </div>
                        </div>
                    </section>

                    {/* ===================================================== */}
                    {/* ITINERARY                                             */}
                    {/* ===================================================== */}

                    <section className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8">
                        <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
                            <div className="border-2 border-slate-900 bg-white shadow-[6px_6px_0_#0f172a]">
                                <div className="border-b-2 border-slate-900 p-5 sm:p-6">
                                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                                                Route itinerary
                                            </div>

                                            <h2 className="mt-1 text-2xl font-black tracking-tight">
                                                Navigation + road context
                                            </h2>

                                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                                                Navigation stays primary. Context controls expose the actual weather, historical accident, sunlight and combined-risk values for each returned step.
                                            </p>
                                        </div>

                                        {hiddenCount > 0 && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowAllSteps(
                                                        (value) => !value,
                                                    )
                                                }
                                                className="shrink-0 border-2 border-slate-900 bg-white px-4 py-3 text-sm font-black shadow-[3px_3px_0_#0f172a] transition hover:bg-slate-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_#0f172a]"
                                            >
                                                {showAllSteps
                                                    ? "Show compact itinerary"
                                                    : `Show all ${instructions.length} steps`}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="p-5 sm:p-7">
                                    {instructions.length > 0 ? (
                                        <>
                                            <div className="mb-6 grid grid-cols-2 gap-3 border-b-2 border-slate-100 pb-5 sm:grid-cols-4">
                                                <div>
                                                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                        Steps
                                                    </div>
                                                    <div className="mt-1 text-lg font-black">
                                                        {instructions.length}
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                        Sections
                                                    </div>
                                                    <div className="mt-1 text-lg font-black">
                                                        {segments.length}
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                        Breaks
                                                    </div>
                                                    <div className="mt-1 text-lg font-black">
                                                        {restPlan?.break_count ?? 0}
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                        Arrival
                                                    </div>
                                                    <div className="mt-1 text-lg font-black">
                                                        {formatTime(
                                                            restPlan?.planned_arrival_time,
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="max-w-5xl">
                                                {visibleItems.map(
                                                    (
                                                        {
                                                            instruction,
                                                            originalIndex,
                                                        },
                                                        visibleIndex,
                                                    ) => {
                                                        const previous =
                                                            visibleItems[
                                                            visibleIndex -
                                                            1
                                                            ]

                                                        const gapCount =
                                                            previous == null
                                                                ? 0
                                                                : originalIndex -
                                                                previous.originalIndex -
                                                                1

                                                        const isFirstInDisplayedSegment =
                                                            visibleIndex ===
                                                            0 ||
                                                            previous?.instruction
                                                                .segment_id !==
                                                            instruction.segment_id

                                                        return (
                                                            <div
                                                                key={
                                                                    instruction.instruction_id
                                                                }
                                                            >
                                                                {gapCount >
                                                                    0 && (
                                                                        <StepGap
                                                                            count={
                                                                                gapCount
                                                                            }
                                                                        />
                                                                    )}

                                                                <StepRow
                                                                    instruction={
                                                                        instruction
                                                                    }
                                                                    originalIndex={
                                                                        originalIndex
                                                                    }
                                                                    isLast={
                                                                        visibleIndex ===
                                                                        visibleItems.length -
                                                                        1
                                                                    }
                                                                    isFirstInDisplayedSegment={
                                                                        isFirstInDisplayedSegment
                                                                    }
                                                                />
                                                            </div>
                                                        )
                                                    },
                                                )}
                                            </div>

                                            <div className="mt-3 border-t-2 border-dashed border-slate-200 pt-5 text-xs leading-5 text-slate-500">
                                                Historical accident indicators describe recorded road history, not live incidents.
                                            </div>
                                        </>
                                    ) : (
                                        <div className="py-16 text-center text-sm text-slate-500">
                                            Route instructions are not available.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <BreakPlanCard restPlan={restPlan} />

                                <div className="border-2 border-slate-900 bg-white p-5 shadow-[4px_4px_0_#0f172a]">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center border-2 border-slate-900 bg-amber-400 text-sm font-black">
                                            ✓
                                        </div>

                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                                                Arrival planning
                                            </div>

                                            <div className="mt-0.5 text-base font-black">
                                                Expected arrival
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-5 border-t-2 border-slate-100 pt-4">
                                        <div className="text-3xl font-black tabular-nums">
                                            {formatTime(
                                                restPlan?.planned_arrival_time,
                                            )}
                                        </div>

                                        <div className="mt-2 text-xs leading-5 text-slate-500">
                                            Calculated from the returned route and rest plan.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <footer className="border-t-2 border-slate-900 bg-slate-950 text-white">
                        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-5 py-7 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                            <span className="font-black uppercase tracking-[0.16em] text-white">
                                TruckView
                            </span>

                            <span>
                                Route and journey information is calculated from the selected trip and returned route data.
                            </span>
                        </div>
                    </footer>
                </>
            )}
        </main>
    )
}

export default App
