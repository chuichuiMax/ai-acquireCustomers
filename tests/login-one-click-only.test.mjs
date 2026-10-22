import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { resolveApiBaseUrl } from '../utils/api-base-url.mjs'

const projectRoot = resolve(import.meta.dirname, '..')
const loginPage = readFileSync(resolve(projectRoot, 'pages/login/login.vue'), 'utf8')
const pagesConfig = readFileSync(resolve(projectRoot, 'pages.json'), 'utf8')
const config = readFileSync(resolve(projectRoot, 'config.js'), 'utf8')

test('login page exposes employee code login and the employee-only notice', () => {
  assert.match(loginPage, /该小程序仅限于鸿扬内部员工登入/)
  assert.match(loginPage, /请输入工号/)
  assert.match(loginPage, /@blur="lookupEmployee"/)
  assert.doesNotMatch(loginPage, /请输入手机号/)
  assert.doesNotMatch(loginPage, /请输入验证码/)
  assert.doesNotMatch(loginPage, /获取验证码/)
  assert.doesNotMatch(loginPage, /loginBySms/)
  assert.doesNotMatch(loginPage, /sendSms/)
  assert.doesNotMatch(loginPage, /请输入密码/)
  assert.doesNotMatch(loginPage, /loginByPassword/)
  assert.match(pagesConfig, /"navigationBarTitleText": "登录"/)
})

test('release login uses the production API in developer tools and on devices', () => {
  const script = config.replace(/^import .*$/gm, '').replace(/^export /gm, '')
  const baseUrl = (platform) =>
    runInNewContext(`${script}\nBASE_URL`, {
      resolveApiBaseUrl,
      uni: { getSystemInfoSync: () => ({ platform }) }
    })

  assert.equal(baseUrl('devtools'), 'https://ai.hi-run.net')
  assert.equal(baseUrl('android'), 'https://ai.hi-run.net')
  assert.equal(baseUrl('ios'), 'https://ai.hi-run.net')
})

test('dual login keeps employee code independent of WeChat and preserves readonly fields and the existing background', () => {
  const employeeLogin = loginPage.match(/async onLogin\(\)\s*\{([\s\S]*?)\n {4}\},/)[1]
  assert.doesNotMatch(employeeLogin, /getPhoneNumber|uni\.login|loginByWechat|bindWechatPhone/)
  assert.match(loginPage, /open-type="getPhoneNumber\|agreePrivacyAuthorization"/)
  assert.match(loginPage, /@getphonenumber="onWechatLogin"/)
  assert.match(loginPage, /一键登录/)
  assert.match(loginPage, /employee \? employee\.name : ''[\s\S]*?disabled/)
  assert.match(loginPage, /employee \? employee\.login_account : ''[\s\S]*?disabled/)
  assert.match(loginPage, /\.page\s*\{[^}]*background:\s*#fff;/)
  assert.match(loginPage, /遇到问题？/)
  assert.match(loginPage, /忘记工号/)
  assert.match(loginPage, /请确认工号是否正确，或联系管理员核对员工信息/)
})

test('employee code login keeps confirmed-session handling and enters the existing workspace', () => {
  assert.match(loginPage, /mpAuthApi\.loginByEmployeeCode\(\{ employee_code: code \}\)/)
  assert.match(loginPage, /acceptConfirmedLogin\(data\)/)
  assert.match(loginPage, /uni\.reLaunch\(\{ url: '\/pages\/generate\/generate' \}\)/)
  assert.doesNotMatch(loginPage, /uni\.navigateTo\(\{ url: '\/pages\/login\/confirm' \}\)/)
  assert.doesNotMatch(pagesConfig, /"path": "pages\/login\/confirm"/)
})
