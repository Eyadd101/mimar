import type { CampaignSaveResult } from '../simulation/campaignSave'

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
  return (
    <div className="campaign-start-overlay" role="dialog" aria-modal="true">
      <section className="campaign-start-card">
        <p className="campaign-start-card__eyebrow">Cloud Game</p>
        <h1>Build your startup infrastructure</h1>
        <p>
          Observe demand, diagnose failures, and evolve one infrastructure
          across a connected campaign.
        </p>

        {saveResult.status === 'corrupt' && (
          <div className="campaign-start-card__save-error" role="alert">
            <strong>Saved campaign unavailable</strong>
            <span>{saveResult.message} Start a new campaign to reset it.</span>
          </div>
        )}

        <div className="campaign-start-card__actions">
          {saveResult.status === 'ready' && (
            <button type="button" onClick={onContinueCampaign}>
              Continue Campaign
            </button>
          )}
          <button type="button" onClick={onNewCampaign}>
            New Campaign
          </button>
        </div>
      </section>
    </div>
  )
}
