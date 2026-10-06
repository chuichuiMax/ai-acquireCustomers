/** 小程序记录列表：生产失败 / 排队中 / 已审核（成功） */

export const PRODUCTION_STATUS_FAILED = new Set(['failed', 'cancelled', 'review_blocked'])

/** 直出成功为 generated；审核流为 reviewed / completed */
export const PRODUCTION_STATUS_REVIEWED = new Set([
  'generated',
  'reviewed',
  'completed',
  'review_required'
])

export const PRODUCTION_STATUS_QUEUED = new Set([
  'queued',
  'running',
  'draft',
  'brief_ready',
  'strategy_ready',
  'waiting_human',
  'waiting_external'
])

export function resolveProductionStatusLabel(status) {
  const key = String(status || '').toLowerCase()
  if (PRODUCTION_STATUS_FAILED.has(key)) return '失败'
  if (PRODUCTION_STATUS_REVIEWED.has(key)) return '已审核'
  if (PRODUCTION_STATUS_QUEUED.has(key)) return '排队中'
  return '排队中'
}
