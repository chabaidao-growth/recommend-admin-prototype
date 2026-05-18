import {
  CopyOutlined,
  DeleteOutlined,
  MoreOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { Button, Dropdown, Empty, Input, message, Modal, Row, Select, Space, Table, Tag, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  estimateCombinationCoverage,
  formatDate,
} from '../lib/domain'
import { canEditEntity, useAdminStore } from '../lib/store'
import type { Combination } from '../lib/types'

interface CombinationRow {
  key: string
  name: string
  id: string
  status: Combination['status']
  slotCount: number
  coverage: number
  createdAt: string
  createdBy: string
  hasDeletedStrategy: boolean
}

export function CombinationsListPage() {
  const navigate = useNavigate()
  const { state, createCombination, updateCombination, copyCombination, deleteCombination } = useAdminStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)

  const combinations = state.combinations.map((combination) => ({
    combination,
    coverage: estimateCombinationCoverage(state, combination),
  }))

  const filteredCombinations = combinations.filter(({ combination }) => {
    const keyword = search.trim().toLowerCase()
    const matchesSearch =
      keyword.length === 0 ||
      combination.name.toLowerCase().includes(keyword) ||
      combination.id.toLowerCase().includes(keyword)
    const matchesStatus = statusFilter === 'ALL' || combination.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const dataSource: CombinationRow[] = useMemo(() => {
    return filteredCombinations.map(({ combination, coverage }) => {
      const hasDeletedStrategy = combination.slots.some(
        (slot) => slot.strategyId && !state.strategies.some((s) => s.id === slot.strategyId),
      )
      return {
        key: combination.id,
        name: combination.name,
        id: combination.id,
        status: combination.status,
        slotCount: combination.slotCount,
        coverage,
        createdAt: combination.createdAt,
        createdBy: combination.createdBy,
        hasDeletedStrategy,
      }
    })
  }, [filteredCombinations, state.strategies])

  function handleToggleStatus(record: CombinationRow) {
    const combination = state.combinations.find((item) => item.id === record.id)
    if (!combination) return
    const next = combination.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    if (next === 'ACTIVE') {
      const inactiveStrategyNames: string[] = []
      combination.slots.forEach((slot) => {
        const s = state.strategies.find((item) => item.id === slot.strategyId)
        if (!s) {
          inactiveStrategyNames.push('已删除的策略')
        } else if (s.status !== 'ACTIVE') {
          inactiveStrategyNames.push(s.name)
        }
      })
      if (inactiveStrategyNames.length > 0) {
        message.error(`以下策略未启用，无法启用组合：${inactiveStrategyNames.join('、')}`)
        return
      }
    }
    updateCombination(record.id, { ...combination, status: next })
  }

  function handleCopyAndNavigate(id: string) {
    const newId = copyCombination(id)
    if (newId) navigate(`/combinations/${newId}`)
  }

  function handleDelete(record: CombinationRow) {
    Modal.confirm({
      title: '确认删除',
      content: `确认删除策略组合「${record.name}」吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => deleteCombination(record.id),
    })
  }

  const columns: ColumnsType<CombinationRow> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Space>
            <Typography.Text strong>{record.name}</Typography.Text>
            {record.hasDeletedStrategy && <Tag color="error">关联的排序策略已删除</Tag>}
          </Space>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{record.id}</Typography.Text>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: Combination['status']) => (
        <Tag color={status === 'ACTIVE' ? 'success' : 'default'}>
          {status === 'ACTIVE' ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '坑位数',
      key: 'slotCount',
      width: 100,
      align: 'right' as const,
      dataIndex: 'slotCount',
      render: (value: number) => String(value),
    },
    {
      title: '覆盖商品数',
      key: 'coverage',
      width: 120,
      align: 'right' as const,
      dataIndex: 'coverage',
      render: (value: number) => String(value).padStart(2, '0'),
    },
    {
      title: '更新时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (value: string) => formatDate(value),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_, record) => {
        const canOperate = canEditEntity(record)
        const isActive = record.status === 'ACTIVE'
        return (
          <Space>
            <Button
              type="link"
              size="small"
              style={{ padding: 0 }}
              onClick={() => navigate(`/combinations/${record.id}`)}
            >
              查看
            </Button>
            {canOperate ? (
              <Button
                type="link"
                size="small"
                style={{ padding: 0 }}
                onClick={() => handleToggleStatus(record)}
              >
                {record.status === 'ACTIVE' ? '停用' : '启用'}
              </Button>
            ) : (
              <Tooltip title="无权限编辑（仅创建人或超管可编辑）">
                <Button type="link" size="small" style={{ padding: 0 }} disabled>
                  {record.status === 'ACTIVE' ? '停用' : '启用'}
                </Button>
              </Tooltip>
            )}
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'copy',
                    label: '复制',
                    icon: <CopyOutlined />,
                    onClick: () => handleCopyAndNavigate(record.id),
                  },
                  {
                    key: 'delete',
                    label: <span style={{ color: 'var(--ant-color-error)' }}>删除</span>,
                    icon: <DeleteOutlined style={{ color: 'var(--ant-color-error)' }} />,
                    disabled: isActive || !canOperate,
                    onClick: () => handleDelete(record),
                  },
                ],
              }}
              trigger={['click']}
            >
              <Button type="text" size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </Space>
        );
      },
    },
  ]

  return (
    <Space direction="vertical" size="large" style={{ display: 'flex' }}>
      <Space direction="vertical" size={4}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          策略组合
        </Typography.Title>
        <Typography.Text type="secondary">
          管理策略编排与选品逻辑，覆盖全平台推荐场景。
        </Typography.Text>
      </Space>

      <Row justify="space-between" align="middle">
        <Space>
          <Input
            placeholder="搜索名称或编号"
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 200 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            placeholder="状态"
            allowClear
            style={{ width: 100 }}
            value={statusFilter === 'ALL' ? undefined : statusFilter}
            onChange={(v) => setStatusFilter(v || 'ALL')}
            options={[
              { label: '启用', value: 'ACTIVE' },
              { label: '停用', value: 'INACTIVE' },
            ]}
          />
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            const id = createCombination()
            navigate(`/combinations/${id}`, { state: { initialMode: 'edit', isNew: true } })
          }}
        >
          新建策略组合
        </Button>
      </Row>

      <Table<CombinationRow>
        columns={columns}
        dataSource={dataSource}
        pagination={{
          current: currentPage,
          pageSize: 12,
          total: filteredCombinations.length,
          onChange: (page) => setCurrentPage(page),
          showTotal: (total) => `共 ${total} 条`,
        }}
        locale={{ emptyText: <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
      />
    </Space>
  )
}
