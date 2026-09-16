import { customerSatisfactionConfig } from './config'

export type CustomerSatisfactionState = {
  customerSatisfaction: number
  badLatencyDurationSeconds: number
  satisfactionReason: string | null
}

const satisfactionDecreaseReason = `Customer satisfaction decreased because latency remained above ${customerSatisfactionConfig.badLatencyThresholdMs} ms.`

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
