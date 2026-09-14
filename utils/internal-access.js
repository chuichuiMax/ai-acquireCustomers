import { mpMeApi } from '../apis/mp'
import { getToken, setToken } from './request'
import { evaluateInternalAccess } from './internal-access-policy.mjs'

export const INTERNAL_HOME_PATH = '/pages/generate/generate'
export const LOGIN_PATH = '/pages/login/login'

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
  uni.reLaunch({ url: LOGIN_PATH })
}

export async function requireInternalAccess({ redirect = true } = {}) {
  const decision = await evaluateInternalAccess({
    token: getToken(),
    getMe: () => mpMeApi.get()
  })

  if (decision.clearToken) setToken('')
  if (!decision.allowed && redirect) redirectToLogin()
  return decision.allowed
}

export async function enterInternalWorkspace() {
  if (!(await requireInternalAccess())) return false
  uni.reLaunch({ url: INTERNAL_HOME_PATH })
  return true
}

export const internalPageMixin = {
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
        return this.internalAccessGranted
      } finally {
        this.internalAccessCheck = null
      }
    }
  }
}
