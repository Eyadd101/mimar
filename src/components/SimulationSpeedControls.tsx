import {
  simulationSpeedOptions,
  type SimulationSpeed,
} from '../simulation/config'

type SimulationSpeedControlsProps = {
  gameSpeed: SimulationSpeed
  onSpeedChange: (speed: SimulationSpeed) => void
}

const speedLabels: Record<SimulationSpeed, string> = {
  0: 'Pause',
  1: '1x',
  2: '2x',
  4: '4x',
}

export function SimulationSpeedControls({
  gameSpeed,
  onSpeedChange,
}: SimulationSpeedControlsProps) {
  return (
    <div className="speed-controls" aria-label="Game speed controls">
      {simulationSpeedOptions.map((speed) => (
        <button
          key={speed}
          type="button"
          className="speed-controls__button"
          aria-pressed={gameSpeed === speed}
          onClick={() => onSpeedChange(speed)}
        >
          {speedLabels[speed]}
        </button>
      ))}
    </div>
  )
}
