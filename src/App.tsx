import { useMemo, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  Panel,
  ReactFlow,
  useNodesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { GameStateOverlay } from './components/GameStateOverlay'
import { EventTimelinePanel } from './components/EventTimelinePanel'
import { HintPanel } from './components/HintPanel'
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
} from './data/infrastructure'
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
    stageStartCampaign,
    gameStatus,
    gameOverReason,
    stage,
    objectiveProgress,
    stageRating,
    trafficEvents,
    hasNextStage,
    isStageBriefingOpen,
    gameSpeed,
    setGameSpeed,
    startServerUpgrade,
    restartStage,
    continueToNextStage,
    beginStage,
    updateResourcePosition,
  } = useGameSimulation()
  const campaignEdges = useMemo(
    () => createInfrastructureEdges(campaign.infrastructure),
    [campaign.infrastructure],
  )
  const [nodes, setNodes, onNodesChange] = useNodesState(
    createInfrastructureNodes(campaign.infrastructure),
  )
  const displayNodes = useMemo(
    () =>
      nodes.map((node) =>
        node.id === 'server'
          ? {
              ...node,
              data: {
                ...node.data,
                appServerMetrics: traffic.appServer,
              },
            }
          : node,
      ),
    [nodes, traffic.appServer],
  )
  const selectedNode = displayNodes.find((node) => node.id === selectedNodeId)
  const displayEdges = useMemo(
    () =>
      campaignEdges.map((edge) => ({
        ...edge,
        type: 'requestFlow',
        data: {
          requestsPerSecond: traffic.requestsPerSecond,
          isPaused: gameSpeed === 0,
        },
      })),
    [campaignEdges, gameSpeed, traffic.requestsPerSecond],
  )
  const handleRestartStage = () => {
    setSelectedNodeId(null)
    setHint(null)
    setNodes((currentNodes) =>
      currentNodes.map((node) => ({
        ...node,
        position:
          stageStartCampaign.infrastructure.resources.find(
            (resource) => resource.id === node.id,
          )?.position ?? node.position,
      })),
    )
    restartStage()
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
          latencyMs={traffic.appServer.latencyMs}
          customerSatisfaction={traffic.customerSatisfaction}
          satisfactionReason={traffic.satisfactionReason}
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
          onNodesChange={onNodesChange}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          onNodeDragStop={(_, node) =>
            updateResourcePosition(node.id, node.position)
          }
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
            <p className="eyebrow">Workspace / 001</p>
            <h1>Your first infrastructure.</h1>
            <p>Three nodes. One simple connection path.</p>
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
            <Panel position="bottom-right" className="event-timeline-position">
              <EventTimelinePanel
                events={stage.trafficEvents}
                runtime={trafficEvents}
                gameTimeSeconds={traffic.gameTimeSeconds}
              />
            </Panel>
          )}
          <Controls showInteractive={false} orientation="horizontal" fitViewOptions={fitViewOptions} />
        </ReactFlow>
      </section>

      <footer className="game-footer">
        <p><span className="hint-dot" aria-hidden="true" />Drag nodes to rearrange<span className="secondary-hint"> · Scroll to zoom · Drag canvas to pan</span></p>
        <SimulationSpeedControls
          gameSpeed={gameSpeed}
          onSpeedChange={setGameSpeed}
        />
        <div className="game-footer__actions">
          <HintPanel
            hint={hint}
            onRequestHint={() => setHint(getContextualHint(traffic))}
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
        stageName={stage.name}
        stageRating={stageRating}
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
