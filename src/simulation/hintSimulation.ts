import { customerSatisfactionConfig } from './config'
import type { StageConfig } from '../data/stages'
import type { TrafficSimulationState } from './trafficSimulation'
import { getMostLoadedAppServer } from './trafficSimulation'
import type { TranslationMessage } from '../i18n/translations'

export function getContextualHint(
  simulation: TrafficSimulationState,
  stage?: StageConfig,
): TranslationMessage {
  const { badLatencyDurationSeconds, requestsPerSecond } = simulation
  const appServer = getMostLoadedAppServer(simulation)

  if (!appServer) {
    return { key: 'hint.buildPath' }
  }

  if (simulation.storage.localPressure > .5) return { key: 'advanced.storageHint' }
  if (simulation.queue.depth > 0) return { key: 'advanced.queueHint' }
  if (stage?.trafficProfile.backgroundJobsPerRequest && !simulation.queue.connected) return { key: 'advanced.backgroundHint' }

  if (simulation.database.utilization > 1 && !appServer.isOverloaded) {
    return { key: 'advanced.databaseHint' }
  }

  if (
    badLatencyDurationSeconds >=
    customerSatisfactionConfig.sustainedBadLatencySeconds
  ) {
    return {
      key: 'hint.badLatency',
      variables: {
        threshold: customerSatisfactionConfig.badLatencyThresholdMs,
        duration: badLatencyDurationSeconds,
      },
    }
  }

  if (appServer.isOverloaded) {
    if (stage?.id === 'vertical-scaling-limit') {
      return {
        key: 'hint.verticalOverload',
        variables: { requests: requestsPerSecond.toFixed(1) },
      }
    }

    return {
      key: 'hint.overload',
      variables: {
        requests: requestsPerSecond.toFixed(1),
        capacity: appServer.requestCapacity,
      },
    }
  }

  if (appServer.status === 'high') {
    if (stage?.id === 'vertical-scaling-limit') {
      return {
        key: 'hint.verticalHighCpu',
        variables: { cpu: appServer.cpuUsage.toFixed(1) },
      }
    }

    return {
      key: 'hint.highCpu',
      variables: { cpu: appServer.cpuUsage.toFixed(1) },
    }
  }

  if (appServer.status === 'elevated') {
    return {
      key: 'hint.elevatedCpu',
      variables: { cpu: appServer.cpuUsage.toFixed(1) },
    }
  }

  return { key: 'hint.stable' }
}
