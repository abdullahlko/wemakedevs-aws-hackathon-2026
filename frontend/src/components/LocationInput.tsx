import { useEffect, useState } from "react"

type Location = {
  name: string
  lat: number
  lng: number
}

type LocationInputProps = {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  onSelect: (location: Location) => void
}

function LocationInput({
  label,
  placeholder,
  value,
  onChange,
  onSelect,
}: LocationInputProps) {
  const [results, setResults] = useState<Location[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(false)

  useEffect(() => {
    if (selectedLocation) {
      return
    }

    if (value.trim().length < 2) {
      setResults([])
      setSearching(false)
      setSearchError(false)
      return
    }

    const timeout = setTimeout(async () => {
      try {
        setSearching(true)
        setSearchError(false)

        const response = await fetch(
          `http://127.0.0.1:8000/api/locations/search?query=${encodeURIComponent(value)}`,
        )

        if (!response.ok) {
          throw new Error("Location search failed")
        }

        const data: Location[] = await response.json()

        setResults(data)
      } catch (error) {
        console.error("Location search failed:", error)
        setResults([])
        setSearchError(true)
      } finally {
        setSearching(false)
      }
    }, 500)

    return () => clearTimeout(timeout)
  }, [value, selectedLocation])

  const handleInputChange = (newValue: string) => {
    setSelectedLocation(false)
    onChange(newValue)
  }

  const handleSelect = (location: Location) => {
    setSelectedLocation(true)
    setResults([])
    setSearching(false)
    setSearchError(false)

    onChange(location.name)
    onSelect(location)
  }

  return (
    <div className="relative">
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        type="text"
        value={value}
        onChange={(event) => handleInputChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
      />

      {(searching || searchError || results.length > 0) && (
        <div className="absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {searching && (
            <div className="px-4 py-3 text-sm text-slate-500">
              Searching locations...
            </div>
          )}

          {!searching && searchError && (
            <div className="px-4 py-3 text-sm text-red-600">
              Location search failed. Please try again.
            </div>
          )}

          {!searching &&
            !searchError &&
            results.map((location) => (
              <button
                key={`${location.lat}-${location.lng}-${location.name}`}
                type="button"
                onClick={() => handleSelect(location)}
                className="block w-full border-b border-slate-100 px-4 py-3 text-left text-sm text-slate-700 transition last:border-b-0 hover:bg-slate-50"
              >
                {location.name}
              </button>
            ))}

          {!searching &&
            !searchError &&
            results.length === 0 && (
              <div className="px-4 py-3 text-sm text-slate-500">
                No locations found.
              </div>
            )}
        </div>
      )}
    </div>
  )
}

export default LocationInput