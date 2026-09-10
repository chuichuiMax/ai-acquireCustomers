import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

test('generate page avoids nullish coalescing for older WeChat runtimes', () => {
  const page = readFileSync(resolve(import.meta.dirname, '../pages/generate/generate.vue'), 'utf8')

  assert.doesNotMatch(page, /\?\?/)
  assert.match(page, /Object\.prototype\.hasOwnProperty\.call\(rank, aName\)/)
  assert.match(page, /Object\.prototype\.hasOwnProperty\.call\(rank, bName\)/)
})
