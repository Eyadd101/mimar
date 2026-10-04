import assert from 'node:assert/strict'
import test from 'node:test'
import { runnerImport } from 'vite'

const { module: { gameStateSimulation: game, campaignSimulation: campaign, simulationClock, stages, baseConfig, expansionConfig } } = await runnerImport(
  new URL('./simulationHarness.ts', import.meta.url).pathname,
  { root: process.cwd(), logLevel: 'silent' },
)

const strategies = {
  competent: { stageOneUpgrade: 24, stageTwoUpgrade: 0, loadBalancer: 0, secondServerUpgrade: 52, databaseUpgrade: 16, cache: 16 },
  beginner: { stageOneUpgrade: 36, stageTwoUpgrade: 0, loadBalancer: 12, secondServerUpgrade: 84, databaseUpgrade: 36, cache: 36 },
  imperfect: { stageOneUpgrade: null, stageTwoUpgrade: 24, loadBalancer: 24, secondServerUpgrade: 96, databaseUpgrade: 76, cache: 76 },
}

function connectIfMissing(state, sourceId, targetId) {
  return state.campaign.infrastructure.connections.some(
    connection => connection.sourceId === sourceId && connection.targetId === targetId,
  ) ? state : game.connectInfrastructure(state, sourceId, targetId)
}

function placeAndWireInventory(state) {
  for (const resource of [...state.campaign.inventory]) {
    state = game.placePurchasedResource(state, resource.id)
  }
  const has = id => state.campaign.infrastructure.resources.some(resource => resource.id === id)

  if (has('load-balancer')) {
    state = game.disconnectInfrastructure(state, ['users-server'])
    state = connectIfMissing(state, 'users', 'load-balancer')
    state = connectIfMissing(state, 'load-balancer', 'server')
    if (has('server-b')) {
      state = connectIfMissing(state, 'load-balancer', 'server-b')
      state = connectIfMissing(state, 'server-b', 'database')
    }
  }
  if (has('cache')) {
    state = connectIfMissing(state, 'server', 'cache')
    if (has('server-b')) state = connectIfMissing(state, 'server-b', 'cache')
    state = connectIfMissing(state, 'cache', 'database')
  }
  return state
}

function takeStageAction(state, strategy, stageIndex) {
  const time = state.stageRuntime.simulation.gameTimeSeconds
  if (stageIndex === 0 && strategy.stageOneUpgrade !== null && time >= strategy.stageOneUpgrade) {
    state = game.beginServerUpgrade(state, 'server')
  }
  if (stageIndex === 1 && time >= strategy.stageTwoUpgrade) {
    state = game.beginServerUpgrade(state, 'server')
  }
  if (stageIndex === 3 && time >= strategy.loadBalancer) {
    state = game.beginLoadBalancerDeployment(state)
    state = placeAndWireInventory(state)
    state = game.beginAdditionalAppServerDeployment(state)
    state = placeAndWireInventory(state)
    if (time >= strategy.secondServerUpgrade) state = game.beginServerUpgrade(state, 'server-b')
  }
  if (stageIndex === 4 && time >= strategy.databaseUpgrade) {
    state = game.beginDatabaseUpgrade(state)
  }
  if (stageIndex === 5 && time >= strategy.cache) {
    state = game.beginAdvancedResourceDeployment(state, 'cache')
    state = placeAndWireInventory(state)
  }
  return state
}

