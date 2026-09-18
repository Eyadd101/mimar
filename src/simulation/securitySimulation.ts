import { securityConfig } from './expansionConfig'

export type SecuritySettings = { publicDatabase: boolean; weakCredentials: boolean; excessivePermissions: boolean; openNetwork: boolean }
export const secureSettings: SecuritySettings = { publicDatabase: false, weakCredentials: false, excessivePermissions: false, openNetwork: false }
export type SecurityRisk = keyof SecuritySettings
export const securityRiskKeys: readonly SecurityRisk[] = ['publicDatabase', 'weakCredentials', 'excessivePermissions', 'openNetwork']
export type SecurityRuntime = { risks: SecurityRisk[]; exposureSeconds: number; incidentActive: boolean; penaltyCharged: boolean }
export const clearSecurityRuntime: SecurityRuntime = { risks: [], exposureSeconds: 0, incidentActive: false, penaltyCharged: false }

/** Configuration causes exposure. An incident starts only after continuous exposure. */
export function advanceSecurity(current: SecurityRuntime, settings: SecuritySettings, seconds = 1) {
  const risks = securityRiskKeys.filter(key => settings[key])
  if (risks.length === 0) return { state: clearSecurityRuntime, penalty: 0 }
  const exposureSeconds = current.exposureSeconds + Math.max(0, seconds)
  const incidentActive = exposureSeconds >= securityConfig.gracePeriodSeconds
  const penalty = incidentActive && !current.penaltyCharged ? securityConfig.incidentCost : 0
  return { state: { risks, exposureSeconds, incidentActive, penaltyCharged: current.penaltyCharged || incidentActive }, penalty }
}
