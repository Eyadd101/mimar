import { stageOneResourcePalette } from '../data/resourcePalette'
import type {
  CampaignResource,
  CampaignResourceType,
} from '../simulation/campaignSimulation'
import type { StageOneBuildStep } from '../simulation/stageOneOnboardingSimulation'

type ResourcePaletteProps = {
  resources: readonly CampaignResource[]
  onAddResource: (
    type: Extract<CampaignResourceType, 'users' | 'app-server' | 'database'>,
  ) => void
  currentStep: StageOneBuildStep
}

export function ResourcePalette({
  resources,
  onAddResource,
  currentStep,
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
          const isCurrentResource =
            currentStep.resourceToPlace === resource.type
          const isDisabled = isPlaced || !isCurrentResource

          return (
            <article className="resource-palette__card" key={resource.type}>
              <div>
                <strong>{resource.englishName}</strong>
                <span lang="ar" dir="rtl">{resource.arabicName}</span>
              </div>
              <p>{resource.description}</p>
              <button
                type="button"
                disabled={isDisabled}
                onClick={() => onAddResource(resource.type)}
              >
                {isPlaced
                  ? 'Added'
                  : isCurrentResource
                    ? 'Add to canvas'
                    : 'Follow the guide'}
              </button>
            </article>
          )
        })}
      </div>
    </aside>
  )
}
