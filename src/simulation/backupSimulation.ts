import { backupConfig } from './expansionConfig'

export type BackupSettings = { enabled: boolean; frequencySeconds: number }
export type DatabaseData = { revision: number; backupRevision: number | null; secondsSinceBackup: number; dataLost: boolean }
export const defaultBackupSettings: BackupSettings = { enabled: false, frequencySeconds: backupConfig.frequenciesSeconds[0] }
export const initialDatabaseData: DatabaseData = { revision: 1, backupRevision: null, secondsSinceBackup: 0, dataLost: false }

/** Snapshot metadata represents data; a snapshot never adds throughput or availability. */
export function advanceBackups(current: DatabaseData, settings: BackupSettings, seconds = 1): DatabaseData {
  if (seconds <= 0 || current.dataLost) return current
  const revision = current.revision + seconds
  const secondsSinceBackup = settings.enabled ? current.secondsSinceBackup + seconds : 0
  const due = settings.enabled && secondsSinceBackup >= settings.frequencySeconds
  return { ...current, revision, secondsSinceBackup: due ? 0 : secondsSinceBackup, backupRevision: due ? revision : current.backupRevision }
}
export function getBackupCost(settings: BackupSettings) {
  return settings.enabled ? backupConfig.baseCostPerPeriod * backupConfig.frequenciesSeconds[0] / settings.frequencySeconds : 0
}
export function canRestoreDatabase(data: DatabaseData) {
  return data.dataLost && data.backupRevision !== null && data.backupRevision > 0 && data.backupRevision <= data.revision
}
export function restoreDatabase(data: DatabaseData): DatabaseData {
  return canRestoreDatabase(data) ? { ...data, revision: data.backupRevision!, dataLost: false, secondsSinceBackup: 0 } : data
}
