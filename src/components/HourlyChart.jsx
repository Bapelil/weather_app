import { toUnit, hourLabel } from '../weather.js'

// Turn a list of points into a smooth SVG path using a
// Catmull-Rom spline (converted to cubic beziers).
function smoothPath(pts) {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x} ${p2.y}`
  }
  return d
}

/** 24-hour temperature curve, labelled every three hours. */
export default function HourlyChart({ hours, unit }) {
  if (!hours || hours.length < 2) return null

  const W = 520
  const H = 150
  const padX = 22
  const padTop = 34
  const padBottom = 26

  const temps = hours.map((h) => toUnit(h.temp, unit))
  const min = Math.min(...temps)
  const max = Math.max(...temps)
  const span = max - min || 1

  const innerW = W - padX * 2
  const innerTop = padTop
  const innerBottom = H - padBottom

  const pts = temps.map((t, i) => ({
    x: padX + (i / (temps.length - 1)) * innerW,
    y: innerBottom - ((t - min) / span) * (innerBottom - innerTop),
    t,
    time: hours[i].time,
  }))

  const curve = smoothPath(pts)
  const area = `${curve} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`

  return (
    <div className="glass section">
      <p className="section-title">Next 24 hours</p>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        <path d={area} fill="url(#areaFill)" />
        <path className="curve" d={curve} />

        {pts.map((p, i) =>
          i % 3 === 0 ? (
            <g key={i}>
              <text className="htemp" x={p.x} y={p.y - 12}>
                {p.t}°
              </text>
              <circle className="dot" cx={p.x} cy={p.y} r="3" />
              <text className="hlabel" x={p.x} y={H - 6}>
                {i === 0 ? 'Now' : hourLabel(p.time)}
              </text>
            </g>
          ) : null
        )}
      </svg>
    </div>
  )
}
