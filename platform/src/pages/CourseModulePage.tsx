import { use } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { Tabs } from '../components/Tabs'
import { Markdown } from '../components/Markdown'
import { PracticeBank } from '../components/PracticeBank'
import { TimedTest } from '../components/TimedTest'
import { COURSE_FIELDS, loadCourseContent } from '../data/contentLoader'
import { FIELD_MCQ_FORMAT } from '../data/competition'
import { useLocaleStore, pick } from '../lib/localeStore'
import { useT } from '../lib/useT'
import { courseModules, moduleNumber } from '../lib/course'

const FIELD = COURSE_FIELDS[0]

export function CourseModulePage() {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const { moduleId } = useParams<{ moduleId: string }>()
  const { QUESTIONS: questions, THEORY_DOCS: theory } = use(loadCourseContent(FIELD))

  const modules = courseModules(theory, questions)
  const index = modules.findIndex((m) => moduleNumber(m.doc.id) === Number(moduleId))
  if (index === -1) return <Navigate to="/formacion" replace />

  const module = modules[index]
  const previous = modules[index - 1]
  const next = modules[index + 1]
  const number = moduleNumber(module.doc.id)

  // El simulacro del módulo se ajusta a lo que hay: diez preguntas no dan para
  // los treinta minutos del formato real, así que se cronometra en proporción
  // en vez de anunciar un examen que el módulo no puede llenar.
  const moduleFormat = {
    ...FIELD_MCQ_FORMAT,
    questions: module.questions.length,
    maxScore: module.questions.length,
    passMark: Math.ceil(module.questions.length / 2),
    minutes: Math.max(
      5,
      Math.round((FIELD_MCQ_FORMAT.minutes / FIELD_MCQ_FORMAT.questions) * module.questions.length),
    ),
  }

  return (
    <div>
      <PageHeader
        eyebrow={t('course_module_eyebrow', { n: number, total: modules.length })}
        title={pick(locale, module.doc.title)}
      />

      <Tabs
        tabs={[
          {
            id: 'teoria',
            label: t('tab_theory'),
            content: (
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <Markdown>{pick(locale, module.doc.summaryMd)}</Markdown>
              </div>
            ),
          },
          {
            id: 'preguntas',
            label: `${t('tab_practice_bank')} (${module.questions.length})`,
            content: <PracticeBank questions={module.questions} />,
          },
          {
            id: 'test',
            label: t('tab_timed_test'),
            content: (
              <TimedTest
                questions={module.questions}
                format={moduleFormat}
                phase="field-mcq"
                field={FIELD}
              />
            ),
          },
        ]}
      />

      <nav className="mt-8 flex items-center justify-between gap-4 border-t border-slate-200 pt-5">
        {previous ? (
          <Link
            to={`/formacion/${moduleNumber(previous.doc.id)}`}
            className="group flex min-w-0 items-center gap-2 text-sm text-slate-500 transition-colors hover:text-accent"
          >
            <ChevronLeft size={16} className="shrink-0" />
            <span className="truncate">{pick(locale, previous.doc.title)}</span>
          </Link>
        ) : (
          <Link to="/formacion" className="flex items-center gap-2 text-sm text-slate-500 hover:text-accent">
            <ChevronLeft size={16} />
            {t('course_all_modules')}
          </Link>
        )}

        {next && (
          <Link
            to={`/formacion/${moduleNumber(next.doc.id)}`}
            className="group flex min-w-0 items-center gap-2 text-right text-sm font-medium text-accent"
          >
            <span className="truncate">{pick(locale, next.doc.title)}</span>
            <ChevronRight size={16} className="shrink-0" />
          </Link>
        )}
      </nav>
    </div>
  )
}
