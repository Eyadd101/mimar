import {
  Background,
  BackgroundVariant,
  Controls,
  Panel,
  ReactFlow,
  useNodesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { InfrastructureNode } from './components/InfrastructureNode'
import { TrafficHud } from './components/TrafficHud'
import { initialEdges, initialNodes } from './data/infrastructure'
import { useTrafficSimulation } from './hooks/useTrafficSimulation'
import './App.css'

const nodeTypes = { infrastructure: InfrastructureNode }
const fitViewOptions = { padding: 0.25, maxZoom: 1.1 }

function App() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const traffic = useTrafficSimulation()

  return (
    <main className="game">
      <header className="game-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17H6a4 4 0 0 1-.7-7.94 6.5 6.5 0 0 1 12.3-1.4A4.75 4.75 0 0 1 18 17h-1" />
              <path d="M9 14l3-3 3 3M12 11v10" />
            </svg>
          </span>
          <span className="brand-name">Cloud Game</span>
          <span className="brand-divider" aria-hidden="true" />
          <span className="header-caption">Infrastructure playground</span>
        </div>
        <TrafficHud {...traffic} />
        <span className="prototype-badge">Prototype <span>01</span></span>
      </header>

      <section className="canvas" aria-label="Infrastructure canvas">
        <ReactFlow
          nodes={nodes}
          edges={initialEdges}
          onNodesChange={onNodesChange}
          nodeTypes={nodeTypes}
          colorMode="dark"
          fitView
          fitViewOptions={fitViewOptions}
          minZoom={0.25}
          maxZoom={1.6}
          nodesConnectable={false}
          edgesReconnectable={false}
          edgesFocusable={false}
          deleteKeyCode={null}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#293532" />
          <Panel position="top-left" className="canvas-heading">
            <p className="eyebrow">Workspace / 001</p>
            <h1>Your first infrastructure.</h1>
            <p>Three nodes. One simple connection path.</p>
          </Panel>
          <Controls showInteractive={false} orientation="horizontal" fitViewOptions={fitViewOptions} />
        </ReactFlow>
      </section>

      <footer className="game-footer">
        <p><span className="hint-dot" aria-hidden="true" />Drag nodes to rearrange<span className="secondary-hint"> · Scroll to zoom · Drag canvas to pan</span></p>
        <p className="graph-count">3 nodes <span>/</span> 2 connections</p>
      </footer>
    </main>
  )
}

export default App
