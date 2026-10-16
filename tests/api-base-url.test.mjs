import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveApiBaseUrl } from '../utils/api-base-url.mjs'

const localBaseUrl = 'http://127.0.0.1:5050'
const testBaseUrl = 'http://124.232.148.28:8080'
const onlineBaseUrl = 'https://ai.hi-run.net'

test('test server mode uses HTTP in devtools and HTTPS on real devices', () => {
  const testDeviceBaseUrl = 'https://ai.hi-run.net'
  assert.equal(
    resolveApiBaseUrl({
      isDevelopment: true,
      platform: 'devtools',
      localBaseUrl,
      onlineBaseUrl,
      useTestServer: true,
      testBaseUrl,
      testDeviceBaseUrl
    }),
    testBaseUrl
  )
  assert.equal(
    resolveApiBaseUrl({
      isDevelopment: false,
      platform: 'android',
      localBaseUrl,
      onlineBaseUrl,
      useTestServer: true,
      testBaseUrl,
      testDeviceBaseUrl
    }),
    testDeviceBaseUrl
  )
})

test('WeChat developer tools keep using the local API during development', () => {
  assert.equal(
    resolveApiBaseUrl({ isDevelopment: true, platform: 'devtools', localBaseUrl, onlineBaseUrl }),
    localBaseUrl
  )
})

test('a real WeChat device uses the HTTPS online API during development', () => {
  assert.equal(
    resolveApiBaseUrl({ isDevelopment: true, platform: 'android', localBaseUrl, onlineBaseUrl }),
    onlineBaseUrl
  )
})

test('a release build uses the HTTPS online API outside developer tools', () => {
  assert.equal(
    resolveApiBaseUrl({ isDevelopment: false, platform: '', localBaseUrl, onlineBaseUrl }),
    onlineBaseUrl
  )
})
