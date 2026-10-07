import { useId, useState } from 'react'
import type { CampaignSaveResult } from '../simulation/campaignSave'
import { useLanguage } from '../i18n/useLanguage'
import { CampaignResetDialog } from './CampaignResetDialog'
import { MimarMark } from './MimarMark'

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
        <div className="campaign-start-card__brand">
          <span className="campaign-start-card__mark" aria-hidden="true"><MimarMark /></span>
          <h1 id={titleId}>{t('app.brand')}</h1>
        </div>
        <p className="campaign-start-card__tagline">{t('campaign.title')}</p>
        <p className="campaign-start-card__description" id={descriptionId}>{t('campaign.description')}</p>

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
