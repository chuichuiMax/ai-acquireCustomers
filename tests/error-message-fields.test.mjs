import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const requestSource = readFileSync(resolve(import.meta.dirname, '../utils/request.js'), 'utf8')

test('errorMessage surfaces missing brief field labels from API detail', () => {
  assert.match(requestSource, /detail\.error\.fields \|\| detail\.fields/)
  assert.match(requestSource, /\$\{detail\.error\.message\}：\$\{labels\.join\('、'\)\}/)
})
