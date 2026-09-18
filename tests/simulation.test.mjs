import assert from 'node:assert/strict'
import test from 'node:test'
import { runnerImport } from 'vite'

const harnessPath = new URL('./simulationHarness.ts', import.meta.url).pathname
const { module: simulation } = await runnerImport(harnessPath, {
  root: process.cwd(),
  logLevel: 'silent',
})

const {
  appServerSimulation,
  campaignSave,
  campaignSimulation,
  connectionValidation,
  customerSatisfactionSimulation,
  economySimulation,
  gameStateSimulation,
  infrastructureData,
  metricEducation,
  simulationClock,
  stageOneOnboardingSimulation,
  stageLearningSimulation,
  trafficSimulation,
  translations,
} = simulation

function createMemoryStorage() {
  const values = new Map()

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    values,
  }
}

function createBuiltCampaign(seed) {
  return {
    ...campaignSimulation.createInitialCampaignState(seed),
    infrastructure: {
      resources: [
        {
          id: 'users',
          type: 'users',
          name: 'Users',
          position: { x: 0, y: 0 },
        },
        {
          id: 'server',
          type: 'app-server',
          name: 'App Server',
          tierId: 'small',
          position: { x: 340, y: 0 },
        },
        {
          id: 'database',
          type: 'database',
          name: 'Database',
          position: { x: 680, y: 0 },
        },
      ],
      connections: [
        { id: 'users-server', sourceId: 'users', targetId: 'server' },
        { id: 'server-database', sourceId: 'server', targetId: 'database' },
      ],
    },
  }
}

function createReadyGameState() {
  return gameStateSimulation.createInitialGameState(createBuiltCampaign())
}

test('a new Stage 1 campaign starts empty with its simulation stopped', () => {
  const state = gameStateSimulation.dismissStageBriefing(
    gameStateSimulation.createInitialGameState(),
  )
  const advanced = gameStateSimulation.advanceGameState(state, 10)

  assert.deepEqual(state.campaign.infrastructure.resources, [])
  assert.deepEqual(state.campaign.infrastructure.connections, [])
  assert.equal(state.stageRuntime.serviceStarted, false)
  assert.equal(state.stageRuntime.simulation.activeUsers, 0)
  assert.equal(advanced.stageRuntime.simulation.gameTimeSeconds, 0)
})

test('Stage 1 palette resources can be placed once without starting traffic', () => {
  let state = gameStateSimulation.createInitialGameState()

  state = gameStateSimulation.placeStageOneResource(state, 'users')
  state = gameStateSimulation.placeStageOneResource(state, 'app-server')
  state = gameStateSimulation.placeStageOneResource(state, 'database')
  const duplicate = gameStateSimulation.placeStageOneResource(state, 'users')

  assert.deepEqual(
    state.campaign.infrastructure.resources.map((resource) => resource.type),
    ['users', 'app-server', 'database'],
  )
  assert.strictEqual(duplicate, state)
  assert.equal(state.stageRuntime.serviceStarted, false)
  assert.equal(state.stageRuntime.simulation.activeUsers, 0)
  assert.equal(state.stageRuntime.simulation.appServers.length, 1)
  assert.equal(state.stageRuntime.simulation.infrastructureCostPerPeriod, 0)
  assert.equal(state.stageRuntime.simulation.netCashFlowPerPeriod, 0)

  const upgradeAttempt = gameStateSimulation.beginServerUpgrade(state, 'server')
  assert.strictEqual(upgradeAttempt, state)
})

test('Stage 1 guided build advances only from player infrastructure changes', () => {
  let state = gameStateSimulation.createInitialGameState()
  assert.equal(
    stageOneOnboardingSimulation.getStageOneBuildStep(
      state.campaign.infrastructure,
    ).id,
    'place-users',
  )

  state = gameStateSimulation.placeStageOneResource(state, 'users')
  assert.equal(
    stageOneOnboardingSimulation.getStageOneBuildStep(
      state.campaign.infrastructure,
    ).id,
    'place-app-server',
  )

  state = gameStateSimulation.placeStageOneResource(state, 'app-server')
  assert.equal(
    stageOneOnboardingSimulation.getStageOneBuildStep(
      state.campaign.infrastructure,
    ).id,
    'connect-users-app-server',
  )
  assert.equal(state.campaign.infrastructure.connections.length, 0)
})

