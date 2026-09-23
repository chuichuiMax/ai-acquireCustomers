export const NODE_LABELS = {
  compile_runtime_snapshot: '冻结运行配置',
  ingest_real_materials: '导入真实素材',
  normalize_evidence: '规范化证据',
  analyze_content_value: 'Agent 分析内容价值',
  select_content_direction: '人工锁定内容方向',
  match_combination_group: '固定规则匹配组合组',
  explain_strategy: 'Agent 解释策略',
  resolve_formula_requirements: '解析公式所需事实',
  collect_missing_evidence: 'Agent 收集缺失证据',
  confirm_high_risk_facts: '人工确认高风险事实',
  freeze_evidence_bundle: '冻结证据包',
  rank_formula_candidates: 'Agent 排序公式候选',
  lock_formula_selection: '锁定标题与正文公式',
  resolve_product_material_requirements: '解析产品资料需求',
  collect_strategy_product_evidence: '调研 Agent 定向检索产品资料',
  confirm_strategy_product_facts: '人工确认产品高风险事实',
  freeze_product_evidence_bundle: '冻结产品证据快照',
  generate_title_candidates: '标题 Agent 生成候选',
  validate_title_candidates: '校验标题候选',
  select_title: '人工选择标题',
  build_outline: '正文 Agent 构建大纲',
  generate_body: '正文 Agent 生成正文',
  persona_style_polish: '按人设润色表达',
  adapt_to_channel: '适配发布渠道',
  deterministic_validate: '执行确定性校验',
  semantic_review: '审核 Agent 复核内容',
  revise_if_needed: '按失败原因定点回修',
  human_content_approval: '人工批准最终文案',
  plan_visuals: '视觉 Agent 制定方案',
  submit_cover_job: '提交封面任务',
  wait_cover_job: '等待封面服务',
  visual_review: '视觉 Agent 审核图片',
  select_cover: '人工选择封面',
  save_artifact_snapshot: '保存统一内容版本',
  package_for_distribution: '生成不可变发布包'
}

export const NODE_PROCESS_TEXT = {
  compile_runtime_snapshot: '正在冻结本次运行配置。',
  ingest_real_materials: '正在导入真实素材。',
  normalize_evidence: '正在核对事实来源，筛除重复或不能直接用于创作的信息。',
  analyze_content_value: '正在分析内容价值与可用方向。',
  select_content_direction: '正在等待锁定内容方向。',
  match_combination_group: '正在按内容方向、变量与证据覆盖度，用固定规则锁定创作手法和公式。',
  explain_strategy: '正在解释已锁定的创作手法和公式。',
  resolve_formula_requirements: '正在解析公式所需事实。',
  collect_missing_evidence: '正在收集缺失证据。',
  confirm_high_risk_facts: '正在等待确认高风险事实。',
  freeze_evidence_bundle: '正在冻结证据包。',
  rank_formula_candidates: '正在执行策略择优',
  lock_formula_selection: '正在锁定标题与正文公式。',
  resolve_product_material_requirements: '正在解析产品资料需求。',
  collect_strategy_product_evidence: '正在定向检索产品资料。',
  confirm_strategy_product_facts: '正在等待确认产品高风险事实。',
  freeze_product_evidence_bundle: '正在冻结产品证据快照。',
  generate_title_candidates: '正在生成爆款标题候选。',
  validate_title_candidates: '正在校验标题候选。',
  select_title: '正在等待选择最终标题。',
  build_outline: '正在构建正文大纲。',
  generate_body: '正在撰写正文。',
  persona_style_polish: '正在按人设润色表达。',
  adapt_to_channel: '正在适配发布渠道。',
  deterministic_validate: '正在执行确定性校验。',
  semantic_review: '正在审核内容。',
  revise_if_needed: '正在按失败原因定点回修。',
  human_content_approval: '正在等待人工批准最终文案。',
  plan_visuals: '正在制定封面方案。',
  submit_cover_job: '正在提交封面任务。',
  wait_cover_job: '封面正在生成，完成后会自动继续。',
  visual_review: '正在审核封面。',
  select_cover: '正在等待选择最终封面。',
  save_artifact_snapshot: '正在整理并保存内容版本。',
  package_for_distribution: '正在生成发布包。'
}

