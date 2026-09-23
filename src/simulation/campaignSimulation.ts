import { findDeploymentPosition } from './resourcePlacement'
import { defaultBackupSettings, initialDatabaseData, type BackupSettings, type DatabaseData } from './backupSimulation'
import { secureSettings, type SecuritySettings } from './securitySimulation'
import { emptyStoredData, type StoredData } from './storageSimulation'
import { advancedResourceConfigs, type AdvancedResourceType, type DatabaseTierId } from './expansionConfig'
import {
  additionalAppServerConfig,
  appServerResourceConfig,
  campaignProgressionConfig,
  economyConfig,
  loadBalancerResourceConfig,
  type ServerTierId,
} from './config'
import { stageOneResourcePalette } from '../data/resourcePalette'
import { validateStageOneConnection, validateCampaignConnection } from './connectionValidation'
import type { StageRating } from './starRatingSimulation'
import type {
  TrafficInfrastructure,
  TrafficSimulationState,
} from './trafficSimulation'

export type CampaignControl = 'database-scaling' | 'security' | 'backups'

export type CampaignResourceType =
  | 'users'
  | 'app-server'
  | 'database'
  | 'load-balancer'
  | AdvancedResourceType

export type ResourcePosition = {
  x: number
  y: number
}

type CampaignResourceBase = {
  id: string
  name: string
  position: ResourcePosition
}

export type CampaignResource =
  | (CampaignResourceBase & {
      type: 'users' | 'load-balancer' | AdvancedResourceType
    })
  | (CampaignResourceBase & {
      type: 'database'
      databaseTierId?: DatabaseTierId
      security?: SecuritySettings
      backups?: BackupSettings
    })
  | (CampaignResourceBase & {
      type: 'app-server'
      tierId: ServerTierId
    })

export type CampaignConnection = {
  id: string
  sourceId: string
  targetId: string
}

export type CampaignInfrastructureState = {
  resources: CampaignResource[]
  connections: CampaignConnection[]
}

export type CampaignStageRecord = {
  stageId: string
  stars: 1 | 2 | 3
}

export type CampaignState = {
  currentStageIndex: number
  balance: number
  infrastructure: CampaignInfrastructureState
  unlockedResourceTypes: CampaignResourceType[]
  completedStages: CampaignStageRecord[]
  seed: number
  unlockedControls?: CampaignControl[]
  databaseData?: DatabaseData
  storedData?: StoredData
}

export function createInitialCampaignState(
  seed = campaignProgressionConfig.defaultCampaignSeed,
): CampaignState {
  return {
    currentStageIndex: 0,
    balance: economyConfig.initialBalance,
    infrastructure: {
      resources: [],
      connections: [],
    },
    unlockedResourceTypes: ['users', 'app-server', 'database'],
    completedStages: [],
    seed,
  }
}

export function hasOperationalServicePath(campaign: CampaignState) {
  const users = campaign.infrastructure.resources.find(
    (resource) => resource.type === 'users',
  )
  const appServer = campaign.infrastructure.resources.find(
    (resource) => resource.type === 'app-server',
  )
  const database = campaign.infrastructure.resources.find(
    (resource) => resource.type === 'database',
  )

  if (!users || !appServer || !database) {
    return false
  }

  return (
    campaign.infrastructure.connections.some(
      (connection) =>
        connection.sourceId === users.id &&
        connection.targetId === appServer.id,
    ) &&
    campaign.infrastructure.connections.some(
      (connection) =>
        connection.sourceId === appServer.id &&
        connection.targetId === database.id,
    )
  )
}

export function addStageOneResource(
  campaign: CampaignState,
  resourceType: Extract<
    CampaignResourceType,
    'users' | 'app-server' | 'database'
  >,
) {
  const definition = stageOneResourcePalette.find(
    (resource) => resource.type === resourceType,
  )
  const resourceAlreadyExists = campaign.infrastructure.resources.some(
    (resource) => resource.type === resourceType,
  )

  if (
    campaign.currentStageIndex !== 0 ||
    !definition ||
    resourceAlreadyExists ||
    !campaign.unlockedResourceTypes.includes(resourceType)
  ) {
    return campaign
  }

  const resource: CampaignResource =
    resourceType === 'app-server'
      ? {
          id: definition.id,
          type: resourceType,
          name: definition.name,
          tierId: appServerResourceConfig.initialTierId,
          position: { ...definition.position },
        }
      : {
          id: definition.id,
          type: resourceType,
          name: definition.name,
          position: { ...definition.position },
        }

  return {
    ...campaign,
    infrastructure: {
      ...campaign.infrastructure,
      resources: [...campaign.infrastructure.resources, resource],
    },
  }
}

