import type {
  CampaignInfrastructureState,
  CampaignResourceType,
} from './campaignSimulation'
import type { TranslationKey } from '../i18n/translations'

export type ConnectionExplanation = {
  key: TranslationKey
  suggestionKey?: TranslationKey
  attempted?: {
    sourceType: CampaignResourceType
    targetType: CampaignResourceType
  }
}

export type ConnectionValidationResult =
  | { valid: true; explanation: ConnectionExplanation }
  | { valid: false; explanation: ConnectionExplanation }

type ConnectionRule = {
  sourceType: CampaignResourceType
  targetType: CampaignResourceType
}

const stageOneConnectionRules: readonly ConnectionRule[] = [
  { sourceType: 'users', targetType: 'app-server' },
  { sourceType: 'app-server', targetType: 'database' },
]

export const campaignConnectionRules: readonly ConnectionRule[] = [
  ...stageOneConnectionRules,
  { sourceType: 'users', targetType: 'load-balancer' },
  { sourceType: 'load-balancer', targetType: 'app-server' },
  { sourceType: 'app-server', targetType: 'cache' },
  { sourceType: 'cache', targetType: 'database' },
  { sourceType: 'app-server', targetType: 'queue' },
  { sourceType: 'queue', targetType: 'worker' },
  { sourceType: 'app-server', targetType: 'object-storage' },
]

export function isConnectionTypeAllowed(sourceType: CampaignResourceType, targetType: CampaignResourceType) {
  return campaignConnectionRules.some(rule => rule.sourceType === sourceType && rule.targetType === targetType)
}

export function validateCampaignConnection(infrastructure: CampaignInfrastructureState, sourceId: string, targetId: string): ConnectionValidationResult {
  return validateConnection(infrastructure, sourceId, targetId, campaignConnectionRules)
}

const validExplanation: ConnectionExplanation = {
  key: 'connection.valid',
}

const invalidPairExplanations: Partial<
  Record<`${CampaignResourceType}->${CampaignResourceType}`, ConnectionExplanation>
> = {
  'users->database': {
    key: 'connection.usersDatabase',
    suggestionKey: 'connection.tryUsersAppDatabase',
  },
  'database->users': {
    key: 'connection.databaseUsers',
    suggestionKey: 'connection.tryUsersAppDatabase',
  },
  'database->app-server': {
    key: 'connection.databaseAppServer',
    suggestionKey: 'connection.tryAppDatabase',
  },
  'app-server->users': {
    key: 'connection.appServerUsers',
    suggestionKey: 'connection.tryUsersApp',
  },
  'app-server->load-balancer': {
    key: 'connection.appServerLoadBalancer',
    suggestionKey: 'connection.tryUsersLoadBalancerApp',
  },
  'app-server->worker': {
    key: 'connection.appServerWorker',
    suggestionKey: 'connection.tryAppQueueWorker',
  },
}

const invalidSourceExplanations: Record<
  CampaignResourceType,
  ConnectionExplanation
> = {
  users: {
    key: 'connection.fromUsers',
    suggestionKey: 'connection.tryUsersApp',
  },
  'app-server': {
    key: 'connection.fromAppServer',
    suggestionKey: 'connection.tryAppDataService',
  },
  database: {
    key: 'connection.fromDatabase',
    suggestionKey: 'connection.tryAppDatabase',
  },
  'load-balancer': {
    key: 'connection.fromLoadBalancer',
    suggestionKey: 'connection.tryLoadBalancerApp',
  },
  cache: {
    key: 'connection.fromCache',
    suggestionKey: 'connection.tryAppCacheDatabase',
  },
  queue: {
    key: 'connection.fromQueue',
    suggestionKey: 'connection.tryAppQueueWorker',
  },
  worker: {
    key: 'connection.fromWorker',
    suggestionKey: 'connection.tryAppQueueWorker',
  },
  'object-storage': {
    key: 'connection.fromObjectStorage',
    suggestionKey: 'connection.tryAppObjectStorage',
  },
}

export function validateStageOneConnection(
  infrastructure: CampaignInfrastructureState,
  sourceId: string,
  targetId: string,
): ConnectionValidationResult {
  return validateConnection(infrastructure, sourceId, targetId, stageOneConnectionRules, 'connection.invalidStageOne')
}

function validateConnection(
  infrastructure: CampaignInfrastructureState,
  sourceId: string,
  targetId: string,
  rules: readonly ConnectionRule[],
  fallbackKey?: TranslationKey,
): ConnectionValidationResult {
  const source = infrastructure.resources.find(
    (resource) => resource.id === sourceId,
  )
  const target = infrastructure.resources.find(
    (resource) => resource.id === targetId,
  )

  if (!source || !target) {
    return {
      valid: false,
      explanation: {
        key: 'connection.resourcesMissing',
      },
    }
  }

  if (source.id === target.id) {
    return {
      valid: false,
      explanation: {
        key: 'connection.self',
        attempted: { sourceType: source.type, targetType: target.type },
      },
    }
  }

  const duplicate = infrastructure.connections.some(
    (connection) =>
      connection.sourceId === sourceId && connection.targetId === targetId,
  )
  if (duplicate) {
    return {
      valid: false,
      explanation: {
        key: 'connection.duplicate',
        attempted: { sourceType: source.type, targetType: target.type },
      },
    }
  }

  const valid = rules.some(
    (rule) =>
      rule.sourceType === source.type && rule.targetType === target.type,
  )
  if (valid) {
    return { valid: true, explanation: validExplanation }
  }

  return {
    valid: false,
    explanation: {
      ...(invalidPairExplanations[`${source.type}->${target.type}`] ??
        (fallbackKey
          ? { key: fallbackKey }
          : invalidSourceExplanations[source.type])),
      attempted: { sourceType: source.type, targetType: target.type },
    },
  }
}
