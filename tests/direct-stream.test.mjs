import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyDirectStreamEvent,
  createDirectStreamState,
  directStreamHeading,
  reduceEventsToDirectStream,
  refreshDirectStreamFromRunEvents,
  shouldShowDirectStreamUi,
  unwrapRunEventPayload
} from '../utils/direct-stream.mjs'

test('direct stream accumulates title and body deltas like PC', () => {
  let state = createDirectStreamState(true)
  state = applyDirectStreamEvent(state, 'content.direct.delta', {
    field: 'title',
    value: '标题A',
    delta: '标题A'
  })
  state = applyDirectStreamEvent(state, 'content.direct.delta', {
    field: 'body',
    value: '第一段',
    delta: '第一段'
  })
  state = applyDirectStreamEvent(state, 'content.direct.delta', {
    field: 'body',
    value: '第一段第二段',
    delta: '第二段'
  })
  assert.equal(state.title, '标题A')
  assert.equal(state.body, '第一段第二段')
  assert.equal(directStreamHeading(state), '正在生成内容')
})

test('reduceEventsToDirectStream replays run events from getRun polling', () => {
  const state = reduceEventsToDirectStream(
    [
      { event_type: 'metadata', payload: { run_type: 'content_direct' } },
      { event_type: 'content.direct.delta', payload: { field: 'body', value: '正文', delta: '正文' } },
      { event_type: 'content.cover.started', payload: {} }
    ],
    { active: true }
  )
  assert.equal(state.body, '正文')
  assert.equal(state.phase, 'cover')
})

test('unwrapRunEventPayload reads SSE envelope like PC contentStudio store', () => {
  assert.deepEqual(
    unwrapRunEventPayload({
      schema_version: 1,
      run_id: 'run-1',
      payload: { field: 'body', value: '正文', delta: '正文' }
    }),
    { field: 'body', value: '正文', delta: '正文' }
  )
})

test('refreshDirectStreamFromRunEvents keeps SSE copy when MP poll returns empty events', () => {
  const current = reduceEventsToDirectStream(
    [{ event_type: 'content.direct.delta', payload: { field: 'body', value: '正文', delta: '正文' } }],
    { active: true }
  )
  current.phase = 'cover'
  const next = refreshDirectStreamFromRunEvents(current, [], { useDirectRun: true })
  assert.equal(next.body, '正文')
  assert.equal(next.phase, 'cover')
})

test('shouldShowDirectStreamUi during cover when copy exists', () => {
  assert.equal(
    shouldShowDirectStreamUi({
      isGenerating: false,
      useDirectRun: true,
      directStream: {
        phase: 'cover',
        title: '标题',
        body: '正文',
        topics: []
      },
      runEvents: []
    }),
    true
  )
})

test('shouldShowDirectStreamUi when delta events exist', () => {
  assert.equal(
    shouldShowDirectStreamUi({
      isGenerating: true,
      useDirectRun: false,
      directStream: createDirectStreamState(false),
      runEvents: [{ event_type: 'content.direct.delta', payload: { field: 'body', delta: 'x' } }]
    }),
    true
  )
})