test('Stage 1 accepts only the educational request path and starts traffic when complete', () => {
  let state = gameStateSimulation.createInitialGameState()
  state = gameStateSimulation.placeStageOneResource(state, 'users')
  state = gameStateSimulation.placeStageOneResource(state, 'app-server')

  const invalid = connectionValidation.validateStageOneConnection(
    state.campaign.infrastructure,
    'server',
    'users',
  )
  assert.equal(invalid.valid, false)
  assert.match(
    translations.translate('ar', invalid.explanation.key),
    /خادم التطبيق/,
  )

  state = gameStateSimulation.connectStageOneResources(
    state,
    'users',
    'server',
  )
  state = gameStateSimulation.placeStageOneResource(state, 'database')

  const directDatabase = connectionValidation.validateStageOneConnection(
    state.campaign.infrastructure,
    'users',
    'database',
  )
  assert.equal(directDatabase.valid, false)
  assert.match(
    translations.translate('en', directDatabase.explanation.key),
    /do not connect directly/,
  )

  state = gameStateSimulation.connectStageOneResources(
    state,
    'server',
    'database',
  )
  assert.equal(state.stageRuntime.serviceStarted, true)
  assert.equal(state.stageRuntime.simulation.activeUsers, 20)
  assert.deepEqual(
    state.campaign.infrastructure.connections.map(
      (connection) => `${connection.sourceId}->${connection.targetId}`,
    ),
    ['users->server', 'server->database'],
  )
})

test('every reversed or bypassed Stage 1 connection returns an explanation', () => {
  const infrastructure = createBuiltCampaign().infrastructure
  const invalidPairs = [
    ['users', 'database'],
    ['database', 'users'],
    ['database', 'server'],
    ['server', 'users'],
  ]

  for (const [sourceId, targetId] of invalidPairs) {
    const result = connectionValidation.validateStageOneConnection(
      { ...infrastructure, connections: [] },
      sourceId,
      targetId,
    )
    assert.equal(result.valid, false)
    assert.ok(translations.translate('en', result.explanation.key).length > 20)
    assert.ok(translations.translate('ar', result.explanation.key).length > 20)
  }
})

test('First Users learning objectives follow build and simulation progress', () => {
  let state = gameStateSimulation.createInitialGameState()
  const evaluate = () =>
    stageLearningSimulation.evaluateStageLearningSteps(
      gameStateSimulation.getCurrentStage(state),
      {
        infrastructure: state.campaign.infrastructure,
        serviceStarted: state.stageRuntime.serviceStarted,
        gameTimeSeconds: state.stageRuntime.simulation.gameTimeSeconds,
        status: state.stageRuntime.status,
      },
    )

  assert.equal(evaluate().filter((step) => step.completed).length, 0)
  state = gameStateSimulation.placeStageOneResource(state, 'users')
  assert.equal(evaluate()[0].completed, true)
  state = gameStateSimulation.placeStageOneResource(state, 'app-server')
  state = gameStateSimulation.connectStageOneResources(state, 'users', 'server')
  state = gameStateSimulation.placeStageOneResource(state, 'database')
  state = gameStateSimulation.connectStageOneResources(
    state,
    'server',
    'database',
  )
  assert.equal(evaluate().slice(0, 6).every((step) => step.completed), true)

  state = gameStateSimulation.dismissStageBriefing(state)
  state = gameStateSimulation.advanceGameState(state, 30)
  assert.equal(evaluate()[6].completed, true)
  assert.equal(state.stageRuntime.simulation.gameTimeSeconds, 30)
})

test('language preference defaults safely and persists supported languages', () => {
  const storage = createMemoryStorage()
  assert.equal(translations.readLanguagePreference(storage), 'en')

  assert.equal(translations.writeLanguagePreference('ar', storage), true)
  assert.equal(translations.readLanguagePreference(storage), 'ar')

  storage.values.set(translations.languagePreferenceKey, 'unsupported')
  assert.equal(translations.readLanguagePreference(storage), 'en')

  const englishKeys = Object.keys(translations.translations.en)
  const arabicKeys = Object.keys(translations.translations.ar)
  assert.deepEqual(arabicKeys, englishKeys)
  assert.ok(
    Object.values(translations.translations.ar).every(
      (translation) => translation.trim().length > 0,
    ),
  )
  for (const key of englishKeys) {
    const variables = (value) =>
      [...value.matchAll(/{{([^}]+)}}/g)]
        .map((match) => match[1])
        .sort()
    assert.deepEqual(
      variables(translations.translations.ar[key]),
      variables(translations.translations.en[key]),
      `${key} must use the same interpolation variables in both languages`,
    )
  }
  assert.equal(
    translations.translate('ar', 'event.beginsIn', { time: '1:30' }),
    'يبدأ خلال 1:30',
  )
  assert.equal(
    translations.translate('en', 'app.graphCount', {
      nodes: 3,
      connections: 2,
    }),
    '3 nodes / 2 connections',
  )
})

