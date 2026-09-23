import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { buildGenerationProcess, normalizeRunSnapshot, shouldAutoPassInterrupt } from '../utils/generation-process.mjs'

test('strategy phase matches the PC production process copy', () => {
  const process = buildGenerationProcess({
    status: 'running',
    nodes: [
      { node_id: 'normalize_evidence', status: 'completed' },
      { node_id: 'match_combination_group', status: 'completed' },
      { node_id: 'rank_formula_candidates', status: 'running', attempt: 1 }
    ],
    events: [
      { event_type: 'content.agent.started', payload: { node_id: 'rank_formula_candidates', attempt: 1 } },
      {
        event_type: 'content.tool.called',
        payload: { node_id: 'rank_formula_candidates', tool_name: 'submit_content_node_result', attempt: 1 }
      }
    ]
  })

  assert.equal(process.title, '锚定策略与公式')
  assert.equal(process.thinking, true)
  assert.deepEqual(
    process.lines.map((item) => item.text),
    [
      '正在核对事实来源，筛除重复或不能直接用于创作的信息。',
      '正在按内容方向、变量与证据覆盖度，用固定规则锁定创作手法和公式。',
      '第1次调用 • 正在执行策略择优',
      '第1次调用 • 模型已开始返回内容'
    ]
  )
})

test('nested run payload is flattened for the generating page', () => {
  const snapshot = normalizeRunSnapshot({
    run: { id: 'run-1', status: 'running', error_message: 'x' },
    interrupt: { interrupt_type: 'external_wait' },
    nodes: [{ node_id: 'wait_cover_job', status: 'running' }],
    events: []
  })

  assert.equal(snapshot.runId, 'run-1')
  assert.equal(snapshot.status, 'running')
  assert.equal(snapshot.interrupt.interrupt_type, 'external_wait')
  assert.equal(snapshot.nodes[0].node_id, 'wait_cover_job')
})

test('without node events the page still walks the production process', () => {
  const early = buildGenerationProcess({ status: 'running', elapsedSeconds: 10 })
  assert.equal(early.title, '锚定策略与公式')
  assert.match(early.lines.map((item) => item.text).join('\n'), /核对事实来源/)
  assert.match(early.lines.map((item) => item.text).join('\n'), /第1次调用 • 正在执行策略择优/)
  assert.equal(early.thinking, true)

  const later = buildGenerationProcess({ status: 'running', elapsedSeconds: 45 })
  assert.equal(later.title, '撰写正文')
})

test('title and cover interrupts pass through without waiting for the user', () => {
  assert.equal(shouldAutoPassInterrupt('title_selection'), true)
  assert.equal(shouldAutoPassInterrupt('cover_selection'), true)
  assert.equal(shouldAutoPassInterrupt('content_correction'), false)
  assert.equal(shouldAutoPassInterrupt('content_direction'), false)

  const page = readFileSync(resolve(import.meta.dirname, '../pages/generate/locked.vue'), 'utf8')
  assert.match(page, /advancePassThrough\(\)/)
  assert.match(page, /shouldAutoPassInterrupt\(type\)/)
  assert.doesNotMatch(page, /请选择最终标题/)
  assert.doesNotMatch(page, /选择最终封面/)
  assert.doesNotMatch(page, /会在标题候选处暂停/)
})

test('generating page renders the production process instead of a fake progress bar', () => {
  const page = readFileSync(resolve(import.meta.dirname, '../pages/generate/locked.vue'), 'utf8')
  assert.match(page, /generationProcess\.title/)
  assert.match(page, /正在思考\.\.\./)
  assert.doesNotMatch(page, /progressPercent/)
  assert.doesNotMatch(page, /正在生成\{\{ serviceEntry/)
})
