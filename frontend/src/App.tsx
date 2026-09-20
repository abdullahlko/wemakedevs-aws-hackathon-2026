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

    const warning = (score ?? 0) >= 40

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

    const tone = warning
        ? "border-amber-300 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:text-slate-700"

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
                                className={`group h-2.5 w-full ${segmentClass} transition ${
                                    active
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
                    className={`relative z-10 flex h-7 w-7 items-center justify-center border bg-white text-sm font-medium ${
                        originalIndex === 0 ||
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
                                Elevated risk
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
                            ? `${breakCount} planned ${
                                  breakCount === 1
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
                        ? "e.g. Lucknow"
                        : "e.g. Delhi"
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

            setTrip(data)
            setShowAllSteps(false)

            setTimeout(() => {
                document
                    .getElementById("journey")
                    ?.scrollIntoView({
                        behavior: "smooth",
                    })
            }, 100)
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
        <main className="min-h-screen bg-[#f7f7f5] text-slate-900">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
                    <div>
                        <div className="text-xl font-bold tracking-tight">
                            TruckView
                        </div>

                        <div className="text-xs text-slate-500">
                            Risk-aware planning for long-haul truck journeys
                        </div>
                    </div>

                    <div className="hidden text-sm text-slate-500 sm:block">
                        Route planning
                    </div>
                </div>
            </header>

            <section className="min-h-[calc(100vh-73px)]">
                <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl grid-cols-1 gap-8 px-6 py-8 lg:grid-cols-[380px_1fr]">
                    <div className="flex flex-col justify-center">
                        <div className="mb-8">
                            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Plan a trip
                            </p>

                            <h1 className="max-w-md text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                                Know the road before you drive it.
                            </h1>

                            <p className="mt-4 max-w-md text-base leading-7 text-slate-600">
                                Enter a journey and TruckView combines route data, weather, sunlight, accident history and rest planning into one trip view.
                            </p>
                        </div>

                        <div className="border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="space-y-5">
                                <LocationInput
                                    label="From"
                                    value={fromText}
                                    selected={fromLocation}
                                    onChange={setFromText}
                                    onSelect={(location) => {
                                        setFromLocation(
                                            location,
                                        )
                                        setFromText(
                                            location.name,
                                        )
                                    }}
                                />

                                <LocationInput
                                    label="To"
                                    value={destinationText}
                                    selected={
                                        destinationLocation
                                    }
                                    onChange={
                                        setDestinationText
                                    }
                                    onSelect={(location) => {
                                        setDestinationLocation(
                                            location,
                                        )
                                        setDestinationText(
                                            location.name,
                                        )
                                    }}
                                />

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-slate-700">
                                        Departure
                                    </label>

                                    <input
                                        type="datetime-local"
                                        value={departureTime}
                                        onChange={(event) =>
                                            setDepartureTime(
                                                event.target
                                                    .value,
                                            )
                                        }
                                        className="w-full border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-900"
                                    />
                                </div>

                                {error && (
                                    <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={planRoute}
                                    disabled={loading}
                                    className="w-full bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                                >
                                    {loading
                                        ? "Planning route..."
                                        : "Plan route"}
                                </button>
                            </div>
                        </div>

                        <div className="mt-5 text-xs leading-5 text-slate-500">
                            Route and traffic data from TomTom. Weather from Open-Meteo.
                        </div>
                    </div>

                    <div className="flex items-center">
                        <div className="h-[560px] w-full overflow-hidden border border-slate-200 bg-slate-200 shadow-sm">
                            <RouteMap
                                fromLocation={fromLocation}
                                destinationLocation={
                                    destinationLocation
                                }
                                route={route || null}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {trip && route && (
                <>
                    <section
                        id="journey"
                        className="border-t border-slate-200 bg-white"
                    >
                        <div className="mx-auto max-w-7xl px-6 py-20">
                            <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
                                <div>
                                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                                        Your journey
                                    </p>

                                    <h2 className="mt-3 text-3xl font-bold tracking-tight">
                                        {
                                            trip.origin.name.split(
                                                ",",
                                            )[0]
                                        }{" "}
                                        <span className="text-slate-400">
                                            to
                                        </span>{" "}
                                        {
                                            trip.destination.name.split(
                                                ",",
                                            )[0]
                                        }
                                    </h2>

                                    <p className="mt-2 text-sm text-slate-500">
                                        Departing{" "}
                                        {formatTime(
                                            restPlan?.departure_time ||
                                                departureTime,
                                        )}
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div
                                        className={`border px-3 py-2 text-sm font-semibold ${riskTone(
                                            overallRisk?.risk_level,
                                        )}`}
                                    >
                                        Risk{" "}
                                        {overallRisk?.risk_score !=
                                        null
                                            ? Math.round(
                                                  overallRisk.risk_score,
                                              )
                                            : "N/A"}
                                    </div>

                                    <div className="text-sm text-slate-500">
                                        {overallRisk?.risk_level ||
                                            "Risk unavailable"}
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-4">
                                <RiskMetric
                                    label="Distance"
                                    value={`${Math.round(
                                        route.distance_km,
                                    )} km`}
                                />

                                <RiskMetric
                                    label="Driving time"
                                    value={formatDuration(
                                        route.duration_minutes,
                                    )}
                                />

                                <RiskMetric
                                    label="Traffic delay"
                                    value={formatDuration(
                                        route.traffic_delay_minutes,
                                    )}
                                />

                                <RiskMetric
                                    label="Historical accidents"
                                    value={`${incidentCount}`}
                                    score={
                                        overallRisk?.factors
                                            ?.accident
                                    }
                                />
                            </div>

                            <div className="mt-10 grid gap-8 lg:grid-cols-[1.35fr_0.85fr]">
                                <div className="border border-slate-200 p-6">
                                    <div>
                                        <h3 className="text-lg font-semibold">
                                            What shapes the route risk?
                                        </h3>

                                        <p className="mt-1 text-sm text-slate-500">
                                            These are the route-level factors returned by the risk model.
                                        </p>
                                    </div>

                                    <div className="mt-5">
                                        <JourneyFactor
                                            label="Accident history"
                                            value={
                                                overallRisk
                                                    ?.factors
                                                    ?.accident
                                            }
                                        />

                                        <JourneyFactor
                                            label="Weather"
                                            value={
                                                overallRisk
                                                    ?.factors
                                                    ?.weather
                                            }
                                        />

                                        <JourneyFactor
                                            label="Sun glare"
                                            value={
                                                overallRisk
                                                    ?.factors
                                                    ?.sun_glare
                                            }
                                        />

                                        <JourneyFactor
                                            label="Night driving"
                                            value={
                                                overallRisk
                                                    ?.factors
                                                    ?.night
                                            }
                                        />

                                        <JourneyFactor
                                            label="Road conditions"
                                            value={
                                                overallRisk
                                                    ?.factors?.road
                                            }
                                        />
                                    </div>
                                </div>

                                <BreakPlanCard restPlan={restPlan} />
                            </div>
                        </div>
                    </section>

                    <section className="border-t border-slate-200 bg-[#f7f7f5]">
                        <div className="mx-auto max-w-7xl px-6 py-20">
                            <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
                                <div>
                                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                                        Route itinerary
                                    </p>

                                    <h2 className="mt-2 text-3xl font-bold tracking-tight">
                                        {
                                            trip.origin.name.split(
                                                ",",
                                            )[0]
                                        }{" "}
                                        →
                                        {
                                            trip.destination.name.split(
                                                ",",
                                            )[0]
                                        }
                                    </h2>

                                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                                        Navigation instructions stay primary. The indicators beside each step expose the actual weather, historical accident, sunlight and combined-risk data behind the route.
                                    </p>
                                </div>

                                <div className="text-sm text-slate-500">
                                    {instructions.length} total instructions
                                </div>
                            </div>

                            <div className="overflow-visible border border-slate-200 bg-white">
                                <div className="border-b border-slate-200 px-6 py-5">
                                    <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                                        <div>
                                            <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
                                                Leg 1
                                            </div>

                                            <div className="mt-1 text-lg font-semibold text-slate-900">
                                                {
                                                    trip.origin.name.split(
                                                        ",",
                                                    )[0]
                                                }{" "}
                                                <span className="font-normal text-slate-400">
                                                    →
                                                </span>{" "}
                                                {
                                                    trip.destination.name.split(
                                                        ",",
                                                    )[0]
                                                }
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-x-7 gap-y-3 sm:grid-cols-4">
                                            <div>
                                                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                                    Distance
                                                </div>

                                                <div className="mt-1 text-sm font-semibold tabular-nums">
                                                    {Math.round(
                                                        route.distance_km,
                                                    )}{" "}
                                                    km
                                                </div>
                                            </div>

                                            <div>
                                                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                                    Driving
                                                </div>

                                                <div className="mt-1 text-sm font-semibold tabular-nums">
                                                    {formatDuration(
                                                        route.duration_minutes,
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                                    Historical
                                                </div>

                                                <div className="mt-1 text-sm font-semibold tabular-nums">
                                                    {incidentCount}{" "}
                                                    accidents
                                                </div>
                                            </div>

                                            <div>
                                                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                                    Overall risk
                                                </div>

                                                <div className="mt-1 text-sm font-semibold tabular-nums">
                                                    {overallRisk?.risk_score !=
                                                    null
                                                        ? Math.round(
                                                              overallRisk.risk_score,
                                                          )
                                                        : "N/A"}
                                                    {overallRisk?.risk_level
                                                        ? ` · ${overallRisk.risk_level}`
                                                        : ""}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <RouteRiskStrip
                                    segments={segments}
                                    breaks={restPlan?.breaks ?? []}
                                />

                                <div className="px-6 py-7">
                                    {instructions.length > 0 ? (
                                        <>
                                            <div className="mb-5 flex flex-col justify-between gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
                                                <div>
                                                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                                        {showAllSteps
                                                            ? "Full itinerary"
                                                            : "Main route steps"}
                                                    </div>

                                                    <div className="mt-1 text-sm text-slate-600">
                                                        {showAllSteps
                                                            ? "Every returned navigation instruction is shown."
                                                            : "Turns, exits, route changes and meaningful risk points are kept visible."}
                                                    </div>
                                                </div>

                                                {hiddenCount > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setShowAllSteps(
                                                                (
                                                                    value,
                                                                ) =>
                                                                    !value,
                                                            )
                                                        }
                                                        className="border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
                                                    >
                                                        {showAllSteps
                                                            ? "Show compact itinerary"
                                                            : `Show all ${instructions.length} steps`}
                                                    </button>
                                                )}
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
                                                            previous ==
                                                            null
                                                                ? 0
                                                                : originalIndex -
                                                                      previous.originalIndex -
                                                                      1

                                                        const isFirstInDisplayedSegment =
                                                            visibleIndex ===
                                                                0 ||
                                                            previous
                                                                ?.instruction
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

                                            <div className="mt-2 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-500">
                                                Historical accident indicators describe recorded road history, not live incidents. Low-risk indicators remain available for inspection through the context controls.
                                            </div>
                                        </>
                                    ) : (
                                        <div className="py-12 text-center text-sm text-slate-500">
                                            Route instructions are not available.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    <footer className="border-t border-slate-200 bg-white">
                        <div className="mx-auto max-w-7xl px-6 py-8 text-sm text-slate-500">
                            Route and journey information is calculated from the selected trip and returned route data.
                        </div>
                    </footer>
                </>
            )}
        </main>
    )
}

export default App