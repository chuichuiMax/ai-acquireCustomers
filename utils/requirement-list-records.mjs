import { completionOf, requirementFormPackByTypeName } from './requirement-list-form.mjs'

export function normalizeRequirementRecordList(data) {
  if (!data) return []
  if (Array.isArray(data)) return data.map(presentRequirementRecord)
  const nested = data.data && !Array.isArray(data.data) ? data.data : data
  const list =
    (Array.isArray(data.data) && data.data) ||
    nested.items ||
    nested.records ||
    nested.list ||
    nested.results
  return Array.isArray(list) ? list.map(presentRequirementRecord) : []
}

export function resolveRequirementRecordCompletion(record = {}) {
  const answers = record.answers
  if (answers && typeof answers === 'object' && Object.keys(answers).length) {
    const pack = requirementFormPackByTypeName(
      record.requirement_type || record.title || record.form_title || ''
    )
    return completionOf({
      answers,
      customerName: record.customer_name || record.client_name || '',
      phone: record.phone || record.customer_phone || '',
      address: record.address || record.project_name || record.community || '',
      questions: pack.questions
    }).percent
  }
  const fromProgress = parseRequirementProgress(record.progress)
  if (fromProgress != null) return fromProgress
  const raw = record.completion_percent ?? record.completion ?? record.progress_percent
  const number = Number(raw)
  return Number.isFinite(number) ? Math.round(number) : undefined
}

export function presentRequirementRecord(record = {}) {
  const type = String(record.requirement_type || record.title || '').trim()
  const completion_percent = resolveRequirementRecordCompletion(record)
  return {
    ...record,
    title: type || record.title || '需求清单',
    form_title: type,
    subtitle: record.form_subtitle || '',
    progress:
      completion_percent != null ? `${completion_percent}%` : record.progress,
    completion_percent
  }
}
export function parseRequirementProgress(value) {
  const text = String(value || '').trim()
  const match = text.match(/(\d+)\s*%/)
  return match ? Number(match[1]) : undefined
}

export function formatRequirementRecordTime(value) {
  if (!value) return '—'
  const compact = String(value).trim()
  const dashed = compact.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})$/)
  if (dashed) {
    const pad = (n) => String(n).padStart(2, '0')
    return `${dashed[1]}-${dashed[2]}-${dashed[3]} ${pad(dashed[4])}:${dashed[5]}`
  }
  const legacy = compact.match(/^(\d{4})(\d{2})(\d{2})\s+(\d{1,2}):(\d{2})$/)
  if (legacy) {
    const pad = (n) => String(n).padStart(2, '0')
    return `${legacy[1]}-${legacy[2]}-${legacy[3]} ${pad(legacy[4])}:${legacy[5]}`
  }
  if (/^\d{8}$/.test(compact)) {
    return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`
  }
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return String(value)
  const date = new Date(timestamp + 8 * 60 * 60 * 1000)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
}

export function requirementRecordSharedMembersLine(members = []) {
  const names = (Array.isArray(members) ? members : [])
    .map((item) => String((item && item.name) || '').trim())
    .filter(Boolean)
  return names.join('，')
}

export function requirementRecordSubmitterName(record = {}) {
  const name = String(record.submitter_name || '').trim()
  return name || '—'
}

export function requirementRecordSharerName(record = {}) {
  const name = String(record.sharer_name || '').trim()
  return name || '—'
}

export function requirementRecordSharedAt(record = {}) {
  return formatRequirementRecordTime(record.shared_at)
}

export function requirementRecordCustomerLine(record = {}) {
  const parts = [
    record.customer_name || record.client_name || record.nickname,
    record.phone || record.customer_phone || record.phone_masked,
    record.city || record.location_city,
    record.address || record.project_name || record.community
  ].map((item) => String(item || '').trim()).filter(Boolean)
  return parts.join(' · ')
}

export function requirementRecordCompletion(record = {}) {
  const raw = record.completion_percent ?? record.completion ?? record.progress_percent
  if (raw == null || raw === '') return ''
  const number = Number(raw)
  if (!Number.isFinite(number)) return ''
  return `完成度${Math.round(number)}%`
}

export function matchesRequirementCategory(record, categoryId) {
  if (!categoryId) return true
  const value = String(
    record.category || record.form_category || record.type || record.requirement_type || ''
  ).trim().toLowerCase()
  if (!value) return true
  const aliases = {
    rough: ['rough', '毛坯', '毛坯房'],
    decorated: ['decorated', '精装', '精装房'],
    renovation: ['renovation', '旧房', '焕新', '旧房焕新']
  }
  const allowed = aliases[categoryId] || [categoryId]
  return allowed.some((item) => value === item || value.includes(item))
}
