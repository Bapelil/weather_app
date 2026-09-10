// Hand-built SVG weather icons. One component switches on `type`,
// which comes from describeWeather() in weather.js.
// Clouds are built from circles + a rounded base so they render
// reliably at any size.

function Cloud({ x = 0, y = 0, fill = '#ffffff' }) {
  return (
    <g transform={`translate(${x} ${y})`} fill={fill}>
      <rect x="16" y="34" width="34" height="16" rx="8" />
      <circle cx="26" cy="34" r="10" />
      <circle cx="40" cy="31" r="13" />
      <circle cx="48" cy="38" r="8" />
    </g>
  )
}

function Sun({ cx = 32, cy = 30, r = 12 }) {
  const rays = []
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4
    const x1 = cx + Math.cos(a) * (r + 4)
    const y1 = cy + Math.sin(a) * (r + 4)
    const x2 = cx + Math.cos(a) * (r + 10)
    const y2 = cy + Math.sin(a) * (r + 10)
    rays.push(
      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffca3a" strokeWidth="3" strokeLinecap="round" />
    )
  }
  return (
    <g>
      {rays}
      <circle cx={cx} cy={cy} r={r} fill="#ffd45e" />
    </g>
  )
}

function Moon() {
  return (
    <path
      d="M40 16a18 18 0 1 0 6 28 14 14 0 0 1-6-28z"
      fill="#eef2fb"
    />
  )
}

export default function WeatherIcon({ type = 'cloud', size = 64 }) {
  const V = 64
  const style = { width: size, height: size, display: 'block' }

  let content
  switch (type) {
    case 'clear':
      content = <Sun cx={32} cy={32} r={14} />
      break
    case 'clear-night':
      content = <Moon />
      break
    case 'partly':
      content = (
        <>
          <Sun cx={42} cy={24} r={9} />
          <Cloud fill="#ffffff" />
        </>
      )
      break
    case 'partly-night':
      content = (
        <>
          <g transform="translate(6 -4) scale(0.7)">
            <Moon />
          </g>
          <Cloud fill="#ffffff" />
        </>
      )
      break
    case 'cloud':
      content = <Cloud fill="#f2f5fa" />
      break
    case 'rain':
      content = (
        <>
          <Cloud fill="#eef2f8" />
          {[24, 34, 44].map((x, i) => (
            <line
              key={i}
              x1={x}
              y1={50}
              x2={x - 4}
              y2={58}
              stroke="#bfe3ff"
              strokeWidth="3"
              strokeLinecap="round"
            />
          ))}
        </>
      )
      break
    case 'snow':
      content = (
        <>
          <Cloud fill="#eef2f8" />
          {[24, 34, 44].map((x, i) => (
            <circle key={i} cx={x} cy={54} r="2.6" fill="#ffffff" />
          ))}
        </>
      )
      break
    case 'fog':
      content = (
        <>
          <Cloud fill="#e6eaf0" />
          {[52, 58].map((y, i) => (
            <line
              key={i}
              x1={18}
              y1={y}
              x2={48}
              y2={y}
              stroke="rgba(255,255,255,0.75)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          ))}
        </>
      )
      break
    case 'storm':
      content = (
        <>
          <Cloud fill="#e9edf3" />
          <path d="M32 48l-8 10h6l-4 8 12-13h-7l4-5z" fill="#ffe14d" />
        </>
      )
      break
    default:
      content = <Cloud fill="#f2f5fa" />
  }

  return (
    <svg viewBox={`0 0 ${V} ${V}`} style={style} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {content}
    </svg>
  )
}
