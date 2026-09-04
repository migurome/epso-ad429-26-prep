import { describe, it, expect } from 'vitest'
import { splitPanels, parsePanel, parseMarkdownTable, extractPromptFigures } from './abstractFigure'

describe('splitPanels', () => {
  it('splits a simple sequence by spaces', () => {
    expect(splitPanels('● ●● ●●● ●●●● ?')).toEqual(['●', '●●', '●●●', '●●●●', '?'])
  })

  it('does not split inside parentheses with spaces', () => {
    expect(splitPanels('▲(rotated 90° clockwise) ?')).toEqual(['▲(rotated 90° clockwise)', '?'])
  })

  it('treats · and — as panel separators (real-bank style)', () => {
    expect(splitPanels('▲(arrow ↘) · ●(arrow ↗) · □(arrow ↖) · ?')).toEqual([
      '▲(arrow ↘)',
      '●(arrow ↗)',
      '□(arrow ↖)',
      '?',
    ])
  })
})

describe('parsePanel', () => {
  it('parses "?" as blank', () => {
    expect(parsePanel('?')).toMatchObject({ isBlank: true })
  })

  it('parses a repeated filled circle count', () => {
    const p = parsePanel('●●●●')
    expect(p.shapes).toHaveLength(4)
    expect(p.shapes.every((s) => s.shape === 'circle' && s.fill === 'filled')).toBe(true)
  })

  it('parses an empty triangle', () => {
    const p = parsePanel('△')
    expect(p.shapes).toEqual([{ shape: 'triangle', fill: 'empty', rotationDeg: 0, size: 'medium' }])
  })

  it('parses position attribute', () => {
    const p = parsePanel('●(top-left)')
    expect(p.shapes[0]).toMatchObject({ shape: 'circle', fill: 'filled', position: 'top-left' })
  })

  it('parses size attribute', () => {
    const p = parsePanel('●(small)')
    expect(p.shapes[0].size).toBe('small')
  })

  it('parses "N large" option style (space before parenthesis)', () => {
    const p = parsePanel('◆◆◆ (large)')
    expect(p.shapes).toHaveLength(3)
    expect(p.shapes.every((s) => s.size === 'large' && s.shape === 'diamond')).toBe(true)
  })

  it('parses verbal rotation', () => {
    const p = parsePanel('▲(rotated 90° clockwise)')
    expect(p.shapes[0]).toMatchObject({ shape: 'triangle', fill: 'filled', rotationDeg: 90 })
  })

  it('parses counter-clockwise rotation as negative degrees', () => {
    const p = parsePanel('△(rotated 45° counter-clockwise)')
    expect(p.shapes[0].rotationDeg).toBe(-45)
  })

  it('parses a compass arrow', () => {
    expect(parsePanel('→').shapes[0]).toMatchObject({ shape: 'arrow', rotationDeg: 0 })
    expect(parsePanel('↖').shapes[0]).toMatchObject({ shape: 'arrow', rotationDeg: 225 })
  })

  it('parses a directional triangle', () => {
    expect(parsePanel('▶').shapes[0]).toMatchObject({ shape: 'triangle', fill: 'filled', rotationDeg: 90 })
    expect(parsePanel('◁').shapes[0]).toMatchObject({ shape: 'triangle', fill: 'empty', rotationDeg: 270 })
  })

  it('parses grey and hatched fill overrides', () => {
    expect(parsePanel('●(grey)').shapes[0].fill).toBe('grey')
    expect(parsePanel('■(hatched)').shapes[0].fill).toBe('hatched')
  })

  it('draws "(arrow X)" as a small extra arrow shape instead of leaving it as raw text', () => {
    const p = parsePanel('▲(arrow ↘)')
    expect(p.shapes).toHaveLength(2)
    expect(p.shapes[0]).toMatchObject({ shape: 'triangle', fill: 'filled' })
    expect(p.shapes[1]).toMatchObject({ shape: 'arrow', rotationDeg: 45, size: 'small' })
    expect(p.caption).toBeUndefined()
  })

  it('falls back to caption for genuinely unrecognised parenthesis content, keeping the base shape', () => {
    const p = parsePanel('▲(wibble)')
    expect(p.shapes).toHaveLength(1)
    expect(p.shapes[0].shape).toBe('triangle')
    expect(p.caption).toBe('wibble')
  })

  it('extracts bracket description as caption, keeping the base shape', () => {
    const p = parsePanel('▲[quartered: TR filled]')
    expect(p.shapes[0]).toMatchObject({ shape: 'triangle', fill: 'filled' })
    expect(p.caption).toBe('quartered: TR filled')
  })

  it('handles a real-bank composite option with multiple symbols and a slash', () => {
    const p = parsePanel('♡ ▲(right)[quartered: near-apex-bottom quadrant filled] / ●○')
    // ♡ ▲ ● ○ are all recognised symbols
    expect(p.shapes.map((s) => s.shape)).toEqual(['heart', 'triangle', 'circle', 'circle'])
    expect(p.caption).toContain('quartered: near-apex-bottom quadrant filled')
  })

  it('falls back to pure caption when nothing is recognised', () => {
    const p = parsePanel('(no stars)')
    expect(p.shapes).toHaveLength(0)
    expect(p.caption).toBe('no stars')
  })
})

