export const AI_COVER_SMART_RANDOM_VARIANT = 'smart-random'

export function isAiCoverSmartRandomVariant(variant) {
  return !variant || variant === AI_COVER_SMART_RANDOM_VARIANT
}

export function findAiCoverPromptOption(variant, prompts = []) {
  return (Array.isArray(prompts) ? prompts : []).find((item) => item.variant === variant) || null
}
