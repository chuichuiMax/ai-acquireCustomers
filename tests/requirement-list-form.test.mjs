import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  FORM_STEPS,
  QUESTIONS,
  blankAnswers,
  completionOf,
  mergeAnswers,
  questionsForStep,
  requirementFormPack
} from '../utils/requirement-list-form.mjs'

test('requirement questionnaire matches PC question count', () => {
  assert.equal(QUESTIONS.length, 18)
})

test('merge answers restores saved questionnaire payload', () => {
  const answers = mergeAnswers({ q1: '平层', q7: ['法式奶油', '原木风'] })
  assert.equal(answers.q1, '平层')
  assert.deepEqual(answers.q7, ['法式奶油', '原木风'])
  assert.ok(Array.isArray(blankAnswers().q9))
})

test('decorated pack matches EDC t13s87 question volume', () => {
  const pack = requirementFormPack('decorated')
  assert.equal(pack.questions.length, 36)
  assert.equal(pack.steps.length, 6)
  assert.equal(pack.introTitle, '精装房定制需求表')
})

test('renovation pack stops at whole-house section (no window sealing onward)', () => {
  const pack = requirementFormPack('renovation')
  assert.equal(pack.questions.length, 15)
  assert.equal(pack.steps.length, 3)
  assert.equal(pack.steps[2].title, '全房需求')
  assert.deepEqual(
    pack.steps[2].questionKeys,
    ['field015', 'field016', 'field017', 'field018']
  )
  assert.equal(pack.questions.some((item) => item.key === 'field019'), false)
})

test('form wizard has six steps and field-based completion', () => {
  assert.equal(FORM_STEPS.length, 6)
  assert.equal(questionsForStep(0).map((item) => item.key).join(','), 'q1,q2')
  const blank = completionOf({ answers: blankAnswers(), customerName: '', phone: '', address: '' })
  assert.equal(blank.filled, 0)
  assert.ok(blank.total >= 20)
  const partial = completionOf({
    answers: { ...blankAnswers(), q1: '平层' },
    customerName: '张三',
    phone: '',
    address: ''
  })
  assert.equal(partial.filled, 2)
  assert.ok(partial.percent > 0)
})

test('requirement fill page avoids invalid :class object keys', () => {
  const page = readFileSync(resolve(import.meta.dirname, '../pages/mine/requirement-list-fill.vue'), 'utf8')
  const classBlocks = page.match(/:class="\{[\s\S]*?\}"/g) || []
  for (const block of classBlocks) {
    assert.doesNotMatch(block, /^\s*[a-z][\w]*-[\w-]*\s*:/m)
  }
  assert.match(page, /previewMode/)
  assert.match(page, /FORM_STEPS|formSteps/)
  assert.match(page, /openPreview/)
})
