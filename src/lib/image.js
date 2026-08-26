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

/** Fails with a tagged error so the UI can say which step actually broke. */
function fail(step, detail) {
  const err = new Error('unsupported-image')
  err.step = step
  if (detail) err.detail = detail
  return err
}

async function decode(file) {
  const tried = []
  // Preferred: honours EXIF orientation, so portrait photos aren't sideways.
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch (e) {
    tried.push(`bitmap+exif: ${e.name}`) // older Safari rejects the options bag
  }
  try {
    return await createImageBitmap(file)
  } catch (e) {
    tried.push(`bitmap: ${e.name}`) // a format the bitmap decoder refuses, e.g. HEIC
  }
  // Widest support. Modern browsers already apply EXIF orientation here.
  try {
    return await decodeViaImgElement(file)
  } catch (e) {
    tried.push(`img: ${e.name}`)
    throw fail('decode', tried.join(' / '))
  }
}

export async function downscaleImage(file, maxDim = 1600, quality = 0.8) {
  if (!file) throw fail('no-file')
  // An iPhone photo that still lives in iCloud, and hasn't been downloaded to
  // the device, can hand back an empty or unreadable file. That is a different
  // problem from an unsupported format and needs different advice.
  if (file.size === 0) throw fail('empty')

  const source = await decode(file)
  const srcW = source.width || source.naturalWidth
  const srcH = source.height || source.naturalHeight
  if (!srcW || !srcH) throw fail('decode', 'zero dimensions')

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
      (blob) => (blob ? resolve(blob) : reject(fail('encode'))),
      'image/jpeg',
      quality
    )
  })
}

/**
 * Turn a photo failure into something a climber can act on. Browser text like
 * "The source image could not be decoded" tells them nothing about what to do.
 *
 * `file` is optional and only used to append a short technical tail, so that a
 * bug report carries what actually went wrong instead of just the symptom.
 */
export function photoErrorMessage(err, file) {
  const raw = String(err?.message || err || '')
  const step = err?.step
  let msg

  if (step === 'empty') {
    msg =
      "That photo didn't load from your library. If it's stored in iCloud, open it in the Photos app first so it downloads to the phone, then try again."
  } else if (step === 'no-file') {
    msg = 'No photo was selected.'
  } else if (step === 'decode' || raw === 'unsupported-image' || /decode|decoded|not supported/i.test(raw)) {
    msg = "That photo's format isn't supported. Try taking a new photo, or pick a JPEG or PNG."
  } else if (/exceeded the maximum allowed size|payload too large|413/i.test(raw)) {
    msg = 'That photo is too large. Try taking a new one rather than sending a full-resolution file.'
  } else if (/row-level security|violates|policy/i.test(raw)) {
    msg = "Couldn't save that photo. You may have hit the hourly limit; try again shortly."
  } else if (/fetch|network|offline/i.test(raw)) {
    msg = 'No connection, so the photo could not upload. Photos need signal; notes and pins do not.'
  } else {
    msg = `Couldn't add that photo: ${raw}`
  }

  // A compact tail: enough to diagnose a report without a debugging session.
  const bits = []
  if (file) bits.push(file.type || 'unknown type', `${Math.round((file.size || 0) / 1024)} KB`)
  if (step) bits.push(step)
  if (err?.detail) bits.push(err.detail)
  return bits.length ? `${msg} (${bits.join(', ')})` : msg
}
