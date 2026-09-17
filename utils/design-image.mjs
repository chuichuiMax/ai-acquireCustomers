import { STYLE_OPTIONS } from './materials-logic.mjs'

export const DESIGN_STYLE_CHIPS = [
  '复合写意',
  '写意木构',
  '江南印象',
  '欧美香颂',
  '欧式田园',
  '异域风情',
  '东方古雅',
  '轻欧简美',
  '北欧之光',
  '新装饰主义',
  '优雅缤纷',
  '极简侘寂',
  ...STYLE_OPTIONS.filter(
    (style) =>
      style !== '全部' &&
      ![
        '复合写意',
        '写意木构',
        '江南印象',
        '欧美香颂',
        '欧式田园',
        '异域风情',
        '东方古雅',
        '轻欧简美',
        '北欧之光',
        '新装饰主义',
        '优雅缤纷',
        '极简侘寂'
      ].includes(style)
  )
]

const STYLE_PROMPTS = {
  '复合写意':
    '复合写意室内设计，保留原房结构框架与门窗位置，木质格栅、写意山水与暖木色织物结合，东方气韵克制，自然光写实摄影。',
  '写意木构':
    '写意木构室内设计，保留原有开间与梁柱关系，露出木结构肌理，榫卯与原木家具，温和日光，真实家居摄影。',
  '江南印象':
    '江南印象室内设计，保留原房墙体与窗洞，青瓦白墙意象、月洞门与细竹帘，浅灰绿与原木，湿润柔光写实效果。',
  '欧美香颂':
    '欧美香颂室内设计，保留原有空间尺度，法式线条、石膏线与香槟金点缀，奶油墙面与丝绒织物，优雅室内摄影。',
  '欧式田园':
    '欧式田园室内设计，保留原房结构，碎花布艺、做旧实木与藤编，暖黄灯光，乡村别墅起居氛围，写实摄影。',
  '异域风情':
    '异域风情室内设计，保留原有房屋框架，摩洛哥拱门、彩色瓷砖与铜质灯具，浓郁色彩但不改动墙体开间，写实摄影。',
  '东方古雅':
    '东方古雅室内设计，保留原房结构，深色硬木、圈椅与绢本装饰，对称布局，烛暖光与自然光结合，典雅写实。',
  '轻欧简美':
    '轻欧简美室内设计，保留门窗位置，浅色石膏线、弧形沙发与低饱和配色，明亮干净，现代美式轻装修写实效果。',
  '北欧之光':
    '北欧之光室内设计，保留原有结构，白墙原木、低矮家具与大面积自然光，简洁功能，斯堪的纳维亚家居摄影。',
  '新装饰主义':
    '新装饰主义室内设计，保留墙体开间，几何线条、黑金对比与艺术装饰画，摩登都市公寓，精致写实摄影。',
  '优雅缤纷':
    '优雅缤纷室内设计，保留原房框架，柔和撞色软装、艺术挂画与花卉点缀，轻快但不杂乱，室内杂志摄影质感。',
  '极简侘寂':
    '极简侘寂室内设计，保留空间尺度，微水泥、亚麻与残缺美感，低饱和灰褐，留白克制，自然光写实摄影。',
  '意境东方':
    '意境东方室内设计，保留原有房屋结构，水墨留白、禅意家具与一束枯枝，静谧光线，当代中式写实效果。',
  '雅致现代':
    '雅致现代室内设计，保留门窗与开间，岩板、金属灯具与低饱和高级灰，简洁利落，当代公寓写实摄影。',
  '工业再造':
    '工业再造室内设计，保留原房结构，红砖、黑色型钢与水泥地面，复古灯泡，loft 氛围写实摄影。',
  '仿生未来':
    '仿生未来室内设计，保留墙体框架，流线造型、微光灯带与有机材质，科技感克制，概念室内写实渲染。',
  '复古风潮':
    '复古风潮室内设计，保留原有空间，中古家具、胡桃木与焦糖色皮革，胶片色调，怀旧家居摄影。',
  '艺术室界':
    '艺术室界室内设计，保留房屋结构，画廊白墙、雕塑与大型抽象画，展陈式灯光，当代艺术居住空间写实摄影。'
}

