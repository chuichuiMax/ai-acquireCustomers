import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { resolve } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')
const loginPage = readFileSync(resolve(projectRoot, 'pages/login/login.vue'), 'utf8')
const pagesConfig = readFileSync(resolve(projectRoot, 'pages.json'), 'utf8')
const authApi = readFileSync(resolve(projectRoot, 'apis/mp.js'), 'utf8')

test('login page exposes one-click login without SMS login entry points', () => {
  assert.match(loginPage, /一键登录/)
  assert.doesNotMatch(loginPage, /获取验证码/)
  assert.doesNotMatch(loginPage, /请输入验证码/)
  assert.doesNotMatch(loginPage, /loginBySms/)
  assert.doesNotMatch(loginPage, /sendSms/)
  assert.doesNotMatch(authApi, /sendSms/)
  assert.doesNotMatch(authApi, /loginBySms/)
  assert.match(pagesConfig, /"navigationBarTitleText": "登录"/)
})

test('WeChat mini-program login presents no manual phone entry or fallback', () => {
  assert.match(loginPage, /open-type="getPhoneNumber"/)
  assert.match(loginPage, /@getphonenumber="onGetPhoneNumber"/)
  assert.doesNotMatch(loginPage, /<input\b/)
  assert.doesNotMatch(loginPage, /请输入手机号码/)
  assert.doesNotMatch(loginPage, /phoneOk/)
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
