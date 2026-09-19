import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const page = readFileSync(resolve(import.meta.dirname, '../pages/generate/generate.vue'), 'utf8')

function rule(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return page.match(new RegExp(`(?:^|\\n)\\s*${escaped}(?:\\s*,[^\\{]+)?\\s*\\{([^}]+)\\}`))?.[1] || ''
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

test('review notes copies the rendered home-card dimensions without expanding its section', () => {
  assert.match(page, /'page-type-selection':\s*!typeStepDone\s*&&\s*isHomeDecor/)
  assert.match(page, /'type-grid-home':\s*isHomeDecor/)
  assert.match(page, /'type-grid-review':\s*isReviewNotes/)
  assert.match(page, /:style="reviewNotesCardStyle"/)
  assert.match(page, /reviewNotesCardStyle\(\)\s*\{[\s\S]*?width:\s*`\$\{this\.homeTypeCardSize\.width\}px`[\s\S]*?height:\s*`\$\{this\.homeTypeCardSize\.height\}px`/)
  assert.match(page, /captureHomeTypeCardSize\(\)\s*\{[\s\S]*?select\('\.type-grid-home \.type-card'\)/)
  assert.match(page, /switchEntry\(value\)\s*\{[\s\S]*?this\.captureHomeTypeCardSize\(\)/)

  const cardRule = rule('.type-grid-review .type-card')
  assert.match(cardRule, /width:\s*auto/)
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

test('content type cards are populated from the schema instead of a misleading local fallback', () => {
  assert.doesNotMatch(page, /DEFAULT_DECORATION_CONTENT_TYPES/)
  assert.match(page, /content_types:\s*\[\]/)
  assert.match(page, /v-if="schemaLoading && !schemaLoaded"/)

  const onLoad = page.match(/async onLoad\(\) \{([\s\S]*?)\r?\n  \},\r?\n  async onShow/)
  assert.ok(onLoad)
  assert.match(onLoad[1], /this\.loadSchema\(\)/)
})

test('selecting an available content type does not wait for schema or gallery requests', () => {
  const selectContentType = page.match(/selectContentType\(typeCode\) \{([\s\S]*?)\r?\n    \},\r?\n    backToTypeStep/)
  const loadSchema = page.match(/async loadSchema\(\) \{([\s\S]*?)\r?\n    \},\r?\n    onFrameArea/)

  assert.ok(selectContentType)
  assert.ok(loadSchema)
  assert.doesNotMatch(selectContentType[1], /await this\.loadSchema\(\)/)
  assert.doesNotMatch(loadSchema[1], /await this\.loadGalleries\(\)/)
  assert.match(loadSchema[1], /this\.loadGalleries\(\)/)
})

test('the first-screen schema skips remote HyCanvas templates and loads them in the background', () => {
  const loadSchema = page.match(/async loadSchema\(\) \{([\s\S]*?)\r?\n    \},\r?\n    applyHycanvasTemplates/)

  assert.ok(loadSchema)
  assert.match(loadSchema[1], /formSchema\(serviceEntry, \{ includeHycanvasTemplates: false \}\)/)
  assert.match(loadSchema[1], /this\.loadHycanvasTemplates\(serviceEntry\)/)
  assert.match(loadSchema[1], /this\.loadCoverTemplateExtras\(serviceEntry\)/)
  assert.doesNotMatch(loadSchema[1], /await mpContentApi\.hycanvasTemplates\(/)
})
