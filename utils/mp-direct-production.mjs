import { creativeStylesForContentType } from './creative-styles.mjs'

export const DEFAULT_DIRECT_GENERATION_PROMPT =
  '使用我给你的一些元素，根据爆文 换一种表达方式 符合当地的口吻'

const NRLX_TO_CT = {
  NRLX0001: 'CT06',
  NRLX0002: 'CT02',
  NRLX0003: 'CT03',
  NRLX0004: 'CT04',
  NRLX0005: 'CT01',
  NRLX0006: 'CT06',
  NRLX0007: 'CT07'
}

const NAME_TO_CT = {
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
  装修人设自荐: 'CT07'
}

export function mapNrlxToCtCode(typeCode, typeName) {
  const code = String(typeCode || '').trim()
  if (code && NRLX_TO_CT[code]) return NRLX_TO_CT[code]
  const name = String(typeName || '').trim()
  if (name && NAME_TO_CT[name]) return NAME_TO_CT[name]
  return ''
}

export function pickRandomItem(list) {
  if (!Array.isArray(list) || !list.length) return null
  return list[Math.floor(Math.random() * list.length)]
}

export function buildDirectProductionSelection({ typeCode, typeName, viralItems }) {
  const ctCode = mapNrlxToCtCode(typeCode, typeName)
  const assets = (viralItems || []).filter((item) => item && item.id)
  const viralAsset = pickRandomItem(assets)
  if (!viralAsset) return null
  const styleOptions = creativeStylesForContentType(ctCode, typeName)
  const styleOption = pickRandomItem(styleOptions)
  return {
    ctCode,
    viralAssetId: viralAsset.id,
    generationPrompt: DEFAULT_DIRECT_GENERATION_PROMPT,
    creativeStyle: styleOption
      ? { name: styleOption.label, instruction: styleOption.description }
      : null
  }
}

export function isDecorationDirectBrief(brief) {
  if (!brief || typeof brief !== 'object') return false
  const formValues = brief.form_values || {}
  return Boolean(
    String(brief.user_request || formValues.user_request || '').trim() &&
      String(formValues.viral_asset_id || '').trim()
  )
}
