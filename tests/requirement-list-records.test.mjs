import assert from 'node:assert/strict'
import test from 'node:test'

import {
  formatRequirementRecordTime,
  matchesRequirementCategory,
  normalizeRequirementRecordList,
  presentRequirementRecord,
  requirementRecordCustomerLine,
  requirementRecordSharedAt,
  requirementRecordSharerName,
  requirementRecordSharedMembersLine,
  requirementRecordSubmitterName,
  resolveRequirementRecordCompletion
} from '../utils/requirement-list-records.mjs'
import { blankAnswers, completionOf } from '../utils/requirement-list-form.mjs'

test('requirement records accept paginated list shapes', () => {
  const rows = [{ id: '1', title: '毛坯房' }]
  assert.deepEqual(normalizeRequirementRecordList({ items: rows }), rows)
  assert.deepEqual(normalizeRequirementRecordList({ records: rows }), rows)
})

test('requirement record time accepts dashed and legacy stamps', () => {
  assert.equal(formatRequirementRecordTime('2026-11-20 15:00'), '2026-11-20 15:00')
  assert.equal(formatRequirementRecordTime('20261120 15:00'), '2026-11-20 15:00')
})

test('shared members line joins names', () => {
  assert.equal(
    requirementRecordSharedMembersLine([{ name: '张三' }, { name: '李四' }]),
    '张三，李四'
  )
})

test('record meta fields show submitter sharer and share time', () => {
  const row = {
    submitter_name: '微信用户甲',
    sharer_name: '徐迎港',
    shared_at: '2026-11-20 15:00'
  }
  assert.equal(requirementRecordSubmitterName(row), '微信用户甲')
  assert.equal(requirementRecordSharerName(row), '徐迎港')
  assert.equal(requirementRecordSharedAt(row), '2026-11-20 15:00')
  assert.equal(requirementRecordSubmitterName({}), '—')
})

test('requirement record customer line joins visible fields', () => {
  assert.equal(
    requirementRecordCustomerLine({
      customer_name: '陈先生',
      phone_masked: '138****0001',
      city: '长沙',
      project_name: '保利天禧 3 栋'
    }),
    '陈先生 · 138****0001 · 长沙 · 保利天禧 3 栋'
  )
})

test('requirement record presenter maps requirement_type from PC API', () => {
  const row = presentRequirementRecord({
    id: '1',
    requirement_type: '毛坯房',
    progress: '100%'
  })
  assert.equal(row.title, '毛坯房')
  assert.equal(row.completion_percent, 100)
})

test('record completion uses filled/total when answers are present', () => {
  const record = {
    progress: '100%',
    customer_name: '张三',
    answers: { ...blankAnswers(), q1: '平层' }
  }
  const expected = completionOf({
    answers: record.answers,
    customerName: record.customer_name,
    phone: '',
    address: ''
  }).percent
  assert.equal(resolveRequirementRecordCompletion(record), expected)
  assert.notEqual(expected, 100)
})

test('requirement record category filter matches aliases', () => {
  const record = { category: '毛坯房' }
  assert.equal(matchesRequirementCategory(record, ''), true)
  assert.equal(matchesRequirementCategory(record, 'rough'), true)
  assert.equal(matchesRequirementCategory(record, 'decorated'), false)
})
