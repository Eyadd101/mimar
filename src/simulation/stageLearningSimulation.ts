import type {
  StageConfig,
  StageLearningStepDefinition,
} from '../data/stages'
import type {
  CampaignInfrastructureState,
  CampaignResourceType,
} from './campaignSimulation'
import type { GameStatus } from './gameStateSimulation'

export type StageLearningStepProgress = {
  id: string
  completed: boolean
}

export type StageLearningContext = {
  infrastructure: CampaignInfrastructureState
  serviceStarted: boolean
  gameTimeSeconds: number
  status: GameStatus
}

export function evaluateStageLearningSteps(
  stage: StageConfig,
  context: StageLearningContext,
): StageLearningStepProgress[] {
  return stage.learningSteps.map((step) => ({
    id: step.id,
    completed: isLearningStepComplete(step, context),
  }))
}

function isLearningStepComplete(
  step: StageLearningStepDefinition,
  context: StageLearningContext,
) {
  switch (step.type) {
    case 'place-resource':
      return step.resourceId
        ? context.infrastructure.resources.some(
            (resource) =>
              resource.id === step.resourceId &&
              resource.type === step.resourceType,
          )
        : hasResourceType(context.infrastructure, step.resourceType)
    case 'connect-resources': {
      const sourceIds = getResourceIds(
        context.infrastructure,
        step.sourceType,
      )
      const targetIds = getResourceIds(
        context.infrastructure,
        step.targetType,
      )
      const eligibleSourceIds = step.sourceId ? [step.sourceId] : sourceIds
      const eligibleTargetIds = step.targetId ? [step.targetId] : targetIds
      return context.infrastructure.connections.some(
        (connection) =>
          eligibleSourceIds.includes(connection.sourceId) &&
          eligibleTargetIds.includes(connection.targetId),
      )
    }
    case 'remove-connection':
      return !context.infrastructure.connections.some(
        (connection) =>
          connection.sourceId === step.sourceId &&
          connection.targetId === step.targetId,
      )
    case 'start-service':
      return context.serviceStarted
    case 'observe-growth':
      return context.gameTimeSeconds >= step.durationSeconds
    case 'reach-server-tier':
      return context.infrastructure.resources.some(
        (resource) =>
          resource.type === 'app-server' && resource.tierId === step.tierId,
      )
    case 'complete-stage':
      return context.status === 'stage-won'
  }
}

function hasResourceType(
  infrastructure: CampaignInfrastructureState,
  resourceType: CampaignResourceType,
) {
  return infrastructure.resources.some(
    (resource) => resource.type === resourceType,
  )
}

function getResourceIds(
  infrastructure: CampaignInfrastructureState,
  resourceType: CampaignResourceType,
) {
  return infrastructure.resources
    .filter((resource) => resource.type === resourceType)
    .map((resource) => resource.id)
}
