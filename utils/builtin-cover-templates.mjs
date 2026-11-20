/** 与 PC ContentStudio 内置封面分类规则对齐。 */
export const GENERAL_COVER_CATEGORY = '通用'

export const CONTENT_TYPE_NAME_TO_CODE = {
  工艺施工展示: 'CT06',
  工艺展示: 'CT06',
  装修报价清单: 'CT02',
  报价清单: 'CT02',
  装修避坑分享: 'CT03',
  避坑分享: 'CT03',
  装修省钱攻略: 'CT04',
  省钱攻略: 'CT04',
  装修案例分享: 'CT01',
  案例分享: 'CT01',
  装修知识科普: 'CT06',
  知识科普: 'CT06',
  人设自荐: 'CT07',
  装修人设自荐: 'CT07',
  施工报价: 'CT05'
}

const STOCK_TEMPLATE_CATEGORIES = new Set([
  '小红书',
  '精选封面',
  'social',
  'marketing',
  'business',
  'print',
  'education',
  'events',
  'presentations',
  '系统素材'
])

export const BUILTIN_COVER_PRELOAD_COUNT = 10

/** 按每批 size 条切片，用于封面预览图分批懒加载。 */
export function sliceTemplateBatch(templates, offset = 0, size = BUILTIN_COVER_PRELOAD_COUNT) {
  const list = Array.isArray(templates) ? templates : []
  const start = Math.max(0, Number(offset) || 0)
  const count = Math.max(0, Number(size) || 0)
  if (!count) return list.slice(start)
  return list.slice(start, start + count)
}

export function nextTemplateBatchCount(currentCount, total, size = BUILTIN_COVER_PRELOAD_COUNT) {
  const current = Math.max(0, Number(currentCount) || 0)
  const max = Math.max(0, Number(total) || 0)
  const step = Math.max(1, Number(size) || BUILTIN_COVER_PRELOAD_COUNT)
  if (current >= max) return max
  return Math.min(max, current + step)
}

export function coverContentTypeNames(typeName) {
  const name = String(typeName || '').trim()
  if (!name) return []
  const names = new Set([name])
  const code = CONTENT_TYPE_NAME_TO_CODE[name]
  if (!code) return [...names]
  for (const [alias, aliasCode] of Object.entries(CONTENT_TYPE_NAME_TO_CODE)) {
    if (aliasCode === code && (alias.includes(name) || name.includes(alias))) names.add(alias)
  }
  return [...names]
}

/** 解析模板内容类型分类：优先 category_name，其次 categories 中的业务分类。 */
export function templateCoverCategoryName(item) {
  if (!item || typeof item !== 'object') return ''
  const direct = String(item.category_name || item.categoryName || '').trim()
  if (direct) return direct
  const buckets = Array.isArray(item.categories) ? item.categories : []
  for (const raw of buckets) {
    const name = String(raw || '').trim()
    if (!name || STOCK_TEMPLATE_CATEGORIES.has(name)) continue
    if (name.includes(GENERAL_COVER_CATEGORY) || CONTENT_TYPE_NAME_TO_CODE[name]) return name
  }
  return ''
}

export function isGeneralCoverCategory(category) {
  return String(category || '').includes(GENERAL_COVER_CATEGORY)
}

export function hasCoverTemplateCategories(templates) {
  return (Array.isArray(templates) ? templates : []).some(
    (item) => item && item.zone !== 'featured' && templateCoverCategoryName(item)
  )
}

export function filterBuiltinCoverTemplates(templates, typeName) {
  const list = (Array.isArray(templates) ? templates : []).filter((item) => item && item.zone !== 'featured')
  const name = String(typeName || '').trim()
  const categorized = hasCoverTemplateCategories(list)
  if (!name || !categorized) return list
  const accepted = new Set(coverContentTypeNames(name))
  return list.filter((item) => {
    const category = templateCoverCategoryName(item)
    if (!category) return false
    if (isGeneralCoverCategory(category)) return true
    if (accepted.has(category)) return true
    return [...accepted].some((alias) => category.includes(alias) || alias.includes(category))
  })
}

/** 与 PC ContentStudio builtinCoverEmptyText 对齐。 */
export function builtinCoverEmptyText(templates, typeName) {
  const name = String(typeName || '').trim()
  const list = Array.isArray(templates) ? templates : []
  if (name && hasCoverTemplateCategories(list)) {
    return `当前内容类型暂无封面模板，请在「${name}」或「通用」分类下保存模板`
  }
  return '暂无内置封面模板，请稍后再试或改用 AI 封面'
}

export function builtinCoverUncategorizedHint(templates, typeName) {
  const name = String(typeName || '').trim()
  if (!name || hasCoverTemplateCategories(templates)) return ''
  return '封面模板尚未配置内容类型分类，暂时显示全部内置封面'
}

/**
 * 当前选中若不在过滤结果中则清空；builtin 模式下可自动选中首项（小程序交互）。
 * @returns {string} 同步后的 templateId
 */
export function syncBuiltinCoverSelection(selectedId, filteredTemplates, { autoSelectFirst = false } = {}) {
  const list = Array.isArray(filteredTemplates) ? filteredTemplates : []
  const current = String(selectedId || '').trim()
  if (current && list.some((item) => item && item.id === current)) return current
  if (autoSelectFirst && list.length) return String(list[0].id || '')
  return ''
}
