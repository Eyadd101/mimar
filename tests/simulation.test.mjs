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
  customerSatisfactionSimulation,
  economySimulation,
  gameStateSimulation,
  simulationClock,
  trafficSimulation,
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
    gameStateSimulation.createInitialGameState(),
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
    gameStateSimulation.createInitialGameState(),
  )

  for (const speed of [1, 2, 4]) {
    const elapsed = simulationClock.calculateTickGameSeconds(speed, true)
    const advanced = gameStateSimulation.advanceGameState(initial, elapsed)
    assert.equal(advanced.stageRuntime.simulation.gameTimeSeconds, speed)
  }
})

test('server upgrade completes only after its game-time duration', () => {
  let state = gameStateSimulation.dismissStageBriefing(
    gameStateSimulation.createInitialGameState(),
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
  const initial = gameStateSimulation.createInitialGameState()
  let changed = gameStateSimulation.moveCampaignResource(
    initial,
    'server',
    { x: 999, y: 999 },
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
    gameStateSimulation.createInitialGameState(),
  )
  state = gameStateSimulation.advanceGameState(state, 269)
  assert.equal(state.stageRuntime.status, 'playing')

  state = gameStateSimulation.advanceGameState(state, 1)
  assert.equal(state.stageRuntime.status, 'stage-won')
})

test('zero balance and sustained zero satisfaction trigger game over', () => {
  const initial = gameStateSimulation.dismissStageBriefing(
    gameStateSimulation.createInitialGameState(),
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
  let state = gameStateSimulation.dismissStageBriefing(
    gameStateSimulation.createInitialGameState(),
  )
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
      connections: [],
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
