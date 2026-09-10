import WeatherIcon from './WeatherIcon.jsx'
import { describeWeather, toUnit, dayName } from '../weather.js'

/**
 * 7-day forecast. Each row's bar shows where that day's high/low
 * sits within the whole week's range, so you can read the trend
 * at a glance.
 */
export default function DailyForecast({ daily, unit }) {
  if (!daily?.time) return null

  const highs = daily.temperature_2m_max.map((t) => toUnit(t, unit))
  const lows = daily.temperature_2m_min.map((t) => toUnit(t, unit))
  const weekMin = Math.min(...lows)
  const weekMax = Math.max(...highs)
  const weekSpan = weekMax - weekMin || 1

  return (
    <div className="glass section">
      <p className="section-title">7-day forecast</p>
      <div className="daily">
        {daily.time.map((date, i) => {
          const { icon } = describeWeather(daily.weather_code[i], true)
          const lo = lows[i]
          const hi = highs[i]
          const left = ((lo - weekMin) / weekSpan) * 100
          const width = ((hi - lo) / weekSpan) * 100
          return (
            <div className="day" key={date}>
              <span className="dname">{i === 0 ? 'Today' : dayName(date)}</span>
              <span className="dicon">
                <WeatherIcon type={icon} size={28} />
              </span>
              <div className="range">
                <span className="lo">{lo}°</span>
                <span className="bar">
                  <span
                    className="fill"
                    style={{ left: `${left}%`, width: `${Math.max(width, 6)}%` }}
                  />
                </span>
                <span className="hi">{hi}°</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
