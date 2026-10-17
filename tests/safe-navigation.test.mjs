import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

test('entry index avoids duplicate reLaunch watchdog', () => {
  const indexPage = readFileSync(new URL('../pages/index/index.vue', import.meta.url), 'utf8')
  assert.doesNotMatch(indexPage, /uni\.reLaunch/)
  assert.match(indexPage, /App\.onShow/)
})

test('App and internal access use safeReLaunch', () => {
  const app = readFileSync(new URL('../App.vue', import.meta.url), 'utf8')
  const internal = readFileSync(new URL('../utils/internal-access.js', import.meta.url), 'utf8')
  assert.doesNotMatch(app, /uni\.reLaunch/)
  assert.match(app, /safeReLaunch/)
  assert.match(internal, /safeReLaunch/)
})

test('safe navigation prefers redirect from entry index', () => {
  const nav = readFileSync(new URL('../utils/safe-navigation.js', import.meta.url), 'utf8')
  assert.match(nav, /redirectTo/)
  assert.match(nav, /pages\/index\/index/)
})
