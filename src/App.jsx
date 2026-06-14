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
  categoryColor,
  CATEGORIES,
  DEFAULT_CATEGORY,
} from './data/pins'
import {
  getTracks,
  addTrack,
  deleteTrack,
  getTracksGeoJSON,
  getTracksForWall,
  nearestAnchors,
  trackLength,
  haversineMeters,
} from './data/tracks'
import { useAuth } from './auth/AuthContext'
import { displayName } from './data/auth'
import { initSync } from './data/sync'
import { getOverrides, setOverride, resetOverride } from './data/overrides'
import { downloadArea } from './lib/tiles'
import AuthSheet from './components/AuthSheet'
import FilterPanel from './components/FilterPanel'
import WallSheet from './components/WallSheet'
import RouteDetail from './components/RouteDetail'
import AddPinControl from './components/AddPinControl'
import PinEditSheet from './components/PinEditSheet'
import TrackRecordPanel from './components/TrackRecordPanel'
import TrackSaveSheet from './components/TrackSaveSheet'
import TrackSheet from './components/TrackSheet'
import './App.css'

// Grand Junction, CO
const GRAND_JUNCTION = { lng: -108.5506, lat: 39.0639 }
const INITIAL_ZOOM = 9

// Draw a teardrop map-pin icon (colored head, white outline + center dot) as
// pixel data for map.addImage. Categories each get their own colored pin.
function pinIconData(hex) {
  const w = 48
  const h = 60
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  const cx = 24
  const cy = 22
  const drop = (r, tipY) => {
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, 2 * Math.PI)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(cx - r * 0.62, cy + r * 0.5)
    ctx.lineTo(cx + r * 0.62, cy + r * 0.5)
    ctx.lineTo(cx, tipY)
    ctx.closePath()
    ctx.fill()
  }
  ctx.fillStyle = '#ffffff'
  drop(20, 59) // white outline
  ctx.fillStyle = hex
  drop(17, 55) // colored body
  ctx.beginPath()
  ctx.arc(cx, cy, 6, 0, 2 * Math.PI)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  return ctx.getImageData(0, 0, w, h)
}

const EMPTY_FC = { type: 'FeatureCollection', features: [] }

// Recording quality gates: skip wildly inaccurate fixes and GPS jitter.
const MAX_ACCURACY_M = 50
const MIN_MOVE_M = 3