export const PHASES = [
  {
    id: 'strategy',
    title: '锚定策略与公式',
    nodeIds: [
      'compile_runtime_snapshot',
      'ingest_real_materials',
      'normalize_evidence',
      'analyze_content_value',
      'select_content_direction',
      'match_combination_group',
      'explain_strategy',
      'resolve_formula_requirements',
      'collect_missing_evidence',
      'confirm_high_risk_facts',
      'freeze_evidence_bundle',
      'rank_formula_candidates',
      'lock_formula_selection'
    ]
  },
  {
    id: 'product',
    title: '补齐产品资料',
    nodeIds: [
      'resolve_product_material_requirements',
      'collect_strategy_product_evidence',
      'confirm_strategy_product_facts',
      'freeze_product_evidence_bundle'
    ]
  },
  {
    id: 'title',
    title: '生成标题',
    nodeIds: ['generate_title_candidates', 'validate_title_candidates', 'select_title']
  },
  {
    id: 'body',
    title: '撰写正文',
    nodeIds: ['build_outline', 'generate_body', 'persona_style_polish', 'adapt_to_channel']
  },
  {
    id: 'review',
    title: '审核内容',
    nodeIds: ['deterministic_validate', 'semantic_review', 'revise_if_needed', 'human_content_approval']
  },
  {
    id: 'cover',
    title: '生成封面',
    nodeIds: ['plan_visuals', 'submit_cover_job', 'wait_cover_job', 'visual_review', 'select_cover']
  },
  {
    id: 'finish',
    title: '整理结果',
    nodeIds: ['save_artifact_snapshot', 'package_for_distribution']
  }
]

const AGENT_NODES = {
  analyze_content_value: true,
  explain_strategy: true,
  collect_missing_evidence: true,
  rank_formula_candidates: true,
  collect_strategy_product_evidence: true,
  generate_title_candidates: true,
  build_outline: true,
  generate_body: true,
  persona_style_polish: true,
  semantic_review: true,
  plan_visuals: true,
  visual_review: true
}

export const AUTO_PASS_INTERRUPTS = {
  title_selection: true,
  cover_selection: true
}

export function shouldAutoPassInterrupt(type) {
  return Boolean(type && AUTO_PASS_INTERRUPTS[type])
}

const INTERRUPT_NODE = {
  content_direction: 'select_content_direction',
  high_risk_facts: 'confirm_high_risk_facts',
  formula_selection: 'lock_formula_selection',
  strategy_product_facts: 'confirm_strategy_product_facts',
  title_selection: 'select_title',
  content_correction: 'revise_if_needed',
  content_approval: 'human_content_approval',
  cover_selection: 'select_cover',
  external_wait: 'wait_cover_job'
}

const TOOL_TEXT = {
  query_kb: '正在检索知识库',
  get_creation_rule_bundle: '正在读取创作规则',
  submit_content_node_result: '模型已开始返回内容',
  create_content_cover_job: '正在提交封面任务'
}

const WORKFLOW_ORDER = PHASES.reduce(function (list, phase) {
  return list.concat(phase.nodeIds)
}, [])

function asObject(value) {
  return value && typeof value === 'object' ? value : {}
}

function textOf(value) {
  return value == null ? '' : String(value)
}

function nodeIdOf(item) {
  return textOf(item && (item.node_id || item.id || item.nodeId))
}

function nodeStatusOf(item) {
  return textOf(item && item.status).toLowerCase()
}

function eventPayload(event) {
  const body = asObject(event)
  const payload = asObject(body.payload)
  if (payload.payload && typeof payload.payload === 'object') return payload.payload
  return payload
}

