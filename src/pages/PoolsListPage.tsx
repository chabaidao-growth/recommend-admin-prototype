import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Dropdown,
  Empty,
  Flex,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  DeleteOutlined,
  EditOutlined,
  MoreOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { canEditEntity, useAdminStore } from '../lib/store'
import type { Pool } from '../lib/types'
import { formatDate } from '../lib/domain'

const { Title, Text } = Typography

interface PoolRow {
  key: string
  id: string
  name: string
  description: string
  kind: Pool['kind']
  status: Pool['status']
  productCount: number
  createdBy: string
  createdAt: string
  updatedAt: string
  updatedBy: string
}

export function PoolsListPage() {
  const navigate = useNavigate()
  const { state, createPool, updatePool, deletePool } = useAdminStore()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [kindFilter, setKindFilter] = useState('ALL')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const dataSource = useMemo(() => {
    const keyword = debouncedQuery.trim().toLowerCase()
    const filtered = state.pools.filter((pool) => {
      if (keyword && !pool.name.toLowerCase().includes(keyword)) return false
      if (statusFilter !== 'ALL' && pool.status !== statusFilter) return false
      if (kindFilter !== 'ALL' && pool.kind !== kindFilter) return false
      return true
    })
    // 系统置顶 + 创建时间倒序
    return filtered.sort((a, b) => {
      if (a.kind === 'SYSTEM' && b.kind !== 'SYSTEM') return -1
      if (a.kind !== 'SYSTEM' && b.kind === 'SYSTEM') return 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }).map((pool) => ({
      key: pool.id,
      id: pool.id,
      name: pool.name,
      description: pool.description,
      kind: pool.kind,
      status: pool.status,
      productCount: pool.productIds.length,
      createdBy: pool.createdBy,
      createdAt: pool.createdAt,
      updatedAt: pool.updatedAt ? formatDate(pool.updatedAt) : '-',
      updatedBy: pool.updatedBy ?? '-',
    }))
  }, [state.pools, debouncedQuery, statusFilter, kindFilter])

  function handleToggleStatus(record: PoolRow) {
    if (record.kind === 'SYSTEM') return
    const pool = state.pools.find((p) => p.id === record.id)
    if (!pool) return
    const next = pool.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    if (next === 'INACTIVE') {
      const activeStrategies = state.strategies.filter((s) => s.poolId === pool.id && s.status === 'ACTIVE')
      if (activeStrategies.length > 0) {
        Modal.warning({
          title: '无法停用',
          content: `以下策略仍在启用中，请先停用后再停用选品池：${activeStrategies.map((s) => s.name).join('、')}`,
        })
        return
      }
    }
    updatePool(pool.id, { ...pool, status: next })
  }

  function handleDelete(record: PoolRow) {
    const pool = state.pools.find((p) => p.id === record.id)
    if (!pool) return
    Modal.confirm({
      title: '确认删除',
      content: `确认删除选品池「${pool.name}」吗？删除后不可恢复。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => deletePool(pool.id),
    })
  }

  const columns: ColumnsType<PoolRow> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record) => (
        <Space direction="vertical" size={0}>
          <Button type="link" style={{ padding: 0 }} onClick={() => navigate(`/pools/${record.id}`)}>
            <Text strong>{name}</Text>
          </Button>
          <Text type="secondary" style={{ fontSize: 12 }} ellipsis={{ tooltip: record.description }}>
            {record.description || '—'}
          </Text>
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'kind',
      key: 'kind',
      width: 100,
      render: (kind: Pool['kind']) => (
        <Tag color={kind === 'SYSTEM' ? 'blue' : 'default'}>{kind === 'SYSTEM' ? '系统' : '自定义'}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (status: Pool['status']) => (
        <Tag color={status === 'ACTIVE' ? 'success' : 'default'}>{status === 'ACTIVE' ? '启用' : '停用'}</Tag>
      ),
    },
    {
      title: '商品数',
      dataIndex: 'productCount',
      key: 'productCount',
      width: 100,
      align: 'right' as const,
      render: (val: number) => String(val),
    },
    {
      title: '创建人',
      dataIndex: 'createdBy',
      key: 'createdBy',
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (val: string) => formatDate(val),
    },
    {
      title: '更新时间',
      key: 'updatedAt',
      width: 160,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>{record.updatedBy}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.updatedAt}</Text>
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => {
        const isSystem = record.kind === 'SYSTEM'
        const canOperate = canEditEntity(record)
        const isActive = record.status === 'ACTIVE'
        return (
          <Space>
            <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate(`/pools/${record.id}`)}>
              查看
            </Button>
            {!isSystem && (
              canOperate ? (
                <Button type="link" size="small" style={{ padding: 0 }} onClick={() => handleToggleStatus(record)}>
                  {isActive ? '停用' : '启用'}
                </Button>
              ) : (
                <Tooltip title="无权限编辑（仅创建人或超管可编辑）">
                  <Button type="link" size="small" style={{ padding: 0 }} disabled>
                    {isActive ? '停用' : '启用'}
                  </Button>
                </Tooltip>
              )
            )}
            {!isSystem && (
              <Dropdown
                menu={{
                  items: [
                    canOperate ? {
                      key: 'edit',
                      label: '编辑',
                      icon: <EditOutlined />,
                      onClick: () => navigate(`/pools/${record.id}`),
                    } : null,
                    {
                      key: 'delete',
                      label: <span style={{ color: 'var(--ant-color-error)' }}>删除</span>,
                      icon: <DeleteOutlined style={{ color: 'var(--ant-color-error)' }} />,
                      disabled: isActive || !canOperate,
                      onClick: () => handleDelete(record),
                    },
                  ].filter(Boolean),
                }}
                trigger={['click']}
              >
                <Button type="text" size="small" icon={<MoreOutlined />} />
              </Dropdown>
            )}
          </Space>
        )
      },
    },
  ]

  return (
    <Flex vertical gap={24}>
      <div>
        <Title level={4} style={{ marginBottom: 4 }}>商品选品池</Title>
        <Text type="secondary">管理可推荐的商品范围</Text>
      </div>

      <Flex justify="space-between" align="center">
        <Space>
          <Input
            placeholder="搜索选品池名称"
            prefix={<SearchOutlined />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            allowClear
            style={{ width: 220 }}
          />
          <Select
            placeholder="状态"
            allowClear
            style={{ width: 120 }}
            value={statusFilter === 'ALL' ? undefined : statusFilter}
            onChange={(v) => setStatusFilter(v || 'ALL')}
            options={[
              { label: '全部', value: 'ALL' },
              { label: '启用', value: 'ACTIVE' },
              { label: '停用', value: 'INACTIVE' },
            ]}
          />
          <Select
            placeholder="类型"
            allowClear
            style={{ width: 130 }}
            value={kindFilter === 'ALL' ? undefined : kindFilter}
            onChange={(v) => setKindFilter(v || 'ALL')}
            options={[
              { label: '全部', value: 'ALL' },
              { label: '系统内置', value: 'SYSTEM' },
              { label: '自定义', value: 'CUSTOM' },
            ]}
          />
          <Button onClick={() => { setQuery(''); setStatusFilter('ALL'); setKindFilter('ALL') }}>
            重置
          </Button>
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            const id = createPool()
            navigate(`/pools/${id}`, { state: { isNew: true } })
          }}
        >
          新建选品池
        </Button>
      </Flex>

      <Table<PoolRow>
        columns={columns}
        dataSource={dataSource}
        pagination={{
          defaultPageSize: 20,
          pageSizeOptions: ['20', '50', '100'],
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        locale={{ emptyText: <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
      />
    </Flex>
  )
}
