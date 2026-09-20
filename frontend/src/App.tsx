import { useMemo, useState } from "react"
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
    overall_risk: OverallRisk
    rest_plan: RestPlan
}

type TripResponse = {
    origin: Location
    destination: Location
    route: RouteData
}

function formatDuration(minutes?: number | null) {
    if (minutes == null) {
        return "N/A"
    }

    const hours = Math.floor(minutes / 60)
    const remaining = Math.round(minutes % 60)

    if (hours === 0) {
        return `${remaining} min`
    }

    if (remaining === 0) {
        return `${hours}h`
    }

    return `${hours}h ${remaining}m`
}

function formatTime(value?: string | null) {
    if (!value) {
        return "N/A"
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return value
    }

    return date.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
    })
}

function riskTone(level?: string | null) {
    const value = level?.toLowerCase() || ""

    if (value.includes("high") || value.includes("very high")) {
        return "text-red-700 bg-red-50 border-red-200"
    }

    if (value.includes("moderate")) {
        return "text-amber-700 bg-amber-50 border-amber-200"
    }

    if (value.includes("low") || value.includes("very low")) {
        return "text-green-700 bg-green-50 border-green-200"
    }

    return "text-slate-600 bg-slate-50 border-slate-200"
}

function factorLabel(value?: number | null) {
    if (value == null) {
        return "Unavailable"
    }

    if (value >= 70) {
        return "High"
    }

    if (value >= 40) {
        return "Moderate"
    }

    if (value > 0) {
        return "Low"
    }

    return "Low"
}

function factorTone(value?: number | null) {
    if (value == null) {
        return "text-slate-400"
    }

    if (value >= 70) {
        return "text-red-700"
    }

    if (value >= 40) {
        return "text-amber-700"
    }

    return "text-green-700"
}

function formatWeather(segment: Segment) {
    const weather = segment.weather

    if (!weather || weather.status !== "available") {
        return "Unavailable"
    }

    if (weather.precipitation_mm && weather.precipitation_mm > 0) {
        return "Rain"
    }

    if (
        weather.visibility_m != null &&
        weather.visibility_m < 5000
    ) {
        return "Reduced visibility"
    }

    return "Clear"
}

