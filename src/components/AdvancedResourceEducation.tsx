import { getAdvancedResourceCause } from '../data/advancedEducation'
import { useLanguage } from '../i18n/useLanguage'
import type { CampaignResourceType } from '../simulation/campaignSimulation'
import type { TrafficSimulationState } from '../simulation/trafficSimulation'

export function AdvancedResourceEducation({ type, simulation }: { type: CampaignResourceType; simulation: TrafficSimulationState }) {
  const { t } = useLanguage()
  const cause = getAdvancedResourceCause(type, simulation)
  return cause ? <section className="resource-panel__education"><h3>{t('advanced.whyChanging')}</h3><p>{t(cause.key, cause.variables)}</p></section> : null
}