test('metric education explains live values in both languages', () => {
  const snapshot = {
    activeUsers: 20,
    requestsPerSecond: 2,
    requestsPerUserPerSecond: 0.1,
    cpuUsage: 33.3,
    requestCapacity: 6,
    latencyMs: 95,
    customerSatisfaction: 100,
    badLatencyDurationSeconds: 0,
    balance: 200,
    revenuePerPeriod: 12,
    infrastructureCostPerPeriod: 24,
    netCashFlowPerPeriod: -12,
    incidentCosts: 0,
    gameTimeSeconds: 10,
    costPeriodSeconds: 30,
    serviceStarted: true,
    isPaused: false,
    isServiceOverloaded: false,
  }

  assert.match(
    translations.translateMessage(
      'en',
      metricEducation.getMetricCurrentReason('balance', snapshot),
    ),
    /cost is higher than revenue/,
  )
  assert.match(
    translations.translateMessage(
      'ar',
      metricEducation.getMetricCurrentReason('requests-per-second', snapshot),
    ),
    /20/,
  )
  assert.equal(
    metricEducation.metricEducationDefinitions.latency.labelKey,
    'metric.latency',
  )
  assert.deepEqual(
    metricEducation.getLiveMetricCause('balance', snapshot),
    { trend: 'down', message: { key: 'cause.costExceedsRevenue' } },
  )
  assert.equal(
    metricEducation.getLiveMetricCause('cpu-usage', snapshot),
    null,
  )
})

test('CPU and memory remain between zero and one hundred', () => {
  for (const requestsPerSecond of [-100, 0, 3, 6, 14, 10_000]) {
    for (const tier of ['small', 'medium']) {
      const metrics = appServerSimulation.calculateAppServerMetrics(
        requestsPerSecond,
        tier,
      )

      assert.ok(metrics.cpuUsage >= 0 && metrics.cpuUsage <= 100)
      assert.ok(metrics.memoryUsage >= 0 && metrics.memoryUsage <= 100)
    }
  }
})

test('balance operations never produce a negative balance', () => {
  const economy = economySimulation.advanceEconomy(
    {
      balance: 1,
      revenuePerPeriod: 0,
      infrastructureCostPerPeriod: 10,
      netCashFlowPerPeriod: -10,
    },
    0,
    100,
    10,
    true,
  )

  assert.equal(economy.balance, 0)
  assert.equal(economySimulation.deductCost(5, 10), 5)
  assert.equal(economySimulation.deductCost(10, 10), 0)
})

test('pause stops game time and deployment advancement', () => {
  let state = gameStateSimulation.dismissStageBriefing(
    createReadyGameState(),
  )
  state = gameStateSimulation.beginServerUpgrade(state, 'server')
  const pausedSeconds = simulationClock.calculateTickGameSeconds(0, true)
  const pausedState = gameStateSimulation.advanceGameState(
    state,
    pausedSeconds,
  )

  assert.equal(pausedState.stageRuntime.simulation.gameTimeSeconds, 0)
  assert.ok(pausedState.stageRuntime.simulation.serverDeployment)
  assert.equal(
    campaignSimulation.getPrimaryAppServer(pausedState.campaign).tierId,
    'small',
  )
})

test('speed multipliers advance the shared game clock correctly', () => {
  const initial = gameStateSimulation.dismissStageBriefing(
    createReadyGameState(),
  )

  for (const speed of [1, 2, 4]) {
    const elapsed = simulationClock.calculateTickGameSeconds(speed, true)
    const advanced = gameStateSimulation.advanceGameState(initial, elapsed)
    assert.equal(advanced.stageRuntime.simulation.gameTimeSeconds, speed)
  }
})

