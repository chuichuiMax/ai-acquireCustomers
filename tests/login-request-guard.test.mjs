import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const source = readFileSync(new URL('../pages/login/login.vue', import.meta.url), 'utf8')

function createLogin(api = {}) {
  const toasts = []
  const tokens = []
  const navigations = []
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
    .replace(/^import .*$/gm, '')
    .replace('export default', 'const page =')
  const page = vm.runInNewContext(`${script}\npage`, {
    mpAuthApi: api,
    errorMessage: (error) => error.message,
    setToken: (token) => tokens.push(token),
    uni: {
      showToast: (toast) => toasts.push(toast.title),
      reLaunch: (options) => navigations.push(options.url)
    }
  })
  const instance = { ...page.data() }
  for (const [name, method] of Object.entries(page.methods)) {
    instance[name] = method.bind(instance)
  }
  instance.getJsCode = async () => 'test-js-code'
  return { instance, toasts, tokens, navigations }
}

test('duplicate phone callbacks start only one complete login chain', async () => {
  let release
  let starts = 0
  let binds = 0
  let confirms = 0
  const pending = new Promise((resolve) => { release = resolve })
  const { instance, tokens, navigations } = createLogin({
    loginByWechat: async () => { starts++; return pending },
    bindWechatPhone: async () => { binds++ },
    confirmLogin: async () => { confirms++; return { access_token: 'test-token' } }
  })
  const event = { detail: { errMsg: 'getPhoneNumber:ok', code: 'test-phone-code' } }
  const first = instance.onGetPhoneNumber(event)
  assert.equal(instance.wechatLoading, true)
  await instance.onGetPhoneNumber(event)
  await instance.bindWechatAndConfirm({ code: 'another-code' })
  assert.equal(starts, 1)
  release({ session_id: 'test-session' })
  await first
  assert.equal(binds, 1)
  assert.equal(confirms, 1)
  assert.deepEqual(tokens, ['test-token'])
  assert.deepEqual(navigations, ['/pages/generate/generate'])
  assert.equal(instance.wechatLoading, false)
})

test('failed login releases the guard so the user can retry', async () => {
  let starts = 0
  const { instance, toasts } = createLogin({
    loginByWechat: async () => { starts++; throw new Error('network timeout') }
  })
  await instance.bindWechatAndConfirm({ code: 'first-code' })
  assert.equal(instance.wechatLoading, false)
  await instance.bindWechatAndConfirm({ code: 'second-code' })
  assert.equal(starts, 2)
  assert.equal(toasts.length, 2)
  assert.equal(instance.wechatLoading, false)
})

test('WeChat frequency errors are reported without starting login', async () => {
  const { instance, toasts } = createLogin()
  await instance.onGetPhoneNumber({ detail: { errMsg: 'getPhoneNumber:fail too frequently' } })
  assert.deepEqual(toasts, ['手机号授权过于频繁，请稍后重试'])
  assert.equal(instance.wechatLoading, false)
})
