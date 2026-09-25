import { runnerImport } from 'vite'
const { module: { gameStateSimulation: game, campaignSimulation: campaign } } = await runnerImport(new URL('../tests/simulationHarness.ts', import.meta.url).pathname, { root: process.cwd(), logLevel: 'silent' })

function connectIfMissing(state, sourceId, targetId) {
  return state.campaign.infrastructure.connections.some(connection => connection.sourceId === sourceId && connection.targetId === targetId)
    ? state
    : game.connectInfrastructure(state, sourceId, targetId)
}

function placeAndConnectPurchasedResources(state) {
  for (const resource of [...state.campaign.inventory]) {
    state = game.placePurchasedResource(state, resource.id)
  }
  const has = id => state.campaign.infrastructure.resources.some(resource => resource.id === id)
  const servers = state.campaign.infrastructure.resources.filter(resource => resource.type === 'app-server')
  if (has('load-balancer')) {
    state = game.disconnectInfrastructure(state, state.campaign.infrastructure.connections.filter(connection => connection.sourceId === 'users' && servers.some(server => server.id === connection.targetId)).map(connection => connection.id))
    state = connectIfMissing(state, 'users', 'load-balancer')
    for (const server of servers) {
      state = connectIfMissing(state, 'load-balancer', server.id)
      state = connectIfMissing(state, server.id, 'database')
    }
  }
  if (has('cache')) {
    for (const server of servers) state = connectIfMissing(state, server.id, 'cache')
    state = connectIfMissing(state, 'cache', 'database')
  }
  if (has('queue')) for (const server of servers) state = connectIfMissing(state, server.id, 'queue')
  if (has('queue') && has('worker')) state = connectIfMissing(state, 'queue', 'worker')
  if (has('object-storage')) for (const server of servers) state = connectIfMissing(state, server.id, 'object-storage')
  return state
}

function runCampaign(seed, strategy) {
  let state = game.createInitialGameState(campaign.createInitialCampaignState(seed))
  for (const type of ['users', 'app-server', 'database']) state = game.placeStageOneResource(state, type)
  state = game.connectStageOneResources(state, 'users', 'server')
  state = game.connectStageOneResources(state, 'server', 'database')
  const rows = []
  for (let stageIndex = 0; stageIndex < 10; stageIndex++) {
    state = game.dismissStageBriefing(state)
    for (let tick = 0; tick < 900 && state.stageRuntime.status === 'playing'; tick++) {
      const time = state.stageRuntime.simulation.gameTimeSeconds
      const actionDelay = strategy === 'delayed-decisions' ? 30 : 0
      if (stageIndex === 0 && time >= 55 + actionDelay) state = game.beginServerUpgrade(state, 'server')
      if (stageIndex >= 3 && time >= actionDelay) {
        state = game.beginLoadBalancerDeployment(state)
        state = placeAndConnectPurchasedResources(state)
        state = game.beginAdditionalAppServerDeployment(state)
        state = placeAndConnectPurchasedResources(state)
        if (stageIndex === 3 && state.campaign.infrastructure.resources.some(resource => resource.id === 'server-b')) {
          state = game.beginServerUpgrade(state, 'server-b')
        }
      }
      if (stageIndex === 4 && time >= actionDelay) state = game.beginDatabaseUpgrade(state)
      if (stageIndex >= 5 && strategy === 'cache-small-db' && time >= actionDelay) {
        state = game.beginAdvancedResourceDeployment(state, 'cache')
        state = placeAndConnectPurchasedResources(state)
        if (state.campaign.infrastructure.resources.some(r => r.type === 'cache') && !state.campaign.inventory.some(r => r.type === 'cache')) state = game.beginDatabaseDownsize(state)
      }
      if (stageIndex >= 6 && time >= actionDelay) {
        state = game.beginAdvancedResourceDeployment(state, 'queue')
        state = placeAndConnectPurchasedResources(state)
        state = game.beginAdvancedResourceDeployment(state, 'worker')
        state = placeAndConnectPurchasedResources(state)
      }
      if (stageIndex >= 7 && time >= actionDelay) {
        state = game.beginAdvancedResourceDeployment(state, 'object-storage')
        state = placeAndConnectPurchasedResources(state)
      }
      if (stageIndex >= 8 && time >= 10) for (const risk of ['publicDatabase', 'weakCredentials', 'excessivePermissions', 'openNetwork']) state = game.configureDatabaseSecurity(state, risk, false)
      if (stageIndex >= 9) {
        state = game.configureDatabaseBackups(state, { enabled: true, frequencySeconds: 60 })
        state = game.beginDatabaseRestore(state)
      }
      state = game.advanceGameState(state)
    }
    const simulation = state.stageRuntime.simulation
    rows.push({ stage: stageIndex + 1, outcome: state.stageRuntime.status, stars: state.stageRuntime.stageRating?.stars ?? 0, time: simulation.gameTimeSeconds, balance: Math.round(simulation.balance), satisfaction: Math.round(simulation.customerSatisfaction), latency: simulation.applicationLatencyMs, cost: simulation.infrastructureCostPerPeriod.toFixed(1) })
    if (state.stageRuntime.status !== 'stage-won') break
    state = game.continueToNextStage(state)
  }
  return rows
}

let failures = 0
const sweep = process.argv.includes('--sweep')
const seeds = sweep ? Array.from({ length: 100 }, (_, index) => index + 1) : [47291, 1, 42, 12345]
const strategies = ['medium-db', 'cache-small-db', 'delayed-decisions']
for (const seed of seeds) {
  for (const strategy of strategies) {
    const rows = runCampaign(seed, strategy)
    if (!sweep) console.log(`Seed ${seed} · ${strategy}`)
    if (!sweep) console.table(rows)
    if (rows.length !== 10 || rows.some(row => row.outcome !== 'stage-won')) failures++
  }
}
console.log(`${seeds.length * strategies.length} campaign playthroughs, ${failures} failures.`)
if (failures) {
  console.error(`${failures} campaign strategies failed.`)
  process.exitCode = 1
}
