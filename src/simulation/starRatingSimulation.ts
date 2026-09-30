import type { StageConfig } from '../data/stages'
import type { StageObjectiveProgress } from './stageObjectiveSimulation'
import { isStageComplete } from './stageObjectiveSimulation'
import type { TrafficSimulationState } from './trafficSimulation'
import {
  calculateAverageLatency,
  type StageStatistics,
} from './stageStatisticsSimulation'

export type StarRatingExplanation = {
  star: 1 | 2 | 3
  earned: boolean
}

export type StageRating = {
  stars: 0 | 1 | 2 | 3
  explanations: StarRatingExplanation[]
}

export function calculateStageRating(
  stage: StageConfig,
  simulation: TrafficSimulationState,
  objectiveProgress: StageObjectiveProgress,
  statistics: StageStatistics,
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
    simulation.balance >= stage.starCriteria.threeStars.minimumBalance &&
    (stage.starCriteria.threeStars.maximumAverageLatencyMs === undefined ||
      calculateAverageLatency(statistics) <=
        stage.starCriteria.threeStars.maximumAverageLatencyMs)

  return {
    stars: earnedThirdStar ? 3 : earnedSecondStar ? 2 : earnedFirstStar ? 1 : 0,
    explanations: [
      {
        star: 1,
        earned: earnedFirstStar,
      },
      {
        star: 2,
        earned: earnedSecondStar,
      },
      {
        star: 3,
        earned: earnedThirdStar,
      },
    ],
  }
}
