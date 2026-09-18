# Mini-Program Save-Path Dropdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a mini-program user select a writable, real PC material gallery from a compact save-path picker and persist the gallery ID in every image-design draft.

**Architecture:** The mini-program owns presentation and draft state. A pure helper turns the existing PC gallery response into picker rows with a scope prefix and filters it by the server-supplied `can_manage` permission. The task payload remains `save_target_id=<concrete gallery id>`; it never sends a static scope value.

**Tech Stack:** uni-app/Vue 2, Node built-in test runner, existing MP content gallery API.

**Spec:** `docs/superpowers/specs/2026-09-18-mini-program-save-path-dropdown-design.md`

**Delivery boundary:** This plan implements the requested picker and concrete `save_target_id` selection. The existing backend has no `/api/mp/image-design/*` router, so end-to-end generation and result insertion cannot be truthfully delivered by this scoped UI change; they require a separately approved mini-program image-design backend project.

## Global Constraints

- Use a native mini-program picker, not the full-screen save-folder layer.
- Labels are `我的素材 / ...` or `企业共享 / ...`; values are concrete gallery IDs.
- Expose a gallery only when `can_manage` is true. The backend remains the final permission authority.
- A selection continues to update all three workflow drafts.
- Do not modify either original dirty checkout.

---

### Task 1: Model writable PC galleries as picker options

**Files:**
- Modify: `utils/image-design-logic.mjs:145-169`
- Modify: `tests/image-design-logic.test.mjs:121-130`

**Interfaces:**
- Consumes: gallery objects with `id`, `name`, `visibility`, and `can_manage`.
- Produces: `savePathOptions(rawFolders): Array<{ id: string, label: string, name: string, visibility: string }>`.

- [ ] **Step 1: Write the failing test**

```js
test('save path options keep concrete writable gallery ids and PC scope prefixes', () => {
  const options = savePathOptions([
    { id: 'private-child', name: '洋湖天序', visibility: 'private', can_manage: true },
    { id: 'enterprise-child', name: '品牌案例', visibility: 'enterprise', can_manage: true },
    { id: 'enterprise-readonly', name: '只读共享', visibility: 'enterprise', can_manage: false }
  ])
  assert.deepEqual(options, [
    { id: 'enterprise-child', name: '品牌案例', visibility: 'enterprise', label: '企业共享 / 品牌案例' },
    { id: 'private-child', name: '洋湖天序', visibility: 'private', label: '我的素材 / 洋湖天序' }
  ])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/image-design-logic.test.mjs`

Expected: FAIL because `savePathOptions` is not exported.

- [ ] **Step 3: Write minimal implementation**

```js
export function savePathOptions(rawFolders = []) {
  return uniqueFolders(rawFolders)
    .filter((folder) => folder && folder.can_manage === true)
    .map((folder) => ({
      id: folder.id,
      name: folder.name || '未命名图库',
      visibility: folder.visibility || 'private',
      label: `${(folder.visibility || 'private') === 'enterprise' ? '企业共享' : '我的素材'} / ${folder.name || '未命名图库'}`
    }))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/image-design-logic.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/image-design-logic.test.mjs utils/image-design-logic.mjs
git commit -m "feat: expose writable save path options"
```

### Task 2: Replace the full-screen save selector with a compact picker

**Files:**
- Modify: `pages/cover/cover.vue:76,115-118,133-157,254-260,311-314`
- Modify: `tests/image-design-page.test.mjs:50-55`

**Interfaces:**
- Consumes: `savePathOptions(this.sourceFolders)` and a picker change event whose `detail.value` indexes that array.
- Produces: `selectSavePathByIndex(event)`, which delegates to `selectSaveFolder(folder)`.

- [ ] **Step 1: Write the failing page test**

```js
test('save path uses a compact picker backed by writable PC gallery options', () => {
  assert.match(page, /<picker[^>]+:range="savePathLabels"/)
  assert.match(page, /@change="selectSavePathByIndex"/)
  assert.match(page, /savePathOptions\(this\.sourceFolders\)/)
  assert.doesNotMatch(page, /v-if="savePickerVisible"/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/image-design-page.test.mjs`

Expected: FAIL because the page still renders `savePickerVisible`.

- [ ] **Step 3: Write minimal implementation**

```vue
<picker :range="savePathLabels" @change="selectSavePathByIndex">
  <view class="save-target"><text :class="{ placeholder: !selectedSaveFolder }">{{ selectedSaveFolder ? selectedSaveFolder.label : '请选择保存路径' }}</text><text>⌄</text></view>
</picker>
```

```js
savePathOptions() { return savePathOptions(this.sourceFolders) },
savePathLabels() { return this.savePathOptions.map((item) => item.label) },
selectSavePathByIndex(event) {
  const folder = this.savePathOptions[Number(event.detail.value)]
  if (folder) return this.selectSaveFolder(folder)
}
```

Remove `savePickerVisible` state and the full-screen save-picker markup/CSS; retain `selectSaveFolder` as the only state writer.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/image-design-page.test.mjs`

Expected: PASS.

- [ ] **Step 5: Run focused mini-program regression tests**

Run: `node --test tests/image-design-logic.test.mjs tests/image-design-page.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add pages/cover/cover.vue tests/image-design-page.test.mjs
git commit -m "feat: use PC gallery paths in save picker"
```

### Task 3: Verify source, tests, and patch integrity

**Files:**
- Verify only: `pages/cover/cover.vue`, `utils/image-design-logic.mjs`, `tests/image-design-logic.test.mjs`, `tests/image-design-page.test.mjs`

**Interfaces:**
- Consumes: completed Tasks 1 and 2.
- Produces: a scoped mini-program implementation ready for device visual acceptance.

- [ ] **Step 1: Run all image-design tests**

Run: `node --test tests/image-design-logic.test.mjs tests/image-design-page.test.mjs`

Expected: PASS with no failures.

- [ ] **Step 2: Check JavaScript syntax**

Run: `node --check utils/image-design-logic.mjs`

Expected: exit code 0.

- [ ] **Step 3: Check patch whitespace**

Run: `git diff --check main...HEAD`

Expected: exit code 0.

- [ ] **Step 4: Inspect scoped diff**

Run: `git diff --stat main...HEAD -- pages/cover/cover.vue utils/image-design-logic.mjs tests/image-design-logic.test.mjs tests/image-design-page.test.mjs`

Expected: only the four named files are changed.
