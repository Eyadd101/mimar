import { campaignStageConfigs } from '../data/stages'
import { translations } from '../i18n/translations'
import type { CampaignState } from './campaignSimulation'
import { simulationSpeedOptions, type SimulationSpeed } from './config'
import { createInitialGameState, type StageRuntimeState } from './gameStateSimulation'
import { securityRiskKeys } from './securitySimulation'
import { saveValidationConfig } from './saveValidationConfig'
import { advanceStageTrafficEvents, createStageTrafficEvents } from './trafficEventSimulation'

export type CampaignCheckpoint = {
  stageRuntime: StageRuntimeState
  stageStartSnapshot: CampaignState
  gameSpeed: SimulationSpeed
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const nonnegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= saveValidationConfig.maximumSavedNumber
const oneOf = (value: unknown, values: readonly unknown[]) => values.includes(value)

function isMessage(value: unknown) {
  return isRecord(value) && typeof value.key === 'string' && Object.hasOwn(translations.en, value.key) &&
    (value.variables === undefined || (isRecord(value.variables) &&
      Object.entries(value.variables).length <= saveValidationConfig.maximumMessageVariables &&
      Object.entries(value.variables).every(([name, item]) =>
        name.length <= saveValidationConfig.maximumVariableNameLength &&
        (typeof item === 'string'
          ? item.length <= saveValidationConfig.maximumResourceNameLength
          : typeof item === 'number' && Number.isFinite(item) && Math.abs(item) <= saveValidationConfig.maximumSavedNumber))))
}

function isDeployment(value: unknown) {
  return isRecord(value) && nonnegative(value.cost) && nonnegative(value.startedAtGameTimeSeconds) &&
    nonnegative(value.completesAtGameTimeSeconds) && value.completesAtGameTimeSeconds > value.startedAtGameTimeSeconds
}

/** Validate the required runtime shape against the current simulation's defaults.
 * Nullable fields and dynamic arrays have explicit validators; unknown save data
 * never becomes runtime state merely because JSON parsing succeeded.
 */
function matchesRuntimeShape(value: unknown, template: unknown, key = ''): boolean {
  if (key === 'failedResourceIds') return Array.isArray(value) && value.length <= saveValidationConfig.maximumFailureIds && value.every(id => typeof id === 'string' && id.length <= saveValidationConfig.maximumResourceNameLength)
  if (key === 'risks') return Array.isArray(value) && value.length <= securityRiskKeys.length && new Set(value).size === value.length && value.every(risk => oneOf(risk, securityRiskKeys))
  if (key === 'satisfactionReason' || key === 'businessConsequenceReason') return value === null || isMessage(value)
  if (key === 'backupRevision' || key === 'databaseRestoreCompletesAt') return value === null || nonnegative(value)
  if (key === 'gameOverReason') return value === null || (isRecord(value) && oneOf(value.code, ['bankruptcy', 'service-failure']))
  if (key === 'infrastructureDeployment') return value === null || (isDeployment(value) && isRecord(value) && oneOf(value.kind, ['load-balancer', 'app-server', 'database-upgrade', 'database-downsize', 'cache', 'queue', 'worker', 'object-storage']))
  if (key === 'serverDeployment') return value === null || (isDeployment(value) && isRecord(value) && typeof value.resourceId === 'string' && value.targetTierId === 'medium')
  if (key === 'stageRating') return value === null || (isRecord(value) && oneOf(value.stars, [1, 2, 3]) && Array.isArray(value.explanations) && value.explanations.length === 3 && value.explanations.every((item, index) => isRecord(item) && item.star === index + 1 && typeof item.earned === 'boolean'))
  if (template === null) return value === null
  if (typeof template === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > saveValidationConfig.maximumSavedNumber || (key !== 'netCashFlowPerPeriod' && value < 0)) return false
    return !['cpuUsage', 'memoryUsage', 'customerSatisfaction', 'hitRate', 'lowestSatisfaction'].includes(key) || value <= 100
  }
  if (typeof template === 'string') {
    if (key === 'status') return oneOf(value, ['playing', 'stage-won', 'game-over', 'normal', 'elevated', 'high', 'overloaded'])
    // Names, tier ids and resource identities must agree with campaign metadata.
    return value === template
  }
  if (typeof template === 'boolean') return typeof value === 'boolean'
  if (Array.isArray(template)) return Array.isArray(value) && value.length === template.length && value.every((item, index) => matchesRuntimeShape(item, template[index]))
  return isRecord(template) && isRecord(value) && Object.entries(template).every(([field, example]) => matchesRuntimeShape(value[field], example, field))
}

export function isValidCheckpoint(
  value: unknown,
  campaign: CampaignState,
  isValidCampaign: (candidate: unknown) => candidate is CampaignState,
): value is CampaignCheckpoint {
  if (!isRecord(value) || !oneOf(value.gameSpeed, simulationSpeedOptions) || !isValidCampaign(value.stageStartSnapshot) || value.stageStartSnapshot.currentStageIndex !== campaign.currentStageIndex || value.stageStartSnapshot.seed !== campaign.seed || !isRecord(value.stageRuntime)) return false
  const runtime = value.stageRuntime
  const template = createInitialGameState(campaign).stageRuntime
  // Event outcomes are regenerated from the seed; only time determines their status.
  if (!isRecord(runtime.simulation) || !nonnegative(runtime.simulation.gameTimeSeconds)) return false
  const stage = campaignStageConfigs[campaign.currentStageIndex]
  const events = advanceStageTrafficEvents(stage, createStageTrafficEvents(stage, campaign.seed), runtime.simulation.gameTimeSeconds)
  if (JSON.stringify(runtime.trafficEvents) !== JSON.stringify(events)) return false
  if (!matchesRuntimeShape({ ...runtime, trafficEvents: {} }, { ...template, trafficEvents: {} })) return false
  if (!oneOf(runtime.status, ['playing', 'stage-won', 'game-over'])) return false
  if ((runtime.status === 'game-over') !== (runtime.gameOverReason !== null) || (runtime.status === 'stage-won') !== (runtime.stageRating !== null)) return false
  if (runtime.simulation.balance !== campaign.balance) return false
  const deployment = runtime.simulation.serverDeployment
  if (isRecord(deployment) && !campaign.infrastructure.resources.some(resource => resource.type === 'app-server' && resource.id === deployment.resourceId && resource.tierId === 'small')) return false
  const data = runtime.simulation.databaseData
  if (!isRecord(data) || (data.backupRevision !== null && (!nonnegative(data.backupRevision) || data.backupRevision < 1 || data.backupRevision > Number(data.revision)))) return false
  return true
}
