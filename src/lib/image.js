// Downscale a user-picked photo before storing it. Phone photos are multiple
// megabytes; capping the long edge and re-encoding as JPEG keeps IndexedDB lean
// and reduces the chance the browser evicts our data under storage pressure.

export async function downscaleImage(file, maxDim = 1600, quality = 0.8) {
  // Respect EXIF orientation so portrait photos aren't rotated.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })

  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Image encode failed'))),
      'image/jpeg',
      quality
    )
  })
}
