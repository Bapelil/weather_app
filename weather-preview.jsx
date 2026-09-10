import { useState, useEffect, useRef, useMemo } from "react";

// ============================================================
// Skyglass — single-file live preview (v2)
// Now with: animated weather-matched sky (drifting clouds, rain,
// snow, stars, sun glow, fog, lightning) and a city autocomplete
// dropdown. Same app as the downloadable Vite project, flattened.
// Free Open-Meteo API, no key.
// ============================================================

const GEO = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST = "https://api.open-meteo.com/v1/forecast";
const FP =
  "current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,surface_pressure" +
  "&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7";

const CODES = {
  0: ["Clear sky", "clear", "clear"], 1: ["Mainly clear", "clear", "clear"],
  2: ["Partly cloudy", "partly", "clouds"], 3: ["Overcast", "cloud", "clouds"],
  45: ["Fog", "fog", "fog"], 48: ["Rime fog", "fog", "fog"],
  51: ["Light drizzle", "rain", "rain"], 53: ["Drizzle", "rain", "rain"], 55: ["Heavy drizzle", "rain", "rain"],
  56: ["Freezing drizzle", "rain", "rain"], 57: ["Freezing drizzle", "rain", "rain"],
  61: ["Light rain", "rain", "rain"], 63: ["Rain", "rain", "rain"], 65: ["Heavy rain", "rain", "rain"],
  66: ["Freezing rain", "rain", "rain"], 67: ["Freezing rain", "rain", "rain"],
  71: ["Light snow", "snow", "snow"], 73: ["Snow", "snow", "snow"], 75: ["Heavy snow", "snow", "snow"], 77: ["Snow grains", "snow", "snow"],
  80: ["Rain showers", "rain", "rain"], 81: ["Rain showers", "rain", "rain"], 82: ["Heavy showers", "rain", "rain"],
  85: ["Snow showers", "snow", "snow"], 86: ["Snow showers", "snow", "snow"],
  95: ["Thunderstorm", "storm", "storm"], 96: ["Thunderstorm", "storm", "storm"], 99: ["Thunderstorm", "storm", "storm"],
};
const GRADIENTS = {
  clear: "linear-gradient(160deg, #2e6bb8 0%, #4f9fd6 55%, #8fd0ef 100%)",
  "clear-night": "linear-gradient(160deg, #0a1636 0%, #17265a 55%, #2a3d78 100%)",
  clouds: "linear-gradient(160deg, #566d84 0%, #7890a6 55%, #9db2c6 100%)",
  "clouds-night": "linear-gradient(160deg, #171d2a 0%, #29323f 55%, #3a4655 100%)",
  rain: "linear-gradient(160deg, #2f3d4c 0%, #45586b 55%, #5b7286 100%)",
  snow: "linear-gradient(160deg, #5a7590 0%, #7c9ab4 55%, #a7c3d8 100%)",
  storm: "linear-gradient(160deg, #1c212c 0%, #303849 55%, #454f66 100%)",
  fog: "linear-gradient(160deg, #55606c 0%, #74808c 55%, #97a2ad 100%)",
};

