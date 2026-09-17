import { stageOneResourcePalette } from '../data/resourcePalette'
import type {
  CampaignResource,
  CampaignResourceType,
} from '../simulation/campaignSimulation'

type ResourcePaletteProps = {
  resources: readonly CampaignResource[]
  onAddResource: (
    type: Extract<CampaignResourceType, 'users' | 'app-server' | 'database'>,
  ) => void
}

export function ResourcePalette({
  resources,
  onAddResource,
}: ResourcePaletteProps) {
  return (
    <aside className="resource-palette nodrag nopan" aria-label="Resource palette">
      <div className="resource-palette__heading">
        <span>Resource palette</span>
        <strong>Available resources</strong>
      </div>
      <div className="resource-palette__list">
        {stageOneResourcePalette.map((resource) => {
          const isPlaced = resources.some(
            (placedResource) => placedResource.type === resource.type,
          )

          return (
            <article className="resource-palette__card" key={resource.type}>
              <div>
                <strong>{resource.englishName}</strong>
                <span lang="ar" dir="rtl">{resource.arabicName}</span>
              </div>
              <p>{resource.description}</p>
              <button
                type="button"
                disabled={isPlaced}
                onClick={() => onAddResource(resource.type)}
              >
                {isPlaced ? 'Added' : 'Add to canvas'}
              </button>
            </article>
          )
        })}
      </div>
    </aside>
  )
}
