import { useLanguage } from '../i18n/useLanguage'
import { getFailureStatus, type InfrastructureFailure } from '../simulation/reliabilitySimulation'
import { TechnicalTerm } from './TechnicalTerm'

export function ReliabilityTimeline({ events, gameTimeSeconds }: { events: readonly InfrastructureFailure[]; gameTimeSeconds: number }) {
  const { t, direction } = useLanguage()
  return <aside className="event-timeline nodrag nopan" dir={direction} aria-label={t('event.timeline')}>
    <div className="event-timeline__heading">{t('advanced.reliabilityNotice')}</div>
    {events.map(event => {
      const status = getFailureStatus(event, gameTimeSeconds)
      const remaining = status === 'upcoming' ? event.startsAtSecond - gameTimeSeconds : event.startsAtSecond + event.durationSeconds - gameTimeSeconds
      return <article className="event-timeline__event" data-status={status} key={event.id}><strong><TechnicalTerm translationKey={event.labelKey} /></strong><p>{t(status === 'upcoming' ? 'advanced.failureUpcoming' : status === 'active' ? 'advanced.failureActive' : 'advanced.failureRecovered', { seconds: Math.max(0, remaining), duration: event.durationSeconds })}</p></article>
    })}
  </aside>
}