export function addStageOneConnection(
  campaign: CampaignState,
  sourceId: string,
  targetId: string,
) {
  if (
    campaign.currentStageIndex !== 0 ||
    !validateStageOneConnection(
      campaign.infrastructure,
      sourceId,
      targetId,
    ).valid
  ) {
    return campaign
  }

  return {
    ...campaign,
    infrastructure: {
      ...campaign.infrastructure,
      connections: [
        ...campaign.infrastructure.connections,
        {
          id: `${sourceId}-${targetId}`,
          sourceId,
          targetId,
        },
      ],
    },
  }
}

export function connectCampaignResources(campaign: CampaignState, sourceId: string, targetId: string): CampaignState {
  if (!validateCampaignConnection(campaign.infrastructure, sourceId, targetId).valid) return campaign
  return { ...campaign, infrastructure: { ...campaign.infrastructure, connections: [...campaign.infrastructure.connections, { id: `${sourceId}-${targetId}`, sourceId, targetId }] } }
}

/** Advanced services affect workload only when their necessary graph links exist. */
export function isAdvancedResourceConnected(campaign: CampaignState, type: AdvancedResourceType) {
  const resources = campaign.infrastructure.resources
  const resource = resources.find(r => r.type === type)
  if (!resource) return false
  const linked = (sourceId: string, targetId: string) => campaign.infrastructure.connections.some(c => c.sourceId === sourceId && c.targetId === targetId)
  if (type === 'worker') {
    const queue = resources.find(r => r.type === 'queue')
    return !!queue && linked(queue.id, resource.id)
  }
  const servers = getAppServers(campaign)
  if (!servers.length || !servers.every(server => linked(server.id, resource.id))) return false
  if (type === 'cache') {
    const database = resources.find(r => r.type === 'database')
    return !!database && linked(resource.id, database.id)
  }
  return true
}

export function getPrimaryAppServer(campaign: CampaignState) {
  const appServer = campaign.infrastructure.resources.find(
    (resource) => resource.type === 'app-server',
  )

  if (!appServer || appServer.type !== 'app-server') {
    throw new Error('Campaign infrastructure requires an App Server.')
  }

  return appServer
}

export function getAppServers(campaign: CampaignState) {
  return campaign.infrastructure.resources.filter(
    (resource) => resource.type === 'app-server',
  )
}

export function hasLoadBalancer(campaign: CampaignState) {
  return campaign.infrastructure.resources.some(
    (resource) => resource.type === 'load-balancer',
  )
}

export function applyResourceUnlocks(
  campaign: CampaignState,
  unlocks: readonly CampaignResourceType[],
): CampaignState {
  const unlockedResourceTypes = Array.from(
    new Set([...campaign.unlockedResourceTypes, ...unlocks]),
  )

  return unlockedResourceTypes.length === campaign.unlockedResourceTypes.length
    ? campaign
    : { ...campaign, unlockedResourceTypes }
}

export function addLoadBalancerResource(
  campaign: CampaignState,
): CampaignState {
  if (hasLoadBalancer(campaign)) {
    return campaign
  }

  return rebuildInfrastructure({
    ...campaign,
    infrastructure: {
      ...campaign.infrastructure,
      resources: [
        ...campaign.infrastructure.resources,
        {
          id: 'load-balancer',
          type: 'load-balancer',
          name: loadBalancerResourceConfig.name,
          position: findDeploymentPosition(campaign.infrastructure.resources, { x: 300, y: 0 }),
        },
      ],
    },
  })
}

export function addAdditionalAppServerResource(
  campaign: CampaignState,
): CampaignState {
  if (
    !hasLoadBalancer(campaign) ||
    campaign.infrastructure.resources.some(
      (resource) => resource.id === additionalAppServerConfig.id,
    )
  ) {
    return campaign
  }

  return rebuildInfrastructure({
    ...campaign,
    infrastructure: {
      ...campaign.infrastructure,
      resources: [
        ...campaign.infrastructure.resources.map((resource) =>
          resource.type === 'app-server'
            ? { ...resource, name: 'App Server A' }
            : resource,
        ),
        {
          id: additionalAppServerConfig.id,
          type: 'app-server',
          name: additionalAppServerConfig.name,
          tierId: additionalAppServerConfig.initialTierId,
          position: findDeploymentPosition(campaign.infrastructure.resources, { x: 600, y: 140 }),
        },
      ],
    },
  })
}