export default function App() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const markerRef = useRef(null) // in-progress draggable pin marker
  const modeRef = useRef({ tapArmed: false, recording: false }) // read by stale map handlers
  const pinsRef = useRef([]) // latest pins for stale map click handlers
  const tracksRef = useRef([]) // latest tracks for stale map click handlers
  const catRef = useRef(DEFAULT_CATEGORY) // latest new-pin category

  // Recording engine refs
  const watchIdRef = useRef(null)
  const wakeLockRef = useRef(null)
  const recCoordsRef = useRef([])
  const recStartRef = useRef(0)
  const recTimerRef = useRef(null)

  const { user } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const [dl, setDl] = useState(null) // offline-download state
  const [satellite, setSatellite] = useState(false)
  const [overrides, setOverrides] = useState({}) // wallId -> corrected coords
  const [locating, setLocating] = useState(null) // { wallId, name, lng, lat } while fixing a wall

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

  // Trail state
  const [tracks, setTracks] = useState([])
  const [showTrack, setShowTrack] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recStats, setRecStats] = useState({ points: 0, lengthMeters: 0, elapsedSec: 0 })
  const [wakeWarning, setWakeWarning] = useState(null)
  const [saveDraft, setSaveDraft] = useState(null) // { coordinates, startCandidates, endCandidates }
  const [selectedTrack, setSelectedTrack] = useState(null)

  useEffect(() => {
    if (map.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [GRAND_JUNCTION.lng, GRAND_JUNCTION.lat],
      zoom: INITIAL_ZOOM,
      attributionControl: false, // re-added at top-right so the bottom bar can't cover it
    })

    map.current.addControl(new maplibregl.AttributionControl({ compact: true }), 'top-right')
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.current.addControl(
      new maplibregl.GeolocateControl({ trackUserLocation: true }),
      'top-right'
    )

    map.current.on('load', () => {
      const m = map.current

      // --- Satellite basemap (toggle; hidden by default) ---
      // Added first so it sits above the street style but below our data layers.
      // Online-only (Esri imagery); offline downloads stay on light street tiles.
      m.addSource('satellite', {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
      })
      m.addLayer({
        id: 'satellite',
        type: 'raster',
        source: 'satellite',
        layout: { visibility: 'none' },
      })

      // --- Climbing walls (OpenBeta seed) ---
      m.addSource('walls', {
        type: 'geojson',
        data: getWallsGeoJSON(DEFAULT_FILTER),
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 45,
      })

      // --- Approach trails (Cole's data) — lines under the point layers ---
      m.addSource('tracks', { type: 'geojson', data: getTracksGeoJSON([]) })
      m.addLayer({
        id: 'track',
        type: 'line',
        source: 'tracks',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#0d9488', 'line-width': 4 },
      })
      m.addSource('track-recording', { type: 'geojson', data: EMPTY_FC })
      m.addLayer({
        id: 'track-live',
        type: 'line',
        source: 'track-recording',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#f59e0b', 'line-width': 4, 'line-dasharray': [2, 2] },
      })

      m.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'walls',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#2e7d5b',
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
          'circle-color': '#2e7d5b',
          'circle-radius': 7,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })

      // --- Personal pins (Cole's data) ---
      // One teardrop icon per category, then a symbol layer keyed by category.
      for (const c of CATEGORIES) {
        if (!m.hasImage(`pin-${c.key}`)) {
          m.addImage(`pin-${c.key}`, pinIconData(c.color), { pixelRatio: 2 })
        }
      }
      m.addSource('pins', { type: 'geojson', data: getPinsGeoJSON([]) })
      m.addLayer({
        id: 'pin',
        type: 'symbol',
        source: 'pins',
        layout: {
          'icon-image': ['concat', 'pin-', ['get', 'category']],
          'icon-size': 1,
          'icon-anchor': 'bottom',
          'icon-allow-overlap': true,
        },
      })
      // Transparent, generous tap target over each pin (the icon's own hit box
      // is tiny). Clicks/cursor use this layer.
      m.addLayer({
        id: 'pin-hit',
        type: 'circle',
        source: 'pins',
        paint: { 'circle-radius': 16, 'circle-color': '#000', 'circle-opacity': 0 },
      })

      m.on('click', 'clusters', async (e) => {
        if (modeRef.current.tapArmed || modeRef.current.recording) return
        const features = m.queryRenderedFeatures(e.point, { layers: ['clusters'] })
        const clusterId = features[0].properties.cluster_id
        const zoom = await m.getSource('walls').getClusterExpansionZoom(clusterId)
        m.easeTo({ center: features[0].geometry.coordinates, zoom })
      })

      m.on('click', 'wall', (e) => {
        if (modeRef.current.tapArmed || modeRef.current.recording) return
        const f = e.features[0]
        setSelectedTrack(null)
        setSelectedWall({
          id: f.properties.id,
          name: f.properties.name,
          path: f.properties.path,
          routes: JSON.parse(f.properties.routes),
          lng: f.geometry.coordinates[0],
          lat: f.geometry.coordinates[1],
          moved: !!f.properties.moved,
          movedBy: f.properties.movedBy,
        })
        setSelectedRoute(null)
      })

      m.on('click', 'pin-hit', (e) => {
        if (modeRef.current.tapArmed || modeRef.current.recording) return
        const id = e.features[0].properties.id
        const pin = pinsRef.current.find((p) => p.id === id)
        if (pin) startEditPin(pin)
      })

      m.on('click', 'track', (e) => {
        if (modeRef.current.tapArmed || modeRef.current.recording) return
        const id = e.features[0].properties.id
        const track = tracksRef.current.find((t) => t.id === id)
        if (track) openTrack(track)
      })

      // General click: only acts when armed for tap-to-place.
      m.on('click', (e) => {
        if (modeRef.current.tapArmed) {
          placeDraftAt(e.lngLat.lng, e.lngLat.lat)
          return
        }
        // Tap on empty map (no pin/wall/trail) closes any open sheet.
        const hits = m.queryRenderedFeatures(e.point, {
          layers: ['clusters', 'wall', 'pin-hit', 'track'],
        })
        if (hits.length === 0) dismissOpenSheets()
      })

      for (const layer of ['clusters', 'wall', 'pin-hit', 'track']) {
        m.on('mouseenter', layer, () => {
          if (!modeRef.current.tapArmed) m.getCanvas().style.cursor = 'pointer'
        })
        m.on('mouseleave', layer, () => {
          if (!modeRef.current.tapArmed) m.getCanvas().style.cursor = ''
        })
      }

      setReady(true)
      if (import.meta.env.DEV) window.__map = m

      // Load saved data.
      getPins().then(setPins)
      getTracks().then(setTracks)
      getOverrides().then(setOverrides)
    })
  }, [])

  // Re-acquire the screen wake lock when returning to the tab mid-recording.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && modeRef.current.recording) {
        requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // Push filter / location-correction changes to the walls source.
  useEffect(() => {
    if (!ready) return
    const source = map.current.getSource('walls')
    if (source) source.setData(getWallsGeoJSON(filter, overrides))
  }, [filter, overrides, ready])

  // Flush offline-queued writes on reconnect, then refresh shared data.
  useEffect(() => {
    return initSync(async () => {
      setPins(await getPins())
      setTracks(await getTracks())
      setOverrides(await getOverrides())
    })
  }, [])

  // Push pin changes to the pins source; keep the ref in sync for click handlers.
  useEffect(() => {
    pinsRef.current = pins
    if (!ready) return
    const source = map.current.getSource('pins')
    if (source) source.setData(getPinsGeoJSON(pins))
  }, [pins, ready])

  // Push track changes to the tracks source; keep the ref in sync.
  useEffect(() => {
    tracksRef.current = tracks
    if (!ready) return
    const source = map.current.getSource('tracks')
    if (source) source.setData(getTracksGeoJSON(tracks))
  }, [tracks, ready])

  // --- Pin placement helpers ---

  function armTap(value) {
    modeRef.current.tapArmed = value
    setTapArmed(value)
    if (map.current) map.current.getCanvas().style.cursor = value ? 'crosshair' : ''
  }

  function setCategory(key) {
    catRef.current = key
    setNewCategory(key)
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

  // --- Fix wall location (corrections layer) ---

  function showFixMarker(lng, lat) {
    if (markerRef.current) markerRef.current.remove()
    const mk = new maplibregl.Marker({ draggable: true, color: '#2e7d5b' })
      .setLngLat([lng, lat])
      .addTo(map.current)
    mk.on('dragend', () => {
      const ll = mk.getLngLat()
      setLocating((l) => (l ? { ...l, lng: ll.lng, lat: ll.lat } : l))
    })
    markerRef.current = mk
  }

  function startFixLocation(wall) {
    closeSheets()
    showFixMarker(wall.lng, wall.lat)
    setLocating({ wallId: wall.id, name: wall.name, lng: wall.lng, lat: wall.lat })
    map.current?.easeTo({ center: [wall.lng, wall.lat], zoom: Math.max(map.current.getZoom(), 15) })
  }

  function fixUseMyLocation() {
    if (!navigator.geolocation) return setGeoError('This device has no location support.')
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { longitude: lng, latitude: lat } = pos.coords
        setLocating((l) => (l ? { ...l, lng, lat } : l))
        markerRef.current?.setLngLat([lng, lat])
        map.current?.easeTo({ center: [lng, lat] })
      },
      (err) => setGeoError(`Could not get your location: ${err.message}`),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function saveFixLocation() {
    try {
      await setOverride(locating.wallId, locating.lng, locating.lat)
      setOverrides(await getOverrides())
    } catch (e) {
      alert(`Couldn't save location: ${e.message || e}`)
    } finally {
      clearMarker()
      setLocating(null)
    }
  }

  function cancelFixLocation() {
    clearMarker()
    setLocating(null)
  }

  async function resetWallLocation(wallId) {
    try {
      await resetOverride(wallId)
      setOverrides(await getOverrides())
    } catch (e) {
      alert(`Couldn't reset location: ${e.message || e}`)
    }
    closeSheets()
  }

  async function savePin(merged) {
    try {
      if (draft.isNew) {
        await addPin(merged)
      } else {
        await updatePin(merged)
      }
      setPins(await getPins())
      clearMarker()
      setDraft(null)
    } catch (e) {
      alert(`Could not save pin: ${e.message || e}`)
    }
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

  // --- Trail recording engine ---

  async function requestWakeLock() {
    if (!('wakeLock' in navigator)) {
      setWakeWarning('Screen may sleep — keep the app open and tap to wake.')
      return
    }
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen')
      setWakeWarning(null)
    } catch {
      setWakeWarning('Screen may sleep — keep the app open and tap to wake.')
    }
  }

  function releaseWakeLock() {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {})
      wakeLockRef.current = null
    }
  }

  function setLiveLine(coords) {
    const src = map.current?.getSource('track-recording')
    if (!src) return
    src.setData(
      coords.length >= 2
        ? { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } }
        : EMPTY_FC
    )
  }

  function onPosition(pos) {
    if (pos.coords.accuracy > MAX_ACCURACY_M) return
    const pt = [pos.coords.longitude, pos.coords.latitude]
    const coords = recCoordsRef.current
    const last = coords[coords.length - 1]
    if (last && haversineMeters(last, pt) < MIN_MOVE_M) return
    coords.push(pt)
    setLiveLine(coords)
    setRecStats((s) => ({ ...s, points: coords.length, lengthMeters: trackLength(coords) }))
  }

  function startRecording() {
    if (!navigator.geolocation) {
      setGeoError('This device has no location support.')
      return
    }
    closeSheets()
    setSelectedTrack(null)
    recCoordsRef.current = []
    recStartRef.current = Date.now()
    setRecStats({ points: 0, lengthMeters: 0, elapsedSec: 0 })
    modeRef.current.recording = true
    setRecording(true)
    setShowTrack(true)
    requestWakeLock()
    recTimerRef.current = setInterval(() => {
      setRecStats((s) => ({ ...s, elapsedSec: Math.round((Date.now() - recStartRef.current) / 1000) }))
    }, 1000)
    watchIdRef.current = navigator.geolocation.watchPosition(onPosition, () => {}, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15000,
    })
  }

  function teardownRecording() {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    if (recTimerRef.current) {
      clearInterval(recTimerRef.current)
      recTimerRef.current = null
    }
    releaseWakeLock()
    modeRef.current.recording = false
    setRecording(false)
  }

  function stopRecording() {
    teardownRecording()
    const coords = recCoordsRef.current
    setLiveLine([])
    if (coords.length < 2) {
      setGeoError('Trail too short to save — walk a bit farther next time.')
      return
    }
    setSaveDraft({
      coordinates: coords.slice(),
      startCandidates: nearestAnchors(coords[0][0], coords[0][1], pinsRef.current, { n: 5 }),
      endCandidates: nearestAnchors(
        coords[coords.length - 1][0],
        coords[coords.length - 1][1],
        pinsRef.current,
        { n: 5 }
      ),
    })
    setShowTrack(false)
  }

  function discardRecording() {
    teardownRecording()
    recCoordsRef.current = []
    setLiveLine([])
    setSaveDraft(null)
  }

  // Resolve a save-sheet anchor choice into a stored { kind, id }, creating a
  // parking pin at the endpoint when the user chose "Add parking pin here".
  async function resolveSaveAnchor(choice, coord) {
    if (choice.create) {
      const pin = await addPin({ category: 'parking', label: '', lng: coord[0], lat: coord[1] })
      return { ref: { kind: 'pin', id: pin.id }, createdPin: true }
    }
    return { ref: { kind: choice.kind, id: choice.id }, createdPin: false }
  }

  async function saveTrack({ name, notes, start, end }) {
    try {
      const coords = saveDraft.coordinates
      const s = await resolveSaveAnchor(start, coords[0])
      const e = await resolveSaveAnchor(end, coords[coords.length - 1])
      await addTrack({ name, notes, start: s.ref, end: e.ref, coordinates: coords })
      if (s.createdPin || e.createdPin) setPins(await getPins())
      setTracks(await getTracks())
      setSaveDraft(null)
    } catch (e) {
      alert(`Could not save trail: ${e.message || e}`)
    }
  }

  function openTrack(track) {
    closeSheets()
    setSelectedTrack(track)
    fitToCoords(track.coordinates)
  }

  async function removeTrack(id) {
    await deleteTrack(id)
    setTracks(await getTracks())
    setSelectedTrack(null)
  }

  function fitToCoords(coords) {
    if (!coords?.length) return
    const b = coords.reduce(
      (acc, c) => [
        Math.min(acc[0], c[0]),
        Math.min(acc[1], c[1]),
        Math.max(acc[2], c[0]),
        Math.max(acc[3], c[1]),
      ],
      [Infinity, Infinity, -Infinity, -Infinity]
    )
    map.current.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 80, maxZoom: 16 })
  }

  function handleAnchorTap(_anchor, fallbackCoord) {
    if (fallbackCoord) map.current.easeTo({ center: fallbackCoord, zoom: 16 })
  }

  function openWallTrack(track) {
    setSelectedWall(null)
    openTrack(track)
  }

  // --- Top-bar toggles ---

  const toggleFilter = () => {
    setShowFilter((s) => !s)
    setAdding(false)
    setShowTrack(false)
    armTap(false)
  }
  const toggleAdd = () => {
    // Adding pins writes to the shared backend — require sign-in first.
    if (!user && !adding) {
      setShowAuth(true)
      return
    }
    setAdding((a) => {
      const next = !a
      if (!next) armTap(false)
      return next
    })
    setShowFilter(false)
    setShowTrack(false)
    setGeoError(null)
  }
  const toggleTrack = () => {
    if (recording) return // don't hide an active recording
    // Recording a trail writes to the shared backend — require sign-in first.
    if (!user && !showTrack) {
      setShowAuth(true)
      return
    }
    setShowTrack((s) => !s)
    setShowFilter(false)
    setAdding(false)
    armTap(false)
  }

  function toggleSatellite() {
    const next = !satellite
    setSatellite(next)
    map.current?.setLayoutProperty('satellite', 'visibility', next ? 'visible' : 'none')
  }

  async function downloadThisArea() {
    if (!map.current || dl?.running) return
    setDl({ running: true, done: 0, total: 0 })
    try {
      await downloadArea(map.current, {
        onProgress: (done, total) => setDl({ running: true, done, total }),
      })
      setDl({ running: false, finished: true })
      setTimeout(() => setDl(null), 3000)
    } catch (e) {
      setDl(null)
      alert(`Couldn't save this area: ${e.message || e}`)
    }
  }

  const dlLabel = !dl
    ? '⬇ Save area offline'
    : dl.finished
      ? 'Saved offline ✓'
      : `Saving… ${dl.done}/${dl.total || '…'}`

  const counts = getFilteredCounts(filter)
  const filtered = !isDefaultFilter(filter)

  const handleFilterChange = (next) => {
    setFilter(next)
    closeSheets()
  }

  function closeSheets() {
    setSelectedWall(null)
    setSelectedRoute(null)
    setSelectedTrack(null)
  }

  // Tapping empty map dismisses any open view/edit sheet. Only setters/refs so
  // it's safe to call from the map click handler captured at mount.
  function dismissOpenSheets() {
    setSelectedWall(null)
    setSelectedRoute(null)
    setSelectedTrack(null)
    clearMarker()
    setDraft(null)
  }

  const wallTracks = selectedWall ? getTracksForWall(selectedWall.id, tracks) : []

  return (
    <div id="app">
      <header id="top-bar">
        <h1>Western Slope Climbing</h1>
        <button
          className={`account-btn ${user ? 'active' : ''}`}
          onClick={() => setShowAuth(true)}
          title={user ? displayName(user) : 'Sign in'}
        >
          {user ? displayName(user)[0].toUpperCase() : 'Sign in'}
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
        />
      )}
      {locating && (
        <div className="filter-panel">
          <div className="filter-group">
            <span className="filter-label">Fix location — {locating.name}</span>
            <p className="record-hint">Drag the green pin onto the wall, or use your location if you're there.</p>
          </div>
          <div className="place-actions">
            <button className="place-btn primary" onClick={fixUseMyLocation}>📍 Use my location</button>
            <button className="place-btn" onClick={saveFixLocation}>Save location</button>
            <button className="reset" onClick={cancelFixLocation}>Cancel</button>
          </div>
          {geoError && <p className="place-error">{geoError}</p>}
        </div>
      )}
      {(showTrack || recording) && (
        <TrackRecordPanel
          recording={recording}
          stats={recStats}
          onStart={startRecording}
          onStop={stopRecording}
          onDiscard={discardRecording}
          wakeWarning={wakeWarning}
        />
      )}
      {!showTrack && !recording && geoError && (
        <p className="floating-error">{geoError}</p>
      )}

      <div id="map" ref={mapContainer} />

      <button
        className="offline-btn"
        onClick={downloadThisArea}
        disabled={dl?.running}
      >
        {dlLabel}
      </button>

      <button
        className={`basemap-btn ${satellite ? 'active' : ''}`}
        onClick={toggleSatellite}
      >
        {satellite ? '🗺 Street' : '🛰 Satellite'}
      </button>

      <nav id="action-bar">
        <button className={`action-btn ${filtered ? 'active' : ''}`} onClick={toggleFilter}>
          <span className="action-icon">⛃</span>
          Filter{filtered ? ' •' : ''}
        </button>
        <button className={`action-btn ${adding ? 'active' : ''}`} onClick={toggleAdd}>
          <span className="action-icon">＋</span>
          Pin
        </button>
        <button
          className={`action-btn ${showTrack || recording ? 'active' : ''}`}
          onClick={toggleTrack}
        >
          <span className="action-icon">🥾</span>
          Trail
        </button>
      </nav>

      {draft && (
        <PinEditSheet
          pin={draft.pin}
          isNew={draft.isNew}
          onSave={savePin}
          onDelete={removePin}
          onCancel={cancelDraft}
        />
      )}
      {!draft && saveDraft && (
        <TrackSaveSheet
          startCandidates={saveDraft.startCandidates}
          endCandidates={saveDraft.endCandidates}
          onSave={saveTrack}
          onDiscard={discardRecording}
        />
      )}
      {!draft && !saveDraft && selectedTrack && (
        <TrackSheet
          track={selectedTrack}
          pins={pins}
          onAnchorTap={handleAnchorTap}
          onDelete={removeTrack}
          onClose={() => setSelectedTrack(null)}
        />
      )}
      {!draft && !saveDraft && !selectedTrack && selectedRoute && selectedWall && (
        <RouteDetail
          route={selectedRoute}
          wall={selectedWall}
          onBack={() => setSelectedRoute(null)}
          onClose={closeSheets}
        />
      )}
      {!draft && !saveDraft && !selectedTrack && selectedWall && !selectedRoute && (
        <WallSheet
          wall={selectedWall}
          tracks={wallTracks}
          canEdit={!!user}
          onOpenTrack={openWallTrack}
          onSelectRoute={setSelectedRoute}
          onFixLocation={startFixLocation}
          onResetLocation={resetWallLocation}
          onClose={closeSheets}
        />
      )}

      {showAuth && <AuthSheet onClose={() => setShowAuth(false)} />}
    </div>
  )
}
