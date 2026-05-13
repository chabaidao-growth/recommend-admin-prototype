import { useState } from 'react'
import { simulatePreview } from '../lib/domain'
import { useAdminStore } from '../lib/store'
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Input,
  List,
  Row,
  Select,
  Space,
  Skeleton,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import { SearchOutlined, MobileOutlined, ArrowRightOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

const { Title, Paragraph, Text } = Typography

const slotCapacity: Record<string, number> = {
  'slot-order-left': 4,
  'slot-home-top': 5,
  'slot-home-guess': 8,
  'slot-order-confirm': 3,
  'slot-product-detail': 4,
}

const statusTagColor: Record<string, string> = {
  草稿: 'default',
  已暂停: 'orange',
  已发布: 'green',
}

function reasonTagColorFor(reason: string) {
  if (reason.includes('门店')) return 'orange'
  if (reason.includes('时间')) return 'default'
  if (reason.includes('人群') || reason.includes('Segment')) return 'blue'
  if (reason.includes('草稿')) return 'default'
  if (reason.includes('暂停')) return 'orange'
  if (reason.includes('策略组合')) return 'purple'
  return 'default'
}

const diagColumns: ColumnsType<{
  planId: string
  planName: string
  status: string
  reasons: string[]
}> = [
  {
    title: '计划名称',
    dataIndex: 'planName',
    key: 'planName',
    render: (text: string) => <Text strong style={{ fontSize: 13 }}>{text}</Text>,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 70,
    render: (text: string) => <Tag color={statusTagColor[text] ?? 'default'} style={{ margin: 0 }}>{text}</Tag>,
  },
  {
    title: '未命中原因',
    dataIndex: 'reasons',
    key: 'reasons',
    render: (reasons: string[]) => (
      <Space size={[4, 4]} wrap>
        {reasons.map((r) => (
          <Tag key={r} color={reasonTagColorFor(r)} style={{ margin: 0, fontSize: 12 }}>{r}</Tag>
        ))}
      </Space>
    ),
  },
]

export function PreviewPage() {
  const { state } = useAdminStore()
  const [storeId, setStoreId] = useState(state.stores[0]?.id ?? '')
  const [slotId, setSlotId] = useState('slot-order-left')
  const [userId, setUserId] = useState('coffee-user-808')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(() => simulatePreview(state, state.stores[0]?.id ?? '', 'coffee-user-808', 'slot-order-left'))

  const storeOptions = state.stores.map((store) => ({ label: store.name, value: store.id }))
  const slotOptions = [
    { label: '商品点单页-左侧推荐菜单', value: 'slot-order-left' },
    { label: '首页顶部', value: 'slot-home-top' },
    { label: '首页猜你喜欢', value: 'slot-home-guess' },
    { label: '订单确认页', value: 'slot-order-confirm' },
    { label: '商品详情页', value: 'slot-product-detail' },
  ]

  const capacity = slotCapacity[slotId] ?? 4
  const allSlots = Array.from({ length: capacity }, (_, i) => result.slots[i] ?? {
    slotIndex: i + 1,
    product: null,
    strategyName: '',
    reason: '空置',
    skipReasons: [],
  })

  function handleSimulate() {
    setLoading(true)
    setTimeout(() => {
      setResult(simulatePreview(state, storeId, userId, slotId))
      setLoading(false)
    }, 600)
  }

  return (
    <div>
      <Title level={3}>全链路预览</Title>
      <Paragraph type="secondary">模拟推荐请求，查看命中计划、推荐结果和排序 Trace</Paragraph>

      {/* 1. 顶部筛选区 - Form layout="inline" */}
      <Card size="small" style={{ marginBottom: 24 }}>
        <Form layout="inline">
          <Form.Item label="门店">
            <Select
              style={{ width: 220 }}
              value={storeId}
              onChange={setStoreId}
              options={storeOptions}
              allowClear
              placeholder="请选择门店"
            />
          </Form.Item>
          <Form.Item label="资源位">
            <Select
              style={{ width: 240 }}
              value={slotId}
              onChange={setSlotId}
              options={slotOptions}
              allowClear
              placeholder="请选择资源位"
            />
          </Form.Item>
          <Form.Item label="用户 ID">
            <Input
              style={{ width: 180 }}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="输入用户 ID"
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" icon={<SearchOutlined />} loading={loading} onClick={handleSimulate}>
              模拟请求
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* 4. 整体布局 - Row gutter */}
      <Row gutter={16}>
        {/* 左侧：商品推荐面板 */}
        <Col span={8}>
          <Card
            title={<><MobileOutlined style={{ marginRight: 4 }} />商品点单页-左侧推荐菜单</>}
            extra={<Tag>{`共${capacity}个坑位`}</Tag>}
          >
            {result.isFallback && (
              <Alert
                type="warning"
                showIcon
                message="当前为兜底推荐"
                style={{ marginBottom: 8 }}
              />
            )}
            {result.plan && (
              <Alert
                type="success"
                showIcon
                message={`命中成功 — ${result.plan.name}`}
                style={{ marginBottom: 8 }}
              />
            )}

            {/* 商品列表 */}
            <div style={{ maxHeight: 400, overflow: 'auto' }}>
              <List
                dataSource={allSlots}
                renderItem={(slot) => (
                  <List.Item style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <Space>
                      <Avatar size="small" style={{ backgroundColor: '#1677ff' }}>
                        #{slot.slotIndex}
                      </Avatar>
                      <div>
                        <div style={{ fontWeight: 500 }}>
                          {slot.product ? slot.product.name : '空置'}
                        </div>
                        {slot.product && (
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {slot.product.category}
                          </Typography.Text>
                        )}
                      </div>
                    </Space>
                    {slot.product ? (
                      <Space>
                        <Typography.Text type="danger" strong>{`\uFFE5${slot.product.price}`}</Typography.Text>
                        <Tag color="green" style={{ margin: 0 }}>在售</Tag>
                      </Space>
                    ) : (
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>推荐位暂缺</Typography.Text>
                    )}
                  </List.Item>
                )}
              />
            </div>
          </Card>
        </Col>

        {/* 右侧：调试面板 */}
        <Col span={16}>
          <Tabs
            type="card"
            size="small"
            defaultActiveKey="hit"
            items={[
              {
                key: 'hit',
                label: '命中逻辑',
                children: loading ? (
                  <Skeleton active paragraph={{ rows: 6 }} />
                ) : result.plan || result.slots.length > 0 ? (
                  <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    {/* 投放计划 + 策略组合 */}
                    <Card size="small" title="投放信息">
                      <Descriptions bordered column={2} size="small">
                        <Descriptions.Item label="投放计划">
                          {result.plan ? (
                            <Space size={4}>
                              <Typography.Text strong>{result.plan.name}</Typography.Text>
                              <Tag color="green">投放中</Tag>
                              <Typography.Text type="secondary">优先级 {result.plan.priority}</Typography.Text>
                            </Space>
                          ) : (
                            <Space size={4}>
                              <Typography.Text style={{ fontWeight: 400 }}>未命中</Typography.Text>
                              <Tag>走兜底逻辑</Tag>
                            </Space>
                          )}
                        </Descriptions.Item>
                        <Descriptions.Item label="策略组合">
                          {result.plan ? (
                            <Space size={4}>
                              <Typography.Text strong>
                                {state.combinations.find((c) => c.id === result.plan?.combinationId)?.name ?? '—'}
                              </Typography.Text>
                              <Tag color="green">已生效</Tag>
                            </Space>
                          ) : (
                            <Space size={4}>
                              <Typography.Text style={{ fontWeight: 400 }}>无</Typography.Text>
                              <Tag>兜底热销榜</Tag>
                            </Space>
                          )}
                        </Descriptions.Item>
                      </Descriptions>
                    </Card>

                    {/* 排序策略层 */}
                    <Card size="small" title="排序策略层">
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        {result.slots.length > 0 ? (
                          result.slots.map((slot) => (
                            <Space key={slot.slotId} size={4} wrap>
                              <Tag color="processing">{`坑位#${slot.slotIndex}`}</Tag>
                              <ArrowRightOutlined style={{ color: 'var(--ant-color-text-quaternary)', fontSize: 12 }} />
                              <Tag color={slot.strategyName ? 'blue' : 'default'}>
                                {slot.strategyName || '兜底'}
                              </Tag>
                              <ArrowRightOutlined style={{ color: 'var(--ant-color-text-quaternary)', fontSize: 12 }} />
                              {slot.product ? (
                                <Tag color="green">{slot.product.name}</Tag>
                              ) : (
                                <Typography.Text type="secondary">{slot.reason}</Typography.Text>
                              )}
                            </Space>
                          ))
                        ) : (
                          <Typography.Text type="secondary">无策略数据</Typography.Text>
                        )}
                      </Space>
                    </Card>

                    {/* 人群画像 */}
                    <Card size="small" title="人群画像">
                      {result.inferredSegments.length > 0 ? (
                        <Space size={[6, 6]} wrap>
                          {result.inferredSegments.map((seg) => (
                            <Tag key={seg.id} color="blue">{seg.name}</Tag>
                          ))}
                        </Space>
                      ) : (
                        <Typography.Text type="secondary">暂无画像</Typography.Text>
                      )}
                    </Card>
                  </Space>
                ) : (
                  <Empty description="请选择门店和资源位，点击模拟请求" />
                ),
              },
              {
                key: 'miss',
                label: '未命中诊断',
                children: result.missedPlans && result.missedPlans.length > 0 ? (
                  <Table
                    columns={diagColumns}
                    dataSource={result.missedPlans}
                    rowKey="planId"
                    pagination={false}
                    size="middle"
                  />
                ) : (
                  <Alert type="success" showIcon message="全部命中" description="所有资源位均正常展示推荐内容。" />
                ),
              },
            ]}
          />
        </Col>
      </Row>
    </div>
  )
}
