// Data-layer interface for user reports ("flag this"). Signed-in users flag
// content that's bad/unsafe/spam; admins review via the reports table (RLS in
// supabase/migrations/2026-06-30-stage1-community.sql). This is the community's
// eyes — you can't watch everything alone once strangers arrive.

import { supabase } from './supabase'
import { getCurrentUser } from './auth'

/** File a report against a target (requires sign-in). Online-only — reporting is
 *  a moderation action, not crag-side beta, so it doesn't need the offline queue. */
export async function reportContent(targetKind, targetId, reason = '') {
  const user = await getCurrentUser()
  if (!user) throw new Error('Sign in to report content.')
  if (!supabase) throw new Error('Backend not configured.')
  const { error } = await supabase.from('reports').insert({
    id: crypto.randomUUID(),
    reporter_id: user.id,
    target_kind: targetKind,
    target_id: targetId,
    reason: (reason || '').trim(),
  })
  if (error) throw error
}
