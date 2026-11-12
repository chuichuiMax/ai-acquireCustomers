/** 与 [原型](https://www.workbuddy.cn/space/d/7bZJixPEIi89i3OLOW2Emh) 表单卡片一致 */
export const REQUIREMENT_FORM_CATEGORIES = Object.freeze([
  Object.freeze({ id: '', label: '全部' }),
  Object.freeze({ id: 'rough', label: '毛坯房' }),
  Object.freeze({ id: 'decorated', label: '精装房' }),
  Object.freeze({ id: 'renovation', label: '旧房焕新' })
])

export const REQUIREMENT_FORM_ITEMS = Object.freeze([
  Object.freeze({
    id: 'rough',
    category: 'rough',
    title: '毛坯房',
    subtitle: '一体化平面规划需求清单',
    description: '为了定制专属于您的理想生活方式，共同创造更加贴近您期望的设计方案。'
  }),
  Object.freeze({
    id: 'decorated',
    category: 'decorated',
    title: '精装房',
    subtitle: '精装房定制需求表',
    description: '家的需求 = (a%) 过去生活习惯 + (b%) 现时生活需要 + (c%) 未来生活愿望；',
    edcFormUrl: 'http://portal.hi-run.net/edc/formview/t13s87#/?_key=qs2fsn'
  }),
  Object.freeze({
    id: 'renovation',
    category: 'renovation',
    title: '旧房焕新',
    subtitle: '旧房焕新定制需求表',
    description: '为了居住更舒适，更适合您的改造需求，美好的家居生活，从精准梳理焕新需求开始。',
    edcFormUrl: 'http://portal.hi-run.net/edc/formview/o6n08s'
  })
])

export const REQUIREMENT_TYPE_BY_ID = Object.freeze({
  rough: '毛坯房',
  decorated: '精装房',
  renovation: '旧房焕新'
})

export function requirementTypeForForm(formItem = {}) {
  return REQUIREMENT_TYPE_BY_ID[formItem.id] || String(formItem.title || '').trim()
}

export function employeeRequirementSignature(employee = {}) {
  const name = String(employee.name || '设计师').trim()
  const code = String(employee.employee_code || '').trim()
  return code ? `${name} · 全案设计师 · ${code}` : `${name} · 全案设计师`
}