export function addAdvancedResource(campaign: CampaignState, type: AdvancedResourceType): CampaignState {
  if (campaign.infrastructure.resources.some(resource => resource.type === type)) return campaign
  const definition = advancedResourceConfigs[type]
  const resource: CampaignResource = { id: type, type, name: definition.name, position: findDeploymentPosition(campaign.infrastructure.resources, definition.position) }
  const resources = [...campaign.infrastructure.resources, resource]
  let connections = campaign.infrastructure.connections
  const database = resources.find(r => r.type === 'database')
  if (type === 'cache' && database) {
    connections = connections.filter(c => !getAppServers(campaign).some(s => s.id === c.sourceId && c.targetId === database.id))
    connections = [...connections, ...getAppServers(campaign).map(s => ({ id: `${s.id}-cache`, sourceId: s.id, targetId: 'cache' })), { id: 'cache-database', sourceId: 'cache', targetId: database.id }]
  }
  if (type === 'object-storage') connections = [...connections, ...getAppServers(campaign).map(server => ({ id: `${server.id}-object-storage`, sourceId: server.id, targetId: 'object-storage' }))]
  if (type === 'queue') connections = [...connections, ...getAppServers(campaign).map(server => ({ id: `${server.id}-queue`, sourceId: server.id, targetId: 'queue' }))]
  if ((type === 'queue' || type === 'worker') && resources.some(r => r.type === 'queue') && resources.some(r => r.type === 'worker')) connections = [...connections, { id: 'queue-worker', sourceId: 'queue', targetId: 'worker' }]
  return { ...campaign, infrastructure: { resources, connections } }
}

export function syncCampaignWithSimulation(
  campaign: CampaignState,
  simulation: TrafficSimulationState,
): CampaignState {
  const balanceChanged = campaign.balance !== simulation.balance
  const tierChanged = getAppServers(campaign).some((resource) => {
    const runtime = simulation.appServers.find(
      (server) => server.resourceId === resource.id,
    )
    return runtime && runtime.tierId !== resource.tierId
  })

  const databaseDataChanged = campaign.databaseData !== simulation.databaseData
  const dataChanged = campaign.storedData?.storedObjects !== simulation.storage.storedObjects || campaign.storedData?.localObjects !== simulation.storage.localObjects
  if (!balanceChanged && !tierChanged && !dataChanged && !databaseDataChanged) {
    return campaign
  }

  return {
    ...campaign,
    databaseData: simulation.databaseData,
    storedData: { storedObjects: simulation.storage.storedObjects, localObjects: simulation.storage.localObjects },
    balance: simulation.balance,
    infrastructure: tierChanged
      ? {
          ...campaign.infrastructure,
          resources: campaign.infrastructure.resources.map((resource) =>
            resource.type === 'app-server'
              ? {
                  ...resource,
                  tierId:
                    simulation.appServers.find(
                      (server) => server.resourceId === resource.id,
                    )?.tierId ?? resource.tierId,
                }
              : resource,
          ),
        }
      : campaign.infrastructure,
  }
}

export function createTrafficInfrastructure(
  campaign: CampaignState,
): TrafficInfrastructure {
  return {
    appServers: getAppServers(campaign).map((server) => ({
      id: server.id,
      name: server.name,
      tierId: server.tierId,
    })),
    backupSettings: campaign.infrastructure.resources.find(resource => resource.type === 'database')?.backups ?? defaultBackupSettings,
    databaseData: campaign.databaseData ?? initialDatabaseData,
    securitySettings: campaign.infrastructure.resources.find(resource => resource.type === 'database')?.security ?? secureSettings,
    objectStorageProvisioned: campaign.infrastructure.resources.some(resource => resource.type === 'object-storage'),
    hasObjectStorage: isAdvancedResourceConnected(campaign, 'object-storage'),
    storedData: campaign.storedData ?? emptyStoredData,
    hasQueue: isAdvancedResourceConnected(campaign, 'queue'),
    hasWorker: isAdvancedResourceConnected(campaign, 'worker'),
    hasCache: isAdvancedResourceConnected(campaign, 'cache'),
    advancedCostPerPeriod: campaign.infrastructure.resources.reduce((sum, resource) => sum + (resource.type !== 'object-storage' && resource.type in advancedResourceConfigs ? advancedResourceConfigs[resource.type as AdvancedResourceType].costPerPeriod : 0), 0),
    databaseTierId: campaign.infrastructure.resources.find(resource => resource.type === 'database')?.databaseTierId ?? 'small',
    hasDatabase: campaign.infrastructure.resources.some(resource => resource.type === 'database'),
    distributesTraffic: hasLoadBalancer(campaign),
    loadBalancerCostPerPeriod: hasLoadBalancer(campaign)
      ? loadBalancerResourceConfig.costPerPeriod
      : 0,
  }
}

