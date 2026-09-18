import { businessConsequenceConfig } from './config'
import type { TranslationMessage } from '../i18n/translations'

export type BusinessConsequenceState = {
  severeOutageDurationSeconds: number
  outagePenaltyAppliedForIncident: boolean
  totalFinancialPenalties: number
  businessConsequenceReason: TranslationMessage | null
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
): { balance: number; consequenceState: BusinessConsequenceState } {
  const currentConsequenceState: BusinessConsequenceState = {
    severeOutageDurationSeconds: currentState.severeOutageDurationSeconds,
    outagePenaltyAppliedForIncident:
      currentState.outagePenaltyAppliedForIncident,
    totalFinancialPenalties: currentState.totalFinancialPenalties,
    businessConsequenceReason: currentState.businessConsequenceReason,
  }

  if (latencyMs < businessConsequenceConfig.severeOutageLatencyMs) {
    return {
      balance,
      consequenceState: {
        ...currentConsequenceState,
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
        ...currentConsequenceState,
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
      businessConsequenceReason: {
        key: 'notice.outagePenalty',
        variables: {
          penalty: businessConsequenceConfig.severeOutagePenalty,
          latency: businessConsequenceConfig.severeOutageLatencyMs,
        },
      },
    },
  }
}
