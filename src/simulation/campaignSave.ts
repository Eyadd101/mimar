import { campaignStageConfigs } from '../data/stages'
import {
  type CampaignResource,
  type CampaignResourceType,
  type CampaignState,
} from './campaignSimulation'
import { serverTierConfigs } from './config'

export const campaignSaveKey = 'cloud-game-campaign'
export const campaignSaveVersion = 1

type CampaignSaveEnvelope = {
  version: typeof campaignSaveVersion
  campaign: CampaignState
}

type StorageReader = Pick<Storage, 'getItem'>
type StorageWriter = Pick<Storage, 'setItem' | 'removeItem'>

export type CampaignSaveResult =
  | { status: 'empty' }
  | { status: 'ready'; campaign: CampaignState }
  | { status: 'corrupt'; message: string }

const resourceTypes: readonly CampaignResourceType[] = [
  'users',
  'app-server',
  'database',
  'load-balancer',
]

export function loadCampaignSave(
  storage: StorageReader | null = getBrowserStorage(),
): CampaignSaveResult {
  if (!storage) {
    return { status: 'empty' }
  }

  try {
    const storedValue = storage.getItem(campaignSaveKey)
    if (storedValue === null) {
      return { status: 'empty' }
    }

    const parsed: unknown = JSON.parse(storedValue)
    if (!isValidSaveEnvelope(parsed)) {
      return {
        status: 'corrupt',
        message: 'The saved campaign is invalid or from an unsupported version.',
      }
    }

    return { status: 'ready', campaign: parsed.campaign }
  } catch {
    return {
      status: 'corrupt',
      message: 'The saved campaign could not be read.',
    }
  }
}

export function saveCampaign(
  campaign: CampaignState,
  storage: StorageWriter | null = getBrowserStorage(),
) {
  if (!storage) {
    return false
  }

  const envelope: CampaignSaveEnvelope = {
    version: campaignSaveVersion,
    campaign,
  }

  try {
    storage.setItem(campaignSaveKey, JSON.stringify(envelope))
    return true
  } catch {
    return false
  }
}

export function clearCampaignSave(
  storage: StorageWriter | null = getBrowserStorage(),
) {
  if (!storage) {
    return false
  }

  try {
    storage.removeItem(campaignSaveKey)
    return true
  } catch {
    return false
  }
}

function getBrowserStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function isValidSaveEnvelope(value: unknown): value is CampaignSaveEnvelope {
  if (!isRecord(value) || value.version !== campaignSaveVersion) {
    return false
  }

  return isValidCampaign(value.campaign)
}

function isValidCampaign(value: unknown): value is CampaignState {
  if (!isRecord(value)) {
    return false
  }

  const stageIndexIsValid =
    Number.isInteger(value.currentStageIndex) &&
    Number(value.currentStageIndex) >= 0 &&
    Number(value.currentStageIndex) < campaignStageConfigs.length
  const balanceIsValid =
    typeof value.balance === 'number' &&
    Number.isFinite(value.balance) &&
    value.balance >= 0
  const seedIsValid = Number.isInteger(value.seed)
  const unlocksAreValid =
    Array.isArray(value.unlockedResourceTypes) &&
    value.unlockedResourceTypes.every(
      (resourceType) =>
        typeof resourceType === 'string' &&
        resourceTypes.includes(resourceType as CampaignResourceType),
    )
  const completedStagesAreValid =
    Array.isArray(value.completedStages) &&
    value.completedStages.every(
      (record) =>
        isRecord(record) &&
        typeof record.stageId === 'string' &&
        campaignStageConfigs.some((stage) => stage.id === record.stageId) &&
        (record.stars === 1 || record.stars === 2 || record.stars === 3),
    )

  return (
    stageIndexIsValid &&
    balanceIsValid &&
    seedIsValid &&
    unlocksAreValid &&
    completedStagesAreValid &&
    isValidInfrastructure(value.infrastructure)
  )
}

function isValidInfrastructure(value: unknown) {
  if (
    !isRecord(value) ||
    !Array.isArray(value.resources) ||
    !Array.isArray(value.connections) ||
    !value.resources.every(isValidResource)
  ) {
    return false
  }

  const resourceIds = new Set(
    value.resources.map((resource) => (resource as CampaignResource).id),
  )
  const requiredResourcesExist =
    value.resources.some(
      (resource) => (resource as CampaignResource).type === 'users',
    ) &&
    value.resources.some(
      (resource) => (resource as CampaignResource).type === 'database',
    ) &&
    value.resources.some(
      (resource) => (resource as CampaignResource).type === 'app-server',
    )

  return (
    requiredResourcesExist &&
    resourceIds.size === value.resources.length &&
    value.connections.every(
      (connection) =>
        isRecord(connection) &&
        typeof connection.id === 'string' &&
        typeof connection.sourceId === 'string' &&
        typeof connection.targetId === 'string' &&
        resourceIds.has(connection.sourceId) &&
        resourceIds.has(connection.targetId),
    )
  )
}

function isValidResource(value: unknown): value is CampaignResource {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.type !== 'string' ||
    !resourceTypes.includes(value.type as CampaignResourceType) ||
    !isRecord(value.position) ||
    typeof value.position.x !== 'number' ||
    !Number.isFinite(value.position.x) ||
    typeof value.position.y !== 'number' ||
    !Number.isFinite(value.position.y)
  ) {
    return false
  }

  return value.type !== 'app-server' || isServerTierId(value.tierId)
}

function isServerTierId(value: unknown): value is keyof typeof serverTierConfigs {
  return typeof value === 'string' && value in serverTierConfigs
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
