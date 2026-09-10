// ============================================================
// Weather data layer — Open-Meteo (free, no API key)
// Two endpoints:
//   geocoding-api.open-meteo.com  -> city name to coordinates
//   api.open-meteo.com/v1/forecast -> current + hourly + daily
// We always request metric units and convert on the client so the
// °C/°F toggle is instant (no refetch).
// ============================================================

const GEO = 'https://geocoding-api.open-meteo.com/v1/search'
const FORECAST = 'https://api.open-meteo.com/v1/forecast'

const FORECAST_PARAMS =
  'current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,surface_pressure' +
  '&hourly=temperature_2m,weather_code' +
  '&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset' +
  '&timezone=auto&forecast_days=7'

/** Look up a place by name; returns the best match's coordinates + label. */
export async function geocode(name) {
  const q = name.trim()
  if (!q) throw new Error('Type a city name to search.')

  const res = await fetch(`${GEO}?name=${encodeURIComponent(q)}&count=1&language=en&format=json`)
  if (!res.ok) throw new Error('Search is unavailable right now. Try again in a moment.')

  const data = await res.json()
  if (!data.results || data.results.length === 0) {
    throw new Error(`No place called "${q}". Check the spelling and try again.`)
  }
  return normalizePlace(data.results[0])
}

/**
 * Search for up to `count` matching places — used by the search
 * dropdown so the user can disambiguate (e.g. Florida, US vs
 * Floridablanca, Colombia). Returns [] rather than throwing, since
 * it's called on every keystroke.
 */
export async function searchPlaces(name, count = 5) {
  const q = name.trim()
  if (!q) return []
  try {
    const res = await fetch(`${GEO}?name=${encodeURIComponent(q)}&count=${count}&language=en&format=json`)
    if (!res.ok) return []
    const data = await res.json()
    return (data.results || []).map(normalizePlace)
  } catch {
    return []
  }
}

/** Shape a raw geocoding result into the fields the app uses. */
function normalizePlace(r) {
  return {
    id: r.id,
    lat: r.latitude,
    lon: r.longitude,
    name: r.name,
    // e.g. "Prague, Czechia" or "Florida, United States"
    region: [r.admin1, r.country].filter(Boolean).join(', '),
    countryCode: r.country_code,
  }
}

/** Fetch the full forecast for a set of coordinates. */
export async function fetchForecast({ lat, lon, name, region }) {
  const res = await fetch(`${FORECAST}?latitude=${lat}&longitude=${lon}&${FORECAST_PARAMS}`)
  if (!res.ok) throw new Error('Could not load the forecast. Try again in a moment.')
  const data = await res.json()
  return { place: { name, region }, ...data }
}

/** Convenience: search a city and get its forecast in one call. */
export async function getWeatherByCity(name) {
  const place = await geocode(name)
  return fetchForecast(place)
}

/** Get the forecast for the browser's current position. */
export function getWeatherByGeolocation() {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Your browser does not support location access.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve(
          fetchForecast({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            name: 'Your location',
            region: '',
          })
        ),
      () =>
        reject(
          new Error('Location access was blocked. Allow it in your browser, or search for a city.')
        ),
      { timeout: 10000 }
    )
  })
}

// ---- unit conversion + formatting -------------------------------------
export const cToF = (c) => (c * 9) / 5 + 32
export const kmhToMph = (k) => k * 0.621371

/** Round a Celsius value into the chosen unit, no degree symbol. */
export function toUnit(celsius, unit) {
  return Math.round(unit === 'f' ? cToF(celsius) : celsius)
}

/** Short weekday label from an ISO date string, e.g. "Mon". */
export function dayName(iso) {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short' })
}

/** Hour label like "3 PM" from an ISO datetime. */
export function hourLabel(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric' })
}

