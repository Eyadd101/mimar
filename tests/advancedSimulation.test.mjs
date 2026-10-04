import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { runnerImport } from 'vite'
const { module: s } = await runnerImport(new URL('./simulationHarness.ts', import.meta.url).pathname, { root: process.cwd(), logLevel: 'silent' })
const { gameStateSimulation: game, campaignSimulation: campaign, campaignSave: saves, customerSentiment, databaseSimulation: db, cacheSimulation: cache, queueSimulation: queue, storageSimulation: storage, securitySimulation: security, backupSimulation: backup, expansionConfig: config, baseConfig, stages, trafficSimulation: traffic } = s

function memoryStorage() {
  const values = new Map()
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
}
function builtCampaign(stageIndex = 0) {
  let state = game.createInitialGameState()
  for (const type of ['users', 'app-server', 'database']) state = game.placeStageOneResource(state, type)
  state = game.connectStageOneResources(state, 'users', 'server')
  state = game.connectStageOneResources(state, 'server', 'database')
  let result = { ...state.campaign, currentStageIndex: stageIndex, balance: 500 }
  for (let i = 0; i <= stageIndex; i++) result = campaign.applyResourceUnlocks(result, stages.campaignStageConfigs[i].unlocksResourceTypes)
  return result
}
function ready(stageIndex = 0) {
  return game.dismissStageBriefing(game.createInitialGameState(builtCampaign(stageIndex)))
}
function expandedCampaign(stageIndex = 9) {
  let result = builtCampaign(stageIndex)
  result = { ...result, infrastructure: { ...result.infrastructure, resources: result.infrastructure.resources.map(r => r.type === 'app-server' ? { ...r, tierId: 'medium' } : r) } }
  result = campaign.placeInventoryResource(campaign.addLoadBalancerResource(result), 'load-balancer')
  result = campaign.disconnectCampaignResources(result, ['users-server'])
  result = campaign.connectCampaignResources(result, 'users', 'load-balancer')
  result = campaign.connectCampaignResources(result, 'load-balancer', 'server')
  result = campaign.placeInventoryResource(campaign.addAdditionalAppServerResource(result), 'server-b')
  result = campaign.connectCampaignResources(result, 'load-balancer', 'server-b')
  result = campaign.connectCampaignResources(result, 'server-b', 'database')
  for (const type of ['cache', 'queue', 'worker', 'object-storage']) {
    result = campaign.placeInventoryResource(campaign.addAdvancedResource(result, type), type)
  }
  result = campaign.connectCampaignResources(result, 'server', 'cache')
  result = campaign.connectCampaignResources(result, 'cache', 'database')
  result = campaign.connectCampaignResources(result, 'server', 'queue')
  result = campaign.connectCampaignResources(result, 'queue', 'worker')
  result = campaign.connectCampaignResources(result, 'server', 'object-storage')
  return result
}
function roundTrip(state, speed = 0) {
  const store = memoryStorage()
  assert.equal(saves.saveGameCheckpoint(state, speed, store), true)
  const loaded = saves.loadCampaignSave(store)
  assert.equal(loaded.status, 'ready')
  assert.deepEqual(loaded.gameState, state)
  assert.equal(loaded.gameSpeed, speed)
  return loaded.gameState
}