function runFirstSixStages(strategy, speed = 1, seed = baseConfig.campaignProgressionConfig.defaultCampaignSeed) {
  let state = game.createInitialGameState(campaign.createInitialCampaignState(seed))
  for (const type of ['users', 'app-server', 'database']) state = game.placeStageOneResource(state, type)
  state = game.connectStageOneResources(state, 'users', 'server')
  state = game.connectStageOneResources(state, 'server', 'database')
  const results = []

  for (let stageIndex = 0; stageIndex < 6; stageIndex++) {
    state = game.dismissStageBriefing(state)
    let realTicks = 0
    while (state.stageRuntime.status === 'playing' && realTicks < 250) {
      state = takeStageAction(state, strategy, stageIndex)
      state = game.advanceGameState(state, simulationClock.calculateTickGameSeconds(speed, true))
      realTicks += 1
    }
    results.push({
      stage: stageIndex + 1,
      status: state.stageRuntime.status,
      seconds: state.stageRuntime.simulation.gameTimeSeconds,
      realTicks,
      stars: state.stageRuntime.stageRating?.stars ?? 0,
      balance: Math.round(state.stageRuntime.simulation.balance),
      satisfaction: Math.round(state.stageRuntime.simulation.customerSatisfaction),
      latency: state.stageRuntime.simulation.applicationLatencyMs,
      averageLatency: Math.round(state.stageRuntime.statistics.cumulativeLatencyMs / Math.max(1, state.stageRuntime.statistics.latencySampleCount)),
      eventStatuses: Object.values(state.stageRuntime.trafficEvents).map(event => event.status),
    })
    if (state.stageRuntime.status !== 'stage-won') break
    state = game.continueToNextStage(state)
  }
  return results
}

test('targeted beginner, competent, and recoverable strategies finish the first six stages', () => {
  for (const seed of [baseConfig.campaignProgressionConfig.defaultCampaignSeed, 1, 42]) {
    for (const [name, strategy] of Object.entries(strategies)) {
      const results = runFirstSixStages(strategy, 1, seed)
      if (process.env.CLOUD_GAME_PACING_REPORT === '1' && seed === baseConfig.campaignProgressionConfig.defaultCampaignSeed) console.table(results.map(({ eventStatuses: _eventStatuses, ...row }) => ({ strategy: name, ...row })))
      assert.equal(results.length, 6, `${name} reaches Stage 6 with seed ${seed}`)
      for (const result of results) {
        assert.equal(result.status, 'stage-won', `${name} wins Stage ${result.stage} with seed ${seed}`)
        assert.equal(result.seconds, stages.campaignStageConfigs[result.stage - 1].primaryObjective.durationSeconds)
        assert.ok(result.balance > 0, `${name} remains solvent in Stage ${result.stage}`)
        assert.ok(result.stars >= 1)
        assert.ok(result.eventStatuses.every(status => status === 'completed'))
      }
    }
  }
})

test('early warnings, workload pressure, and deployment windows precede each decision', () => {
  const [firstUsers, marketing, verticalLimit, launch, database, readHeavy] = stages.campaignStageConfigs
  assert.equal(firstUsers.primaryObjective.durationSeconds, 70)
  assert.equal(firstUsers.trafficProfile.initialActiveUsers +
    Math.floor(50 / firstUsers.trafficProfile.activeUserGrowthIntervalSeconds) * firstUsers.trafficProfile.activeUsersAddedPerInterval, 60)
  assert.equal(marketing.trafficEvents[0].startsAtSecond, 20)
  assert.equal(marketing.trafficEvents[0].startsAtSecond + marketing.trafficEvents[0].durationSeconds, 70)
  assert.equal(verticalLimit.primaryObjective.durationSeconds, 110)
  assert.equal(launch.trafficEvents[0].startsAtSecond, 80)
  assert.ok(launch.trafficEvents[0].startsAtSecond >
    baseConfig.loadBalancerResourceConfig.deploymentDurationSeconds +
    baseConfig.additionalAppServerConfig.deploymentDurationSeconds)
  assert.equal(launch.trafficEvents[0].startsAtSecond + launch.trafficEvents[0].durationSeconds, 140)
  assert.equal(database.trafficProfile.initialActiveUsers * database.trafficProfile.requestsPerUserPerSecond * database.trafficProfile.queriesPerRequest, expansionConfig.databaseTierConfigs.small.queryCapacity)
  assert.equal(database.trafficEvents[0].startsAtSecond, 45)
  assert.equal(database.trafficEvents[0].startsAtSecond + database.trafficEvents[0].durationSeconds, 155)
  assert.ok(database.trafficEvents[0].startsAtSecond > expansionConfig.databaseUpgradeConfig.deploymentDurationSeconds)
  assert.equal(readHeavy.trafficEvents[0].startsAtSecond, 45)
  assert.equal(readHeavy.trafficEvents[0].startsAtSecond + readHeavy.trafficEvents[0].durationSeconds, 185)
  assert.ok(readHeavy.trafficEvents[0].startsAtSecond > expansionConfig.advancedResourceConfigs.cache.deploymentDurationSeconds)
  assert.ok(readHeavy.trafficProfile.initialActiveUsers * readHeavy.trafficProfile.requestsPerUserPerSecond * readHeavy.trafficProfile.queriesPerRequest > expansionConfig.databaseTierConfigs.medium.queryCapacity)
  for (const stage of [marketing, launch, database, readHeavy]) {
    const event = stage.trafficEvents[0]
    assert.ok(stage.primaryObjective.durationSeconds - (event.startsAtSecond + event.durationSeconds) <= 15)
  }
})

