// Rasterize the app icon SVG into the PNGs PWAs use for the home screen
// (iOS apple-touch-icon + Android/Chrome manifest icons). Pure-WASM renderer,
// so no native binaries. Run: node scripts/gen-icons.mjs
import { initWasm, Resvg } from '@resvg/resvg-wasm'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const pub = join(here, '..', 'public')

await initWasm(await readFile(join(here, '..', 'node_modules', '@resvg', 'resvg-wasm', 'index_bg.wasm')))
const svg = await readFile(join(pub, 'icon-192.svg'), 'utf8')

const sizes = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]
for (const [name, size] of sizes) {
  const r = new Resvg(svg, { fitTo: { mode: 'width', value: size } })
  await writeFile(join(pub, name), r.render().asPng())
  console.log(`wrote ${name} (${size}x${size})`)
}