test('database CPU and memory stay bounded while overload remains observable', () => {
  for (const tier of ['small', 'medium']) for (const rate of [-10, 0, 1, 30, 60, 180, 10000]) {
    const metrics = db.calculateDatabaseMetrics(rate, 1, tier)
    assert.ok(metrics.cpuUsage >= 0 && metrics.cpuUsage <= 100)
    assert.ok(metrics.memoryUsage >= 0 && metrics.memoryUsage <= 100)
    assert.ok(metrics.queryLoad >= 0 && metrics.activeConnections >= 0)
    assert.ok(metrics.queryLatencyMs >= config.databaseConfig.baseLatencyMs)
  }
  assert.equal(db.calculateDatabaseMetrics(1000).status, 'overloaded')
})
test('database latency rises with query or connection pressure and improves with scaling', () => {
  const low = db.calculateDatabaseMetrics(10)
  const high = db.calculateDatabaseMetrics(50, 5, 'small', 20)
  assert.ok(high.queryLatencyMs > low.queryLatencyMs)
  assert.ok(db.calculateDatabaseMetrics(50, 5, 'medium', 20).queryLatencyMs < high.queryLatencyMs)
  assert.equal(high.activeConnections, 40, 'queries do not each allocate a connection')
  assert.ok(db.calculateDatabaseMetrics(1, 1, 'small', 100).utilization > 1)
})
test('database upgrade costs once, takes game time, and preserves data and position', () => {
  let state = ready(4)
  const original = state.campaign.infrastructure.resources.find(r => r.type === 'database')
  state = game.beginDatabaseUpgrade(state)
  assert.equal(state.campaign.balance, 500 - config.databaseUpgradeConfig.deploymentCost)
  assert.equal(game.beginDatabaseUpgrade(state), state)
  assert.equal(game.advanceGameState(state, 0), state)
  state = game.advanceGameState(state, config.databaseUpgradeConfig.deploymentDurationSeconds - 1)
  assert.equal(state.stageRuntime.simulation.database.tierId, 'small')
  state = game.advanceGameState(state)
  assert.equal(state.stageRuntime.simulation.database.tierId, 'medium')
  assert.deepEqual(state.campaign.infrastructure.resources.find(r => r.type === 'database').position, original.position)
  assert.ok(state.campaign.databaseData.revision > 1)
})
test('cache bounds hits and preserves writes, including saturation and disconnected state', () => {
  for (const queries of [-5, 0, 1, 120, 10000]) for (const reads of [0, .8, 1]) {
    const metrics = cache.calculateCacheMetrics(queries, true, reads)
    assert.ok(metrics.hitRate >= 0 && metrics.hitRate <= 100)
    assert.ok(metrics.requestsServed <= config.cacheConfig.capacity)
    assert.ok(metrics.databaseQueries >= Math.max(0, queries) * (1 - reads) - 1e-9)
    assert.equal(metrics.databaseQueries + metrics.requestsServed, Math.max(0, queries))
  }
  assert.equal(cache.calculateCacheMetrics(100, false).databaseQueries, 100)
  assert.equal(cache.calculateCacheMetrics(100, true).databaseQueries, 40)
})
test('queue processing is bounded and never makes depth negative', () => {
  let state = queue.emptyQueue
  for (const arrivals of [20, 20, 0, 0, 2, 0]) {
    state = queue.advanceQueue(state, arrivals, true, true)
    assert.ok(state.depth >= 0)
    assert.ok(state.processingRate <= config.queueConfig.workerCapacity)
  }
  for (let i = 0; i < 20; i++) state = queue.advanceQueue(state, 0, true, true)
  assert.equal(state.depth, 0)
  assert.equal(state.oldestMessageAge, 0)
})
test('worker outage accumulates backlog; pause preserves queue state', () => {
  const stopped = queue.advanceQueue(queue.emptyQueue, 4, true, false, 10)
  assert.equal(stopped.depth, 40)
  assert.equal(stopped.processingRate, 0)
  assert.equal(queue.advanceQueue(stopped, 4, true, true, 0), stopped)
  assert.equal(queue.advanceQueue(stopped, 4, true, true, 10).depth, 20)
})
test('object storage charges capacity and requests and migrates local data without loss', () => {
  const local = storage.advanceStorage(storage.emptyStoredData, 10, false, 30)
  assert.equal(local.localObjects, 300)
  assert.ok(local.latencyPenaltyMs > 0)
  const migrated = storage.advanceStorage(local, 10, true, 1)
  assert.equal(migrated.localObjects, 0)
  assert.equal(migrated.storedObjects, 310)
  assert.equal(migrated.latencyPenaltyMs, 0)
  assert.equal(migrated.costPerPeriod, 1 + 310 * .005 * .15 + 10 * .1)
  assert.equal(storage.calculateStorageCost(-10, -10), config.storageConfig.baseCostPerPeriod)
})
test('security incidents respect grace period, charge once and clear after remediation', () => {
  const exposed = { ...security.secureSettings, publicDatabase: true }
  const before = security.advanceSecurity(security.clearSecurityRuntime, exposed, config.securityConfig.gracePeriodSeconds - 1)
  assert.equal(before.state.incidentActive, false)
  assert.equal(before.penalty, 0)
  const incident = security.advanceSecurity(before.state, exposed)
  assert.equal(incident.penalty, config.securityConfig.incidentCost)
  assert.equal(security.advanceSecurity(incident.state, exposed).penalty, 0)
  const fixed = security.advanceSecurity(incident.state, security.secureSettings, 0)
  assert.deepEqual(fixed.state, security.clearSecurityRuntime)
})
test('backup restore requires a valid snapshot, preserves old snapshot and charges frequency', () => {
  const missing = { ...backup.initialDatabaseData, dataLost: true }
  assert.equal(backup.canRestoreDatabase(missing), false)
  assert.equal(backup.restoreDatabase(missing), missing)
  const snapshot = backup.advanceBackups(backup.initialDatabaseData, { enabled: true, frequencySeconds: 60 }, 60)
  assert.equal(snapshot.backupRevision, 61)
  const lost = { ...snapshot, revision: 100, dataLost: true }
  assert.equal(backup.canRestoreDatabase(lost), true)
  assert.equal(backup.restoreDatabase(lost).revision, 61)
  assert.equal(backup.restoreDatabase(lost).dataLost, false)
  assert.equal(backup.canRestoreDatabase({ ...lost, backupRevision: 101 }), false)
  assert.equal(backup.getBackupCost({ enabled: true, frequencySeconds: 120 }), 1.5)
})
test('restoring data is paid once and does not complete while paused', () => {
  let initial = expandedCampaign()
  initial = { ...initial, databaseData: { revision: 100, backupRevision: 60, secondsSinceBackup: 0, dataLost: true } }
  let state = game.dismissStageBriefing(game.createInitialGameState(initial))
  state = game.beginDatabaseRestore(state)
  assert.equal(state.campaign.balance, 490)
  assert.equal(game.beginDatabaseRestore(state), state)
  assert.equal(game.advanceGameState(state, 0), state)
  state = game.advanceGameState(state, config.backupConfig.restoreDurationSeconds)
  assert.equal(state.stageRuntime.simulation.databaseData.dataLost, false)
  assert.equal(state.stageRuntime.simulation.databaseRestoreCompletesAt, null)
})
test('resource and control unlocks arrive at the intended stages', () => {
  const resourceUnlocks = { 'load-balancer': 3, cache: 5, queue: 6, worker: 6, 'object-storage': 7 }
  for (const [type, index] of Object.entries(resourceUnlocks)) {
    assert.ok(!builtCampaign(index - 1).unlockedResourceTypes.includes(type))
    assert.ok(builtCampaign(index).unlockedResourceTypes.includes(type))
  }
  for (const [type, index] of [['database-scaling', 4], ['security', 8], ['backups', 9]]) {
    assert.ok(stages.campaignStageConfigs[index].unlocksControls.includes(type))
  }
  assert.equal(game.beginAdvancedResourceDeployment(ready(), 'cache').campaign.infrastructure.resources.length, 3)
})
test('customer sentiment thresholds remain stable while satisfaction stays numeric', () => {
  assert.equal(customerSentiment.getCustomerSentiment(100).id, 'very-happy')
  assert.equal(customerSentiment.getCustomerSentiment(90).id, 'very-happy')
  assert.equal(customerSentiment.getCustomerSentiment(89.9).id, 'happy')
  assert.equal(customerSentiment.getCustomerSentiment(75).id, 'happy')
  assert.equal(customerSentiment.getCustomerSentiment(50).id, 'neutral')
  assert.equal(customerSentiment.getCustomerSentiment(25).id, 'unhappy')
  assert.equal(customerSentiment.getCustomerSentiment(0).id, 'angry')
  assert.equal(customerSentiment.getCustomerSentiment(-10).id, 'angry')
})
test('sentiment presentation does not change numeric objective evaluation', () => {
  const stage = stages.campaignStageConfigs[0]
  let progress = s.stageObjectiveSimulation.createStageObjectiveProgress(stage)
  const state = ready()
  const simulation = { ...state.stageRuntime.simulation, gameTimeSeconds: 270, customerSatisfaction: 74.9 }
  progress = s.stageObjectiveSimulation.advanceStageObjectives(stage, progress, simulation, { completedEventIds: [] })
  assert.equal(progress['healthy-customers'].completed, false)
  progress = s.stageObjectiveSimulation.advanceStageObjectives(stage, progress, { ...simulation, customerSatisfaction: 75 }, { completedEventIds: [] })
  assert.equal(progress['healthy-customers'].completed, true)
})
test('deployment purchases inventory before explicit placement and creates no connections', () => {
  let state = ready(3)
  const originalConnections = structuredClone(state.campaign.infrastructure.connections)
  state = game.beginLoadBalancerDeployment(state)
  state = game.advanceGameState(state, baseConfig.loadBalancerResourceConfig.deploymentDurationSeconds)
  assert.equal(state.campaign.inventory.some(resource => resource.id === 'load-balancer'), true)
  assert.equal(state.campaign.infrastructure.resources.some(resource => resource.id === 'load-balancer'), false)
  assert.deepEqual(state.campaign.infrastructure.connections, originalConnections)

  state = game.placePurchasedResource(state, 'load-balancer')
  assert.equal(state.campaign.inventory.length, 0)
  assert.equal(state.campaign.infrastructure.resources.some(resource => resource.id === 'load-balancer'), true)
  assert.deepEqual(state.campaign.infrastructure.connections, originalConnections)
  assert.deepEqual(roundTrip(state).campaign, state.campaign)

  state = game.beginAdditionalAppServerDeployment(state)
  state = game.advanceGameState(state, 30)
  const purchasedServer = state.campaign.inventory.find(resource => resource.id === 'server-b')
  assert.equal(purchasedServer?.type, 'app-server')
  assert.equal(purchasedServer?.tierId, 'small')
  assert.equal(state.campaign.infrastructure.resources.some(resource => resource.id === 'server-b'), false)
})
test('player-created connections can be deleted and reconnected without changing resources', () => {
  const initial = expandedCampaign(3)
  let state = game.createInitialGameState(initial)
  const resources = structuredClone(state.campaign.infrastructure.resources)
  state = game.disconnectInfrastructure(state, ['load-balancer-server-b'])
  assert.equal(state.campaign.infrastructure.connections.some(connection => connection.id === 'load-balancer-server-b'), false)
  assert.deepEqual(state.campaign.infrastructure.resources, resources)
  state = game.reconnectInfrastructure(state, 'load-balancer-server', 'load-balancer', 'server-b')
  assert.equal(state.campaign.infrastructure.connections.some(connection => connection.sourceId === 'load-balancer' && connection.targetId === 'server-b'), true)
  assert.equal(state.campaign.infrastructure.connections.some(connection => connection.sourceId === 'load-balancer' && connection.targetId === 'server'), false)
  assert.deepEqual(state.campaign.infrastructure.resources, resources)
})

