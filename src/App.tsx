import { useMemo, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  Panel,
  ReactFlow,
  type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { GameStateOverlay } from './components/GameStateOverlay'
import { GuidedBuildPanel } from './components/GuidedBuildPanel'
import { CampaignStartOverlay } from './components/CampaignStartOverlay'
import { ActionConfirmationDialog } from './components/ActionConfirmationDialog'
import { EventTimelinePanel } from './components/EventTimelinePanel'
import { HintPanel } from './components/HintPanel'
import { InfrastructureActionsPanel } from './components/InfrastructureActionsPanel'
import { InfrastructureNode } from './components/InfrastructureNode'
import { ResourceDetailsPanel } from './components/ResourceDetailsPanel'
import { RequestFlowEdge } from './components/RequestFlowEdge'
import { ResourcePalette } from './components/ResourcePalette'
import { SimulationSpeedControls } from './components/SimulationSpeedControls'
import { StageObjectivePanel } from './components/StageObjectivePanel'
import { StageBriefingOverlay } from './components/StageBriefingOverlay'
import { TrafficHud } from './components/TrafficHud'
import {
  createInfrastructureEdges,
  createInfrastructureNodes,
  applyInfrastructureNodeChanges,
  carryInfrastructureNodeRuntime,
  type InfrastructureFlowNode,
  type InfrastructureNodeRuntime,
} from './data/infrastructure'
import { getConnectionRequestRate } from './data/requestFlow'
import { useGameSimulation } from './hooks/useGameSimulation'
import {
  additionalAppServerConfig,
  appServerResourceConfig,
  loadBalancerResourceConfig,
  serverUpgradeConfig,
} from './simulation/config'
import { getContextualHint } from './simulation/hintSimulation'
import { getStageOneBuildStep } from './simulation/stageOneOnboardingSimulation'
import './App.css'

const nodeTypes = { infrastructure: InfrastructureNode }
const edgeTypes = { requestFlow: RequestFlowEdge }
const fitViewOptions = { padding: 0.25, maxZoom: 1.1 }

type PendingInfrastructureAction =
  | { kind: 'server-upgrade'; resourceId: string }
  | { kind: 'load-balancer' }
  | { kind: 'app-server' }

function App() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [pendingAction, setPendingAction] =
    useState<PendingInfrastructureAction | null>(null)
  const {
    simulation: traffic,
    campaignStarted,
    campaignSaveResult,
    campaign,
    gameStatus,
    gameOverReason,
    stage,
    objectiveProgress,
    stageRating,
    trafficEvents,
    infrastructureDeployment,
    stageStatistics,
    hasNextStage,
    isStageBriefingOpen,
    serviceStarted,
    isSimulationRunning,
    gameSpeed,
    setGameSpeed,
    startServerUpgrade,
    startLoadBalancerDeployment,
    startAdditionalAppServerDeployment,
    restartStage,
    restartCampaign,
    startNewCampaign,
    continueSavedCampaign,
    continueToNextStage,
    beginStage,
    updateResourcePositions,
    addResource,
  } = useGameSimulation()
  const [flowNodeRuntime, setFlowNodeRuntime] =
    useState<InfrastructureNodeRuntime>({})
  const campaignEdges = useMemo(
    () => createInfrastructureEdges(campaign.infrastructure),
    [campaign.infrastructure],
  )
  const nodes = useMemo(
    () => createInfrastructureNodes(campaign.infrastructure),
    [campaign.infrastructure],
  )
  const stageOneBuildStep = useMemo(
    () => getStageOneBuildStep(campaign.infrastructure),
    [campaign.infrastructure],
  )
  const displayNodes = useMemo(() => {
    const presentedNodes = nodes.map((node) => ({
      ...node,
      selected: node.id === selectedNodeId,
      data: {
        ...node.data,
        appServerMetrics:
          node.data.kind === 'server'
            ? traffic.appServers.find(
                (server) => server.resourceId === node.id,
              )
            : undefined,
      },
    }))

    return carryInfrastructureNodeRuntime(
      presentedNodes,
      flowNodeRuntime,
    )
  }, [flowNodeRuntime, nodes, selectedNodeId, traffic.appServers])
  const selectedNode = displayNodes.find((node) => node.id === selectedNodeId)
  const displayEdges = useMemo(
    () =>
      campaignEdges.map((edge) => ({
        ...edge,
        type: 'requestFlow',
        data: {
          requestsPerSecond: getConnectionRequestRate(
            edge.source,
            edge.target,
            campaign.infrastructure.resources,
            traffic.appServers,
            traffic.requestsPerSecond,
          ),
          isPaused: !isSimulationRunning,
        },
      })),
    [
      campaign.infrastructure.resources,
      campaignEdges,
      isSimulationRunning,
      traffic.appServers,
      traffic.requestsPerSecond,
    ],
  )
  const handleRestartStage = () => {
    setSelectedNodeId(null)
    setHint(null)
    setPendingAction(null)
    restartStage()
  }
  const handleRestartCampaign = () => {
    setSelectedNodeId(null)
    setHint(null)
    setPendingAction(null)
    restartCampaign()
  }
  const confirmPendingAction = () => {
    if (pendingAction?.kind === 'server-upgrade') {
      startServerUpgrade(pendingAction.resourceId)
    } else if (pendingAction?.kind === 'load-balancer') {
      startLoadBalancerDeployment()
    } else if (pendingAction?.kind === 'app-server') {
      startAdditionalAppServerDeployment()
    }

    setPendingAction(null)
  }
  const pendingActionDetails = pendingAction
    ? pendingAction.kind === 'server-upgrade'
      ? {
          title: 'Upgrade to Medium Server',
          description: 'Increase the selected server request capacity.',
          cost: serverUpgradeConfig.upgradeCost,
          durationSeconds: serverUpgradeConfig.deploymentDurationSeconds,
          confirmLabel: 'Start Upgrade',
        }
      : pendingAction.kind === 'load-balancer'
        ? {
            title: 'Deploy Load Balancer',
            description: 'Add traffic distribution to the infrastructure.',
            cost: loadBalancerResourceConfig.deploymentCost,
            durationSeconds:
              loadBalancerResourceConfig.deploymentDurationSeconds,
            confirmLabel: 'Start Deployment',
          }
        : {
            title: `Deploy ${additionalAppServerConfig.name}`,
            description: 'Add application capacity behind the Load Balancer.',
            cost: additionalAppServerConfig.deploymentCost,
            durationSeconds:
              additionalAppServerConfig.deploymentDurationSeconds,
            confirmLabel: 'Start Deployment',
          }
    : null
  const handleNodesChange = (
    changes: NodeChange<InfrastructureFlowNode>[],
  ) => {
    const result = applyInfrastructureNodeChanges(changes, displayNodes)

    setFlowNodeRuntime(result.runtime)
    updateResourcePositions(result.positionUpdates)
  }

  return (
    <main className="game">
      <header className="game-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17H6a4 4 0 0 1-.7-7.94 6.5 6.5 0 0 1 12.3-1.4A4.75 4.75 0 0 1 18 17h-1" />
              <path d="M9 14l3-3 3 3M12 11v10" />
            </svg>
          </span>
          <span className="brand-name">Cloud Game</span>
          <span className="brand-divider" aria-hidden="true" />
          <span className="header-caption">Infrastructure playground</span>
        </div>
        <TrafficHud
          activeUsers={traffic.activeUsers}
          requestsPerSecond={traffic.requestsPerSecond}
          latencyMs={traffic.applicationLatencyMs}
          customerSatisfaction={traffic.customerSatisfaction}
          satisfactionReason={traffic.satisfactionReason}
          businessConsequenceReason={traffic.businessConsequenceReason}
          balance={traffic.balance}
          revenuePerPeriod={traffic.revenuePerPeriod}
          infrastructureCost={traffic.infrastructureCostPerPeriod}
          netCashFlowPerPeriod={traffic.netCashFlowPerPeriod}
          costPeriodSeconds={appServerResourceConfig.costPeriodSeconds}
          gameTimeSeconds={traffic.gameTimeSeconds}
        />
        <span className="prototype-badge">Prototype <span>01</span></span>
      </header>

      <section className="canvas" aria-label="Infrastructure canvas">
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          onNodesChange={handleNodesChange}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          colorMode="dark"
          fitView
          fitViewOptions={fitViewOptions}
          minZoom={0.25}
          maxZoom={1.6}
          nodesConnectable={false}
          edgesReconnectable={false}
          edgesFocusable={false}
          deleteKeyCode={null}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#293532" />
          <Panel position="top-left" className="canvas-heading">
            <p className="eyebrow">Campaign / Stage {stage.sequence}</p>
            <h1>{stage.name}</h1>
            <p>
              {campaign.infrastructure.resources.length} resources ·{' '}
              {campaign.infrastructure.connections.length} connections
            </p>
          </Panel>
          <Panel position="top-left" className="stage-objectives-position">
            <StageObjectivePanel stage={stage} progress={objectiveProgress} />
          </Panel>
          {stage.sequence === 1 && !serviceStarted && (
            <Panel position="bottom-left" className="resource-palette-position">
              <ResourcePalette
                resources={campaign.infrastructure.resources}
                onAddResource={addResource}
                currentStep={stageOneBuildStep}
              />
            </Panel>
          )}
          {stage.sequence === 1 && !serviceStarted && (
            <Panel position="bottom-center" className="guided-build-position">
              <GuidedBuildPanel step={stageOneBuildStep} />
            </Panel>
          )}
          {selectedNode && (
            <Panel position="top-right" className="resource-panel-position">
              <ResourceDetailsPanel
                node={selectedNode}
                simulation={traffic}
                onClose={() => setSelectedNodeId(null)}
                onStartUpgrade={(resourceId) =>
                  setPendingAction({ kind: 'server-upgrade', resourceId })
                }
              />
            </Panel>
          )}
          {stage.trafficEvents.length > 0 && (
            <Panel
              position="bottom-right"
              className={`event-timeline-position${
                campaign.unlockedResourceTypes.includes('load-balancer')
                  ? ' event-timeline-position--with-actions'
                  : ''
              }`}
            >
              <EventTimelinePanel
                events={stage.trafficEvents}
                runtime={trafficEvents}
                gameTimeSeconds={traffic.gameTimeSeconds}
              />
            </Panel>
          )}
          {campaign.unlockedResourceTypes.includes('load-balancer') && (
            <Panel
              position="bottom-right"
              className="infrastructure-actions-position"
            >
              <InfrastructureActionsPanel
                campaign={campaign}
                simulation={traffic}
                deployment={infrastructureDeployment}
                onDeployLoadBalancer={() =>
                  setPendingAction({ kind: 'load-balancer' })
                }
                onDeployAppServer={() =>
                  setPendingAction({ kind: 'app-server' })
                }
              />
            </Panel>
          )}
          <Controls showInteractive={false} orientation="horizontal" fitViewOptions={fitViewOptions} />
        </ReactFlow>
      </section>

      <footer className="game-footer">
        <p className="business-loop">
          <span className="hint-dot" aria-hidden="true" />
          Performance <span>→</span> Satisfaction <span>→</span> Revenue{' '}
          <span>→</span> Balance
        </p>
        <SimulationSpeedControls
          gameSpeed={gameSpeed}
          onSpeedChange={setGameSpeed}
        />
        <div className="game-footer__actions">
          <HintPanel
            hint={hint}
            onRequestHint={() => setHint(getContextualHint(traffic, stage))}
            onDismissHint={() => setHint(null)}
          />
          <p className="graph-count">
            {campaign.infrastructure.resources.length} nodes <span>/</span>{' '}
            {campaign.infrastructure.connections.length} connections
          </p>
        </div>
      </footer>
      <GameStateOverlay
        status={gameStatus}
        reason={gameOverReason}
        simulation={traffic}
        stage={stage}
        stageRating={stageRating}
        stageStatistics={stageStatistics}
        campaign={campaign}
        hasNextStage={hasNextStage}
        onRestartStage={handleRestartStage}
        onRestartCampaign={handleRestartCampaign}
        onContinueToNextStage={() => {
          setSelectedNodeId(null)
          setHint(null)
          setPendingAction(null)
          continueToNextStage()
        }}
      />
      {pendingActionDetails && gameStatus === 'playing' && (
        <ActionConfirmationDialog
          {...pendingActionDetails}
          onConfirm={confirmPendingAction}
          onCancel={() => setPendingAction(null)}
        />
      )}
      {isStageBriefingOpen && (
        <StageBriefingOverlay
          key={stage.id}
          stage={stage}
          onBeginStage={beginStage}
        />
      )}
      {!campaignStarted && (
        <CampaignStartOverlay
          saveResult={campaignSaveResult}
          onNewCampaign={startNewCampaign}
          onContinueCampaign={continueSavedCampaign}
        />
      )}
    </main>
  )
}

export default App