function describe(code, isDay = true) {
  const [label, icon, theme] = CODES[code] || ["Unknown", "cloud", "clouds"];
  let ic = icon, th = theme;
  if (!isDay) {
    if (ic === "clear") ic = "clear-night";
    if (ic === "partly") ic = "partly-night";
    if (th === "clear") th = "clear-night";
    if (th === "clouds") th = "clouds-night";
  }
  return { label, icon: ic, theme: th };
}
function skyScene(theme) {
  switch (theme) {
    case "clear": return { clouds: 3, tint: "light", precip: "none", extra: "sun" };
    case "clear-night": return { clouds: 2, tint: "light", precip: "none", extra: "stars" };
    case "clouds": return { clouds: 6, tint: "light", precip: "none", extra: null };
    case "clouds-night": return { clouds: 6, tint: "dark", precip: "none", extra: "stars" };
    case "rain": return { clouds: 6, tint: "dark", precip: "rain", extra: null };
    case "snow": return { clouds: 5, tint: "light", precip: "snow", extra: null };
    case "storm": return { clouds: 7, tint: "dark", precip: "rain", extra: "lightning" };
    case "fog": return { clouds: 3, tint: "light", precip: "none", extra: "fog" };
    default: return { clouds: 4, tint: "light", precip: "none", extra: null };
  }
}
const cToF = (c) => (c * 9) / 5 + 32;
const toUnit = (c, u) => Math.round(u === "f" ? cToF(c) : c);
const dayName = (iso) => new Date(iso).toLocaleDateString("en-US", { weekday: "short" });
const hourLabel = (iso) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric" });
const rand = (s) => { const x = Math.sin(s * 9973.13) * 10000; return x - Math.floor(x); };

function normalize(r) {
  return { id: r.id, lat: r.latitude, lon: r.longitude, name: r.name, region: [r.admin1, r.country].filter(Boolean).join(", ") };
}
async function searchPlaces(name, count = 6) {
  const q = name.trim();
  if (!q) return [];
  try {
    const res = await fetch(`${GEO}?name=${encodeURIComponent(q)}&count=${count}&language=en&format=json`);
    if (!res.ok) return [];
    const d = await res.json();
    return (d.results || []).map(normalize);
  } catch { return []; }
}
async function forecastByPlace(place) {
  const f = await fetch(`${FORECAST}?latitude=${place.lat}&longitude=${place.lon}&${FP}`);
  const d = await f.json();
  return { place: { name: place.name, region: place.region }, ...d };
}
async function getByCity(name) {
  const list = await searchPlaces(name, 1);
  if (!list.length) throw new Error(`No place called "${name}".`);
  return forecastByPlace(list[0]);
}
function getByGeo() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Your browser does not support location access."));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(forecastByPlace({ lat: pos.coords.latitude, lon: pos.coords.longitude, name: "Your location", region: "" })),
      () => reject(new Error("Location was blocked. Allow it in your browser, or search for a city.")),
      { timeout: 10000 }
    );
  });
}
function next24(hourly, curTime) {
  if (!hourly?.time) return [];
  let s = hourly.time.indexOf(curTime);
  if (s === -1) s = 0;
  return hourly.time.slice(s, s + 24).map((time, i) => ({ time, temp: hourly.temperature_2m[s + i] }));
}

