import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  COUNT_OPTIONS,
  DESIGN_STYLE_CHIPS,
  QUALITY_OPTIONS,
  RATIO_OPTIONS,
  SAVE_PATH_OPTIONS,
  buildPolishedPrompt,
  extractPolishedPrompt,
  flattenResultCards,
  formatCompactDate,
  formatResultDateTime,
  isMissingApi,
  jobStatusLabel,
  normalizeJobs,
  promptForStyle,
  ratioSize,
  recognitionLabel,
  resolveDesignFolders
} from '../utils/design-image.mjs'

test('design style chips keep the PC workflow order first', () => {
  assert.deepEqual(DESIGN_STYLE_CHIPS.slice(0, 12), [
    '复合写意',
    '写意木构',
    '江南印象',
    '欧美香颂',
    '欧式田园',
    '异域风情',
    '东方古雅',
    '轻欧简美',
    '北欧之光',
    '新装饰主义',
    '优雅缤纷',
    '极简侘寂'
  ])
  assert.ok(!DESIGN_STYLE_CHIPS.includes('全部'))
})

test('style prompt is filled after choosing a restyle chip', () => {
  assert.match(promptForStyle('复合写意'), /复合写意/)
  assert.match(promptForStyle('未知风格'), /未知风格/)
})

test('polish fallback keeps the selected style and extra request', () => {
  const prompt = buildPolishedPrompt({ style: '北欧之光', extra: '电视墙做岩板' })
  assert.match(prompt, /北欧之光/)
  assert.match(prompt, /电视墙做岩板/)
  assert.match(prompt, /保留原有房屋结构/)
})

test('polish response can come from several backend field names', () => {
  assert.equal(extractPolishedPrompt({ polished_prompt: 'A' }, 'B'), 'A')
  assert.equal(extractPolishedPrompt({ prompt: 'A' }, 'B'), 'A')
  assert.equal(extractPolishedPrompt({}, 'B'), 'B')
})

test('ratio, count, quality and save path match the PC form', () => {
  assert.equal(ratioSize('portrait'), '1080x1440')
  assert.equal(ratioSize('landscape'), '1440x1080')
  assert.equal(ratioSize('square'), '1024x1024')
  assert.deepEqual(COUNT_OPTIONS, [2, 4])
  assert.deepEqual(
    QUALITY_OPTIONS.map((item) => item.label),
    ['1K标清', '2K高清']
  )
  assert.deepEqual(
    SAVE_PATH_OPTIONS.map((item) => item.label),
    ['个人中心作品', '公共图库']
  )
  assert.equal(RATIO_OPTIONS.length, 3)
})

test('case and rough galleries are resolved by name', () => {
  const galleries = [
    { id: 'a', name: '案例图库', parent_id: null },
    { id: 'b', name: '毛坯图库', parent_id: null },
    { id: 'c', name: '其他', parent_id: 'a' }
  ]
  assert.deepEqual(resolveDesignFolders(galleries), {
    caseGallery: galleries[0],
    roughGallery: galleries[1]
  })
})

test('job list and status labels normalize backend variants', () => {
  const jobs = normalizeJobs({ items: [{ job_id: '1', status: 'running', result_urls: ['/a.png'] }] })
  assert.equal(jobs[0].id, '1')
  assert.equal(jobs[0].status, 'running')
  assert.deepEqual(jobs[0].images, ['/a.png'])
  assert.equal(jobStatusLabel('running'), '生成中')
  assert.equal(jobStatusLabel('succeeded'), '已完成')
  assert.equal(normalizeJobs({ id: '2', status: 'queued' })[0].id, '2')
})

test('missing image APIs are treated as optional', () => {
  assert.equal(isMissingApi({ statusCode: 404 }), true)
  assert.equal(isMissingApi({ statusCode: 500 }), false)
})

test('upload library shows recognition state and compact date', () => {
  const date = new Date(2026, 8, 10, 10, 42)
  assert.equal(recognitionLabel({ recognized: true }), '已识别')
  assert.equal(recognitionLabel({ recognized: false }), '未识别')
  assert.equal(formatCompactDate(date), '20260910')
  assert.deepEqual(formatResultDateTime(date), { date: '2026.09.10', time: '10:42' })
})

test('result cards flatten each generated image', () => {
  const jobs = normalizeJobs({
    jobs: [
      {
        id: '1',
        status: 'succeeded',
        created_at: '2026-09-10T10:42:00',
        result_urls: ['/a.png'],
        source_url: '/src.png'
      }
    ]
  })
  const cards = flattenResultCards(jobs)
  assert.equal(cards.length, 1)
  assert.equal(cards[0].url, '/a.png')
  assert.equal(cards[0].sourceUrl, '/src.png')
})

test('生图 page hosts the current image-design workflow', () => {
  const page = readFileSync(resolve(import.meta.dirname, '..', 'pages/cover/cover.vue'), 'utf8')
  const sourceLogic = readFileSync(resolve(import.meta.dirname, '..', 'utils/image-design-logic.mjs'), 'utf8')
  assert.match(page, /创作工作流/)
  assert.match(page, /换装风格选择/)
  assert.match(page, /AI 深度润色/)
  assert.match(sourceLogic, /案例图库/)
  assert.match(sourceLogic, /毛坯图库/)
  assert.match(page, /选择保存路径/)
  assert.match(page, /<picker[^>]+:range="savePathLabels"/)
  assert.match(page, /生成图片/)
  assert.match(page, /我的生图图库/)
  assert.match(page, /生成结果/)
  assert.match(page, /对比/)
})
