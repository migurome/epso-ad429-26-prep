import { use } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, GraduationCap } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'
import { Markdown } from '../components/Markdown'
import { hasCourse, loadCourseContent, type CourseField } from '../data/contentLoader'
import { COMPETITIONS, COMPETITION_ORDER } from '../data/competition'
import { useLocaleStore, pick } from '../lib/localeStore'
import { usePreferredField } from '../lib/studyStore'
import { useT } from '../lib/useT'
import { courseModules, moduleNumber } from '../lib/course'

// El curso se ciñe al ámbito elegido en Ajustes. Hoy sólo existe para
// ciberseguridad, así que quien se presente por otro ámbito no debe encontrarse
// aquí un temario que no le toca: se le dice que todavía no hay curso para el
// suyo. La comprobación va fuera del componente que carga el contenido para no
// descargar un bloque de cientos de kilobytes que no se va a enseñar.
export function CoursePage() {
  const t = useT()
  const field = usePreferredField()

  if (!hasCourse(field)) {
    return (
      <div>
        <PageHeader eyebrow={t('course_eyebrow')} title={t('course_title')} />
        <EmptyState
          icon={<GraduationCap size={28} />}
          title={t('course_empty_title')}
          description={t('course_other_field')}
        />
      </div>
    )
  }

  return <CourseContents courseField={field} />
}

function CourseContents({ courseField }: { courseField: CourseField }) {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const { QUESTIONS: questions, THEORY_DOCS: theory } = use(loadCourseContent(courseField))

  const field = COMPETITION_ORDER.flatMap((key) => COMPETITIONS[key].fields).find(
    (f) => f.id === courseField,
  )
  const intro = theory.find((doc) => doc.id.endsWith('-intro'))
  const modules = courseModules(theory, questions)

  if (modules.length === 0) {
    return (
      <div>
        <PageHeader eyebrow={t('course_eyebrow')} title={t('course_title')} />
        <EmptyState
          icon={<GraduationCap size={28} />}
          title={t('course_empty_title')}
          description={t('course_empty_description')}
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        eyebrow={t('course_eyebrow')}
        title={t('course_title')}
        description={t('course_description', {
          modules: modules.length,
          questions: questions.length,
          field: field ? pick(locale, field.label) : '',
        })}
      />

      {intro && (
        <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6">
          <Markdown>{pick(locale, intro.summaryMd)}</Markdown>
        </section>
      )}

      <ol className="space-y-3">
        {modules.map((module) => (
          <li key={module.doc.id}>
            <Link
              to={`/formacion/${moduleNumber(module.doc.id)}`}
              className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-accent hover:bg-slate-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-sm font-bold text-accent tabular-nums">
                {moduleNumber(module.doc.id)}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-slate-800">
                  {pick(locale, module.doc.title)}
                </h3>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                  <BookOpen size={13} />
                  {t('course_module_meta', { questions: module.questions.length })}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}
