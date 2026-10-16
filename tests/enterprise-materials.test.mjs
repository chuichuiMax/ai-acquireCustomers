import test from 'node:test'
import assert from 'node:assert/strict'
import {
  canDeleteEnterpriseRoughItem,
  canSelectMaterialItemForDelete,
  filterEnterpriseRoughGalleries,
  isEnterpriseRoughGallery,
  materialItemOwnerUid
} from '../utils/enterprise-materials.mjs'

test('isEnterpriseRoughGallery matches enterprise rough roots only', () => {
  assert.equal(isEnterpriseRoughGallery({ visibility: 'enterprise', name: '毛坯房图库' }), true)
  assert.equal(isEnterpriseRoughGallery({ visibility: 'enterprise', image_design_role: 'rough' }), true)
  assert.equal(isEnterpriseRoughGallery({ visibility: 'enterprise', name: '案例图库' }), false)
  assert.equal(isEnterpriseRoughGallery({ visibility: 'private', name: '毛坯房图库' }), false)
  assert.equal(isEnterpriseRoughGallery({ visibility: 'enterprise', parent_id: 'child', name: '毛坯房图库' }), false)
})

test('filterEnterpriseRoughGalleries drops case galleries', () => {
  const filtered = filterEnterpriseRoughGalleries([
    { id: 'rough', visibility: 'enterprise', name: '毛坯房图库' },
    { id: 'case', visibility: 'enterprise', name: '案例图库' },
    { id: 'style', visibility: 'enterprise', parent_id: 'case', name: '复合写意' }
  ])
  assert.deepEqual(filtered.map((row) => row.id), ['rough'])
})

test('enterprise rough delete selection requires matching owner uid', () => {
  assert.equal(canDeleteEnterpriseRoughItem({ owner_uid: 'u1', can_manage: true }, 'u1'), true)
  assert.equal(canDeleteEnterpriseRoughItem({ owner_uid: 'u1', can_manage: true }, 'u2'), false)
  assert.equal(canSelectMaterialItemForDelete({ owner_uid: 'u1', can_manage: true }, { scope: 'enterprise', currentUid: 'u1' }), true)
  assert.equal(canSelectMaterialItemForDelete({ owner_uid: 'u1', can_manage: true }, { scope: 'enterprise', currentUid: 'u2' }), false)
  assert.equal(canSelectMaterialItemForDelete({ owner_uid: 'u1', can_manage: true }, { scope: 'private', currentUid: 'u2' }), true)
})

test('enterprise rough delete ignores admin can_manage on others uploads', () => {
  assert.equal(
    canSelectMaterialItemForDelete({ owner_uid: 'u1', can_manage: true }, { scope: 'enterprise', currentUid: 'admin-u' }),
    false
  )
  assert.equal(canSelectMaterialItemForDelete({ owner_uid: 'u1', can_manage: true }, { scope: 'enterprise', currentUid: '' }), false)
})

test('enterprise rough delete matches uploaded_by from list payloads', () => {
  assert.equal(materialItemOwnerUid({ uploaded_by: 'u1' }), 'u1')
  assert.equal(canSelectMaterialItemForDelete({ uploaded_by: 'u1', can_manage: true }, { scope: 'enterprise', currentUid: 'u1' }), true)
  assert.equal(canSelectMaterialItemForDelete({ uploaded_by: 'u1', can_manage: true }, { scope: 'enterprise', currentUid: 'u2' }), false)
})
