import { MarkerType, type Edge, type Node } from '@xyflow/react'
import type { AppServerMetrics } from '../simulation/appServerSimulation'
import type {
  CampaignInfrastructureState,
  CampaignResource,
} from '../simulation/campaignSimulation'

export type InfrastructureNodeData = {
  label: string
  kind: 'users' | 'server' | 'database' | 'load-balancer'
  description: string
  number: string
  appServerMetrics?: AppServerMetrics
}

export type InfrastructureFlowNode = Node<InfrastructureNodeData, 'infrastructure'>

const resourcePresentation: Record<
  CampaignResource['type'],
  Pick<InfrastructureNodeData, 'kind' | 'description'>
> = {
  users: {
    kind: 'users',
    description: 'The starting point',
  },
  'app-server': {
    kind: 'server',
    description: 'Application compute',
  },
  database: {
    kind: 'database',
    description: 'Persistent storage',
  },
  'load-balancer': {
    kind: 'load-balancer',
    description: 'Traffic distribution',
  },
}

export function createInfrastructureNodes(
  infrastructure: CampaignInfrastructureState,
): InfrastructureFlowNode[] {
  return infrastructure.resources.map((resource, index) => ({
    id: resource.id,
    type: 'infrastructure',
    position: resource.position,
    data: {
      label: resource.name,
      ...resourcePresentation[resource.type],
      number: String(index + 1).padStart(2, '0'),
    },
  }))
}

export function createInfrastructureEdges(
  infrastructure: CampaignInfrastructureState,
): Edge[] {
  return infrastructure.connections.map((connection) => ({
    id: connection.id,
    source: connection.sourceId,
    target: connection.targetId,
    type: 'smoothstep',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#648d82',
      width: 18,
      height: 18,
    },
    style: { stroke: '#648d82', strokeWidth: 1.6 },
  }))
}
