// Reusable "beta" block for a route or wall: a shared timestamped NOTE THREAD
// plus shared PHOTO attachments. Dropped into both RouteDetail and WallSheet.
// Both notes and photos live in Supabase now (everyone reads; signed-in users
// contribute; you can delete your own).

import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getNotes, addNote, deleteNote, getPhotos, addPhoto, deletePhoto } from '../data/notes'
import { downscaleImage } from '../lib/image'

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function NotesPhotos({ kind, id }) {
  const { user } = useAuth()
  const [notes, setNotes] = useState([])
  const [draft, setDraft] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [noteError, setNoteError] = useState(null)

  const [photos, setPhotos] = useState([]) // { id, url, authorId }
  const [busy, setBusy] = useState(false)
  const [viewer, setViewer] = useState(null)
  const [photoError, setPhotoError] = useState(null)

  useEffect(() => {
    let alive = true
    getNotes(kind, id).then((rows) => alive && setNotes(rows))
    getPhotos(kind, id).then((rows) => alive && setPhotos(rows))
    return () => {
      alive = false
    }
  }, [kind, id])

  async function postNote() {
    if (!draft.trim()) return
    setSavingNote(true)
    setNoteError(null)
    try {
      await addNote(kind, id, draft)
      setDraft('')
      setNotes(await getNotes(kind, id))
    } catch (e) {
      setNoteError(e.message || String(e))
    } finally {
      setSavingNote(false)
    }
  }

  async function removeNote(noteId) {
    await deleteNote(noteId)
    setNotes(await getNotes(kind, id))
  }

  async function onPickFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setPhotoError(null)
    try {
      const blob = await downscaleImage(file)
      await addPhoto(kind, id, blob)
      setPhotos(await getPhotos(kind, id))
    } catch (err) {
      setPhotoError(`Couldn't add that photo: ${err.message || err}`)
    } finally {
      setBusy(false)
    }
  }

  async function removePhoto(photoId) {
    await deletePhoto(photoId)
    setViewer(null)
    setPhotos(await getPhotos(kind, id))
  }

  return (
    <section className="notes-photos">
      <h3>Notes</h3>

      {user ? (
        <div className="note-compose">
          <textarea
            className="pin-textarea"
            value={draft}
            placeholder="Add beta — sequence, gear, conditions, where to find it…"
            rows={2}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button className="pin-save" disabled={savingNote || !draft.trim()} onClick={postNote}>
            {savingNote ? 'Posting…' : 'Post note'}
          </button>
        </div>
      ) : (
        <p className="auth-intro">Sign in to add notes or photos.</p>
      )}
      {noteError && <p className="place-error">{noteError}</p>}

      {notes.length > 0 ? (
        <ul className="note-thread">
          {notes.map((n) => (
            <li key={n.id} className="note-item">
              <div className="note-meta">
                <strong>{n.authorName}</strong>
                <span className="note-date">{formatDate(n.createdAt)}</span>
                {user && n.authorId === user.id && (
                  <button className="note-delete" onClick={() => removeNote(n.id)}>
                    Delete
                  </button>
                )}
              </div>
              <p className="note-text">{n.text}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="detail-desc muted">No notes yet.</p>
      )}

      <h3 className="photos-heading">Photos</h3>
      <div className="photo-grid">
        {photos.map((p) => (
          <button key={p.id} className="photo-thumb" onClick={() => setViewer(p)}>
            <img src={p.url} alt="" loading="lazy" />
          </button>
        ))}
        {user && (
          <label className={`photo-add ${busy ? 'is-busy' : ''}`}>
            {busy ? '…' : '＋ Photo'}
            <input
              type="file"
              accept="image/*"
              className="visually-hidden"
              disabled={busy}
              onChange={onPickFile}
            />
          </label>
        )}
      </div>
      {photos.length === 0 && !user && <p className="detail-desc muted">No photos yet.</p>}
      {photoError && <p className="place-error">{photoError}</p>}

      {viewer && (
        <div className="photo-viewer" onClick={() => setViewer(null)}>
          <img src={viewer.url} alt="" onClick={(e) => e.stopPropagation()} />
          <div className="photo-viewer-actions" onClick={(e) => e.stopPropagation()}>
            {user && viewer.authorId === user.id && (
              <button className="pin-delete" onClick={() => removePhoto(viewer.id)}>
                Delete photo
              </button>
            )}
            <button className="reset" onClick={() => setViewer(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
