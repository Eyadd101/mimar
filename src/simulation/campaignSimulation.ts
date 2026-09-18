import {
  additionalAppServerConfig,
  appServerResourceConfig,
  campaignProgressionConfig,
  economyConfig,
  loadBalancerResourceConfig,
  type ServerTierId,
} from './config'
import { stageOneResourcePalette } from '../data/resourcePalette'
import { validateStageOneConnection } from './connectionValidation'
import type { StageRating } from './starRatingSimulation'
import type {
  TrafficInfrastructure,
  TrafficSimulationState,
} from './trafficSimulation'

export type CampaignResourceType =
  | 'users'
  | 'app-server'
  | 'database'
  | 'load-balancer'

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
      type: 'users' | 'database' | 'load-balancer'
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
          position: { x: 300, y: 0 },
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
          position: { x: 600, y: 140 },
        },
      ],
    },
  })
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

  if (!balanceChanged && !tierChanged) {
    return campaign
  }

  return {
    ...campaign,
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
    infrastructure: { resources, connections },
  }
}
