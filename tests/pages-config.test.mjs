import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')
const pages = JSON.parse(readFileSync(resolve(projectRoot, 'pages.json'), 'utf8')).pages

for (const page of pages) {
  const pageComponent = resolve(projectRoot, `${page.path}.vue`)
  assert.equal(
    existsSync(pageComponent),
    true,
    `Registered page "${page.path}" must have a matching .vue component`,
  )
}

test('WeChat home opens the neutral entry page instead of an internal page', () => {
  assert.equal(pages[0].path, 'pages/index/index')
})

test('personal center registers dedicated works and uploads pages', () => {
  const paths = pages.map((page) => page.path)

  assert.equal(paths.includes('pages/mine/works'), true)
  assert.equal(paths.includes('pages/mine/uploads'), true)
})
