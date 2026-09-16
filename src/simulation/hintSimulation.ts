import { customerSatisfactionConfig } from './config'
import type { TrafficSimulationState } from './trafficSimulation'

export function getContextualHint(simulation: TrafficSimulationState) {
  const { appServer, badLatencyDurationSeconds, requestsPerSecond } = simulation

  if (
    badLatencyDurationSeconds >=
    customerSatisfactionConfig.sustainedBadLatencySeconds
  ) {
    return `Response time has remained above ${customerSatisfactionConfig.badLatencyThresholdMs} ms for ${badLatencyDurationSeconds} game seconds.`
  }

  if (appServer.isOverloaded) {
    return `Requests (${requestsPerSecond.toFixed(1)}/s) are exceeding the App Server's current capacity (${appServer.requestCapacity}/s).`
  }

  if (appServer.status === 'high') {
    return `CPU usage is very high at ${appServer.cpuUsage.toFixed(1)}% while traffic is still increasing.`
  }

  if (appServer.status === 'elevated') {
    return `CPU usage is elevated at ${appServer.cpuUsage.toFixed(1)}% while traffic is still increasing.`
  }

  return 'Traffic, CPU usage, and response time are currently stable.'
}
