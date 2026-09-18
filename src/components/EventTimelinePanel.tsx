import type { TrafficEventDefinition } from '../data/stages'
import type { StageTrafficEventRuntime } from '../simulation/trafficEventSimulation'
import { useLanguage } from '../i18n/useLanguage'

type EventTimelinePanelProps = {
  events: TrafficEventDefinition[]
  runtime: StageTrafficEventRuntime
  gameTimeSeconds: number
}

export function EventTimelinePanel({
  events,
  runtime,
  gameTimeSeconds,
}: EventTimelinePanelProps) {
  const { direction, t } = useLanguage()

  if (events.length === 0) {
    return null
  }

  return (
    <aside className="event-timeline nodrag nopan" aria-label={t('event.timeline')} dir={direction}>
      <div className="event-timeline__heading">
        <span>{t('event.timeline')}</span>
        <strong>{events.length}</strong>
      </div>
      {events.map((event) => {
        const eventRuntime = runtime[event.id]
        const startsIn = Math.max(
          event.startsAtSecond - gameTimeSeconds,
          0,
        )

        return (
          <article
            key={event.id}
            className="event-timeline__event"
            data-status={eventRuntime?.status ?? 'upcoming'}
          >
            <div className="event-timeline__meta">
              <span>{t(event.senderKey)}</span>
              <strong>
                {eventRuntime?.status === 'upcoming'
                  ? t('event.beginsIn', { time: formatCountdown(startsIn) })
                  : eventRuntime?.status === 'active'
                    ? t('event.liveNow')
                    : t('event.completed')}
              </strong>
            </div>
            <h3>{t(event.titleKey)}</h3>
            <p>{t(event.messageKey)}</p>
            <div className="traffic-forecast">
              <span>{t('event.trafficForecast')}</span>
              <strong>
                {event.forecastMinimumMultiplier}x–
                {event.forecastMaximumMultiplier}x
              </strong>
              <small>{t('event.estimateNotice')}</small>
            </div>
            {eventRuntime && eventRuntime.status !== 'upcoming' && (
              <>
                <p className="event-timeline__actual">
                  {t('event.actualTraffic', {
                    multiplier: eventRuntime.actualMultiplier.toFixed(1),
                  })}
                </p>
                {eventRuntime.storyExplanationKey && (
                  <p className="event-timeline__story">
                    {t(eventRuntime.storyExplanationKey)}
                  </p>
                )}
              </>
            )}
          </article>
        )
      })}
    </aside>
  )
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
