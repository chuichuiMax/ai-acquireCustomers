import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')
const source = readFileSync(resolve(projectRoot, 'utils/request.js'), 'utf8')
  .replace(/^import .*$/gm, '')
  .replace(/^export /gm, '')

function loadMediaHelpers(baseUrl = 'http://127.0.0.1:5050') {
  const storage = { mp_token: 'token-demo' }
  return runInNewContext(
    `${source}\n({ mediaUrl, thumbUrl, publicMediaUrl })`,
    {
      BASE_URL: baseUrl,
      TOKEN_KEY: 'mp_token',
      uni: {
        getStorageSync: (key) => storage[key] || '',
        setStorageSync: (key, value) => {
          storage[key] = value
        },
        removeStorageSync: (key) => {
          delete storage[key]
        }
      }
    }
  )
}

test('api proxy media urls keep auth token and skip CDN webp params', () => {
  const { mediaUrl } = loadMediaHelpers()
  assert.equal(
    mediaUrl('/api/mp/content/gallery-items/mli_1/file', { format: 'webp', width: 1080, quality: 80 }),
    'http://127.0.0.1:5050/api/mp/content/gallery-items/mli_1/file?access_token=token-demo'
  )
  assert.equal(
    mediaUrl('/api/mp/content/hycanvas-templates/tpl/overlay'),
    'http://127.0.0.1:5050/api/mp/content/hycanvas-templates/tpl/overlay?access_token=token-demo'
  )
})

test('cdn urls still receive image optimize query params', () => {
  const { mediaUrl } = loadMediaHelpers()
  assert.equal(
    mediaUrl('https://bucket.oss-cn-hangzhou.aliyuncs.com/a.png', { format: 'webp', width: 360, quality: 72 }),
    'https://bucket.oss-cn-hangzhou.aliyuncs.com/a.png?x-oss-process=image/format,webp/resize,w_360/quality,q_72'
  )
})
