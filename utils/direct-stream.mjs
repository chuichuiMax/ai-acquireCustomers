export function unwrapRunEventPayload(payload) {
  const body = payload && typeof payload === 'object' ? payload : {}
  if (body.payload && typeof body.payload === 'object') {
    const inner = body.payload
    if (
      body.schema_version != null ||
      inner.field != null ||
      inner.status != null ||
      inner.message != null
    ) {
      return inner
    }
  }
  return body
}

export function createDirectStreamState(active = false) {
  return {
    active,
    phase: active ? 'generating' : 'idle',
    title: '',
    body: '',
    topics: []
  }
}

export function applyDirectStreamEvent(state, eventType, payload = {}) {
  const body = payload && typeof payload === 'object' ? payload : {}
  const next = { ...state }
  if (eventType === 'content.direct.delta') {
    next.active = true
    next.phase = 'generating'
    const { field, value, delta } = body
    if (field === 'title' || field === 'body') {
      next[field] = typeof value === 'string' ? value : `${next[field] || ''}${delta || ''}`
    } else if (field === 'topics') {
      next.topics = Array.isArray(value)
        ? [...value]
        : [...(next.topics || []), ...(Array.isArray(delta) ? delta : [])]
    }
  } else if (next.active && ['content.generated', 'content.cover.started'].includes(eventType)) {
    next.phase = 'cover'
  } else if (next.active && eventType === 'content.cover.completed') {
    next.phase = 'completing'
  } else if (next.active && eventType === 'error') {
    next.phase = 'failed'
  } else if (next.active && eventType === 'end') {
    const status = body.status || body.payload?.status
    next.phase = status === 'completed' ? 'completed' : status || next.phase
  }
  return next
}

export function reduceEventsToDirectStream(events, { active = true } = {}) {
  let state = createDirectStreamState(active)
  const list = Array.isArray(events) ? events : []
  for (let index = 0; index < list.length; index += 1) {
    const event = list[index] || {}
    const payload = unwrapRunEventPayload(event.payload)
    state = applyDirectStreamEvent(state, String(event.event_type || ''), payload)
  }
  return state
}

/** MP getRun 无 events 时不要用空数组覆盖 SSE 已累积的正文。 */
export function refreshDirectStreamFromRunEvents(current, events, { useDirectRun = false } = {}) {
  const list = Array.isArray(events) ? events : []
  if (!list.length) return current
  if (!useDirectRun && !runEventsIncludeDirectDelta(list) && !runEventsIncludeDirectRun(list)) {
    return current
  }
  return reduceEventsToDirectStream(list, { active: true })
}

export function directStreamHasGeneratedCopy(state) {
  if (!state) return false
  return Boolean(state.title || state.body || (state.topics && state.topics.length))
}

export function runEventsIncludeDirectRun(events) {
  const list = Array.isArray(events) ? events : []
  return list.some((event) => {
    if (String(event?.event_type || '') !== 'metadata') return false
    const payload = event.payload || {}
    return payload.run_type === 'content_direct'
  })
}

export function runEventsIncludeDirectDelta(events) {
  const list = Array.isArray(events) ? events : []
  return list.some((event) => String(event?.event_type || '') === 'content.direct.delta')
}

export function shouldShowDirectStreamUi({ isGenerating, useDirectRun, directStream, runEvents }) {
  const phase = directStream?.phase || 'idle'
  const hasCopy = directStreamHasGeneratedCopy(directStream)
  if (useDirectRun && hasCopy && (phase === 'cover' || phase === 'completing')) return true
  if (!isGenerating) return false
  if (useDirectRun) return true
  if (directStream?.active || hasCopy) return true
  if (runEventsIncludeDirectRun(runEvents) || runEventsIncludeDirectDelta(runEvents)) return true
  return false
}

export function directStreamShowHeader(state) {
  const phase = state?.phase || 'idle'
  return phase === 'generating' || phase === 'idle' || phase === 'cover' || phase === 'completing'
}

export function directStreamHeading(state) {
  if (state?.phase === 'failed') return '内容生成失败'
  if (state?.phase === 'cover' || state?.phase === 'completing') return '正在生成封面'
  if (state?.phase === 'completed') return '内容生成完成'
  return '正在生成内容'
}

export function directStreamProgressText(state) {
  if (state?.phase === 'failed') return '生成中断，请稍后重试或返回修改参数。'
  if (state?.phase === 'cover') return '正文已生成，正在制作并绑定封面…'
  if (state?.phase === 'completing') return '封面已生成，正在整理最终结果…'
  if (state?.body) return '大模型正在继续输出内容'
  if (state?.title) return '正在生成正文…'
  return '正在连接模型并开始输出…'
}
