import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_DIRECT_GENERATION_PROMPT,
  buildDirectProductionSelection,
  isDecorationDirectBrief,
  mapNrlxToCtCode
} from '../utils/mp-direct-production.mjs'

test('mapNrlxToCtCode mirrors backend NRLX mapping', () => {
  assert.equal(mapNrlxToCtCode('NRLX0005', '装修案例分享'), 'CT01')
  assert.equal(mapNrlxToCtCode('', '装修报价清单'), 'CT02')
})

test('buildDirectProductionSelection picks viral asset and style', () => {
  const selection = buildDirectProductionSelection({
    typeCode: 'NRLX0005',
    typeName: '装修案例分享',
    viralItems: [{ id: 'a1' }, { id: 'a2' }]
  })
  assert.ok(selection)
  assert.equal(selection.generationPrompt, DEFAULT_DIRECT_GENERATION_PROMPT)
  assert.ok(['a1', 'a2'].includes(selection.viralAssetId))
  assert.ok(selection.creativeStyle && selection.creativeStyle.name)
})

test('isDecorationDirectBrief detects PC-style decoration brief', () => {
  assert.equal(
    isDecorationDirectBrief({
      user_request: '{"serialNo":"001"}',
      form_values: { viral_asset_id: 'viral-1' }
    }),
    true
  )
  assert.equal(isDecorationDirectBrief({ form_values: {} }), false)
})