test('the shared expanded-stage template leaves Stages 7–10 pacing unchanged', () => {
  const laterStages = stages.campaignStageConfigs.slice(6)
  assert.deepEqual(laterStages.map(stage => stage.primaryObjective.durationSeconds), [390, 360, 330, 420])
  assert.deepEqual(laterStages.map(stage => stage.secondaryObjectives.find(objective => objective.id === 'responsive').durationSeconds), [60, 60, 60, 60])
})

test('short stages retain the 30-second revenue and infrastructure-cost cadence', () => {
  let state = game.createInitialGameState(campaign.createInitialCampaignState())
  for (const type of ['users', 'app-server', 'database']) state = game.placeStageOneResource(state, type)
  state = game.connectStageOneResources(state, 'users', 'server')
  state = game.connectStageOneResources(state, 'server', 'database')
  state = game.dismissStageBriefing(state)
  const startingBalance = state.stageRuntime.simulation.balance
  state = game.advanceGameState(state, 29)
  assert.equal(state.stageRuntime.simulation.balance, startingBalance)
  state = game.advanceGameState(state)
  const firstPeriodBalance = state.stageRuntime.simulation.balance
  assert.notEqual(firstPeriodBalance, startingBalance)
  state = game.advanceGameState(state, 29)
  assert.equal(state.stageRuntime.simulation.balance, firstPeriodBalance)
  state = game.advanceGameState(state)
  const secondPeriodBalance = state.stageRuntime.simulation.balance
  assert.notEqual(secondPeriodBalance, firstPeriodBalance)
  state = game.advanceGameState(state, 10)
  assert.equal(state.stageRuntime.status, 'stage-won')
  assert.equal(state.stageRuntime.simulation.balance, secondPeriodBalance)
  assert.equal(baseConfig.appServerResourceConfig.costPeriodSeconds, 30)
})

test('competent choices can still earn three stars in each early stage', () => {
  const results = runFirstSixStages(strategies.competent)
  assert.deepEqual(results.map(result => result.stars), [3, 3, 3, 3, 3, 3])
  const delayed = runFirstSixStages(strategies.imperfect)
  assert.equal(delayed[0].stars, 2, 'unscaled Stage 1 traffic does not earn three stars')
  assert.equal(delayed[4].stars, 2, 'late database recovery does not earn three stars')
  assert.equal(delayed[5].stars, 2, 'late cache recovery does not earn three stars')
})

test('2x and 4x preserve early-stage wins, objective timing, and single event completion', () => {
  for (const speed of [2, 4]) {
    const results = runFirstSixStages(strategies.competent, speed)
    assert.equal(results.length, 6)
    for (const result of results) {
      assert.equal(result.status, 'stage-won', `${speed}x Stage ${result.stage}`)
      assert.equal(result.seconds, stages.campaignStageConfigs[result.stage - 1].primaryObjective.durationSeconds)
      assert.equal(result.realTicks, Math.ceil(result.seconds / speed))
      assert.ok(result.eventStatuses.every(status => status === 'completed'))
    }
  }
})
