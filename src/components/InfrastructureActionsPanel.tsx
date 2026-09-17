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
  const hasLoadBalancer = campaign.infrastructure.resources.some(
    (resource) => resource.type === 'load-balancer',
  )
  const hasAdditionalServer = campaign.infrastructure.resources.some(
    (resource) => resource.id === additionalAppServerConfig.id,
  )

  return (
    <aside className="infrastructure-actions nodrag nopan" aria-label="Infrastructure actions">
      <div className="infrastructure-actions__heading">
        <span>Build</span>
        <strong>Horizontal scaling</strong>
      </div>

      {deployment ? (
        <DeploymentStatus
          deployment={deployment}
          gameTimeSeconds={simulation.gameTimeSeconds}
        />
      ) : hasLoadBalancer && hasAdditionalServer ? (
        <p className="infrastructure-actions__ready">
          Load-balanced application servers are active.
        </p>
      ) : (
        <div className="infrastructure-actions__options">
          {!hasLoadBalancer && (
            <BuildOption
              title={loadBalancerResourceConfig.name}
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
              title={additionalAppServerConfig.name}
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
                hasLoadBalancer ? undefined : 'Deploy a Load Balancer first'
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
  title: string
  awsReference: string
  cost: number
  duration: number
  disabled: boolean
  disabledReason?: string
  onDeploy: () => void
}

function BuildOption({
  title,
  awsReference,
  cost,
  duration,
  disabled,
  disabledReason,
  onDeploy,
}: BuildOptionProps) {
  return (
    <div className="build-option">
      <div>
        <strong>{title}</strong>
        <span>{awsReference}</span>
      </div>
      <p>{cost} credits · {duration} game seconds</p>
      <button type="button" disabled={disabled} onClick={onDeploy}>
        {disabledReason ?? (disabled ? 'Insufficient balance' : 'Deploy')}
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
  const progress = calculateInfrastructureDeploymentProgress(
    deployment,
    gameTimeSeconds,
  )
  const percent = Math.round(progress * 100)
  const remaining = Math.max(
    deployment.completesAtGameTimeSeconds - gameTimeSeconds,
    0,
  )
  const resourceName =
    deployment.kind === 'load-balancer'
      ? loadBalancerResourceConfig.name
      : additionalAppServerConfig.name

  return (
    <div className="infrastructure-actions__deployment">
      <div>
        <span>Deploying {resourceName}</span>
        <strong>{percent}%</strong>
      </div>
      <div
        className="deployment-progress"
        role="progressbar"
        aria-label={`${resourceName} deployment`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
      <p>{remaining} game seconds remaining</p>
    </div>
  )
}