test('Stage 1 wires can be removed before and after launch, saved, and rebuilt', () => {
  let state = game.createInitialGameState()
  for (const type of ['users', 'app-server', 'database']) {
    state = game.placeStageOneResource(state, type)
  }
  state = game.connectInfrastructure(state, 'users', 'server')
  state = game.disconnectInfrastructure(state, ['users-server'])
  assert.equal(state.stageRuntime.serviceStarted, false)
  assert.equal(state.stageRuntime.simulation.activeUsers, 0)
  assert.equal(state.stageRuntime.simulation.applicationLatencyMs, 0)
  assert.equal(state.stageRuntime.simulation.infrastructureCostPerPeriod, 0)
  assert.equal(s.stageOneOnboardingSimulation.getStageOneBuildStep(state.campaign.infrastructure).id, 'connect-users-app-server')
  state = roundTrip(state)
  state = game.connectInfrastructure(state, 'users', 'server')
  state = game.connectInfrastructure(state, 'server', 'database')
  assert.equal(state.stageRuntime.serviceStarted, true)

  state = game.dismissStageBriefing(state)
  state = game.advanceGameState(state, 1)
  const gameTime = state.stageRuntime.simulation.gameTimeSeconds
  const resources = structuredClone(state.campaign.infrastructure.resources)
  state = game.disconnectInfrastructure(state, ['server-database'])
  assert.equal(state.campaign.infrastructure.connections.length, 1)
  assert.equal(state.stageRuntime.simulation.appServers[0].requestsPerSecond, 0)
  assert.equal(state.stageRuntime.simulation.gameTimeSeconds, gameTime)
  assert.deepEqual(state.campaign.infrastructure.resources, resources)
  state = roundTrip(state)

  state = game.advanceGameState(state, 1)
  assert.equal(state.stageRuntime.simulation.gameTimeSeconds, gameTime + 1)
  state = game.connectInfrastructure(state, 'server', 'database')
  assert.deepEqual(state.campaign.infrastructure.connections.map(connection => connection.id), ['users-server', 'server-database'])
  assert.ok(state.stageRuntime.simulation.appServers[0].requestsPerSecond > 0)
  state = game.disconnectInfrastructure(state, ['users-server'])
  assert.equal(state.stageRuntime.simulation.appServers[0].requestsPerSecond, 0)
  state = roundTrip(state)
  state = game.connectInfrastructure(state, 'users', 'server')
  assert.equal(state.campaign.infrastructure.connections.length, 2)
  assert.ok(state.stageRuntime.simulation.appServers[0].requestsPerSecond > 0)
  assert.deepEqual(roundTrip(state).campaign.infrastructure.resources, resources)
})

