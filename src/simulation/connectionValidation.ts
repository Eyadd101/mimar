import type {
  CampaignInfrastructureState,
  CampaignResourceType,
} from './campaignSimulation'
import type { TranslationKey } from '../i18n/translations'

export type ConnectionExplanation = {
  key: TranslationKey
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
  return validateConnection(infrastructure, sourceId, targetId, campaignConnectionRules, 'advanced.connectionDirection')
}

const validExplanation: ConnectionExplanation = {
  key: 'connection.valid',
}

const invalidPairExplanations: Partial<
  Record<`${CampaignResourceType}->${CampaignResourceType}`, ConnectionExplanation>
> = {
  'users->database': {
    key: 'connection.usersDatabase',
  },
  'database->users': {
    key: 'connection.databaseUsers',
  },
  'database->app-server': {
    key: 'connection.databaseAppServer',
  },
  'app-server->users': {
    key: 'connection.appServerUsers',
  },
}

export function validateStageOneConnection(
  infrastructure: CampaignInfrastructureState,
  sourceId: string,
  targetId: string,
): ConnectionValidationResult {
  return validateConnection(infrastructure, sourceId, targetId, stageOneConnectionRules, 'connection.invalidStageOne')
}

function validateConnection(infrastructure: CampaignInfrastructureState, sourceId: string, targetId: string, rules: readonly ConnectionRule[], fallbackKey: TranslationKey): ConnectionValidationResult {
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
    explanation:
      invalidPairExplanations[`${source.type}->${target.type}`] ?? {
        key: fallbackKey,
      },
  }
}
