import type { TranslationKey } from '../i18n/translations'
import { customerSentimentConfig } from './config'

export type CustomerSentimentId =
  | 'very-happy'
  | 'happy'
  | 'neutral'
  | 'unhappy'
  | 'angry'

export type CustomerSentiment = {
  id: CustomerSentimentId
  emoji: string
  labelKey: TranslationKey
  minimumSatisfaction: number
}

const sentiments: readonly CustomerSentiment[] = [
  {
    id: 'very-happy',
    emoji: '😄',
    labelKey: 'sentiment.veryHappy',
    minimumSatisfaction: customerSentimentConfig.veryHappyMinimum,
  },
  {
    id: 'happy',
    emoji: '🙂',
    labelKey: 'sentiment.happy',
    minimumSatisfaction: customerSentimentConfig.happyMinimum,
  },
  {
    id: 'neutral',
    emoji: '😐',
    labelKey: 'sentiment.neutral',
    minimumSatisfaction: customerSentimentConfig.neutralMinimum,
  },
  {
    id: 'unhappy',
    emoji: '😕',
    labelKey: 'sentiment.unhappy',
    minimumSatisfaction: customerSentimentConfig.unhappyMinimum,
  },
  {
    id: 'angry',
    emoji: '😠',
    labelKey: 'sentiment.angry',
    minimumSatisfaction: 0,
  },
]

export function getCustomerSentiment(satisfaction: number) {
  const bounded = Math.min(100, Math.max(0, satisfaction))
  return sentiments.find(
    (sentiment) => bounded >= sentiment.minimumSatisfaction,
  ) ?? sentiments[sentiments.length - 1]
}

/** Objectives use the state whose lower bound contains their numeric target. */
export function getRequiredCustomerSentiment(minimumSatisfaction: number) {
  return getCustomerSentiment(minimumSatisfaction)
}
