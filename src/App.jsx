import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  getWallsGeoJSON,
  getFilteredCounts,
  isDefaultFilter,
  DEFAULT_FILTER,
} from './data/routes'
import FilterPanel from './components/FilterPanel'
import WallSheet from './components/WallSheet'
import RouteDetail from './components/RouteDetail'
import './App.css'

// Grand Junction, CO
const GRAND_JUNCTION = { lng: -108.5506, lat: 39.0639 }
const INITIAL_ZOOM = 9

export default function App() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const [ready, setReady] = useState(false)
  const [filter, setFilter] = useState(DEFAULT_FILTER)
  const [showFilter, setShowFilter] = useState(false)
  const [selectedWall, setSelectedWall] = useState(null)
  const [selectedRoute, setSelectedRoute] = useState(null)

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

      m.on('click', 'clusters', async (e) => {
        const features = m.queryRenderedFeatures(e.point, { layers: ['clusters'] })
        const clusterId = features[0].properties.cluster_id
        const zoom = await m.getSource('walls').getClusterExpansionZoom(clusterId)
        m.easeTo({ center: features[0].geometry.coordinates, zoom })
      })

      m.on('click', 'wall', (e) => {
        const f = e.features[0]
        setSelectedWall({
          id: f.properties.id,
          name: f.properties.name,
          path: f.properties.path,
          routes: JSON.parse(f.properties.routes),
        })
        setSelectedRoute(null)
      })

      for (const layer of ['clusters', 'wall']) {
        m.on('mouseenter', layer, () => (m.getCanvas().style.cursor = 'pointer'))
        m.on('mouseleave', layer, () => (m.getCanvas().style.cursor = ''))
      }

      setReady(true)
      if (import.meta.env.DEV) window.__map = m
    })
  }, [])

  // Push filter changes to the map's data source.
  useEffect(() => {
    if (!ready) return
    const source = map.current.getSource('walls')
    if (source) source.setData(getWallsGeoJSON(filter))
  }, [filter, ready])

  const counts = getFilteredCounts(filter)
  const filtered = !isDefaultFilter(filter)

  // Changing the filter can drop a selected wall's routes — close the sheets.
  const handleFilterChange = (next) => {
    setFilter(next)
    setSelectedWall(null)
    setSelectedRoute(null)
  }

  const closeSheets = () => {
    setSelectedWall(null)
    setSelectedRoute(null)
  }

  return (
    <div id="app">
      <header id="top-bar">
        <h1>Western Slope Climbing</h1>
        <button
          className={`filter-btn ${filtered ? 'active' : ''}`}
          onClick={() => setShowFilter((s) => !s)}
        >
          Filter{filtered ? ' •' : ''}
        </button>
      </header>
      {showFilter && (
        <FilterPanel filter={filter} onChange={handleFilterChange} counts={counts} />
      )}
      <div id="map" ref={mapContainer} />

      {selectedRoute && selectedWall && (
        <RouteDetail
          route={selectedRoute}
          wall={selectedWall}
          onBack={() => setSelectedRoute(null)}
          onClose={closeSheets}
        />
      )}
      {selectedWall && !selectedRoute && (
        <WallSheet
          wall={selectedWall}
          onSelectRoute={setSelectedRoute}
          onClose={closeSheets}
        />
      )}
    </div>
  )
}
