import { businessConsequenceConfig } from './config'

export type BusinessConsequenceState = {
  severeOutageDurationSeconds: number
  outagePenaltyAppliedForIncident: boolean
  totalFinancialPenalties: number
  businessConsequenceReason: string | null
}

export function createInitialBusinessConsequenceState(): BusinessConsequenceState {
  return {
    severeOutageDurationSeconds: 0,
    outagePenaltyAppliedForIncident: false,
    totalFinancialPenalties: 0,
    businessConsequenceReason: null,
  }
}

export function advanceBusinessConsequences(
  currentState: BusinessConsequenceState,
  latencyMs: number,
  balance: number,
) {
  if (latencyMs < businessConsequenceConfig.severeOutageLatencyMs) {
    return {
      balance,
      consequenceState: {
        ...currentState,
        severeOutageDurationSeconds: 0,
        outagePenaltyAppliedForIncident: false,
        businessConsequenceReason: null,
      },
    }
  }

  const severeOutageDurationSeconds =
    currentState.severeOutageDurationSeconds + 1
  const shouldApplyPenalty =
    !currentState.outagePenaltyAppliedForIncident &&
    severeOutageDurationSeconds >=
      businessConsequenceConfig.sustainedOutageSeconds

  if (!shouldApplyPenalty) {
    return {
      balance,
      consequenceState: {
        ...currentState,
        severeOutageDurationSeconds,
        businessConsequenceReason: null,
      },
    }
  }

  return {
    balance: Math.max(
      balance - businessConsequenceConfig.severeOutagePenalty,
      0,
    ),
    consequenceState: {
      severeOutageDurationSeconds,
      outagePenaltyAppliedForIncident: true,
      totalFinancialPenalties:
        currentState.totalFinancialPenalties +
        businessConsequenceConfig.severeOutagePenalty,
      businessConsequenceReason: `Severe outage penalty: ${businessConsequenceConfig.severeOutagePenalty} credits after latency remained above ${businessConsequenceConfig.severeOutageLatencyMs} ms.`,
    },
  }
}
