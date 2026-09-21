export function hasMiniProgramPort(ports) {
  if (ports == null || ports === '') return false
  if (Array.isArray(ports)) {
    for (let index = 0; index < ports.length; index += 1) {
      if (hasMiniProgramPort(ports[index])) return true
    }
    return false
  }
  if (typeof ports === 'object') {
    if (ports.app || ports.APP || ports.mp) return true
    const keys = Object.keys(ports)
    const values = []
    for (let index = 0; index < keys.length; index += 1) {
      values.push(keys[index])
      values.push(ports[keys[index]])
    }
    return hasMiniProgramPort(values)
  }
  const text = String(ports).trim()
  if ((text.charAt(0) === '[' || text.charAt(0) === '{') && text.length > 1) {
    try {
      return hasMiniProgramPort(JSON.parse(text))
    } catch (error) {
      /* keep checking the raw string */
    }
  }
  if (/(^|[^a-z])app([^a-z]|$)/i.test(text) || /(^|[^a-z])mp([^a-z]|$)/i.test(text)) return true
  return false
}

export function employeeFromMe(data) {
  if (!data || typeof data !== 'object') return null
  if (data.employee && typeof data.employee === 'object') {
    const keys = Object.keys(data.employee)
    if (keys.length) return data.employee
  }
  if (data.user && typeof data.user === 'object' && data.user !== data) {
    const nested = employeeFromMe(data.user)
    if (nested) return nested
  }
  if (data.login_account || data.employee_code || data.employee_id) return data
  if (data.uid || data.username || data.phone_number || data.user_id) {
    return {
      id: data.id != null ? String(data.id) : data.uid || data.user_id || '',
      name: data.username || data.name || '',
      login_account: data.phone_number || data.uid || data.login_account || '',
      last_login_at: data.last_login || data.last_login_at || '',
      avatar: data.avatar || '',
      role: data.role || ''
    }
  }
  return null
}

export function hasMiniProgramAccess(data) {
  const employee = employeeFromMe(data)
  if (!employee) return false
  if (Object.prototype.hasOwnProperty.call(employee, 'login_port')) {
    return hasMiniProgramPort(employee.login_port)
  }
  if (data && data.employee && typeof data.employee === 'object' && Object.keys(data.employee).length) {
    return true
  }
  if (employee.employee_code || employee.employee_id) return true
  return false
}

export async function evaluateInternalAccess({ token, getMe }) {
  if (!token) return { allowed: false, clearToken: false }

  try {
    const data = await getMe()
    if (!hasMiniProgramAccess(data)) return { allowed: false, clearToken: true }
    return { allowed: true, clearToken: false }
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
