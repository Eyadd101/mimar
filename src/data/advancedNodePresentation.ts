import type { InfrastructureNodeData } from './infrastructure'
import type { TrafficSimulationState } from '../simulation/trafficSimulation'
import { queueConfig } from '../simulation/expansionConfig'
import type { TranslationKey } from '../i18n/translations'

export type NodeMetricSummary = { labelKey: TranslationKey; value: string; warning: boolean }
export function getAdvancedNodeSummary(kind: InfrastructureNodeData['kind'], simulation: TrafficSimulationState): NodeMetricSummary | undefined {
  switch (kind) {
    case 'cache': return { labelKey: 'advanced.hitRate', value: `${simulation.cache.hitRate.toFixed(0)}%`, warning: simulation.cache.status === 'high' }
    case 'queue': return { labelKey: 'advanced.queueDepth', value: simulation.queue.depth.toFixed(0), warning: simulation.queue.oldestMessageAge > queueConfig.healthyBacklogSeconds }
    case 'worker': return { labelKey: 'advanced.processingRate', value: `${simulation.queue.processingRate.toFixed(1)}/s`, warning: !simulation.queue.workerConnected }
    case 'object-storage': return { labelKey: 'advanced.storageUsed', value: `${simulation.storage.storageUsedGiB.toFixed(2)} GiB`, warning: !simulation.storage.connected }
    default: return undefined
  }
}
