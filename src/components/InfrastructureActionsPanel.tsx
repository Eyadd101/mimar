import { getUnlockedAdvancedResources } from '../data/resourcePalette'
import { advancedResourceConfigs, type AdvancedResourceType } from '../simulation/expansionConfig'
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
  onDeployAdvanced: (type: AdvancedResourceType) => void
  onDeployLoadBalancer: () => void
  onDeployAppServer: () => void
  onPlaceResource: (resourceId: string) => void
}

export function InfrastructureActionsPanel({
  campaign,
  simulation,
  deployment,
  onDeployAdvanced,
  onDeployLoadBalancer,
  onDeployAppServer,
  onPlaceResource,
}: InfrastructureActionsPanelProps) {
  const { direction, t } = useLanguage()
  const hasLoadBalancer = campaign.infrastructure.resources.some(
    (resource) => resource.type === 'load-balancer',
  )
  const ownsLoadBalancer =
    hasLoadBalancer ||
    campaign.inventory.some((resource) => resource.type === 'load-balancer')
  const hasAdditionalServer = campaign.infrastructure.resources.some(
    (resource) => resource.id === additionalAppServerConfig.id,
  )
  const ownsAdditionalServer =
    hasAdditionalServer ||
    campaign.inventory.some(
      (resource) => resource.id === additionalAppServerConfig.id,
    )

  return (
    <aside className="infrastructure-actions nodrag nopan" aria-label={t('build.title')} dir={direction}>
      <div className="infrastructure-actions__heading">
        <span>{t('palette.title')}</span>
        <strong>{t('palette.available')}</strong>
      </div>

      {deployment ? (
        <DeploymentStatus
          deployment={deployment}
          gameTimeSeconds={simulation.gameTimeSeconds}
        />
      ) : ownsLoadBalancer && ownsAdditionalServer ? (
        <p className="infrastructure-actions__ready">
          {t('advanced.currentResources', { count: campaign.infrastructure.resources.length })}
        </p>
      ) : (
        <div className="infrastructure-actions__options">
          {!ownsLoadBalancer && (
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
          {!ownsAdditionalServer && (
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
                hasLoadBalancer
                  ? undefined
                  : ownsLoadBalancer
                    ? t('build.placeLoadBalancerFirst')
                    : t('build.loadBalancerFirst')
              }
              onDeploy={onDeployAppServer}
            />
          )}
        </div>
      )}
      {campaign.inventory.length > 0 && (
        <div className="infrastructure-inventory">
          <strong>{t('build.readyToPlace')}</strong>
          {campaign.inventory.map((resource) => (
            <InventoryOption
              key={resource.id}
              resource={resource}
              onPlace={() => onPlaceResource(resource.id)}
            />
          ))}
        </div>
      )}
      {!deployment && <div className="infrastructure-actions__options">{getUnlockedAdvancedResources(campaign).map(type => {
        const definition = advancedResourceConfigs[type]
        return <BuildOption key={type} titleKey={definition.labelKey} awsReference={definition.awsReference} cost={definition.deploymentCost} duration={definition.deploymentDurationSeconds} disabled={simulation.balance < definition.deploymentCost} onDeploy={() => onDeployAdvanced(type)} />
      })}</div>}
      {!!campaign.unlockedControls?.length && <p className="infrastructure-actions__ready">{t('advanced.inspectDatabaseControls')}</p>}
    </aside>
  )
}

function InventoryOption({
  resource,
  onPlace,
}: {
  resource: CampaignState['inventory'][number]
  onPlace: () => void
}) {
  const { t } = useLanguage()
  const titleKey: TranslationKey =
    resource.type === 'load-balancer'
      ? 'resource.loadBalancer'
      : resource.type === 'app-server'
        ? 'resource.appServerB'
        : advancedResourceConfigs[resource.type].labelKey
  const purposeKey: TranslationKey =
    resource.type === 'load-balancer'
      ? 'build.loadBalancerPurpose'
      : resource.type === 'app-server'
        ? 'build.appServerPurpose'
        : advancedResourceConfigs[resource.type].purposeKey

  return (
    <article className="inventory-option">
      <strong><TechnicalTerm translationKey={titleKey} /></strong>
      <p>{t(purposeKey)}</p>
      <small>{t('build.placeThenConnect')}</small>
      <button type="button" onClick={onPlace}>{t('build.placeOnCanvas')}</button>
    </article>
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
        {disabledReason ?? (disabled ? t('resource.insufficientBalance') : t('common.purchasePrepare'))}
      </button>
    </div>
  )
}

export function DeploymentStatus({
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
    deployment.kind === 'database-downsize' ? 'advanced.smallDatabase' : deployment.kind in advancedResourceConfigs ? advancedResourceConfigs[deployment.kind as AdvancedResourceType].labelKey : deployment.kind === 'database-upgrade' ? 'advanced.mediumDatabase' : deployment.kind === 'load-balancer'
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
