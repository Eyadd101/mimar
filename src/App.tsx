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
import { EventTimelinePanel } from './components/EventTimelinePanel'
import { HintPanel } from './components/HintPanel'
import { InfrastructureActionsPanel } from './components/InfrastructureActionsPanel'
import { InfrastructureNode } from './components/InfrastructureNode'
import { ResourceDetailsPanel } from './components/ResourceDetailsPanel'
import { RequestFlowEdge } from './components/RequestFlowEdge'
import { SimulationSpeedControls } from './components/SimulationSpeedControls'
import { StageObjectivePanel } from './components/StageObjectivePanel'
import { StageBriefingOverlay } from './components/StageBriefingOverlay'
import { TrafficHud } from './components/TrafficHud'
import {
  createInfrastructureEdges,
  createInfrastructureNodes,
  type InfrastructureFlowNode,
} from './data/infrastructure'
import { getConnectionRequestRate } from './data/requestFlow'
import { useGameSimulation } from './hooks/useGameSimulation'
import { appServerResourceConfig } from './simulation/config'
import { getContextualHint } from './simulation/hintSimulation'
import './App.css'

const nodeTypes = { infrastructure: InfrastructureNode }
const edgeTypes = { requestFlow: RequestFlowEdge }
const fitViewOptions = { padding: 0.25, maxZoom: 1.1 }

function App() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const {
    simulation: traffic,
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
    gameSpeed,
    setGameSpeed,
    startServerUpgrade,
    startLoadBalancerDeployment,
    startAdditionalAppServerDeployment,
    restartStage,
    continueToNextStage,
    beginStage,
    updateResourcePosition,
  } = useGameSimulation()
  const campaignEdges = useMemo(
    () => createInfrastructureEdges(campaign.infrastructure),
    [campaign.infrastructure],
  )
  const nodes = useMemo(
    () => createInfrastructureNodes(campaign.infrastructure),
    [campaign.infrastructure],
  )
  const displayNodes = useMemo(
    () =>
      nodes.map((node) => ({
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
      })),
    [nodes, selectedNodeId, traffic.appServers],
  )
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
          isPaused: gameSpeed === 0,
        },
      })),
    [
      campaign.infrastructure.resources,
      campaignEdges,
      gameSpeed,
      traffic.appServers,
      traffic.requestsPerSecond,
    ],
  )
  const handleRestartStage = () => {
    setSelectedNodeId(null)
    setHint(null)
    restartStage()
  }
  const handleNodesChange = (
    changes: NodeChange<InfrastructureFlowNode>[],
  ) => {
    for (const change of changes) {
      if (change.type === 'position' && change.position) {
        updateResourcePosition(change.id, change.position)
      }
    }
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
          {selectedNode && (
            <Panel position="top-right" className="resource-panel-position">
              <ResourceDetailsPanel
                node={selectedNode}
                simulation={traffic}
                onClose={() => setSelectedNodeId(null)}
                onStartUpgrade={startServerUpgrade}
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
                onDeployLoadBalancer={startLoadBalancerDeployment}
                onDeployAppServer={startAdditionalAppServerDeployment}
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
        onContinueToNextStage={() => {
          setSelectedNodeId(null)
          setHint(null)
          continueToNextStage()
        }}
      />
      {isStageBriefingOpen && (
        <StageBriefingOverlay
          key={stage.id}
          stage={stage}
          onBeginStage={beginStage}
        />
      )}
    </main>
  )
}

export default App
