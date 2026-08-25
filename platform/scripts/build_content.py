#!/usr/bin/env python3
"""
Parses the Markdown study material in ../Docs/*.md (+ ../Docs/es/*.md for
Spanish translations) and generates one platform/src/data/content.*.generated.ts
file per reasoning skill / field / EUFTE (QUESTIONS, THEORY_DOCS,
ESSAY_PROMPTS) instead of one combined file, so Vite can code-split each
chunk behind a dynamic import() and the initial bundle doesn't have to ship
every question for every phase up front. Questions are bilingual: prompt,
option text and option explanations are all {en, es}.

This is a one-off/manual content-build script, not part of the npm build.
Re-run it after editing Docs/*.md or Docs/es/*.md:

    python scripts/build_content.py

It is intentionally conservative: it never invents content, only reshapes
what is already written in Docs/ into the shapes defined in
src/types/content.ts. If Docs/ changes structurally, this script's regexes
will need updating to match. Spanish question banks must mirror the English
ones exactly (same question numbers, same option letters) — the script fails
loudly if a translation is missing a question or an option instead of
silently producing English-only content.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
DOCS = ROOT / "Docs"
GEN_DIR = Path(__file__).resolve().parent.parent / "src" / "data"

QNUM_RE = re.compile(r'^\*\*(\d+)\.\*\*(.*?)(?=^\*\*\d+\.\*\*|\Z)', re.MULTILINE | re.DOTALL)
ANUM_RE = re.compile(r'^\*\*(\d+)\.\s*([A-Ea-e])\*\*(.*?)(?=^\*\*\d+\.\s*[A-Ea-e]\*\*|\Z)', re.MULTILINE | re.DOTALL)
OPTION_RE = re.compile(r'^([A-Ea-e])[.)]\s+(.*)$', re.MULTILINE)
TOPIC_RE = re.compile(r'^### Topic \d+\s*[—-]\s*(.+?)(?:\s*\(Q[\d–\-]+\))?\s*$', re.MULTILINE)
TOPLEVEL_RE = re.compile(r'^# (.+)$', re.MULTILINE)


def read(name: str) -> str:
    return (DOCS / name).read_text(encoding="utf-8")


def read_es(name: str) -> str:
    return (DOCS / "es" / name).read_text(encoding="utf-8")


def es_theory_chapter(filename: str):
    """Read a Docs/es/*.md theory-only translation and return (title, body)."""
    text = read_es(filename)
    chapters = split_toplevel_chapters(text)
    return chapters[0]


def split_toplevel_chapters(text: str):
    """Split on top-level '# N. Title' headings. Returns list of (title, body)."""
    matches = list(TOPLEVEL_RE.finditer(text))
    chapters = []
    for i, m in enumerate(matches):
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        title = re.sub(r'^\d+\.\s*', '', m.group(1).strip())
        chapters.append((title, text[start:end].strip()))
    return chapters


def strip_topic_headers(block: str) -> str:
    return re.sub(r'^### Topic .*$', '', block, flags=re.MULTILINE).strip()


def parse_bank_raw(questions_text, answers_text, *, topic_tracking=False):
    """Parses one language's question bank into
    {num: {'prompt': str, 'options': [{'id','text','isCorrect','explanation'}], 'topic': str|None}}."""
    topic_marks = []
    if topic_tracking:
        for tm in TOPIC_RE.finditer(questions_text):
            topic_marks.append((tm.start(), tm.group(1).strip()))

    def topic_for_offset(offset):
        current = None
        for pos, name in topic_marks:
            if pos <= offset:
                current = name
            else:
                break
        return current

    answers = {}  # num -> {'letter': X, 'per_option': {letter: text} or None, 'text': full text}
    for am in ANUM_RE.finditer(answers_text):
        num = int(am.group(1))
        letter = am.group(2).upper()
        body = am.group(3).strip()
        lines = [ln.strip() for ln in body.split('\n') if ln.strip()]
        per_option = None
        if lines and all(re.match(r'^[A-E]\.\s+', ln) for ln in lines):
            per_option = {}
            for ln in lines:
                lm = re.match(r'^([A-E])\.\s+(.*)$', ln)
                per_option[lm.group(1)] = lm.group(2).strip()
        answers[num] = {'letter': letter, 'per_option': per_option, 'text': body}

    result = {}
    for qm in QNUM_RE.finditer(questions_text):
        num = int(qm.group(1))
        block = strip_topic_headers(qm.group(2))
        block = re.sub(r'[ \t]{2,}(?=[A-E][.)]\s)', '\n', block)
        opt_matches = list(OPTION_RE.finditer(block))
        if not opt_matches:
            continue
        prompt = block[:opt_matches[0].start()].strip()
        ans = answers.get(num)
        correct_letter = ans['letter'] if ans else None
        options = []
        for om in opt_matches:
            letter = om.group(1).upper()
            text = om.group(2).strip()
            explanation = None
            if ans:
                if ans['per_option'] and letter in ans['per_option']:
                    explanation = ans['per_option'][letter]
                elif letter == correct_letter:
                    explanation = ans['text']
            options.append({
                'id': letter,
                'text': text,
                'isCorrect': letter == correct_letter,
                'explanation': explanation,
            })
        result[num] = {
            'prompt': prompt,
            'options': options,
            'topic': topic_for_offset(qm.start()) if topic_tracking else None,
        }
    return result


def parse_question_bank_bilingual(en_q_text, en_a_text, es_q_text, es_a_text, *, id_prefix, phase,
                                   skill=None, field=None, source=None, extra_tags=None,
                                   topic_tracking=False):
    extra_tags = extra_tags or []
    en_bank = parse_bank_raw(en_q_text, en_a_text, topic_tracking=topic_tracking)
    es_bank = parse_bank_raw(es_q_text, es_a_text, topic_tracking=False)

    questions = []
    for num, en_q in sorted(en_bank.items()):
        es_q = es_bank.get(num)
        if es_q is None:
            raise ValueError(f"{id_prefix}: missing Spanish translation for question {num}")
        es_options_by_id = {o['id']: o for o in es_q['options']}

        options = []
        for en_opt in en_q['options']:
            es_opt = es_options_by_id.get(en_opt['id'])
            if es_opt is None:
                raise ValueError(f"{id_prefix}-{num}: missing Spanish option {en_opt['id']}")
            opt = {
                'id': en_opt['id'],
                'text': {'en': en_opt['text'], 'es': es_opt['text']},
                'isCorrect': en_opt['isCorrect'],
            }
            if en_opt['explanation'] or es_opt['explanation']:
                opt['explanation'] = {
                    'en': en_opt['explanation'] or '',
                    'es': es_opt['explanation'] or '',
                }
            options.append(opt)

        tags = list(extra_tags)
        if en_q['topic']:
            tags.append(en_q['topic'])

        q = {
            'id': f'{id_prefix}-{num}',
            'phase': phase,
            'prompt': {'en': en_q['prompt'], 'es': es_q['prompt']},
            'options': options,
        }
        if skill:
            q['skill'] = skill
        if field:
            q['field'] = field
        if source:
            q['source'] = source
        if tags:
            q['tags'] = tags
        questions.append(q)
    return questions


def split_bank(chapter_body: str):
    """Split a practice-chapter body into (questions_text, answers_text)."""
    m = re.search(r'^## ANSWERS\s*$', chapter_body, re.MULTILINE)
    if not m:
        raise ValueError("No '## ANSWERS' found in chapter")
    return chapter_body[:m.start()], chapter_body[m.end():]


def es_bank_chapter(filename: str, chapter_index: int):
    """Read a Docs/es/*.md bank translation, split into the same top-level
    chapters as the English source, and return the (questions, answers) split
    of the chapter at chapter_index."""
    text = read_es(filename)
    chapters = split_toplevel_chapters(text)
    _, body = chapters[chapter_index]
    return split_bank(body)


def build_verbal():
    text = read("1.- Verbal reasoning.md")
    chapters = split_toplevel_chapters(text)
    theory_title, theory_body = chapters[0]
    practice_title, practice_body = chapters[1]
    en_q, en_a = split_bank(practice_body)
    es_q, es_a = es_bank_chapter("1.- Razonamiento verbal (banco).md", 0)
    questions = parse_question_bank_bilingual(
        en_q, en_a, es_q, es_a, id_prefix='verbal', phase='reasoning', skill='verbal',
        source='Verbal Reasoning practice book', extra_tags=['real'],
    )

    epso_title, epso_body = chapters[2]
    en_q, en_a = split_bank(epso_body)
    es_q, es_a = es_bank_chapter("1.- Razonamiento verbal (banco oficial EPSO).md", 0)
    epso_questions = parse_question_bank_bilingual(
        en_q, en_a, es_q, es_a, id_prefix='verbal-epso', phase='reasoning', skill='verbal',
        source='EPSO official sample test (eu-careers.europa.eu, accessible version)',
        extra_tags=['real', 'epso-official'],
    )

    es_title, es_body = es_theory_chapter("1.- Razonamiento verbal (teoría).md")
    theory = {
        'id': 'theory-verbal',
        'phase': 'reasoning',
        'skill': 'verbal',
        'title': {'en': theory_title, 'es': es_title},
        'summaryMd': {'en': theory_body, 'es': es_body},
        'sourceFile': '1.- Verbal reasoning.md',
    }
    return questions + epso_questions, [theory]


def build_numerical():
    text = read("2.- Numerical reasoning.md")
    chapters = split_toplevel_chapters(text)
    theory_title, theory_body = chapters[0]
    real_title, real_body = chapters[1]
    ai_title, ai_body = chapters[2]

    en_q, en_a = split_bank(real_body)
    es_q, es_a = es_bank_chapter("2.- Razonamiento numérico (banco real).md", 0)
    real_questions = parse_question_bank_bilingual(
        en_q, en_a, es_q, es_a, id_prefix='num-real', phase='reasoning', skill='numerical',
        source='Numerical Reasoning MCQ for European institution competitions (Hetru & Bizeur, ORSEU, 2012)',
        extra_tags=['real'],
    )
    en_q, en_a = split_bank(ai_body)
    es_q, es_a = es_bank_chapter("2.- Razonamiento numérico (banco bonus).md", 0)
    ai_questions = parse_question_bank_bilingual(
        en_q, en_a, es_q, es_a, id_prefix='num-ai', phase='reasoning', skill='numerical',
        extra_tags=['ai-generated'],
    )

    epso_title, epso_body = chapters[3]
    en_q, en_a = split_bank(epso_body)
    es_q, es_a = es_bank_chapter("2.- Razonamiento numérico (banco oficial EPSO).md", 0)
    epso_questions = parse_question_bank_bilingual(
        en_q, en_a, es_q, es_a, id_prefix='num-epso', phase='reasoning', skill='numerical',
        source='EPSO official sample test (eu-careers.europa.eu, accessible version)',
        extra_tags=['real', 'epso-official'],
    )

    es_title, es_body = es_theory_chapter("2.- Razonamiento numérico (teoría).md")
    theory = {
        'id': 'theory-numerical',
        'phase': 'reasoning',
        'skill': 'numerical',
        'title': {'en': theory_title, 'es': es_title},
        'summaryMd': {'en': theory_body, 'es': es_body},
        'sourceFile': '2.- Numerical reasoning.md',
    }
    return real_questions + ai_questions + epso_questions, [theory]


def build_abstract():
    text = read("3.- Abstract reasoning.md")
    chapters = split_toplevel_chapters(text)
    theory_title, theory_body = chapters[0]
    real_title, real_body = chapters[1]
    ai_title, ai_body = chapters[2]

    en_q, en_a = split_bank(real_body)
    es_q, es_a = es_bank_chapter("3.- Razonamiento abstracto (banco real).md", 0)
    real_questions = parse_question_bank_bilingual(
        en_q, en_a, es_q, es_a, id_prefix='abs-real', phase='reasoning', skill='abstract',
        source='Abstract Reasoning Test — 120 Questions (real published book)',
        extra_tags=['real'],
    )
    en_q, en_a = split_bank(ai_body)
    es_q, es_a = es_bank_chapter("3.- Razonamiento abstracto (banco bonus).md", 0)
    ai_questions = parse_question_bank_bilingual(
        en_q, en_a, es_q, es_a, id_prefix='abs-ai', phase='reasoning', skill='abstract',
        extra_tags=['ai-generated'],
    )
    es_title, es_body = es_theory_chapter("3.- Razonamiento abstracto (teoría).md")
    theory = {
        'id': 'theory-abstract',
        'phase': 'reasoning',
        'skill': 'abstract',
        'title': {'en': theory_title, 'es': es_title},
        'summaryMd': {'en': theory_body, 'es': es_body},
        'sourceFile': '3.- Abstract reasoning.md',
    }
    return real_questions + ai_questions, [theory]


FIELD_MCQ_CONFIGS = [
    {
        'field': 'data-science',
        'id_prefix': 'field-ds',
        'en_file': '4.- Field-Related MCQ - Data Science.md',
        'es_theory_file': '4.- MCQ de campo - Ciencia de Datos (teoría).md',
        'es_bank_file': '4.- MCQ de campo - Ciencia de Datos (banco).md',
        'theory_id': 'theory-field-data-science',
    },
    {
        'field': 'ict-infrastructure',
        'id_prefix': 'field-ict-infra',
        'en_file': '4.- Field-Related MCQ - ICT Infrastructure.md',
        'es_theory_file': '4.- MCQ de campo - Infraestructura TIC (teoría).md',
        'es_bank_file': '4.- MCQ de campo - Infraestructura TIC (banco).md',
        'theory_id': 'theory-field-ict-infrastructure',
    },
    {
        'field': 'ict-project-management',
        'id_prefix': 'field-ict-pm',
        'en_file': '4.- Field-Related MCQ - ICT Project Management.md',
        'es_theory_file': '4.- MCQ de campo - Gestión de Proyectos TIC (teoría).md',
        'es_bank_file': '4.- MCQ de campo - Gestión de Proyectos TIC (banco).md',
        'theory_id': 'theory-field-ict-project-management',
    },
    {
        'field': 'clouds-networks',
        'id_prefix': 'field-cloud-net',
        'en_file': '4.- Field-Related MCQ - Clouds and Networks.md',
        'es_theory_file': '4.- MCQ de campo - Nubes y Redes (teoría).md',
        'es_bank_file': '4.- MCQ de campo - Nubes y Redes (banco).md',
        'theory_id': 'theory-field-clouds-networks',
    },
]


def build_field_mcq_one(cfg):
    text = read(cfg['en_file'])
    chapters = split_toplevel_chapters(text)
    theory_title, theory_body = chapters[0]
    practice_title, practice_body = chapters[1]
    # 'Further Reading' trails after '## ANSWERS' block inside the same chapter
    en_q, rest = split_bank(practice_body)
    fr = re.search(r'^## Further Reading\s*$', rest, re.MULTILINE)
    en_a = rest[:fr.start()] if fr else rest

    es_text = read_es(cfg['es_bank_file'])
    es_chapters = split_toplevel_chapters(es_text)
    _, es_practice_body = es_chapters[0]
    es_q, es_rest = split_bank(es_practice_body)
    es_fr = re.search(r'^## (Further Reading|Más información|Lecturas adicionales)\s*$', es_rest, re.MULTILINE)
    es_a = es_rest[:es_fr.start()] if es_fr else es_rest

    questions = parse_question_bank_bilingual(
        en_q, en_a, es_q, es_a, id_prefix=cfg['id_prefix'], phase='field-mcq', field=cfg['field'],
        extra_tags=['ai-generated'], topic_tracking=True,
    )
    es_title, es_body = es_theory_chapter(cfg['es_theory_file'])
    theory = {
        'id': cfg['theory_id'],
        'phase': 'field-mcq',
        'title': {'en': theory_title, 'es': es_title},
        'summaryMd': {'en': theory_body, 'es': es_body},
        'sourceFile': cfg['en_file'],
    }
    return questions, theory


ESSAY_PROMPT_RE = re.compile(
    r'^### Practice Prompt (\d+) — (.+?)\s*$(.*?)(?=^### Practice Prompt \d+|\Z)',
    re.MULTILINE | re.DOTALL,
)

# Structural section markers ("### Practice Prompt N", "## Editing for...") stay
# literal/English in both language sources, like "## ANSWERS" elsewhere in this
# script — they're never shown to the end user, only used to locate content.
# The inline labels below (Task/Model answer/Checklist) ARE shown to the user
# as part of the rendered brief, so each language has its own real translation.
ESSAY_LABELS = {
    'en': {'task': 'Task:', 'model_start': 'Model answer', 'checklist': 'Self-assessment checklist'},
    'es': {'task': 'Tarea:', 'model_start': 'Esquema de respuesta modelo', 'checklist': 'Lista de autoevaluación'},
}


def parse_essay_prompts_raw(prompts_text, lang):
    """Parses one language's '### Practice Prompt N — Title' blocks into
    {num: {'title', 'briefMd', 'model_outline', 'checklist'}}."""
    labels = ESSAY_LABELS[lang]
    result = {}
    for pm in ESSAY_PROMPT_RE.finditer(prompts_text):
        num = int(pm.group(1))
        title = pm.group(2).strip()
        block = pm.group(3)

        task_re = re.compile(r'^\*\*' + re.escape(labels['task']) + r'\*\*(.*?)(?=^\*\*' + re.escape(labels['model_start']) + r')', re.MULTILINE | re.DOTALL)
        model_re = re.compile(r'^\*\*' + re.escape(labels['model_start']) + r'.*?\*\*(.*?)(?=^\*\*' + re.escape(labels['checklist']) + r')', re.MULTILINE | re.DOTALL)
        checklist_re = re.compile(r'^\*\*' + re.escape(labels['checklist']) + r'\*\*(.*)\Z', re.MULTILINE | re.DOTALL)

        task_m = task_re.search(block)
        model_m = model_re.search(block)
        checklist_m = checklist_re.search(block)

        briefing = block[:task_m.start()].strip() if task_m else block.strip()
        task = task_m.group(1).strip() if task_m else ''
        model_outline = model_m.group(1).strip() if model_m else ''
        checklist = checklist_m.group(1).strip() if checklist_m else ''

        brief_md = briefing
        if task:
            brief_md += f"\n\n**{labels['task']}** {task}"

        result[num] = {
            'title': title,
            'briefMd': brief_md.strip(),
            'model_outline': model_outline,
            'checklist': checklist,
        }
    return result


def build_eufte():
    text = read("5.- EUFTE - Written test.md")
    chapters = split_toplevel_chapters(text)
    _, body = chapters[0]
    m = re.search(r'^## Practice Prompts\s*$', body, re.MULTILINE)
    closing_m = re.search(r'^## Editing for Concision.*$', body, re.MULTILINE)
    theory_body = body[:m.start()].strip()
    prompts_body = body[m.end():closing_m.start()] if closing_m else body[m.end():]
    closing_body = body[closing_m.start():].strip() if closing_m else ''

    es_title, es_body = es_theory_chapter("5.- EUFTE - Prueba escrita (teoría).md")
    theory = {
        'id': 'theory-eufte',
        'phase': 'eufte',
        'title': {'en': 'Succeeding in the EUFTE (Written Test)', 'es': es_title},
        'summaryMd': {
            'en': (theory_body + '\n\n' + closing_body).strip(),
            'es': es_body,
        },
        'sourceFile': '5.- EUFTE - Written test.md',
    }

    en_prompts = parse_essay_prompts_raw(prompts_body, 'en')
    es_text = read_es("5.- EUFTE - Prueba escrita (banco).md")
    es_chapters = split_toplevel_chapters(es_text)
    _, es_prompts_body = es_chapters[0]
    es_prompts = parse_essay_prompts_raw(es_prompts_body, 'es')

    essays = []
    for num, en_p in sorted(en_prompts.items()):
        es_p = es_prompts.get(num)
        if es_p is None:
            raise ValueError(f"eufte-{num}: missing Spanish translation")

        source_docs = []
        if en_p['model_outline'] or es_p['model_outline']:
            source_docs.append({
                'en': f"**Model answer — outline only** (review only after writing your draft)\n\n{en_p['model_outline']}",
                'es': f"**Esquema de respuesta modelo — solo esquema** (revísalo únicamente después de escribir tu borrador)\n\n{es_p['model_outline']}",
            })
        if en_p['checklist'] or es_p['checklist']:
            source_docs.append({
                'en': f"**Self-assessment checklist**\n\n{en_p['checklist']}",
                'es': f"**Lista de autoevaluación**\n\n{es_p['checklist']}",
            })

        essays.append({
            'id': f'eufte-{num}',
            'title': {'en': en_p['title'], 'es': es_p['title']},
            'briefMd': {'en': en_p['briefMd'], 'es': es_p['briefMd']},
            **({'sourceDocsMd': source_docs} if source_docs else {}),
            'recommendedMinutes': 40,
        })
    return essays, [theory]


def emit_chunk(filename, *, questions=None, theory=None, essays=None):
    """Writes one content.<name>.generated.ts chunk. Every chunk exports the
    same three names (QUESTIONS/THEORY_DOCS/ESSAY_PROMPTS, empty where not
    applicable) so every page can destructure the same shape regardless of
    which chunk it dynamically imports."""
    questions = questions or []
    theory = theory or []
    essays = essays or []
    lines = []
    lines.append("// AUTO-GENERATED by scripts/build_content.py — do not edit by hand.")
    lines.append("// Re-run: python scripts/build_content.py  (after editing ../Docs/*.md or ../Docs/es/*.md)")
    lines.append("")
    lines.append("import type { Question, TheoryDoc, EssayPrompt } from '../types/content'")
    lines.append("")
    lines.append(f"export const QUESTIONS: Question[] = {json.dumps(questions, ensure_ascii=False, indent=2)}")
    lines.append("")
    lines.append(f"export const THEORY_DOCS: TheoryDoc[] = {json.dumps(theory, ensure_ascii=False, indent=2)}")
    lines.append("")
    lines.append(f"export const ESSAY_PROMPTS: EssayPrompt[] = {json.dumps(essays, ensure_ascii=False, indent=2)}")
    lines.append("")
    (GEN_DIR / filename).write_text('\n'.join(lines), encoding='utf-8')


def main():
    all_questions = []
    all_theory = []
    all_essays = []
    total_q = 0
    total_theory = 0

    for build_fn, out_name in (
        (build_verbal, 'content.verbal.generated.ts'),
        (build_numerical, 'content.numerical.generated.ts'),
        (build_abstract, 'content.abstract.generated.ts'),
    ):
        try:
            questions, theory = build_fn()
        except Exception as e:
            print(f"ERROR in {build_fn.__name__}: {e}", file=sys.stderr)
            raise
        print(f"{build_fn.__name__}: {len(questions)} questions, {len(theory)} theory doc(s)")
        emit_chunk(out_name, questions=questions, theory=theory)
        all_questions += questions
        all_theory += theory
        total_q += len(questions)
        total_theory += len(theory)

    for cfg in FIELD_MCQ_CONFIGS:
        try:
            questions, theory = build_field_mcq_one(cfg)
        except Exception as e:
            print(f"ERROR in build_field_mcq[{cfg['field']}]: {e}", file=sys.stderr)
            raise
        print(f"build_field_mcq[{cfg['field']}]: {len(questions)} questions, 1 theory doc(s)")
        emit_chunk(f"content.field-{cfg['field']}.generated.ts", questions=questions, theory=[theory])
        all_questions += questions
        all_theory.append(theory)
        total_q += len(questions)
        total_theory += 1

    essays, theory = build_eufte()
    print(f"build_eufte: {len(essays)} essay prompts, {len(theory)} theory doc(s)")
    emit_chunk('content.eufte.generated.ts', theory=theory, essays=essays)
    all_essays += essays
    all_theory += theory
    total_theory += len(theory)

    print(f"\nTOTAL: {total_q} questions, {total_theory} theory docs, {len(all_essays)} essay prompts")
    print(f"Wrote 8 chunk files to {GEN_DIR}")

    debug_dir = Path(__file__).resolve().parent / "_debug"
    debug_dir.mkdir(exist_ok=True)
    (debug_dir / "questions.json").write_text(json.dumps(all_questions, ensure_ascii=False, indent=2), encoding='utf-8')
    (debug_dir / "theory.json").write_text(json.dumps(all_theory, ensure_ascii=False, indent=2), encoding='utf-8')
    (debug_dir / "essays.json").write_text(json.dumps(all_essays, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
