import { useLanguage } from '../i18n/useLanguage'
import { formatCredits } from '../data/creditPresentation'
import { TechnicalTerm } from './TechnicalTerm'
import { backupConfig } from '../simulation/expansionConfig'
import { canRestoreDatabase, getBackupCost, type BackupSettings, type DatabaseData } from '../simulation/backupSimulation'

export function DatabaseBackupControls({ settings, data, onChange, onRestore, restoreRemainingSeconds, balance }: { settings: BackupSettings; data: DatabaseData; onChange: (settings: BackupSettings) => void; onRestore: () => void; restoreRemainingSeconds: number | null; balance: number }) {
  const { t } = useLanguage()
  return <section className="resource-panel__upgrade">
    <h3><TechnicalTerm translationKey="advanced.backups" /> — RDS Backup / Snapshot</h3>
    <p>{t('advanced.backupPurpose')}</p>
    <label className="security-setting"><input type="checkbox" checked={settings.enabled} onChange={event => onChange({ ...settings, enabled: event.target.checked })} />{t('advanced.enableBackups')}</label>
    <label className="security-setting">{t('advanced.backupFrequency')}<select value={settings.frequencySeconds} onChange={event => onChange({ ...settings, frequencySeconds: Number(event.target.value) })}>{backupConfig.frequenciesSeconds.map(seconds => <option key={seconds} value={seconds}>{seconds}s</option>)}</select></label>
    <p>{t('resource.costPerPeriod')}: {formatCredits(getBackupCost(settings))} · {t(data.backupRevision === null ? 'advanced.noBackup' : 'advanced.backupReady')}</p>
    {settings.enabled && <p>{t('advanced.backupDue', { seconds: Math.max(0, settings.frequencySeconds - data.secondsSinceBackup) })}</p>}
    {data.dataLost && <p role="alert">{t('advanced.dataLost')}</p>}
    {restoreRemainingSeconds !== null ? <p role="status">{t('advanced.restoreProgress', { seconds: restoreRemainingSeconds })}</p> : data.dataLost && <button className="resource-panel__upgrade-button" disabled={!canRestoreDatabase(data) || balance < backupConfig.restoreCost} onClick={onRestore}>{t(canRestoreDatabase(data) ? 'advanced.restore' : 'advanced.noBackup')} · {backupConfig.restoreCost}</button>}
  </section>
}
