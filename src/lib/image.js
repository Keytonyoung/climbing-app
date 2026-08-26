// Downscale a user-picked photo before storing it. Phone photos are multiple
// megabytes; capping the long edge and re-encoding as JPEG keeps IndexedDB lean
// and reduces the chance the browser evicts our data under storage pressure.
//
// Decoding is deliberately a fallback chain rather than one call. Two real
// failures produced "The source image could not be decoded" at a crag:
//   - iPhones shoot HEIC. iOS usually transcodes to JPEG when you pick from
//     Photos, but a photo picked through Files (or one an iPhone user sent to
//     an Android phone) arrives as raw HEIC, which createImageBitmap refuses.
//     An <img> element CAN decode it on iOS, because WebKit uses the OS codec.
//   - Older Safari chokes on the options argument to createImageBitmap, so
//     asking for EXIF orientation is enough to make the whole call throw.
// Every step below decodes strictly more formats than the one before it.

/** Decode via an <img> element, which uses the browser's full image pipeline. */
function decodeViaImgElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('unsupported-image'))
    }
    img.src = url
  })
}

async function decode(file) {
  // Preferred: honours EXIF orientation, so portrait photos aren't sideways.
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    /* older Safari rejects the options argument outright */
  }
  try {
    return await createImageBitmap(file)
  } catch {
    /* format the bitmap decoder doesn't know, e.g. HEIC */
  }
  // Widest support. Modern browsers already apply EXIF orientation here.
  return decodeViaImgElement(file)
}

export async function downscaleImage(file, maxDim = 1600, quality = 0.8) {
  if (!file || file.size === 0) throw new Error('unsupported-image')

  const source = await decode(file)
  const srcW = source.width || source.naturalWidth
  const srcH = source.height || source.naturalHeight
  if (!srcW || !srcH) throw new Error('unsupported-image')

  const scale = Math.min(1, maxDim / Math.max(srcW, srcH))
  const w = Math.round(srcW * scale)
  const h = Math.round(srcH * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(source, 0, 0, w, h)
  source.close?.() // ImageBitmap only; the <img> fallback needs no cleanup

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('unsupported-image'))),
      'image/jpeg',
      quality
    )
  })
}

/**
 * Turn a photo failure into something a climber can act on. Browser text like
 * "The source image could not be decoded" tells them nothing about what to do.
 */
export function photoErrorMessage(err) {
  const raw = String(err?.message || err || '')
  if (raw === 'unsupported-image' || /decode|decoded|not supported/i.test(raw)) {
    return "That photo's format isn't supported. Try taking a new photo, or pick a JPEG or PNG."
  }
  if (/exceeded the maximum allowed size|payload too large|413/i.test(raw)) {
    return 'That photo is too large. Try taking a new one rather than sending a full-resolution file.'
  }
  if (/row-level security|violates|policy/i.test(raw)) {
    return "Couldn't save that photo. You may have hit the hourly limit; try again shortly."
  }
  if (/fetch|network|offline/i.test(raw)) {
    return 'No connection, so the photo could not upload. Photos need signal; notes and pins do not.'
  }
  return `Couldn't add that photo: ${raw}`
}
