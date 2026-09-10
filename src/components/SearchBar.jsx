import { useState, useEffect, useRef } from 'react'
import { SearchIcon, LocationIcon } from './Icons.jsx'
import { searchPlaces } from '../weather.js'

/**
 * City search with a live suggestions dropdown. As you type we
 * debounce (wait ~280ms after the last keystroke) and fetch matches,
 * so "Florida" lets you pick the right one instead of guessing.
 */
export default function SearchBar({ onSelectPlace, onLocate, unit, onUnitChange, loading }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const timer = useRef(null)
  const boxRef = useRef(null)

  // Debounced search whenever the query changes.
  useEffect(() => {
    clearTimeout(timer.current)
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    timer.current = setTimeout(async () => {
      const places = await searchPlaces(q, 6)
      setResults(places)
      setOpen(places.length > 0)
      setActive(-1)
    }, 280)
    return () => clearTimeout(timer.current)
  }, [query])

  // Close the dropdown when clicking outside.
  useEffect(() => {
    function onClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function choose(place) {
    setQuery(place.name)
    setResults([])
    setOpen(false)
    setActive(-1)
    onSelectPlace(place)
  }

  function onKeyDown(e) {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(results[active >= 0 ? active : 0])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="controls">
      <div className="search-wrap" ref={boxRef}>
        <div className="search">
          <SearchIcon />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => results.length && setOpen(true)}
            placeholder="Search for a city"
            aria-label="Search for a city"
            role="combobox"
            aria-expanded={open}
            aria-controls="city-suggestions"
            autoComplete="off"
            spellCheck="false"
          />
        </div>

        {open && (
          <ul className="suggest" id="city-suggestions" role="listbox">
            {results.map((place, i) => (
              <li
                key={place.id ?? `${place.lat},${place.lon}`}
                className={`suggest-item${i === active ? ' active' : ''}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={() => choose(place)}
                onMouseEnter={() => setActive(i)}
              >
                <span className="s-name">{place.name}</span>
                {place.region && <span className="s-region">{place.region}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        className="icon-btn"
        onClick={onLocate}
        disabled={loading}
        aria-label="Use my location"
        title="Use my location"
      >
        <LocationIcon />
      </button>

      <div className="units" role="group" aria-label="Temperature unit">
        <button
          className={unit === 'c' ? 'active' : ''}
          onClick={() => onUnitChange('c')}
          aria-pressed={unit === 'c'}
        >
          °C
        </button>
        <button
          className={unit === 'f' ? 'active' : ''}
          onClick={() => onUnitChange('f')}
          aria-pressed={unit === 'f'}
        >
          °F
        </button>
      </div>
    </div>
  )
}
