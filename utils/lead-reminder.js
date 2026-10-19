import { reactive } from 'vue'
import { mpLeadApi } from '../apis/mp'
import { getToken } from './request'

export const leadReminderState = reactive({ unreadCount: 0, error: '' })

let activePage = null
let timer = null
let pending = null
let reading = null
let version = 0

function scheduleRefresh() {
  clearTimeout(timer)
  if (activePage && getToken()) timer = setTimeout(refreshLeadReminder, 15000)
}

async function refreshLeadReminder() {
  if (!activePage || !getToken() || reading) return
  if (pending) return pending.promise
  clearTimeout(timer)
  const operation = { token: getToken(), version }
  pending = operation
  operation.promise = (async () => {
    try {
      const result = await mpLeadApi.summary()
      if (operation.token !== getToken() || operation.version !== version) return
      leadReminderState.unreadCount = result.unread_count
      leadReminderState.error = ''
    } catch {
      if (operation.token !== getToken() || operation.version !== version) return
      if (activePage && !leadReminderState.error) {
        uni.showToast({ title: '客资提醒暂时无法更新', icon: 'none' })
      }
      leadReminderState.error = '客资提醒暂时无法更新'
    } finally {
      if (pending === operation) {
        pending = null
        scheduleRefresh()
      }
    }
  })()
  return operation.promise
}

export function startLeadReminder(page) {
  if (activePage === page) return
  activePage = page
  return refreshLeadReminder()
}

export function stopLeadReminder(page) {
  if (activePage !== page) return
  activePage = null
  clearTimeout(timer)
}

export async function markLeadRead(id, revision) {
  // 已读开始后，先前发出的统计不能覆盖本次已读结果。
  const operation = { token: getToken(), version: ++version }
  reading = operation
  clearTimeout(timer)
  try {
    const result = await mpLeadApi.read(id, revision)
    if (operation.token === getToken() && operation.version === version) {
      leadReminderState.unreadCount = result.unread_count
      leadReminderState.error = ''
    }
    return result
  } finally {
    if (reading === operation) {
      reading = null
      scheduleRefresh()
    }
  }
}

uni.$on('auth-token-changed', () => {
  version += 1
  activePage = null
  pending = null
  reading = null
  clearTimeout(timer)
  leadReminderState.unreadCount = 0
  leadReminderState.error = ''
})
