import { isConnectionTypeAllowed } from './connectionValidation'
import { backupConfig } from './expansionConfig'
import { securityRiskKeys } from './securitySimulation'
import { campaignStageConfigs } from '../data/stages'
import {
  type CampaignResource,
  type CampaignResourceType,
  type CampaignState,
} from './campaignSimulation'
import { serverTierConfigs, type SimulationSpeed } from './config'
import { isValidCheckpoint, type CampaignCheckpoint } from './checkpointValidation'
import type { GameState } from './gameStateSimulation'

export const campaignSaveKey = 'cloud-game-campaign'
export const campaignSaveVersion = 3

type CampaignSaveEnvelope = {
  version: typeof campaignSaveVersion
  campaign: CampaignState
  checkpoint?: CampaignCheckpoint
}

type StorageReader = Pick<Storage, 'getItem'>
type StorageWriter = Pick<Storage, 'setItem' | 'removeItem'>

export type CampaignSaveResult =
  | { status: 'empty' }
  | { status: 'ready'; campaign: CampaignState; gameState?: GameState; gameSpeed?: SimulationSpeed }
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

    return { status: 'ready', campaign: parsed.campaign,
      ...(parsed.checkpoint ? { gameState: { campaign: parsed.campaign, stageRuntime: parsed.checkpoint.stageRuntime, stageStartSnapshot: parsed.checkpoint.stageStartSnapshot }, gameSpeed: parsed.checkpoint.gameSpeed } : {}),
    }
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

/** Persist a complete checkpoint so paid deployments and retry snapshots survive reload. */
export function saveGameCheckpoint(
  gameState: GameState,
  gameSpeed: SimulationSpeed,
  storage: StorageWriter | null = getBrowserStorage(),
) {
  if (!storage) return false
  const envelope: CampaignSaveEnvelope = {
    version: campaignSaveVersion,
    campaign: gameState.campaign,
    checkpoint: { stageRuntime: gameState.stageRuntime, stageStartSnapshot: gameState.stageStartSnapshot, gameSpeed },
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
  if (!isRecord(value) || (value.version !== campaignSaveVersion && value.version !== 2 && value.version !== 1)) {
    return false
  }

  return isValidCampaign(value.campaign) &&
    (value.checkpoint === undefined || isValidCheckpoint(value.checkpoint, value.campaign, isValidCampaign))
}

function isValidCampaign(value: unknown): value is CampaignState {
  if (!isRecord(value)) {
    return false
  }

  if (value.storedData !== undefined && (!isRecord(value.storedData) || !['localObjects', 'storedObjects'].every(key => typeof value.storedData === 'object' && value.storedData !== null && typeof (value.storedData as Record<string, unknown>)[key] === 'number' && Number.isFinite((value.storedData as Record<string, unknown>)[key]) && Number((value.storedData as Record<string, unknown>)[key]) >= 0))) return false
  if (value.unlockedControls !== undefined && (!Array.isArray(value.unlockedControls) || !value.unlockedControls.every(key => key === 'database-scaling' || key === 'security' || key === 'backups'))) return false
  if (value.databaseData !== undefined) {
    const data = value.databaseData
    if (!isRecord(data) || typeof data.dataLost !== 'boolean' || !['revision', 'secondsSinceBackup'].every(key => typeof data[key] === 'number' && Number.isFinite(data[key]) && Number(data[key]) >= 0) || (data.backupRevision !== null && (typeof data.backupRevision !== 'number' || !Number.isFinite(data.backupRevision) || data.backupRevision < 1 || data.backupRevision > Number(data.revision)))) return false
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

  if (['cache', 'queue', 'worker', 'object-storage'].some(type => resources.filter(r => r.type === type).length > 1)) return false
  if (!value.connections.every(connection => {
    const source = resources.find(r => r.id === connection.sourceId)
    const target = resources.find(r => r.id === connection.targetId)
    return source && target && isConnectionTypeAllowed(source.type, target.type)
  })) return false
  const linked = (source: string, target: string) => connectionPairs.has(`${source}->${target}`)
  const cache = resources.find(r => r.type === 'cache')
  // Save valid alternative architectures, while requiring the core service path.
  return appServers.every(server => {
    const incoming = linked(users[0].id, server.id) || (loadBalancers[0] && linked(users[0].id, loadBalancers[0].id) && linked(loadBalancers[0].id, server.id))
    const dataPath = linked(server.id, databases[0].id) || (cache && linked(server.id, cache.id) && linked(cache.id, databases[0].id))
    return incoming && dataPath
  })
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

  if (value.type === 'database' && value.backups !== undefined && (!isRecord(value.backups) || typeof value.backups.enabled !== 'boolean' || !(backupConfig.frequenciesSeconds as readonly unknown[]).includes(value.backups.frequencySeconds))) return false
  if (value.type === 'database' && value.security !== undefined && (!isRecord(value.security) || !securityRiskKeys.every(key => isRecord(value.security) && typeof value.security[key] === 'boolean'))) return false
  if (value.type === 'database' && value.databaseTierId !== undefined && value.databaseTierId !== 'small' && value.databaseTierId !== 'medium') return false
  return value.type !== 'app-server' || isServerTierId(value.tierId)
}

function isServerTierId(value: unknown): value is keyof typeof serverTierConfigs {
  return typeof value === 'string' && value in serverTierConfigs
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
