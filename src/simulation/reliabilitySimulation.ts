import type { TranslationKey } from '../i18n/translations'

export type InfrastructureFailure = {
  id: string
  resourceId: string
  labelKey: TranslationKey
  startsAtSecond: number
  durationSeconds: number
}

/** Announced, deterministic outages. Resources recover without identity changes. */
export function getFailureStatus(event: InfrastructureFailure, gameTimeSeconds: number) {
  return gameTimeSeconds < event.startsAtSecond ? 'upcoming' : gameTimeSeconds < event.startsAtSecond + event.durationSeconds ? 'active' : 'recovered'
}
export function getFailedResourceIds(events: readonly InfrastructureFailure[], gameTimeSeconds: number) {
  return events.filter(event => getFailureStatus(event, gameTimeSeconds) === 'active').map(event => event.resourceId)
}
