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

const formatStatus = (status: string) =>
  `${status.charAt(0).toUpperCase()}${status.slice(1)}`

export function ResourceDetailsPanel({
  node,
  simulation,
  onClose,
  onStartUpgrade,
}: ResourceDetailsPanelProps) {
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
          <p className="resource-panel__eyebrow">Resource details</p>
          <h2>{node.data.label}</h2>
        </div>
        <button
          type="button"
          className="resource-panel__close"
          onClick={onClose}
          aria-label="Close resource details"
        >
          ×
        </button>
      </div>

      {isAppServer && appServer ? (
        <dl className="resource-panel__details">
          <div>
            <dt>Resource name</dt>
            <dd>{appServer.resourceName}</dd>
          </div>
          <div>
            <dt>Generic type</dt>
            <dd>{appServerResourceConfig.type}</dd>
          </div>
          <div>
            <dt>AWS reference</dt>
            <dd>{appServerResourceConfig.awsReference}</dd>
          </div>
          <div>
            <dt>Current tier</dt>
            <dd>{appServer.tierName}</dd>
          </div>
          <div>
            <dt>Request capacity</dt>
            <dd>{appServer.requestCapacity.toFixed(1)} req/s</dd>
          </div>
          <div>
            <dt>Current traffic</dt>
            <dd>{appServer.requestsPerSecond.toFixed(1)} req/s</dd>
          </div>
          <div>
            <dt>CPU usage</dt>
            <dd>{appServer.cpuUsage.toFixed(1)}%</dd>
          </div>
          <div>
            <dt>Memory usage</dt>
            <dd>{appServer.memoryUsage.toFixed(1)}%</dd>
          </div>
          <div>
            <dt>Latency</dt>
            <dd>{appServer.latencyMs} ms</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd data-status={appServer.status}>
              {formatStatus(appServer.status)}
            </dd>
          </div>
          <div>
            <dt>Cost / {appServerResourceConfig.costPeriodSeconds} sec</dt>
            <dd>{appServer.costPerPeriod} credits</dd>
          </div>
        </dl>
      ) : isLoadBalancer ? (
        <dl className="resource-panel__details">
          <div>
            <dt>Resource name</dt>
            <dd>{loadBalancerResourceConfig.name}</dd>
          </div>
          <div>
            <dt>Generic type</dt>
            <dd>{loadBalancerResourceConfig.type}</dd>
          </div>
          <div>
            <dt>AWS reference</dt>
            <dd>{loadBalancerResourceConfig.awsReference}</dd>
          </div>
          <div>
            <dt>Distribution</dt>
            <dd>Even split</dd>
          </div>
          <div>
            <dt>Connected servers</dt>
            <dd>{simulation.appServers.length}</dd>
          </div>
          <div>
            <dt>Cost / {appServerResourceConfig.costPeriodSeconds} sec</dt>
            <dd>{loadBalancerResourceConfig.costPerPeriod} credits</dd>
          </div>
        </dl>
      ) : (
        <div className="resource-panel__placeholder">
          <p>{placeholderTypes[node.data.kind]}</p>
          <span>More resource details will be added in a later step.</span>
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
              <p>{deploymentSecondsRemaining} game seconds remaining</p>
            </>
          ) : appServer.tierId ===
            serverUpgradeConfig.targetTierId ? (
            <p className="resource-panel__upgrade-complete">
              Medium Server is active.
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
              <p>Available balance: {simulation.balance} credits</p>
              <button
                type="button"
                className="resource-panel__upgrade-button"
                onClick={() => onStartUpgrade(node.id)}
                disabled={!canAffordUpgrade || anotherUpgradeIsDeploying}
              >
                {anotherUpgradeIsDeploying
                  ? 'Another upgrade is deploying'
                  : canAffordUpgrade
                    ? 'Upgrade to Medium Server'
                    : 'Insufficient balance'}
              </button>
            </>
          )}
        </div>
      )}
    </aside>
  )
}
