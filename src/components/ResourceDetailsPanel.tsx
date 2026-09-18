import type { InfrastructureFlowNode } from '../data/infrastructure'
import {
  appServerResourceConfig,
  loadBalancerResourceConfig,
  serverTierConfigs,
  serverUpgradeConfig,
} from '../simulation/config'
import { canAffordCost } from '../simulation/economySimulation'
import {
  calculateDeploymentProgress,
  type TrafficSimulationState,
} from '../simulation/trafficSimulation'
import { useLanguage } from '../i18n/useLanguage'
import { TechnicalTerm } from './TechnicalTerm'
import type { TranslationKey } from '../i18n/translations'

type ResourceDetailsPanelProps = {
  node: InfrastructureFlowNode
  simulation: TrafficSimulationState
  serviceStarted: boolean
  onClose: () => void
  onStartUpgrade: (resourceId: string) => void
}

const placeholderTypeKeys: Record<InfrastructureFlowNode['data']['kind'], TranslationKey> = {
  users: 'resource.trafficSource',
  server: 'resource.appServer',
  database: 'resource.database',
  'load-balancer': 'resource.loadBalancer',
} as const

const statusTranslationKeys: Record<string, TranslationKey> = {
  normal: 'status.normal',
  elevated: 'status.elevated',
  high: 'status.high',
  overloaded: 'status.overloaded',
}