test('all six owner-tested wire types delete and reconnect through saved topology in both languages', () => {
  const graph = campaign.connectCampaignResources(expandedCampaign(), 'users', 'server')
  const pairs = [
    ['users', 'server'],
    ['server', 'database'],
    ['load-balancer', 'server'],
    ['server', 'cache'],
    ['server', 'queue'],
    ['queue', 'worker'],
  ]

  for (const language of ['en', 'ar']) {
    assert.ok(s.translations.translate(language, 'connection.selected'))
    assert.ok(s.translations.translate(language, 'connection.remove'))
    assert.match(s.translations.translate(language, 'connection.deleteHelp'), /Delete.*Backspace/)

    for (const [sourceId, targetId] of pairs) {
      const edgeId = `${sourceId}-${targetId}`
      const initial = game.createInitialGameState(graph)
      const originalConnections = initial.campaign.infrastructure.connections
      const originalResources = initial.campaign.infrastructure.resources
      let state = game.disconnectInfrastructure(initial, [edgeId])
      assert.equal(state.campaign.infrastructure.connections.length, originalConnections.length - 1, `${language}: ${edgeId} removed`)
      assert.equal(state.campaign.infrastructure.connections.some(connection => connection.id === edgeId), false)
      assert.deepEqual(state.campaign.infrastructure.resources, originalResources)
      state = roundTrip(state)
      state = game.connectInfrastructure(state, sourceId, targetId)
      assert.deepEqual(state.campaign.infrastructure.connections.map(connection => connection.id).sort(), originalConnections.map(connection => connection.id).sort(), `${language}: ${edgeId} rebuilt`)
      assert.deepEqual(roundTrip(state).campaign.infrastructure.resources, originalResources)
    }
  }
})
test('only servers on a complete player-created path receive traffic', () => {
  let graph = builtCampaign(3)
  graph = campaign.placeInventoryResource(campaign.addLoadBalancerResource(graph), 'load-balancer')
  graph = campaign.disconnectCampaignResources(graph, ['users-server'])
  graph = campaign.connectCampaignResources(graph, 'users', 'load-balancer')
  graph = campaign.connectCampaignResources(graph, 'load-balancer', 'server')
  graph = campaign.placeInventoryResource(campaign.addAdditionalAppServerResource(graph), 'server-b')
  let infrastructure = campaign.createTrafficInfrastructure(graph)
  let simulation = traffic.createInitialTrafficState({ infrastructure })
  assert.equal(simulation.appServers.find(server => server.resourceId === 'server-b').requestsPerSecond, 0)

  graph = campaign.connectCampaignResources(graph, 'load-balancer', 'server-b')
  graph = campaign.connectCampaignResources(graph, 'server-b', 'database')
  infrastructure = campaign.createTrafficInfrastructure(graph)
  simulation = traffic.createInitialTrafficState({ infrastructure })
  assert.equal(simulation.appServers.reduce((sum, server) => sum + server.requestsPerSecond, 0), simulation.requestsPerSecond)
  assert.ok(simulation.appServers.every(server => server.requestsPerSecond > 0))
})
test('save checkpoints preserve inventory, placed, and manually connected intermediate topology', () => {
  let state = game.createInitialGameState(builtCampaign(3))

  state = { ...state, campaign: campaign.addLoadBalancerResource(state.campaign) }
  assert.equal(roundTrip(state).campaign.inventory.length, 1)

  state = game.placePurchasedResource(state, 'load-balancer')
  assert.equal(roundTrip(state).campaign.infrastructure.connections.length, 2)

  state = { ...state, campaign: campaign.addAdditionalAppServerResource(state.campaign) }
  assert.equal(roundTrip(state).campaign.inventory[0]?.id, 'server-b')

  state = game.placePurchasedResource(state, 'server-b')
  assert.equal(state.stageRuntime.simulation.appServers.length, 2)
  assert.equal(state.stageRuntime.simulation.gameTimeSeconds, 0)
  assert.equal(state.stageRuntime.simulation.appServers.find(server => server.resourceId === 'server-b').requestsPerSecond, 0)
  assert.equal(roundTrip(state).campaign.infrastructure.connections.length, 2)

  state = game.connectInfrastructure(state, 'users', 'load-balancer')
  state = game.connectInfrastructure(state, 'load-balancer', 'server-b')
  state = game.connectInfrastructure(state, 'server-b', 'database')
  state = game.disconnectInfrastructure(state, ['users-server'])
  assert.equal(state.stageRuntime.simulation.gameTimeSeconds, 0)
  assert.equal(state.stageRuntime.simulation.appServers.find(server => server.resourceId === 'server').requestsPerSecond, 0)
  assert.equal(state.stageRuntime.simulation.appServers.find(server => server.resourceId === 'server-b').requestsPerSecond, state.stageRuntime.simulation.requestsPerSecond)
  const restored = roundTrip(state)
  assert.deepEqual(restored.campaign.infrastructure, state.campaign.infrastructure)
  assert.equal(restored.stageRuntime.simulation.appServers.length, 2)
})
test('version 4 repairs a paused checkpoint saved before placed server metrics reconciled', () => {
  let state = game.createInitialGameState(builtCampaign(3))
  let campaignState = campaign.placeInventoryResource(
    campaign.addLoadBalancerResource(state.campaign),
    'load-balancer',
  )
  campaignState = campaign.placeInventoryResource(
    campaign.addAdditionalAppServerResource(campaignState),
    'server-b',
  )
  state = { ...state, campaign: campaignState }
  assert.equal(state.stageRuntime.simulation.appServers.length, 1)

  const store = memoryStorage()
  saves.saveGameCheckpoint(state, 0, store)
  const restored = saves.loadCampaignSave(store)
  assert.equal(restored.status, 'ready')
  assert.equal(restored.gameState.stageRuntime.simulation.appServers.length, 2)
  assert.deepEqual(restored.campaign.infrastructure, campaignState.infrastructure)
})
test('Stage 4 warns before deployment time and early campaign economy requires choices', () => {
  assert.equal(campaign.createInitialCampaignState().balance, 160)
  const launch = stages.campaignStageConfigs[3]
  assert.ok(launch.trafficEvents[0].startsAtSecond >= 120)
  assert.ok(launch.trafficEvents[0].startsAtSecond > 20 + 30)
  assert.equal(baseConfig.additionalAppServerConfig.initialTierId, 'small')
})
test('localized player copy uses natural time terms', () => {
  for (const [language, catalog] of Object.entries(s.translations.translations)) {
    for (const [key, message] of Object.entries(catalog)) {
      assert.doesNotMatch(message, /game[ -](?:time|seconds?|minutes?)|ثانية لعب|ثواني لعب|وقت اللعبة|وقت لعب|من اللعب/i,
        `${language}.${key} uses an obsolete time term`)
    }
  }
  assert.equal(s.translations.translate('ar', 'resource.deploymentRemaining', { seconds: 8 }), 'متبقي 8 ثوانٍ')
  assert.equal(s.translations.translate('en', 'metric.gameTime'), 'Time')
  assert.equal(s.translations.translate('ar', 'metric.duration'), 'المدة')
})
test('Stage 4 upgrade costs more and a prepared two-server launch still earns three stars', () => {
  assert.equal(baseConfig.getServerUpgradeCost(3), 100)
  assert.equal(baseConfig.getServerUpgradeCost(4), 120)
  assert.equal(baseConfig.getServerUpgradeCost(5), 100)

  let campaignState = builtCampaign(3)
  campaignState = {
    ...campaignState,
    balance: baseConfig.campaignProgressionConfig.minimumBalanceByStage[3],
    infrastructure: {
      ...campaignState.infrastructure,
      resources: campaignState.infrastructure.resources.map(resource =>
        resource.id === 'server' ? { ...resource, tierId: 'medium' } : resource,
      ),
    },
  }
  let state = game.dismissStageBriefing(game.createInitialGameState(campaignState))
  state = game.beginLoadBalancerDeployment(state)
  state = game.advanceGameState(state, baseConfig.loadBalancerResourceConfig.deploymentDurationSeconds)
  state = game.placePurchasedResource(state, 'load-balancer')
  state = game.disconnectInfrastructure(state, ['users-server'])
  state = game.connectInfrastructure(state, 'users', 'load-balancer')
  state = game.connectInfrastructure(state, 'load-balancer', 'server')
  state = game.beginAdditionalAppServerDeployment(state)
  state = game.advanceGameState(state, baseConfig.additionalAppServerConfig.deploymentDurationSeconds)
  state = game.placePurchasedResource(state, 'server-b')
  state = game.connectInfrastructure(state, 'load-balancer', 'server-b')
  state = game.connectInfrastructure(state, 'server-b', 'database')

  const beforeUpgrade = state.stageRuntime.simulation.balance
  state = game.beginServerUpgrade(state, 'server-b')
  assert.equal(state.stageRuntime.simulation.serverDeployment?.cost, 120)
  assert.equal(state.stageRuntime.simulation.balance, beforeUpgrade - 120)
  assert.ok(state.stageRuntime.simulation.balance > 0)
  state = game.advanceGameState(state, baseConfig.serverUpgradeConfig.deploymentDurationSeconds)
  assert.equal(state.campaign.infrastructure.resources.find(resource => resource.id === 'server-b').tierId, 'medium')

  while (state.stageRuntime.status === 'playing' && state.stageRuntime.simulation.gameTimeSeconds < 450) {
    state = game.advanceGameState(state)
  }
  assert.equal(state.stageRuntime.status, 'stage-won')
  assert.equal(state.stageRuntime.stageRating?.stars, 3)
  assert.ok(state.stageRuntime.simulation.balance >= 90)

  const formatCredits = s.creditPresentation.formatCredits
  assert.equal(formatCredits(1151.9397575), '1151.9')
  assert.equal(formatCredits(82.53512225), '82.5')
  assert.equal(formatCredits(-0.001), '0')
  const arabic = {
    language: 'ar',
    direction: 'rtl',
    setLanguage: () => {},
    t: (key, variables) => s.translations.translate('ar', key, variables),
  }
  const resultHtml = renderToStaticMarkup(createElement(s.LanguageContext.Provider, { value: arabic },
    createElement(s.GameStateOverlay, {
      status: state.stageRuntime.status,
      reason: null,
      simulation: state.stageRuntime.simulation,
      stage: stages.campaignStageConfigs[3],
      stageRating: state.stageRuntime.stageRating,
      stageStatistics: state.stageRuntime.statistics,
      campaign: state.campaign,
      hasNextStage: true,
      onRestartStage: () => {},
      onRestartCampaign: () => {},
      onContinueToNextStage: () => {},
    }),
  ))
  assert.match(resultHtml, /المدة/)
  assert.match(resultHtml, /رصيد/)
  assert.ok(resultHtml.includes(`${formatCredits(state.stageRuntime.statistics.totalInfrastructureCost)} cr`))
  assert.ok(resultHtml.includes(`${formatCredits(state.stageRuntime.simulation.balance)} cr`))
  assert.doesNotMatch(resultHtml, /game seconds|ثانية لعب|\d+\.\d{2,} cr/i)
})
test('Stage 5 identifies database pressure while application compute still has room', () => {
  let graph = builtCampaign(4)
  graph = { ...graph, infrastructure: { ...graph.infrastructure, resources: graph.infrastructure.resources.map(resource => resource.type === 'app-server' ? { ...resource, tierId: 'medium' } : resource) } }
  graph = campaign.placeInventoryResource(campaign.addLoadBalancerResource(graph), 'load-balancer')
  graph = campaign.disconnectCampaignResources(graph, ['users-server'])
  graph = campaign.connectCampaignResources(graph, 'users', 'load-balancer')
  graph = campaign.connectCampaignResources(graph, 'load-balancer', 'server')
  graph = campaign.placeInventoryResource(campaign.addAdditionalAppServerResource(graph), 'server-b')
  graph = { ...graph, infrastructure: { ...graph.infrastructure, resources: graph.infrastructure.resources.map(resource => resource.id === 'server-b' ? { ...resource, tierId: 'medium' } : resource) } }
  graph = campaign.connectCampaignResources(graph, 'load-balancer', 'server-b')
  graph = campaign.connectCampaignResources(graph, 'server-b', 'database')
  const state = game.createInitialGameState(graph)
  const hint = s.hintSimulation.getContextualHint(state.stageRuntime.simulation, stages.campaignStageConfigs[4])

  assert.equal(state.stageRuntime.simulation.appServers.some(server => server.isOverloaded), false)
  assert.ok(state.stageRuntime.simulation.database.utilization >= 0.7)
  assert.equal(hint.key, 'advanced.databaseCompareHint')
  assert.match(s.translations.translate('ar', hint.key), /قاعدة البيانات/)
})
test('Stage 6 cache preparation still requires explicit placement and connections', () => {
  let state = ready(5)
  const originalConnections = structuredClone(state.campaign.infrastructure.connections)
  state = game.beginAdvancedResourceDeployment(state, 'cache')
  state = game.advanceGameState(state, config.advancedResourceConfigs.cache.deploymentDurationSeconds)
  assert.equal(state.campaign.inventory.some(resource => resource.type === 'cache'), true)
  assert.equal(state.campaign.infrastructure.resources.some(resource => resource.type === 'cache'), false)
  state = game.placePurchasedResource(state, 'cache')
  assert.equal(state.campaign.infrastructure.resources.some(resource => resource.type === 'cache'), true)
  assert.deepEqual(state.campaign.infrastructure.connections, originalConnections)
  assert.deepEqual(roundTrip(state).campaign.infrastructure, state.campaign.infrastructure)
})
test('new deployments avoid existing nodes without moving existing positions', () => {
  const initial = builtCampaign(9)
  const expanded = expandedCampaign()
  for (const resource of initial.infrastructure.resources) assert.deepEqual(expanded.infrastructure.resources.find(r => r.id === resource.id).position, resource.position)
  assert.ok(expanded.infrastructure.resources.find(r => r.id === 'load-balancer').position.y >= 0)
  assert.ok(expanded.infrastructure.resources.find(r => r.id === 'server-b').position.y >= 0)
  const resources = expanded.infrastructure.resources
  for (let i = 0; i < resources.length; i++) for (let j = i + 1; j < resources.length; j++) {
    const a = resources[i].position, b = resources[j].position
    assert.ok(Math.abs(a.x - b.x) >= config.resourcePlacementConfig.minimumHorizontalGap || Math.abs(a.y - b.y) >= config.resourcePlacementConfig.minimumVerticalGap)
  }
})
test('dragging each advanced node repeatedly preserves infrastructure identities and connections', () => {
  let state = game.createInitialGameState(expandedCampaign())
  const original = structuredClone(state.campaign.infrastructure)
  for (let repeat = 0; repeat < 5; repeat++) for (const resource of original.resources) {
    state = game.moveCampaignResources(state, [{ id: resource.id, position: { x: repeat * 15, y: repeat * 22 } }])
    assert.deepEqual(state.campaign.infrastructure.connections, original.connections)
    assert.deepEqual(state.campaign.infrastructure.resources.map(({ position: _position, ...r }) => r), original.resources.map(({ position: _position, ...r }) => r))
  }
  assert.deepEqual(roundTrip(state).campaign.infrastructure, state.campaign.infrastructure)
  assert.deepEqual(game.restartStage(state).campaign.infrastructure, original)
})
test('campaign transitions preserve advanced resources, data and positions, resetting temporary events', () => {
  const initial = { ...expandedCampaign(8), storedData: { localObjects: 0, storedObjects: 123 }, databaseData: { revision: 100, backupRevision: 60, secondsSinceBackup: 5, dataLost: false } }
  let state = game.createInitialGameState(initial)
  state = { ...state, stageRuntime: { ...state.stageRuntime, status: 'stage-won', stageRating: { stars: 3, explanations: [] } } }
  const next = game.continueToNextStage(state)
  assert.equal(next.campaign.currentStageIndex, 9)
  assert.deepEqual(next.campaign.infrastructure, state.campaign.infrastructure)
  assert.deepEqual(next.campaign.storedData, initial.storedData)
  assert.deepEqual(next.campaign.databaseData, initial.databaseData)
  assert.equal(next.stageRuntime.simulation.gameTimeSeconds, 0)
  assert.equal(next.stageRuntime.simulation.queue.depth, 0)
  assert.equal(next.stageRuntime.infrastructureDeployment, null)
  assert.equal(next.campaign.balance, 400)
})
test('new connection rules accept every supported pair and reject invalid direction with bilingual feedback', () => {
  const initial = expandedCampaign().infrastructure
  const graph = { ...initial, connections: [] }
  for (const rule of s.connectionValidation.campaignConnectionRules) {
    const source = graph.resources.find(r => r.type === rule.sourceType)
    const target = graph.resources.find(r => r.type === rule.targetType)
    assert.equal(s.connectionValidation.validateCampaignConnection(graph, source.id, target.id).valid, true)
  }
  const invalid = s.connectionValidation.validateCampaignConnection(graph, 'database', 'users')
  assert.equal(invalid.valid, false)
  for (const language of ['en', 'ar']) assert.ok(s.translations.translate(language, invalid.explanation.key).length > 10)
  assert.equal(campaign.connectCampaignResources(expandedCampaign(), 'database', 'users').infrastructure.connections.length, initial.connections.length)
})
test('invalid connections identify the attempted pair and teach the specific useful path', () => {
  const graph = { ...expandedCampaign().infrastructure, connections: [] }
  const cases = [
    ['cache', 'users', 'connection.fromCache', 'connection.tryAppCacheDatabase'],
    ['users', 'database', 'connection.usersDatabase', 'connection.tryUsersAppDatabase'],
    ['server', 'worker', 'connection.appServerWorker', 'connection.tryAppQueueWorker'],
    ['queue', 'database', 'connection.fromQueue', 'connection.tryAppQueueWorker'],
  ]

  for (const [sourceId, targetId, key, suggestionKey] of cases) {
    const result = s.connectionValidation.validateCampaignConnection(graph, sourceId, targetId)
    assert.equal(result.valid, false)
    assert.equal(result.explanation.key, key)
    assert.equal(result.explanation.suggestionKey, suggestionKey)
    assert.ok(result.explanation.attempted)
    for (const language of ['en', 'ar']) {
      assert.ok(s.translations.translate(language, result.explanation.key).length > 20)
      if (suggestionKey) assert.match(s.translations.translate(language, suggestionKey), /→/)
    }
  }

  assert.equal(s.connectionValidation.validateCampaignConnection(graph, 'server', 'queue').valid, true)
  assert.equal(s.connectionValidation.validateCampaignConnection(graph, 'queue', 'worker').valid, true)
})
test('edge handles choose the shortest sensible node sides and remain derived after save', () => {
  assert.deepEqual(
    s.infrastructureData.getConnectionHandles({ x: 0, y: 0 }, { x: 400, y: 20 }),
    {
      sourceHandle: 'source-right',
      targetHandle: 'target-left',
      sourcePosition: 'right',
      targetPosition: 'left',
    },
  )
  assert.deepEqual(
    s.infrastructureData.getConnectionHandles({ x: 100, y: 500 }, { x: 80, y: 0 }),
    {
      sourceHandle: 'source-top',
      targetHandle: 'target-bottom',
      sourcePosition: 'top',
      targetPosition: 'bottom',
    },
  )

  const state = roundTrip(ready())
  const before = s.infrastructureData.createInfrastructureEdges(state.campaign.infrastructure)
  const movedCampaign = campaign.updateResourcePositions(
    state.campaign,
    [{ id: 'database', position: { x: 670, y: -500 } }],
  )
  const restored = roundTrip({ ...state, campaign: movedCampaign })
  const after = s.infrastructureData.createInfrastructureEdges(restored.campaign.infrastructure)
  assert.equal(before.find(edge => edge.id === 'server-database').sourceHandle, 'source-right')
  assert.equal(after.find(edge => edge.id === 'server-database').sourceHandle, 'source-top')
  assert.equal(after.find(edge => edge.id === 'server-database').targetHandle, 'target-bottom')
})
test('connection handles provide forgiving four-side targets for every required resource path', () => {
  assert.deepEqual(campaign.infrastructureHandleSides, [
    'top',
    'right',
    'bottom',
    'left',
  ])
  assert.ok(s.infrastructureData.infrastructureHandleInteraction.hitAreaPixels >= 24)
  assert.ok(
    s.infrastructureData.infrastructureHandleInteraction.connectionRadiusPixels >=
      s.infrastructureData.infrastructureHandleInteraction.hitAreaPixels,
  )
  for (const [target, sourceHandle, targetHandle] of [
    [{ x: 100, y: 0 }, 'source-right', 'target-left'],
    [{ x: -100, y: 0 }, 'source-left', 'target-right'],
    [{ x: 0, y: 100 }, 'source-bottom', 'target-top'],
    [{ x: 0, y: -100 }, 'source-top', 'target-bottom'],
  ]) {
    const handles = s.infrastructureData.getConnectionHandles({ x: 0, y: 0 }, target)
    assert.equal(handles.sourceHandle, sourceHandle)
    assert.equal(handles.targetHandle, targetHandle)
  }

  const graph = { ...expandedCampaign().infrastructure, connections: [] }
  for (const [sourceId, targetId] of [
    ['users', 'server'],
    ['load-balancer', 'server'],
    ['server', 'database'],
    ['server', 'cache'],
    ['server', 'queue'],
    ['queue', 'worker'],
  ]) {
    assert.equal(
      s.connectionValidation.validateCampaignConnection(
        graph,
        sourceId,
        targetId,
      ).valid,
      true,
      `${sourceId} -> ${targetId} should remain semantically valid`,
    )
  }
})
test('manual handle sides survive movement, reconnection, and save reload', () => {
  let graph = campaign.disconnectCampaignResources(expandedCampaign(), [
    'server-cache',
  ])
  graph = campaign.connectCampaignResources(graph, 'server', 'cache', {
    sourceHandle: 'source-left',
    targetHandle: 'target-right',
  })
  graph = campaign.updateResourcePositions(graph, [
    { id: 'server', position: { x: 900, y: 40 } },
    { id: 'cache', position: { x: 100, y: 40 } },
  ])

  let restored = roundTrip(game.createInitialGameState(graph))
  let edge = s.infrastructureData
    .createInfrastructureEdges(restored.campaign.infrastructure)
    .find((item) => item.id === 'server-cache')
  assert.equal(edge.sourceHandle, 'source-left')
  assert.equal(edge.targetHandle, 'target-right')

  restored = game.reconnectInfrastructure(
    restored,
    'server-cache',
    'server',
    'cache',
    { sourceHandle: 'source-bottom', targetHandle: 'target-top' },
  )
  restored = roundTrip(restored)
  edge = s.infrastructureData
    .createInfrastructureEdges(restored.campaign.infrastructure)
    .find((item) => item.id === 'server-cache')
  assert.equal(edge.sourceHandle, 'source-bottom')
  assert.equal(edge.targetHandle, 'target-top')
})
test('advanced resource teaching appears before scoring and covers metrics, paths, and tradeoffs', () => {
  const cacheStage = stages.campaignStageConfigs[5]
  const queueStage = stages.campaignStageConfigs[6]
  const storageStage = stages.campaignStageConfigs[7]
  assert.ok(cacheStage.tutorialSteps.some(step => step.messageKey === 'advanced.cacheIntro'))
  assert.deepEqual(
    queueStage.tutorialSteps.map(step => step.messageKey),
    ['advanced.stage7Story', 'advanced.queueIntro', 'advanced.workerIntro', 'advanced.queueMetricsIntro'],
  )
  assert.ok(storageStage.tutorialSteps.some(step => step.messageKey === 'advanced.storageIntro'))

  for (const language of ['en', 'ar']) {
    assert.match(s.translations.translate(language, 'advanced.queueIntro'), /SQS/)
    assert.match(s.translations.translate(language, 'advanced.queueMetricsIntro'), /Queue Depth/)
    assert.match(s.translations.translate(language, 'advanced.queueMetricsIntro'), /Processing Rate/)
    assert.match(s.translations.translate(language, 'advanced.cacheIntro'), /App Server → Cache → Database/)
    assert.match(s.translations.translate(language, 'advanced.storageIntro'), /App Server → Object Storage/)
  }
})
test('failed app servers stop receiving traffic and recover without resource loss', () => {
  const infra = campaign.createTrafficInfrastructure(expandedCampaign())
  const profile = { ...stages.campaignStageConfigs[0].trafficProfile, failures: [{ id: 'failure', resourceId: 'server', startsAtSecond: 1, durationSeconds: 2 }] }
  let state = traffic.createInitialTrafficState({ infrastructure: infra, trafficProfile: profile })
  state = traffic.advanceTrafficSimulation(state, 1, profile, 1, infra)
  assert.equal(state.appServers.find(server => server.resourceId === 'server').isAvailable, false)
  assert.equal(state.appServers.find(server => server.resourceId === 'server').requestsPerSecond, 0)
  assert.equal(state.appServers.reduce((sum, server) => sum + server.requestsPerSecond, 0), state.requestsPerSecond)
  state = traffic.advanceTrafficSimulation(state, 2, profile, 1, infra)
  assert.ok(state.appServers.every(server => server.isAvailable))
})
test('empty guided campaign starts with zero application latency', () => {
  assert.equal(game.createInitialGameState().stageRuntime.simulation.applicationLatencyMs, 0)
})

