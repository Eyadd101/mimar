import { stageOneResourcePalette } from '../data/resourcePalette'
import type {
  CampaignResource,
  CampaignResourceType,
} from '../simulation/campaignSimulation'
import type { StageOneBuildStep } from '../simulation/stageOneOnboardingSimulation'
import { useLanguage } from '../i18n/useLanguage'
import { TechnicalTerm } from './TechnicalTerm'

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
  const { language, t } = useLanguage()

  return (
    <aside
      className="resource-palette nodrag nopan"
      aria-label={t('palette.title')}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="resource-palette__heading">
        <span>{t('palette.title')}</span>
        <strong>{t('palette.available')}</strong>
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
                <strong><TechnicalTerm translationKey={resource.labelKey} /></strong>
              </div>
              <p>{t(resource.descriptionKey)}</p>
              <button
                type="button"
                disabled={isDisabled}
                onClick={() => onAddResource(resource.type)}
              >
                {isPlaced
                  ? t('palette.added')
                  : isCurrentResource
                    ? t('palette.add')
                    : t('palette.followGuide')}
              </button>
            </article>
          )
        })}
      </div>
    </aside>
  )
}