test('server upgrade completes only after its game-time duration', () => {
  let state = gameStateSimulation.dismissStageBriefing(
    createReadyGameState(),
  )
  state = gameStateSimulation.beginServerUpgrade(state, 'server')
  state = gameStateSimulation.advanceGameState(state, 29)

  assert.ok(state.stageRuntime.simulation.serverDeployment)
  assert.equal(campaignSimulation.getPrimaryAppServer(state.campaign).tierId, 'small')

  const pausedAtFinalSecond = gameStateSimulation.advanceGameState(
    state,
    simulationClock.calculateTickGameSeconds(0, true),
  )
  assert.equal(pausedAtFinalSecond.stageRuntime.simulation.gameTimeSeconds, 29)
  assert.ok(pausedAtFinalSecond.stageRuntime.simulation.serverDeployment)

  state = gameStateSimulation.advanceGameState(pausedAtFinalSecond, 1)
  assert.equal(state.stageRuntime.simulation.serverDeployment, null)
  assert.equal(campaignSimulation.getPrimaryAppServer(state.campaign).tierId, 'medium')
})

test('customer satisfaction remains bounded', () => {
  let satisfaction =
    customerSatisfactionSimulation.createInitialCustomerSatisfactionState()

  for (let second = 0; second < 1_000; second += 1) {
    satisfaction =
      customerSatisfactionSimulation.advanceCustomerSatisfaction(
        satisfaction,
        5_000,
        1,
      )
  }

  assert.equal(satisfaction.customerSatisfaction, 0)
  assert.ok(
    satisfaction.customerSatisfaction >= 0 &&
      satisfaction.customerSatisfaction <= 100,
  )
})

test('restart restores the stage-start campaign snapshot', () => {
  const initial = createReadyGameState()
  let changed = gameStateSimulation.moveCampaignResources(
    initial,
    [{ id: 'server', position: { x: 999, y: 999 } }],
  )
  changed = gameStateSimulation.beginServerUpgrade(changed, 'server')
  const restarted = gameStateSimulation.restartStage(changed)
  const server = campaignSimulation.getPrimaryAppServer(restarted.campaign)

  assert.deepEqual(restarted.campaign, initial.stageStartSnapshot)
  assert.equal(server.position.x, 340)
  assert.equal(restarted.stageRuntime.simulation.gameTimeSeconds, 0)
})

test('distributed server traffic is balanced and totals exactly', () => {
  const shares = trafficSimulation.distributeRequestsEvenly(17.3, 3)

  assert.equal(shares.reduce((total, share) => total + share, 0), 17.3)
  assert.ok(Math.max(...shares) - Math.min(...shares) <= 0.1)
})

test('the primary survival condition completes at its configured duration', () => {
  let state = gameStateSimulation.dismissStageBriefing(
    createReadyGameState(),
  )
  state = gameStateSimulation.advanceGameState(state, 269)
  assert.equal(state.stageRuntime.status, 'playing')

  state = gameStateSimulation.advanceGameState(state, 1)
  assert.equal(state.stageRuntime.status, 'stage-won')
})

test('zero balance and sustained zero satisfaction trigger game over', () => {
  const initial = gameStateSimulation.dismissStageBriefing(
    createReadyGameState(),
  )
  const bankrupt = gameStateSimulation.advanceGameState(
    {
      ...initial,
      stageRuntime: {
        ...initial.stageRuntime,
        simulation: { ...initial.stageRuntime.simulation, balance: 0 },
      },
    },
    1,
  )
  assert.equal(bankrupt.stageRuntime.gameOverReason?.code, 'bankruptcy')

  const serviceFailure = gameStateSimulation.advanceGameState(
    {
      ...initial,
      stageRuntime: {
        ...initial.stageRuntime,
        zeroSatisfactionDurationSeconds: 14,
        simulation: {
          ...initial.stageRuntime.simulation,
          customerSatisfaction: 0,
        },
      },
    },
    1,
  )
  assert.equal(
    serviceFailure.stageRuntime.gameOverReason?.code,
    'service-failure',
  )
})

test('campaign infrastructure survives a stage transition', () => {
  let state = gameStateSimulation.createInitialGameState()
  state = gameStateSimulation.placeStageOneResource(state, 'users')
  state = gameStateSimulation.placeStageOneResource(state, 'app-server')
  state = gameStateSimulation.connectStageOneResources(
    state,
    'users',
    'server',
  )
  state = gameStateSimulation.placeStageOneResource(state, 'database')
  state = gameStateSimulation.connectStageOneResources(
    state,
    'server',
    'database',
  )
  state = gameStateSimulation.dismissStageBriefing(state)
  state = gameStateSimulation.beginServerUpgrade(state, 'server')
  state = gameStateSimulation.advanceGameState(state, 270)
  assert.equal(state.stageRuntime.status, 'stage-won')

  const nextStage = gameStateSimulation.continueToNextStage(state)
  assert.equal(nextStage.campaign.currentStageIndex, 1)
  assert.equal(
    campaignSimulation.getPrimaryAppServer(nextStage.campaign).tierId,
    'medium',
  )
  assert.equal(nextStage.stageRuntime.simulation.gameTimeSeconds, 0)
  assert.equal(nextStage.campaign.completedStages.length, 1)
})

