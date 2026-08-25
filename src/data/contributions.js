// Read-only admin feed: the most recent contributions across all shared tables
// (notes, photos, ticks, pins, tracks, wall location overrides). This is the
// "tracked" half of moderation. Cole can see what everyone is adding/changing.
// The "undoable" half (soft-delete + revert) needs a migration and lands later.
//
// Gated in the UI to VITE_ADMIN_USER_ID; this module just reads. UI goes through
// these functions, never Supabase directly (CLAUDE.md rule 2).

import { supabase } from './supabase'
import { getDisplayNames } from './auth'

// How many rows to pull from each table before merging (newest first).
const PER_TABLE = 25

// Each table contributes rows in a common shape: { id, kind, authorId, createdAt,
// summary, target } where target (optional) lets the UI deep-link to a route/wall.
// Most tables key on `id`; wall_overrides keys on `wall_id`.
const SOURCES = [
  {
    table: 'notes',
    kind: 'note',
    pk: 'id',
    map: (r) => ({
      summary: `Note on ${r.target_kind}: “${(r.text || '').slice(0, 60)}”`,
      target: { kind: r.target_kind, id: r.target_id },
    }),
  },
  {
    table: 'photos',
    kind: 'photo',
    pk: 'id',
    map: (r) => ({
      summary: `Photo on ${r.target_kind}${r.caption ? `: “${r.caption.slice(0, 50)}”` : ''}`,
      target: { kind: r.target_kind, id: r.target_id },
    }),
  },
  {
    table: 'ticks',
    kind: 'tick',
    pk: 'id',
    map: (r) => ({
      summary: `Logged an ascent${r.style ? ` (${r.style})` : ''}`,
      target: { kind: 'route', id: r.route_id },
    }),
  },
  {
    table: 'pins',
    kind: 'pin',
    pk: 'id',
    map: (r) => ({ summary: `Pin: ${r.category}${r.label ? `, ${r.label}` : ''}` }),
  },
  {
    table: 'tracks',
    kind: 'track',
    pk: 'id',
    map: (r) => ({ summary: `Trail${r.name ? `: ${r.name}` : ''}` }),
  },
  {
    table: 'wall_overrides',
    kind: 'override',
    pk: 'wall_id',
    map: (r) => ({ summary: 'Moved a wall location', target: { kind: 'wall', id: r.wall_id } }),
  },
]

// kind -> { table, pk } for the moderation action below.
const BY_KIND = Object.fromEntries(SOURCES.map((s) => [s.kind, s]))

/**
 * Recent contributions across all shared tables, newest first. Read-only.
 * Returns [] when offline or unconfigured.
 */
export async function getRecentContributions({ limit = 60 } = {}) {
  if (!supabase) return []

  const settled = await Promise.all(
    SOURCES.map(async (src) => {
      const { data, error } = await supabase
        .from(src.table)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(PER_TABLE)
      if (error) {
        console.warn(`contributions: ${src.table} failed:`, error.message)
        return []
      }
      return (data || []).map((r) => ({
        id: `${src.kind}:${r[src.pk]}`,
        kind: src.kind,
        rawId: r[src.pk], // primary-key value, for the moderation action
        authorId: r.author_id,
        createdAt: r.created_at,
        deletedAt: r.deleted_at || null,
        ...src.map(r),
      }))
    })
  )

  const merged = settled
    .flat()
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, limit)

  const names = await getDisplayNames(merged.map((r) => r.authorId))
  return merged.map((r) => ({ ...r, authorName: names[r.authorId] || 'a climber' }))
}

/**
 * Admin moderation: soft-delete a contribution (deleted=true) or restore it
 * (deleted=false). Server-side RLS enforces that only the admin can do this,
 * this just stamps/clears deleted_at; nothing is hard-deleted.
 */
export async function setContributionDeleted(kind, rawId, deleted) {
  const src = BY_KIND[kind]
  if (!src || !supabase) return
  const { error } = await supabase
    .from(src.table)
    .update({ deleted_at: deleted ? new Date().toISOString() : null })
    .eq(src.pk, rawId)
  if (error) throw error
}
