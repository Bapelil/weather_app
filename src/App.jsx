import { useState, useEffect } from 'react'
import SearchBar from './components/SearchBar.jsx'
import Sky from './components/Sky.jsx'
import CurrentWeather from './components/CurrentWeather.jsx'
import HourlyChart from './components/HourlyChart.jsx'
import DailyForecast from './components/DailyForecast.jsx'
import {
  getWeatherByCity,
  fetchForecast,
  getWeatherByGeolocation,
  describeWeather,
  skyScene,
  next24Hours,
  THEME_GRADIENTS,
} from './weather.js'

const DEFAULT_CITY = 'Prague'

export default function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [unit, setUnit] = useState('c') // 'c' or 'f'

  // Run an async loader with shared loading/error handling.
  async function load(promiseFactory) {
    setLoading(true)
    setError(null)
    try {
      setData(await promiseFactory())
    } catch (err) {
      setError(err.message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(() => getWeatherByCity(DEFAULT_CITY))
  }, [])

  // Derive the theme (gradient + scene) from current conditions.
  const theme = data?.current
    ? describeWeather(data.current.weather_code, data.current.is_day === 1).theme
    : 'clear'
  const gradient = THEME_GRADIENTS[theme] || THEME_GRADIENTS.clear
  const scene = skyScene(theme)

  const hours = data ? next24Hours(data.hourly, data.current.time) : []

  return (
    <>
      <Sky gradient={gradient} scene={scene} />

      <div className="app">
        <SearchBar
          onSelectPlace={(place) => load(() => fetchForecast(place))}
          onLocate={() => load(() => getWeatherByGeolocation())}
          unit={unit}
          onUnitChange={setUnit}
          loading={loading}
        />

        {loading && <div className="spinner" role="status" aria-label="Loading" />}

        {!loading && error && (
          <div className="glass notice" role="alert">
            <h3>Hmm, that didn't work</h3>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <CurrentWeather place={data.place} current={data.current} unit={unit} />
            <HourlyChart hours={hours} unit={unit} />
            <DailyForecast daily={data.daily} unit={unit} />
          </>
        )}

        <div className="footer">
          Data from{' '}
          <a href="https://open-meteo.com" target="_blank" rel="noreferrer noopener">
            Open-Meteo
          </a>{' '}
          · no API key required
        </div>
      </div>
    </>
  )
}
