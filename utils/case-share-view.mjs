import { buildSharedCaseImages } from './materials-logic.mjs'

// 两种展示入口读取同一份分享快照，图片顺序和联系方式保持一致。
export function caseShareViewData(share, publicMediaUrl) {
  const gallery = share.gallery || share.case || {}
  const rawImages = share.images || share.items || share.image_list || []
  const images = buildSharedCaseImages(rawImages, publicMediaUrl)
  const coverUrl = publicMediaUrl(
    share.cover_webp_url || share.cover_url || share.cover_file_url || images[0]?.displayUrl || ''
  )
  const coverPreviewUrl = publicMediaUrl(
    share.cover_url || share.cover_file_url || images[0]?.previewUrl || ''
  )
  const shareCardCoverUrl = publicMediaUrl(share.card_cover_url || '')
  const caseInfo = {
    title: share.title || share.gallery_name || gallery.name || '案例分享',
    building: share.building_name || share.building || gallery.building_name || gallery.building || '',
    area: share.area || gallery.area || '',
    style: share.design_style || share.style || gallery.design_style || gallery.style || gallery.style_name || '',
    sharerName: share.sharer_name || '',
    sharerPhone: share.sharer_phone || ''
  }
  return { caseInfo, images, coverUrl, coverPreviewUrl, shareCardCoverUrl }
}
