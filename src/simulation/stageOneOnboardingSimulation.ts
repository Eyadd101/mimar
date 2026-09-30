import type {
  CampaignInfrastructureState,
  CampaignResourceType,
} from './campaignSimulation'
import type { TranslationKey } from '../i18n/translations'

export type StageOneBuildStepId =
  | 'place-users'
  | 'place-app-server'
  | 'connect-users-app-server'
  | 'place-database'
  | 'connect-app-server-database'
  | 'complete'

export type StageOneBuildStep = {
  id: StageOneBuildStepId
  stepNumber: number
  totalSteps: number
  titleKey: TranslationKey
  explanationKey: TranslationKey
  resourceToPlace?: Extract<
    CampaignResourceType,
    'users' | 'app-server' | 'database'
  >
}

const totalSteps = 5

export function getStageOneBuildStep(
  infrastructure: CampaignInfrastructureState,
): StageOneBuildStep {
  const users = infrastructure.resources.find(
    (resource) => resource.type === 'users',
  )
  if (!users) {
    return {
      id: 'place-users',
      stepNumber: 1,
      totalSteps,
      titleKey: 'guided.placeUsers.title',
      explanationKey: 'guided.placeUsers.explanation',
      resourceToPlace: 'users',
    }
  }

  const appServer = infrastructure.resources.find(
    (resource) => resource.type === 'app-server',
  )
  if (!appServer) {
    return {
      id: 'place-app-server',
      stepNumber: 2,
      totalSteps,
      titleKey: 'guided.placeAppServer.title',
      explanationKey: 'guided.placeAppServer.explanation',
      resourceToPlace: 'app-server',
    }
  }

  const usersToAppServer = infrastructure.connections.some(
    (connection) =>
      connection.sourceId === users.id &&
      connection.targetId === appServer.id,
  )
  if (!usersToAppServer) {
    return {
      id: 'connect-users-app-server',
      stepNumber: 3,
      totalSteps,
      titleKey: 'guided.connectUsersServer.title',
      explanationKey: 'guided.connectUsersServer.explanation',
    }
  }

  const database = infrastructure.resources.find(
    (resource) => resource.type === 'database',
  )
  if (!database) {
    return {
      id: 'place-database',
      stepNumber: 4,
      totalSteps,
      titleKey: 'guided.placeDatabase.title',
      explanationKey: 'guided.placeDatabase.explanation',
      resourceToPlace: 'database',
    }
  }

  const appServerToDatabase = infrastructure.connections.some(
    (connection) =>
      connection.sourceId === appServer.id &&
      connection.targetId === database.id,
  )
  if (!appServerToDatabase) {
    return {
      id: 'connect-app-server-database',
      stepNumber: 5,
      totalSteps,
      titleKey: 'guided.connectServerDatabase.title',
      explanationKey: 'guided.connectServerDatabase.explanation',
    }
  }

  return {
    id: 'complete',
    stepNumber: totalSteps,
    totalSteps,
    titleKey: 'guided.complete.title',
    explanationKey: 'guided.complete.explanation',
  }
}

export function isStageOneBuildComplete(
  infrastructure: CampaignInfrastructureState,
) {
  return getStageOneBuildStep(infrastructure).id === 'complete'
}

export function getStageOnePortHint(
  stepId: StageOneBuildStepId,
  resourceId: string,
): 'source' | 'target' | undefined {
  const connection = stepId === 'connect-users-app-server'
    ? { sourceId: 'users', targetId: 'server' }
    : stepId === 'connect-app-server-database'
      ? { sourceId: 'server', targetId: 'database' }
      : null

  if (resourceId === connection?.sourceId) return 'source'
  if (resourceId === connection?.targetId) return 'target'
  return undefined
}
