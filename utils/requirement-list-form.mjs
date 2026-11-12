/** 与 PC `web/src/utils/requirementListForm.js` 同源 */
import {
  DECORATED_FORM_INTRO_TITLE,
  DECORATED_FORM_STEPS,
  DECORATED_QUESTIONS
} from './requirement-list-form-decorated.mjs'
import {
  RENOVATION_FORM_INTRO_TITLE,
  RENOVATION_FORM_STEPS,
  RENOVATION_QUESTIONS
} from './requirement-list-form-renovation.mjs'

export const FORM_INTRO_TITLE = '一体化平面规划需求清单'

export const QUESTIONS = [
  { key: 'q1', title: '1、房屋类型：', kind: 'radio', options: ['平层', '复式', '多层/自建房', '别墅', '叠墅'] },
  { key: 'q2', title: '2、房屋面积：', kind: 'area' },
  { key: 'q3', title: '3、房屋定位：', kind: 'radio', other: true, options: ['婚房', '改善房', '养老房', '学位房', '休闲偶住', '其他'] },
  { key: 'q4', title: '4、期望开工时间：', kind: 'radio', other: true, options: ['1个月内', '1-3个月内', '交房就装', '先来考察，时间待定', '其他'] },
  { key: 'q5', title: '5、装修硬装造价估算：(按实用面积算)', kind: 'radio', options: ['15万以内', '15-20万', '20-30万', '30-40万', '40-50万', '50-60万', '60-80万', '80-100万', '100万以上'] },
  { key: 'q6', title: '6、您希望接待您的设计师是：', kind: 'radio', other: true, options: ['男性', '女性', '其他'] },
  { key: 'q7', title: '7、选择你喜欢的装修风格元素方向，最好提供图片资料(设计讨论群)，可多选', kind: 'check', options: ['简约现代', '现代极简', '意式极简', '意式轻奢', '法式奶油', '法式复古', '法式轻奢', '法式田园', '原木奶油', '自然风', '新中式', '宋式美学', '中古风', '原木风', '侘寂风', '多巴胺风', '美式简约', '美式田园', '美式复古'] },
  { key: 'q8', title: '8、关于您家的房间，需要保留：', kind: 'radio', other: true, options: ['全部保留', '一间', '两间', '三间', '其他'] },
  { key: 'q9', title: '9、家庭常住人口的数量、成员', kind: 'check', other: true, options: ['夫(妻)', '单身自住', '父母', '女儿', '儿子', '孙子', '孙女', '保姆', '其他'] },
  { key: 'q10', title: '10、您现在所从事的职业是？', kind: 'radio', other: true, options: ['医生', '教师', '个体', '公务员', '律师', '其他'] },
  { key: 'q11', title: '11、您希望您家的客厅吊顶是：', kind: 'radio', other: true, options: ['满顶', '边顶', '不需要', '其他'] },
  { key: 'q12', title: '12、您和家人在常规功能之外的居住需求多选题', kind: 'check', options: ['西厨', '储物间', '书房', '多功能房', '茶室', '健身房', '乐器房', '专业酒窖', '专业影音室', '洗衣房', '保姆房', '其他专业工作间', '其他特殊功能房'] },
  { key: 'q13', title: '13、您希望您家的厨房是：', kind: 'radio', other: true, options: ['封闭式', '开放式', '其他'] },
  { key: 'q14', title: '14、您和家人是否有养宠物，对此有无特殊要求?', kind: 'radio', other: true, options: ['未养宠', '猫', '狗', '鸟', '水族鱼缸', '其他'] },
  { key: 'q15', title: '15、您和家人有无信仰嗜好，对家中环境有无禁忌?', kind: 'check', other: true, options: ['风水', '宗教信仰', '喝茶', '抽烟', '喝酒', '麻将', '其他'] },
  { key: 'q16', title: '16、对于新房空调的要求？', kind: 'radio', options: ['全屋中央空调（水/氟）', '全屋分体空调', '客餐厅风管机，房间分体或者暂时不装'] },
  {
    key: 'q17',
    title: '17、关于新家，您对设备的需求有哪些？',
    kind: 'groups',
    groups: [
      { label: '清洁方式：', options: ['洗地机', '手拖一体机'] },
      { label: '饮水方式：', options: ['管线机', '嵌饮机'] },
      { label: '智能家居：', options: ['全屋智能', '智能家电'] },
      { label: '网络覆盖：', options: ['无线路由器', 'AP'] }
    ]
  },
  { key: 'q18', title: '18、您认为风水在设计中是否占比很重？', kind: 'radio', options: ['非常重要', '一般（主要一些基本的风水规律即可，在设计和风水冲突时，首先保证设计合理）', '不重要（只考虑空间合理和视觉效果）'] }
]

export function blankAnswers(questionList = QUESTIONS) {
  const answers = {}
  for (const question of questionList) {
    if (question.kind === 'area') {
      answers.q2_area = ''
      answers.q2_layout = ''
      continue
    }
    if (question.kind === 'groups') {
      question.groups.forEach((_, index) => {
        answers[`${question.key}_${index}`] = ''
      })
    } else if (question.kind === 'check') {
      answers[question.key] = []
      if (question.other) answers[`${question.key}_other`] = ''
    } else if (question.kind === 'radio' || question.kind === 'text') {
      answers[question.key] = ''
      if (question.other) answers[`${question.key}_other`] = ''
    }
  }
  if (questionList === QUESTIONS && answers.q2_area === undefined) {
    answers.q2_area = ''
    answers.q2_layout = ''
  }
  return answers
}

