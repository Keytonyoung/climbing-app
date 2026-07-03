// Reusable "beta" block for a route or wall: a shared timestamped NOTE THREAD
// plus shared PHOTO attachments. Dropped into both RouteDetail and WallSheet.
// Both notes and photos live in Supabase now (everyone reads; signed-in users
// contribute; you can delete your own).

import Icon from './Icon'
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import {
  getNotes,
  addNote,
  deleteNote,
  getPhotos,
  addPhoto,
  deletePhoto,
  setPhotoCaption,
} from '../data/notes'
import { setContributionDeleted } from '../data/contributions'
import { reportContent } from '../data/reports'
import { track, EVENTS } from '../lib/analytics'
import { downscaleImage } from '../lib/image'

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function NotesPhotos({ kind, id }) {
  const { user } = useAuth()
  // Admin sees a "Remove" control on others' notes/photos (soft-delete; the
  // server enforces the real permission via is_admin() RLS).
  const isAdmin = !!user && user.id === import.meta.env.VITE_ADMIN_USER_ID
  const [notes, setNotes] = useState([])
  const [draft, setDraft] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [noteError, setNoteError] = useState(null)

  const [photos, setPhotos] = useState([]) // { id, url, authorId, caption }
  const [busy, setBusy] = useState(false)
  const [viewer, setViewer] = useState(null)
  const [captionDraft, setCaptionDraft] = useState('')

  function openViewer(p) {
    setViewer(p)
    setCaptionDraft(p.caption || '')
  }
  async function saveCaption() {
    await setPhotoCaption(viewer.id, captionDraft)
    setViewer({ ...viewer, caption: captionDraft.trim() })
    setPhotos(await getPhotos(kind, id))
  }
  const [photoError, setPhotoError] = useState(null)

  useEffect(() => {
    let alive = true
    getNotes(kind, id).then((rows) => alive && setNotes(rows))
    getPhotos(kind, id).then((rows) => alive && setPhotos(rows))
    return () => {
      alive = false
    }
  }, [kind, id])

  // Flag someone else's note/photo for moderation (signed-in, non-owner).
  async function report(targetKind, targetId) {
    if (!confirm('Report this to the moderators as inappropriate or inaccurate?')) return
    try {
      await reportContent(targetKind, targetId)
      alert('Thanks — reported. We’ll take a look.')
    } catch (e) {
      alert(`Couldn’t report: ${e.message || e}`)
    }
  }

  async function postNote() {
    if (!draft.trim()) return
    setSavingNote(true)
    setNoteError(null)
    try {
      await addNote(kind, id, draft)
      track(EVENTS.CONTRIBUTION_CREATED, { type: 'note' })
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

  // Admin moderation: soft-delete someone else's note (reversible from the
  // admin "Recent contributions" view). Hidden behind a confirm.
  async function adminRemoveNote(noteId) {
    if (!confirm('Remove this note for everyone? You can undo it from the admin view.')) return
    await setContributionDeleted('note', noteId, true)
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
      track(EVENTS.CONTRIBUTION_CREATED, { type: 'photo' })
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

  // Admin moderation: soft-delete someone else's photo (reversible from the
  // admin "Recent contributions" view). Hidden behind a confirm.
  async function adminRemovePhoto(photoId) {
    if (!confirm('Remove this photo for everyone? You can undo it from the admin view.')) return
    await setContributionDeleted('photo', photoId, true)
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
                {isAdmin && n.authorId !== user.id && (
                  <button className="note-delete admin" onClick={() => adminRemoveNote(n.id)}>
                    Remove
                  </button>
                )}
                {user && n.authorId !== user.id && !isAdmin && (
                  <button className="note-report" onClick={() => report('note', n.id)}>
                    Report
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
          <button key={p.id} className="photo-thumb" onClick={() => openViewer(p)}>
            <img src={p.url} alt="" loading="lazy" />
          </button>
        ))}
        {user && (
          <label className={`photo-add ${busy ? 'is-busy' : ''}`}>
            {busy ? '…' : <><Icon name="camera" size={16} /> Photo</>}
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
            {user && viewer.authorId === user.id ? (
              <div className="caption-edit">
                <input
                  className="pin-input"
                  type="text"
                  placeholder="Add a caption…"
                  value={captionDraft}
                  onChange={(e) => setCaptionDraft(e.target.value)}
                />
                {captionDraft.trim() !== (viewer.caption || '') && (
                  <button className="pin-save" onClick={saveCaption}>Save caption</button>
                )}
              </div>
            ) : (
              viewer.caption && <p className="photo-caption">{viewer.caption}</p>
            )}
            {user && viewer.authorId === user.id && (
              <button className="pin-delete" onClick={() => removePhoto(viewer.id)}>
                Delete photo
              </button>
            )}
            {isAdmin && viewer.authorId !== user.id && (
              <button className="pin-delete" onClick={() => adminRemovePhoto(viewer.id)}>
                Remove photo (admin)
              </button>
            )}
            {user && viewer.authorId !== user.id && !isAdmin && (
              <button className="reset" onClick={() => report('photo', viewer.id)}>
                Report photo
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
