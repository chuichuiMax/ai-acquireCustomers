import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveProductionStatusLabel } from '../utils/manage-production-status.mjs'

test('production success maps to 已审核', () => {
  for (const status of ['generated', 'reviewed', 'completed', 'review_required']) {
    assert.equal(resolveProductionStatusLabel(status), '已审核')
  }
})

test('production queue maps to 排队中', () => {
  for (const status of ['queued', 'running', 'draft', 'brief_ready', 'strategy_ready', 'waiting_human']) {
    assert.equal(resolveProductionStatusLabel(status), '排队中')
  }
})

test('production failure maps to 失败', () => {
  for (const status of ['failed', 'cancelled', 'review_blocked']) {
    assert.equal(resolveProductionStatusLabel(status), '失败')
  }
})
