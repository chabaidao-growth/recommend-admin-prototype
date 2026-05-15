import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react'
import { createId } from './domain'
import { initialState } from './mockData'
import type {
  AdminState,
  Combination,
  Pool,
  Role,
  Strategy,
  User,
} from './types'

interface AdminStoreValue {
  state: AdminState
  createPool: () => string
  updatePool: (poolId: string, next: Pool) => void
  deletePool: (poolId: string) => void
  createStrategy: () => string
  updateStrategy: (strategyId: string, next: Strategy) => void
  copyStrategy: (strategyId: string) => string | null
  deleteStrategy: (strategyId: string) => void
  createCombination: () => string
  updateCombination: (combinationId: string, next: Combination) => void
  copyCombination: (combinationId: string) => string | null
  deleteCombination: (combinationId: string) => void
  createRole: () => string
  updateRole: (roleId: string, next: Role) => void
  deleteRole: (roleId: string) => void
  createUser: () => string
  updateUser: (userId: string, next: User) => void
  deleteUser: (userId: string) => void
}

export const CURRENT_USER = '陈悦'
export const CURRENT_USER_ROLE: 'SUPER_ADMIN' | 'CUSTOM' = 'SUPER_ADMIN'

export function isSuperAdmin(): boolean {
  return CURRENT_USER_ROLE === 'SUPER_ADMIN'
}

export function canEditEntity(entity: { createdBy: string }): boolean {
  return entity.createdBy === CURRENT_USER || isSuperAdmin()
}

const STORAGE_KEY = 'recommend-admin-store'
const VERSION_KEY = 'recommend-admin-data-version'
const DATA_VERSION = '20260515v2'
const AdminStoreContext = createContext<AdminStoreValue | null>(null)

function replaceItem<T extends { id: string }>(items: T[], next: T) {
  return items.map((item) => (item.id === next.id ? next : item))
}

