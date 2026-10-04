import type { TranslationMessage } from '../i18n/translations'
import type { CampaignResourceType } from '../simulation/campaignSimulation'
import type { TrafficSimulationState } from '../simulation/trafficSimulation'
import { formatCredits } from './creditPresentation'

/** Explanations read the same metrics as the simulation; they never calculate load. */
export function getAdvancedResourceCause(type: CampaignResourceType, state: TrafficSimulationState): TranslationMessage | null {
  switch (type) {
    case 'database': return { key: 'advanced.databaseCause', variables: { queries: state.database.queryLoad.toFixed(1), capacity: state.database.capacity, connections: state.database.activeConnections, latency: state.database.queryLatencyMs } }
    case 'cache': return { key: 'advanced.cacheCause', variables: { hits: state.cache.hitRate.toFixed(1), saved: state.cache.requestsServed.toFixed(1), remaining: state.cache.databaseQueries.toFixed(1) } }
    case 'queue': return { key: 'advanced.queueCause', variables: { incoming: state.queue.enqueueRate.toFixed(1), processed: state.queue.processingRate.toFixed(1), depth: state.queue.depth.toFixed(1) } }
    case 'worker': return { key: 'advanced.workerCause', variables: { processed: state.queue.processingRate.toFixed(1), age: state.queue.oldestMessageAge.toFixed(1) } }
    case 'object-storage': return { key: 'advanced.storageCause', variables: { size: state.storage.storageUsedGiB.toFixed(2), rate: state.storage.requestRate.toFixed(1), cost: formatCredits(state.storage.costPerPeriod) } }
    default: return null
  }
}
