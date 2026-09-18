import { campaignStageConfigs } from '../data/stages'
import {
  type CampaignResource,
  type CampaignResourceType,
  type CampaignState,
} from './campaignSimulation'
import { serverTierConfigs } from './config'

export const campaignSaveKey = 'cloud-game-campaign'
export const campaignSaveVersion = 2

type CampaignSaveEnvelope = {
  version: typeof campaignSaveVersion
  campaign: CampaignState
}

type StorageReader = Pick<Storage, 'getItem'>
type StorageWriter = Pick<Storage, 'setItem' | 'removeItem'>

export type CampaignSaveResult =
  | { status: 'empty' }
  | { status: 'ready'; campaign: CampaignState }
  | { status: 'corrupt'; error: 'invalid' | 'unreadable' }

const resourceTypes: readonly CampaignResourceType[] = [
  'users',
  'app-server',
  'database',
  'load-balancer',
  'cache',
  'queue',
  'worker',
  'object-storage',
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
        error: 'invalid',
      }
    }

    return { status: 'ready', campaign: parsed.campaign }
  } catch {
    return {
      status: 'corrupt',
      error: 'unreadable',
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
  if (!isRecord(value) || (value.version !== campaignSaveVersion && value.version !== 1)) {
    return false
  }

  return isValidCampaign(value.campaign)
}

function isValidCampaign(value: unknown): value is CampaignState {
  if (!isRecord(value)) {
    return false
  }

  if (value.storedData !== undefined && (!isRecord(value.storedData) || !['localObjects', 'storedObjects'].every(key => typeof value.storedData === 'object' && value.storedData !== null && typeof (value.storedData as Record<string, unknown>)[key] === 'number' && Number.isFinite((value.storedData as Record<string, unknown>)[key]) && Number((value.storedData as Record<string, unknown>)[key]) >= 0))) return false
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
  const completedStageIds = Array.isArray(value.completedStages)
    ? value.completedStages
        .filter(isRecord)
        .map((record) => record.stageId)
    : []
  const completedStagesAreValid =
    Array.isArray(value.completedStages) &&
    value.completedStages.every(
      (record) =>
        isRecord(record) &&
        typeof record.stageId === 'string' &&
        campaignStageConfigs.some((stage) => stage.id === record.stageId) &&
        (record.stars === 1 || record.stars === 2 || record.stars === 3),
    ) &&
    new Set(completedStageIds).size === completedStageIds.length &&
    completedStageIds.length <= Number(value.currentStageIndex)
  const infrastructureIsValid = isValidInfrastructure(
    value.infrastructure,
    Number(value.currentStageIndex),
  )
  const loadBalancerUnlockIsValid =
    !infrastructureContainsResource(value.infrastructure, 'load-balancer') ||
    (Array.isArray(value.unlockedResourceTypes) &&
      value.unlockedResourceTypes.includes('load-balancer'))

  return (
    stageIndexIsValid &&
    balanceIsValid &&
    seedIsValid &&
    unlocksAreValid &&
    completedStagesAreValid &&
    infrastructureIsValid &&
    loadBalancerUnlockIsValid
  )
}

function isValidInfrastructure(value: unknown, currentStageIndex: number) {
  if (
    !isRecord(value) ||
    !Array.isArray(value.resources) ||
    !Array.isArray(value.connections) ||
    !value.resources.every(isValidResource)
  ) {
    return false
  }

  const resources = value.resources as CampaignResource[]
  const resourceIds = new Set(resources.map((resource) => resource.id))
  const users = resources.filter((resource) => resource.type === 'users')
  const databases = resources.filter(
    (resource) => resource.type === 'database',
  )
  const appServers = resources.filter(
    (resource) => resource.type === 'app-server',
  )
  const loadBalancers = resources.filter(
    (resource) => resource.type === 'load-balancer',
  )
  const resourceCountsAreValid = currentStageIndex === 0
    ? users.length <= 1 &&
      databases.length <= 1 &&
      appServers.length <= 1 &&
      loadBalancers.length === 0
    : users.length === 1 &&
      databases.length === 1 &&
      appServers.length >= 1 &&
      appServers.length <= 2 &&
      loadBalancers.length <= 1 &&
      (loadBalancers.length === 1 || appServers.length === 1)
  const connectionIds = new Set<string>()
  const connectionPairs = new Set<string>()
  const connectionsAreWellFormed = value.connections.every((connection) => {
    if (
      !isRecord(connection) ||
      typeof connection.id !== 'string' ||
      typeof connection.sourceId !== 'string' ||
      typeof connection.targetId !== 'string' ||
      !resourceIds.has(connection.sourceId) ||
      !resourceIds.has(connection.targetId)
    ) {
      return false
    }

    connectionIds.add(connection.id)
    connectionPairs.add(`${connection.sourceId}->${connection.targetId}`)
    return true
  })

  if (
    !resourceCountsAreValid ||
    !connectionsAreWellFormed ||
    resourceIds.size !== value.resources.length ||
    connectionIds.size !== value.connections.length ||
    connectionPairs.size !== value.connections.length
  ) {
    return false
  }

  if (currentStageIndex === 0) {
    const allowedConnections = new Set<string>()
    if (users[0] && appServers[0]) {
      allowedConnections.add(`${users[0].id}->${appServers[0].id}`)
    }
    if (appServers[0] && databases[0]) {
      allowedConnections.add(`${appServers[0].id}->${databases[0].id}`)
    }

    return [...connectionPairs].every((connection) =>
      allowedConnections.has(connection),
    )
  }

  const cache = resources.find(resource => resource.type === 'cache')
  const databaseTargetId = cache?.id ?? databases[0].id
  const expectedConnections = loadBalancers[0]
    ? [
        `${users[0].id}->${loadBalancers[0].id}`,
        ...appServers.flatMap((server) => [
          `${loadBalancers[0].id}->${server.id}`,
          `${server.id}->${databaseTargetId}`,
        ]),
      ]
    : [
        `${users[0].id}->${appServers[0].id}`,
        `${appServers[0].id}->${databaseTargetId}`,
      ]

  const storage = resources.find(r => r.type === 'object-storage')
  if (storage) for (const server of appServers) expectedConnections.push(`${server.id}->${storage.id}`)
  const queue = resources.find(r => r.type === 'queue')
  const worker = resources.find(r => r.type === 'worker')
  if (queue) for (const server of appServers) expectedConnections.push(`${server.id}->${queue.id}`)
  if (queue && worker) expectedConnections.push(`${queue.id}->${worker.id}`)
  if (['queue', 'worker', 'object-storage'].some(type => resources.filter(r => r.type === type).length > 1)) return false
  if (cache) expectedConnections.push(`${cache.id}->${databases[0].id}`)
  if (resources.filter(r => r.type === 'cache').length > 1) return false
  return (
    connectionPairs.size === expectedConnections.length &&
    expectedConnections.every((connection) => connectionPairs.has(connection))
  )
}

function infrastructureContainsResource(
  value: unknown,
  type: CampaignResourceType,
) {
  return (
    isRecord(value) &&
    Array.isArray(value.resources) &&
    value.resources.some(
      (resource) => isRecord(resource) && resource.type === type,
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

  if (value.type === 'database' && value.databaseTierId !== undefined && value.databaseTierId !== 'small' && value.databaseTierId !== 'medium') return false
  return value.type !== 'app-server' || isServerTierId(value.tierId)
}

function isServerTierId(value: unknown): value is keyof typeof serverTierConfigs {
  return typeof value === 'string' && value in serverTierConfigs
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