function phaseOf(nodeId) {
  for (let index = 0; index < PHASES.length; index += 1) {
    const phase = PHASES[index]
    if (phase.nodeIds.indexOf(nodeId) !== -1) return phase
  }
  return PHASES[0]
}

function processText(nodeId) {
  return NODE_PROCESS_TEXT[nodeId] || '正在执行 ' + (NODE_LABELS[nodeId] || nodeId)
}

function callAction(nodeId) {
  return processText(nodeId).replace(/。$/, '')
}

function formatCallLine(attempt, text) {
  return '第' + Math.max(1, attempt) + '次调用 • ' + text
}

function latestNodeById(nodes) {
  const map = {}
  for (let index = 0; index < nodes.length; index += 1) {
    const item = nodes[index]
    const id = nodeIdOf(item)
    if (!id) continue
    map[id] = item
  }
  return map
}

function findCurrentNodeId(nodes, interrupt, status) {
  const interruptType = interrupt && interrupt.interrupt_type
  if (interruptType && INTERRUPT_NODE[interruptType]) return INTERRUPT_NODE[interruptType]

  const byId = latestNodeById(nodes)
  for (let index = WORKFLOW_ORDER.length - 1; index >= 0; index -= 1) {
    const id = WORKFLOW_ORDER[index]
    const statusText = nodeStatusOf(byId[id])
    if (statusText === 'running' || statusText === 'queued') return id
  }
  for (let index = WORKFLOW_ORDER.length - 1; index >= 0; index -= 1) {
    const id = WORKFLOW_ORDER[index]
    if (nodeStatusOf(byId[id]) === 'completed') {
      const next = WORKFLOW_ORDER[index + 1]
      if (next && textOf(status) !== 'completed') return next
      return id
    }
  }
  return WORKFLOW_ORDER[0]
}

function toolText(toolName) {
  return TOOL_TEXT[toolName] || '正在执行 ' + toolName
}

function eventNodeId(event) {
  const payload = eventPayload(event)
  return textOf(payload.node_id || payload.nodeId)
}

function buildEventLines(events, nodeId) {
  const lines = []
  let attempt = 0
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]
    const payload = eventPayload(event)
    const eventNode = eventNodeId(event)
    if (eventNode && eventNode !== nodeId) continue
    const type = textOf(event && event.event_type)
    if (type === 'content.agent.started') {
      attempt += 1
      lines.push({
        id: 'agent-' + nodeId + '-' + attempt,
        text: formatCallLine(payload.attempt || attempt, callAction(nodeId))
      })
      continue
    }
    if (type === 'content.tool.called') {
      const toolName = textOf(payload.tool_name || payload.toolName)
      if (!toolName) continue
      lines.push({
        id: 'tool-' + nodeId + '-' + toolName + '-' + index,
        text: formatCallLine(payload.attempt || attempt || 1, toolText(toolName))
      })
    }
    if (type === 'content.knowledge.retrieved') {
      const count = Number(payload.result_count || payload.resultCount || 0)
      lines.push({
        id: 'kb-' + nodeId + '-' + index,
        text: count ? '已检索到 ' + count + ' 条依据。' : '正在检索知识库。'
      })
    }
  }
  return lines
}

export function normalizeRunSnapshot(data) {
  const body = asObject(data)
  const run = asObject(body.run)
  const interrupt = body.interrupt || run.interrupt || null
  return {
    status: textOf(body.status || run.status).toLowerCase(),
    interrupt: interrupt,
    errorMessage: textOf(body.error_message || run.error_message),
    runId: textOf(body.run_id || run.run_id || run.id),
    nodes: Array.isArray(body.nodes) ? body.nodes : [],
    events: Array.isArray(body.events) ? body.events : [],
    delegatedAgents: Array.isArray(body.delegated_agents) ? body.delegated_agents : []
  }
}

