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

  const valid = stageOneConnectionRules.some(
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
        key: 'connection.invalidStageOne',
      },
  }
}
