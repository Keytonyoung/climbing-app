// @vitest-environment jsdom
//
// Renders the wall sheet to markup so the contribution invitation can be
// checked without a browser: an empty crag must read as an opportunity ("be
// the first"), a filled-in one must credit whoever added it, and the way to
// contribute must be present either way.
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import WallSheet from '../src/components/WallSheet'

const WALL = {
  id: 'w1',
  name: 'Otis Boulder',
  path: 'Unaweep Canyon › Nine Mile Hill',
  lng: -108.72,
  lat: 38.79,
  routes: [{ id: 'r1', name: 'Daughters of Water Art', grade: 'V2', type: 'boulder' }],
}

const noop = () => {}
function render(props) {
  return renderToStaticMarkup(
    <WallSheet
      wall={WALL}
      onOpenPin={noop}
      onAddAccess={noop}
      onOpenTrack={noop}
      onSelectRoute={noop}
      onFixLocation={noop}
      onResetLocation={noop}
      onClose={noop}
      {...props}
    />
  )
}

describe('wall sheet: contributing access', () => {
  it('invites the first contribution when a crag has no access beta', () => {
    const html = render({ access: [], tracks: [] })
    expect(html).toContain('Know how to get to Otis Boulder?')
    expect(html).toContain('be the first') // apostrophes come back HTML-escaped
    expect(html).toContain('Add parking or a trailhead')
  })

  it('drops the invitation once someone has added access, but keeps the way in', () => {
    const html = render({
      access: [
        {
          pin: { id: 'p1', category: 'parking', label: 'Main lot', authorName: 'Cole' },
          distance: 400,
          linked: false,
        },
      ],
      tracks: [],
    })
    expect(html).not.toContain('be the first')
    expect(html).toContain('Add parking or a trailhead') // still contributable
  })

  it('credits the climber who added the access by name', () => {
    const html = render({
      access: [
        {
          pin: { id: 'p1', category: 'parking', label: 'Main lot', authorName: 'Cole' },
          distance: 400,
          linked: true,
        },
      ],
      tracks: [{ id: 't1', name: 'Approach', authorName: 'Dana' }],
    })
    expect(html).toContain('Cole')
    expect(html).toContain('Dana')
  })

  it('pluralizes the route count', () => {
    expect(render({})).toContain('1 route<')
  })
})
