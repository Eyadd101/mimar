import type { CampaignSaveResult } from '../simulation/campaignSave'
import { useLanguage } from '../i18n/useLanguage'

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
  const saveErrorKey =
    saveResult.status === 'corrupt'
      ? saveResult.error === 'invalid'
        ? 'campaign.saveInvalid'
        : 'campaign.saveUnreadable'
      : null

  return (
    <div className="campaign-start-overlay" role="dialog" aria-modal="true">
      <section className="campaign-start-card" dir={direction}>
        <p className="campaign-start-card__eyebrow">{t('app.brand')}</p>
        <h1>{t('campaign.title')}</h1>
        <p>{t('campaign.description')}</p>

        {saveResult.status === 'corrupt' && (
          <div className="campaign-start-card__save-error" role="alert">
            <strong>{t('campaign.saveUnavailable')}</strong>
            <span>{saveErrorKey ? t(saveErrorKey) : ''} {t('campaign.saveReset')}</span>
          </div>
        )}

        <div className="campaign-start-card__actions">
          {saveResult.status === 'ready' && (
            <button type="button" onClick={onContinueCampaign}>
              {t('campaign.continue')}
            </button>
          )}
          <button type="button" onClick={onNewCampaign}>
            {t('campaign.new')}
          </button>
        </div>
      </section>
    </div>
  )
}
