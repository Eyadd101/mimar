type ActionConfirmationDialogProps = {
  title: string
  description: string
  cost: number
  durationSeconds: number
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ActionConfirmationDialog({
  title,
  description,
  cost,
  durationSeconds,
  confirmLabel,
  onConfirm,
  onCancel,
}: ActionConfirmationDialogProps) {
  return (
    <div className="action-confirmation" role="alertdialog" aria-modal="true">
      <section className="action-confirmation__card">
        <p>Confirm infrastructure change</p>
        <h2>{title}</h2>
        <span>{description}</span>
        <dl>
          <div>
            <dt>Immediate cost</dt>
            <dd>{cost} credits</dd>
          </div>
          <div>
            <dt>Deployment</dt>
            <dd>{durationSeconds} game seconds</dd>
          </div>
        </dl>
        <div>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} autoFocus>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
