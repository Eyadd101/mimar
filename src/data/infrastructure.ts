import {
  applyNodeChanges,
  MarkerType,
  type Edge,
  type Node,
  type NodeChange,
} from '@xyflow/react'
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
  canConnect?: boolean
}

export type InfrastructureFlowNode = Node<InfrastructureNodeData, 'infrastructure'>

export type InfrastructurePositionUpdate = {
  id: string
  position: { x: number; y: number }
}

export type InfrastructureNodeRuntime = Record<
  string,
  Pick<InfrastructureFlowNode, 'measured' | 'dragging'>
>

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

/**
 * React Flow owns transient measurements and drag flags. CampaignState remains
 * the source of truth for resource identity and persisted positions.
 */
export function carryInfrastructureNodeRuntime(
  nodes: InfrastructureFlowNode[],
  runtime: InfrastructureNodeRuntime,
) {
  return nodes.map((node) => {
    const runtimeNode = runtime[node.id]

    return runtimeNode
      ? {
          ...node,
          measured: runtimeNode.measured,
          dragging: runtimeNode.dragging,
        }
      : node
  })
}

/**
 * Apply only presentation-safe React Flow changes. Resource additions,
 * removals, and replacements are campaign actions and cannot originate here.
 */
export function applyInfrastructureNodeChanges(
  changes: NodeChange<InfrastructureFlowNode>[],
  nodes: InfrastructureFlowNode[],
) {
  const supportedChanges = changes.filter(
    (change) => change.type === 'position' || change.type === 'dimensions',
  )
  const nextNodes = applyNodeChanges(supportedChanges, nodes)
  const changedPositionIds = new Set(
    supportedChanges
      .filter((change) => change.type === 'position' && change.position)
      .map((change) => change.id),
  )
  const positionUpdates: InfrastructurePositionUpdate[] = nextNodes
    .filter((node) => changedPositionIds.has(node.id))
    .map((node) => ({
      id: node.id,
      position: { ...node.position },
    }))
  const runtime: InfrastructureNodeRuntime = Object.fromEntries(
    nextNodes.map((node) => [
      node.id,
      { measured: node.measured, dragging: node.dragging },
    ]),
  )

  return { nodes: nextNodes, positionUpdates, runtime }
}
