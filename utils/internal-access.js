import { safeReLaunch } from './safe-navigation'
import { mpMeApi } from '../apis/mp'
import { errorMessage, getToken, setToken } from './request'
import { createCachedInternalAccessEvaluator, evaluateInternalAccess, hasMiniProgramAccess } from './internal-access-policy.mjs'
import { getActiveGeneration, resolveAllowedShowUrl, WORKSPACE_HOME_PATH } from './active-generation.mjs'
import { startLeadReminder, stopLeadReminder } from './lead-reminder'

export const INTERNAL_HOME_PATH = WORKSPACE_HOME_PATH
export const LOGIN_PATH = '/pages/login/login'

const accessEvaluator = createCachedInternalAccessEvaluator(evaluateInternalAccess)
let retryPrompt = null

function currentRoute() {
  try {
    const pages = getCurrentPages()
    return pages.length ? pages[pages.length - 1].route : ''
  } catch (error) {
    return ''
  }
}

function redirectToLogin() {
  if (currentRoute() === 'pages/login/login') return
  safeReLaunch(LOGIN_PATH)
}

async function promptAccessRetry(error) {
  if (!retryPrompt) {
    retryPrompt = new Promise((resolve, reject) => {
      uni.showModal({
        title: '暂时无法验证员工身份',
        content: error && error.statusCode === 404
          ? '身份接口不可用，请联系管理员检查服务版本后重试。'
          : `${errorMessage(error)}，请检查网络或稍后重试。`,
        confirmText: '重试',
        showCancel: false,
        success: resolve,
        fail: reject
      })
    }).finally(() => { retryPrompt = null })
  }
  await retryPrompt
}

export function resetInternalAccess() {
  accessEvaluator.clear()
}

export function acceptConfirmedLogin(data) {
  if (!data || typeof data.access_token !== 'string' || !data.access_token.trim()
    || !data.employee || !data.employee.id || !data.employee.login_account || !hasMiniProgramAccess(data)) {
    throw new Error('登录响应异常，请联系管理员')
  }
  setToken(data.access_token)
  accessEvaluator.confirm(data.access_token)
}

export async function requireInternalAccess({ redirect = true } = {}) {
  const token = getToken()
  const route = currentRoute()
  while (true) {
    const decision = await accessEvaluator.evaluate(token, () => mpMeApi.get({ silentAuth: true }))
    if (getToken() !== token) {
      throw { code: 'INTERNAL_ACCESS_STALE' }
    }
    if (decision.status === 'unavailable') {
      if (route && currentRoute() !== route) throw { code: 'INTERNAL_ACCESS_STALE' }
      await promptAccessRetry(decision.error)
      if (getToken() !== token || (route && currentRoute() !== route)) throw { code: 'INTERNAL_ACCESS_STALE' }
      continue
    }
    if (decision.clearToken) {
      setToken('')
      accessEvaluator.clear()
    }
    if (decision.status === 'forbidden') {
      uni.showToast({ title: '当前员工账号没有小程序访问权限', icon: 'none' })
    }
    if (!decision.allowed && redirect && (!route || currentRoute() === route)) redirectToLogin()
    return decision.allowed
  }
}

export async function enterInternalWorkspace() {
  if (!(await requireInternalAccess())) return false
  const resumeUrl = resolveAllowedShowUrl(currentRoute(), getActiveGeneration())
  safeReLaunch(resumeUrl || INTERNAL_HOME_PATH)
  return true
}

export const internalPageMixin = {
  onShow() {
    this._leadReminderVisible = true
    if (this.internalAccessGranted) startLeadReminder(this)
  },
  onHide() {
    this._leadReminderVisible = false
    stopLeadReminder(this)
  },
  onUnload() {
    this._leadReminderVisible = false
    stopLeadReminder(this)
  },
  data() {
    return {
      internalAccessGranted: false,
      internalAccessCheck: null
    }
  },
  methods: {
    async ensureInternalAccess() {
      if (this.internalAccessGranted) return true
      if (!this.internalAccessCheck) this.internalAccessCheck = requireInternalAccess()

      try {
        this.internalAccessGranted = await this.internalAccessCheck
        if (this.internalAccessGranted && this._leadReminderVisible) startLeadReminder(this)
        return this.internalAccessGranted
      } catch (error) {
        if (error.code !== 'INTERNAL_ACCESS_STALE') {
          uni.showToast({ title: errorMessage(error), icon: 'none' })
        }
        return false
      } finally {
        this.internalAccessCheck = null
      }
    }
  }
}
