import { describe, it, expect } from 'vitest'
import { nextOutboxState, MAX_ATTEMPTS } from '../src/data/sync'

describe('nextOutboxState (outbox poison-message guard)', () => {
  it('pauses (retries) before the attempt limit', () => {
    const { action, record } = nextOutboxState({ id: 'a', op: 'insert' }, 'network')
    expect(action).toBe('pause')
    expect(record.attempts).toBe(1)
    expect(record.failed).toBeUndefined()
  })

  it('counts attempts up from an existing value', () => {
    const { action, record } = nextOutboxState({ id: 'a', attempts: 2 }, 'network')
    expect(action).toBe('pause')
    expect(record.attempts).toBe(3)
  })

  it('quarantines once it reaches the attempt limit', () => {
    const { action, record } = nextOutboxState({ id: 'a', attempts: MAX_ATTEMPTS - 1 }, 'RLS denied')
    expect(action).toBe('quarantine')
    expect(record.failed).toBe(true)
    expect(record.attempts).toBe(MAX_ATTEMPTS)
    expect(record.lastError).toBe('RLS denied')
  })
})
