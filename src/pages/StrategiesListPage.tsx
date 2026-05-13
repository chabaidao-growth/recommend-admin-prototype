import {
  CopyOutlined,
  DeleteOutlined,
  MoreOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { Button, Dropdown, Empty, Input, Modal, Popover, Row, Select, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDate, getStrategyReferences, poolMap } from '../lib/domain'
import { CURRENT_USER, useAdminStore } from '../lib/store'
import type { Strategy } from '../lib/types'

const modeTag: Record<Strategy['mode'], { color: string; label: string }> = {
  HOT: { color: 'orange', label: '热销模型 Hot' },
  NEW: { color: 'blue', label: '新品曝光 New' },
  MANUAL: { color: 'purple', label: '人工定序 Manual' },
  ALGORITHM: { color: 'geekblue', label: '算法模型 Algorithm' },
}

export function StrategiesListPage() {
  const navigate = useNavigate()
  const { state, createStrategy, copyStrategy, updateStrategy, deleteStrategy } = useAdminStore()
  const pools = poolMap(state)
  const [search, setSearch] = useState('')
  const [modeFilter, setModeFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  const dataSource = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    const filtered = state.strategies
      .filter((s) => !keyword || s.name.toLowerCase().includes(keyword))
      .filter((s) => !modeFilter || s.mode === modeFilter)
      .filter((s) => !statusFilter || s.status === statusFilter)
      .map((strategy) => ({
        ...strategy,
        key: strategy.id,
        references: getStrategyReferences(state, strategy.id),
        poolName: pools[strategy.poolId]?.name ?? '-',
      }))
    // 系统策略置顶
    return filtered.sort((a, b) => {
      if (a.kind === 'SYSTEM' && b.kind !== 'SYSTEM') return -1
      if (a.kind !== 'SYSTEM' && b.kind === 'SYSTEM') return 1
      return 0
    })
  }, [state, pools, search, modeFilter, statusFilter])

  function handleToggleStatus(id: string) {
    const s = state.strategies.find((item) => item.id === id)
    if (!s) return
    updateStrategy(id, { ...s, status: s.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })
  }

  function handleCopyAndNavigate(id: string) {
    const newId = copyStrategy(id)
    if (newId) navigate(`/strategies/${newId}/edit`, { state: { isNew: true } })
  }

  function handleDelete(record: (typeof dataSource)[number]) {
    Modal.confirm({
      title: '确认删除',
      content: `确认删除策略「${record.name}」吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => deleteStrategy(record.id),
    })
  }

  const columns: ColumnsType<(typeof dataSource)[number]> = [
    {
      title: '策略名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record) => (
        <Space>
          <Button type="link" style={{ padding: 0 }} onClick={() => navigate(`/strategies/${record.id}/edit`)}>
            {text}
          </Button>
          {record.kind === 'SYSTEM' && <Tag color="default">系统</Tag>}
        </Space>
      ),
    },
    {
      title: '排序方式',
      dataIndex: 'mode',
      key: 'mode',
      render: (mode: Strategy['mode']) => (
        <Tag color={modeTag[mode].color}>{modeTag[mode].label}</Tag>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: Strategy['status']) => (
        <Tag color={status === 'ACTIVE' ? 'success' : 'default'}>
          {status === 'ACTIVE' ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '引用选品池',
      key: 'pool',
      render: (_, record) => (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate(`/pools/${record.poolId}`)}>
          {record.poolName}
        </Button>
      ),
    },
    {
      title: '被引用',
      key: 'references',
      width: 160,
      render: (_, record) => {
        const refs = record.references as { id: string; name: string }[]
        if (refs.length === 0) return <Typography.Text type="secondary">—</Typography.Text>
        if (refs.length === 1) {
          return (
            <Space size={4}>
              <Tag color="blue">{refs.length}个</Tag>
              <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate(`/combinations/${refs[0].id}`)}>
                {refs[0].name}
              </Button>
            </Space>
          )
        }
        return (
          <Space size={4}>
            <Tag color="blue">{refs.length}个</Tag>
            <Popover
              content={
                <Space direction="vertical" size={4}>
                  {refs.map((ref) => (
                    <Button key={ref.id} type="link" size="small" style={{ padding: 0 }} onClick={() => navigate(`/combinations/${ref.id}`)}>
                      {ref.name}
                    </Button>
                  ))}
                </Space>
              }
              trigger="click"
            >
              <Button type="link" size="small" style={{ padding: 0 }}>
                {refs[0].name} 等 ▾
              </Button>
            </Popover>
          </Space>
        )
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => formatDate(text),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record) => {
        const isSystem = record.kind === 'SYSTEM'
        const canOperate = record.createdBy === CURRENT_USER
        const isActive = record.status === 'ACTIVE'
        const hasRefs = record.references.length > 0

        return (
          <Space>
            <Button
              type="link"
              size="small"
              style={{ padding: 0 }}
              onClick={() => navigate(`/strategies/${record.id}/edit`)}
            >
              查看
            </Button>
            {!isSystem && (
              <Button
                type="link"
                size="small"
                style={{ padding: 0 }}
                onClick={() => handleToggleStatus(record.id)}
              >
                {isActive ? '停用' : '启用'}
              </Button>
            )}
            {!isSystem && (
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
                      disabled: !canOperate || hasRefs,
                      onClick: () => handleDelete(record),
                    },
                  ],
                }}
                trigger={['click']}
              >
                <Button
                  type="text"
                  size="small"
                  icon={<MoreOutlined />}
                  disabled={!canOperate}
                />
              </Dropdown>
            )}
          </Space>
        )
      },
    },
  ]

  return (
    <Space direction="vertical" size="large" style={{ display: 'flex' }}>
      <Space direction="vertical" size={4}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          排序策略
        </Typography.Title>
        <Typography.Text type="secondary">
          管理排序策略，配置排序模式与关联选品池
        </Typography.Text>
      </Space>

      <Row justify="space-between" align="middle">
        <Space>
          <Input
            placeholder="搜索策略名称"
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 200 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            placeholder="排序方式"
            allowClear
            style={{ width: 140 }}
            value={modeFilter || undefined}
            onChange={setModeFilter}
            options={[
              { label: '热销排行', value: 'HOT' },
              { label: '新品曝光', value: 'NEW' },
              { label: '人工定序', value: 'MANUAL' },
            ]}
          />
          <Select
            placeholder="状态"
            allowClear
            style={{ width: 100 }}
            value={statusFilter || undefined}
            onChange={setStatusFilter}
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
            const id = createStrategy()
            navigate(`/strategies/${id}/edit`, { state: { isNew: true } })
          }}
        >
          新建策略
        </Button>
      </Row>

      <Table
        columns={columns}
        dataSource={dataSource}
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
        locale={{ emptyText: <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
      />
    </Space>
  )
}
