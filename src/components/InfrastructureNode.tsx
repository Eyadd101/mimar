import { Handle, Position, type NodeProps } from '@xyflow/react'
import type {
  InfrastructureFlowNode,
  InfrastructureNodeData,
} from '../data/infrastructure'

const roleLabels: Record<InfrastructureNodeData['kind'], string> = {
  users: 'ENTRY POINT',
  server: 'COMPUTE',
  database: 'STORAGE',
}

const statusLabels = {
  normal: 'Normal',
  elevated: 'Elevated',
  high: 'High',
  overloaded: 'Overloaded',
} as const

function NodeIcon({ kind }: Pick<InfrastructureNodeData, 'kind'>) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === 'users' && (
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v2" />
        </>
      )}
      {kind === 'server' && (
        <>
          <rect x="3" y="3" width="18" height="7" rx="2" />
          <rect x="3" y="14" width="18" height="7" rx="2" />
          <path d="M7 6.5h.01M7 17.5h.01M15 6.5h3M15 17.5h3" />
        </>
      )}
      {kind === 'database' && (
        <>
          <ellipse cx="12" cy="5" rx="8" ry="3" />
          <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
        </>
      )}
    </svg>
  )
}

export function InfrastructureNode({ data }: NodeProps<InfrastructureFlowNode>) {
  return (
    <div className="infrastructure-node" data-kind={data.kind}>
      {data.kind !== 'users' && (
        <Handle type="target" position={Position.Left} isConnectable={false} />
      )}

      <div className="node-heading">
        <span className="node-icon">
          <NodeIcon kind={data.kind} />
        </span>
        <span className="node-number">{data.number}</span>
      </div>
      <h2 className="node-label">{data.label}</h2>
      <p className="node-description">{data.description}</p>
      {data.kind === 'server' && data.appServerMetrics && (
        <div
          className="server-cpu"
          data-status={data.appServerMetrics.status}
        >
          <div className="server-cpu__summary">
            <span>CPU</span>
            <strong>{data.appServerMetrics.cpuUsage.toFixed(1)}%</strong>
          </div>
          <div
            className="server-cpu__track"
            role="progressbar"
            aria-label="App Server CPU usage"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={data.appServerMetrics.cpuUsage}
          >
            <span
              className="server-cpu__fill"
              style={{ width: `${data.appServerMetrics.cpuUsage}%` }}
            />
          </div>
          <span className="server-cpu__status">
            {statusLabels[data.appServerMetrics.status]}
          </span>
        </div>
      )}
      <div className="node-footer">
        <span>{roleLabels[data.kind]}</span>
        <svg
          className="drag-grip"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="5" cy="4" r="1" />
          <circle cx="11" cy="4" r="1" />
          <circle cx="5" cy="8" r="1" />
          <circle cx="11" cy="8" r="1" />
          <circle cx="5" cy="12" r="1" />
          <circle cx="11" cy="12" r="1" />
        </svg>
      </div>

      {data.kind !== 'database' && (
        <Handle type="source" position={Position.Right} isConnectable={false} />
      )}
    </div>
  )
}
