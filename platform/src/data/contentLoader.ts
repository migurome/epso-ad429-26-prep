import type { Field, ReasoningSkill } from '../types/content'

// Cada bloque de contenido (destreza de razonamiento, campo, EUFTE) vive en
// su propio chunk generado (content.<nombre>.generated.ts) e importado aquí
// con import() dinámico, para que Vite/Rollup lo separe en su propio archivo
// y solo se descargue cuando el usuario visita esa página en concreto — en
// vez de meter las ~850 preguntas de toda la plataforma en el bundle inicial.
// La caché evita relanzar el import() (y por tanto re-suspender) en cada
// render de un componente que use este resultado con `use()`.
const cache = new Map<string, Promise<unknown>>()

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit) return hit as Promise<T>
  const promise = load()
  cache.set(key, promise)
  return promise
}

export function loadReasoningContent(skill: ReasoningSkill) {
  return cached(`reasoning:${skill}`, () => {
    switch (skill) {
      case 'verbal':
        return import('./content.verbal.generated')
      case 'numerical':
        return import('./content.numerical.generated')
      case 'abstract':
        return import('./content.abstract.generated')
    }
  })
}

export function loadFieldContent(field: Field) {
  return cached(`field:${field}`, () => {
    switch (field) {
      case 'data-science':
        return import('./content.field-data-science.generated')
      case 'ict-infrastructure':
        return import('./content.field-ict-infrastructure.generated')
      case 'ict-project-management':
        return import('./content.field-ict-project-management.generated')
      case 'clouds-networks':
        return import('./content.field-clouds-networks.generated')
    }
  })
}

export function loadEufteContent() {
  return cached('eufte', () => import('./content.eufte.generated'))
}

export function loadTestDayContent() {
  return cached('test-day', () => import('./content.test-day.generated'))
}
