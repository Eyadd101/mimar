import { useLanguage } from '../i18n/useLanguage'
import type { StageConfig } from '../data/stages'
import type { TrafficSimulationState } from '../simulation/trafficSimulation'
import { securityConfig, queueConfig } from '../simulation/expansionConfig'

export function ExpansionAlerts({ stage, simulation }: { stage: StageConfig; simulation: TrafficSimulationState }) {
  const { t } = useLanguage()
  let message: string | null = null
  if (simulation.databaseData.dataLost) message = t('advanced.dataLost')
  else if (simulation.security.risks.length) message = t(simulation.security.incidentActive ? 'advanced.securityIncident' : 'advanced.securityWarning', { seconds: Math.max(0, securityConfig.gracePeriodSeconds - simulation.security.exposureSeconds) })
  else if (simulation.storage.localPressure > 1) message = t('advanced.localStorageWarning', { size: simulation.storage.localUsageGiB.toFixed(2) })
  else if (simulation.queue.oldestMessageAge > queueConfig.healthyBacklogSeconds) message = t('advanced.queueHint')
  else if (simulation.database.status === 'overloaded') message = t('advanced.databaseHint')
  else if (stage.id === 'database-bottleneck' && (simulation.database.status === 'high' || simulation.database.status === 'elevated')) message = t('advanced.databaseCompareHint')
  else if (stage.trafficProfile.dataLossAtSecond !== undefined) message = t(simulation.dataLossOccurred ? 'advanced.dataRecovered' : 'advanced.recoveryWarning', { seconds: Math.max(0, stage.trafficProfile.dataLossAtSecond - simulation.gameTimeSeconds) })
  return message ? <aside className="expansion-alert" role="status"><p>{message}</p></aside> : null
}
