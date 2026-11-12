import assert from 'node:assert/strict'
import test from 'node:test'

import { requirementListUrl } from '../utils/requirement-list-url.mjs'

test('requirement list url uses the current employee code', () => {
  assert.equal(
    requirementListUrl('H04854'),
    'http://portal.hi-run.net/edc/formview/z66223?usercode=H04854#/?_key=37n795'
  )
})

test('requirement list url is empty without an employee code', () => {
  assert.equal(requirementListUrl(''), '')
  assert.equal(requirementListUrl('  '), '')
})
