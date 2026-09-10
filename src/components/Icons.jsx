// Small UI icons (not weather glyphs). Inherit currentColor.
const base = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }

export const SearchIcon = () => (
  <svg {...base}>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

export const LocationIcon = () => (
  <svg {...base}>
    <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
)

export const DropIcon = () => (
  <svg {...base} width="15" height="15">
    <path d="M12 3s6 6.4 6 10.5A6 6 0 0 1 6 13.5C6 9.4 12 3 12 3z" />
  </svg>
)

export const WindIcon = () => (
  <svg {...base} width="15" height="15">
    <path d="M3 8h11a3 3 0 1 0-3-3" />
    <path d="M3 12h15a3 3 0 1 1-3 3" />
    <path d="M3 16h8" />
  </svg>
)

export const GaugeIcon = () => (
  <svg {...base} width="15" height="15">
    <path d="M12 13l4-4" />
    <path d="M4 18a8 8 0 1 1 16 0" />
  </svg>
)
