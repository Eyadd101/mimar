import { advancedResourceConfigs, type AdvancedResourceType } from '../simulation/expansionConfig'
import type { CampaignResourceType } from '../simulation/campaignSimulation'
import type { TranslationKey } from '../i18n/translations'

export type StageOnePaletteResource = {
  type: Extract<CampaignResourceType, 'users' | 'app-server' | 'database'>
  id: string
  name: string
  labelKey: TranslationKey
  descriptionKey: TranslationKey
  position: { x: number; y: number }
}

export const stageOneResourcePalette: readonly StageOnePaletteResource[] = [
  {
    type: 'users',
    id: 'users',
    name: 'Users',
    labelKey: 'resource.users',
    descriptionKey: 'resource.palette.usersDescription',
    position: { x: 330, y: 250 },
  },
  {
    type: 'app-server',
    id: 'server',
    name: 'App Server',
    labelKey: 'resource.appServer',
    descriptionKey: 'resource.palette.appServerDescription',
    position: { x: 670, y: 250 },
  },
  {
    type: 'database',
    id: 'database',
    name: 'Database',
    labelKey: 'resource.database',
    descriptionKey: 'resource.palette.databaseDescription',
    position: { x: 1010, y: 250 },
  },
]

export function getUnlockedAdvancedResources(campaign: import('../simulation/campaignSimulation').CampaignState) {
  return (Object.keys(advancedResourceConfigs) as AdvancedResourceType[]).filter(type =>
    campaign.unlockedResourceTypes.includes(type) &&
    !campaign.infrastructure.resources.some(resource => resource.type === type) &&
    !campaign.inventory.some(resource => resource.type === type),
  )
}
