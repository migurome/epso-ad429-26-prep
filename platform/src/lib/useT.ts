import { useLocaleStore } from './localeStore'
import { DICT, type DictKey } from './dictionary'

type Vars = Record<string, string | number>

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  )
}

export function useT() {
  const locale = useLocaleStore((s) => s.locale)
  return (key: DictKey, vars?: Vars) => interpolate(DICT[key][locale], vars)
}
