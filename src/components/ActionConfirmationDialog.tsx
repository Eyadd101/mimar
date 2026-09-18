type ActionConfirmationDialogProps = {
  title: string
  description: string
  cost: number
  durationSeconds: number
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ActionConfirmationDialog({
  title,
  description,
  cost,
  durationSeconds,
  confirmLabel,
  onConfirm,
  onCancel,
}: ActionConfirmationDialogProps) {
  const { direction, t } = useLanguage()

  return (
    <div className="action-confirmation" role="alertdialog" aria-modal="true">
      <section className="action-confirmation__card" dir={direction}>
        <p>{t('action.confirmInfrastructure')}</p>
        <h2>{title}</h2>
        <span>{description}</span>
        <dl>
          <div>
            <dt>{t('action.immediateCost')}</dt>
            <dd>{t('common.credits', { value: cost })}</dd>
          </div>
          <div>
            <dt>{t('action.deployment')}</dt>
            <dd>{t('common.gameSeconds', { value: durationSeconds })}</dd>
          </div>
        </dl>
        <div>
          <button type="button" onClick={onCancel}>
            {t('common.cancel')}
          </button>
          <button type="button" onClick={onConfirm} autoFocus>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
import { useLanguage } from '../i18n/useLanguage'
