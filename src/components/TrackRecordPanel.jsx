// Trail recording UI shown below the top bar: a pre-record explainer with Start,
// and (while recording) a live banner with stats + Stop / Discard.

import { formatDistance } from '../data/tracks'

function fmtElapsed(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function TrackRecordPanel({
  recording,
  stats,
  onStart,
  onStop,
  onDiscard,
  wakeWarning,
}) {
  if (!recording) {
    return (
      <div className="filter-panel">
        <div className="filter-group">
          <span className="filter-label">Record an approach trail</span>
          <p className="record-hint">
            Walk from your parking spot to the wall with the app open. Your screen
            will stay awake while recording. You’ll link both ends when you stop.
          </p>
        </div>
        <button className="place-btn primary" onClick={onStart}>
          ● Start recording
        </button>
      </div>
    )
  }

  return (
    <div className="filter-panel">
      <div className="record-stats">
        <span className="record-dot" />
        <span className="record-stat">{formatDistance(stats.lengthMeters)}</span>
        <span className="record-stat-sub">{fmtElapsed(stats.elapsedSec)}</span>
        <span className="record-stat-sub">{stats.points} pts</span>
      </div>
      {wakeWarning && <p className="place-error">{wakeWarning}</p>}
      <div className="place-actions">
        <button className="place-btn primary" onClick={onStop}>
          ■ Stop & save
        </button>
        <button className="place-btn" onClick={onDiscard}>
          Discard
        </button>
      </div>
    </div>
  )
}
