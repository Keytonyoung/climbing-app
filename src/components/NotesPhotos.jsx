// Reusable "your beta" block: an editable text note plus photo attachments for a
// target (a route or a wall). Self-contained — loads and persists its own data
// through the notes data layer. Dropped into both RouteDetail and WallSheet.

import { useEffect, useRef, useState } from 'react'
import { getNote, saveNote, getPhotos, addPhoto, deletePhoto } from '../data/notes'
import { downscaleImage } from '../lib/image'

export default function NotesPhotos({ kind, id }) {
  const [text, setText] = useState('')
  const [savedText, setSavedText] = useState('')
  const [photos, setPhotos] = useState([]) // { id, url }
  const [busy, setBusy] = useState(false)
  const [viewer, setViewer] = useState(null) // photo being viewed fullscreen
  const fileRef = useRef(null)
  const urlsRef = useRef([])

  // Load this target's note + photos whenever the target changes.
  useEffect(() => {
    let alive = true
    getNote(kind, id).then((n) => {
      if (!alive) return
      setText(n?.text || '')
      setSavedText(n?.text || '')
    })
    loadPhotos(alive)
    return () => {
      alive = false
      revokeUrls()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, id])

  function revokeUrls() {
    urlsRef.current.forEach((u) => URL.revokeObjectURL(u))
    urlsRef.current = []
  }

  async function loadPhotos(alive = true) {
    const rows = await getPhotos(kind, id)
    if (!alive) return
    revokeUrls()
    const withUrls = rows.map((p) => {
      const url = URL.createObjectURL(p.blob)
      urlsRef.current.push(url)
      return { id: p.id, url }
    })
    setPhotos(withUrls)
  }

  async function saveText() {
    if (text.trim() === savedText.trim()) return
    await saveNote(kind, id, text)
    setSavedText(text.trim())
  }

  async function onPickFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow picking the same file again
    if (!file) return
    setBusy(true)
    try {
      const blob = await downscaleImage(file)
      await addPhoto(kind, id, blob)
      await loadPhotos()
    } finally {
      setBusy(false)
    }
  }

  async function removePhoto(photoId) {
    await deletePhoto(photoId)
    setViewer(null)
    await loadPhotos()
  }

  return (
    <section className="notes-photos">
      <h3>Your notes</h3>
      <textarea
        className="pin-textarea"
        value={text}
        placeholder="Your beta — gear, sequence, where to find it…"
        rows={3}
        onChange={(e) => setText(e.target.value)}
        onBlur={saveText}
      />
      <div className="notes-saverow">
        {text.trim() !== savedText.trim() ? (
          <button className="pin-save" onClick={saveText}>Save note</button>
        ) : (
          savedText && <span className="notes-saved">Saved ✓</span>
        )}
      </div>

      <div className="photo-grid">
        {photos.map((p) => (
          <button key={p.id} className="photo-thumb" onClick={() => setViewer(p)}>
            <img src={p.url} alt="" />
          </button>
        ))}
        <button
          className="photo-add"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          {busy ? '…' : '＋ Photo'}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onPickFile}
      />

      {viewer && (
        <div className="photo-viewer" onClick={() => setViewer(null)}>
          <img src={viewer.url} alt="" onClick={(e) => e.stopPropagation()} />
          <div className="photo-viewer-actions" onClick={(e) => e.stopPropagation()}>
            <button className="pin-delete" onClick={() => removePhoto(viewer.id)}>
              Delete photo
            </button>
            <button className="reset" onClick={() => setViewer(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