test('campaign saves round-trip and reject corrupt topology safely', () => {
  const storage = createMemoryStorage()
  const campaign = campaignSimulation.createInitialCampaignState(123)

  assert.equal(campaignSave.saveCampaign(campaign, storage), true)
  const loaded = campaignSave.loadCampaignSave(storage)
  assert.equal(loaded.status, 'ready')
  assert.deepEqual(loaded.campaign, campaign)

  const brokenCampaign = {
    ...campaign,
    infrastructure: {
      ...campaign.infrastructure,
      connections: [
        { id: 'missing-edge', sourceId: 'missing', targetId: 'also-missing' },
      ],
    },
  }
  storage.values.set(
    campaignSave.campaignSaveKey,
    JSON.stringify({
      version: campaignSave.campaignSaveVersion,
      campaign: brokenCampaign,
    }),
  )

  assert.equal(campaignSave.loadCampaignSave(storage).status, 'corrupt')
})

test('save and continue preserve partial and completed Stage 1 infrastructure', () => {
  const storage = createMemoryStorage()
  let state = gameStateSimulation.createInitialGameState()
  state = gameStateSimulation.placeStageOneResource(state, 'users')
  state = gameStateSimulation.placeStageOneResource(state, 'app-server')

  assert.equal(campaignSave.saveCampaign(state.campaign, storage), true)
  const partialSave = campaignSave.loadCampaignSave(storage)
  assert.equal(partialSave.status, 'ready')
  const partialResume = gameStateSimulation.createInitialGameState(
    partialSave.campaign,
  )
  assert.equal(partialResume.stageRuntime.serviceStarted, false)
  assert.deepEqual(
    partialResume.campaign.infrastructure.resources.map(
      (resource) => resource.id,
    ),
    ['users', 'server'],
  )

  state = gameStateSimulation.connectStageOneResources(
    partialResume,
    'users',
    'server',
  )
  state = gameStateSimulation.placeStageOneResource(state, 'database')
  state = gameStateSimulation.connectStageOneResources(
    state,
    'server',
    'database',
  )
  campaignSave.saveCampaign(state.campaign, storage)
  const completeSave = campaignSave.loadCampaignSave(storage)
  assert.equal(completeSave.status, 'ready')
  const completeResume = gameStateSimulation.createInitialGameState(
    completeSave.campaign,
  )
  assert.equal(completeResume.stageRuntime.serviceStarted, true)
  assert.deepEqual(
    completeResume.campaign.infrastructure,
    state.campaign.infrastructure,
  )
})

test('horizontal scaling unlocks only for the launch preparation stage', () => {
  const initialCampaign = createBuiltCampaign()
  const verticalLimit = gameStateSimulation.createInitialGameState({
    ...initialCampaign,
    currentStageIndex: 2,
  })
  const launch = gameStateSimulation.createInitialGameState({
    ...initialCampaign,
    currentStageIndex: 3,
  })

  assert.equal(
    verticalLimit.campaign.unlockedResourceTypes.includes('load-balancer'),
    false,
  )
  assert.equal(
    launch.campaign.unlockedResourceTypes.includes('load-balancer'),
    true,
  )
})

