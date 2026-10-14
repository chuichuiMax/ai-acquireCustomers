import assert from 'node:assert/strict'
import test from 'node:test'
import { errorMessage } from '../utils/request.js'
import {
  isImageDesignAnalysisPendingError,
  sanitizeImageDesignPolishPayload
} from '../utils/image-design-logic.mjs'

test('errorMessage formats FastAPI validation detail arrays', () => {
  const message = errorMessage({
    statusCode: 422,
    data: {
      detail: [
        { type: 'value_error', loc: ['body', 'images'], msg: '图片角色与工作流不匹配' }
      ]
    }
  })
  assert.equal(message, 'images：图片角色与工作流不匹配')
})

test('sanitizeImageDesignPolishPayload drops compatibility fields', () => {
  const payload = sanitizeImageDesignPolishPayload({
    workflow: 'redesign',
    description: '关键词\n描述',
    style: '复合写意',
    polished_prompt: 'must not send',
    refinement_id: 'idr_x',
    images: [
      { role: 'source', library_item_id: 'idli_1', source_item_id: 'mli_1', asset_id: 'cca_1' }
    ]
  })
  assert.deepEqual(payload, {
    workflow: 'redesign',
    description: '关键词\n描述',
    style: '复合写意',
    images: [{ role: 'source', library_item_id: 'idli_1' }]
  })
})

test('isImageDesignAnalysisPendingError detects retryable polish conflicts', () => {
  assert.equal(
    isImageDesignAnalysisPendingError({
      statusCode: 409,
      data: { detail: { error: { code: 'IMAGE_DESIGN_ANALYSIS_PENDING', message: '图片正在分析，请稍后重试' } } }
    }),
    true
  )
  assert.equal(isImageDesignAnalysisPendingError({ statusCode: 503 }), false)
})