test('checkpoint retains paid server upgrade, pause, time and original retry snapshot', () => {
  let state = ready()
  state = game.advanceGameState(state, 12)
  state = game.beginServerUpgrade(state, 'server')
  state = game.advanceGameState(state, 8)
  state = roundTrip(state, 0)
  assert.equal(state.stageRuntime.simulation.gameTimeSeconds, 20)
  assert.equal(state.campaign.balance, 400)
  assert.equal(game.advanceGameState(state, 0), state)
  const completed = game.advanceGameState(state, 22)
  assert.equal(completed.campaign.infrastructure.resources.find(r => r.id === 'server').tierId, 'medium')
  assert.deepEqual(game.restartStage(state).campaign, state.stageStartSnapshot)
  assert.equal(game.restartStage(state).campaign.balance, 500)
})
test('checkpoint retains advanced deployment across continue and charges no second cost', () => {
  let state = game.beginAdvancedResourceDeployment(ready(5), 'cache')
  state = game.advanceGameState(state, 10)
  const uninterrupted = game.advanceGameState(state, 15)
  state = roundTrip(state, 2)
  assert.equal(state.campaign.balance, 445)
  state = game.advanceGameState(state, 15)
  assert.equal(state.campaign.inventory.filter(r => r.type === 'cache').length, 1)
  assert.equal(state.campaign.infrastructure.resources.filter(r => r.type === 'cache').length, 0)
  assert.deepEqual(state, uninterrupted)
})
test('checkpoints cover every campaign stage, seeded events and incident state', () => {
  for (let stageIndex = 0; stageIndex < 10; stageIndex++) {
    let state = ready(stageIndex)
    state = game.advanceGameState(state, 140)
    roundTrip(state, 4)
  }
  let state = game.dismissStageBriefing(game.createInitialGameState(expandedCampaign()))
  state = game.configureDatabaseBackups(state, { enabled: true, frequencySeconds: 60 })
  state = game.advanceGameState(state, 180)
  state = game.beginDatabaseRestore(state)
  assert.equal(state.stageRuntime.simulation.databaseData.dataLost, true)
  roundTrip(state)
})
test('save preserves game over, which remains stopped on continue', () => {
  let state = ready()
  state = { ...state, campaign: { ...state.campaign, balance: 0 }, stageRuntime: { ...state.stageRuntime, simulation: { ...state.stageRuntime.simulation, balance: 0 } } }
  state = game.advanceGameState(state)
  assert.equal(state.stageRuntime.status, 'game-over')
  const loaded = roundTrip(state)
  assert.equal(game.advanceGameState(loaded, 100), loaded)
})
test('legacy schema 1 and 2 saves migrate safely without pretending to contain a checkpoint', () => {
  for (const version of [1, 2]) {
    const store = memoryStorage()
    store.setItem(saves.campaignSaveKey, JSON.stringify({ version, campaign: builtCampaign() }))
    const loaded = saves.loadCampaignSave(store)
    assert.equal(loaded.status, 'ready')
    assert.equal(loaded.gameState, undefined)
    assert.ok(game.createInitialGameState(loaded.campaign))
  }
})
test('schema 3 saves migrate campaign and retry snapshots with an empty inventory', () => {
  const store = memoryStorage()
  const state = ready(3)
  const legacyCampaign = structuredClone(state.campaign)
  const legacySnapshot = structuredClone(state.stageStartSnapshot)
  delete legacyCampaign.inventory
  delete legacySnapshot.inventory
  store.setItem(saves.campaignSaveKey, JSON.stringify({
    version: 3,
    campaign: legacyCampaign,
    checkpoint: {
      stageRuntime: state.stageRuntime,
      stageStartSnapshot: legacySnapshot,
      gameSpeed: 0,
    },
  }))
  const loaded = saves.loadCampaignSave(store)
  assert.equal(loaded.status, 'ready')
  assert.deepEqual(loaded.campaign.inventory, [])
  assert.deepEqual(loaded.gameState.stageStartSnapshot.inventory, [])
})
test('save and continue preserve an intentionally incomplete player topology', () => {
  let state = game.createInitialGameState(expandedCampaign(9))
  state = game.disconnectInfrastructure(state, ['load-balancer-server-b'])
  const loaded = roundTrip(state)
  assert.deepEqual(loaded.campaign.infrastructure, state.campaign.infrastructure)
  assert.equal(loaded.campaign.infrastructure.connections.some(connection => connection.id === 'load-balancer-server-b'), false)
})
test('corrupt runtime checkpoints are rejected without crashing or silently discarding deployment', () => {
  const corruptions = [
    value => { delete value.checkpoint.stageRuntime.simulation.queue },
    value => { value.checkpoint.stageRuntime.simulation.customerSatisfaction = 101 },
    value => { value.checkpoint.stageRuntime.simulation.balance = -1 },
    value => { value.checkpoint.stageRuntime.simulation.appServers[0].tierId = 'huge' },
    value => { value.checkpoint.stageRuntime.simulation.satisfactionReason = { key: 'invalid' } },
    value => { value.checkpoint.stageStartSnapshot.currentStageIndex = 4 },
    value => { value.checkpoint.gameSpeed = 99 },
    value => { value.checkpoint.stageRuntime.status = 'invalid' },
    value => { value.checkpoint.stageRuntime.simulation.serverDeployment = { cost: 0 } },
  ]
  for (const corrupt of corruptions) {
    const store = memoryStorage()
    saves.saveGameCheckpoint(ready(), 0, store)
    const data = JSON.parse(store.getItem(saves.campaignSaveKey))
    corrupt(data)
    store.setItem(saves.campaignSaveKey, JSON.stringify(data))
    assert.equal(saves.loadCampaignSave(store).status, 'corrupt')
  }
})
test('storage denial is nonfatal and does not claim a successful save', () => {
  const denied = { getItem() { throw new Error('denied') }, setItem() { throw new Error('quota') }, removeItem() { throw new Error('denied') } }
  assert.equal(saves.saveGameCheckpoint(ready(), 1, denied), false)
  assert.equal(saves.loadCampaignSave(denied).status, 'corrupt')
})

test('stage complete checkpoint retains results and continues with the same infrastructure', () => {
  const won = game.advanceGameState(
    game.beginServerUpgrade(ready(), 'server'),
    stages.prototypeStageConfig.primaryObjective.durationSeconds,
  )
  assert.equal(won.stageRuntime.status, 'stage-won')
  const loaded = roundTrip(won)
  const next = game.continueToNextStage(loaded)
  assert.equal(next.campaign.currentStageIndex, 1)
  assert.deepEqual(next.campaign.infrastructure, won.campaign.infrastructure)
})
