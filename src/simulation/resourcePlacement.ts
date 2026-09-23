import type { CampaignResource, ResourcePosition } from './campaignSimulation'
import { resourcePlacementConfig } from './expansionConfig'

/** Pick a free deployment slot; never move resources the player already placed. */
export function findDeploymentPosition(resources: readonly CampaignResource[], preferred: ResourcePosition): ResourcePosition {
  const { minimumHorizontalGap, minimumVerticalGap, gridStep } = resourcePlacementConfig
  const free = (p: ResourcePosition) => resources.every(resource => Math.abs(resource.position.x - p.x) >= minimumHorizontalGap || Math.abs(resource.position.y - p.y) >= minimumVerticalGap)
  if (free(preferred)) return { ...preferred }
  for (let ring = 1; ring <= resources.length + 1; ring++) {
    for (let x = -ring; x <= ring; x++) {
      for (const y of [-ring, ring]) {
        const position = { x: preferred.x + x * gridStep, y: preferred.y + y * gridStep }
        if (free(position)) return position
      }
    }
  }
  return { x: preferred.x, y: preferred.y + (resources.length + 2) * gridStep }
}