export function ResourceDetailsPanel({
  node,
  simulation,
  serviceStarted,
  onClose,
  onStartUpgrade,
}: ResourceDetailsPanelProps) {
  const { language, t } = useLanguage()
  const isAppServer = node.data.kind === 'server'
  const isLoadBalancer = node.data.kind === 'load-balancer'
  const appServer = simulation.appServers.find(
    (server) => server.resourceId === node.id,
  )
  const deployment =
    simulation.serverDeployment?.resourceId === node.id
      ? simulation.serverDeployment
      : null
  const deploymentProgress = deployment
    ? calculateDeploymentProgress(deployment, simulation.gameTimeSeconds)
    : 0
  const deploymentPercent = Math.round(deploymentProgress * 100)
  const deploymentSecondsRemaining = deployment
    ? Math.max(
        deployment.completesAtGameTimeSeconds - simulation.gameTimeSeconds,
        0,
      )
    : 0
  const upgradeTarget = serverTierConfigs[serverUpgradeConfig.targetTierId]
  const canAffordUpgrade = canAffordCost(
    simulation.balance,
    serverUpgradeConfig.upgradeCost,
  )
  const anotherUpgradeIsDeploying =
    simulation.serverDeployment !== null && deployment === null
  const resourceNameKey: TranslationKey =
    node.id === 'server-b'
      ? 'resource.appServerB'
      : node.data.kind === 'server'
        ? 'resource.appServer'
        : node.data.kind === 'load-balancer'
          ? 'resource.loadBalancer'
          : node.data.kind === 'database'
            ? 'resource.database'
            : 'resource.users'
  const tierKey: TranslationKey =
    appServer?.tierId === 'medium'
      ? 'resource.mediumServer'
      : 'resource.smallServer'

  return (
    <aside
      className="resource-panel nodrag nopan"
      aria-label={t('resource.details')}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="resource-panel__header">
        <div>
          <p className="resource-panel__eyebrow">{t('resource.details')}</p>
          <h2><TechnicalTerm translationKey={resourceNameKey} /></h2>
        </div>
        <button
          type="button"
          className="resource-panel__close"
          onClick={onClose}
          aria-label={`${t('common.close')} ${t('resource.details')}`}
        >
          ×
        </button>
      </div>

      {isAppServer && appServer ? (
        <dl className="resource-panel__details">
          <div>
            <dt><TechnicalTerm translationKey="resource.name" /></dt>
            <dd><TechnicalTerm translationKey={resourceNameKey} /></dd>
          </div>
          <div>
            <dt><TechnicalTerm translationKey="resource.genericType" /></dt>
            <dd><TechnicalTerm translationKey="resource.appServer" /></dd>
          </div>
          <div>
            <dt><TechnicalTerm translationKey="resource.awsReference" /></dt>
            <dd>{appServerResourceConfig.awsReference}</dd>
          </div>
          <div>
            <dt><TechnicalTerm translationKey="metric.currentTier" /></dt>
            <dd><TechnicalTerm translationKey={tierKey} /></dd>
          </div>
          <div>
            <dt><TechnicalTerm translationKey="metric.requestCapacity" /></dt>
            <dd>{appServer.requestCapacity.toFixed(1)} req/s</dd>
          </div>
          <div>
            <dt><TechnicalTerm translationKey="metric.currentTraffic" /></dt>
            <dd>{appServer.requestsPerSecond.toFixed(1)} req/s</dd>
          </div>
          <div>
            <dt><TechnicalTerm translationKey="metric.cpuUsage" /></dt>
            <dd>{appServer.cpuUsage.toFixed(1)}%</dd>
          </div>
          <div>
            <dt><TechnicalTerm translationKey="metric.memoryUsage" /></dt>
            <dd>{appServer.memoryUsage.toFixed(1)}%</dd>
          </div>
          <div>
            <dt><TechnicalTerm translationKey="metric.latency" /></dt>
            <dd>{appServer.latencyMs} ms</dd>
          </div>
          <div>
            <dt><TechnicalTerm translationKey="metric.status" /></dt>
            <dd data-status={appServer.status}>
              {t(statusTranslationKeys[appServer.status])}
            </dd>
          </div>
          <div>
            <dt><TechnicalTerm translationKey="resource.costPerPeriod" /> · {appServerResourceConfig.costPeriodSeconds}s</dt>
            <dd>{t('common.credits', { value: appServer.costPerPeriod })}</dd>
          </div>
        </dl>
      ) : isLoadBalancer ? (
        <dl className="resource-panel__details">
          <div>
            <dt><TechnicalTerm translationKey="resource.name" /></dt>
            <dd><TechnicalTerm translationKey="resource.loadBalancer" /></dd>
          </div>
          <div>
            <dt><TechnicalTerm translationKey="resource.genericType" /></dt>
            <dd><TechnicalTerm translationKey="resource.loadBalancer" /></dd>
          </div>
          <div>
            <dt><TechnicalTerm translationKey="resource.awsReference" /></dt>
            <dd>{loadBalancerResourceConfig.awsReference}</dd>
          </div>
          <div>
            <dt>{t('resource.distribution')}</dt>
            <dd>{t('resource.evenSplit')}</dd>
          </div>
          <div>
            <dt>{t('resource.connectedServers')}</dt>
            <dd>{simulation.appServers.length}</dd>
          </div>
          <div>
            <dt><TechnicalTerm translationKey="resource.costPerPeriod" /> · {appServerResourceConfig.costPeriodSeconds}s</dt>
            <dd>{t('common.credits', { value: loadBalancerResourceConfig.costPerPeriod })}</dd>
          </div>
        </dl>
      ) : (
        <div className="resource-panel__placeholder">
          <p><TechnicalTerm translationKey={placeholderTypeKeys[node.data.kind]} /></p>
          <span>{t('resource.moreDetailsLater')}</span>
        </div>
      )}

      {isAppServer && appServer && (
        <div className="resource-panel__upgrade">
          {deployment ? (
            <>
              <div className="resource-panel__upgrade-heading">
                <span>{t('common.deploying', { resource: t('resource.mediumServer') })}</span>
                <strong>{deploymentPercent}%</strong>
              </div>
              <div
                className="deployment-progress"
                role="progressbar"
                aria-label={t('resource.upgradeDeploymentAria')}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={deploymentPercent}
              >
                <span style={{ width: `${deploymentPercent}%` }} />
              </div>
              <p>{t('resource.deploymentRemaining', { seconds: deploymentSecondsRemaining })}</p>
            </>
          ) : appServer.tierId ===
            serverUpgradeConfig.targetTierId ? (
            <p className="resource-panel__upgrade-complete">
              {t('resource.mediumActive')}
            </p>
          ) : (
            <>
              <div className="resource-panel__upgrade-heading">
                <span><TechnicalTerm translationKey="resource.mediumServer" /></span>
                <strong>
                  {upgradeTarget.requestCapacity} req/s
                </strong>
              </div>
              <p>
                {t('common.credits', { value: serverUpgradeConfig.upgradeCost })} ·{' '}
                {t('common.gameSeconds', { value: serverUpgradeConfig.deploymentDurationSeconds })}
              </p>
              <p>{t('resource.availableBalance')}: {t('common.credits', { value: simulation.balance })}</p>
              <button
                type="button"
                className="resource-panel__upgrade-button"
                onClick={() => onStartUpgrade(node.id)}
                disabled={
                  !serviceStarted ||
                  !canAffordUpgrade ||
                  anotherUpgradeIsDeploying
                }
              >
                {!serviceStarted
                  ? t('resource.completePathFirst')
                  : anotherUpgradeIsDeploying
                  ? t('resource.anotherUpgrade')
                  : canAffordUpgrade
                    ? t('resource.upgradeMedium')
                    : t('resource.insufficientBalance')}
              </button>
            </>
          )}
        </div>
      )}
    </aside>
  )
}
