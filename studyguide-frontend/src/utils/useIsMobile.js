import { useEffect, useState } from 'react'

// Returns true when the viewport is at or below `breakpoint` px. Used to switch
// between the desktop sidebar layout and the mobile drawer layout.
export function useIsMobile(breakpoint = 768) {
  const query = `(max-width: ${breakpoint}px)`
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = (e) => setIsMobile(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return isMobile
}
