import { economyConfig } from './config'

export type EconomyState = {
  balance: number
  revenuePerPeriod: number
  infrastructureCostPerPeriod: number
  netCashFlowPerPeriod: number
}

const roundToOneDecimal = (value: number) => Math.round(value * 10) / 10

/**
 * Healthy users generate the configured revenue each economy period.
 * Satisfaction scales how much of that potential revenue is retained:
 * revenue = activeUsers * revenuePerActiveUserPerPeriod * satisfaction / 100
 */
export function calculateRevenuePerPeriod(
  activeUsers: number,
  customerSatisfaction: number,
) {
  return roundToOneDecimal(
    activeUsers *
      economyConfig.revenuePerActiveUserPerPeriod *
      (customerSatisfaction / 100),
  )
}

export function createInitialEconomyState(
  activeUsers: number,
  customerSatisfaction: number,
  infrastructureCostPerPeriod: number,
): EconomyState {
  const revenuePerPeriod = calculateRevenuePerPeriod(
    activeUsers,
    customerSatisfaction,
  )

  return {
    balance: economyConfig.initialBalance,
    revenuePerPeriod,
    infrastructureCostPerPeriod,
    netCashFlowPerPeriod: roundToOneDecimal(
      revenuePerPeriod - infrastructureCostPerPeriod,
    ),
  }
}

export function advanceEconomy(
  currentState: EconomyState,
  activeUsers: number,
  customerSatisfaction: number,
  infrastructureCostPerPeriod: number,
  periodIsDue: boolean,
): EconomyState {
  const revenuePerPeriod = calculateRevenuePerPeriod(
    activeUsers,
    customerSatisfaction,
  )
  const netCashFlowPerPeriod = roundToOneDecimal(
    revenuePerPeriod - infrastructureCostPerPeriod,
  )
  const balance = periodIsDue
    ? Math.max(
        roundToOneDecimal(currentState.balance + netCashFlowPerPeriod),
        0,
      )
    : currentState.balance

  return {
    balance,
    revenuePerPeriod,
    infrastructureCostPerPeriod,
    netCashFlowPerPeriod,
  }
}

export function canAffordCost(balance: number, cost: number) {
  return balance >= cost
}

export function deductCost(balance: number, cost: number) {
  return canAffordCost(balance, cost) ? balance - cost : balance
}