// ---- WMO weather code interpretation ----------------------------------
// Each code maps to a human label, an icon type (see WeatherIcon), and a
// theme key that drives the background gradient.
const CODES = {
  0: { label: 'Clear sky', icon: 'clear', theme: 'clear' },
  1: { label: 'Mainly clear', icon: 'clear', theme: 'clear' },
  2: { label: 'Partly cloudy', icon: 'partly', theme: 'clouds' },
  3: { label: 'Overcast', icon: 'cloud', theme: 'clouds' },
  45: { label: 'Fog', icon: 'fog', theme: 'fog' },
  48: { label: 'Rime fog', icon: 'fog', theme: 'fog' },
  51: { label: 'Light drizzle', icon: 'rain', theme: 'rain' },
  53: { label: 'Drizzle', icon: 'rain', theme: 'rain' },
  55: { label: 'Heavy drizzle', icon: 'rain', theme: 'rain' },
  56: { label: 'Freezing drizzle', icon: 'rain', theme: 'rain' },
  57: { label: 'Freezing drizzle', icon: 'rain', theme: 'rain' },
  61: { label: 'Light rain', icon: 'rain', theme: 'rain' },
  63: { label: 'Rain', icon: 'rain', theme: 'rain' },
  65: { label: 'Heavy rain', icon: 'rain', theme: 'rain' },
  66: { label: 'Freezing rain', icon: 'rain', theme: 'rain' },
  67: { label: 'Freezing rain', icon: 'rain', theme: 'rain' },
  71: { label: 'Light snow', icon: 'snow', theme: 'snow' },
  73: { label: 'Snow', icon: 'snow', theme: 'snow' },
  75: { label: 'Heavy snow', icon: 'snow', theme: 'snow' },
  77: { label: 'Snow grains', icon: 'snow', theme: 'snow' },
  80: { label: 'Rain showers', icon: 'rain', theme: 'rain' },
  81: { label: 'Rain showers', icon: 'rain', theme: 'rain' },
  82: { label: 'Heavy showers', icon: 'rain', theme: 'rain' },
  85: { label: 'Snow showers', icon: 'snow', theme: 'snow' },
  86: { label: 'Snow showers', icon: 'snow', theme: 'snow' },
  95: { label: 'Thunderstorm', icon: 'storm', theme: 'storm' },
  96: { label: 'Thunderstorm', icon: 'storm', theme: 'storm' },
  99: { label: 'Thunderstorm', icon: 'storm', theme: 'storm' },
}

/**
 * Interpret a WMO code into { label, icon, theme }.
 * isDay flips clear/partly icons to their night variants and the
 * theme to its night gradient.
 */
export function describeWeather(code, isDay = true) {
  const base = CODES[code] || { label: 'Unknown', icon: 'cloud', theme: 'clouds' }
  let icon = base.icon
  let theme = base.theme
  if (!isDay) {
    if (icon === 'clear') icon = 'clear-night'
    if (icon === 'partly') icon = 'partly-night'
    if (theme === 'clear') theme = 'clear-night'
    if (theme === 'clouds') theme = 'clouds-night'
  }
  return { label: base.label, icon, theme }
}

// Background gradients keyed by theme. The app applies these to a
// fixed layer behind everything and transitions between them.
export const THEME_GRADIENTS = {
  clear: 'linear-gradient(160deg, #2e6bb8 0%, #4f9fd6 55%, #8fd0ef 100%)',
  'clear-night': 'linear-gradient(160deg, #0a1636 0%, #17265a 55%, #2a3d78 100%)',
  clouds: 'linear-gradient(160deg, #566d84 0%, #7890a6 55%, #9db2c6 100%)',
  'clouds-night': 'linear-gradient(160deg, #171d2a 0%, #29323f 55%, #3a4655 100%)',
  rain: 'linear-gradient(160deg, #2f3d4c 0%, #45586b 55%, #5b7286 100%)',
  snow: 'linear-gradient(160deg, #5a7590 0%, #7c9ab4 55%, #a7c3d8 100%)',
  storm: 'linear-gradient(160deg, #1c212c 0%, #303849 55%, #454f66 100%)',
  fog: 'linear-gradient(160deg, #55606c 0%, #74808c 55%, #97a2ad 100%)',
}

/**
 * Describe the animated sky for a theme: how many clouds, whether
 * they're light or dark, what precipitation falls, and any extra
 * (sun glow, stars, lightning, fog bands).
 */
export function skyScene(theme) {
  switch (theme) {
    case 'clear':
      return { clouds: 3, tint: 'light', precip: 'none', extra: 'sun' }
    case 'clear-night':
      return { clouds: 2, tint: 'light', precip: 'none', extra: 'stars' }
    case 'clouds':
      return { clouds: 6, tint: 'light', precip: 'none', extra: null }
    case 'clouds-night':
      return { clouds: 6, tint: 'dark', precip: 'none', extra: 'stars' }
    case 'rain':
      return { clouds: 6, tint: 'dark', precip: 'rain', extra: null }
    case 'snow':
      return { clouds: 5, tint: 'light', precip: 'snow', extra: null }
    case 'storm':
      return { clouds: 7, tint: 'dark', precip: 'rain', extra: 'lightning' }
    case 'fog':
      return { clouds: 3, tint: 'light', precip: 'none', extra: 'fog' }
    default:
      return { clouds: 4, tint: 'light', precip: 'none', extra: null }
  }
}

/**
 * Build the next 24 hours of { time, temp, code } starting at the
 * current hour, from the API's hourly arrays.
 */
export function next24Hours(hourly, currentTime) {
  if (!hourly?.time) return []
  let start = hourly.time.indexOf(currentTime)
  if (start === -1) {
    // Fall back to the first hour at or after "now".
    const now = Date.now()
    start = hourly.time.findIndex((t) => new Date(t).getTime() >= now)
    if (start === -1) start = 0
  }
  return hourly.time.slice(start, start + 24).map((time, i) => ({
    time,
    temp: hourly.temperature_2m[start + i],
    code: hourly.weather_code[start + i],
  }))
}
