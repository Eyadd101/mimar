import { economyConfig } from './config'

export type EconomyState = {
  balance: number
  revenuePerPeriod: number
  infrastructureCostPerPeriod: number
  netCashFlowPerPeriod: number
}

const roundToOneDecimal = (value: number) => Math.round(value * 10) / 10

/**
 * Active users generate potential revenue up to a campaign-scale ceiling.
 * Satisfaction scales how much of that potential revenue is retained:
 * revenue = min(activeUsers * revenuePerUser, maximumRevenue) * satisfaction / 100
 */
export function calculateRevenuePerPeriod(
  activeUsers: number,
  customerSatisfaction: number,
  maximumRevenuePerPeriod: number = economyConfig.maximumRevenuePerPeriod,
) {
  return roundToOneDecimal(
    Math.min(
      Math.max(0, activeUsers) * economyConfig.revenuePerActiveUserPerPeriod,
      maximumRevenuePerPeriod,
    ) *
      (Math.min(100, Math.max(0, customerSatisfaction)) / 100),
  )
}

export function createInitialEconomyState(
  activeUsers: number,
  customerSatisfaction: number,
  infrastructureCostPerPeriod: number,
  initialBalance: number = economyConfig.initialBalance,
  maximumRevenuePerPeriod: number = economyConfig.maximumRevenuePerPeriod,
): EconomyState {
  const revenuePerPeriod = calculateRevenuePerPeriod(
    activeUsers,
    customerSatisfaction,
    maximumRevenuePerPeriod,
  )

  return {
    balance: initialBalance,
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
  maximumRevenuePerPeriod: number = economyConfig.maximumRevenuePerPeriod,
): EconomyState {
  const revenuePerPeriod = calculateRevenuePerPeriod(
    activeUsers,
    customerSatisfaction,
    maximumRevenuePerPeriod,
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
