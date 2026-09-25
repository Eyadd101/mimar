import { getAdvancedNodeSummary } from './data/advancedNodePresentation'
import { ExpansionAlerts } from './components/ExpansionAlerts'
import { ReliabilityTimeline } from './components/ReliabilityTimeline'
import { advancedResourceConfigs, type AdvancedResourceType, databaseUpgradeConfig, databaseDownsizeConfig, backupConfig } from './simulation/expansionConfig'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  Panel,
  ReactFlow,
  type Connection,
  type Edge,
  type NodeChange,
  type ReactFlowInstance,
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
import { LanguageSelector } from './components/LanguageSelector'
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
  infrastructureHandleInteraction,
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
import { getMostLoadedAppServer } from './simulation/trafficSimulation'
import { evaluateStageLearningSteps } from './simulation/stageLearningSimulation'
import {
  validateStageOneConnection,
  validateCampaignConnection,
  type ConnectionExplanation,
} from './simulation/connectionValidation'
import { getStageOneBuildStep } from './simulation/stageOneOnboardingSimulation'
import './App.css'
import { useLanguage } from './i18n/useLanguage'
import type {
  TranslationKey,
  TranslationMessage,
} from './i18n/translations'
import {
  getCampaignConnectionHandles,
  type CampaignResourceType,
} from './simulation/campaignSimulation'
import { useStableScrollPosition } from './hooks/useStableScrollPosition'

const nodeTypes = { infrastructure: InfrastructureNode }
const edgeTypes = { requestFlow: RequestFlowEdge }
const fitViewOptions = {
  padding: { top: 0.28, right: 0.42, bottom: 0.28, left: 0.42 },
  maxZoom: 0.9,
}

const connectionResourceLabelKeys: Record<
  CampaignResourceType,
  TranslationKey
> = {
  users: 'resource.users',
  'app-server': 'resource.appServer',
  database: 'resource.database',
  'load-balancer': 'resource.loadBalancer',
  cache: 'advanced.cache',
  queue: 'advanced.queue',
  worker: 'advanced.worker',
  'object-storage': 'advanced.storage',
}

type PendingInfrastructureAction =
  | { kind: 'server-upgrade'; resourceId: string }
  | { kind: 'load-balancer' }
  | { kind: 'app-server' }
  | { kind: 'database-upgrade' }
  | { kind: 'database-downsize' }
  | { kind: 'database-restore' }
  | { kind: 'advanced'; resourceType: AdvancedResourceType }

