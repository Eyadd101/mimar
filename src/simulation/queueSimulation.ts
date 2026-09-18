import { queueConfig } from './expansionConfig'

export type QueueMetrics = { depth: number; enqueueRate: number; processingRate: number; oldestMessageAge: number; connected: boolean; workerConnected: boolean }
export const emptyQueue: QueueMetrics = { depth: 0, enqueueRate: 0, processingRate: 0, oldestMessageAge: 0, connected: false, workerConnected: false }

/** Fluid queue: depth' = max(0, depth + arrivals - processed).
 * Oldest age is an estimate from backlog / arrival rate, not one object per job.
 */
export function advanceQueue(current: QueueMetrics, arrivals: number, connected: boolean, workerConnected: boolean, seconds = 1): QueueMetrics {
  if (seconds <= 0) return current
  const enqueueRate = connected ? Math.max(0, arrivals) : 0
  const available = current.depth + enqueueRate * seconds
  const processed = workerConnected ? Math.min(available, queueConfig.workerCapacity * seconds) : 0
  const depth = Math.max(0, available - processed)
  const oldestMessageAge = depth === 0 ? 0 : enqueueRate > 0 ? depth / enqueueRate : current.oldestMessageAge + seconds
  return { depth, enqueueRate, processingRate: processed / seconds, oldestMessageAge, connected, workerConnected }
}
