export type ProductStatus = 'ACTIVE' | 'INACTIVE'
export type PoolStatus = 'ACTIVE' | 'INACTIVE'
export type StrategyMode = 'HOT' | 'NEW' | 'MANUAL' | 'ALGORITHM'
export type CombinationStatus = 'ACTIVE' | 'INACTIVE'
export type PlanStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'ENDED'
export type StoreScopeType = 'ALL' | 'REGION' | 'STORE'
export type AudienceScopeType = 'ALL' | 'SEGMENT'
export type DashboardMetric = 'ctr' | 'cvr' | 'exposure'

export const BEVERAGE_CATEGORIES = [
  '原味奶茶', '奶绿', '鲜果茶', '果咖', '纯茶', '鲜奶茶', '奶昔',
] as const

export function isBeverage(product: Product): boolean {
  return BEVERAGE_CATEGORIES.includes(product.category as any)
}

export interface Product {
  id: string
  spuId: string
  name: string
  category: string
  price: number
  status: ProductStatus
  salesRank: number
  launchRank: number
  accent: string
}

export interface Pool {
  id: string
  name: string
  description: string
  status: PoolStatus
  createdAt: string
  createdBy: string
  updatedAt: string | null
  updatedBy: string | null
  productIds: string[]
  productAddedTimes: Record<string, string>
  kind: 'SYSTEM' | 'CUSTOM'
}

export interface Strategy {
  id: string
  name: string
  description: string
  poolId: string
  mode: StrategyMode
  status: 'ACTIVE' | 'INACTIVE'
  sortDimension: 'SALES_COUNT' | 'SALES_AMOUNT'
  timeWindow: '7D' | '14D' | '30D'
  fallbackStrategyId: string | null
  salesDataSource: 'NATIONAL' | 'STORE'
  createdAt: string
  createdBy: string
  manualProductIds: string[]
  filterUnavailable: boolean
  kind: 'SYSTEM' | 'CUSTOM'
  tag: string
  imageUrl: string
  manualBoostItems?: ManualBoostItem[]
  manualBoostEnabled?: boolean
}

export interface ManualBoostItem {
  id: string
  productId: string
  weight: number
  startAt: string
  endAt: string
  permanent?: boolean
}

export interface CombinationSlot {
  id: string
  strategyId: string | null
}

export interface Combination {
  id: string
  name: string
  status: CombinationStatus
  createdAt: string
  createdBy: string
  slotCount: number
  slots: CombinationSlot[]
  categoryLimit?: number | null  // 已废弃，保留兼容
  sessionDedup: boolean
}

export interface AbTestGroup {
  id: string
  name: string
  vid: string
  traffic: number
}

export interface Plan {
  id: string
  name: string
  createdBy: string
  status: PlanStatus
  priority: number | undefined
  startAt: string
  endAt: string
  scene: 'ORDER_RECOMMEND'
  combinationId: string | null
  version: number
  storeScope: {
    type: StoreScopeType
    regionIds: string[]
    storeIds: string[]
  }
  audienceScope: {
    type: AudienceScopeType
    segmentIds: string[]
  }
  abTest: {
    enabled: boolean
    experimentKey: string
    groups: AbTestGroup[]
  }
  slotIds?: string[]
}

export interface StoreLocation {
  id: string
  name: string
  region: string
}

export interface AudienceSegment {
  id: string
  name: string
  description: string
}

export interface DashboardPoint {
  date: string
  planId: string
  storeId: string
  group: string
  ctr: number
  cvr: number
  exposure: number
}

export interface AdminState {
  products: Product[]
  pools: Pool[]
  strategies: Strategy[]
  combinations: Combination[]
  plans: Plan[]
  stores: StoreLocation[]
  segments: AudienceSegment[]
  storeGroups: Record<string, string[]>
  dashboardSeries: DashboardPoint[]
  roles: Role[]
  users: User[]
}

export type RoleCode = 'SUPER_ADMIN' | 'CUSTOM'
export type UserStatus = 'ACTIVE' | 'DISABLED'

export interface Role {
  id: string
  name: string
  code: RoleCode
  description: string
  permissions: string[]
  createdAt: string
  createdBy: string
  kind?: 'SYSTEM' | 'CUSTOM'
}

export interface User {
  id: string
  username: string
  displayName: string
  email: string
  phone: string
  roleIds: string[]
  status: UserStatus
  lastLoginAt: string | null
  createdAt: string
  createdBy: string
  employeeId?: string
  jobTitle?: string
  department?: string
  reportsTo?: string
  remark?: string
}

export interface FeilianProfile {
  displayName: string
  employeeId: string
  username: string
  phone: string
  email: string
  jobTitle: string
  department: string
  reportsTo: string
}

export interface PreviewSlotResult {
  slotId: string
  slotIndex: number
  product: Product | null
  strategyId: string | null
  strategyName: string
  poolId: string | null
  rank: number | null
  fallbackUsed: boolean
  reason: string
  skipReasons: string[]
}

export interface MissedPlanDiagnosis {
  planId: string
  planName: string
  status: string
  reasons: string[]
}

export interface PreviewResult {
  plan: Plan | null
  groupName: string | null
  store: StoreLocation | null
  inferredSegments: AudienceSegment[]
  slots: PreviewSlotResult[]
  technicalTrace: Array<Record<string, string | number | boolean | null>>
  missReason?: string
  missedPlans?: MissedPlanDiagnosis[]
  isFallback?: boolean
}