export function updateResourcePositions(
  campaign: CampaignState,
  updates: readonly { id: string; position: ResourcePosition }[],
): CampaignState {
  const positionsById = new Map(
    updates.map((update) => [update.id, update.position]),
  )
  let positionChanged = false
  const resources = campaign.infrastructure.resources.map((resource) => {
    const position = positionsById.get(resource.id)

    if (
      !position ||
      (position.x === resource.position.x && position.y === resource.position.y)
    ) {
      return resource
    }

    positionChanged = true
    return { ...resource, position: { ...position } }
  })

  if (!positionChanged) {
    return campaign
  }

  return {
    ...campaign,
    infrastructure: {
      ...campaign.infrastructure,
      resources,
    },
  }
}

export function createNextCampaignState(
  campaign: CampaignState,
  completedStageId: string,
  rating: StageRating,
): CampaignState {
  const stars = Math.max(1, rating.stars) as 1 | 2 | 3
  const carriedBalance = Math.max(
    Math.round(
      campaign.balance * campaignProgressionConfig.balanceCarryoverRatio * 10,
    ) / 10,
    campaignProgressionConfig.minimumNextStageBalance,
  )

  return {
    ...campaign,
    currentStageIndex: campaign.currentStageIndex + 1,
    balance: carriedBalance,
    completedStages: [
      ...campaign.completedStages,
      { stageId: completedStageId, stars },
    ],
  }
}

function rebuildInfrastructure(campaign: CampaignState): CampaignState {
  const appServers = getAppServers(campaign)
  // Existing positions belong to the player. Deployment changes topology only.
  const resources = campaign.infrastructure.resources
  const database = resources.find((resource) => resource.type === 'database')
  const users = resources.find((resource) => resource.type === 'users')
  const loadBalancer = resources.find(
    (resource) => resource.type === 'load-balancer',
  )

  if (!database || !users) {
    throw new Error('Campaign infrastructure requires Users and Database.')
  }

  const connections: CampaignConnection[] = loadBalancer
    ? [
        {
          id: 'users-load-balancer',
          sourceId: users.id,
          targetId: loadBalancer.id,
        },
        ...appServers.flatMap((server) => [
          {
            id: `load-balancer-${server.id}`,
            sourceId: loadBalancer.id,
            targetId: server.id,
          },
          {
            id: `${server.id}-database`,
            sourceId: server.id,
            targetId: database.id,
          },
        ]),
      ]
    : [
        {
          id: 'users-server',
          sourceId: users.id,
          targetId: appServers[0].id,
        },
        {
          id: 'server-database',
          sourceId: appServers[0].id,
          targetId: database.id,
        },
      ]

  return {
    ...campaign,
    infrastructure: { resources, connections: [
      ...connections.filter(connection => !resources.some(r => r.type === 'cache') || !appServers.some(server => server.id === connection.sourceId && connection.targetId === database.id)),
      ...campaign.infrastructure.connections.filter(connection => resources.some(r => r.id === connection.sourceId && r.type in advancedResourceConfigs) || resources.some(r => r.id === connection.targetId && r.type in advancedResourceConfigs)),
      ...appServers.flatMap(server => resources.filter(r => ['cache', 'queue', 'object-storage'].includes(r.type) && !campaign.infrastructure.connections.some(c => c.sourceId === server.id && c.targetId === r.id)).map(r => ({ id: `${server.id}-${r.id}`, sourceId: server.id, targetId: r.id }))),
    ] },
  }
}