export const RATIO_OPTIONS = [
  { id: 'portrait', label: '竖图3:4', sizeLabel: '1080×1440', width: 1080, height: 1440 },
  { id: 'landscape', label: '横版', sizeLabel: '1440×1080', width: 1440, height: 1080 },
  { id: 'square', label: '方图1:1', sizeLabel: '1024×1024', width: 1024, height: 1024 }
]

export const COUNT_OPTIONS = [2, 4]

export const QUALITY_OPTIONS = [
  { id: '1k', label: '1K标清' },
  { id: '2k', label: '2K高清' }
]

export const SAVE_PATH_OPTIONS = [
  { id: 'personal', label: '个人中心作品' },
  { id: 'public', label: '公共图库' }
]

export function promptForStyle(style) {
  const name = String(style || '').trim()
  if (!name) return ''
  return STYLE_PROMPTS[name] || `${name}室内设计，保留原房结构框架，只更换装修风格与材质，写实摄影。`
}

export function buildPolishedPrompt({ style, extra } = {}) {
  const stylePrompt = promptForStyle(style)
  const extraText = String(extra || '').trim()
  return [
    stylePrompt,
    extraText ? `用户补充要求：${extraText}` : '',
    '请在保留原有房屋结构、墙体开间、门窗位置和空间尺度的前提下完成室内换装设计；重点处理用户提到的背景墙、材质、色调与空间氛围，效果需真实可落地。'
  ]
    .filter(Boolean)
    .join('\n\n')
}

export function extractPolishedPrompt(data, fallback = '') {
  if (typeof data === 'string' && data.trim()) return data.trim()
  const text =
    data?.polished_prompt ||
    data?.prompt ||
    data?.text ||
    data?.result ||
    data?.content ||
    ''
  return String(text).trim() || fallback
}

export function findFolderByKeywords(galleries = [], keywords = []) {
  const match = (gallery) =>
    keywords.some((keyword) => String(gallery?.name || '').includes(keyword))
  return galleries.find((gallery) => !gallery.parent_id && match(gallery)) || galleries.find(match) || null
}

export function resolveDesignFolders(galleries = []) {
  const roots = galleries.filter((gallery) => !gallery.parent_id)
  const caseGallery = findFolderByKeywords(galleries, ['案例']) || roots[0] || null
  const roughGallery =
    findFolderByKeywords(galleries, ['毛坯']) ||
    roots.find((gallery) => gallery.id !== caseGallery?.id) ||
    null
  return { caseGallery, roughGallery }
}

export function ratioSize(ratioId) {
  const ratio = RATIO_OPTIONS.find((item) => item.id === ratioId) || RATIO_OPTIONS[0]
  return `${ratio.width}x${ratio.height}`
}

export function isMissingApi(error) {
  const status = error && error.statusCode
  return status === 404 || status === 405
}

