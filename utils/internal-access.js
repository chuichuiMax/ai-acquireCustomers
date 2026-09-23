import { mpMeApi } from '../apis/mp'
import { getToken, setToken } from './request'
import { createCachedInternalAccessEvaluator, evaluateInternalAccess } from './internal-access-policy.mjs'
import { getActiveGeneration, resolveAllowedShowUrl, WORKSPACE_HOME_PATH } from './active-generation.mjs'

export const INTERNAL_HOME_PATH = WORKSPACE_HOME_PATH
export const LOGIN_PATH = '/pages/login/login'

const accessEvaluator = createCachedInternalAccessEvaluator(evaluateInternalAccess)

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

function withTimeout(promise, ms) {
  return new Promise(function (resolve, reject) {
    const timer = setTimeout(function () {
      reject({ statusCode: 408, data: { detail: '身份验证超时' } })
    }, ms)
    promise.then(
      function (value) {
        clearTimeout(timer)
        resolve(value)
      },
      function (error) {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

export function resetInternalAccess() {
  accessEvaluator.clear()
}

export async function requireInternalAccess({ redirect = true } = {}) {
  try {
    const decision = await withTimeout(
      accessEvaluator.evaluate(getToken(), function () {
        return mpMeApi.get()
      }),
      8000
    )

    if (decision.clearToken) {
      setToken('')
      accessEvaluator.clear()
    }
    if (!decision.allowed && redirect) redirectToLogin()
    return decision.allowed
  } catch (error) {
    setToken('')
    accessEvaluator.clear()
    if (redirect) redirectToLogin()
    return false
  }
}

export async function enterInternalWorkspace() {
  try {
    if (!(await requireInternalAccess())) return false
    const resumeUrl = resolveAllowedShowUrl(currentRoute(), getActiveGeneration())
    uni.reLaunch({ url: resumeUrl || INTERNAL_HOME_PATH })
    return true
  } catch (error) {
    setToken('')
    resetInternalAccess()
    redirectToLogin()
    return false
  }
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
