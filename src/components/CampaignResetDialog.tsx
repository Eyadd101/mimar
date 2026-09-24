import { useId } from 'react'
import { useLanguage } from '../i18n/useLanguage'

type CampaignResetDialogProps = {
  onConfirm: () => void
  onCancel: () => void
}

export function CampaignResetDialog({
  onConfirm,
  onCancel,
}: CampaignResetDialogProps) {
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
        <p>{t('campaign.resetConfirmEyebrow')}</p>
        <h2 id={titleId}>{t('campaign.resetConfirmTitle')}</h2>
        <span id={descriptionId}>{t('campaign.resetConfirmMessage')}</span>
        <div>
          <button type="button" onClick={onCancel} autoFocus>
            {t('common.cancel')}
          </button>
          <button type="button" onClick={onConfirm}>
            {t('campaign.resetConfirmAction')}
          </button>
        </div>
      </section>
    </div>
  )
}
