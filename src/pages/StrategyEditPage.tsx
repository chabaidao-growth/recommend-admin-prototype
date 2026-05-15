import {
  ArrowLeftOutlined,
  CheckOutlined,
  DeleteOutlined,
  EditOutlined,
  FireOutlined,
  HolderOutlined,
  PlusOutlined,
  RocketOutlined,
  ToolOutlined,
  UpOutlined,
  DownOutlined,
  StarOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Avatar,
  Breadcrumb,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Result,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  Radio,
  Upload,
  message,
} from 'antd'
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ColumnsType } from 'antd/es/table'
import type { FormInstance } from 'antd'
import dayjs from 'dayjs'
import { createId } from '../lib/domain'
import type { ManualBoostItem } from '../lib/types'
import { useEffect, useState, useMemo } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getPoolProducts, productMap } from '../lib/domain'
import { canEditEntity, useAdminStore } from '../lib/store'
import type { Product, Strategy, ThumbnailSlot } from '../lib/types'

const modeMeta: Record<Strategy['mode'], { title: string; desc: string; icon: React.ReactNode; tag: string; color?: string }> = {
  HOT: {
    title: '热销排行',
    desc: '按销量 / 交易额自动排序',
    icon: <FireOutlined />,
    tag: 'HOT',
    color: 'orange',
  },
  NEW: {
    title: '新品排行',
    desc: '按上新时间排序',
    icon: <RocketOutlined />,
    tag: 'NEW',
    color: 'blue',
  },
  MANUAL: {
    title: '人工定序',
    desc: '人工拖拽确定顺序',
    icon: <ToolOutlined />,
    tag: 'MANUAL',
  },
  ALGORITHM: {
    title: '算法模型',
    desc: '基于用户行为特征与多维偏好画像，通过智能排序引擎输出最优推荐结果',
    icon: <StarOutlined />,
    tag: 'ALGORITHM',
    color: 'geekblue',
  },
}

const sortDimensionOptions = [
  { label: '销量（杯数）', value: 'SALES_COUNT' },
  { label: '销售额（金额）', value: 'SALES_AMOUNT' },
]

const salesDataSourceOptions = [
  { label: '全国数据', value: 'NATIONAL' },
  { label: '门店数据', value: 'STORE' },
]

const timeWindowOptions = [
  { label: '近 7 天', value: '7D' },
  { label: '近 14 天', value: '14D' },
  { label: '近 30 天', value: '30D' },
]

