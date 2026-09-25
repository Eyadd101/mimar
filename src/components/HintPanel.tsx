import type { TranslationMessage } from '../i18n/translations'
import { useLanguage } from '../i18n/useLanguage'
import { useStableScrollPosition } from '../hooks/useStableScrollPosition'

type HintPanelProps = {
  hint: TranslationMessage | null
  onRequestHint: () => void
  onDismissHint: () => void
}

export function HintPanel({
  hint,
  onRequestHint,
  onDismissHint,
}: HintPanelProps) {
  const { direction, t } = useLanguage()
  const [scrollRef, handleScroll] =
    useStableScrollPosition<HTMLDivElement>('hint')

  return (
    <div className="hint-control">
      <button type="button" className="hint-button" onClick={onRequestHint}>
        {t('action.hint')}
      </button>
      {hint && (
        <div
          className="hint-popover"
          role="status"
          dir={direction}
          ref={scrollRef}
          onScroll={handleScroll}
        >
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
          <p>{t(hint.key, hint.variables)}</p>
        </div>
      )}
    </div>
  )
}
