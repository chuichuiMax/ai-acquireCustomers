import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const source = readFileSync(new URL('../pages/login/login.vue', import.meta.url), 'utf8')
const employee = (code) => ({ employee_code: code, name: `员工${code}`, login_account: '13900000001' })
const tick = () => new Promise((resolve) => setImmediate(resolve))

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

function createLogin(api = {}) {
  const toasts = [], tokens = [], navigations = []
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
    .replace(/^import .*$/gm, '').replace('export default', 'const page =')
  const page = vm.runInNewContext(`${script}\npage`, {
    mpAuthApi: api,
    errorMessage: (error) => error.message,
    acceptConfirmedLogin: (data) => tokens.push(data.access_token),
    uni: {
      showToast: (toast) => toasts.push(toast.title),
      reLaunch: (options) => navigations.push(options.url)
    }
  })
  const instance = { ...page.data() }
  for (const [name, method] of Object.entries(page.methods)) instance[name] = method.bind(instance)
  const input = (value) => instance.onWorkIdInput({ detail: { value } })
  return { instance, input, toasts, tokens, navigations, unload: () => page.onUnload.call(instance) }
}

test('empty code is rejected without a network request', async () => {
  const { instance } = createLogin()
  await instance.onLogin()
  assert.equal(instance.employeeError, '请输入工号')
  assert.equal(instance.loginLoading, false)
})

test('lookup trims whitespace, preserves short codes and zeroes, and does not log in', async () => {
  const seen = []
  const login = createLogin({ lookupEmployee: async ({ employee_code: code }) => {
    seen.push(code)
    return { employee: employee(code) }
  } })
  for (const code of ['001A', 'A']) {
    login.input(` ${code} `)
    await login.instance.lookupEmployee()
    assert.equal(login.instance.employee.employee_code, code)
    assert.equal(login.instance.employee.name, `员工${code}`)
    assert.equal(login.instance.employee.login_account, '13900000001')
  }
  assert.deepEqual(seen, ['001A', 'A'])
  assert.deepEqual(login.tokens, [])
  assert.deepEqual(login.navigations, [])
})

test('editing or clearing the code immediately clears previous employee information', async () => {
  const login = createLogin({ lookupEmployee: async () => ({ employee: employee('A') }) })
  login.input('A')
  await login.instance.lookupEmployee()
  login.input('B')
  assert.equal(login.instance.employee, null)
  login.instance.clearWorkId()
  assert.equal(login.instance.workId, '')
  assert.equal(login.instance.employeeError, '')
})

test('late lookup cannot replace a newer employee, including an A-B-A input sequence', async () => {
  const first = deferred(), second = deferred()
  let calls = 0
  const login = createLogin({ lookupEmployee: () => (++calls === 1 ? first.promise : second.promise) })
  login.input('A')
  const old = login.instance.lookupEmployee()
  login.input('B')
  login.input('A')
  const current = login.instance.lookupEmployee()
  second.resolve({ employee: { ...employee('A'), name: '最新资料' } })
  await current
  first.resolve({ employee: { ...employee('A'), name: '旧资料' } })
  await old
  assert.equal(login.instance.employee.name, '最新资料')
})

test('an old lookup error cannot replace a newer success', async () => {
  const first = deferred()
  const login = createLogin({ lookupEmployee: ({ employee_code: code }) => code === 'A'
    ? first.promise : Promise.resolve({ employee: employee(code) }) })
  login.input('A')
  const old = login.instance.lookupEmployee()
  login.input('B')
  await login.instance.lookupEmployee()
  first.reject(new Error('未找到对应员工号'))
  await old
  assert.equal(login.instance.employee.employee_code, 'B')
  assert.equal(login.instance.employeeError, '')
})

