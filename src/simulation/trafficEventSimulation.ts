import type {
  StageConfig,
  TrafficEventDefinition,
} from '../data/stages'

export type TrafficEventStatus = 'upcoming' | 'active' | 'completed'

export type TrafficEventRuntime = {
  eventId: string
  status: TrafficEventStatus
  actualMultiplier: number
}

export type StageTrafficEventRuntime = Record<string, TrafficEventRuntime>

const roundToOneDecimal = (value: number) => Math.round(value * 10) / 10

export function createStageTrafficEvents(
  stage: StageConfig,
  campaignSeed: number,
): StageTrafficEventRuntime {
  return Object.fromEntries(
    stage.trafficEvents.map((event) => [
      event.id,
      {
        eventId: event.id,
        status: 'upcoming' as const,
        actualMultiplier: selectForecastMultiplier(event, campaignSeed),
      },
    ]),
  )
}

export function advanceStageTrafficEvents(
  stage: StageConfig,
  currentEvents: StageTrafficEventRuntime,
  gameTimeSeconds: number,
): StageTrafficEventRuntime {
  return Object.fromEntries(
    stage.trafficEvents.map((event) => {
      const current = currentEvents[event.id]
      const endsAtSecond = event.startsAtSecond + event.durationSeconds
      const status: TrafficEventStatus =
        gameTimeSeconds < event.startsAtSecond
          ? 'upcoming'
          : gameTimeSeconds < endsAtSecond
            ? 'active'
            : 'completed'

      return [event.id, { ...current, status }]
    }),
  )
}

export function getActiveTrafficMultiplier(
  events: StageTrafficEventRuntime,
) {
  return Object.values(events).reduce(
    (multiplier, event) =>
      event.status === 'active'
        ? multiplier * event.actualMultiplier
        : multiplier,
    1,
  )
}

export function getCompletedTrafficEventIds(
  events: StageTrafficEventRuntime,
) {
  return Object.values(events)
    .filter((event) => event.status === 'completed')
    .map((event) => event.eventId)
}

function selectForecastMultiplier(
  event: TrafficEventDefinition,
  campaignSeed: number,
) {
  const seededFraction = createSeededFraction(campaignSeed, event.id)
  return roundToOneDecimal(
    event.forecastMinimumMultiplier +
      (event.forecastMaximumMultiplier -
        event.forecastMinimumMultiplier) *
        seededFraction,
  )
}

function createSeededFraction(seed: number, eventId: string) {
  let value = seed >>> 0

  for (const character of eventId) {
    value = Math.imul(value ^ character.charCodeAt(0), 16_777_619) >>> 0
  }

  return value / 4_294_967_295
}
