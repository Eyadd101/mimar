import { useId, useState } from 'react'
import type { CampaignSaveResult } from '../simulation/campaignSave'
import { useLanguage } from '../i18n/useLanguage'
import { CampaignResetDialog } from './CampaignResetDialog'

type CampaignStartOverlayProps = {
  saveResult: CampaignSaveResult
  onNewCampaign: () => void
  onContinueCampaign: () => void
}

export function CampaignStartOverlay({
  saveResult,
  onNewCampaign,
  onContinueCampaign,
}: CampaignStartOverlayProps) {
  const { direction, t } = useLanguage()
  const [isResetConfirmationOpen, setIsResetConfirmationOpen] = useState(false)
  const titleId = useId()
  const descriptionId = useId()
  const saveErrorKey =
    saveResult.status === 'corrupt'
      ? saveResult.error === 'invalid'
        ? 'campaign.saveInvalid'
        : 'campaign.saveUnreadable'
      : null

  return <>
    <div
      className="campaign-start-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-hidden={isResetConfirmationOpen || undefined}
    >
      <section className="campaign-start-card" dir={direction}>
        <p className="campaign-start-card__eyebrow">{t('app.brand')}</p>
        <h1 id={titleId}>{t('campaign.title')}</h1>
        <p id={descriptionId}>{t('campaign.description')}</p>

        {saveResult.status === 'corrupt' && (
          <div className="campaign-start-card__save-error" role="alert">
            <strong>{t('campaign.saveUnavailable')}</strong>
            <span>{saveErrorKey ? t(saveErrorKey) : ''} {t('campaign.saveReset')}</span>
          </div>
        )}

        <div className="campaign-start-card__actions">
          {saveResult.status === 'ready' && (
            <button type="button" onClick={onContinueCampaign} autoFocus>
              {t('campaign.continue')}
            </button>
          )}
          <button
            type="button"
            onClick={() => saveResult.status === 'ready' ? setIsResetConfirmationOpen(true) : onNewCampaign()}
            autoFocus={saveResult.status !== 'ready'}
          >
            {t('campaign.new')}
          </button>
        </div>
      </section>
    </div>
    {isResetConfirmationOpen && (
      <CampaignResetDialog
        onCancel={() => setIsResetConfirmationOpen(false)}
        onConfirm={onNewCampaign}
      />
    )}
  </>
}
