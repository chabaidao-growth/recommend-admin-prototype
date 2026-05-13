import type {
  AdminState,
  AudienceSegment,
  Combination,
  DashboardMetric,
  Plan,
  PreviewResult,
  Product,
  Strategy,
  StoreLocation,
} from './types'

const NOW = '2026-04-15T12:00:00+08:00'

export function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

export function formatDate(value: string) {
  const date = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return value
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

export function productMap(state: AdminState) {
  return Object.fromEntries(state.products.map((item) => [item.id, item]))
}

export function strategyMap(state: AdminState) {
  return Object.fromEntries(state.strategies.map((item) => [item.id, item]))
}

export function poolMap(state: AdminState) {
  return Object.fromEntries(state.pools.map((item) => [item.id, item]))
}

export function combinationMap(state: AdminState) {
  return Object.fromEntries(state.combinations.map((item) => [item.id, item]))
}

export function getPoolProducts(state: AdminState, poolId: string) {
  const pool = state.pools.find((item) => item.id === poolId)
  if (!pool) return []

  const productsById = productMap(state)
  return pool.productIds
    .map((id) => productsById[id])
    .filter((item): item is Product => Boolean(item))
}

export function getStrategyProducts(state: AdminState, strategy: Strategy) {
  const base = getPoolProducts(state, strategy.poolId).filter((product) =>
    strategy.filterUnavailable ? product.status === 'ACTIVE' : true,
  )

  if (strategy.mode === 'HOT') {
    return [...base].sort((left, right) => left.salesRank - right.salesRank)
  }

  if (strategy.mode === 'NEW') {
    return [...base].sort((left, right) => left.launchRank - right.launchRank)
  }

  const productsById = productMap(state)
  return strategy.manualProductIds
    .map((id) => productsById[id])
    .filter((item): item is Product => Boolean(item) && item.status === 'ACTIVE')
}

export function getStrategyReferences(state: AdminState, strategyId: string) {
  return state.combinations
    .filter((combination) => combination.slots.some((slot) => slot.strategyId === strategyId))
    .map((combination) => ({ id: combination.id, name: combination.name }))
}

export function getPoolReferences(state: AdminState, poolId: string) {
  return state.strategies.filter((strategy) => strategy.poolId === poolId)
}

export function getPlanReferences(state: AdminState, combinationId: string) {
  return state.plans.filter((plan) => plan.combinationId === combinationId)
}

export function estimateCombinationCoverage(state: AdminState, combination: Combination) {
  const candidates = new Set<string>()
  combination.slots.forEach((slot) => {
    const strategy = state.strategies.find((item) => item.id === slot.strategyId)
    if (!strategy) return
    getStrategyProducts(state, strategy).forEach((product) => candidates.add(product.id))
  })
  return candidates.size
}

export function detectStrategyCycle(
  state: AdminState,
  strategyId: string,
  fallbackStrategyId: string | null,
) {
  if (!fallbackStrategyId) return null

  const strategiesById = strategyMap(state)
  const visited = new Set<string>([strategyId])
  const path = [strategyId]
  let current: string | null = fallbackStrategyId

  while (current) {
    path.push(current)
    if (visited.has(current)) {
      const strategyNames = path
        .map((id) => strategiesById[id]?.name ?? id)
        .filter(Boolean)
      return `检测到循环引用：${strategyNames.join(' → ')}`
    }
    visited.add(current)
    current = strategiesById[current]?.fallbackStrategyId ?? null
  }

  return null
}

export function getStoreScopeLabel(plan: Plan, stores: StoreLocation[]) {
  if (plan.storeScope.type === 'ALL') return '全部门店'
  if (plan.storeScope.type === 'REGION') return `${plan.storeScope.regionIds.length} 个区域`

  const names = stores
    .filter((store) => plan.storeScope.storeIds.includes(store.id))
    .map((store) => store.name)
  return names.length <= 1 ? names[0] ?? '指定门店' : `${names.length} 家门店`
}

export function getTimeStatus(plan: Plan) {
  const now = new Date(NOW).getTime()
  const start = new Date(plan.startAt).getTime()
  const end = new Date(plan.endAt).getTime()

  if (plan.status === 'PAUSED') return '已暂停'
  if (plan.status === 'DRAFT') return '草稿'
  if (plan.status === 'ENDED' || end < now) return '已结束'
  if (start <= now && end >= now && plan.status === 'PUBLISHED') return '投放中'
  return '待生效'
}

function storeIdsForPlan(plan: Plan, stores: StoreLocation[]) {
  if (plan.storeScope.type === 'ALL') return stores.map((store) => store.id)
  if (plan.storeScope.type === 'REGION') {
    return stores
      .filter((store) => plan.storeScope.regionIds.includes(store.region))
      .map((store) => store.id)
  }
  return plan.storeScope.storeIds
}

export function findPlanConflicts(state: AdminState, plan: Plan) {
  const currentStores = new Set(storeIdsForPlan(plan, state.stores))
  const start = new Date(plan.startAt).getTime()
  const end = new Date(plan.endAt).getTime()

  return state.plans.filter((candidate) => {
    if (candidate.id === plan.id) return false
    if (candidate.priority !== plan.priority) return false
    if (candidate.status === 'ENDED') return false

    const candidateStart = new Date(candidate.startAt).getTime()
    const candidateEnd = new Date(candidate.endAt).getTime()
    const overlap = start <= candidateEnd && end >= candidateStart
    if (!overlap) return false

    return storeIdsForPlan(candidate, state.stores).some((storeId) => currentStores.has(storeId))
  })
}

function hashString(value: string) {
  return value.split('').reduce((accumulator, char) => accumulator * 31 + char.charCodeAt(0), 7)
}

export function inferSegments(state: AdminState, userId: string) {
  const score = Math.abs(hashString(userId))
  const picked: AudienceSegment[] = []

  if (score % 2 === 0) picked.push(state.segments.find((item) => item.id === 'seg-high')!)
  if (score % 3 === 0) picked.push(state.segments.find((item) => item.id === 'seg-new')!)
  if (score % 5 === 0) picked.push(state.segments.find((item) => item.id === 'seg-sleep')!)
  if (score % 7 === 0 || /coffee/i.test(userId)) {
    picked.push(state.segments.find((item) => item.id === 'seg-coffee')!)
  }

  return picked.filter(Boolean)
}

function planMatchesAudience(plan: Plan, segments: AudienceSegment[]) {
  if (plan.audienceScope.type === 'ALL') return true
  const current = new Set(segments.map((segment) => segment.id))
  return plan.audienceScope.segmentIds.some((segmentId) => current.has(segmentId))
}

function planMatchesStore(plan: Plan, storeId: string, stores: StoreLocation[]) {
  return storeIdsForPlan(plan, stores).includes(storeId)
}

function assignAbGroup(plan: Plan, userId: string) {
  if (!plan.abTest.enabled) return null
  const groups = plan.abTest.groups
  const point = Math.abs(hashString(`${plan.id}:${userId}`)) % 100
  let cursor = 0

  for (const group of groups) {
    cursor += group.traffic
    if (point < cursor) return group.name
  }

  return groups[groups.length - 1]?.name ?? null
}

function pickProductFromStrategy(
  state: AdminState,
  strategy: Strategy,
  seen: Set<string>,
  _lastCategory: string | null,
  _streak: number,
) {
  const chain = [strategy]

  let current: Strategy | undefined = strategy
  while (current?.fallbackStrategyId) {
    const fallback = state.strategies.find((item) => item.id === current?.fallbackStrategyId)
    if (!fallback) break
    chain.push(fallback)
    current = fallback
  }

  for (const currentStrategy of chain) {
    const ranked = getStrategyProducts(state, currentStrategy)
    for (let index = 0; index < ranked.length; index += 1) {
      const product = ranked[index]
      if (seen.has(product.id)) continue
      return {
        product,
        rank: index + 1,
        fallbackUsed: currentStrategy.id !== strategy.id,
        strategyName: currentStrategy.name,
      }
    }
  }

  return {
    product: null,
    rank: null,
    fallbackUsed: false,
    strategyName: strategy.name,
  }
}

function buildMissedDiagnosis(
  state: AdminState,
  storeId: string,
  segments: import('./types').AudienceSegment[],
) {
  const statusLabel: Record<string, string> = {
    DRAFT: '草稿',
    PAUSED: '已暂停',
    PUBLISHED: '已发布',
    ENDED: '已结束',
  }

  return state.plans
    .filter((plan) => plan.status !== 'ENDED')
    .map((plan) => {
      const reasons: string[] = []

      if (plan.status === 'DRAFT') reasons.push('计划处于草稿状态')
      if (plan.status === 'PAUSED') reasons.push('计划已暂停')

      const now = new Date(NOW).getTime()
      const start = new Date(plan.startAt).getTime()
      const end = new Date(plan.endAt).getTime()
      if (plan.status === 'PUBLISHED' && start > now) reasons.push('投放时间未到达')
      if (plan.status === 'PUBLISHED' && end < now) reasons.push('投放时间已过期')

      const planStores = storeIdsForPlan(plan, state.stores)
      if (!planStores.includes(storeId)) {
        if (plan.storeScope.type === 'REGION') reasons.push('门店范围不匹配（区域限制）')
        else if (plan.storeScope.type === 'STORE') reasons.push('门店范围不匹配（指定门店）')
        else reasons.push('门店范围不匹配')
      }

      if (plan.audienceScope.type === 'SEGMENT') {
        const currentIds = new Set(segments.map((s) => s.id))
        const matched = plan.audienceScope.segmentIds.some((id) => currentIds.has(id))
        if (!matched) reasons.push('人群 Segment 不匹配')
      }

      if (!plan.combinationId) reasons.push('未绑定策略组合')

      return {
        planId: plan.id,
        planName: plan.name,
        status: statusLabel[plan.status] ?? plan.status,
        reasons,
      }
    })
    .filter((item) => item.reasons.length > 0)
}

function buildFallbackSlots(
  state: AdminState,
  slotId?: string,
): import('./types').PreviewSlotResult[] {
  const hotStrategy = state.strategies.find((s) => s.id === 'strategy-hot-all')
  if (!hotStrategy) {
    return [{
      slotId: 'fallback-empty',
      slotIndex: 1,
      product: null,
      strategyId: null,
      strategyName: '兜底策略',
      poolId: null,
      rank: null,
      fallbackUsed: false,
      reason: '无可用兜底策略',
      skipReasons: [],
    }]
  }

  const ranked = getStrategyProducts(state, hotStrategy).slice(0, 4)
  const slotName = slotId
    ? `资源位 ${slotId}`
    : '热销兜底'
  return ranked.map((product, index) => ({
    slotId: `fallback-${slotId ?? 'default'}-${index}`,
    slotIndex: index + 1,
    product,
    strategyId: hotStrategy.id,
    strategyName: slotName,
    poolId: hotStrategy.poolId,
    rank: index + 1,
    fallbackUsed: false,
    reason: `${hotStrategy.name} 第 ${index + 1} 名`,
    skipReasons: [],
  }))
}

export function simulatePreview(
  state: AdminState,
  storeId: string,
  userId: string,
  slotId?: string,
): PreviewResult {
  const store = state.stores.find((item) => item.id === storeId) ?? null
  const segments = inferSegments(state, userId)

  // Debug: trace filter steps
  console.log('[Preview] NOW =', NOW, 'storeId =', storeId, 'userId =', userId, 'slotId =', slotId)
  state.plans.filter((p) => p.status !== 'ENDED').forEach((plan) => {
    const timeOk = getTimeStatus(plan) === '投放中'
    const slotOk = !slotId || (plan.slotIds ?? []).includes(slotId)
    const storeOk = planMatchesStore(plan, storeId, state.stores)
    const audienceOk = planMatchesAudience(plan, segments)
    console.log(`[Preview] plan="${plan.name}" time=${timeOk} slot=${slotOk} store=${storeOk} audience=${audienceOk} slotIds=${JSON.stringify(plan.slotIds)}`)
  })

  const eligiblePlans = state.plans
    .filter((plan) => getTimeStatus(plan) === '投放中')
    .filter((plan) => !slotId || (plan.slotIds ?? []).includes(slotId))
    .filter((plan) => planMatchesStore(plan, storeId, state.stores))
    .filter((plan) => planMatchesAudience(plan, segments))
    .sort((left, right) => (right.priority ?? -1) - (left.priority ?? -1))

  console.log('[Preview] eligiblePlans =', eligiblePlans.map((p) => p.name))

  const plan = eligiblePlans[0] ?? null
  if (!plan || !plan.combinationId) {
    const missedPlans = buildMissedDiagnosis(state, storeId, segments)
    const fallbackSlots = buildFallbackSlots(state, slotId)
    return {
      plan: null,
      groupName: null,
      store,
      inferredSegments: segments,
      slots: fallbackSlots,
      technicalTrace: [],
      missReason: '未命中任何有效投放计划，可能是门店范围、人群范围或生效时间未满足。',
      missedPlans,
      isFallback: true,
    }
  }

  const combination = state.combinations.find((item) => item.id === plan.combinationId)
  if (!combination) {
    const missedPlans = buildMissedDiagnosis(state, storeId, segments)
    const fallbackSlots = buildFallbackSlots(state, slotId)
    return {
      plan: null,
      groupName: null,
      store,
      inferredSegments: segments,
      slots: fallbackSlots,
      technicalTrace: [],
      missReason: '命中计划缺少对应策略组合。',
      missedPlans,
      isFallback: true,
    }
  }

  const seen = new Set<string>()
  let lastCategory: string | null = null
  let streak = 0
  const slots = combination.slots.map((slot, slotIndex) => {
    const strategy = state.strategies.find((item) => item.id === slot.strategyId)
    if (!strategy) {
      return {
        slotId: slot.id,
        slotIndex: slotIndex + 1,
        product: null,
        strategyId: null,
        strategyName: '未绑定策略',
        poolId: null,
        rank: null,
        fallbackUsed: false,
        reason: '当前坑位未绑定策略',
        skipReasons: [],
      }
    }

    const picked = pickProductFromStrategy(
      state,
      strategy,
      seen,
      lastCategory,
      streak,
    )

    if (picked.product) {
      seen.add(picked.product.id)
      if (picked.product.category === lastCategory) {
        streak += 1
      } else {
        lastCategory = picked.product.category
        streak = 1
      }
    }

    const skipReasons = getStrategyProducts(state, strategy)
      .filter((product) => seen.has(product.id) && product.id !== picked.product?.id)
      .map((product) => `${product.name}：去重跳过`)

    return {
      slotId: slot.id,
      slotIndex: slotIndex + 1,
      product: picked.product,
      strategyId: strategy.id,
      strategyName: picked.strategyName,
      poolId: strategy.poolId,
      rank: picked.rank,
      fallbackUsed: picked.fallbackUsed,
      reason: picked.product
        ? `${picked.strategyName} 第 ${picked.rank} 名`
        : '候选商品耗尽，未返回商品',
      skipReasons,
    }
  })

  const technicalTrace = slots.map((slot) => ({
    slot_id: slot.slotId,
    strategy_id: slot.strategyId,
    pool_id: slot.poolId,
    rank: slot.rank,
    skip_count: slot.skipReasons.length,
    fallback_used: slot.fallbackUsed,
    latency_ms: 11 + slot.slotIndex * 4,
  }))

  return {
    plan,
    groupName: assignAbGroup(plan, userId),
    store,
    inferredSegments: segments,
    slots,
    technicalTrace,
  }
}

export function getMetricSummary(state: AdminState, metric: DashboardMetric, planIds: string[], storeIds: string[]) {
  const filtered = state.dashboardSeries.filter((point) => {
    const planMatch = !planIds.length || planIds.includes(point.planId)
    const storeMatch = !storeIds.length || storeIds.includes(point.storeId)
    return planMatch && storeMatch
  })

  const values = filtered
    .map((point) => point[metric])
    .filter((v): v is number => v != null && !Number.isNaN(v))
  const average =
    values.reduce((total, current) => total + current, 0) / Math.max(values.length, 1)
  const trendBase = values.slice(0, Math.max(1, Math.floor(values.length / 2)))
  const trendHead = values.slice(Math.max(1, Math.floor(values.length / 2)))
  const previous =
    trendBase.reduce((total, current) => total + current, 0) / Math.max(trendBase.length, 1)
  const current =
    trendHead.reduce((total, value) => total + value, 0) / Math.max(trendHead.length, 1)

  return {
    value: average,
    delta: current - previous,
  }
}

export function getDashboardSeries(
  state: AdminState,
  metric: DashboardMetric,
  planIds: string[],
  storeIds: string[],
) {
  const filtered = state.dashboardSeries.filter((point) => {
    const planMatch = !planIds.length || planIds.includes(point.planId)
    const storeMatch = !storeIds.length || storeIds.includes(point.storeId)
    return planMatch && storeMatch && point.group === '全部流量'
  })

  return filtered.reduce<Array<Record<string, string | number>>>((accumulator, point) => {
    const value = point[metric]
    if (value == null || Number.isNaN(value)) return accumulator

    const row = accumulator.find((item) => item.date === point.date)
    const plan = state.plans.find((item) => item.id === point.planId)
    const key = plan?.name ?? point.planId
    if (row) {
      row[key] = Number(value.toFixed(metric === 'exposure' ? 0 : 2))
      return accumulator
    }

    accumulator.push({
      date: point.date,
      [key]: Number(value.toFixed(metric === 'exposure' ? 0 : 2)),
    })
    return accumulator
  }, [])
}

export function getAbTestTable(state: AdminState, planIds: string[]) {
  return state.plans
    .filter((plan) => !planIds.length || planIds.includes(plan.id))
    .filter((plan) => plan.abTest.enabled)
    .flatMap((plan) =>
      plan.abTest.groups.map((group, index) => ({
        id: `${plan.id}-${group.id}`,
        planName: plan.name,
        name: group.name,
        ctr: (9.2 + index * 0.7).toFixed(2),
        cvr: (3.1 - index * 0.2).toFixed(2),
        exposure: 10234 + index * 640,
        significance: index === 0 ? '基线' : '95% 显著',
      })),
    )
}
