import type {
  CampaignInfrastructureState,
  CampaignResourceType,
} from './campaignSimulation'

export type StageOneBuildStepId =
  | 'place-users'
  | 'place-app-server'
  | 'connect-users-app-server'
  | 'place-database'
  | 'connect-app-server-database'
  | 'complete'

export type StageOneBuildStep = {
  id: StageOneBuildStepId
  stepNumber: number
  totalSteps: number
  title: string
  explanation: string
  arabicTitle: string
  arabicExplanation: string
  resourceToPlace?: Extract<
    CampaignResourceType,
    'users' | 'app-server' | 'database'
  >
}

const totalSteps = 5

export function getStageOneBuildStep(
  infrastructure: CampaignInfrastructureState,
): StageOneBuildStep {
  const users = infrastructure.resources.find(
    (resource) => resource.type === 'users',
  )
  if (!users) {
    return {
      id: 'place-users',
      stepNumber: 1,
      totalSteps,
      title: 'Place Users',
      explanation:
        'Users represent people using the product and generating requests.',
      arabicTitle: 'ضع المستخدمين',
      arabicExplanation:
        'يمثل المستخدمون الأشخاص الذين يستخدمون المنتج ويولّدون الطلبات.',
      resourceToPlace: 'users',
    }
  }

  const appServer = infrastructure.resources.find(
    (resource) => resource.type === 'app-server',
  )
  if (!appServer) {
    return {
      id: 'place-app-server',
      stepNumber: 2,
      totalSteps,
      title: 'Place App Server',
      explanation:
        'The App Server receives and processes application requests.',
      arabicTitle: 'ضع خادم التطبيق',
      arabicExplanation:
        'يستقبل خادم التطبيق طلبات التطبيق ويعالجها.',
      resourceToPlace: 'app-server',
    }
  }

  const usersToAppServer = infrastructure.connections.some(
    (connection) =>
      connection.sourceId === users.id &&
      connection.targetId === appServer.id,
  )
  if (!usersToAppServer) {
    return {
      id: 'connect-users-app-server',
      stepNumber: 3,
      totalSteps,
      title: 'Connect Users → App Server',
      explanation:
        'Drag from a connection point on Users to a connection point on the App Server.',
      arabicTitle: 'صِل المستخدمين بخادم التطبيق',
      arabicExplanation:
        'اسحب من نقطة اتصال المستخدمين إلى نقطة اتصال خادم التطبيق.',
    }
  }

  const database = infrastructure.resources.find(
    (resource) => resource.type === 'database',
  )
  if (!database) {
    return {
      id: 'place-database',
      stepNumber: 4,
      totalSteps,
      title: 'Place Database',
      explanation: 'The Database stores persistent application data.',
      arabicTitle: 'ضع قاعدة البيانات',
      arabicExplanation: 'تخزن قاعدة البيانات بيانات التطبيق الدائمة.',
      resourceToPlace: 'database',
    }
  }

  const appServerToDatabase = infrastructure.connections.some(
    (connection) =>
      connection.sourceId === appServer.id &&
      connection.targetId === database.id,
  )
  if (!appServerToDatabase) {
    return {
      id: 'connect-app-server-database',
      stepNumber: 5,
      totalSteps,
      title: 'Connect App Server → Database',
      explanation:
        'Connect the application to the data it needs to store and retrieve.',
      arabicTitle: 'صِل خادم التطبيق بقاعدة البيانات',
      arabicExplanation:
        'صِل التطبيق بالبيانات التي يحتاج إلى تخزينها واسترجاعها.',
    }
  }

  return {
    id: 'complete',
    stepNumber: totalSteps,
    totalSteps,
    title: 'Infrastructure ready',
    explanation:
      'The request path is complete. The service can now begin handling traffic.',
    arabicTitle: 'البنية التحتية جاهزة',
    arabicExplanation:
      'اكتمل مسار الطلب. يمكن للخدمة الآن بدء معالجة حركة البيانات.',
  }
}

export function isStageOneBuildComplete(
  infrastructure: CampaignInfrastructureState,
) {
  return getStageOneBuildStep(infrastructure).id === 'complete'
}