const FALLBACK_BEATS = [
  { at: 0, nodeId: 'normalize_evidence', done: [] },
  { at: 3, nodeId: 'match_combination_group', done: ['normalize_evidence'] },
  { at: 8, nodeId: 'rank_formula_candidates', done: ['normalize_evidence', 'match_combination_group'] },
  { at: 26, nodeId: 'generate_title_candidates', done: [] },
  { at: 40, nodeId: 'generate_body', done: ['build_outline'] },
  { at: 62, nodeId: 'semantic_review', done: ['deterministic_validate'] },
  { at: 80, nodeId: 'wait_cover_job', done: ['plan_visuals', 'submit_cover_job'] },
  { at: 100, nodeId: 'save_artifact_snapshot', done: [] }
]

function fallbackNodes(elapsedSeconds, interrupt) {
  if (interrupt && interrupt.interrupt_type && INTERRUPT_NODE[interrupt.interrupt_type]) {
    return []
  }
  const elapsed = Math.max(0, Number(elapsedSeconds) || 0)
  let beat = FALLBACK_BEATS[0]
  for (let index = 0; index < FALLBACK_BEATS.length; index += 1) {
    if (elapsed >= FALLBACK_BEATS[index].at) beat = FALLBACK_BEATS[index]
  }
  return beat.done
    .map(function (nodeId) {
      return { node_id: nodeId, status: 'completed' }
    })
    .concat([{ node_id: beat.nodeId, status: 'running', attempt: 1 }])
}

export function buildGenerationProcess(input) {
  const snapshot = asObject(input)
  const rawNodes = Array.isArray(snapshot.nodes) ? snapshot.nodes : []
  const events = Array.isArray(snapshot.events) ? snapshot.events : []
  const interrupt = snapshot.interrupt || null
  const status = textOf(snapshot.status).toLowerCase()
  const nodes = rawNodes.length ? rawNodes : fallbackNodes(snapshot.elapsedSeconds, interrupt)
  const currentId = findCurrentNodeId(nodes, interrupt, status)
  const phase = phaseOf(currentId)
  const byId = latestNodeById(nodes)
  const currentStatus = nodeStatusOf(byId[currentId]) || (status && status !== 'completed' ? 'running' : 'pending')
  const lines = []
  const seen = {}

  for (let index = 0; index < phase.nodeIds.length; index += 1) {
    const id = phase.nodeIds[index]
    if (id === currentId) break
    const item = byId[id]
    if (!item || nodeStatusOf(item) !== 'completed') continue
    const text = processText(id)
    if (seen[text]) continue
    seen[text] = true
    lines.push({ id: 'done-' + id, text: text })
  }

  const eventLines = buildEventLines(events, currentId)
  if (eventLines.length) {
    for (let index = 0; index < eventLines.length; index += 1) lines.push(eventLines[index])
  } else if (currentStatus === 'running' || currentStatus === 'queued' || currentStatus === 'pending') {
    if (AGENT_NODES[currentId]) {
      const attempt = Number((byId[currentId] && byId[currentId].attempt) || 1)
      lines.push({
        id: 'call-' + currentId,
        text: formatCallLine(attempt, callAction(currentId))
      })
    } else if (currentId) {
      lines.push({ id: 'run-' + currentId, text: processText(currentId) })
    }
  } else if (currentStatus === 'completed' && currentId) {
    lines.push({ id: 'done-' + currentId, text: processText(currentId) })
  }

  const thinking =
    currentStatus === 'running' ||
    currentStatus === 'queued' ||
    currentStatus === 'pending' ||
    (status && status !== 'completed' && status !== 'failed' && status !== 'cancelled' && status !== 'reviewed')

  return {
    title: phase.title,
    currentNodeId: currentId,
    currentLabel: NODE_LABELS[currentId] || currentId,
    lines: lines,
    thinking: Boolean(thinking)
  }
}
