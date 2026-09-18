import { customerSatisfactionConfig } from './config'
import type { TranslationMessage } from '../i18n/translations'

export type CustomerSatisfactionState = {
  customerSatisfaction: number
  badLatencyDurationSeconds: number
  satisfactionReason: TranslationMessage | null
}

const satisfactionDecreaseReason: TranslationMessage = {
  key: 'notice.satisfactionDecrease',
  variables: {
    threshold: customerSatisfactionConfig.badLatencyThresholdMs,
  },
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum)

export function createInitialCustomerSatisfactionState(): CustomerSatisfactionState {
  return {
    customerSatisfaction: customerSatisfactionConfig.initialSatisfaction,
    badLatencyDurationSeconds: 0,
    satisfactionReason: null,
  }
}

export function advanceCustomerSatisfaction(
  currentState: CustomerSatisfactionState,
  latencyMs: number,
  elapsedGameSeconds: number,
): CustomerSatisfactionState {
  if (latencyMs <= customerSatisfactionConfig.badLatencyThresholdMs) {
    return {
      customerSatisfaction: currentState.customerSatisfaction,
      badLatencyDurationSeconds: 0,
      satisfactionReason: null,
    }
  }

  const badLatencyDurationSeconds =
    currentState.badLatencyDurationSeconds + elapsedGameSeconds
  const shouldDecrease =
    badLatencyDurationSeconds >=
    customerSatisfactionConfig.sustainedBadLatencySeconds
  const customerSatisfaction = shouldDecrease
    ? clamp(
        currentState.customerSatisfaction -
          customerSatisfactionConfig.satisfactionDecreasePerSecond *
            elapsedGameSeconds,
        0,
        100,
      )
    : currentState.customerSatisfaction

  return {
    customerSatisfaction,
    badLatencyDurationSeconds,
    satisfactionReason:
      customerSatisfaction < currentState.customerSatisfaction
        ? satisfactionDecreaseReason
        : null,
  }
}
