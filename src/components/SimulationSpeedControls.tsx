import {
  simulationSpeedOptions,
  type SimulationSpeed,
} from '../simulation/config'
import { useLanguage } from '../i18n/useLanguage'

type SimulationSpeedControlsProps = {
  gameSpeed: SimulationSpeed
  onSpeedChange: (speed: SimulationSpeed) => void
}

export function SimulationSpeedControls({
  gameSpeed,
  onSpeedChange,
}: SimulationSpeedControlsProps) {
  const { t } = useLanguage()
  const speedLabels: Record<SimulationSpeed, string> = {
    0: t('action.pause'),
    1: '1x',
    2: '2x',
    4: '4x',
  }

  return (
    <div className="speed-controls" aria-label={t('app.gameSpeedControls')}>
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
