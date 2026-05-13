import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Drawer,
  Empty,
  Flex,
  Form,
  Input,
  Row,
  Space,
  Switch,
  Tag,
  Typography,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { formatDate } from '../lib/domain'
import { useAdminStore } from '../lib/store'

const { Title, Text, Paragraph } = Typography

export function PoolsListPage() {
  const navigate = useNavigate()
  const { state, createPool, updatePool } = useAdminStore()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const allPools = state.pools
    .filter((pool) =>
      pool.name.toLowerCase().includes(debouncedQuery.trim().toLowerCase()),
    )

  // ALL 全量池置顶
  const systemPool = allPools.find((pool) => pool.kind === 'SYSTEM')
  const otherPools = allPools.filter((pool) => pool.kind !== 'SYSTEM')

  // 启用 vs 停用
  const activePools = otherPools
    .filter((pool) => pool.status === 'ACTIVE')
    .sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime())
  const inactivePools = otherPools
    .filter((pool) => pool.status === 'INACTIVE')
    .sort((a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime())

  function doCreate(navigateToDetail: boolean) {
    form.validateFields().then((values) => {
      const id = createPool()
      const pool = state.pools.find((p) => p.id === id) ?? state.pools[state.pools.length - 1]
      if (pool) {
        updatePool(id, {
          ...pool,
          name: values.name,
          description: values.description || '',
          status: values.enabled ? 'ACTIVE' : 'INACTIVE',
        })
      }
      setDrawerOpen(false)
      form.resetFields()
      if (navigateToDetail) {
        navigate(`/pools/${id}`)
      }
    })
  }

  function handleQuickCreate() {
    setDrawerOpen(true)
  }

  return (
    <Flex vertical gap={24}>
      <div>
        <Title level={4} style={{ marginBottom: 4 }}>商品选品池</Title>
        <Text type="secondary">
          管理可推荐的商品范围
        </Text>
        <Alert
          style={{ marginTop: 12 }}
          type="info"
          showIcon
          message={'选品池定义\u201C哪些商品可以被推荐\u201D，具体的排序和展示逻辑在排序策略中配置。'}
          banner
        />
      </div>

      <Flex justify="space-between" align="center">
        <Input
          placeholder="搜索选品池"
          prefix={<SearchOutlined />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          allowClear
          style={{ maxWidth: 320 }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleQuickCreate}>
          新建选品池
        </Button>
      </Flex>

      {allPools.length === 0 ? (
        <Card>
          <Empty description="还没有选品池，点击上方按钮创建第一个">
            <Button type="primary" onClick={handleQuickCreate}>
              创建选品池
            </Button>
          </Empty>
        </Card>
      ) : (
        <>
          {(systemPool || activePools.length > 0) && (
            <Row gutter={[16, 16]}>
              {systemPool && (
                <Col key={systemPool.id} xs={24} sm={24} md={12} lg={12} xl={8}>
                  <PoolCard pool={systemPool} />
                </Col>
              )}
              {activePools.map((pool) => (
                <Col key={pool.id} xs={24} sm={24} md={12} lg={12} xl={8}>
                  <PoolCard pool={pool} />
                </Col>
              ))}
            </Row>
          )}

          {inactivePools.length > 0 && (
            <>
              <Divider orientation="left">已停用</Divider>
              <Row gutter={[16, 16]}>
                {inactivePools.map((pool) => (
                  <Col key={pool.id} xs={24} sm={24} md={12} lg={12} xl={8}>
                    <PoolCard pool={pool} disabled />
                  </Col>
                ))}
              </Row>
            </>
          )}
        </>
      )}

      <Drawer
        title="新建选品池"
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false)
          form.resetFields()
        }}
        width={480}
        footer={
          <Flex justify="end" gap={8}>
            <Button onClick={() => { setDrawerOpen(false); form.resetFields() }}>
              取消
            </Button>
            <Button onClick={() => doCreate(false)}>
              创建
            </Button>
            <Button type="primary" onClick={() => doCreate(true)}>
              创建并添加商品
            </Button>
          </Flex>
        }
      >
        <Form form={form} layout="vertical" initialValues={{ enabled: true }}>
          <Form.Item
            name="name"
            label="选品池名称"
            rules={[
              { required: true, message: '请输入选品池名称' },
              { max: 30, message: '最多 30 个字' },
              { whitespace: true, message: '不允许纯空格' },
              {
                validator(_, value) {
                  if (value && state.pools.some((p) => p.name === value.trim())) {
                    return Promise.reject('名称已存在')
                  }
                  return Promise.resolve()
                },
              },
            ]}
          >
            <Input placeholder="请输入选品池名称" maxLength={30} showCount />
          </Form.Item>
          <Form.Item name="description" label="描述" rules={[{ max: 200, message: '最多 200 字' }]}>
            <Input.TextArea placeholder="选填，描述该选品池的用途" rows={3} maxLength={200} showCount />
          </Form.Item>
          <Form.Item name="enabled" label="初始状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Drawer>
    </Flex>
  )
}

