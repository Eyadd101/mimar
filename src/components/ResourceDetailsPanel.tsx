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
  onClose: () => void
  onStartUpgrade: (resourceId: string) => void
}

const placeholderTypes = {
  users: 'Traffic Source',
  server: 'App Server',
  database: 'Database',
  'load-balancer': 'Load Balancer',
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
  onClose,
  onStartUpgrade,
}: ResourceDetailsPanelProps) {
  const { t } = useLanguage()
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

  return (
    <aside className="resource-panel nodrag nopan" aria-label="Resource details">
      <div className="resource-panel__header">
        <div>
          <p className="resource-panel__eyebrow">{t('resource.details')}</p>
          <h2>{node.data.label}</h2>
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
            <dt>{t('resource.name')}</dt>
            <dd>{appServer.resourceName}</dd>
          </div>
          <div>
            <dt>{t('resource.genericType')}</dt>
            <dd><TechnicalTerm translationKey="resource.appServer" /></dd>
          </div>
          <div>
            <dt>{t('resource.awsReference')}</dt>
            <dd>{appServerResourceConfig.awsReference}</dd>
          </div>
          <div>
            <dt><TechnicalTerm translationKey="metric.currentTier" /></dt>
            <dd>{appServer.tierName}</dd>
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
            <dt>{t('metric.status')}</dt>
            <dd data-status={appServer.status}>
              {t(statusTranslationKeys[appServer.status])}
            </dd>
          </div>
          <div>
            <dt>{t('resource.costPerPeriod')} · {appServerResourceConfig.costPeriodSeconds}s</dt>
            <dd>{appServer.costPerPeriod} credits</dd>
          </div>
        </dl>
      ) : isLoadBalancer ? (
        <dl className="resource-panel__details">
          <div>
            <dt>{t('resource.name')}</dt>
            <dd>{loadBalancerResourceConfig.name}</dd>
          </div>
          <div>
            <dt>{t('resource.genericType')}</dt>
            <dd><TechnicalTerm translationKey="resource.loadBalancer" /></dd>
          </div>
          <div>
            <dt>{t('resource.awsReference')}</dt>
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
            <dt>{t('resource.costPerPeriod')} · {appServerResourceConfig.costPeriodSeconds}s</dt>
            <dd>{loadBalancerResourceConfig.costPerPeriod} credits</dd>
          </div>
        </dl>
      ) : (
        <div className="resource-panel__placeholder">
          <p>{placeholderTypes[node.data.kind]}</p>
          <span>{t('resource.moreDetailsLater')}</span>
        </div>
      )}

      {isAppServer && appServer && (
        <div className="resource-panel__upgrade">
          {deployment ? (
            <>
              <div className="resource-panel__upgrade-heading">
                <span>Deploying {upgradeTarget.name}</span>
                <strong>{deploymentPercent}%</strong>
              </div>
              <div
                className="deployment-progress"
                role="progressbar"
                aria-label="Server upgrade deployment"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={deploymentPercent}
              >
                <span style={{ width: `${deploymentPercent}%` }} />
              </div>
              <p>{deploymentSecondsRemaining} {t('resource.deploymentRemaining')}</p>
            </>
          ) : appServer.tierId ===
            serverUpgradeConfig.targetTierId ? (
            <p className="resource-panel__upgrade-complete">
              {t('resource.mediumActive')}
            </p>
          ) : (
            <>
              <div className="resource-panel__upgrade-heading">
                <span>{upgradeTarget.name}</span>
                <strong>
                  {upgradeTarget.requestCapacity} req/s
                </strong>
              </div>
              <p>
                {serverUpgradeConfig.upgradeCost} credits ·{' '}
                {serverUpgradeConfig.deploymentDurationSeconds} game seconds
              </p>
              <p>{t('resource.availableBalance')}: {simulation.balance} credits</p>
              <button
                type="button"
                className="resource-panel__upgrade-button"
                onClick={() => onStartUpgrade(node.id)}
                disabled={!canAffordUpgrade || anotherUpgradeIsDeploying}
              >
                {anotherUpgradeIsDeploying
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
