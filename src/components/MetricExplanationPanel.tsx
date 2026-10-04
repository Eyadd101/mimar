import {
  getMetricCurrentReason,
  metricEducationDefinitions,
  type MetricEducationSnapshot,
  type MetricId,
} from '../data/metricEducation'
import { useLanguage } from '../i18n/useLanguage'
import { TechnicalTerm } from './TechnicalTerm'
import { useStableScrollPosition } from '../hooks/useStableScrollPosition'
import { formatCredits } from '../data/creditPresentation'

type MetricExplanationPanelProps = {
  metricId: MetricId
  snapshot: MetricEducationSnapshot
  onClose: () => void
}

export function MetricExplanationPanel({
  metricId,
  snapshot,
  onClose,
}: MetricExplanationPanelProps) {
  const { direction, t } = useLanguage()
  const definition = metricEducationDefinitions[metricId]
  const currentReason = getMetricCurrentReason(metricId, snapshot)
  const [scrollRef, handleScroll] = useStableScrollPosition<HTMLElement>(
    `metric:${metricId}`,
  )

  return (
    <aside
      className="metric-explanation"
      role="dialog"
      aria-label={t('education.explanationAria', {
        metric: t(definition.labelKey),
      })}
      aria-live="polite"
      dir={direction}
      ref={scrollRef}
      onScroll={handleScroll}
    >
      <button
        type="button"
        className="metric-explanation__close"
        onClick={onClose}
        aria-label={t('common.close')}
      >
        ×
      </button>
      <div className="metric-explanation__title">
        <TechnicalTerm translationKey={definition.labelKey} />
      </div>
      <section>
        <h3>{t('education.meaning')}</h3>
        <p>{t(definition.meaningKey)}</p>
      </section>
      <div className="metric-explanation__drivers">
        <EducationList
          title={t('education.increases')}
          items={definition.increaseKeys.map((key) => t(key))}
        />
        <EducationList
          title={t('education.decreases')}
          items={definition.decreaseKeys.map((key) => t(key))}
        />
      </div>
      <section className="metric-explanation__reason">
        <h3>{t('education.currentReason')}</h3>
        <p>{t(currentReason.key, currentReason.variables)}</p>
      </section>
      {metricId === 'balance' && (
        <>
          <p className="metric-explanation__formula">
            {t('education.balanceFormula')}
          </p>
          <dl className="metric-explanation__values">
            <div>
              <dt><TechnicalTerm translationKey="metric.revenue" /></dt>
              <dd>+{formatCredits(snapshot.revenuePerPeriod)} / {snapshot.costPeriodSeconds}s</dd>
            </div>
            <div>
              <dt><TechnicalTerm translationKey="metric.infrastructureCost" /></dt>
              <dd>−{formatCredits(snapshot.infrastructureCostPerPeriod)} / {snapshot.costPeriodSeconds}s</dd>
            </div>
            <div>
              <dt><TechnicalTerm translationKey="metric.incidentCosts" /></dt>
              <dd>−{t('common.total', { value: formatCredits(snapshot.incidentCosts) })}</dd>
            </div>
            <div>
              <dt><TechnicalTerm translationKey="metric.netCashFlow" /></dt>
              <dd>{snapshot.netCashFlowPerPeriod > 0 ? '+' : ''}{formatCredits(snapshot.netCashFlowPerPeriod)} / {snapshot.costPeriodSeconds}s</dd>
            </div>
          </dl>
        </>
      )}
    </aside>
  )
}

function EducationList({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h3>{title}</h3>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>
  )
}
