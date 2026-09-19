export async function evaluateInternalAccess({ token, getMe }) {
  if (!token) return { allowed: false, clearToken: false }

  try {
    const data = await getMe()
    const allowed = Boolean(data && data.employee)
    return { allowed, clearToken: !allowed }
  } catch (error) {
    return { allowed: false, clearToken: true }
  }
}

// 同一令牌在一次小程序会话中不需要为每个页面重复请求 /me。
// 业务接口仍各自通过后端鉴权；这里仅缓存页面入口的员工身份判断。
export function createCachedInternalAccessEvaluator(evaluate = evaluateInternalAccess) {
  let cachedToken = ''
  let cachedDecision = null
  let pendingCheck = null

  const clear = () => {
    cachedToken = ''
    cachedDecision = null
    pendingCheck = null
  }

  return {
    clear,
    async evaluate(token, getMe) {
      if (!token) {
        clear()
        return evaluate({ token, getMe })
      }

      if (cachedToken === token) {
        if (cachedDecision) return cachedDecision
        if (pendingCheck) return pendingCheck
      } else {
        cachedToken = token
        cachedDecision = null
        pendingCheck = null
      }

      const check = evaluate({ token, getMe })
      pendingCheck = check
      try {
        const decision = await check
        if (cachedToken === token) cachedDecision = decision
        return decision
      } finally {
        if (cachedToken === token && pendingCheck === check) pendingCheck = null
      }
    }
  }
}
