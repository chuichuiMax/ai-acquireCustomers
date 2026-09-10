import assert from 'node:assert/strict'
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