function formatLight(segment: Segment) {
    const condition = segment.sunlight?.light_condition?.toLowerCase()

    if (condition?.includes("night")) {
        return "Night"
    }

    if (segment.factors?.sun_glare != null) {
        if (segment.factors.sun_glare >= 40) {
            return "Glare"
        }
    }

    if (condition) {
        return condition.replace(/_/g, " ")
    }

    return "Unavailable"
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
                            className="block w-full border-b border-slate-100 px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                            {location.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

function RiskFactor({
    label,
    value,
}: {
    label: string
    value?: number | null
}) {
    return (
        <div className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0">
            <span className="text-sm text-slate-600">{label}</span>

            <span
                className={`text-sm font-semibold ${factorTone(
                    value,
                )}`}
            >
                {factorLabel(value)}
            </span>
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
        "2026-09-19T08:00",
    )

    const [trip, setTrip] = useState<TripResponse | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    async function planRoute() {
        if (!fromLocation || !destinationLocation) {
            setError("Select both the starting point and destination.")
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
                        destination_lat: destinationLocation.lat,
                        destination_lng: destinationLocation.lng,
                    }),
                },
            )

            const data = await response.json()

            if (!response.ok || data.error) {
                throw new Error(
                    data.error || "Could not calculate route.",
                )
            }

            setTrip(data)

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

    const importantSegments = useMemo(() => {
        if (!route?.segments) {
            return []
        }

        return route.segments
            .map((segment, index) => ({
                segment,
                index,
            }))
            .filter(({ segment }) => {
                const risk = segment.risk_score ?? 0
                const accident =
                    segment.factors?.accident ?? 0
                const weather =
                    segment.factors?.weather ?? 0
                const glare =
                    segment.factors?.sun_glare ?? 0
                const night = segment.factors?.night ?? 0

                return (
                    risk >= 40 ||
                    accident >= 40 ||
                    weather >= 40 ||
                    glare >= 40 ||
                    night >= 60
                )
            })
            .sort(
                (a, b) =>
                    (b.segment.risk_score ?? 0) -
                    (a.segment.risk_score ?? 0),
            )
            .slice(0, 4)
    }, [route])

    return (
        <main className="min-h-screen bg-[#f7f7f5] text-slate-900">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
                    <div>
                        <div className="text-xl font-bold tracking-tight">
                            TruckView
                        </div>
                        <div className="text-xs text-slate-500">
                            Safer planning for long truck journeys
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
                            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
                                Plan a trip
                            </p>

                            <h1 className="max-w-md text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                                Know the road before you drive it.
                            </h1>

                            <p className="mt-4 max-w-md text-base leading-7 text-slate-600">
                                Enter your journey and TruckView checks
                                route conditions, weather, accident
                                history and driving time.
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
                                        setFromLocation(location)
                                        setFromText(location.name)
                                    }}
                                />

                                <LocationInput
                                    label="To"
                                    value={destinationText}
                                    selected={destinationLocation}
                                    onChange={setDestinationText}
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
                                                event.target.value,
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
                            Route and traffic data from TomTom.
                            Weather from Open-Meteo. Accident
                            information uses the project's prototype
                            dataset.
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
                            <div className="mb-10">
                                <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                                    Your journey
                                </p>

                                <div className="mt-3 flex flex-col justify-between gap-5 md:flex-row md:items-end">
                                    <div>
                                        <h2 className="text-3xl font-bold tracking-tight">
                                            {trip.origin.name.split(
                                                ",",
                                            )[0]}{" "}
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

                                    <div
                                        className={`inline-flex w-fit items-center border px-3 py-2 text-sm font-semibold ${riskTone(
                                            overallRisk?.risk_level,
                                        )}`}
                                    >
                                        {overallRisk?.risk_level ||
                                            "Risk unavailable"}{" "}
                                        route risk
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="border border-slate-200 p-6">
                                    <p className="text-sm text-slate-500">
                                        Distance
                                    </p>
                                    <p className="mt-2 text-3xl font-bold">
                                        {Math.round(
                                            route.distance_km,
                                        )}{" "}
                                        km
                                    </p>
                                </div>

                                <div className="border border-slate-200 p-6">
                                    <p className="text-sm text-slate-500">
                                        Driving time
                                    </p>
                                    <p className="mt-2 text-3xl font-bold">
                                        {formatDuration(
                                            route.duration_minutes,
                                        )}
                                    </p>
                                </div>

                                <div className="border border-slate-200 p-6">
                                    <p className="text-sm text-slate-500">
                                        Traffic delay
                                    </p>
                                    <p className="mt-2 text-3xl font-bold">
                                        {formatDuration(
                                            route.traffic_delay_minutes,
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
                                <div className="border border-slate-200 p-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-semibold">
                                                What to watch
                                            </h3>

                                            <p className="mt-1 text-sm text-slate-500">
                                                Main conditions affecting
                                                this journey
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-5">
                                        <RiskFactor
                                            label="Accident history"
                                            value={
                                                overallRisk?.factors
                                                    ?.accident
                                            }
                                        />

                                        <RiskFactor
                                            label="Weather"
                                            value={
                                                overallRisk?.factors
                                                    ?.weather
                                            }
                                        />

                                        <RiskFactor
                                            label="Sun glare"
                                            value={
                                                overallRisk?.factors
                                                    ?.sun_glare
                                            }
                                        />

                                        <RiskFactor
                                            label="Night driving"
                                            value={
                                                overallRisk?.factors
                                                    ?.night
                                            }
                                        />
                                    </div>

                                    {overallRisk?.data_status
                                        ?.accident ===
                                        "prototype_dataset" && (
                                        <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-400">
                                            Accident risk is based on the
                                            project's prototype historical
                                            dataset.
                                        </p>
                                    )}
                                </div>

                                <div className="border border-slate-200 bg-slate-900 p-6 text-white">
                                    <p className="text-sm font-medium text-slate-400">
                                        Break plan
                                    </p>

                                    {restPlan?.break_count ? (
                                        <>
                                            <p className="mt-3 text-3xl font-bold">
                                                {
                                                    restPlan.break_count
                                                }{" "}
                                                break
                                                {restPlan.break_count ===
                                                1
                                                    ? ""
                                                    : "s"}
                                            </p>

                                            <p className="mt-3 text-sm leading-6 text-slate-300">
                                                {restPlan
                                                    .breaks?.[0]
                                                    ?.duration_minutes ||
                                                    restPlan.total_break_minutes ||
                                                    30}{" "}
                                                min break after about{" "}
                                                {Math.round(
                                                    (restPlan
                                                        .breaks?.[0]
                                                        ?.after_continuous_work_minutes ||
                                                        300) /
                                                        60,
                                                )}{" "}
                                                hours of continuous
                                                driving.
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="mt-3 text-3xl font-bold">
                                                No break
                                            </p>

                                            <p className="mt-3 text-sm leading-6 text-slate-300">
                                                The planned journey fits
                                                within the current work
                                                limit.
                                            </p>
                                        </>
                                    )}

                                    <div className="mt-8 border-t border-slate-700 pt-5">
                                        <p className="text-xs uppercase tracking-wider text-slate-500">
                                            Expected arrival
                                        </p>

                                        <p className="mt-1 text-xl font-semibold">
                                            {formatTime(
                                                restPlan?.planned_arrival_time,
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="border-t border-slate-200 bg-[#f7f7f5]">
                        <div className="mx-auto max-w-7xl px-6 py-20">
                            <div className="mb-10">
                                <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                                    Along the route
                                </p>

                                <h2 className="mt-3 text-3xl font-bold tracking-tight">
                                    Places worth paying attention to
                                </h2>

                                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                                    We only show sections that have
                                    something useful to tell the driver.
                                </p>
                            </div>

                            {importantSegments.length === 0 ? (
                                <div className="border border-slate-200 bg-white p-8">
                                    <p className="font-semibold">
                                        No major watchouts found
                                    </p>

                                    <p className="mt-2 text-sm text-slate-500">
                                        The current route does not have
                                        any segment above the warning
                                        thresholds.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {importantSegments.map(
                                        ({ segment, index }) => {
                                            const risk =
                                                segment.risk_score

                                            const accident =
                                                segment.factors
                                                    ?.accident

                                            const weather =
                                                segment.factors
                                                    ?.weather

                                            const glare =
                                                segment.factors
                                                    ?.sun_glare

                                            const night =
                                                segment.factors
                                                    ?.night

                                            const accidentCount =
                                                segment.accident
                                                    ?.accident_count

                                            return (
                                                <div
                                                    key={index}
                                                    className="border border-slate-200 bg-white p-6"
                                                >
                                                    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                                                        <div>
                                                            <div className="flex flex-wrap items-center gap-3">
                                                                <span className="text-sm font-semibold text-slate-500">
                                                                    Route
                                                                    area{" "}
                                                                    {index +
                                                                        1}
                                                                </span>

                                                                <span
                                                                    className={`border px-2.5 py-1 text-xs font-semibold ${riskTone(
                                                                        segment.risk_level,
                                                                    )}`}
                                                                >
                                                                    {segment.risk_level ||
                                                                        "Risk unavailable"}
                                                                </span>
                                                            </div>

                                                            <h3 className="mt-3 text-lg font-semibold">
                                                                Pay a little
                                                                more
                                                                attention
                                                                here
                                                            </h3>

                                                            <p className="mt-1 text-sm text-slate-500">
                                                                Segment
                                                                risk score:{" "}
                                                                {risk ??
                                                                    "N/A"}
                                                            </p>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4">
                                                            <div>
                                                                <p className="text-xs text-slate-400">
                                                                    Accidents
                                                                </p>

                                                                <p
                                                                    className={`mt-1 font-semibold ${factorTone(
                                                                        accident,
                                                                    )}`}
                                                                >
                                                                    {factorLabel(
                                                                        accident,
                                                                    )}
                                                                </p>

                                                                {accidentCount !=
                                                                    null && (
                                                                    <p className="mt-1 text-xs text-slate-400">
                                                                        {
                                                                            accidentCount
                                                                        }{" "}
                                                                        nearby
                                                                    </p>
                                                                )}
                                                            </div>

                                                            <div>
                                                                <p className="text-xs text-slate-400">
                                                                    Weather
                                                                </p>

                                                                <p
                                                                    className={`mt-1 font-semibold ${factorTone(
                                                                        weather,
                                                                    )}`}
                                                                >
                                                                    {formatWeather(
                                                                        segment,
                                                                    )}
                                                                </p>
                                                            </div>

                                                            <div>
                                                                <p className="text-xs text-slate-400">
                                                                    Light
                                                                </p>

                                                                <p
                                                                    className={`mt-1 font-semibold ${factorTone(
                                                                        Math.max(
                                                                            glare ??
                                                                                0,
                                                                            night ??
                                                                                0,
                                                                        ),
                                                                    )}`}
                                                                >
                                                                    {formatLight(
                                                                        segment,
                                                                    )}
                                                                </p>
                                                            </div>

                                                            <div>
                                                                <p className="text-xs text-slate-400">
                                                                    Night
                                                                </p>

                                                                <p
                                                                    className={`mt-1 font-semibold ${factorTone(
                                                                        night,
                                                                    )}`}
                                                                >
                                                                    {factorLabel(
                                                                        night,
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        },
                                    )}
                                </div>
                            )}

                            <div className="mt-10 border border-slate-200 bg-white p-6">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="font-semibold">
                                            Route checked
                                        </p>

                                        <p className="mt-1 text-sm text-slate-500">
                                            {
                                                route.segments.length
                                            }{" "}
                                            route sections were analysed
                                            for conditions.
                                        </p>
                                    </div>

                                    <div className="text-sm text-slate-400">
                                        TruckView prototype
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <footer className="border-t border-slate-200 bg-white">
                        <div className="mx-auto max-w-7xl px-6 py-8 text-sm text-slate-500">
                            TruckView is a prototype built for the
                            WeMakeDevs × AWS First Commit 2026 hackathon.
                        </div>
                    </footer>
                </>
            )}
        </main>
    )
}

export default App