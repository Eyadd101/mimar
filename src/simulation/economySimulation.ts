import { economyConfig } from './config'

export type EconomyState = {
  balance: number
}

export function createInitialEconomyState(): EconomyState {
  return {
    balance: economyConfig.initialBalance,
  }
}

export function canAffordCost(balance: number, cost: number) {
  return balance >= cost
}

export function deductCost(balance: number, cost: number) {
  return canAffordCost(balance, cost) ? balance - cost : balance
}

export function deductInfrastructureCost(balance: number, cost: number) {
  return Math.max(balance - cost, 0)
}
