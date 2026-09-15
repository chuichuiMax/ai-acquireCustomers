const CONTENT_TYPE_ICONS = Object.freeze({
  工艺施工展示: '/static/content-type-icons/construction.png',
  装修报价清单: '/static/content-type-icons/quote.png',
  装修案例分享: '/static/content-type-icons/case.png',
  装修知识科普: '/static/content-type-icons/knowledge.png',
  人设自荐: '/static/content-type-icons/persona.png',
  好评笔记: '/static/content-type-icons/review.png'
})

export function contentTypeIcon(item) {
  return CONTENT_TYPE_ICONS[item && item.name] || ''
}
