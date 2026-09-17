import type { CampaignResourceType } from '../simulation/campaignSimulation'

export type StageOnePaletteResource = {
  type: Extract<CampaignResourceType, 'users' | 'app-server' | 'database'>
  id: string
  englishName: string
  arabicName: string
  description: string
  position: { x: number; y: number }
}

export const stageOneResourcePalette: readonly StageOnePaletteResource[] = [
  {
    type: 'users',
    id: 'users',
    englishName: 'Users',
    arabicName: 'المستخدمون',
    description: 'People sending requests to your application.',
    position: { x: 80, y: 250 },
  },
  {
    type: 'app-server',
    id: 'server',
    englishName: 'App Server',
    arabicName: 'خادم التطبيق',
    description: 'Runs the application logic and processes requests.',
    position: { x: 420, y: 250 },
  },
  {
    type: 'database',
    id: 'database',
    englishName: 'Database',
    arabicName: 'قاعدة البيانات',
    description: 'Stores persistent application data.',
    position: { x: 760, y: 250 },
  },
]
