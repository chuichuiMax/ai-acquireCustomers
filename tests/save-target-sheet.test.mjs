import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const componentPath = resolve(import.meta.dirname, '../components/image-design/SaveTargetSheet.vue')

test('save target sheet has scope and folder stages with a root default', () => {
  assert.equal(existsSync(componentPath), true, 'SaveTargetSheet component must exist')
  const component = readFileSync(componentPath, 'utf8')
  assert.match(component, /stage === 'scope'/)
  assert.match(component, /selectScope\(scope\)/)
  assert.match(component, /gallery_id:\s*null/)
  assert.match(component, /\$emit\('confirm',\s*\{\s*\.\.\.this\.candidate\s*\}\)/)
  assert.match(component, />确定</)
  assert.doesNotMatch(component, /<picker/)
})

test('folder stage offers only authorized root save and lets the user select folders locally', () => {
  const component = readFileSync(componentPath, 'utf8')
  assert.match(component, /v-if="activeScope\.can_write_root"/)
  assert.match(component, /直接保存到\{\{\s*activeScope\.label\s*\}\}/)
  assert.match(component, /backToScopes\(\)/)
  assert.match(component, /\$emit\('close'\)/)
  assert.match(component, /selectFolder\(folder\)/)
  assert.match(component, /gallery_id:\s*folder\.id/)
})
