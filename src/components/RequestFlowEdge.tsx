import type { CSSProperties } from 'react'
import {
  BaseEdge,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
} from '@xyflow/react'
import {
  getRequestFlowVisual,
  requestFlowVisualConfig,
} from '../data/requestFlow'

export type RequestFlowEdgeData = {
  requestsPerSecond: number
  isPaused: boolean
}

export type RequestFlowEdgeModel = Edge<RequestFlowEdgeData, 'requestFlow'>

type RequestFlowStyle = CSSProperties & {
  '--request-flow-duration': string
  '--request-flow-dash-length': string
  '--request-flow-dash-gap': string
  '--request-flow-distance': string
}

export function RequestFlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  selected,
  data,
}: EdgeProps<RequestFlowEdgeModel>) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 14,
    offset: 18,
  })
  const visual = getRequestFlowVisual(data?.requestsPerSecond ?? 0)
  const requestFlowStyle: RequestFlowStyle = {
    '--request-flow-duration': `${visual.durationSeconds}s`,
    '--request-flow-dash-length': `${visual.dashLengthPx}px`,
    '--request-flow-dash-gap': `${visual.dashGapPx}px`,
    '--request-flow-distance': `${requestFlowVisualConfig.animationTravelPx}px`,
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        interactionWidth={36}
        style={{
          ...style,
          ...(selected ? {
            stroke: '#d8f5aa',
            strokeWidth: 4,
            filter: 'drop-shadow(0 0 6px #b5f0cc)',
          } : {}),
        }}
      />
      <path
        d={edgePath}
        className="request-flow__pulse"
        data-paused={data?.isPaused ? 'true' : 'false'}
        style={requestFlowStyle}
        aria-hidden="true"
      />
    </>
  )
}
