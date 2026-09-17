import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

import {
  resolveTabIcon,
  tabBarColors,
  tabBarItems
} from '../utils/tab-bar-icons.mjs'

const expectedItems = [
  { key: 'generate', path: '/pages/generate/generate', label: '生产', icon: '/static/tab-bar-icons/generate.png', activeIcon: '/static/tab-bar-icons/generate-active.png' },
  { key: 'manage', path: '/pages/manage/manage', label: '记录', icon: '/static/tab-bar-icons/manage.png', activeIcon: '/static/tab-bar-icons/manage-active.png' },
  { key: 'cover', path: '/pages/cover/cover', label: '生图', icon: '/static/tab-bar-icons/cover.png', activeIcon: '/static/tab-bar-icons/cover-active.png' },
  { key: 'materials', path: '/pages/materials/materials', label: '案例', icon: '/static/tab-bar-icons/materials.png', activeIcon: '/static/tab-bar-icons/materials-active.png' },
  { key: 'mine', path: '/pages/mine/mine', label: '我的', icon: '/static/tab-bar-icons/mine.png', activeIcon: '/static/tab-bar-icons/mine-active.png' }
]

function pngDimensions(filePath) {
  const buffer = readFileSync(filePath)
  assert.deepEqual([...buffer.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

test('bottom navigation resolves the supplied silhouette for every selected and unselected tab', () => {
  assert.deepEqual(tabBarColors, { active: '#BE2D22', inactive: '#A4ADB3' })
  assert.deepEqual(tabBarItems, expectedItems)

  for (const item of tabBarItems) {
    assert.equal(resolveTabIcon(item, item.key), item.activeIcon)
    assert.equal(resolveTabIcon(item, 'another-tab'), item.icon)
  }
})

test('bottom navigation state assets are bundled as 72px square PNGs for 24px display', () => {
  for (const item of tabBarItems) {
    for (const icon of [item.icon, item.activeIcon]) {
      const filePath = resolve(import.meta.dirname, '..', `.${icon}`)
      assert.equal(existsSync(filePath), true, `${icon} is missing`)
      assert.deepEqual(pngDimensions(filePath), { width: 72, height: 72 })
    }
  }
})
