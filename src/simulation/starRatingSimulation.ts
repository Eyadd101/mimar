import type { StageConfig } from '../data/stages'
import type { StageObjectiveProgress } from './stageObjectiveSimulation'
import { isStageComplete } from './stageObjectiveSimulation'
import type { TrafficSimulationState } from './trafficSimulation'

export type StarRatingExplanation = {
  star: 1 | 2 | 3
  earned: boolean
  title: string
  explanation: string
}

export type StageRating = {
  stars: 0 | 1 | 2 | 3
  explanations: StarRatingExplanation[]
}

export function calculateStageRating(
  stage: StageConfig,
  simulation: TrafficSimulationState,
  objectiveProgress: StageObjectiveProgress,
): StageRating {
  const earnedFirstStar = isStageComplete(stage, objectiveProgress)
  const earnedSecondStar =
    earnedFirstStar &&
    simulation.customerSatisfaction >=
      stage.starCriteria.twoStars.minimumSatisfaction
  const earnedThirdStar =
    earnedSecondStar &&
    simulation.customerSatisfaction >=
      stage.starCriteria.threeStars.minimumSatisfaction &&
    simulation.balance >= stage.starCriteria.threeStars.minimumBalance

  return {
    stars: earnedThirdStar ? 3 : earnedSecondStar ? 2 : earnedFirstStar ? 1 : 0,
    explanations: [
      {
        star: 1,
        earned: earnedFirstStar,
        title: 'Primary objective',
        explanation: earnedFirstStar
          ? 'The required stage objective was completed.'
          : 'Complete the required stage objective.',
      },
      {
        star: 2,
        earned: earnedSecondStar,
        title: 'Reliable service',
        explanation: earnedSecondStar
          ? `Satisfaction finished at ${simulation.customerSatisfaction.toFixed(1)}%.`
          : `Finish with at least ${stage.starCriteria.twoStars.minimumSatisfaction}% satisfaction.`,
      },
      {
        star: 3,
        earned: earnedThirdStar,
        title: 'Efficient operation',
        explanation: earnedThirdStar
          ? `Strong satisfaction and ${simulation.balance.toFixed(1)} credits remained.`
          : `Finish with ${stage.starCriteria.threeStars.minimumSatisfaction}% satisfaction and ${stage.starCriteria.threeStars.minimumBalance} credits.`,
      },
    ],
  }
}
