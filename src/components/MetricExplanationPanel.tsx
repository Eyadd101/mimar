import {
  getMetricCurrentReason,
  metricEducationDefinitions,
  type MetricEducationSnapshot,
  type MetricId,
} from '../data/metricEducation'
import { translations } from '../i18n/translations'
import { useLanguage } from '../i18n/useLanguage'
import { TechnicalTerm } from './TechnicalTerm'

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
  const { language, t } = useLanguage()
  const definition = metricEducationDefinitions[metricId]
  const currentReason = getMetricCurrentReason(metricId, snapshot, language)

  return (
    <aside className="metric-explanation" role="dialog" aria-live="polite">
      <button
        type="button"
        className="metric-explanation__close"
        onClick={onClose}
        aria-label={t('common.close')}
      >
        ×
      </button>
      <div className="metric-explanation__title">
        <strong lang="ar" dir="rtl">
          {translations.ar[definition.labelKey]}
        </strong>
        <span lang="en" dir="ltr">
          {translations.en[definition.labelKey]}
        </span>
      </div>
      <section>
        <h3>{t('education.meaning')}</h3>
        <p>{definition.meaning[language]}</p>
      </section>
      <div className="metric-explanation__drivers">
        <EducationList
          title={t('education.increases')}
          items={definition.increases.map((item) => item[language])}
        />
        <EducationList
          title={t('education.decreases')}
          items={definition.decreases.map((item) => item[language])}
        />
      </div>
      <section className="metric-explanation__reason">
        <h3>{t('education.currentReason')}</h3>
        <p>{currentReason}</p>
      </section>
      {metricId === 'balance' && (
        <dl className="metric-explanation__values">
          <div>
            <dt><TechnicalTerm translationKey="metric.revenue" /></dt>
            <dd>+{snapshot.revenuePerPeriod.toFixed(1)} / {snapshot.costPeriodSeconds}s</dd>
          </div>
          <div>
            <dt><TechnicalTerm translationKey="metric.infrastructureCost" /></dt>
            <dd>−{snapshot.infrastructureCostPerPeriod.toFixed(1)} / {snapshot.costPeriodSeconds}s</dd>
          </div>
          <div>
            <dt><TechnicalTerm translationKey="metric.netCashFlow" /></dt>
            <dd>{snapshot.netCashFlowPerPeriod > 0 ? '+' : ''}{snapshot.netCashFlowPerPeriod.toFixed(1)} / {snapshot.costPeriodSeconds}s</dd>
          </div>
        </dl>
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
