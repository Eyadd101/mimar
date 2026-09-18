import type {
  StageConfig,
  TrafficEventDefinition,
} from '../data/stages'
import type { TranslationKey } from '../i18n/translations'

export type TrafficEventStatus = 'upcoming' | 'active' | 'completed'

export type TrafficEventRuntime = {
  eventId: string
  status: TrafficEventStatus
  actualMultiplier: number
  outcomeKind: TrafficEventOutcomeKind
  storyExplanationKey: TranslationKey | null
}

export type TrafficEventOutcomeKind =
  | 'typical'
  | 'moderately-lower'
  | 'moderately-higher'
  | 'tail'

export type TrafficEventOutcome = {
  multiplier: number
  kind: TrafficEventOutcomeKind
  storyExplanationKey: TranslationKey | null
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
      createEventRuntime(event, campaignSeed),
    ]),
  )
}

function createEventRuntime(
  event: TrafficEventDefinition,
  campaignSeed: number,
): TrafficEventRuntime {
  const outcome = selectTrafficEventOutcome(event, campaignSeed)

  return {
    eventId: event.id,
    status: 'upcoming' as const,
    actualMultiplier: outcome.multiplier,
    outcomeKind: outcome.kind,
    storyExplanationKey: outcome.storyExplanationKey,
  }
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

/**
 * Two deterministic samples choose an outcome band and a value inside it.
 * This keeps most runs near forecast while preserving bounded rare events.
 */
export function selectTrafficEventOutcome(
  event: TrafficEventDefinition,
  campaignSeed: number,
): TrafficEventOutcome {
  const categorySample = createSeededFraction(
    campaignSeed,
    `${event.id}:category`,
  )
  const valueSample = createSeededFraction(
    campaignSeed,
    `${event.id}:value`,
  )
  const {
    typicalProbability,
    moderatelyLowerProbability,
    moderatelyHigherProbability,
  } = event.outcomeProfile
  const lowerBoundary = typicalProbability + moderatelyLowerProbability
  const higherBoundary = lowerBoundary + moderatelyHigherProbability

  if (categorySample < typicalProbability) {
    return createOutcome('typical', event.outcomeProfile.typicalRange)
  }

  if (categorySample < lowerBoundary) {
    return createOutcome(
      'moderately-lower',
      event.outcomeProfile.moderatelyLowerRange,
    )
  }

  if (categorySample < higherBoundary) {
    return createOutcome(
      'moderately-higher',
      event.outcomeProfile.moderatelyHigherRange,
    )
  }

  return createOutcome(
    'tail',
    event.outcomeProfile.tailRange,
    event.outcomeProfile.tailExplanationKey,
  )

  function createOutcome(
    kind: TrafficEventOutcomeKind,
    range: readonly [number, number],
    storyExplanationKey: TranslationKey | null = null,
  ): TrafficEventOutcome {
    return {
      multiplier: roundToOneDecimal(
        range[0] + (range[1] - range[0]) * valueSample,
      ),
      kind,
      storyExplanationKey,
    }
  }
}

function createSeededFraction(seed: number, eventId: string) {
  let value = seed >>> 0

  for (const character of eventId) {
    value = Math.imul(value ^ character.charCodeAt(0), 16_777_619) >>> 0
  }

  return value / 4_294_967_295
}
