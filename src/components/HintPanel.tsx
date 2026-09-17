type HintPanelProps = {
  hint: string | null
  onRequestHint: () => void
  onDismissHint: () => void
}

export function HintPanel({
  hint,
  onRequestHint,
  onDismissHint,
}: HintPanelProps) {
  const { t } = useLanguage()

  return (
    <div className="hint-control">
      <button type="button" className="hint-button" onClick={onRequestHint}>
        {t('action.hint')}
      </button>
      {hint && (
        <div className="hint-popover" role="status">
          <div className="hint-popover__header">
            <span>{t('hint.system')}</span>
            <button
              type="button"
              onClick={onDismissHint}
              aria-label={`${t('common.close')} ${t('action.hint')}`}
            >
              ×
            </button>
          </div>
          <p>{hint}</p>
        </div>
      )}
    </div>
  )
}
import { useLanguage } from '../i18n/useLanguage'
