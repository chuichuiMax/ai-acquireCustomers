import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const page = readFileSync(resolve(import.meta.dirname, '../pages/generate/generate.vue'), 'utf8')

function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return page.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]+)\\}`))?.[1] || ''
}

test('home decor type selection uses the available viewport height', () => {
  assert.match(page, /'page-type-selection':\s*!typeStepDone\s*&&\s*isHomeDecor/)

  const pageRule = rule('.page-type-selection')
  assert.match(pageRule, /height:\s*100vh/)
  assert.match(pageRule, /display:\s*flex/)
  assert.match(pageRule, /flex-direction:\s*column/)
  assert.match(pageRule, /box-sizing:\s*border-box/)

  const stepRule = rule('.page-type-selection .type-step')
  assert.match(stepRule, /flex:\s*1/)
  assert.match(stepRule, /min-height:\s*0/)
})

test('home decor cards form two columns and three equal rows', () => {
  assert.match(page, /'type-grid-home':\s*isHomeDecor/)

  const gridRule = rule('.type-grid-home')
  assert.match(gridRule, /display:\s*grid/)
  assert.match(gridRule, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/)
  assert.match(gridRule, /grid-template-rows:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/)

  const cardRule = rule('.type-grid-home .type-card')
  assert.match(cardRule, /margin-bottom:\s*0/)
  assert.match(cardRule, /justify-content:\s*center/)
})

test('selected content card changes only its border and icon frame before advancing', () => {
  const cardRule = rule('.type-card')
  assert.match(cardRule, /position:\s*relative/)
  assert.match(cardRule, /border:\s*1px\s+solid\s+#e5e0dc/)
  assert.match(cardRule, /background:\s*#fff/)

  const activeCardRule = rule('.type-card.active')
  assert.match(activeCardRule, /border-color:\s*#BE2D22/)
  assert.doesNotMatch(activeCardRule, /background:/)

  const iconFrameRule = rule('.type-icon-wrap')
  assert.match(iconFrameRule, /width:\s*36px/)
  assert.match(iconFrameRule, /height:\s*36px/)
  assert.match(iconFrameRule, /background:\s*#E8E8E8/)

  const activeIconFrameRule = rule('.type-card.active .type-icon-wrap')
  assert.match(activeIconFrameRule, /background:\s*#BE2D22/)

  const iconRule = rule('.type-icon-image')
  assert.match(iconRule, /width:\s*26px/)
  assert.match(iconRule, /height:\s*26px/)

  assert.equal(rule('.type-card::after'), '')
  assert.equal(rule('.type-card.active::after'), '')
  assert.equal(rule('.type-card.active .type-name'), '')
  assert.equal(rule('.type-card.active .type-desc'), '')
  assert.equal(rule('.type-card.active .type-icon-text'), '')
  assert.match(page, /this\._typeSelectTimer\s*=\s*setTimeout\([\s\S]*?},\s*220\)/)
})

test('content type cards have a local default before the schema request', () => {
  assert.match(page, /const DEFAULT_DECORATION_CONTENT_TYPES\s*=\s*Object\.freeze\(/)
  assert.match(page, /content_types:\s*DEFAULT_DECORATION_CONTENT_TYPES/)

  const onLoad = page.match(/async onLoad\(\) \{([\s\S]*?)\r?\n  \},\r?\n  async onShow/)
  const selectContentType = page.match(/selectContentType\(typeCode\) \{([\s\S]*?)\r?\n    \},\r?\n    backToTypeStep/)
  assert.ok(onLoad)
  assert.ok(selectContentType)
  assert.doesNotMatch(onLoad[1], /loadSchema\(/)
  assert.match(selectContentType[1], /await this\.loadSchema\(\)/)
})
