import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  getWallsGeoJSON,
  getFilteredCounts,
  isDefaultFilter,
  DEFAULT_FILTER,
} from './data/routes'
import {
  getPins,
  addPin,
  updatePin,
  deletePin,
  getPinsGeoJSON,
  exportPinsGeoJSON,
  categoryColor,
  CATEGORIES,
  DEFAULT_CATEGORY,
} from './data/pins'
import FilterPanel from './components/FilterPanel'
import WallSheet from './components/WallSheet'
import RouteDetail from './components/RouteDetail'
import AddPinControl from './components/AddPinControl'
import PinEditSheet from './components/PinEditSheet'
import './App.css'

// Grand Junction, CO
const GRAND_JUNCTION = { lng: -108.5506, lat: 39.0639 }
const INITIAL_ZOOM = 9

// Category -> color as a MapLibre data-driven expression (built from CATEGORIES).
const PIN_COLOR_EXPR = [
  'match',
  ['get', 'category'],
  ...CATEGORIES.flatMap((c) => [c.key, c.color]),
  '#7c3aed', // fallback
]

export default function App() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const markerRef = useRef(null) // in-progress draggable pin marker
  const modeRef = useRef({ tapArmed: false }) // read by stale map click handlers
  const pinsRef = useRef([]) // latest pins for stale map click handlers
  const catRef = useRef(DEFAULT_CATEGORY) // latest new-pin category

  const [ready, setReady] = useState(false)
  const [filter, setFilter] = useState(DEFAULT_FILTER)
  const [showFilter, setShowFilter] = useState(false)
  const [selectedWall, setSelectedWall] = useState(null)
  const [selectedRoute, setSelectedRoute] = useState(null)

  const [pins, setPins] = useState([])
  const [adding, setAdding] = useState(false)
  const [newCategory, setNewCategory] = useState(DEFAULT_CATEGORY)
  const [tapArmed, setTapArmed] = useState(false)
  const [draft, setDraft] = useState(null) // { pin, isNew } while placing/editing
  const [geoError, setGeoError] = useState(null)

  useEffect(() => {
    if (map.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [GRAND_JUNCTION.lng, GRAND_JUNCTION.lat],
      zoom: INITIAL_ZOOM,
    })

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.current.addControl(
      new maplibregl.GeolocateControl({ trackUserLocation: true }),
      'top-right'
    )

    map.current.on('load', () => {
      const m = map.current

      // --- Climbing walls (OpenBeta seed) ---
      m.addSource('walls', {
        type: 'geojson',
        data: getWallsGeoJSON(DEFAULT_FILTER),
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 45,
      })
      m.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'walls',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#e94560',
          'circle-opacity': 0.85,
          'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 50, 30],
        },
      })
      m.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'walls',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 13,
        },
        paint: { 'text-color': '#ffffff' },
      })
      m.addLayer({
        id: 'wall',
        type: 'circle',
        source: 'walls',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#e94560',
          'circle-radius': 7,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })

      // --- Personal pins (Cole's data) ---
      m.addSource('pins', { type: 'geojson', data: getPinsGeoJSON([]) })
      m.addLayer({
        id: 'pin',
        type: 'circle',
        source: 'pins',
        paint: {
          'circle-color': PIN_COLOR_EXPR,
          'circle-radius': 9,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
        },
      })

      m.on('click', 'clusters', async (e) => {
        if (modeRef.current.tapArmed) return
        const features = m.queryRenderedFeatures(e.point, { layers: ['clusters'] })
        const clusterId = features[0].properties.cluster_id
        const zoom = await m.getSource('walls').getClusterExpansionZoom(clusterId)
        m.easeTo({ center: features[0].geometry.coordinates, zoom })
      })

      m.on('click', 'wall', (e) => {
        if (modeRef.current.tapArmed) return
        const f = e.features[0]
        setSelectedWall({
          id: f.properties.id,
          name: f.properties.name,
          path: f.properties.path,
          routes: JSON.parse(f.properties.routes),
        })
        setSelectedRoute(null)
      })

      m.on('click', 'pin', (e) => {
        if (modeRef.current.tapArmed) return
        const id = e.features[0].properties.id
        const pin = pinsRef.current.find((p) => p.id === id)
        if (pin) startEditPin(pin)
      })

      // General click: only acts when armed for tap-to-place.
      m.on('click', (e) => {
        if (!modeRef.current.tapArmed) return
        placeDraftAt(e.lngLat.lng, e.lngLat.lat)
      })

      for (const layer of ['clusters', 'wall', 'pin']) {
        m.on('mouseenter', layer, () => {
          if (!modeRef.current.tapArmed) m.getCanvas().style.cursor = 'pointer'
        })
        m.on('mouseleave', layer, () => {
          if (!modeRef.current.tapArmed) m.getCanvas().style.cursor = ''
        })
      }

      setReady(true)
      if (import.meta.env.DEV) window.__map = m

      // Load any saved pins.
      getPins().then(setPins)
    })
  }, [])

  // Push filter changes to the walls source.
  useEffect(() => {
    if (!ready) return
    const source = map.current.getSource('walls')
    if (source) source.setData(getWallsGeoJSON(filter))
  }, [filter, ready])

  // Push pin changes to the pins source; keep the ref in sync for click handlers.
  useEffect(() => {
    pinsRef.current = pins
    if (!ready) return
    const source = map.current.getSource('pins')
    if (source) source.setData(getPinsGeoJSON(pins))
  }, [pins, ready])

  // --- Pin placement helpers ---

  function armTap(value) {
    modeRef.current.tapArmed = value
    setTapArmed(value)
    if (map.current) map.current.getCanvas().style.cursor = value ? 'crosshair' : ''
  }

  function setCategory(key) {
    catRef.current = key
    setNewCategory(key)
    // Recolor an in-progress new marker to match.
    if (markerRef.current && draft?.isNew) {
      // Markers can't recolor in place; cheapest is to leave it — the saved
      // pin renders in the right color. (Acceptable for a transient marker.)
    }
  }

  function showMarker(pin) {
    if (markerRef.current) markerRef.current.remove()
    const mk = new maplibregl.Marker({ draggable: true, color: categoryColor(pin.category) })
      .setLngLat([pin.lng, pin.lat])
      .addTo(map.current)
    mk.on('dragend', () => {
      const ll = mk.getLngLat()
      setDraft((d) => (d ? { ...d, pin: { ...d.pin, lng: ll.lng, lat: ll.lat } } : d))
    })
    markerRef.current = mk
  }

  function clearMarker() {
    if (markerRef.current) {
      markerRef.current.remove()
      markerRef.current = null
    }
  }

  function placeDraftAt(lng, lat) {
    const pin = { category: catRef.current, label: '', notes: '', lng, lat }
    showMarker(pin)
    setDraft({ pin, isNew: true })
    armTap(false)
    setAdding(false)
  }

  function useMyLocation() {
    setGeoError(null)
    if (!navigator.geolocation) {
      setGeoError('This device has no location support.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => placeDraftAt(pos.coords.longitude, pos.coords.latitude),
      (err) => setGeoError(`Could not get your location: ${err.message}`),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  function startEditPin(pin) {
    closeSheets()
    showMarker(pin)
    setDraft({ pin: { ...pin }, isNew: false })
  }

  async function savePin(merged) {
    if (draft.isNew) {
      await addPin(merged)
    } else {
      await updatePin(merged)
    }
    setPins(await getPins())
    clearMarker()
    setDraft(null)
  }

  async function removePin(id) {
    await deletePin(id)
    setPins(await getPins())
    clearMarker()
    setDraft(null)
  }

  function cancelDraft() {
    clearMarker()
    setDraft(null)
  }

  function downloadPins() {
    const text = exportPinsGeoJSON(pins)
    const blob = new Blob([text], { type: 'application/geo+json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `climbing-pins-${new Date().toISOString().slice(0, 10)}.geojson`
    a.click()
    URL.revokeObjectURL(url)
  }

  // --- Top-bar toggles ---

  const toggleFilter = () => {
    setShowFilter((s) => !s)
    setAdding(false)
    armTap(false)
  }
  const toggleAdd = () => {
    setAdding((a) => {
      const next = !a
      if (!next) armTap(false)
      return next
    })
    setShowFilter(false)
    setGeoError(null)
  }

  const counts = getFilteredCounts(filter)
  const filtered = !isDefaultFilter(filter)

  const handleFilterChange = (next) => {
    setFilter(next)
    closeSheets()
  }

  function closeSheets() {
    setSelectedWall(null)
    setSelectedRoute(null)
  }

  return (
    <div id="app">
      <header id="top-bar">
        <h1>Western Slope Climbing</h1>
        <button
          className={`filter-btn ${filtered ? 'active' : ''}`}
          onClick={toggleFilter}
        >
          Filter{filtered ? ' •' : ''}
        </button>
        <button className={`filter-btn ${adding ? 'active' : ''}`} onClick={toggleAdd}>
          ＋ Pin
        </button>
      </header>

      {showFilter && (
        <FilterPanel filter={filter} onChange={handleFilterChange} counts={counts} />
      )}
      {adding && (
        <AddPinControl
          category={newCategory}
          onCategory={setCategory}
          onUseLocation={useMyLocation}
          onTapMode={() => armTap(true)}
          armed={tapArmed}
          onCancel={() => armTap(false)}
          geoError={geoError}
          pinCount={pins.length}
          onExport={downloadPins}
        />
      )}

      <div id="map" ref={mapContainer} />

      {draft && (
        <PinEditSheet
          pin={draft.pin}
          isNew={draft.isNew}
          onSave={savePin}
          onDelete={removePin}
          onCancel={cancelDraft}
        />
      )}
      {!draft && selectedRoute && selectedWall && (
        <RouteDetail
          route={selectedRoute}
          wall={selectedWall}
          onBack={() => setSelectedRoute(null)}
          onClose={closeSheets}
        />
      )}
      {!draft && selectedWall && !selectedRoute && (
        <WallSheet
          wall={selectedWall}
          onSelectRoute={setSelectedRoute}
          onClose={closeSheets}
        />
      )}
    </div>
  )
}
