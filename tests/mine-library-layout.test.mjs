import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const pages = [
  '../pages/mine/works.vue',
  '../pages/mine/uploads.vue'
]

for (const page of pages) {
  test(`${page} keeps its bottom action bar above the tab bar safe area`, async () => {
    const source = await readFile(new URL(page, import.meta.url), 'utf8')

    assert.match(source, /padding:\s*16px\s+(?:12px|16px)\s+calc\(148px \+ env\(safe-area-inset-bottom\)\)/)
    if (page.endsWith('/uploads.vue')) {
      assert.match(source, /class="actions"\s+:style="\{ bottom: \(53 \+ safeBottom\) \+ 'px' \}"/)
      assert.match(source, /this\.safeBottom = info\.safeAreaInsets \? info\.safeAreaInsets\.bottom : 0/)
      assert.match(source, /\.actions\s*\{[^}]*border-radius:\s*12px 12px 0 0;/s)
    } else {
      assert.match(source, /\.actions\s*\{[^}]*bottom:\s*calc\(66px \+ env\(safe-area-inset-bottom\)\)/s)
    }
  })
}
