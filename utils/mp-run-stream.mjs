import { BASE_URL, TOKEN_KEY } from '../config'

function decodeChunk(data) {
  if (typeof data === 'string') return data
  if (data instanceof ArrayBuffer) {
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder('utf-8').decode(data)
    }
    const bytes = new Uint8Array(data)
    let text = ''
    for (let index = 0; index < bytes.length; index += 1) {
      text += String.fromCharCode(bytes[index])
    }
    try {
      return decodeURIComponent(escape(text))
    } catch (error) {
      return text
    }
  }
  return ''
}

export function createSseParser(onEvent) {
  let buffer = ''
  let eventType = 'message'
  let eventId = null
  let dataLines = []

  const dispatch = () => {
    if (!dataLines.length) return
    try {
      const payload = JSON.parse(dataLines.join('\n'))
      onEvent(eventType, payload, eventId)
    } catch (error) {
      // ignore malformed chunks
    }
    eventType = 'message'
    eventId = null
    dataLines = []
  }

  return {
    push(chunkText) {
      buffer += chunkText
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index].replace(/\r$/, '')
        if (!line) {
          dispatch()
        } else if (line.startsWith('event:')) {
          eventType = line.slice(6).trim() || 'message'
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trimStart())
        } else if (line.startsWith('id:')) {
          eventId = line.slice(3).trim()
        }
      }
    },
    flush() {
      dispatch()
    }
  }
}

export function subscribeMpRunEvents({ runId, afterSeq = '0-0', onEvent, onComplete, onError }) {
  const token = uni.getStorageSync(TOKEN_KEY) || ''
  const url = `${BASE_URL}/api/mp/content/runs/${encodeURIComponent(runId)}/events?after_seq=${encodeURIComponent(afterSeq)}`
  const parser = createSseParser((eventType, payload, eventId) => {
    onEvent({ eventType, payload, eventId })
  })
  let finished = false

  const requestTask = uni.request({
    url,
    method: 'GET',
    enableChunked: true,
    responseType: 'arraybuffer',
    timeout: 600000,
    header: {
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    success: (res) => {
      if (finished) return
      finished = true
      if (res.statusCode >= 400) {
        onError?.(res)
        return
      }
      parser.flush()
      onComplete?.()
    },
    fail: (error) => {
      if (finished) return
      finished = true
      onError?.(error)
    }
  })

  if (requestTask && typeof requestTask.onChunkReceived === 'function') {
    requestTask.onChunkReceived((res) => {
      parser.push(decodeChunk(res.data))
    })
  } else {
    finished = true
    onError?.(new Error('chunked stream unavailable'))
  }

  return () => {
    if (finished) return
    finished = true
    if (requestTask && typeof requestTask.abort === 'function') {
      requestTask.abort()
    }
  }
}
