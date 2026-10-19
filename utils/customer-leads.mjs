export function formatLeadTime(value) {
  if (!value) return '—'
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return '—'
  const date = new Date(timestamp + 8 * 60 * 60 * 1000)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getUTCFullYear()}/${pad(date.getUTCMonth() + 1)}/${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
}

export function leadSourceLabel(platform) {
  return ({ mp: '小程序分享', pc: 'PC端分享' })[platform] || '案例分享'
}

export function applyLeadUpdate(items, updated) {
  return items.map((item) => item.id === updated.id && item.revision <= updated.revision ? {
    ...item, unread: updated.unread,
    follow_status: item.revision === updated.revision && item.follow_status === 'followed' ? 'followed' : updated.follow_status,
    revision: updated.revision,
    avatarSrc: updated.avatarSrc || (item.revision === updated.revision ? item.avatarSrc : ''),
    nickname: updated.nickname, phone_masked: updated.phone_masked, acquired_at: updated.acquired_at,
    source_title: updated.source_title, source_platform: updated.source_platform
  } : item)
}