// ---- weather icon (foreground) ----
function Cloud({ x = 0, y = 0, fill = "#fff" }) {
  return (<g transform={`translate(${x} ${y})`} fill={fill}><rect x="16" y="34" width="34" height="16" rx="8" /><circle cx="26" cy="34" r="10" /><circle cx="40" cy="31" r="13" /><circle cx="48" cy="38" r="8" /></g>);
}
function Sun({ cx = 32, cy = 30, r = 12 }) {
  const rays = [];
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; rays.push(<line key={i} x1={cx + Math.cos(a) * (r + 4)} y1={cy + Math.sin(a) * (r + 4)} x2={cx + Math.cos(a) * (r + 10)} y2={cy + Math.sin(a) * (r + 10)} stroke="#ffca3a" strokeWidth="3" strokeLinecap="round" />); }
  return (<g>{rays}<circle cx={cx} cy={cy} r={r} fill="#ffd45e" /></g>);
}
const Moon = () => <path d="M40 16a18 18 0 1 0 6 28 14 14 0 0 1-6-28z" fill="#eef2fb" />;
function WeatherIcon({ type = "cloud", size = 64 }) {
  let c;
  switch (type) {
    case "clear": c = <Sun cx={32} cy={32} r={14} />; break;
    case "clear-night": c = <Moon />; break;
    case "partly": c = <><Sun cx={42} cy={24} r={9} /><Cloud /></>; break;
    case "partly-night": c = <><g transform="translate(6 -4) scale(0.7)"><Moon /></g><Cloud /></>; break;
    case "cloud": c = <Cloud fill="#f2f5fa" />; break;
    case "rain": c = <><Cloud fill="#eef2f8" />{[24, 34, 44].map((x, i) => <line key={i} x1={x} y1={50} x2={x - 4} y2={58} stroke="#bfe3ff" strokeWidth="3" strokeLinecap="round" />)}</>; break;
    case "snow": c = <><Cloud fill="#eef2f8" />{[24, 34, 44].map((x, i) => <circle key={i} cx={x} cy={54} r="2.6" fill="#fff" />)}</>; break;
    case "fog": c = <><Cloud fill="#e6eaf0" />{[52, 58].map((y, i) => <line key={i} x1={18} y1={y} x2={48} y2={y} stroke="rgba(255,255,255,0.75)" strokeWidth="3" strokeLinecap="round" />)}</>; break;
    case "storm": c = <><Cloud fill="#e9edf3" /><path d="M32 48l-8 10h6l-4 8 12-13h-7l4-5z" fill="#ffe14d" /></>; break;
    default: c = <Cloud fill="#f2f5fa" />;
  }
  return <svg viewBox="0 0 64 64" style={{ width: size, height: size, display: "block" }} aria-hidden="true">{c}</svg>;
}

// ---- background cloud shape (soft) ----
function BgCloud({ tint }) {
  const fill = tint === "dark" ? "#3a4149" : "#ffffff";
  return (
    <svg viewBox="0 0 200 120" width="200" height="120" aria-hidden="true">
      <g fill={fill}>
        <circle cx="60" cy="70" r="34" /><circle cx="100" cy="54" r="44" />
        <circle cx="140" cy="66" r="32" /><circle cx="98" cy="86" r="40" />
        <rect x="52" y="74" width="100" height="34" rx="17" />
      </g>
    </svg>
  );
}

// ---- animated Sky ----
function Sky({ gradient, scene }) {
  const { clouds, tint, precip, extra } = scene;
  const cloudList = useMemo(() => Array.from({ length: clouds }, (_, i) => {
    const s = i + clouds * 10, scale = 0.55 + rand(s) * 1.1, duration = 55 + rand(s + 1) * 60;
    return { key: i, top: `${5 + rand(s + 2) * 48}%`, scale, duration: `${duration}s`, delay: `-${rand(s + 3) * duration}s`, opacity: (tint === "dark" ? 0.55 : 0.8) - rand(s + 4) * 0.25 };
  }), [clouds, tint]);
  const drops = useMemo(() => precip !== "rain" ? [] : Array.from({ length: 60 }, (_, i) => ({ key: i, left: `${rand(i) * 100}%`, duration: `${0.5 + rand(i + 1) * 0.5}s`, delay: `-${rand(i + 2) * 2}s`, height: `${14 + rand(i + 3) * 16}px` })), [precip]);
  const flakes = useMemo(() => precip !== "snow" ? [] : Array.from({ length: 50 }, (_, i) => ({ key: i, left: `${rand(i) * 100}%`, duration: `${5 + rand(i + 1) * 6}s`, delay: `-${rand(i + 2) * 8}s`, size: `${3 + rand(i + 3) * 4}px`, sway: `${2 + rand(i + 4) * 3}s` })), [precip]);
  const stars = useMemo(() => extra !== "stars" ? [] : Array.from({ length: 46 }, (_, i) => ({ key: i, top: `${rand(i) * 62}%`, left: `${rand(i + 1) * 100}%`, size: `${1 + rand(i + 2) * 1.6}px`, duration: `${2 + rand(i + 3) * 3}s`, delay: `-${rand(i + 4) * 4}s` })), [extra]);

  return (
    <>
      <div className="sky" style={{ background: gradient }} />
      <div className="sky-fx" aria-hidden="true">
        {extra === "sun" && <div className="sun-glow" />}
        {stars.map((s) => <span key={s.key} className="star" style={{ top: s.top, left: s.left, width: s.size, height: s.size, animationDuration: s.duration, animationDelay: s.delay }} />)}
        {cloudList.map((c) => (
          <div key={c.key} className="cloud-track" style={{ top: c.top, animationDuration: c.duration, animationDelay: c.delay }}>
            <div className="cloud" style={{ transform: `scale(${c.scale})`, opacity: c.opacity }}><BgCloud tint={tint} /></div>
          </div>
        ))}
        {extra === "fog" && <>
          <div className="fog-band" style={{ top: "30%", animationDuration: "40s" }} />
          <div className="fog-band" style={{ top: "55%", animationDuration: "55s", animationDelay: "-15s" }} />
          <div className="fog-band" style={{ top: "72%", animationDuration: "48s", animationDelay: "-8s" }} />
        </>}
        {precip === "rain" && <div className="precip rain">{drops.map((d) => <span key={d.key} className="drop" style={{ left: d.left, height: d.height, animationDuration: d.duration, animationDelay: d.delay }} />)}</div>}
        {precip === "snow" && flakes.map((f) => <span key={f.key} className="flake" style={{ left: f.left, width: f.size, height: f.size, animationDuration: `${f.duration}, ${f.sway}`, animationDelay: `${f.delay}, 0s` }} />)}
        {extra === "lightning" && <div className="flash" />}
      </div>
    </>
  );
}

