import type { CampaignState } from '../simulation/campaignSimulation'
import {
  additionalAppServerConfig,
  loadBalancerResourceConfig,
} from '../simulation/config'
import { canAffordCost } from '../simulation/economySimulation'
import {
  calculateInfrastructureDeploymentProgress,
  type InfrastructureDeployment,
} from '../simulation/gameStateSimulation'
import type { TrafficSimulationState } from '../simulation/trafficSimulation'
import { useLanguage } from '../i18n/useLanguage'
import type { TranslationKey } from '../i18n/translations'
import { TechnicalTerm } from './TechnicalTerm'

type InfrastructureActionsPanelProps = {
  campaign: CampaignState
  simulation: TrafficSimulationState
  deployment: InfrastructureDeployment | null
  onDeployLoadBalancer: () => void
  onDeployAppServer: () => void
}

export function InfrastructureActionsPanel({
  campaign,
  simulation,
  deployment,
  onDeployLoadBalancer,
  onDeployAppServer,
}: InfrastructureActionsPanelProps) {
  const { direction, t } = useLanguage()
  const hasLoadBalancer = campaign.infrastructure.resources.some(
    (resource) => resource.type === 'load-balancer',
  )
  const hasAdditionalServer = campaign.infrastructure.resources.some(
    (resource) => resource.id === additionalAppServerConfig.id,
  )

  return (
    <aside className="infrastructure-actions nodrag nopan" aria-label={t('build.title')} dir={direction}>
      <div className="infrastructure-actions__heading">
        <span>{t('build.title')}</span>
        <strong>{t('build.horizontalScaling')}</strong>
      </div>

      {deployment ? (
        <DeploymentStatus
          deployment={deployment}
          gameTimeSeconds={simulation.gameTimeSeconds}
        />
      ) : hasLoadBalancer && hasAdditionalServer ? (
        <p className="infrastructure-actions__ready">
          {t('build.ready')}
        </p>
      ) : (
        <div className="infrastructure-actions__options">
          {!hasLoadBalancer && (
            <BuildOption
              titleKey="resource.loadBalancer"
              awsReference={loadBalancerResourceConfig.awsReference}
              cost={loadBalancerResourceConfig.deploymentCost}
              duration={loadBalancerResourceConfig.deploymentDurationSeconds}
              disabled={
                !canAffordCost(
                  simulation.balance,
                  loadBalancerResourceConfig.deploymentCost,
                )
              }
              onDeploy={onDeployLoadBalancer}
            />
          )}
          {!hasAdditionalServer && (
            <BuildOption
              titleKey="resource.appServerB"
              awsReference="EC2"
              cost={additionalAppServerConfig.deploymentCost}
              duration={additionalAppServerConfig.deploymentDurationSeconds}
              disabled={
                !hasLoadBalancer ||
                !canAffordCost(
                  simulation.balance,
                  additionalAppServerConfig.deploymentCost,
                )
              }
              disabledReason={
                hasLoadBalancer ? undefined : t('build.loadBalancerFirst')
              }
              onDeploy={onDeployAppServer}
            />
          )}
        </div>
      )}
    </aside>
  )
}

type BuildOptionProps = {
  titleKey: TranslationKey
  awsReference: string
  cost: number
  duration: number
  disabled: boolean
  disabledReason?: string
  onDeploy: () => void
}

function BuildOption({
  titleKey,
  awsReference,
  cost,
  duration,
  disabled,
  disabledReason,
  onDeploy,
}: BuildOptionProps) {
  const { t } = useLanguage()

  return (
    <div className="build-option">
      <div>
        <strong><TechnicalTerm translationKey={titleKey} /></strong>
        <span>{awsReference}</span>
      </div>
      <p>{t('common.credits', { value: cost })} · {t('common.gameSeconds', { value: duration })}</p>
      <button type="button" disabled={disabled} onClick={onDeploy}>
        {disabledReason ?? (disabled ? t('resource.insufficientBalance') : t('common.deploy'))}
      </button>
    </div>
  )
}

function DeploymentStatus({
  deployment,
  gameTimeSeconds,
}: {
  deployment: InfrastructureDeployment
  gameTimeSeconds: number
}) {
  const { t } = useLanguage()
  const progress = calculateInfrastructureDeploymentProgress(
    deployment,
    gameTimeSeconds,
  )
  const percent = Math.round(progress * 100)
  const remaining = Math.max(
    deployment.completesAtGameTimeSeconds - gameTimeSeconds,
    0,
  )
  const resourceKey: TranslationKey =
    deployment.kind === 'load-balancer'
      ? 'resource.loadBalancer'
      : 'resource.appServerB'
  const resourceName = t(resourceKey)

  return (
    <div className="infrastructure-actions__deployment">
      <div>
        <span>{t('common.deploying', { resource: resourceName })}</span>
        <strong>{percent}%</strong>
      </div>
      <div
        className="deployment-progress"
        role="progressbar"
        aria-label={t('resource.deploymentAria', { resource: resourceName })}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
      <p>{t('resource.deploymentRemaining', { seconds: remaining })}</p>
    </div>
  )
}
