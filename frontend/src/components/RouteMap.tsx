import { useEffect, useRef } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"

type Location = {
  name: string
  lat: number
  lng: number
}

type RouteMapProps = {
  fromLocation: Location | null
  destinationLocation: Location | null
}

function RouteMap({
  fromLocation,
  destinationLocation,
}: RouteMapProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const markers = useRef<mapboxgl.Marker[]>([])

  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

  useEffect(() => {
    if (!mapContainer.current || map.current || !token) {
      return
    }

    mapboxgl.accessToken = token

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [80.9462, 26.8467],
      zoom: 5,
    })

    map.current.addControl(
      new mapboxgl.NavigationControl(),
      "top-right",
    )

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [token])

  useEffect(() => {
    if (!map.current) {
      return
    }

    markers.current.forEach((marker) => marker.remove())
    markers.current = []

    const locations: {
      location: Location
      label: string
    }[] = []

    if (fromLocation) {
      locations.push({
        location: fromLocation,
        label: "Starting location",
      })
    }

    if (destinationLocation) {
      locations.push({
        location: destinationLocation,
        label: "Destination",
      })
    }

    locations.forEach(({ location, label }) => {
      const popup = new mapboxgl.Popup({
        offset: 25,
      }).setHTML(
        `<strong>${label}</strong><br />${location.name}`,
      )

      const marker = new mapboxgl.Marker()
        .setLngLat([location.lng, location.lat])
        .setPopup(popup)
        .addTo(map.current!)

      markers.current.push(marker)
    })

    if (fromLocation && destinationLocation) {
      const bounds = new mapboxgl.LngLatBounds()

      bounds.extend([fromLocation.lng, fromLocation.lat])
      bounds.extend([
        destinationLocation.lng,
        destinationLocation.lat,
      ])

      map.current.fitBounds(bounds, {
        padding: 80,
        maxZoom: 10,
      })
    } else if (fromLocation) {
      map.current.flyTo({
        center: [fromLocation.lng, fromLocation.lat],
        zoom: 10,
      })
    } else if (destinationLocation) {
      map.current.flyTo({
        center: [
          destinationLocation.lng,
          destinationLocation.lat,
        ],
        zoom: 10,
      })
    }
  }, [fromLocation, destinationLocation])

  if (!token) {
    return (
      <div className="flex h-[620px] items-center justify-center bg-slate-100 p-6 text-center">
        <div>
          <p className="font-semibold text-slate-900">
            Mapbox access token is missing
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Add VITE_MAPBOX_ACCESS_TOKEN to frontend/.env
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={mapContainer}
      className="h-[620px] w-full"
    />
  )
}

export default RouteMap