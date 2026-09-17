import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const tabBar = readFileSync(resolve(import.meta.dirname, '../components/tab-bar.vue'), 'utf8')

test('bottom tab visuals sit lower without changing the tab hit area', () => {
  assert.match(tabBar, /<view class="tab-content">\s*<image class="icon"/)
  assert.match(tabBar, /\.tab-content\s*\{[\s\S]*?transform:\s*translateY\(5px\)/)
  assert.match(tabBar, /\.tab-item\s*\{[\s\S]*?height:\s*52px;/)
})
