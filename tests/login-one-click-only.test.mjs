import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { resolve } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')
const loginPage = readFileSync(resolve(projectRoot, 'pages/login/login.vue'), 'utf8')
const pagesConfig = readFileSync(resolve(projectRoot, 'pages.json'), 'utf8')
const authApi = readFileSync(resolve(projectRoot, 'apis/mp.js'), 'utf8')
const config = readFileSync(resolve(projectRoot, 'config.js'), 'utf8')

test('login page exposes SMS login, one-click login, and the employee-only notice', () => {
  assert.match(loginPage, /该小程序仅限于鸿扬内部员工登入/)
  assert.match(loginPage, /请输入手机号/)
  assert.match(loginPage, /请输入验证码/)
  assert.match(loginPage, /获取验证码/)
  assert.match(loginPage, /loginBySms/)
  assert.match(loginPage, /sendSms/)
  assert.match(loginPage, /一键登录/)
  assert.match(authApi, /loginBySms/)
  assert.match(authApi, /sendSms/)
  assert.match(authApi, /\/api\/mp\/auth\/sms\/send/)
  assert.match(authApi, /\/api\/mp\/auth\/sms\/login/)
  assert.match(loginPage, /hasMiniProgramAccess\(data\)/)
  assert.doesNotMatch(loginPage, /hasMiniProgramPort\(employee && employee\.login_port\)/)
  assert.doesNotMatch(loginPage, /请输入密码/)
  assert.doesNotMatch(loginPage, /loginByPassword/)
  assert.match(pagesConfig, /"navigationBarTitleText": "登录"/)
})

test('developer tools use the local API base URL', () => {
  assert.match(config, /http:\/\/127\.0\.0\.1:5050/)
  assert.match(config, /devtools/)
})

test('WeChat mini-program login still offers one-click phone authorization', () => {
  assert.match(loginPage, /open-type="getPhoneNumber"/)
  assert.match(loginPage, /@getphonenumber="onGetPhoneNumber"/)
  assert.match(loginPage, /phoneOk/)
  assert.doesNotMatch(loginPage, /wechatPhoneFrom/)
  assert.doesNotMatch(loginPage, /loginByPhoneFallback/)
  assert.doesNotMatch(loginPage, /#ifndef MP-WEIXIN/)
})

test('one-click login confirms the bound session directly without a confirmation page', () => {
  assert.match(loginPage, /mpAuthApi\.confirmLogin\(\{\s*session_id: session\.session_id/)
  assert.match(loginPage, /setToken\(data\.access_token\)/)
  assert.match(loginPage, /uni\.reLaunch\(\{ url: '\/pages\/generate\/generate' \}\)/)
  assert.doesNotMatch(loginPage, /uni\.navigateTo\(\{ url: '\/pages\/login\/confirm' \}\)/)
  assert.doesNotMatch(pagesConfig, /"path": "pages\/login\/confirm"/)
})
