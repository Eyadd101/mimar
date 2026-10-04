import { useId } from 'react'
import { useLanguage } from '../i18n/useLanguage'
import { formatCredits } from '../data/creditPresentation'

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
  const titleId = useId()
  const descriptionId = useId()

  return (
    <div
      className="action-confirmation"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <section className="action-confirmation__card" dir={direction}>
        <p>{t('action.confirmInfrastructure')}</p>
        <h2 id={titleId}>{title}</h2>
        <span id={descriptionId}>{description}</span>
        <dl>
          <div>
            <dt>{t('action.immediateCost')}</dt>
            <dd>{t('common.credits', { value: formatCredits(cost) })}</dd>
          </div>
          <div>
            <dt>{t('action.deployment')}</dt>
            <dd>{t('common.gameSeconds', { value: durationSeconds })}</dd>
          </div>
        </dl>
        <div>
          <button type="button" onClick={onCancel} autoFocus>
            {t('common.cancel')}
          </button>
          <button type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
