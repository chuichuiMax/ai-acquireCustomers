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

test('selected content card shows a soft immediate bottom glow before advancing', () => {
  const cardRule = rule('.type-card')
  assert.match(cardRule, /position:\s*relative/)

  const glowRule = rule('.type-card::after')
  assert.match(glowRule, /content:\s*['"]{2}/)
  assert.match(glowRule, /height:\s*3px/)
  assert.match(glowRule, /background:\s*linear-gradient/)
  assert.match(glowRule, /rgba\(222,\s*180,\s*108,\s*0\.72\)\s*50%/)
  assert.doesNotMatch(glowRule, /rgba\(255,\s*239,\s*207/)
  assert.match(glowRule, /box-shadow:/)
  assert.match(glowRule, /rgba\(210,\s*158,\s*78,\s*0\.22\)/)
  assert.match(glowRule, /opacity:\s*0/)
  assert.doesNotMatch(glowRule, /transform:/)
  assert.match(glowRule, /transition:\s*opacity\s+60ms\s+linear/)

  const activeGlowRule = rule('.type-card.active::after')
  assert.match(activeGlowRule, /opacity:\s*0\.86/)
  assert.doesNotMatch(activeGlowRule, /transform:/)
  assert.match(page, /this\._typeSelectTimer\s*=\s*setTimeout\([\s\S]*?},\s*220\)/)
})
