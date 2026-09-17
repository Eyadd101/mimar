import type { TrafficEventDefinition } from '../data/stages'
import type { StageTrafficEventRuntime } from '../simulation/trafficEventSimulation'

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
  if (events.length === 0) {
    return null
  }

  return (
    <aside className="event-timeline nodrag nopan" aria-label="Event timeline">
      <div className="event-timeline__heading">
        <span>Inbox / Timeline</span>
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
              <span>{event.sender}</span>
              <strong>
                {eventRuntime?.status === 'upcoming'
                  ? `Begins in ${formatCountdown(startsIn)}`
                  : eventRuntime?.status === 'active'
                    ? 'Live now'
                    : 'Completed'}
              </strong>
            </div>
            <h3>{event.title}</h3>
            <p>{event.message}</p>
            <div className="traffic-forecast">
              <span>Traffic forecast</span>
              <strong>
                {event.forecastMinimumMultiplier}x–
                {event.forecastMaximumMultiplier}x
              </strong>
              <small>Estimate — actual traffic may differ</small>
            </div>
            {eventRuntime && eventRuntime.status !== 'upcoming' && (
              <p className="event-timeline__actual">
                Actual traffic: {eventRuntime.actualMultiplier.toFixed(1)}x
              </p>
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