export function mergeAnswers(source = {}, questionList = QUESTIONS) {
  const answers = blankAnswers(questionList)
  for (const key of Object.keys(answers)) {
    if (source[key] == null) continue
    if (Array.isArray(answers[key])) answers[key] = Array.isArray(source[key]) ? [...source[key]] : []
    else answers[key] = String(source[key])
  }
  return answers
}

export function cloneAnswers(answers) {
  return JSON.parse(JSON.stringify(answers))
}

function hasText(value) {
  if (Array.isArray(value)) return value.some((item) => String(item || '').trim())
  return Boolean(String(value || '').trim())
}

/** 与 PC `completionOf` 一致：已填项 / 总项 */
export function completionOf({
  answers = {},
  customerName = '',
  phone = '',
  address = '',
  questions = QUESTIONS
} = {}) {
  const slots = [customerName, phone, address]
  for (const question of questions) {
    if (question.kind === 'area') {
      slots.push(answers.q2_area, answers.q2_layout)
    } else if (question.kind === 'groups') {
      question.groups.forEach((_, index) => slots.push(answers[`${question.key}_${index}`]))
    } else if (question.other && hasText(answers[`${question.key}_other`])) {
      slots.push('filled')
    } else {
      slots.push(answers[question.key])
    }
  }
  const total = slots.length
  const filled = slots.filter((item) => hasText(item)).length
  return { filled, total, percent: total ? Math.round((filled * 100) / total) : 0 }
}

/** 填写分页（6 步），与原型一致 */
export const FORM_STEPS = Object.freeze([
  Object.freeze({ id: 'base', title: '基本信息', questionKeys: ['q1', 'q2'] }),
  Object.freeze({ id: 'plan', title: '规划意向', questionKeys: ['q3', 'q4', 'q5'] }),
  Object.freeze({ id: 'style', title: '风格偏好', questionKeys: ['q6', 'q7'] }),
  Object.freeze({ id: 'family', title: '家庭情况', questionKeys: ['q8', 'q9', 'q10'] }),
  Object.freeze({ id: 'space', title: '空间需求', questionKeys: ['q11', 'q12', 'q13', 'q14', 'q15'] }),
  Object.freeze({ id: 'device', title: '设备与其他', questionKeys: ['q16', 'q17', 'q18'] })
])

export const FORM_PACKS = Object.freeze({
  rough: Object.freeze({
    id: 'rough',
    introTitle: FORM_INTRO_TITLE,
    questions: QUESTIONS,
    steps: FORM_STEPS
  }),
  decorated: Object.freeze({
    id: 'decorated',
    introTitle: DECORATED_FORM_INTRO_TITLE,
    questions: DECORATED_QUESTIONS,
    steps: DECORATED_FORM_STEPS
  }),
  renovation: Object.freeze({
    id: 'renovation',
    introTitle: RENOVATION_FORM_INTRO_TITLE,
    questions: RENOVATION_QUESTIONS,
    steps: RENOVATION_FORM_STEPS
  })
})

export function requirementFormPack(typeId = 'rough') {
  return FORM_PACKS[typeId] || FORM_PACKS.rough
}

export function requirementFormPackByTypeName(typeName = '') {
  const text = String(typeName || '').trim()
  if (text === '精装房') return FORM_PACKS.decorated
  if (text === '旧房焕新') return FORM_PACKS.renovation
  return FORM_PACKS.rough
}

export function questionsForStep(stepIndex, { questions = QUESTIONS, steps = FORM_STEPS } = {}) {
  const step = steps[stepIndex]
  if (!step) return []
  return questions.filter((item) => step.questionKeys.includes(item.key))
}

function formatAnswerValue(question, answers) {
  if (question.kind === 'area') {
    const parts = [answers.q2_area, answers.q2_layout].map((item) => String(item || '').trim()).filter(Boolean)
    return parts.join(' · ')
  }
  if (question.kind === 'groups') {
    return question.groups
      .map((group, index) => {
        const picked = String(answers[`${question.key}_${index}`] || '').trim()
        return picked ? `${group.label}${picked}` : ''
      })
      .filter(Boolean)
      .join('；')
  }
  const main = answers[question.key]
  const parts = []
  if (Array.isArray(main) && main.length) parts.push(main.join('、'))
  else if (String(main || '').trim()) parts.push(String(main).trim())
  const other = String(answers[`${question.key}_other`] || '').trim()
  if (other) parts.push(`其他：${other}`)
  return parts.join('；')
}

/** 预览页逐条展示 */
export function listPreviewEntries({
  answers = {},
  customerName = '',
  phone = '',
  address = '',
  questions = QUESTIONS
} = {}) {
  const rows = [
    { section: '客户信息', label: '楼盘地址', value: address, required: false },
    { section: '客户信息', label: '客户姓名', value: customerName, required: false },
    { section: '客户信息', label: '手机号码', value: phone, required: false }
  ]
  for (const question of questions) {
    rows.push({
      section: '问卷题目',
      label: question.title.replace(/：$/, ''),
      value: formatAnswerValue(question, answers),
      kind: question.kind,
      required: false
    })
  }
  return rows
}

export function kindLabel(kind) {
  if (kind === 'check') return '多选'
  if (kind === 'groups' || kind === 'area' || kind === 'text') return '填写'
  return '单选'
}
