import type {
  CampaignInfrastructureState,
  CampaignResourceType,
} from './campaignSimulation'

export type ConnectionExplanation = {
  english: string
  arabic: string
}

export type ConnectionValidationResult =
  | { valid: true; explanation: ConnectionExplanation }
  | { valid: false; explanation: ConnectionExplanation }

type ConnectionRule = {
  sourceType: CampaignResourceType
  targetType: CampaignResourceType
}

const stageOneConnectionRules: readonly ConnectionRule[] = [
  { sourceType: 'users', targetType: 'app-server' },
  { sourceType: 'app-server', targetType: 'database' },
]

const validExplanation: ConnectionExplanation = {
  english: 'Connection created. Requests can follow this path.',
  arabic: 'تم إنشاء الاتصال. يمكن للطلبات المرور عبر هذا المسار.',
}

const invalidPairExplanations: Partial<
  Record<`${CampaignResourceType}->${CampaignResourceType}`, ConnectionExplanation>
> = {
  'users->database': {
    english:
      'Users normally do not connect directly to the database. Requests go through the application server first.',
    arabic:
      'عادةً لا يتصل المستخدم مباشرة بقاعدة البيانات. يرسل المستخدم الطلب إلى التطبيق، ثم يتعامل التطبيق مع قاعدة البيانات.',
  },
  'database->users': {
    english:
      'The database stores application data. It does not send user requests.',
    arabic:
      'تخزن قاعدة البيانات بيانات التطبيق، ولا ترسل طلبات المستخدمين.',
  },
  'database->app-server': {
    english:
      'The application server requests data from the database, so the request path points from the App Server to the Database.',
    arabic:
      'يطلب خادم التطبيق البيانات من قاعدة البيانات، لذلك يتجه مسار الطلب من خادم التطبيق إلى قاعدة البيانات.',
  },
  'app-server->users': {
    english:
      'User requests enter the App Server. Connect Users to the App Server to show that request direction.',
    arabic:
      'تصل طلبات المستخدمين إلى خادم التطبيق. صِل المستخدمين بخادم التطبيق لإظهار اتجاه الطلب.',
  },
}

export function validateStageOneConnection(
  infrastructure: CampaignInfrastructureState,
  sourceId: string,
  targetId: string,
): ConnectionValidationResult {
  const source = infrastructure.resources.find(
    (resource) => resource.id === sourceId,
  )
  const target = infrastructure.resources.find(
    (resource) => resource.id === targetId,
  )

  if (!source || !target) {
    return {
      valid: false,
      explanation: {
        english: 'Both resources must be on the canvas before they can connect.',
        arabic: 'يجب وضع الموردين على اللوحة قبل توصيلهما.',
      },
    }
  }

  if (source.id === target.id) {
    return {
      valid: false,
      explanation: {
        english: 'A resource cannot connect to itself.',
        arabic: 'لا يمكن توصيل المورد بنفسه.',
      },
    }
  }

  const duplicate = infrastructure.connections.some(
    (connection) =>
      connection.sourceId === sourceId && connection.targetId === targetId,
  )
  if (duplicate) {
    return {
      valid: false,
      explanation: {
        english: 'These resources are already connected.',
        arabic: 'هذان الموردان متصلان بالفعل.',
      },
    }
  }

  const valid = stageOneConnectionRules.some(
    (rule) =>
      rule.sourceType === source.type && rule.targetType === target.type,
  )
  if (valid) {
    return { valid: true, explanation: validExplanation }
  }

  return {
    valid: false,
    explanation:
      invalidPairExplanations[`${source.type}->${target.type}`] ?? {
        english:
          'This connection does not belong in the Stage 1 request path.',
        arabic: 'هذا الاتصال ليس جزءًا من مسار الطلب في المرحلة الأولى.',
      },
  }
}