describe('parseMarkdownTable', () => {
  it('parses a 3x3 matrix with an empty header row', () => {
    const md = '| | | |\n|---|---|---|\n| ● | ●● | ●●● |\n| ▲ | ▲▲ | ▲▲▲ |\n| ■ | ■■ | ? |'
    const table = parseMarkdownTable(md)
    expect(table).toEqual([
      ['●', '●●', '●●●'],
      ['▲', '▲▲', '▲▲▲'],
      ['■', '■■', '?'],
    ])
  })

  it('returns null for non-table text', () => {
    expect(parseMarkdownTable('Four of these five figures share a rule; one does not.')).toBeNull()
  })
})

describe('extractPromptFigures', () => {
  it('extracts a simple AI-bank sequence', () => {
    const result = extractPromptFigures('● ●● ●●● ●●●● ?')
    expect(result?.kind).toBe('sequence')
    expect(result?.panels).toHaveLength(5)
    expect(result?.panels[4].isBlank).toBe(true)
  })

  it('extracts a matrix and keeps no stray remainder text', () => {
    const md = '| | | |\n|---|---|---|\n| ● | ●● | ●●● |\n| ▲ | ▲▲ | ▲▲▲ |\n| ■ | ■■ | ? |'
    const result = extractPromptFigures(md)
    expect(result?.kind).toBe('matrix')
    expect(result?.panels).toHaveLength(9)
    expect(result?.columns).toBe(3)
    expect(result?.remainderMd).toBe('')
  })

  it('extracts a real-bank sequence and keeps the trailing explanation as remainder', () => {
    const prompt =
      '▲(arrow ↘) · ●(arrow ↗) · □(arrow ↖) · △(arrow ↙) · ●(arrow ↘) · ?\n\nEach panel is a shape with a small diagonal arrow attached.'
    const result = extractPromptFigures(prompt)
    expect(result?.kind).toBe('sequence')
    expect(result?.panels).toHaveLength(6)
    expect(result?.remainderMd).toBe('Each panel is a shape with a small diagonal arrow attached.')
  })

  it('extracts a positioned sequence', () => {
    const result = extractPromptFigures('●(top-left) ●(top-centre) ●(top-right) ●(mid-right) ?')
    expect(result?.kind).toBe('sequence')
    expect(result?.panels[0].shapes[0].position).toBe('top-left')
    expect(result?.panels).toHaveLength(5)
  })

  it('returns null for a purely textual odd-one-out prompt', () => {
    const result = extractPromptFigures('Four of these five figures share a rule; one does not.')
    expect(result).toBeNull()
  })

  it('finds the figure block even when a descriptive sentence comes first (real-bank style)', () => {
    const prompt =
      'A tall black slanted bar ("rhomboid") slides left-to-right across a row of small scrolling shapes, hiding whichever one(s) it currently overlaps; the small shapes rotate 45° each panel and their shading cycles white → striped → grey.\n\n' +
      '▮(black) ◈(hatched diamond) □(white) · ◁(white triangle) ▮(black) ◈(hatched diamond) · ▷(white triangle) ○(white circle) ▮(black) · ▲(grey triangle) ⊙(hatched circle) ◇(white diamond) ▮(black) · ▮(black) ●(grey circle) ▤(hatched rect.) □(white) · ?'
    const result = extractPromptFigures(prompt)
    expect(result?.kind).toBe('sequence')
    // 5 panels (each with 3-4 bundled symbols) + the blank "?" panel
    expect(result?.panels).toHaveLength(6)
    expect(result?.panels[0].shapes.length).toBeGreaterThan(1)
    expect(result?.panels.at(-1)?.isBlank).toBe(true)
    expect(result?.remainderMd).toContain('rhomboid')
  })

  it('keeps multiple symbols bundled in the same panel when separated by plain spaces under ·', () => {
    const panels = splitPanels('▮(black) ◈(hatched diamond) □(white) · ◁(white triangle) ▮(black)')
    expect(panels).toEqual(['▮(black) ◈(hatched diamond) □(white)', '◁(white triangle) ▮(black)'])
  })

  // Regresión: la prosa usa '→' como puntuación ("negro → gris → blanco"), y
  // '→' es un símbolo de figura reconocido. Sin un umbral mínimo de paneles
  // dibujables, el párrafo entero se troceaba en un panel por palabra y se
  // pintaba como una ristra de recuadros de texto, dejando además la
  // secuencia real (descrita solo con corchetes) como texto plano debajo.
  it('does not treat a prose paragraph with arrow punctuation as a figure sequence', () => {
    const prompt =
      'A circle sprouts short "sun-ray" spike lines one at a time; a dividing line rotates 45° clockwise each panel; the two halves it creates are shaded grey → clear → black (repeating).\n\n' +
      '[1 spike] [line ~horizontal] · [2 spikes] [line diagonal] · [3 spikes] [line ~vertical] · ?'
    expect(extractPromptFigures(prompt)).toBeNull()
  })

  it('still accepts a sequence whose only non-figure panel is the blank "?"', () => {
    const result = extractPromptFigures('● ●● ●●● ●●●● ●●●●● ?')
    expect(result?.kind).toBe('sequence')
    expect(result?.panels).toHaveLength(6)
  })
})
