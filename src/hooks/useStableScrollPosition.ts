import { useLayoutEffect, useRef, type UIEventHandler } from 'react'

const savedScrollPositions = new Map<string, number>()

/**
 * Simulation metrics update every second. Keep a player's reading position
 * independent from those renders and restore it when a panel temporarily
 * unmounts (for example while resource details are open).
 */
export function useStableScrollPosition<T extends HTMLElement>(panelId: string) {
  const ref = useRef<T>(null)

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return

    const savedPosition = savedScrollPositions.get(panelId) ?? 0
    element.scrollTop = savedPosition

    // Restore only when this panel mounts or changes identity. A simulation
    // tick must never write an old position over the player's current scroll.
    return () => {
      savedScrollPositions.set(panelId, element.scrollTop)
    }
  }, [panelId])

  const onScroll: UIEventHandler<T> = (event) => {
    savedScrollPositions.set(panelId, event.currentTarget.scrollTop)
  }

  return [ref, onScroll] as const
}