// ---- smooth chart ----
function smoothPath(pts) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    d += ` C ${(p1.x + (p2.x - p0.x) / 6).toFixed(1)} ${(p1.y + (p2.y - p0.y) / 6).toFixed(1)}, ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)} ${(p2.y - (p3.y - p1.y) / 6).toFixed(1)}, ${p2.x} ${p2.y}`;
  }
  return d;
}
function HourlyChart({ hours, unit }) {
  if (!hours || hours.length < 2) return null;
  const W = 520, H = 150, padX = 22, padTop = 34, padBottom = 26;
  const temps = hours.map((h) => toUnit(h.temp, unit));
  const min = Math.min(...temps), max = Math.max(...temps), span = max - min || 1;
  const iw = W - padX * 2, it = padTop, ib = H - padBottom;
  const pts = temps.map((t, i) => ({ x: padX + (i / (temps.length - 1)) * iw, y: ib - ((t - min) / span) * (ib - it), t, time: hours[i].time }));
  const curve = smoothPath(pts);
  const area = `${curve} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`;
  return (
    <div className="glass section">
      <p className="section-title">Next 24 hours</p>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs><linearGradient id="af" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(255,255,255,0.35)" /><stop offset="100%" stopColor="rgba(255,255,255,0)" /></linearGradient></defs>
        <path d={area} fill="url(#af)" /><path className="curve" d={curve} />
        {pts.map((p, i) => i % 3 === 0 ? (<g key={i}><text className="htemp" x={p.x} y={p.y - 12}>{p.t}°</text><circle className="dot" cx={p.x} cy={p.y} r="3" /><text className="hlabel" x={p.x} y={H - 6}>{i === 0 ? "Now" : hourLabel(p.time)}</text></g>) : null)}
      </svg>
    </div>
  );
}