test('blur and immediate repeated login share one lookup and one login', async () => {
  const pending = deferred()
  let lookups = 0, logins = 0
  const login = createLogin({
    lookupEmployee: () => { lookups++; return pending.promise },
    loginByEmployeeCode: async ({ employee_code: code }) => {
      logins++
      assert.equal(code, '001A')
      return { access_token: 'mp-token', employee: employee(code) }
    }
  })
  login.input('001A')
  const blur = login.instance.lookupEmployee()
  const submit = login.instance.onLogin()
  await login.instance.onLogin()
  assert.equal(lookups, 1)
  assert.equal(logins, 0)
  pending.resolve({ employee: employee('001A') })
  await Promise.all([blur, submit])
  assert.equal(logins, 1)
  assert.deepEqual(login.tokens, ['mp-token'])
  assert.deepEqual(login.navigations, ['/pages/generate/generate'])
  assert.equal(login.instance.loginLoading, false)
})

for (const message of ['未找到对应员工号', '员工已停用', '该员工未开通小程序登录', '请求超时，请稍后重试']) {
  test(`lookup failure blocks login and allows retry: ${message}`, async () => {
    let fail = true
    const login = createLogin({
      lookupEmployee: async ({ employee_code: code }) => {
        if (fail) throw new Error(message)
        return { employee: employee(code) }
      },
      loginByEmployeeCode: async () => ({ access_token: 'retry-token' })
    })
    login.input('001A')
    await login.instance.onLogin()
    assert.equal(login.instance.employee, null)
    assert.equal(login.instance.employeeError, message)
    assert.equal(login.instance.lookupLoading, false)
    assert.equal(login.instance.loginLoading, false)
    assert.deepEqual(login.tokens, [])
    fail = false
    await login.instance.onLogin()
    assert.deepEqual(login.tokens, ['retry-token'])
  })
}

test('revocation at login clears the queried employee and does not save a token', async () => {
  const login = createLogin({
    lookupEmployee: async () => ({ employee: employee('A') }),
    loginByEmployeeCode: async () => { throw new Error('员工已停用') }
  })
  login.input('A')
  await login.instance.lookupEmployee()
  await login.instance.onLogin()
  assert.equal(login.instance.employee, null)
  assert.equal(login.instance.employeeError, '员工已停用')
  assert.deepEqual(login.tokens, [])
})

test('unloaded page ignores pending lookup and pending login responses', async () => {
  const lookup = deferred()
  const first = createLogin({ lookupEmployee: () => lookup.promise })
  first.input('A')
  const reading = first.instance.lookupEmployee()
  first.unload()
  lookup.resolve({ employee: employee('A') })
  await reading
  assert.equal(first.instance.employee, null)

  const signed = deferred()
  const second = createLogin({
    lookupEmployee: async () => ({ employee: employee('A') }),
    loginByEmployeeCode: () => signed.promise
  })
  second.input('A')
  const logging = second.instance.onLogin()
  await tick()
  second.unload()
  signed.resolve({ access_token: 'late-token' })
  await logging
  assert.deepEqual(second.tokens, [])
  assert.deepEqual(second.navigations, [])
})

test('help and forgotten-code messages match the approved prototype wording', () => {
  const login = createLogin()
  login.instance.showLoginHelp('workId')
  login.instance.showLoginHelp('phone')
  login.instance.showLoginHelp('missing')
  login.instance.showForgotWorkId()
  assert.deepEqual(login.toasts, [
    '请联系直属主管或人资获取工号', '手机号由系统根据工号自动同步',
    '请确认工号是否正确，或联系管理员核对员工信息', '打开企业微信查看'
  ])
})

test('employee auth API uses two anonymous endpoints without credential fallbacks', async () => {
  const apiSource = readFileSync(new URL('../apis/mp.js', import.meta.url), 'utf8')
  const block = apiSource.slice(apiSource.indexOf('export const mpAuthApi'), apiSource.indexOf('export const mpMeApi'))
  const calls = []
  const api = vm.runInNewContext(`${block.replace('export const', 'const')}\nmpAuthApi`, {
    request: async (options) => { calls.push(options); return {} }
  })
  await api.lookupEmployee({ employee_code: '001A' })
  await api.loginByEmployeeCode({ employee_code: '001A' })
  assert.equal(calls.length, 2)
  assert.equal(calls[0].url, '/api/mp/auth/employee/lookup')
  assert.equal(calls[1].url, '/api/mp/auth/employee/login')
  for (const call of calls) {
    assert.equal(call.method, 'POST')
    assert.equal(call.requiresAuth, false)
    assert.equal(call.data.employee_code, '001A')
  }
})