function parseDate(value) {
  if (!value && value !== 0) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'number') {
    const date = new Date(value > 1e12 ? value : value * 1000)
    return Number.isNaN(date.getTime()) ? null : date
  }
  const text = String(value).trim()
  if (!text) return null
  if (/^\d{8}$/.test(text)) {
    return new Date(`${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}T00:00:00`)
  }
  const parsed = new Date(text.includes('T') ? text : text.replace(' ', 'T'))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function formatCompactDate(value) {
  const date = parseDate(value)
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

export function formatResultDateTime(value) {
  const date = parseDate(value)
  if (!date) return { date: '', time: '' }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return { date: `${year}.${month}.${day}`, time: `${hour}:${minute}` }
}

export function isRecognized(item) {
  if (!item) return false
  if (item.recognized === true || item.is_recognized === true || item.identified === true) return true
  const status = String(item.recognition_status || item.analyze_status || '').toLowerCase()
  return ['recognized', 'identified', 'analyzed', 'done', 'success'].includes(status)
}

export function recognitionLabel(item) {
  return isRecognized(item) ? '已识别' : '未识别'
}

export function normalizeUploads(data) {
  const list = data?.items || data?.uploads || data?.assets || (Array.isArray(data) ? data : [])
  return list
    .map((item) => ({
      id: item.id || item.asset_id || item.library_item_id || '',
      assetId: item.asset_id || item.id || '',
      galleryId: item.category || item.gallery_id || '',
      name: item.name || item.original_file_name || item.file_name || '上传图片',
      url: item.file_url || item.url || item.path || '',
      source: 'upload',
      recognized: isRecognized(item),
      createdAt: item.created_at || item.createdAt || item.uploaded_at || item.updated_at || ''
    }))
    .filter((item) => item.id)
}

function toJob(job) {
  return {
    id: job.id || job.job_id || '',
    status: job.status || 'queued',
    prompt: job.prompt || job.title || '',
    images: job.images || job.result_urls || job.assets || job.files || [],
    createdAt: job.created_at || job.createdAt || '',
    sourceUrl: job.source_url || job.sourceUrl || job.original_url || job.input_url || ''
  }
}

export function flattenResultCards(jobs = [], toUrl = (value) => value) {
  const cards = []
  jobs.forEach((job) => {
    const images = job.images || []
    const sourceUrl = toUrl(job.sourceUrl || job.source_url || '')
    if (!images.length) {
      if (!isRunningJob(job.status)) return
      cards.push({
        id: job.id || `pending-${cards.length}`,
        jobId: job.id || '',
        url: '',
        sourceUrl,
        createdAt: job.createdAt,
        status: job.status,
        pending: true
      })
      return
    }
    images.forEach((image, index) => {
      const raw = typeof image === 'string' ? image : image?.url || image?.file_url || image?.preview_url || image?.path || ''
      const createdAt =
        (typeof image === 'object' && (image.created_at || image.createdAt)) || job.createdAt || ''
      const imageSource =
        (typeof image === 'object' && (image.source_url || image.original_url)) || sourceUrl
      cards.push({
        id: `${job.id || 'job'}-${index}`,
        jobId: job.id || '',
        url: toUrl(raw),
        sourceUrl: toUrl(imageSource),
        createdAt,
        status: job.status,
        pending: false
      })
    })
  })
  return cards
}

export function normalizeJobs(data) {
  if (!data) return []
  if (Array.isArray(data)) return data.map(toJob)
  if (Array.isArray(data.jobs)) return data.jobs.map(toJob)
  if (Array.isArray(data.items)) return data.items.map(toJob)
  if (Array.isArray(data.results)) return data.results.map(toJob)
  if (data.job) return [toJob(data.job)]
  if (data.id || data.job_id) return [toJob(data)]
  return []
}

export function jobImageUrls(job, toUrl = (value) => value) {
  return (job?.images || [])
    .map((image) => {
      if (typeof image === 'string') return toUrl(image)
      return toUrl(image?.url || image?.file_url || image?.preview_url || image?.path || '')
    })
    .filter(Boolean)
}

export function jobStatusLabel(status) {
  const map = {
    queued: '排队中',
    pending: '排队中',
    running: '生成中',
    processing: '生成中',
    succeeded: '已完成',
    success: '已完成',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消'
  }
  return map[status] || status || '处理中'
}

export function isRunningJob(status) {
  return ['queued', 'pending', 'running', 'processing'].includes(status)
}

export function toCoverGeneratePayload(data) {
  return {
    mode: data.source_asset_id || data.source_item_id ? 'image_to_image' : 'text_to_image',
    source_asset_ids: data.source_asset_id ? [data.source_asset_id] : [],
    image_item_id: data.source_item_id || undefined,
    prompt: data.prompt,
    size: data.size,
    n: data.n,
    parameters: {
      quality: data.quality,
      save_target: data.save_target,
      style: data.style,
      extra_description: data.extra_description || ''
    }
  }
}