function App() {
  const { direction, t } = useLanguage()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [hint, setHint] = useState<TranslationMessage | null>(null)
  const [pendingAction, setPendingAction] =
    useState<PendingInfrastructureAction | null>(null)
  const [connectionFeedback, setConnectionFeedback] = useState<
    (ConnectionExplanation & { valid: boolean }) | null
  >(null)
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
    startDatabaseUpgrade,
    startDatabaseDownsize,
    startAdvancedDeployment,
    configureSecurity,
    configureBackups,
    startDatabaseRestore,
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
    connectResources,
    disconnectResources,
    reconnectResource,
    placeResource,
  } = useGameSimulation()
  const [flowNodeRuntime, setFlowNodeRuntime] =
    useState<InfrastructureNodeRuntime>({})
  const [operationsScrollRef, handleOperationsScroll] =
    useStableScrollPosition<HTMLDivElement>(
      `operations:${stage.id}`,
    )
  const flowInstanceRef = useRef<
    Pick<ReactFlowInstance<InfrastructureFlowNode>, 'fitView'> | null
  >(null)
  const campaignEdges = useMemo(
    () => createInfrastructureEdges(campaign.infrastructure),
    [campaign.infrastructure],
  )
  const nodes = useMemo(
    () => createInfrastructureNodes(campaign.infrastructure),
    [campaign.infrastructure],
  )
  const resourceIdentity = campaign.infrastructure.resources
    .map((resource) => resource.id)
    .join('|')
  const previousResourceIdentityRef = useRef(resourceIdentity)

  useEffect(() => {
    if (previousResourceIdentityRef.current === resourceIdentity) return
    previousResourceIdentityRef.current = resourceIdentity

    const frame = window.requestAnimationFrame(() => {
      void flowInstanceRef.current?.fitView({
        ...fitViewOptions,
        duration: 250,
      })
    })

    return () => window.cancelAnimationFrame(frame)
  }, [resourceIdentity])
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
        canConnect: gameStatus === 'playing' && (stage.sequence > 1 || !serviceStarted),
        isAvailable: !traffic.failedResourceIds.includes(node.id) && !(node.data.kind === 'database' && traffic.databaseData.dataLost),
        metricSummary: getAdvancedNodeSummary(node.data.kind, traffic),
        databaseMetrics: node.data.kind === 'database' ? traffic.database : undefined,
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
  }, [
    flowNodeRuntime,
    gameStatus,
    nodes,
    selectedNodeId,
    serviceStarted,
    stage.sequence,
    traffic,
  ])
  const selectedNode = displayNodes.find((node) => node.id === selectedNodeId)
  const selectedConnection = campaign.infrastructure.connections.find(
    (connection) => connection.id === selectedEdgeId,
  )
  const mostLoadedAppServer = getMostLoadedAppServer(traffic)
  const learningProgress = useMemo(
    () =>
      evaluateStageLearningSteps(stage, {
        infrastructure: campaign.infrastructure,
        serviceStarted,
        gameTimeSeconds: traffic.gameTimeSeconds,
        status: gameStatus,
      }),
    [
      campaign.infrastructure,
      gameStatus,
      serviceStarted,
      stage,
      traffic.gameTimeSeconds,
    ],
  )
  const displayEdges = useMemo(
    () =>
      campaignEdges.map((edge) => ({
        ...edge,
        selected: edge.id === selectedEdgeId,
        type: 'requestFlow',
        data: {
          requestsPerSecond: getConnectionRequestRate(
            edge.source,
            edge.target,
            campaign.infrastructure.resources,
            traffic.appServers,
            traffic.requestsPerSecond,
            traffic,
          ),
          isPaused: !isSimulationRunning,
        },
      })),
    [
      campaign.infrastructure.resources,
      campaignEdges,
      isSimulationRunning,
      selectedEdgeId,
      traffic,
    ],
  )
  const handleRestartStage = () => {
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
    setHint(null)
    setPendingAction(null)
    setConnectionFeedback(null)
    setFlowNodeRuntime({})
    restartStage()
  }
  const handleRestartCampaign = () => {
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
    setHint(null)
    setPendingAction(null)
    setConnectionFeedback(null)
    setFlowNodeRuntime({})
    restartCampaign()
  }
  const confirmPendingAction = () => {
    if (pendingAction?.kind === 'database-downsize') {
      startDatabaseDownsize()
    } else if (pendingAction?.kind === 'database-restore') {
      startDatabaseRestore()
    } else if (pendingAction?.kind === 'advanced') {
      startAdvancedDeployment(pendingAction.resourceType)
    } else if (pendingAction?.kind === 'database-upgrade') {
      startDatabaseUpgrade()
    } else if (pendingAction?.kind === 'server-upgrade') {
      startServerUpgrade(pendingAction.resourceId)
    } else if (pendingAction?.kind === 'load-balancer') {
      startLoadBalancerDeployment()
    } else if (pendingAction?.kind === 'app-server') {
      startAdditionalAppServerDeployment()
    }

    setPendingAction(null)
  }
  const pendingActionDetails = pendingAction
    ? pendingAction.kind === 'database-downsize' ? { title: t('advanced.downsize'), description: t('advanced.downsizeWarning'), cost: databaseDownsizeConfig.deploymentCost, durationSeconds: databaseDownsizeConfig.deploymentDurationSeconds, confirmLabel: t('action.startDeployment') }
      : pendingAction.kind === 'database-restore' ? { title: t('advanced.restore'), description: t('advanced.backupPurpose'), cost: backupConfig.restoreCost, durationSeconds: backupConfig.restoreDurationSeconds, confirmLabel: t('advanced.restore') }
      : pendingAction.kind === 'advanced' ? { title: t('action.prepareResource', { resource: t(advancedResourceConfigs[pendingAction.resourceType].labelKey) }), description: t(advancedResourceConfigs[pendingAction.resourceType].purposeKey), cost: advancedResourceConfigs[pendingAction.resourceType].deploymentCost, durationSeconds: advancedResourceConfigs[pendingAction.resourceType].deploymentDurationSeconds, confirmLabel: t('action.startPreparation') }
      : pendingAction.kind === 'database-upgrade'
      ? { title: t('advanced.upgradeDatabase'), description: t('advanced.databasePurpose'), cost: databaseUpgradeConfig.deploymentCost, durationSeconds: databaseUpgradeConfig.deploymentDurationSeconds, confirmLabel: t('action.startUpgrade') }
      : pendingAction.kind === 'server-upgrade'
      ? {
          title: t('resource.upgradeMedium'),
          description: t('action.upgradeDescription'),
          cost: serverUpgradeConfig.upgradeCost,
          durationSeconds: serverUpgradeConfig.deploymentDurationSeconds,
          confirmLabel: t('action.startUpgrade'),
        }
      : pendingAction.kind === 'load-balancer'
        ? {
            title: t('action.prepareResource', { resource: t('resource.loadBalancer') }),
            description: t('action.loadBalancerDescription'),
            cost: loadBalancerResourceConfig.deploymentCost,
            durationSeconds:
              loadBalancerResourceConfig.deploymentDurationSeconds,
            confirmLabel: t('action.startPreparation'),
          }
        : {
            title: t('action.prepareResource', { resource: t('resource.appServerB') }),
            description: t('action.appServerDescription'),
            cost: additionalAppServerConfig.deploymentCost,
            durationSeconds:
              additionalAppServerConfig.deploymentDurationSeconds,
            confirmLabel: t('action.startPreparation'),
          }
    : null
  const handleNodesChange = (
    changes: NodeChange<InfrastructureFlowNode>[],
  ) => {
    const result = applyInfrastructureNodeChanges(changes, displayNodes)

    setFlowNodeRuntime(result.runtime)
    updateResourcePositions(result.positionUpdates)
  }
  const handleConnect = (connection: Connection) => {
    if (!connection.source || !connection.target) {
      return
    }

    const result = (stage.sequence === 1 ? validateStageOneConnection : validateCampaignConnection)(
      campaign.infrastructure,
      connection.source,
      connection.target,
    )
    setConnectionFeedback({
      ...result.explanation,
      valid: result.valid,
    })

    if (result.valid) {
      connectResources(
        connection.source,
        connection.target,
        getCampaignConnectionHandles(
          connection.sourceHandle,
          connection.targetHandle,
        ),
      )
    }
  }
  const handleEdgesDelete = (edges: Edge[]) => {
    if (stage.sequence === 1 || edges.length === 0) return
    disconnectResources(edges.map((edge) => edge.id))
    setSelectedEdgeId(null)
    setConnectionFeedback({ key: 'connection.removed', valid: true })
  }
  const handleReconnect = (oldEdge: Edge, connection: Connection) => {
    if (!connection.source || !connection.target || stage.sequence === 1) return
    const infrastructureWithoutOldEdge = {
      ...campaign.infrastructure,
      connections: campaign.infrastructure.connections.filter(
        (item) => item.id !== oldEdge.id,
      ),
    }
    const result = validateCampaignConnection(
      infrastructureWithoutOldEdge,
      connection.source,
      connection.target,
    )
    setConnectionFeedback({ ...result.explanation, valid: result.valid })
    if (result.valid) {
      reconnectResource(
        oldEdge.id,
        connection.source,
        connection.target,
        getCampaignConnectionHandles(
          connection.sourceHandle,
          connection.targetHandle,
        ),
      )
      setSelectedEdgeId(null)
    }
  }

  return (
    <main className="game" dir="ltr" data-language={direction === 'rtl' ? 'ar' : 'en'}>
      <header className="game-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17H6a4 4 0 0 1-.7-7.94 6.5 6.5 0 0 1 12.3-1.4A4.75 4.75 0 0 1 18 17h-1" />
              <path d="M9 14l3-3 3 3M12 11v10" />
            </svg>
          </span>
          <span className="brand-name">{t('app.brand')}</span>
          <span className="brand-divider" aria-hidden="true" />
          <span className="header-caption">{t('app.caption')}</span>
        </div>
        <TrafficHud
          activeUsers={traffic.activeUsers}
          requestsPerSecond={traffic.requestsPerSecond}
          requestsPerUserPerSecond={stage.trafficProfile.requestsPerUserPerSecond}
          cpuUsage={mostLoadedAppServer?.cpuUsage ?? 0}
          requestCapacity={mostLoadedAppServer?.requestCapacity ?? 0}
          latencyMs={traffic.applicationLatencyMs}
          customerSatisfaction={traffic.customerSatisfaction}
          badLatencyDurationSeconds={traffic.badLatencyDurationSeconds}
          satisfactionReason={traffic.satisfactionReason}
          businessConsequenceReason={traffic.businessConsequenceReason}
          balance={traffic.balance}
          revenuePerPeriod={traffic.revenuePerPeriod}
          infrastructureCost={traffic.infrastructureCostPerPeriod}
          netCashFlowPerPeriod={traffic.netCashFlowPerPeriod}
          incidentCosts={traffic.totalFinancialPenalties}
          costPeriodSeconds={appServerResourceConfig.costPeriodSeconds}
          gameTimeSeconds={traffic.gameTimeSeconds}
          serviceStarted={serviceStarted}
          isPaused={!isSimulationRunning}
          isServiceOverloaded={traffic.isServiceOverloaded}
        />
        <div className="header-tools">
          <LanguageSelector />
          <span className="prototype-badge">{t('app.prototype')} <span>01</span></span>
        </div>
      </header>

      <section className="canvas" aria-label={t('app.infrastructureCanvas')}>
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          onNodesChange={handleNodesChange}
          onConnect={handleConnect}
          onEdgesDelete={handleEdgesDelete}
          onReconnect={handleReconnect}
          onNodeClick={(_, node) => {
            setSelectedNodeId(node.id)
            setSelectedEdgeId(null)
          }}
          onEdgeClick={(_, edge) => {
            setSelectedNodeId(null)
            setSelectedEdgeId(edge.id)
          }}
          onPaneClick={() => {
            setSelectedNodeId(null)
            setSelectedEdgeId(null)
          }}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onInit={(instance) => {
            flowInstanceRef.current = instance
          }}
          colorMode="dark"
          fitView
          fitViewOptions={fitViewOptions}
          minZoom={0.25}
          maxZoom={1.6}
          connectionRadius={
            infrastructureHandleInteraction.connectionRadiusPixels
          }
          nodesConnectable={gameStatus === 'playing' && (stage.sequence > 1 || !serviceStarted)}
          edgesReconnectable={gameStatus === 'playing' && stage.sequence > 1}
          edgesFocusable={gameStatus === 'playing' && stage.sequence > 1}
          deleteKeyCode={stage.sequence > 1 ? ['Backspace', 'Delete'] : null}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#293532" />
          <Panel position="top-left" className="canvas-heading" dir={direction}>
            <p className="eyebrow">{t('app.campaign')} / {t('stage.label')} {stage.sequence}</p>
            <h1>{t(stage.nameKey)}</h1>
            <p>{t('app.resourceCount', {
              resources: campaign.infrastructure.resources.length,
              connections: campaign.infrastructure.connections.length,
            })}</p>
          </Panel>
          {(stage.sequence !== 1 || serviceStarted) && (
            <Panel position="top-left" className="stage-objectives-position">
              <details className="objective-disclosure" open><summary>{t('advanced.objectives')}</summary><StageObjectivePanel
                stage={stage}
                progress={objectiveProgress}
                learningProgress={learningProgress}
              /></details>
            </Panel>
          )}
          {stage.sequence === 1 && !serviceStarted && (
            <Panel position="top-left" className="resource-palette-position">
              <ResourcePalette
                resources={campaign.infrastructure.resources}
                onAddResource={addResource}
                currentStep={stageOneBuildStep}
              />
            </Panel>
          )}
          {connectionFeedback && (
            <Panel position="top-center" className="connection-feedback-position">
              <aside
                className="connection-feedback nodrag nopan"
                data-valid={connectionFeedback.valid}
                role={connectionFeedback.valid ? 'status' : 'alert'}
                dir={direction}
              >
                <button
                  type="button"
                  onClick={() => setConnectionFeedback(null)}
                  aria-label={t('connection.dismiss')}
                >
                  ×
                </button>
                {connectionFeedback.attempted && (
                  <p className="connection-feedback__attempt">
                    <span>{t('connection.attempted')}</span>{' '}
                    <bdi dir="ltr">
                      {t(connectionResourceLabelKeys[connectionFeedback.attempted.sourceType])}
                      {' → '}
                      {t(connectionResourceLabelKeys[connectionFeedback.attempted.targetType])}
                    </bdi>
                  </p>
                )}
                <p>{t(connectionFeedback.key)}</p>
                {connectionFeedback.suggestionKey && (
                  <p className="connection-feedback__suggestion">
                    <span>{t('connection.suggestion')}:</span>{' '}
                    <bdi dir="ltr">{t(connectionFeedback.suggestionKey)}</bdi>
                  </p>
                )}
              </aside>
            </Panel>
          )}
          {selectedConnection && stage.sequence > 1 && (
            <Panel position="bottom-center" className="connection-editor-position">
              <aside className="connection-editor nodrag nopan" dir={direction}>
                <div>
                  <span>{t('connection.selected')}</span>
                  <strong>
                    <bdi dir="ltr">
                      {t(connectionResourceLabelKeys[
                        campaign.infrastructure.resources.find(
                          (resource) => resource.id === selectedConnection.sourceId,
                        )?.type ?? 'app-server'
                      ])}
                      {' → '}
                      {t(connectionResourceLabelKeys[
                        campaign.infrastructure.resources.find(
                          (resource) => resource.id === selectedConnection.targetId,
                        )?.type ?? 'database'
                      ])}
                    </bdi>
                  </strong>
                  <small>{t('connection.reconnectHelp')}</small>
                </div>
                <button
                  type="button"
                  onClick={() => handleEdgesDelete([
                    displayEdges.find((edge) => edge.id === selectedConnection.id) ?? {
                      id: selectedConnection.id,
                      source: selectedConnection.sourceId,
                      target: selectedConnection.targetId,
                    },
                  ])}
                >
                  {t('connection.remove')}
                </button>
              </aside>
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
                campaign={campaign}
                onRestoreDatabase={() => setPendingAction({ kind: 'database-restore' })}
                onConfigureBackups={configureBackups}
                onConfigureSecurity={configureSecurity}
                simulation={traffic}
                serviceStarted={serviceStarted}
                databaseUpgradeUnlocked={campaign.unlockedControls?.includes('database-scaling') ?? false}
                infrastructureDeployment={infrastructureDeployment}
                onDownsizeDatabase={() => setPendingAction({ kind: 'database-downsize' })}
                onUpgradeDatabase={() => setPendingAction({ kind: 'database-upgrade' })}
                onClose={() => setSelectedNodeId(null)}
                onStartUpgrade={(resourceId) =>
                  setPendingAction({ kind: 'server-upgrade', resourceId })
                }
              />
            </Panel>
          )}
          {!selectedNode && stage.sequence > 1 && <Panel position="top-right" className="operations-dock">
            <div
              className="operations-dock__contents"
              dir={direction}
              ref={operationsScrollRef}
              onScroll={handleOperationsScroll}
            >
              <ExpansionAlerts stage={stage} simulation={traffic} />
              {stage.trafficEvents.length > 0 && <details open className="operations-section"><summary>{t('event.timeline')}</summary><EventTimelinePanel events={stage.trafficEvents} runtime={trafficEvents} gameTimeSeconds={traffic.gameTimeSeconds} /></details>}
              {!!stage.trafficProfile.failures?.length && <details open className="operations-section"><summary>{t('advanced.reliabilityNotice')}</summary><ReliabilityTimeline events={stage.trafficProfile.failures} gameTimeSeconds={traffic.gameTimeSeconds} /></details>}
              {campaign.unlockedResourceTypes.includes('load-balancer') && <details open className="operations-section"><summary>{t('palette.title')}</summary><InfrastructureActionsPanel
                campaign={campaign} simulation={traffic} deployment={infrastructureDeployment}
                onDeployAdvanced={resourceType => setPendingAction({ kind: 'advanced', resourceType })}
                onDeployLoadBalancer={() => setPendingAction({ kind: 'load-balancer' })}
                onDeployAppServer={() => setPendingAction({ kind: 'app-server' })}
                onPlaceResource={placeResource}
              /></details>}
            </div>
          </Panel>}
          <Controls showInteractive={false} orientation="horizontal" fitViewOptions={fitViewOptions} />
        </ReactFlow>
      </section>

      <footer className="game-footer">
        <p className="business-loop" dir={direction}>
          <span className="hint-dot" aria-hidden="true" />
          {t('app.businessLoop')}
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
          <p className="graph-count" dir={direction}>{t('app.graphCount', {
            nodes: campaign.infrastructure.resources.length,
            connections: campaign.infrastructure.connections.length,
          })}</p>
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
          setSelectedEdgeId(null)
          setHint(null)
          setPendingAction(null)
          setConnectionFeedback(null)
          setFlowNodeRuntime({})
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
          onNewCampaign={() => {
            setConnectionFeedback(null)
            setSelectedEdgeId(null)
            setFlowNodeRuntime({})
            startNewCampaign()
          }}
          onContinueCampaign={() => {
            setConnectionFeedback(null)
            setSelectedEdgeId(null)
            setFlowNodeRuntime({})
            continueSavedCampaign()
          }}
        />
      )}
    </main>
  )
}

export default App