export function AdminStoreProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AdminState>(() => {
    const cached = localStorage.getItem(STORAGE_KEY)
    const cachedVersion = localStorage.getItem(VERSION_KEY)
    if (!cached || cachedVersion !== DATA_VERSION) return initialState
    try {
      const parsed = JSON.parse(cached) as AdminState
      if (
        (parsed.pools?.[0] && !('createdBy' in parsed.pools[0])) ||
        (parsed.strategies?.[0] && !('createdBy' in parsed.strategies[0])) ||
        (parsed.strategies?.[0] && !('kind' in parsed.strategies[0])) ||
        (parsed.strategies?.[0] && !('status' in parsed.strategies[0])) ||
        (parsed.strategies?.[0] && !('description' in parsed.strategies[0])) ||
        (parsed.pools?.[0] && !('productAddedTimes' in parsed.pools[0])) ||
        (parsed.strategies?.[0] && !('salesDataSource' in parsed.strategies[0])) ||
        (parsed.strategies?.[0] && !('tag' in parsed.strategies[0])) ||
        !parsed.users ||
        !parsed.roles ||
        (parsed.users?.[0] && !('roleIds' in parsed.users[0])) ||
        (parsed.combinations?.[0] && !('slotCount' in parsed.combinations[0]))
      ) {
        return initialState
      }
      return parsed
    } catch {
      return initialState
    }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    localStorage.setItem(VERSION_KEY, DATA_VERSION)
  }, [state])

  const value: AdminStoreValue = {
    state,
    createPool() {
      const id = createId('pool')
      const next: Pool = {
        id,
        name: `新建选品池 ${state.pools.length}`,
        description: '',
        status: 'ACTIVE',
        createdAt: '2026-03-16 10:00',
        createdBy: '陈悦',
        updatedAt: null,
        updatedBy: null,
        productIds: [],
        productAddedTimes: {},
        kind: 'CUSTOM',
      }
      setState((current) => ({ ...current, pools: [...current.pools, next] }))
      return id
    },
    updatePool(poolId, next) {
      setState((current) => ({
        ...current,
        pools: replaceItem(
          current.pools,
          poolId === next.id ? next : { ...next, id: poolId },
        ),
      }))
    },
    deletePool(poolId) {
      setState((current) => ({
        ...current,
        pools: current.pools.filter((item) => item.id !== poolId),
      }))
    },
    createStrategy() {
      const id = createId('strategy')
      const allPool = state.pools.find((item) => item.id === 'pool-all') ?? state.pools[0]
      const next: Strategy = {
        id,
        name: '',
        description: '',
        poolId: allPool.id,
        mode: 'HOT',
        status: 'ACTIVE',
        sortDimension: 'SALES_COUNT',
        timeWindow: '7D',
        fallbackStrategyId: 'strategy-hot-all',
        salesDataSource: 'STORE',
        createdAt: '2026-03-16 10:05',
        createdBy: CURRENT_USER,
        manualProductIds: [],
        filterUnavailable: true,
        kind: 'CUSTOM',
        tag: '',
        imageUrl: '',
      }
      setState((current) => ({ ...current, strategies: [...current.strategies, next] }))
      return id
    },
    updateStrategy(strategyId, next) {
      setState((current) => ({
        ...current,
        strategies: replaceItem(
          current.strategies,
          strategyId === next.id ? next : { ...next, id: strategyId },
        ),
      }))
    },
    copyStrategy(strategyId) {
      const strategy = state.strategies.find((item) => item.id === strategyId)
      if (!strategy) return null
      const id = createId('strategy')
      const next: Strategy = {
        ...strategy,
        id,
        name: `${strategy.name} - 副本`,
        createdAt: '2026-03-16 10:15',
        createdBy: CURRENT_USER,
        manualProductIds: [...strategy.manualProductIds],
        kind: 'CUSTOM',
      }
      setState((current) => ({ ...current, strategies: [...current.strategies, next] }))
      return id
    },
    deleteStrategy(strategyId) {
      const target = state.strategies.find((item) => item.id === strategyId)
      if (target?.kind === 'SYSTEM') return
      setState((current) => ({
        ...current,
        strategies: current.strategies.filter((item) => item.id !== strategyId),
      }))
    },
    createCombination() {
      const maxN = state.combinations.reduce((max, c) => {
        const m = c.id.match(/^comb-(\d+)$/)
        return m ? Math.max(max, Number(m[1])) : max
      }, 0)
      const id = `comb-${maxN + 1}`
      const next: Combination = {
        id,
        name: '',
        status: 'ACTIVE',
        createdAt: '2026-03-16 10:20',
        createdBy: CURRENT_USER,
        slotCount: 6,
        categoryLimit: null,  // 已废弃
        sessionDedup: true,
        slots: Array.from({ length: 6 }, () => ({ id: createId('slot'), strategyId: null as string | null })),
      }
      setState((current) => ({
        ...current,
        combinations: [...current.combinations, next],
      }))
      return id
    },
    updateCombination(combinationId, next) {
      setState((current) => ({
        ...current,
        combinations: replaceItem(
          current.combinations,
          combinationId === next.id ? next : { ...next, id: combinationId },
        ),
      }))
    },
    copyCombination(combinationId) {
      const combination = state.combinations.find((item) => item.id === combinationId)
      if (!combination) return null
      const id = createId('comb')
      const next: Combination = {
        ...combination,
        id,
        name: `${combination.name} - 副本`,
        status: 'INACTIVE',
        createdAt: '2026-03-16 10:30',
        slots: combination.slots.map((slot) => ({ ...slot, id: createId('slot') })),
      }
      setState((current) => ({
        ...current,
        combinations: [...current.combinations, next],
      }))
      return id
    },
    deleteCombination(combinationId) {
      setState((current) => ({
        ...current,
        combinations: current.combinations.filter((item) => item.id !== combinationId),
      }))
    },
    createRole() {
      const id = createId('role')
      const next: Role = {
        id,
        name: `新建角色 ${state.roles.length}`,
        code: 'CUSTOM',
        description: '',
        permissions: [],
        createdAt: '2026-04-20 10:00',
        createdBy: CURRENT_USER,
        kind: 'CUSTOM',
      }
      setState((current) => ({ ...current, roles: [...current.roles, next] }))
      return id
    },
    updateRole(roleId, next) {
      setState((current) => ({
        ...current,
        roles: replaceItem(
          current.roles,
          roleId === next.id ? next : { ...next, id: roleId },
        ),
      }))
    },
    deleteRole(roleId) {
      const target = state.roles.find((item) => item.id === roleId)
      if (target?.kind === 'SYSTEM') return
      setState((current) => ({
        ...current,
        roles: current.roles.filter((item) => item.id !== roleId),
      }))
    },
    createUser() {
      const id = createId('user')
      const defaultRoleId = state.roles.find((r) => r.id === 'role-operator')?.id ?? state.roles[0]?.id
      const next: User = {
        id,
        username: '',
        displayName: '',
        email: '',
        phone: '',
        roleIds: defaultRoleId ? [defaultRoleId] : [],
        status: 'ACTIVE',
        lastLoginAt: null,
        createdAt: '2026-04-20 10:00',
        createdBy: CURRENT_USER,
      }
      setState((current) => ({ ...current, users: [...current.users, next] }))
      return id
    },
    updateUser(userId, next) {
      setState((current) => ({
        ...current,
        users: replaceItem(
          current.users,
          userId === next.id ? next : { ...next, id: userId },
        ),
      }))
    },
    deleteUser(userId) {
      setState((current) => ({
        ...current,
        users: current.users.filter((item) => item.id !== userId),
      }))
    },
  }

  return (
    <AdminStoreContext.Provider value={value}>
      {children}
    </AdminStoreContext.Provider>
  )
}

export function useAdminStore() {
  const context = useContext(AdminStoreContext)
  if (!context) {
    throw new Error('useAdminStore must be used within AdminStoreProvider')
  }
  return context
}
