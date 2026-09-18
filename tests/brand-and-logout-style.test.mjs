import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { resolve } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')
const loginPage = readFileSync(resolve(projectRoot, 'pages/login/login.vue'), 'utf8')
const minePage = readFileSync(resolve(projectRoot, 'pages/mine/mine.vue'), 'utf8')

test('login page presents the Hongyang customer acquisition name', () => {
  assert.match(loginPage, /<text class="title">鸿扬获客<\/text>/)
  assert.doesNotMatch(loginPage, /AI获客平台/)
})

test('logout button uses a red background, white text, and no mini-program outline', () => {
  assert.match(minePage, /\.logout\s*\{[^}]*background:\s*#BE2D22;[^}]*color:\s*#fff;/s)
  assert.match(minePage, /\.logout::after\s*\{\s*border:\s*none;\s*\}/)
})