function PoolCard({ pool, disabled }: { pool: ReturnType<typeof useAdminStore>['state']['pools'][number]; disabled?: boolean }) {
  const navigate = useNavigate()
  const { state } = useAdminStore()
  const isSystem = pool.kind === 'SYSTEM'
  const [hovered, setHovered] = useState(false)

  const cardStyle: React.CSSProperties | undefined = disabled
    ? {
        background: 'var(--ant-color-fill-quaternary)',
        border: `1px solid ${hovered ? 'var(--ant-color-border)' : 'var(--ant-color-border-secondary)'}`,
        cursor: 'pointer',
        ...(hovered && { boxShadow: 'var(--ant-box-shadow-secondary)' }),
      }
    : undefined

  return (
    <Card
      hoverable={!disabled}
      onClick={() => navigate(`/pools/${pool.id}`)}
      style={cardStyle}
      onMouseEnter={() => disabled && setHovered(true)}
      onMouseLeave={() => disabled && setHovered(false)}
      title={
        <Space>
          <span>{pool.name}</span>
          {isSystem && <Tag color="blue">系统</Tag>}
        </Space>
      }
    >
      <Flex justify="space-between" align="center" style={{ marginBottom: 'var(--ant-margin-sm)' }}>
        <Tag color={pool.status === 'ACTIVE' ? 'success' : 'default'}>
          {pool.status === 'ACTIVE' ? '启用' : '停用'}
        </Tag>
      </Flex>

      <Flex justify="space-between" style={{ marginBottom: 'var(--ant-margin-sm)' }}>
        <Text type="secondary">商品数</Text>
        <Text strong>{pool.productIds.length}</Text>
      </Flex>
      <Flex justify="space-between" style={{ marginBottom: 'var(--ant-margin-sm)' }}>
        <Text type="secondary">被使用</Text>
        <Text strong>{state.strategies.filter((s) => s.poolId === pool.id).length}</Text>
      </Flex>

      <Paragraph
        type="secondary"
        ellipsis={{ rows: 2 }}
        style={{ marginBottom: 'var(--ant-margin-sm)' }}
      >
        {pool.description ? (
          pool.description
        ) : (
          <Text type="secondary" italic>暂无描述</Text>
        )}
      </Paragraph>

      <div style={{ fontSize: 'var(--ant-font-size-sm)', lineHeight: '20px' }}>
        <Text type="secondary">
          创建：{pool.createdBy} · {formatDate(pool.createdAt)}
        </Text>
        <br />
        <Text type="secondary">
          最新维护：{pool.updatedAt ? `${pool.updatedBy} · ${formatDate(pool.updatedAt)}` : '-'}
        </Text>
      </div>
    </Card>
  )
}
