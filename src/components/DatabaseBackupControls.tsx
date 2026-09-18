import { useLanguage } from '../i18n/useLanguage'
import { TechnicalTerm } from './TechnicalTerm'
import { backupConfig } from '../simulation/expansionConfig'
import { getBackupCost, type BackupSettings, type DatabaseData } from '../simulation/backupSimulation'

export function DatabaseBackupControls({ settings, data, onChange }: { settings: BackupSettings; data: DatabaseData; onChange: (settings: BackupSettings) => void }) {
  const { t } = useLanguage()
  return <section className="resource-panel__upgrade">
    <h3><TechnicalTerm translationKey="advanced.backups" /> — RDS Backup / Snapshot</h3>
    <p>{t('advanced.backupPurpose')}</p>
    <label className="security-setting"><input type="checkbox" checked={settings.enabled} onChange={event => onChange({ ...settings, enabled: event.target.checked })} />{t('advanced.enableBackups')}</label>
    <label className="security-setting">{t('advanced.backupFrequency')}<select value={settings.frequencySeconds} onChange={event => onChange({ ...settings, frequencySeconds: Number(event.target.value) })}>{backupConfig.frequenciesSeconds.map(seconds => <option key={seconds} value={seconds}>{seconds}s</option>)}</select></label>
    <p>{t('resource.costPerPeriod')}: {getBackupCost(settings).toFixed(1)} · {t(data.backupRevision === null ? 'advanced.noBackup' : 'advanced.backupReady')}</p>
    {settings.enabled && <p>{t('advanced.backupDue', { seconds: Math.max(0, settings.frequencySeconds - data.secondsSinceBackup) })}</p>}
  </section>
}