test('repeated node drags preserve infrastructure identity and runtime state', () => {
  let gameState = gameStateSimulation.dismissStageBriefing(
    createReadyGameState(),
  )
  const originalConnections = gameState.campaign.infrastructure.connections
  const originalStageRuntime = gameState.stageRuntime
  const originalResourceIds = gameState.campaign.infrastructure.resources.map(
    (resource) => resource.id,
  )
  const originalServerTier = campaignSimulation.getPrimaryAppServer(
    gameState.campaign,
  ).tierId
  let nodes = infrastructureData.createInfrastructureNodes(
    gameState.campaign.infrastructure,
  )
  const measuredChanges = nodes.map((node) => ({
    id: node.id,
    type: 'dimensions',
    dimensions: { width: 240, height: 180 },
  }))
  let changeResult = infrastructureData.applyInfrastructureNodeChanges(
    measuredChanges,
    nodes,
  )
  nodes = changeResult.nodes
  let nodeRuntime = changeResult.runtime

  const dragSequence = [
    { id: 'users', position: { x: 40, y: 30 } },
    { id: 'server', position: { x: 390, y: -45 } },
    { id: 'database', position: { x: 730, y: 60 } },
    { id: 'users', position: { x: 80, y: -20 } },
    { id: 'server', position: { x: 410, y: 15 } },
  ]

  for (const drag of dragSequence) {
    changeResult = infrastructureData.applyInfrastructureNodeChanges(
      [
        { id: drag.id, type: 'position', position: drag.position, dragging: true },
        { id: 'database', type: 'remove' },
      ],
      nodes,
    )
    nodes = changeResult.nodes
    nodeRuntime = changeResult.runtime
    gameState = gameStateSimulation.moveCampaignResources(
      gameState,
      changeResult.positionUpdates,
    )
    nodes = infrastructureData.carryInfrastructureNodeRuntime(
      infrastructureData.createInfrastructureNodes(
        gameState.campaign.infrastructure,
      ),
      nodeRuntime,
    )

    assert.deepEqual(
      gameState.campaign.infrastructure.resources.map((resource) => resource.id),
      originalResourceIds,
    )
    assert.strictEqual(
      gameState.campaign.infrastructure.connections,
      originalConnections,
    )
    assert.strictEqual(gameState.stageRuntime, originalStageRuntime)
    assert.equal(nodes.length, originalResourceIds.length)
    assert.ok(nodes.every((node) => node.measured?.width === 240))
    assert.equal(
      infrastructureData.createInfrastructureEdges(
        gameState.campaign.infrastructure,
      ).length,
      originalConnections.length,
    )
  }

  assert.equal(
    campaignSimulation.getPrimaryAppServer(gameState.campaign).tierId,
    originalServerTier,
  )
  assert.deepEqual(
    gameState.campaign.infrastructure.resources.find(
      (resource) => resource.id === 'users',
    ).position,
    { x: 80, y: -20 },
  )

  const advanced = gameStateSimulation.advanceGameState(gameState, 1)
  assert.equal(advanced.stageRuntime.simulation.gameTimeSeconds, 1)
  assert.equal(
    advanced.stageRuntime.objectiveProgress['survive-first-users'].current,
    1,
  )

  const storage = createMemoryStorage()
  campaignSave.saveCampaign(advanced.campaign, storage)
  const loaded = campaignSave.loadCampaignSave(storage)
  assert.equal(loaded.status, 'ready')
  assert.deepEqual(loaded.campaign.infrastructure, advanced.campaign.infrastructure)
  const continued = gameStateSimulation.createInitialGameState(loaded.campaign)
  assert.deepEqual(
    continued.campaign.infrastructure,
    advanced.campaign.infrastructure,
  )
})

test('position batches preserve every stage topology', () => {
  for (let currentStageIndex = 0; currentStageIndex < 4; currentStageIndex += 1) {
    let campaign = {
      ...createBuiltCampaign(),
      currentStageIndex,
    }

    if (currentStageIndex === 3) {
      campaign = campaignSimulation.addAdditionalAppServerResource(
        campaignSimulation.addLoadBalancerResource(campaign),
      )
    }

    const state = gameStateSimulation.createInitialGameState(campaign)
    const nodes = infrastructureData.createInfrastructureNodes(
      state.campaign.infrastructure,
    )
    const result = infrastructureData.applyInfrastructureNodeChanges(
      nodes.map((node, index) => ({
        id: node.id,
        type: 'position',
        position: { x: node.position.x + index + 1, y: node.position.y + 5 },
      })),
      nodes,
    )
    const moved = gameStateSimulation.moveCampaignResources(
      state,
      result.positionUpdates,
    )

    assert.equal(moved.campaign.currentStageIndex, currentStageIndex)
    assert.strictEqual(moved.stageRuntime, state.stageRuntime)
    assert.deepEqual(
      moved.campaign.infrastructure.resources.map((resource) => resource.id),
      state.campaign.infrastructure.resources.map((resource) => resource.id),
    )
    assert.deepEqual(
      moved.campaign.infrastructure.connections,
      state.campaign.infrastructure.connections,
    )
  }
})
