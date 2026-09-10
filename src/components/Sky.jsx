import { useMemo } from 'react'

// A soft, blurred cloud built from overlapping circles. Tint controls
// whether it reads as a fair-weather cloud or a heavy storm cloud.
function CloudShape({ tint }) {
  const fill = tint === 'dark' ? '#3a4149' : '#ffffff'
  return (
    <svg viewBox="0 0 200 120" width="200" height="120" aria-hidden="true">
      <g fill={fill}>
        <circle cx="60" cy="70" r="34" />
        <circle cx="100" cy="54" r="44" />
        <circle cx="140" cy="66" r="32" />
        <circle cx="98" cy="86" r="40" />
        <rect x="52" y="74" width="100" height="34" rx="17" />
      </g>
    </svg>
  )
}

// Deterministic-ish pseudo-random so a given scene looks stable
// between renders but each element differs.
function rand(seed) {
  const x = Math.sin(seed * 9973.13) * 10000
  return x - Math.floor(x)
}

export default function Sky({ gradient, scene }) {
  const { clouds, tint, precip, extra } = scene

  // Build cloud configs once per scene shape.
  const cloudList = useMemo(
    () =>
      Array.from({ length: clouds }, (_, i) => {
        const s = i + clouds * 10
        const scale = 0.55 + rand(s) * 1.1
        const duration = 55 + rand(s + 1) * 60
        return {
          key: i,
          top: `${5 + rand(s + 2) * 48}%`,
          scale,
          duration: `${duration}s`,
          delay: `-${rand(s + 3) * duration}s`,
          opacity: (tint === 'dark' ? 0.55 : 0.8) - rand(s + 4) * 0.25,
        }
      }),
    [clouds, tint]
  )

  const drops = useMemo(() => {
    if (precip !== 'rain') return []
    return Array.from({ length: 60 }, (_, i) => ({
      key: i,
      left: `${rand(i) * 100}%`,
      duration: `${0.5 + rand(i + 1) * 0.5}s`,
      delay: `-${rand(i + 2) * 2}s`,
      height: `${14 + rand(i + 3) * 16}px`,
    }))
  }, [precip])

  const flakes = useMemo(() => {
    if (precip !== 'snow') return []
    return Array.from({ length: 50 }, (_, i) => ({
      key: i,
      left: `${rand(i) * 100}%`,
      duration: `${5 + rand(i + 1) * 6}s`,
      delay: `-${rand(i + 2) * 8}s`,
      size: `${3 + rand(i + 3) * 4}px`,
      sway: `${2 + rand(i + 4) * 3}s`,
    }))
  }, [precip])

  const stars = useMemo(() => {
    if (extra !== 'stars') return []
    return Array.from({ length: 46 }, (_, i) => ({
      key: i,
      top: `${rand(i) * 62}%`,
      left: `${rand(i + 1) * 100}%`,
      size: `${1 + rand(i + 2) * 1.6}px`,
      duration: `${2 + rand(i + 3) * 3}s`,
      delay: `-${rand(i + 4) * 4}s`,
    }))
  }, [extra])

  return (
    <>
      <div className="sky" style={{ background: gradient }} />
      <div className="sky-fx" aria-hidden="true">
        {extra === 'sun' && <div className="sun-glow" />}

        {stars.map((s) => (
          <span
            key={s.key}
            className="star"
            style={{
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              animationDuration: s.duration,
              animationDelay: s.delay,
            }}
          />
        ))}

        {cloudList.map((c) => (
          <div
            key={c.key}
            className="cloud-track"
            style={{ top: c.top, animationDuration: c.duration, animationDelay: c.delay }}
          >
            <div className="cloud" style={{ transform: `scale(${c.scale})`, opacity: c.opacity }}>
              <CloudShape tint={tint} />
            </div>
          </div>
        ))}

        {extra === 'fog' && (
          <>
            <div className="fog-band" style={{ top: '30%', animationDuration: '40s' }} />
            <div className="fog-band" style={{ top: '55%', animationDuration: '55s', animationDelay: '-15s' }} />
            <div className="fog-band" style={{ top: '72%', animationDuration: '48s', animationDelay: '-8s' }} />
          </>
        )}

        {precip === 'rain' && (
          <div className="precip rain">
            {drops.map((d) => (
              <span
                key={d.key}
                className="drop"
                style={{ left: d.left, height: d.height, animationDuration: d.duration, animationDelay: d.delay }}
              />
            ))}
          </div>
        )}

        {precip === 'snow' &&
          flakes.map((f) => (
            <span
              key={f.key}
              className="flake"
              style={{
                left: f.left,
                width: f.size,
                height: f.size,
                animationDuration: `${f.duration}, ${f.sway}`,
                animationDelay: `${f.delay}, 0s`,
              }}
            />
          ))}

        {extra === 'lightning' && <div className="flash" />}
      </div>
    </>
  )
}
