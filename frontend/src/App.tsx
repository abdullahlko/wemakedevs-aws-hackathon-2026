import { useState } from "react"
import LocationInput from "./components/LocationInput"
import RouteMap from "./components/RouteMap"

type Location = {
  name: string
  lat: number
  lng: number
}

type TripResponse = {
  message: string
  trip: {
    from: string
    destination: string
    departure_time: string
    from_lat: number
    from_lng: number
    destination_lat: number
    destination_lng: number
  }
}

type RouteData = {
  distance_km: number
  duration_minutes: number
  traffic_delay_minutes: number
  coordinates: [number, number][]
}

function App() {
  const [from, setFrom] = useState("")
  const [destination, setDestination] = useState("")
  const [departureTime, setDepartureTime] = useState("")

  const [fromLocation, setFromLocation] = useState<Location | null>(null)
  const [destinationLocation, setDestinationLocation] =
    useState<Location | null>(null)

  const [planning, setPlanning] = useState(false)
  const [tripResult, setTripResult] = useState<TripResponse | null>(null)
  const [route, setRoute] = useState<RouteData | null>(null)
  const [error, setError] = useState("")

  const handlePlanTrip = async () => {
    if (!fromLocation || !destinationLocation || !departureTime) {
      setError(
        "Please select a starting location, destination and departure time.",
      )
      return
    }

    setPlanning(true)
    setError("")
    setTripResult(null)
    setRoute(null)

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/trip/plan",
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

      if (!response.ok) {
        throw new Error("Unable to plan the trip.")
      }

      const data: TripResponse = await response.json()
      setTripResult(data)

      const routeResponse = await fetch(
        "http://127.0.0.1:8000/api/route",
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

      if (!routeResponse.ok) {
        throw new Error("Unable to calculate route.")
      }

      const routeData = await routeResponse.json()

      if (routeData.error) {
        throw new Error(routeData.error)
      }

      setRoute(routeData.route)
    } catch (error) {
      console.error("Trip planning failed:", error)

      if (error instanceof Error && error.message) {
        setError(error.message)
      } else {
        setError("Could not connect to the TruckView backend.")
      }
    } finally {
      setPlanning(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              TruckView
            </h1>

            <p className="text-sm text-slate-500">
              Smart Route Optimization for Commercial Trucks
            </p>
          </div>

          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600">
            Trip Planner
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[420px_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900">
              Plan your trip
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Enter your journey details to get a safer route plan.
            </p>
          </div>

          <div className="space-y-5">
            <LocationInput
              label="From"
              placeholder="Search starting location"
              value={from}
              onChange={(value) => {
                setFrom(value)
                setFromLocation(null)
              }}
              onSelect={(location) => {
                setFromLocation(location)
              }}
            />

            <LocationInput
              label="Destination"
              placeholder="Search destination"
              value={destination}
              onChange={(value) => {
                setDestination(value)
                setDestinationLocation(null)
              }}
              onSelect={(location) => {
                setDestinationLocation(location)
              }}
            />

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Departure time
              </label>

              <input
                type="datetime-local"
                value={departureTime}
                onChange={(event) =>
                  setDepartureTime(event.target.value)
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
              />
            </div>

            <button
              type="button"
              onClick={handlePlanTrip}
              disabled={planning}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {planning ? "Planning trip..." : "Plan Trip"}
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {tripResult && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">
                Trip received
              </p>

              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p>
                  <span className="font-medium text-slate-800">
                    From:
                  </span>{" "}
                  {tripResult.trip.from}
                </p>

                <p>
                  <span className="font-medium text-slate-800">
                    Destination:
                  </span>{" "}
                  {tripResult.trip.destination}
                </p>

                <p>
                  <span className="font-medium text-slate-800">
                    Departure:
                  </span>{" "}
                  {tripResult.trip.departure_time}
                </p>

                <div className="mt-3 border-t border-slate-200 pt-3">
                  <p>
                    <span className="font-medium text-slate-800">
                      From coordinates:
                    </span>{" "}
                    {tripResult.trip.from_lat.toFixed(4)},{" "}
                    {tripResult.trip.from_lng.toFixed(4)}
                  </p>

                  <p>
                    <span className="font-medium text-slate-800">
                      Destination coordinates:
                    </span>{" "}
                    {tripResult.trip.destination_lat.toFixed(4)},{" "}
                    {tripResult.trip.destination_lng.toFixed(4)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {route && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">
                Route summary
              </p>

              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">
                    Distance
                  </p>

                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {route.distance_km} km
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">
                    Duration
                  </p>

                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {route.duration_minutes} min
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">
                    Traffic delay
                  </p>

                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {route.traffic_delay_minutes} min
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 rounded-xl bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-900">
              What TruckView checks
            </p>

            <p className="mt-1 text-sm leading-6 text-blue-700">
              Route conditions, weather, daylight, accident risk and
              suitable rest points.
            </p>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-200">
          <RouteMap
            fromLocation={fromLocation}
            destinationLocation={destinationLocation}
            route={route}
          />
        </section>
      </main>
    </div>
  )
}

export default App