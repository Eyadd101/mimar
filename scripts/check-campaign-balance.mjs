import { runnerImport } from 'vite'
const { module: { gameStateSimulation: game, campaignSimulation: campaign } } = await runnerImport(new URL('../tests/simulationHarness.ts', import.meta.url).pathname, { root: process.cwd(), logLevel: 'silent' })

function runCampaign(seed, cacheStrategy) {
  let state = game.createInitialGameState(campaign.createInitialCampaignState(seed))
  for (const type of ['users', 'app-server', 'database']) state = game.placeStageOneResource(state, type)
  state = game.connectStageOneResources(state, 'users', 'server')
  state = game.connectStageOneResources(state, 'server', 'database')
  const rows = []
  for (let stageIndex = 0; stageIndex < 10; stageIndex++) {
    state = game.dismissStageBriefing(state)
    for (let tick = 0; tick < 900 && state.stageRuntime.status === 'playing'; tick++) {
      const time = state.stageRuntime.simulation.gameTimeSeconds
      if (stageIndex === 0 && time >= 150) state = game.beginServerUpgrade(state, 'server')
      if (stageIndex >= 3) {
        state = game.beginLoadBalancerDeployment(state)
        state = game.beginAdditionalAppServerDeployment(state)
      }
      if (stageIndex === 4) state = game.beginDatabaseUpgrade(state)
      if (stageIndex >= 5 && cacheStrategy) {
        state = game.beginAdvancedResourceDeployment(state, 'cache')
        if (state.campaign.infrastructure.resources.some(r => r.type === 'cache')) state = game.beginDatabaseDownsize(state)
      }
      if (stageIndex >= 6) {
        state = game.beginAdvancedResourceDeployment(state, 'queue')
        state = game.beginAdvancedResourceDeployment(state, 'worker')
      }
      if (stageIndex >= 7) state = game.beginAdvancedResourceDeployment(state, 'object-storage')
      if (stageIndex >= 8 && time >= 10) for (const risk of ['publicDatabase', 'weakCredentials', 'excessivePermissions', 'openNetwork']) state = game.configureDatabaseSecurity(state, risk, false)
      if (stageIndex >= 9) {
        state = game.configureDatabaseBackups(state, { enabled: true, frequencySeconds: 60 })
        state = game.beginDatabaseRestore(state)
      }
      state = game.advanceGameState(state)
    }
    const simulation = state.stageRuntime.simulation
    rows.push({ stage: stageIndex + 1, outcome: state.stageRuntime.status, time: simulation.gameTimeSeconds, balance: Math.round(simulation.balance), satisfaction: Math.round(simulation.customerSatisfaction), latency: simulation.applicationLatencyMs, cost: simulation.infrastructureCostPerPeriod.toFixed(1) })
    if (state.stageRuntime.status !== 'stage-won') break
    state = game.continueToNextStage(state)
  }
  return rows
}

let failures = 0
const sweep = process.argv.includes('--sweep')
const seeds = sweep ? Array.from({ length: 100 }, (_, index) => index + 1) : [47291, 1, 42, 12345]
for (const seed of seeds) {
  for (const cacheStrategy of [false, true]) {
    const rows = runCampaign(seed, cacheStrategy)
    if (!sweep) console.log(`Seed ${seed} · ${cacheStrategy ? 'Cache + Small DB' : 'Medium DB'}`)
    if (!sweep) console.table(rows)
    if (rows.length !== 10 || rows.some(row => row.outcome !== 'stage-won')) failures++
  }
}
console.log(`${seeds.length * 2} campaign playthroughs, ${failures} failures.`)
if (failures) {
  console.error(`${failures} campaign strategies failed.`)
  process.exitCode = 1
}
