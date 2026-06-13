import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { getWallsGeoJSON, getSeedInfo } from './data/routes'
import './App.css'

// Grand Junction, CO
const GRAND_JUNCTION = { lng: -108.5506, lat: 39.0639 }
const INITIAL_ZOOM = 9

export default function App() {
  const mapContainer = useRef(null)
  const map = useRef(null)

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
        data: getWallsGeoJSON(),
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 45,
      })

      // Clustered points: a filled circle that grows with the count.
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

      // A single wall.
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

      // Tap a cluster to zoom into it.
      m.on('click', 'clusters', async (e) => {
        const features = m.queryRenderedFeatures(e.point, { layers: ['clusters'] })
        const clusterId = features[0].properties.cluster_id
        const zoom = await m.getSource('walls').getClusterExpansionZoom(clusterId)
        m.easeTo({ center: features[0].geometry.coordinates, zoom })
      })

      // Tap a wall to see its routes.
      m.on('click', 'wall', (e) => {
        const f = e.features[0]
        const routes = JSON.parse(f.properties.routes)
        const list = routes
          .map(
            (r) =>
              `<li><strong>${escapeHtml(r.name)}</strong>` +
              `<span class="grade">${escapeHtml(r.grade || '—')}</span>` +
              `<span class="type">${escapeHtml(r.type)}</span></li>`
          )
          .join('')
        const html =
          `<div class="wall-popup">` +
          `<h3>${escapeHtml(f.properties.name)}</h3>` +
          `<p class="path">${escapeHtml(f.properties.path)}</p>` +
          `<p class="count">${f.properties.routeCount} routes</p>` +
          `<ul>${list}</ul></div>`
        new maplibregl.Popup({ maxWidth: '300px' })
          .setLngLat(f.geometry.coordinates)
          .setHTML(html)
          .addTo(m)
      })

      // Pointer cursor over tappable things.
      for (const layer of ['clusters', 'wall']) {
        m.on('mouseenter', layer, () => (m.getCanvas().style.cursor = 'pointer'))
        m.on('mouseleave', layer, () => (m.getCanvas().style.cursor = ''))
      }
    })
  }, [])

  const info = getSeedInfo()

  return (
    <div id="app">
      <header id="top-bar">
        <h1>Western Slope Climbing</h1>
        <span className="counts">{info.wallCount} walls · {info.routeCount} routes</span>
      </header>
      <div id="map" ref={mapContainer} />
    </div>
  )
}

// Route names and descriptions come from OpenBeta and go into innerHTML, so
// escape them to avoid breaking the popup markup.
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