function boostColumnsFor(state: ReturnType<typeof useAdminStore>['state'], readonly: boolean, onUpdate: (id: string, patch: Partial<ManualBoostItem>) => void, onRemove: (id: string) => void): ColumnsType<ManualBoostItem> {
  return [
    {
      title: '商品',
      dataIndex: 'productId',
      key: 'productId',
      width: 240,
      render: (productId: string, record: ManualBoostItem) => (
        <Select
          value={productId || undefined}
          placeholder="搜索选择商品"
          showSearch
          disabled={readonly}
          onChange={(v) => onUpdate(record.id, { productId: v })}
          options={state.products.map((p) => ({
            label: `${p.name}（${p.category}）`,
            value: p.id,
          }))}
          style={{ width: '100%' }}
          filterOption={(input, option) =>
            (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
          }
        />
      ),
    },
    {
      title: '加权系数',
      dataIndex: 'weight',
      key: 'weight',
      width: 140,
      render: (weight: number, record: ManualBoostItem) => (
        <InputNumber
          value={weight}
          min={-1}
          max={1}
          step={0.05}
          precision={2}
          disabled={readonly}
          onChange={(v) => onUpdate(record.id, { weight: v ?? 0 })}
          style={{ width: '100%' }}
          addonBefore={weight > 0 ? '+' : ''}
        />
      ),
    },
    {
      title: '生效时间',
      key: 'dateRange',
      width: 340,
      render: (_: unknown, record: ManualBoostItem) => (
        <Space size={4}>
          <DatePicker
            value={record.startAt ? dayjs(record.startAt) : null}
            disabled={readonly || record.permanent}
            onChange={(d) => onUpdate(record.id, { startAt: d ? d.format('YYYY-MM-DD') : '' })}
            style={{ width: 110 }}
            placeholder="开始"
          />
          <Typography.Text type="secondary">~</Typography.Text>
          <DatePicker
            value={record.endAt ? dayjs(record.endAt) : null}
            disabled={readonly || record.permanent}
            onChange={(d) => onUpdate(record.id, { endAt: d ? d.format('YYYY-MM-DD') : '' })}
            style={{ width: 110 }}
            placeholder="结束"
          />
          <Switch
            size="small"
            checked={record.permanent}
            disabled={readonly}
            onChange={(checked) => onUpdate(record.id, {
              permanent: checked,
              startAt: checked ? '' : record.startAt,
              endAt: checked ? '' : record.endAt,
            })}
            checkedChildren="永久"
            unCheckedChildren="定时"
          />
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 60,
      align: 'center',
      render: (_: unknown, record: ManualBoostItem) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          disabled={readonly}
          onClick={() => onRemove(record.id)}
        />
      ),
    },
  ]
}

// 表单数据类型
interface StrategyFormValues {
  name: string
  description: string
  poolId: string
  mode: Strategy['mode']
  thumbnails: ThumbnailSlot[]
  sortDimension?: 'SALES_COUNT' | 'SALES_AMOUNT'
  timeWindow?: '7D' | '14D' | '30D'
  salesDataSource?: 'NATIONAL' | 'STORE'
  fallbackDataSource?: 'NATIONAL' | 'STORE'
  status: 'ACTIVE' | 'INACTIVE'
}

export function StrategyEditPage() {
  const { id = '' } = useParams()
  const { state } = useAdminStore()
  const strategy = state.strategies.find((item) => item.id === id)

  if (!strategy) {
    return <StrategyNotFound />
  }

  return <StrategyEditor strategy={strategy} />
}

function StrategyNotFound() {
  const navigate = useNavigate()
  return (
    <Result
      status="404"
      title="策略不存在"
      subTitle="请返回策略列表重新选择。"
      extra={
        <Button type="primary" onClick={() => navigate('/strategies')}>
          返回列表
        </Button>
      }
    />
  )
}

function StrategyEditor({ strategy }: { strategy: Strategy }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { state, updateStrategy, deleteStrategy } = useAdminStore()
  const isSystem = strategy.kind === 'SYSTEM'
  const isOwner = canEditEntity(strategy)
  const isNew = (location.state as { isNew?: boolean })?.isNew ?? false
  const isExistingStrategy = !isNew
  const [isEditing, setIsEditing] = useState(isNew)

  // 使用 Ant Design Form hook
  const [form] = Form.useForm<StrategyFormValues>()
  const readonly = !isEditing

  // 追踪表单字段变化（用于条件渲染和依赖逻辑）
  const [mode, setMode] = useState<Strategy['mode'] | null>(strategy.mode ?? null)
  const [selectedPoolId, setSelectedPoolId] = useState(strategy.poolId ?? '')
  const [manualCategoryFilter, setManualCategoryFilter] = useState<string>('ALL')

  // 构建表单初始值
  const formInitialValues: StrategyFormValues = useMemo(() => {
    return {
      name: strategy.name,
      description: strategy.description || '',
      poolId: strategy.poolId,
      mode: strategy.mode,
      thumbnails: strategy.thumbnails || [],
      sortDimension: strategy.sortDimension,
      timeWindow: strategy.timeWindow,
      salesDataSource: strategy.salesDataSource,
      fallbackDataSource: 'STORE',
      status: strategy.status,
    }
  }, [strategy.id])

  // 初始化模式和选品池
  useEffect(() => {
    if (strategy) {
      setMode(strategy.mode)
      setSelectedPoolId(strategy.poolId)
    }
  }, [strategy.id])

  // 表单挂载后填充值（useLayoutEffect 确保在 paint 前完成）
  useEffect(() => {
    if (strategy) {
      form.setFieldsValue({
        name: strategy.name,
        description: strategy.description || '',
        poolId: strategy.poolId,
        mode: strategy.mode,
        sortDimension: strategy.sortDimension,
        timeWindow: strategy.timeWindow,
        salesDataSource: strategy.salesDataSource,
        status: strategy.status,
      })
    }
  }, [form, formInitialValues]) // 依赖 formInitialValues 确保策略切换时重新填充

  // 获取选品池商品（用于 MANUAL 模式）
  const productsById = productMap(state)
  const poolProducts = getPoolProducts(state, selectedPoolId)
  const [query, setQuery] = useState('')

  // MANUAL 模式：从全量商品选（不受 poolId 限制）；其他模式：从选品池选
  // MANUAL 模式：已选商品列表（使用本地 state 管理）
  const [manualProductIds, setManualProductIds] = useState<string[]>(strategy.manualProductIds || [])
  useEffect(() => {
    if (strategy) {
      setManualProductIds(strategy.manualProductIds)
    }
  }, [strategy?.id])

  const sourceProducts = mode === 'MANUAL' ? state.products : poolProducts

  // 品类选项（从 sourceProducts 提取）
  const manualCategories = useMemo(() => {
    const cats = new Set(sourceProducts.map((p) => p.category))
    return ['ALL', ...Array.from(cats).sort()]
  }, [sourceProducts])

  const availableProducts = sourceProducts.filter(
    (product) =>
      !manualProductIds.includes(product.id) &&
      (manualCategoryFilter === 'ALL' || product.category === manualCategoryFilter) &&
      (product.name.includes(query) || product.category.includes(query)),
  )

  const selectedProducts = manualProductIds
    .map((productId) => productsById[productId])
    .filter((product): product is typeof productsById[string] => Boolean(product))

  // 人工加权
  const [manualBoostEnabled, setManualBoostEnabled] = useState(strategy.manualBoostEnabled ?? false)
  const [manualBoostItems, setManualBoostItems] = useState<ManualBoostItem[]>(strategy.manualBoostItems ?? [])

  useEffect(() => {
    if (strategy) {
      setManualBoostEnabled(strategy.manualBoostEnabled ?? false)
      setManualBoostItems(strategy.manualBoostItems ?? [])
    }
  }, [strategy?.id])

  function handleAddBoostItem() {
    setManualBoostItems((prev) => [
      ...prev,
      {
        id: createId('boost'),
        productId: '',
        weight: 0,
        startAt: '',
        endAt: '',
        permanent: false,
      },
    ])
  }

  function handleUpdateBoostItem(id: string, patch: Partial<ManualBoostItem>) {
    setManualBoostItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function handleRemoveBoostItem(id: string) {
    setManualBoostItems((prev) => prev.filter((item) => item.id !== id))
  }

  const boostColumns = boostColumnsFor(state, readonly, handleUpdateBoostItem, handleRemoveBoostItem)

  function handleSave() {
    form
      .validateFields()
      .then((values) => {
        const updated: Strategy = {
          ...strategy,
          name: values.name,
          description: values.description || '',
          poolId: values.poolId,
          mode: values.mode,
          thumbnails: values.thumbnails || [],
          sortDimension: values.sortDimension || 'SALES_COUNT',
          timeWindow: values.timeWindow || '7D',
          salesDataSource: values.salesDataSource || strategy.salesDataSource || 'STORE',
          fallbackStrategyId: strategy.fallbackStrategyId,
          manualProductIds: manualProductIds,
          filterUnavailable: true,
          manualBoostEnabled,
          manualBoostItems: manualBoostItems.filter((item) => item.productId),
        }
        updateStrategy(strategy.id, updated)
        message.success('保存成功')
        navigate('/strategies')
      })
      .catch((info) => {
        console.log('验证失败:', info)
      })
  }

  function handleCancel() {
    if (isNew) {
      deleteStrategy(strategy.id)
      navigate('/strategies')
      return
    }
    form.resetFields()
    setManualProductIds(strategy.manualProductIds || [])
    setManualBoostEnabled(strategy.manualBoostEnabled ?? false)
    setManualBoostItems(strategy.manualBoostItems ?? [])
    setIsEditing(false)
  }

  function handleToggleStatus() {
    if (!strategy) return
    updateStrategy(strategy.id, {
      ...strategy!,
      status: strategy.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
    })
  }

  function handleDelete() {
    Modal.confirm({
      title: '确认删除',
      content: `确认删除策略「${strategy.name}」吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        deleteStrategy(strategy.id)
        navigate('/strategies')
      },
    })
  }

  const isActive = strategy.status === 'ACTIVE'

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setManualProductIds((prev) => {
      const oldIndex = prev.indexOf(active.id as string)
      const newIndex = prev.indexOf(over.id as string)
      const newArr = [...prev]
      newArr.splice(oldIndex, 1)
      newArr.splice(newIndex, 0, active.id as string)
      return newArr
    })
  }

  // MANUAL 模式：添加商品
  function handleAddProduct(productId: string) {
    setManualProductIds((prev) => [...prev, productId])
  }

  // MANUAL 模式：移除商品
  function handleRemoveProduct(productId: string) {
    setManualProductIds((prev) => prev.filter((id) => id !== productId))
  }

  // MANUAL 模式：上移商品
  function handleMoveUp(index: number) {
    if (index === 0) return
    setManualProductIds((prev) => {
      const newArr = [...prev]
      ;[newArr[index - 1], newArr[index]] = [newArr[index], newArr[index - 1]]
      return newArr
    })
  }

  // MANUAL 模式：下移商品
  function handleMoveDown(index: number) {
    if (index === manualProductIds.length - 1) return
    setManualProductIds((prev) => {
      const newArr = [...prev]
      ;[newArr[index], newArr[index + 1]] = [newArr[index + 1], newArr[index]]
      return newArr
    })
  }

  return (
    <Flex vertical gap={24}>
      <Breadcrumb
        items={[
          { title: '推荐系统' },
          { title: <a onClick={() => navigate('/strategies')}>排序策略</a> },
          { title: '编辑' },
        ]}
        style={{ marginBottom: 8 }}
      />
      {/* 页面头部 */}
      <Flex align="center" justify="space-between">
        <Flex align="center" gap={12}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/strategies')}
          />
          <Typography.Title level={4} style={{ margin: 0 }}>
            {isEditing ? '编辑排序策略' : strategy.name}
          </Typography.Title>
          {isSystem && <Tag color="blue">系统内置</Tag>}
        </Flex>
        <Space size={8}>
          {isEditing
            ? (
                <>
                  <Button onClick={handleCancel}>取消</Button>
                  <Button type="primary" onClick={handleSave}>保存</Button>
                </>
              )
            : (
                <>
                  {isOwner ? (
                    <>
                      <Button icon={<EditOutlined />} onClick={() => setIsEditing(true)}>编辑</Button>
                      <Button onClick={handleToggleStatus}>{isActive ? '停用' : '启用'}</Button>
                      {isActive ? (
                        <Tooltip title="请先停用后再删除">
                          <span>
                            <Button danger icon={<DeleteOutlined />} disabled>删除</Button>
                          </span>
                        </Tooltip>
                      ) : (
                        <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>删除</Button>
                      )}
                    </>
                  ) : (
                    <>
                      <Tooltip title="无权限编辑（仅创建人或超管可编辑）"><Button icon={<EditOutlined />} disabled>编辑</Button></Tooltip>
                      <Tooltip title="无权限编辑（仅创建人或超管可编辑）"><Button disabled>{isActive ? '停用' : '启用'}</Button></Tooltip>
                      {isActive ? (
                        <Tooltip title="请先停用后再删除">
                          <span>
                            <Button danger icon={<DeleteOutlined />} disabled>删除</Button>
                          </span>
                        </Tooltip>
                      ) : (
                        <Tooltip title="无权限编辑（仅创建人或超管可编辑）"><Button danger icon={<DeleteOutlined />} disabled>删除</Button></Tooltip>
                      )}
                    </>
                  )}
                </>
              )
          }
        </Space>
      </Flex>

      <Form
        form={form}
        layout="vertical"
        disabled={readonly}
        labelCol={{ span: 24 }}
        style={{ border: 'none', padding: 0, margin: 0 }}
      >
        {/* 区域一：基础信息 */}
        <Card title="基础信息" bordered style={{ marginBottom: 24 }}>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                label="策略名称"
                name="name"
                rules={[
                  { required: true, message: '请输入策略名称' },
                  { min: 1, max: 30, message: '策略名称长度为 1-30 字' },
                ]}
              >
                <Input placeholder="请输入策略名称，1-30 字" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="描述"
                name="description"
                rules={[{ max: 200, message: '描述最多 200 字' }]}
              >
                <Input.TextArea
                  placeholder="选填，描述该策略的用途和适用场景"
                  rows={2}
                  showCount
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 区域二：排序模式 */}
        <Card title="排序模式" bordered style={{ marginBottom: 24 }}>
          <Form.Item
            label="排序方式"
            name="mode"
            rules={[{ required: true, message: '请选择排序方式' }]}
          >
            <Radio.Group
              disabled={isExistingStrategy}
              onChange={(e) => setMode(e.target.value)}
              value={mode}
              style={{ display: 'flex', flexWrap: 'nowrap', gap: 12 }}
            >
              {(['HOT', 'NEW', 'MANUAL', 'ALGORITHM'] as const).map((m) => {
                const meta = modeMeta[m]
                const isSelected = mode === m
                return (
                  <div
                    key={m}
                    style={{
                      flex: 1,
                      minWidth: 220,
                      minHeight: 120,
                      padding: 16,
                      borderRadius: 8,
                      border: isSelected ? '1px solid #1677ff' : '1px solid #e8e8e8',
                      background: isSelected ? '#fff' : '#fafafa',
                      cursor: readonly ? 'default' : 'pointer',
                      position: 'relative',
                      transition: 'all 0.2s',
                      boxSizing: 'border-box',
                    }}
                    onClick={() => {
                      if (readonly || isSelected) return
                      setMode(m)
                      form.setFieldValue('mode', m)
                    }}
                    onMouseEnter={(e) => {
                      if (readonly || isSelected) return
                      const el = e.currentTarget as HTMLDivElement
                      el.style.borderColor = '#1677ff'
                      el.style.background = '#fff'
                      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'
                    }}
                    onMouseLeave={(e) => {
                      if (readonly || isSelected) return
                      const el = e.currentTarget as HTMLDivElement
                      el.style.borderColor = '#e8e8e8'
                      el.style.background = '#fafafa'
                      el.style.boxShadow = 'none'
                    }}
                  >
                    {isSelected && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          width: 20,
                          height: 20,
                          background: '#1677ff',
                          borderRadius: '0 8px 0 8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <CheckOutlined style={{ color: '#fff', fontSize: 12 }} />
                      </div>
                    )}
                    <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
                      <Space>
                        {meta.icon}
                        <Typography.Text strong>
                          {meta.title}
                        </Typography.Text>
                      </Space>
                      {isSelected ? (
                        <Tag color="blue">{meta.tag}</Tag>
                      ) : meta.tag === 'MANUAL' ? (
                        <Tag>{meta.tag}</Tag>
                      ) : (
                        <Tag color={meta.color}>{meta.tag}</Tag>
                      )}
                    </Flex>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {meta.desc}
                    </Typography.Text>
                  </div>
                )
              })}
            </Radio.Group>
          </Form.Item>

          {/* 选品池（MANUAL 模式不显示） */}
          <Form.Item noStyle shouldUpdate>
            {() =>
              mode !== 'MANUAL' && (
                <Form.Item
                  label="选择选品池"
                  name="poolId"
                  rules={[{ required: true, message: '请选择选品池' }]}
                >
                  <Select
                    placeholder="请选择选品池"
                    onChange={setSelectedPoolId}
                    options={state.pools.map((pool) => ({
                      label: `${pool.name} · ${pool.productIds.length} 件商品`,
                      value: pool.id,
                    }))}
                  />
                </Form.Item>
              )
            }
          </Form.Item>

          {/* HOT 模式参数 */}
          <Form.Item noStyle shouldUpdate>
            {() =>
              mode === 'HOT' && (
                <div style={{ marginTop: 16 }}>
                  <Typography.Text
                    strong
                    style={{
                      fontSize: 13,
                      color: 'var(--ant-color-text-secondary)',
                      marginBottom: 12,
                      display: 'block',
                    }}
                  >
                    热销排行配置
                  </Typography.Text>
                  <div
                    style={{
                      background: '#f5f5f5',
                      borderRadius: 8,
                      padding: 16,
                      borderLeft: '4px solid #1677ff',
                    }}
                  >
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item
                          label="排序维度"
                          name="sortDimension"
                          rules={[{ required: true, message: '请选择排序维度' }]}
                        >
                          <Select options={sortDimensionOptions} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          label="数据范围"
                          name="salesDataSource"
                          rules={[{ required: true, message: '请选择数据范围' }]}
                        >
                          <Select options={salesDataSourceOptions} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          label="时间窗口"
                          name="timeWindow"
                          rules={[{ required: true, message: '请选择时间窗口' }]}
                        >
                          <Select options={timeWindowOptions} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                </div>
              )
            }
          </Form.Item>

          {/* NEW 模式参数 */}
          <Form.Item noStyle shouldUpdate>
            {() =>
              mode === 'NEW' && (
                <Row gutter={24} style={{ marginTop: 16 }}>
                  <Col span={12}>
                    <Form.Item
                      label="时间窗口"
                      name="timeWindow"
                      rules={[{ required: true, message: '请选择时间窗口' }]}
                      help="上新时间在该窗口内的商品参与排序"
                    >
                      <Select options={timeWindowOptions} />
                    </Form.Item>
                  </Col>
                </Row>
              )
            }
          </Form.Item>

          {/* MANUAL 模式：商品排序 */}
          <Form.Item noStyle shouldUpdate>
            {() =>
              mode === 'MANUAL' && (
                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                  <Col span={12}>
                    <Card title="全部商品">
                      <Flex gap={8} style={{ marginBottom: 12 }}>
                        <Input.Search
                          placeholder="搜索商品"
                          allowClear
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          style={{ flex: 1 }}
                        />
                        <Select
                          value={manualCategoryFilter}
                          onChange={setManualCategoryFilter}
                          style={{ width: 120 }}
                          options={manualCategories.map((c) => ({
                            label: c === 'ALL' ? '全部品类' : c,
                            value: c,
                          }))}
                        />
                      </Flex>
                      <List
                        dataSource={availableProducts}
                        size="small"
                        locale={{ emptyText: <Empty description="无可用商品" /> }}
                        renderItem={(product) => (
                          <List.Item
                            actions={!readonly ? [
                              <Button
                                key="add"
                                type="link"
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={() => handleAddProduct(product.id)}
                              >
                                添加
                              </Button>,
                            ] : []}
                          >
                            <List.Item.Meta
                              title={product.name}
                              description={product.category}
                            />
                          </List.Item>
                        )}
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card title={`已选排序列表（${manualProductIds.length} 个商品）`}>
                      {selectedProducts.length === 0 ? (
                        <Empty description="请从左侧添加商品" />
                      ) : (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleDragEnd}
                        >
                          <SortableContext
                            items={manualProductIds}
                            strategy={verticalListSortingStrategy}
                          >
                            <List
                              size="small"
                              dataSource={selectedProducts}
                              renderItem={(product, index) => (
                                <List.Item>
                                  <ManualSortRow
                                    product={product}
                                    index={index}
                                    total={selectedProducts.length}
                                    readonly={readonly}
                                    onMoveUp={() => handleMoveUp(index)}
                                    onMoveDown={() => handleMoveDown(index)}
                                    onRemove={() => handleRemoveProduct(product.id)}
                                  />
                                </List.Item>
                              )}
                            />
                          </SortableContext>
                        </DndContext>
                      )}
                    </Card>
                  </Col>
                </Row>
              )
            }
          </Form.Item>

          {/* ALGORITHM 模式说明 */}
          <Form.Item noStyle shouldUpdate>
            {() =>
              mode === 'ALGORITHM' && (
                <Alert
                  type="info"
                  showIcon
                  style={{ marginTop: 16 }}
                  message="个性化推荐模式"
                  description="系统将基于用户历史消费行为、偏好画像，结合 CTR（点击率）和 CVR（购买率）预估模型进行综合排序，无需额外配置参数。"
                />
              )
            }
          </Form.Item>

          {/* 缩略图标签 */}
          <div style={{ marginTop: 24 }}>
            <Typography.Text style={{ fontSize: 13, color: 'var(--ant-color-text-secondary)', display: 'block', marginBottom: 12 }}>
              缩略图标签
            </Typography.Text>
            <Flex gap={16}>
              {[1, 2, 3].map((order) => (
                <ThumbnailUploadSlot key={order} order={order as 1 | 2 | 3} form={form} readonly={readonly} />
              ))}
            </Flex>
            <Typography.Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
              156*54, 小于100KB 支持 jpg, jpeg, gif, png, JPG, GIF, PNG 格式
            </Typography.Text>
          </div>
        </Card>

        {/* 人工加权模块（MANUAL 模式不支持加权） */}
        {mode !== 'MANUAL' && (
        <Card
          title="人工加权"
          bordered
          style={{ marginBottom: 24 }}
          extra={
            <Flex align="center" gap={8}>
              <Switch
                checked={manualBoostEnabled}
                onChange={setManualBoostEnabled}
                disabled={readonly}
              />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                开启人工加权
              </Typography.Text>
            </Flex>
          }
        >
          {manualBoostEnabled ? (
            <Flex vertical gap={16}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                对具体商品进行排序加权调整，不影响基础排序逻辑。加权公式：最终得分 = α + β，其中 α = (总数 - 排名 + 1) / 总数（归一化，数值越大排名越靠前），β = 加权系数（-1~1）
              </Typography.Text>

              {/* 加权列表 */}
              <Table<ManualBoostItem>
                columns={boostColumns}
                dataSource={manualBoostItems}
                rowKey="id"
                pagination={false}
                size="small"
                locale={{ emptyText: '暂无加权配置，点击下方按钮添加' }}
              />

              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={handleAddBoostItem}
                disabled={readonly}
              >
                添加商品加权
              </Button>
            </Flex>
          ) : (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              开启后可对具体商品进行排序加权调整，不影响基础排序逻辑。加权公式：最终得分 = α + β
            </Typography.Text>
          )}
        </Card>
        )}

        {/* 区域三：高级配置 */}
        <Card title="高级配置" bordered style={{ marginBottom: 24 }}>
          <Row gutter={24}>
            <Col span={12}>
              {strategy.kind === 'SYSTEM' ? (
                <Form.Item label="兜底策略">
                  <Input value="系统终极兜底，无需配置" disabled />
                </Form.Item>
              ) : (
                <>
                  <Form.Item label="兜底策略">
                    <Flex align="center" gap={8}>
                      <Tag color="orange">热销排行兜底</Tag>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>固定使用热销排行策略兜底</Typography.Text>
                    </Flex>
                  </Form.Item>
                  <Form.Item label="兜底数据范围">
                    <Input value="使用门店近 7 天热销 GMV 数据" disabled />
                  </Form.Item>
                </>
              )}
            </Col>
            <Col span={12}>
              <Form.Item label="过滤规则" help="系统自动过滤下架 / 不可售商品">
                <Flex align="center" gap={8}>
                  <Tag color="success">已开启</Tag>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    不可取消
                  </Typography.Text>
                </Flex>
              </Form.Item>
            </Col>
          </Row>
        </Card>
      </Form>
    </Flex>
  )
}

function ManualSortRow({
  product,
  index,
  total,
  readonly,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  product: Product
  index: number
  total: number
  readonly: boolean
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id })

  const style: React.CSSProperties = {
    opacity: isDragging ? 0.5 : 1,
    transition,
    transform: transform ? CSS.Translate.toString(transform) : undefined,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Space size={8}>
        {/* 拖拽手柄 */}
        {!readonly && (
          <span
            {...attributes}
            {...listeners}
            style={{ cursor: 'grab', color: 'var(--ant-color-text-quaternary)' }}
          >
            <HolderOutlined />
          </span>
        )}
        {/* 序号 */}
        <Avatar size="small">{index + 1}</Avatar>
        {/* 商品信息 */}
        <Space direction="vertical" size={2} style={{ minWidth: 0 }}>
          <Typography.Text strong ellipsis>
            {product.name}
          </Typography.Text>
          <Space size={8}>
            <Tag>{product.category}</Tag>
          </Space>
        </Space>
        {/* 操作按钮 */}
        {!readonly && (
          <Space size="small">
            <Tooltip title="上移">
              <Button
                type="text"
                size="small"
                icon={<UpOutlined />}
                disabled={index === 0}
                onClick={onMoveUp}
              />
            </Tooltip>
            <Tooltip title="下移">
              <Button
                type="text"
                size="small"
                icon={<DownOutlined />}
                disabled={index === total - 1}
                onClick={onMoveDown}
              />
            </Tooltip>
            <Tooltip title="移除">
              <Button
                type="link"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={onRemove}
              >
                移除
              </Button>
            </Tooltip>
          </Space>
        )}
      </Space>
    </div>
  )
}

function ThumbnailUploadSlot({
  order,
  form,
  readonly,
}: {
  order: 1 | 2 | 3
  form: FormInstance
  readonly: boolean
}) {
  const thumbnails: ThumbnailSlot[] = form.getFieldValue('thumbnails') || []
  const slot = thumbnails.find((t) => t.order === order)

  function handleUpload(file: File) {
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif'].includes(file.type)) {
      message.error('仅支持 JPG/JPEG/PNG/GIF 格式')
      return Upload.LIST_IGNORE
    }
    if (file.size > 100 * 1024) {
      message.error('图片大小不能超过 100KB')
      return Upload.LIST_IGNORE
    }
    const reader = new FileReader()
    reader.onload = () => {
      const next = [...thumbnails.filter((t) => t.order !== order), { order, url: reader.result as string }]
        .sort((a, b) => a.order - b.order)
      form.setFieldValue('thumbnails', next)
    }
    reader.readAsDataURL(file)
    return Upload.LIST_IGNORE
  }

  function handleRemove() {
    form.setFieldValue('thumbnails', thumbnails.filter((t) => t.order !== order))
  }

  return (
    <Flex vertical align="center" gap={4}>
      <Tag color="blue">第 {order} 顺位</Tag>
      {slot ? (
        <div style={{ position: 'relative', width: 156, height: 54 }}>
          <img
            src={slot.url}
            alt={`顺位 ${order}`}
            style={{ width: 156, height: 54, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--ant-color-border)' }}
          />
          {!readonly && (
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={handleRemove}
              style={{ position: 'absolute', top: 2, right: 2, padding: 0, minWidth: 22, height: 22 }}
            />
          )}
        </div>
      ) : (
        <Upload
          showUploadList={false}
          beforeUpload={handleUpload}
          disabled={readonly}
        >
          <div
            style={{
              width: 156,
              height: 54,
              border: '1px dashed var(--ant-color-border)',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: readonly ? 'default' : 'pointer',
              color: 'var(--ant-color-text-quaternary)',
              fontSize: 20,
            }}
          >
            <PlusOutlined />
          </div>
        </Upload>
      )}
    </Flex>
  )
}
