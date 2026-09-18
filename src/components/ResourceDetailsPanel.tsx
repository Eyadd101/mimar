import { advancedResourceConfigs, type AdvancedResourceType, databaseUpgradeConfig } from '../simulation/expansionConfig'
import type { InfrastructureDeployment } from '../simulation/gameStateSimulation'
import { DeploymentStatus } from './InfrastructureActionsPanel'
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
  databaseUpgradeUnlocked: boolean
  infrastructureDeployment: InfrastructureDeployment | null
  onUpgradeDatabase: () => void
  onClose: () => void
  onStartUpgrade: (resourceId: string) => void
}

const placeholderTypeKeys: Record<InfrastructureFlowNode['data']['kind'], TranslationKey> = {
  queue: 'advanced.queue',
  worker: 'advanced.worker',
  cache: 'advanced.cache',
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
  databaseUpgradeUnlocked, infrastructureDeployment, onUpgradeDatabase,
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
    node.data.kind in advancedResourceConfigs ? advancedResourceConfigs[node.data.kind as AdvancedResourceType].labelKey : node.id === 'server-b'
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
      ) : node.data.kind === 'queue' || node.data.kind === 'worker' ? (
        <><p>{advancedResourceConfigs[node.data.kind].awsReference}</p><p>{t(advancedResourceConfigs[node.data.kind].purposeKey)}</p>
          <dl className="resource-panel__details">{([
            ['advanced.queueDepth', simulation.queue.depth.toFixed(1)], ['advanced.enqueueRate', `${simulation.queue.enqueueRate.toFixed(1)}/s`], ['advanced.processingRate', `${simulation.queue.processingRate.toFixed(1)}/s`], ['advanced.oldestAge', `${simulation.queue.oldestMessageAge.toFixed(1)}s`], ['resource.costPerPeriod', advancedResourceConfigs[node.data.kind].costPerPeriod],
          ] as const).map(([key, value]) => <div key={key}><dt><TechnicalTerm translationKey={key} /></dt><dd>{value}</dd></div>)}</dl></>
      ) : node.data.kind === 'cache'  ? (
        <><p><TechnicalTerm translationKey="advanced.cache" /> — ElastiCache</p><p>{t('advanced.cachePurpose')}</p>
          <dl className="resource-panel__details">
            {([['advanced.hitRate', `${simulation.cache.hitRate.toFixed(1)}%`], ['advanced.served', `${simulation.cache.requestsServed.toFixed(1)}/s`], ['advanced.queryCapacity', `${simulation.cache.capacity}/s`], ['metric.status', t(statusTranslationKeys[simulation.cache.status])], ['resource.costPerPeriod', advancedResourceConfigs.cache.costPerPeriod]] as const).map(([key, value]) => <div key={key}><dt><TechnicalTerm translationKey={key} /></dt><dd>{value}</dd></div>)}
          </dl></>
      ) : node.data.kind === 'database'  ? (
        <>
          <p><TechnicalTerm translationKey="advanced.database" /> — RDS</p>
          <p>{t('advanced.databasePurpose')}</p>
          <dl className="resource-panel__details">
            {([
              ['metric.currentTier', t(simulation.database.tierId === 'small' ? 'advanced.smallDatabase' : 'advanced.mediumDatabase')],
              ['advanced.memorySize', `${simulation.database.memoryGiB} GiB`],
              ['metric.cpuUsage', `${simulation.database.cpuUsage.toFixed(1)}%`],
              ['metric.memoryUsage', `${simulation.database.memoryUsage.toFixed(1)}%`],
              ['advanced.queryLoad', `${simulation.database.queryLoad.toFixed(1)}/s`],
              ['advanced.queryCapacity', `${simulation.database.capacity}/s`],
              ['advanced.connections', simulation.database.activeConnections],
              ['advanced.connectionCapacity', simulation.database.connectionCapacity],
              ['advanced.queryLatency', `${simulation.database.queryLatencyMs} ms`],
              ['metric.status', t(statusTranslationKeys[simulation.database.status])],
              ['resource.costPerPeriod', t('common.credits', { value: simulation.database.costPerPeriod })],
            ] as const).map(([key, value]) => <div key={key}><dt><TechnicalTerm translationKey={key} /></dt><dd>{value}</dd></div>)}
          </dl>
          {infrastructureDeployment?.kind === 'database-upgrade' ? <DeploymentStatus deployment={infrastructureDeployment} gameTimeSeconds={simulation.gameTimeSeconds} /> : databaseUpgradeUnlocked && simulation.database.tierId === 'small' && <button className="resource-panel__upgrade-button" disabled={!!infrastructureDeployment || simulation.balance < databaseUpgradeConfig.deploymentCost} onClick={onUpgradeDatabase}>{t('advanced.upgradeDatabase')} · {databaseUpgradeConfig.deploymentCost}</button>}
        </>
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
