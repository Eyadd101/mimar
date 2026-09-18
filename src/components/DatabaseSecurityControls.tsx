import { useLanguage } from '../i18n/useLanguage'
import { TechnicalTerm } from './TechnicalTerm'
import { securityRiskKeys, type SecurityRisk, type SecuritySettings, type SecurityRuntime } from '../simulation/securitySimulation'
import { securityConfig } from '../simulation/expansionConfig'

export function DatabaseSecurityControls({ settings, runtime, onChange }: {
  settings: SecuritySettings; runtime: SecurityRuntime; onChange: (key: SecurityRisk, exposed: boolean) => void
}) {
  const { t } = useLanguage()
  return <section className="resource-panel__upgrade">
    <h3><TechnicalTerm translationKey="advanced.security" /></h3>
    <p>{t('advanced.securityPurpose')}</p>
    {securityRiskKeys.map(key => <label className="security-setting" key={key}><input type="checkbox" checked={settings[key]} onChange={event => onChange(key, event.target.checked)} /><TechnicalTerm translationKey={`advanced.${key}`} /></label>)}
    <p role="status">{runtime.risks.length ? t(runtime.incidentActive ? 'advanced.securityIncident' : 'advanced.securityWarning', { seconds: Math.max(0, securityConfig.gracePeriodSeconds - runtime.exposureSeconds) }) : t('advanced.securityClear')}</p>
  </section>
}
