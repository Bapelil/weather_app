# Skyglass — Weather Dashboard

A glassy weather app that shows current conditions, a 24-hour temperature curve, and a 7-day forecast for any city — or for your current location. The background shifts to match the live weather. Built with **React** and the free **Open-Meteo API** (no API key needed).

> **Live demo:** (https://weatherappbapl.vercel.app)


---

## Features

- **City search with autocomplete** — a debounced dropdown of matching places lets you pick the right one (e.g. Florida, US vs Floridablanca, Colombia), with full keyboard navigation.
- **Animated sky** — clouds drift across the background and match the live weather: rain and snow fall, stars twinkle at night, the sun glows on clear days, and lightning flashes in storms.
- **Use my location** — one tap uses the browser's Geolocation API, with a clear message if permission is denied.
- **Current conditions** — temperature, feels-like, humidity, wind, and pressure, with a matching weather icon.
- **24-hour temperature curve** — a smooth SVG chart, hand-drawn (no charting library).
- **7-day forecast** — daily high/low with a bar showing each day against the week's range.
- **Dynamic sky** — the background gradient changes with the weather and time of day (clear, cloudy, rain, snow, storm, fog; day and night variants).
- **°C / °F toggle** — instant, no refetch (units are converted on the client).
- **Graceful states** — loading spinner, clear errors, and responsive layout down to mobile.

## Tech stack

| Area       | Choice                                             |
| ---------- | -------------------------------------------------- |
| Framework  | React 18 (function components + Hooks)             |
| Build tool | Vite                                               |
| Data       | [Open-Meteo](https://open-meteo.com) — free, no key |
| Styling    | Plain CSS with `backdrop-filter` glass effects     |
| Charts     | Hand-built inline SVG                               |
| Fonts      | Bricolage Grotesque + Inter                        |

No API key, no libraries beyond React — the icons and chart are built from scratch, which keeps the bundle small and shows the underlying work.

## Getting started

You'll need [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install     # install dependencies
npm run dev     # start the dev server (usually http://localhost:5173)
```

To build for production:

```bash
npm run build   # outputs to /dist
npm run preview # preview that build locally
```

## How it works

The data layer lives in [`src/weather.js`](./src/weather.js), separate from the UI:

1. **Search** hits the geocoding endpoint to turn a city name into coordinates, then the forecast endpoint returns current, hourly, and daily data in one request.
2. **Weather codes** (the WMO standard Open-Meteo uses) are mapped to a label, an icon, and a background theme in `describeWeather()`.
3. **Units** are always fetched in metric and converted on the client, so the °C/°F switch is instant.

```
src/
├── App.jsx                 # state, loading, and the dynamic sky
├── weather.js              # API calls, unit conversion, weather-code map
├── index.css               # glass design system
└── components/
    ├── SearchBar.jsx        # debounced autocomplete dropdown
    ├── Sky.jsx              # animated clouds / rain / snow / stars
    ├── CurrentWeather.jsx
    ├── HourlyChart.jsx      # the SVG temperature curve
    ├── DailyForecast.jsx
    ├── WeatherIcon.jsx      # hand-built SVG weather icons
    └── Icons.jsx            # small UI icons
```

## Deploying

**Vercel / Netlify:** import the repo and accept the defaults — both detect Vite automatically.

**GitHub Pages:** set `base` to `'/glass-weather/'` in `vite.config.js`, run `npm run build`, and publish the `dist` folder.

## Ideas for going further

- **Reverse geocoding** so "Use my location" shows a city name instead of "Your location."
- **Recent searches** saved in `localStorage`.
- **Air quality** or **UV index** (Open-Meteo has both).
- **Sunrise / sunset** times (already in the API response — just add a card).
- **Deep-link** a city via the URL (`?city=London`) so forecasts are shareable.

## Credits

Weather data by [Open-Meteo](https://open-meteo.com), free for non-commercial use under CC BY 4.0.

## License

MIT — do whatever you like with it.
