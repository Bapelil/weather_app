import WeatherIcon from './WeatherIcon.jsx'
import { DropIcon, WindIcon, GaugeIcon } from './Icons.jsx'
import { describeWeather, toUnit, kmhToMph } from '../weather.js'

/** The hero block: place, big temperature, condition, and stats. */
export default function CurrentWeather({ place, current, unit }) {
  const isDay = current.is_day === 1
  const { label, icon } = describeWeather(current.weather_code, isDay)

  const temp = toUnit(current.temperature_2m, unit)
  const feels = toUnit(current.apparent_temperature, unit)
  const wind =
    unit === 'f'
      ? `${Math.round(kmhToMph(current.wind_speed_10m))} mph`
      : `${Math.round(current.wind_speed_10m)} km/h`

  return (
    <div className="current">
      <h1 className="place">{place.name}</h1>
      {place.region && <div className="place-region">{place.region}</div>}

      <div className="hero-icon">
        <WeatherIcon type={icon} size={108} />
      </div>

      <div className="temp">
        {temp}
        <span className="deg">°</span>
      </div>
      <div className="condition">{label}</div>
      <div className="feels">Feels like {feels}°</div>

      <div className="stats">
        <div className="glass stat">
          <div className="k">
            <DropIcon /> Humidity
          </div>
          <div className="v">{current.relative_humidity_2m}%</div>
        </div>
        <div className="glass stat">
          <div className="k">
            <WindIcon /> Wind
          </div>
          <div className="v">{wind}</div>
        </div>
        <div className="glass stat">
          <div className="k">
            <GaugeIcon /> Pressure
          </div>
          <div className="v">{Math.round(current.surface_pressure)}</div>
        </div>
      </div>
    </div>
  )
}
