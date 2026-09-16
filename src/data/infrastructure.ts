import { MarkerType, type Edge, type Node } from '@xyflow/react'
import type { AppServerMetrics } from '../simulation/appServerSimulation'

export type InfrastructureNodeData = {
  label: string
  kind: 'users' | 'server' | 'database'
  description: string
  number: string
  appServerMetrics?: AppServerMetrics
}

export type InfrastructureFlowNode = Node<InfrastructureNodeData, 'infrastructure'>

export const initialNodes: InfrastructureFlowNode[] = [
  {
    id: 'users',
    type: 'infrastructure',
    position: { x: 0, y: 0 },
    data: {
      label: 'Users',
      kind: 'users',
      description: 'The starting point',
      number: '01',
    },
  },
  {
    id: 'server',
    type: 'infrastructure',
    position: { x: 340, y: 0 },
    data: {
      label: 'App Server',
      kind: 'server',
      description: 'Application compute',
      number: '02',
    },
  },
  {
    id: 'database',
    type: 'infrastructure',
    position: { x: 680, y: 0 },
    data: {
      label: 'Database',
      kind: 'database',
      description: 'Persistent storage',
      number: '03',
    },
  },
]

export const initialEdges: Edge[] = [
  { id: 'users-server', source: 'users', target: 'server' },
  { id: 'server-database', source: 'server', target: 'database' },
].map((edge) => ({
  ...edge,
  type: 'smoothstep',
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#648d82',
    width: 18,
    height: 18,
  },
  style: { stroke: '#648d82', strokeWidth: 1.6 },
}))