const SearchSvg = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>);
const LocSvg = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>);
const DropSvg = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3s6 6.4 6 10.5A6 6 0 0 1 6 13.5C6 9.4 12 3 12 3z" /></svg>);
const WindSvg = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h11a3 3 0 1 0-3-3" /><path d="M3 12h15a3 3 0 1 1-3 3" /><path d="M3 16h8" /></svg>);
const GaugeSvg = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 13l4-4" /><path d="M4 18a8 8 0 1 1 16 0" /></svg>);

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&family=Inter:wght@300;400;500;600&display=swap');
.sg * { box-sizing: border-box; }
.sg { position: relative; min-height: 100vh; font-family: 'Inter', system-ui, sans-serif; color: #fff; -webkit-font-smoothing: antialiased; overflow: hidden; }
.sg .sky { position: absolute; inset: 0; z-index: 0; transition: background .9s ease; }
.sg .sky::after { content: ''; position: absolute; inset: 0; background: radial-gradient(120% 80% at 50% 0%, transparent 40%, rgba(0,0,0,.22) 100%); }
.sg .sky-fx { position: absolute; inset: 0; z-index: 1; overflow: hidden; pointer-events: none; }
.sg .cloud-track { position: absolute; left: 0; will-change: transform; animation-name: sgdrift; animation-timing-function: linear; animation-iteration-count: infinite; }
.sg .cloud { filter: blur(5px); }
@keyframes sgdrift { from { transform: translateX(-40vw); } to { transform: translateX(140vw); } }
.sg .sun-glow { position: absolute; top: -8%; right: 6%; width: min(46vw,360px); height: min(46vw,360px); background: radial-gradient(circle, rgba(255,244,214,.8), rgba(255,244,214,0) 62%); filter: blur(6px); }
.sg .star { position: absolute; background: #fff; border-radius: 50%; box-shadow: 0 0 4px rgba(255,255,255,.8); animation-name: sgtwinkle; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
@keyframes sgtwinkle { 0%,100% { opacity: .2; } 50% { opacity: .95; } }
.sg .fog-band { position: absolute; left: -10%; width: 120%; height: 130px; background: linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent); filter: blur(16px); animation-name: sgfog; animation-timing-function: ease-in-out; animation-iteration-count: infinite; animation-direction: alternate; }
@keyframes sgfog { from { transform: translateX(-6%); } to { transform: translateX(10%); } }
.sg .precip.rain { position: absolute; inset: -12% -22%; transform: rotate(11deg); }
.sg .drop { position: absolute; top: -14vh; width: 2px; border-radius: 2px; background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,.55)); animation-name: sgfall; animation-timing-function: linear; animation-iteration-count: infinite; }
@keyframes sgfall { to { transform: translateY(125vh); } }
.sg .flake { position: absolute; top: -6vh; border-radius: 50%; background: #fff; opacity: .9; animation-name: sgfall, sgsway; animation-timing-function: linear, ease-in-out; animation-iteration-count: infinite, infinite; animation-direction: normal, alternate; }
@keyframes sgsway { from { margin-left: -9px; } to { margin-left: 9px; } }
.sg .flash { position: absolute; inset: 0; background: #eaf2ff; opacity: 0; mix-blend-mode: screen; animation: sgflash 9s linear infinite; }
@keyframes sgflash { 0%,93%,100% { opacity: 0; } 94% { opacity: .5; } 95% { opacity: .1; } 96% { opacity: .6; } 97% { opacity: 0; } }
.sg .app { position: relative; z-index: 2; max-width: 540px; margin: 0 auto; padding: 22px 18px 50px; }
.sg .glass { background: rgba(255,255,255,.14); backdrop-filter: blur(22px) saturate(150%); -webkit-backdrop-filter: blur(22px) saturate(150%); border: 1px solid rgba(255,255,255,.28); border-radius: 26px; box-shadow: 0 8px 32px rgba(0,0,0,.18); }
.sg .controls { display: flex; gap: 10px; align-items: center; }
.sg .search-wrap { position: relative; flex: 1; }
.sg .search { display: flex; align-items: center; gap: 10px; padding: 0 16px; border-radius: 16px; background: rgba(255,255,255,.14); backdrop-filter: blur(18px) saturate(150%); -webkit-backdrop-filter: blur(18px) saturate(150%); border: 1px solid rgba(255,255,255,.28); transition: background .2s, border-color .2s; }
.sg .search:focus-within { background: rgba(255,255,255,.22); border-color: rgba(255,255,255,.5); }
.sg .search svg { opacity: .8; flex-shrink: 0; }
.sg .search input { flex: 1; border: none; outline: none; background: transparent; color: #fff; font-family: inherit; font-size: 15px; padding: 13px 0; }
.sg .search input::placeholder { color: rgba(255,255,255,.55); }
.sg .suggest { position: absolute; top: calc(100% + 8px); left: 0; right: 0; z-index: 20; margin: 0; padding: 6px; list-style: none; border-radius: 16px; background: rgba(30,45,66,.55); backdrop-filter: blur(26px) saturate(150%); -webkit-backdrop-filter: blur(26px) saturate(150%); border: 1px solid rgba(255,255,255,.28); box-shadow: 0 12px 34px rgba(0,0,0,.3); animation: sgfade .15s ease both; }
.sg .suggest-item { display: flex; flex-direction: column; gap: 1px; padding: 9px 12px; border-radius: 11px; cursor: pointer; }
.sg .suggest-item.active { background: rgba(255,255,255,.16); }
.sg .s-name { font-size: 15px; font-weight: 500; }
.sg .s-region { font-size: 12.5px; color: rgba(255,255,255,.78); }
.sg .icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 46px; height: 46px; flex-shrink: 0; border: 1px solid rgba(255,255,255,.28); background: rgba(255,255,255,.14); backdrop-filter: blur(18px) saturate(150%); -webkit-backdrop-filter: blur(18px) saturate(150%); color: #fff; border-radius: 16px; cursor: pointer; transition: background .2s, transform .06s; }
.sg .icon-btn:hover { background: rgba(255,255,255,.22); }
.sg .icon-btn:active { transform: scale(.94); }
.sg .units { display: inline-flex; padding: 4px; border-radius: 16px; background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.28); backdrop-filter: blur(18px) saturate(150%); -webkit-backdrop-filter: blur(18px) saturate(150%); }
.sg .units button { border: none; background: transparent; color: rgba(255,255,255,.78); font-family: inherit; font-size: 14px; font-weight: 600; padding: 8px 12px; border-radius: 11px; cursor: pointer; transition: background .2s, color .2s; }
.sg .units button.active { background: rgba(255,255,255,.9); color: #1b2a3a; }
.sg .current { text-align: center; padding: 40px 0 8px; animation: sgfade .5s ease both; }
@keyframes sgfade { from { opacity: 0; transform: translateY(8px); } }
.sg .place { font-family: 'Bricolage Grotesque', sans-serif; font-weight: 600; font-size: 26px; letter-spacing: -.01em; margin: 0; }
.sg .place-region { color: rgba(255,255,255,.78); font-size: 14px; margin-top: 2px; }
.sg .hero-icon { margin: 14px auto 0; width: 108px; height: 108px; filter: drop-shadow(0 6px 16px rgba(0,0,0,.25)); }
.sg .temp { font-size: clamp(84px, 22vw, 132px); font-weight: 200; line-height: .95; letter-spacing: -.04em; margin: 6px 0 0; font-variant-numeric: tabular-nums; }
.sg .temp .deg { font-weight: 300; }
.sg .condition { font-size: 18px; font-weight: 500; margin: 4px 0 0; }
.sg .feels { color: rgba(255,255,255,.78); font-size: 15px; margin: 2px 0 0; }
.sg .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 22px; }
.sg .stat { padding: 16px 14px; text-align: center; }
.sg .stat .k { display: flex; align-items: center; justify-content: center; gap: 6px; color: rgba(255,255,255,.78); font-size: 12.5px; margin-bottom: 8px; }
.sg .stat .v { font-size: 20px; font-weight: 600; font-variant-numeric: tabular-nums; }
.sg .section { margin-top: 16px; padding: 20px; }
.sg .section-title { font-family: 'Bricolage Grotesque', sans-serif; font-size: 13px; font-weight: 600; color: rgba(255,255,255,.78); margin: 0 0 14px; }
.sg .chart { width: 100%; height: auto; overflow: visible; }
.sg .chart .curve { fill: none; stroke: rgba(255,255,255,.95); stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
.sg .chart .dot { fill: #fff; }
.sg .chart .htemp { fill: #fff; font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600; text-anchor: middle; }
.sg .chart .hlabel { fill: rgba(255,255,255,.7); font-family: 'Inter', sans-serif; font-size: 11px; text-anchor: middle; }
.sg .daily { display: flex; flex-direction: column; }
.sg .day { display: grid; grid-template-columns: 52px 34px 1fr auto; align-items: center; gap: 14px; padding: 11px 0; border-top: 1px solid rgba(255,255,255,.12); }
.sg .day:first-child { border-top: none; }
.sg .dname { font-weight: 500; font-size: 15px; }
.sg .dicon { width: 28px; height: 28px; }
.sg .range { display: flex; align-items: center; gap: 10px; }
.sg .range .lo { color: rgba(255,255,255,.55); font-size: 14px; font-variant-numeric: tabular-nums; width: 26px; text-align: right; }
.sg .range .hi { font-weight: 600; font-size: 14px; font-variant-numeric: tabular-nums; width: 26px; }
.sg .range .bar { flex: 1; height: 5px; border-radius: 999px; background: rgba(255,255,255,.18); position: relative; overflow: hidden; min-width: 60px; }
.sg .range .fill { position: absolute; top: 0; bottom: 0; border-radius: 999px; background: linear-gradient(90deg, rgba(255,255,255,.55), rgba(255,255,255,.95)); }
.sg .notice { margin-top: 40px; padding: 28px; text-align: center; }
.sg .notice h3 { font-family: 'Bricolage Grotesque', sans-serif; margin: 0 0 6px; font-size: 18px; }
.sg .notice p { color: rgba(255,255,255,.78); margin: 0; font-size: 14px; }
.sg .spinner { width: 34px; height: 34px; margin: 48px auto; border: 3px solid rgba(255,255,255,.25); border-top-color: #fff; border-radius: 50%; animation: sgspin .8s linear infinite; }
@keyframes sgspin { to { transform: rotate(360deg); } }
.sg .footer { margin-top: 34px; text-align: center; color: rgba(255,255,255,.55); font-size: 12.5px; }
.sg .footer a { color: rgba(255,255,255,.78); }
`;

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unit, setUnit] = useState("c");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const timer = useRef(null);
  const boxRef = useRef(null);

  async function load(factory) {
    setLoading(true); setError(null);
    try { setData(await factory()); }
    catch (e) { setError(e.message); setData(null); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(() => getByCity("Prague")); }, []);

  // debounced autocomplete
  useEffect(() => {
    clearTimeout(timer.current);
    const q = query.trim();
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      const places = await searchPlaces(q, 6);
      setResults(places); setOpen(places.length > 0); setActive(-1);
    }, 280);
    return () => clearTimeout(timer.current);
  }, [query]);

  useEffect(() => {
    function onDown(e) { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function choose(place) {
    setQuery(place.name); setResults([]); setOpen(false); setActive(-1);
    load(() => forecastByPlace(place));
  }
  function onKeyDown(e) {
    if (!open || !results.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => (i + 1) % results.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => (i - 1 + results.length) % results.length); }
    else if (e.key === "Enter") { e.preventDefault(); choose(results[active >= 0 ? active : 0]); }
    else if (e.key === "Escape") { setOpen(false); }
  }

  const cur = data?.current;
  const info = cur ? describe(cur.weather_code, cur.is_day === 1) : { theme: "clear" };
  const gradient = GRADIENTS[info.theme] || GRADIENTS.clear;
  const scene = skyScene(info.theme);
  const hours = data ? next24(data.hourly, data.current.time) : [];
  const wind = cur ? (unit === "f" ? `${Math.round(cur.wind_speed_10m * 0.621371)} mph` : `${Math.round(cur.wind_speed_10m)} km/h`) : "";

  return (
    <div className="sg">
      <style>{CSS}</style>
      <Sky gradient={gradient} scene={scene} />
      <div className="app">
        <div className="controls">
          <div className="search-wrap" ref={boxRef}>
            <div className="search">
              <SearchSvg />
              <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKeyDown} onFocus={() => results.length && setOpen(true)} placeholder="Search for a city" spellCheck="false" autoComplete="off" />
            </div>
            {open && (
              <ul className="suggest">
                {results.map((p, i) => (
                  <li key={p.id ?? `${p.lat},${p.lon}`} className={`suggest-item${i === active ? " active" : ""}`} onMouseDown={() => choose(p)} onMouseEnter={() => setActive(i)}>
                    <span className="s-name">{p.name}</span>
                    {p.region && <span className="s-region">{p.region}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button className="icon-btn" onClick={() => load(getByGeo)} disabled={loading} title="Use my location"><LocSvg /></button>
          <div className="units">
            <button className={unit === "c" ? "active" : ""} onClick={() => setUnit("c")}>°C</button>
            <button className={unit === "f" ? "active" : ""} onClick={() => setUnit("f")}>°F</button>
          </div>
        </div>

        {loading && <div className="spinner" />}
        {!loading && error && (<div className="glass notice"><h3>Hmm, that didn't work</h3><p>{error}</p></div>)}

        {!loading && !error && data && (
          <>
            <div className="current">
              <h1 className="place">{data.place.name}</h1>
              {data.place.region && <div className="place-region">{data.place.region}</div>}
              <div className="hero-icon"><WeatherIcon type={info.icon} size={108} /></div>
              <div className="temp">{toUnit(cur.temperature_2m, unit)}<span className="deg">°</span></div>
              <div className="condition">{info.label}</div>
              <div className="feels">Feels like {toUnit(cur.apparent_temperature, unit)}°</div>
              <div className="stats">
                <div className="glass stat"><div className="k"><DropSvg /> Humidity</div><div className="v">{cur.relative_humidity_2m}%</div></div>
                <div className="glass stat"><div className="k"><WindSvg /> Wind</div><div className="v">{wind}</div></div>
                <div className="glass stat"><div className="k"><GaugeSvg /> Pressure</div><div className="v">{Math.round(cur.surface_pressure)}</div></div>
              </div>
            </div>

            <HourlyChart hours={hours} unit={unit} />

            <div className="glass section">
              <p className="section-title">7-day forecast</p>
              <div className="daily">
                {data.daily.time.map((date, i) => {
                  const highs = data.daily.temperature_2m_max.map((t) => toUnit(t, unit));
                  const lows = data.daily.temperature_2m_min.map((t) => toUnit(t, unit));
                  const wmin = Math.min(...lows), wmax = Math.max(...highs), wspan = wmax - wmin || 1;
                  const ic = describe(data.daily.weather_code[i], true).icon;
                  const lo = lows[i], hi = highs[i];
                  return (
                    <div className="day" key={date}>
                      <span className="dname">{i === 0 ? "Today" : dayName(date)}</span>
                      <span className="dicon"><WeatherIcon type={ic} size={28} /></span>
                      <div className="range">
                        <span className="lo">{lo}°</span>
                        <span className="bar"><span className="fill" style={{ left: `${((lo - wmin) / wspan) * 100}%`, width: `${Math.max(((hi - lo) / wspan) * 100, 6)}%` }} /></span>
                        <span className="hi">{hi}°</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <div className="footer">Data from <a href="https://open-meteo.com" target="_blank" rel="noreferrer">Open-Meteo</a> · no API key required</div>
      </div>
    </div>
  );
}
