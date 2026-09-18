import { useState } from "react"

function App() {
  const [from, setFrom] = useState("")
  const [destination, setDestination] = useState("")
  const [departureTime, setDepartureTime] = useState("")
  const [planning, setPlanning] = useState(false)

  const handlePlanTrip = () => {
    if (!from || !destination || !departureTime) {
      return
    }

    setPlanning(true)

    setTimeout(() => {
      setPlanning(false)
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">TruckView</h1>
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
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                From
              </label>

              <input
                type="text"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                placeholder="Search starting location"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Destination
              </label>

              <input
                type="text"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                placeholder="Search destination"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Departure time
              </label>

              <input
                type="datetime-local"
                value={departureTime}
                onChange={(event) => setDepartureTime(event.target.value)}
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

          <div className="mt-6 rounded-xl bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-900">
              What TruckView checks
            </p>

            <p className="mt-1 text-sm leading-6 text-blue-700">
              Route conditions, weather, daylight, accident risk and suitable
              rest points.
            </p>
          </div>
        </section>

        <section className="flex min-h-[620px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-200">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
              <span className="text-2xl">🗺️</span>
            </div>

            <h2 className="text-lg font-semibold text-slate-800">
              Your route will appear here
            </h2>

            <p className="mt-2 max-w-sm text-sm text-slate-500">
              Enter your starting location and destination to generate a trip
              route.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App