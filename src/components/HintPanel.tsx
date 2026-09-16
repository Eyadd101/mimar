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
  return (
    <div className="hint-control">
      <button type="button" className="hint-button" onClick={onRequestHint}>
        Hint
      </button>
      {hint && (
        <div className="hint-popover" role="status">
          <div className="hint-popover__header">
            <span>System hint</span>
            <button
              type="button"
              onClick={onDismissHint}
              aria-label="Dismiss hint"
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
