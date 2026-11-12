import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const fields = JSON.parse(readFileSync(resolve(root, 'scripts/edc-t13s87-fields.json'), 'utf8'))

const SKIP = new Set(['field044', 'field041', 'field045', 'field047'])

const TITLE_FIX = {
  field032: '主卫（整体改造）',
  field033: '次卫（整体改造）',
  field034: '主卫（设备需求）',
  field035: '次卫（设备需求）'
}

const questions = []
for (const field of fields) {
  if (SKIP.has(field.field)) continue
  const key = field.field
  const title = TITLE_FIX[key] || field.title
  if (field.type === 'SELECT') {
    const kind = field.select_type === 'checkbox' ? 'check' : 'radio'
    const q = { key, title: title.endsWith('：') ? title : `${title}`, kind, options: [...field.options] }
    if (field.has_other) q.other = true
    questions.push(q)
  } else if (field.type === 'COMBOBOX') {
    questions.push({ key, title, kind: 'radio', options: [...field.options] })
  }
}

const steps = [
  { id: 'base', title: '基本定位', questionKeys: questions.slice(0, 7).map((q) => q.key) },
  {
    id: 'device',
    title: '改造与设备',
    questionKeys: questions.slice(7, 12).map((q) => q.key)
  },
  {
    id: 'living',
    title: '玄关·客厅·餐厅',
    questionKeys: questions.slice(12, 18).map((q) => q.key)
  },
  {
    id: 'bedroom',
    title: '卧室空间',
    questionKeys: questions.slice(18, 25).map((q) => q.key)
  },
  {
    id: 'flex',
    title: '多功能房·阳台',
    questionKeys: questions.slice(25, 29).map((q) => q.key)
  },
  {
    id: 'kitchen',
    title: '厨房·卫浴·店面',
    questionKeys: questions.slice(29).map((q) => q.key)
  }
]

const out = `/** 精装房题本：与 EDC http://portal.hi-run.net/edc/formview/t13s87 同源（getPageInfo key=t13s87） */
export const DECORATED_FORM_INTRO_TITLE = '精装房定制需求表'

export const DECORATED_QUESTIONS = ${JSON.stringify(questions, null, 2)}

export const DECORATED_FORM_STEPS = ${JSON.stringify(steps, null, 2)}
`

writeFileSync(resolve(root, 'utils/requirement-list-form-decorated.mjs'), out, 'utf8')
console.log('questions', questions.length, 'steps', steps.length)
