// Hand off driving directions to the phone's native maps app (Google Maps on
// Android/iOS, falls back to the web). We don't do in-app turn-by-turn — the OS
// maps app already does it well and for free. This gets you to the parking pin;
// the recorded approach trail covers the off-road last stretch.

export function openDirections(lat, lng) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
  window.open(url, '_blank', 'noopener')
}
