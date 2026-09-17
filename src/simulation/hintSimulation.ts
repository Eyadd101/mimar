import { customerSatisfactionConfig } from './config'
import type { StageConfig } from '../data/stages'
import type { TrafficSimulationState } from './trafficSimulation'
import { getMostLoadedAppServer } from './trafficSimulation'

export function getContextualHint(
  simulation: TrafficSimulationState,
  stage?: StageConfig,
) {
  const { badLatencyDurationSeconds, requestsPerSecond } = simulation
  const appServer = getMostLoadedAppServer(simulation)

  if (
    badLatencyDurationSeconds >=
    customerSatisfactionConfig.sustainedBadLatencySeconds
  ) {
    return `Response time has remained above ${customerSatisfactionConfig.badLatencyThresholdMs} ms for ${badLatencyDurationSeconds} game seconds.`
  }

  if (appServer.isOverloaded) {
    if (stage?.id === 'vertical-scaling-limit') {
      return `One application server is handling all ${requestsPerSecond.toFixed(1)} requests per second and has exceeded its capacity.`
    }

    return `Requests (${requestsPerSecond.toFixed(1)}/s) are exceeding the App Server's current capacity (${appServer.requestCapacity}/s).`
  }

  if (appServer.status === 'high') {
    if (stage?.id === 'vertical-scaling-limit') {
      return `One application server is now handling all incoming requests at ${appServer.cpuUsage.toFixed(1)}% CPU.`
    }

    return `CPU usage is very high at ${appServer.cpuUsage.toFixed(1)}% while traffic is still increasing.`
  }

  if (appServer.status === 'elevated') {
    return `CPU usage is elevated at ${appServer.cpuUsage.toFixed(1)}% while traffic is still increasing.`
  }

  return 'Traffic, CPU usage, and response time are currently stable.'
}
