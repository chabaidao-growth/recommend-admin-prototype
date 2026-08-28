import { useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  Layout,
  Menu,
  message,
  Modal,
  Radio,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { MenuProps } from 'antd'
import {
  DeleteOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  SaveOutlined,
  SearchOutlined,
  SettingOutlined,
  TagsOutlined,
  TeamOutlined,
} from '@ant-design/icons'

const { Sider, Header, Content } = Layout
const { Title, Text } = Typography

interface SplitLayer {
  key: string
  name: string
  ratio: number | null
}

type EstimateResult = Record<string, number>

const TOTAL_USERS = 1_286_400
const FALLBACK_USERS = 36_200
const MAX_LAYERS = 8

let layerSeq = 3

const cdpMenuItems: MenuProps['items'] = [
  { key: 'home', icon: <HomeOutlined />, label: '首页' },
  {
    key: 'tag-group',
    icon: <TagsOutlined />,
    label: '标签管理',
    children: [
      { key: 'tag-list', label: '标签列表' },
      { key: 'tag-category', label: '标签类目' },
    ],
  },
  {
    key: 'crowd-group',
    icon: <TeamOutlined />,
    label: '人群管理',
    children: [
      { key: 'crowd-list', label: '人群列表' },
      { key: 'crowd-save', label: '保存人群' },
    ],
  },
  { key: 'settings', icon: <SettingOutlined />, label: '系统设置' },
]

export function Q3CdpAlgorithmSplitPage() {
  const [form] = Form.useForm()
  const [splitMode, setSplitMode] = useState<'count' | 'ratio' | 'algorithm'>('algorithm')
  const [layers, setLayers] = useState<SplitLayer[]>([
    { key: 'layer-1', name: '高敏感人群', ratio: 10 },
    { key: 'layer-2', name: '中敏感人群', ratio: 20 },
  ])
  const [estimates, setEstimates] = useState<EstimateResult>({})
  const [estimating, setEstimating] = useState(false)

  const configuredTotal = useMemo(
    () => layers.reduce((sum, layer) => sum + (layer.ratio ?? 0), 0),
    [layers],
  )
  const remainRatio = 100 - configuredTotal
  const ratioValid = configuredTotal <= 100

  function invalidateEstimates() {
    setEstimates({})
  }

  function updateLayer(key: string, patch: Partial<SplitLayer>) {
    setLayers((prev) => prev.map((layer) => (layer.key === key ? { ...layer, ...patch } : layer)))
    invalidateEstimates()
  }

  function addLayer() {
    if (layers.length >= MAX_LAYERS) return
    setLayers((prev) => [...prev, { key: `layer-${layerSeq++}`, name: '', ratio: null }])
    invalidateEstimates()
  }

  function removeLayer(key: string) {
    if (layers.length <= 1) return
    setLayers((prev) => prev.filter((layer) => layer.key !== key))
    invalidateEstimates()
  }

  function handleEstimate() {
    if (!ratioValid) {
      message.error('子人群比例合计不能超过 100%')
      return
    }
    setEstimating(true)
    window.setTimeout(() => {
      const next: EstimateResult = {}
      layers.forEach((layer, index) => {
        const jitter = 0.97 + ((index * 7) % 5) * 0.01
        next[layer.key] = Math.round(TOTAL_USERS * ((layer.ratio ?? 0) / 100) * jitter)
      })
      next.__remain = Math.round(TOTAL_USERS * (remainRatio / 100) * 0.99)
      next.__fallback = FALLBACK_USERS
      setEstimates(next)
      setEstimating(false)
    }, 600)
  }

  function handleSave() {
    if (splitMode === 'algorithm') {
      if (!ratioValid) {
        message.error('子人群比例合计不能超过 100%，请调整后再保存')
        return
      }
      if (layers.some((layer) => !layer.name.trim())) {
        message.error('存在未命名的子人群，请填写名称后再保存')
        return
      }
    }
    Modal.success({
      title: '保存成功',
      content:
        splitMode === 'algorithm'
          ? `已按算法分层拆分生成 ${layers.length} 个子人群${remainRatio > 0 ? '、1 个剩余人群' : ''}与 1 个兜底人群。`
          : '人群已保存。',
    })
  }

  const layerColumns = [
    {
      title: '子人群名称',
      dataIndex: 'name',
      render: (_: unknown, record: SplitLayer) => (
        <Input
          placeholder="请输入子人群名称"
          value={record.name}
          onChange={(event) => updateLayer(record.key, { name: event.target.value })}
          style={{ maxWidth: 220 }}
        />
      ),
    },
    {
      title: (
        <Space size={4}>
          比例（%）
          <Tooltip title="按目标人群包内的排名百分位切分：先按订单用券率降序、再按全核销率降序排序，取前 N% 用户。仅支持整数。">
            <InfoCircleOutlined style={{ color: 'rgba(0,0,0,0.45)' }} />
          </Tooltip>
        </Space>
      ),
      dataIndex: 'ratio',
      width: 260,
      render: (_: unknown, record: SplitLayer, index: number) => {
        const start = layers.slice(0, index).reduce((sum, layer) => sum + (layer.ratio ?? 0), 0)
        return (
          <Space size={8}>
            <InputNumber
              min={1}
              max={100 - start}
              precision={0}
              placeholder="整数百分比"
              value={record.ratio}
              onChange={(value) => updateLayer(record.key, { ratio: value })}
              addonAfter="%"
            />
            <Text type="secondary">排名前 {start}% – {start + (record.ratio ?? 0)}%</Text>
          </Space>
        )
      },
    },
    {
      title: '预计人数',
      dataIndex: 'estimate',
      width: 160,
      render: (_: unknown, record: SplitLayer) =>
        estimates[record.key] != null ? (
          <Text>{estimates[record.key].toLocaleString()} 人</Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: unknown, record: SplitLayer) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          disabled={layers.length <= 1}
          onClick={() => removeLayer(record.key)}
        />
      ),
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={216} theme="dark">
        <Flex align="center" gap={8} style={{ height: 56, padding: '0 16px' }}>
          <TagsOutlined style={{ color: '#fff', fontSize: 18 }} />
          <Text strong style={{ color: '#fff', fontSize: 14 }}>茶百道 · 标签管理系统</Text>
        </Flex>
        <Menu
          theme="dark"
          mode="inline"
          defaultOpenKeys={['tag-group', 'crowd-group']}
          selectedKeys={['crowd-save']}
          items={cdpMenuItems}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            height: 56,
          }}
        >
          <Text type="secondary">人群管理 / 保存人群</Text>
        </Header>

        <Content style={{ padding: 24, background: '#f5f5f5' }}>
          <Card>
            <Flex justify="space-between" align="center">
              <Title level={4} style={{ margin: 0 }}>保存人群</Title>
              <Space>
                <Button>取消</Button>
                <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>保存</Button>
              </Space>
            </Flex>
            <Divider />

            <Form
              form={form}
              layout="vertical"
              initialValues={{ autoUpdate: true, scene: 'coupon', crowdName: 'Q3 高敏感发券目标人群' }}
              style={{ maxWidth: 720 }}
            >
              <Form.Item label="人群名称" name="crowdName" rules={[{ required: true, message: '请输入人群名称' }]}>
                <Input placeholder="请输入人群名称" maxLength={30} showCount />
              </Form.Item>

              <Form.Item label="自动更新" name="autoUpdate" valuePropName="checked" extra="开启后，人群按更新周期自动刷新">
                <Switch />
              </Form.Item>

              <Form.Item label="使用场景类型" name="scene" rules={[{ required: true, message: '请选择使用场景类型' }]}>
                <Select
                  options={[
                    { value: 'coupon', label: '优惠券发放' },
                    { value: 'sms', label: '短信触达' },
                    { value: 'push', label: 'Push 推送' },
                  ]}
                  style={{ maxWidth: 320 }}
                />
              </Form.Item>

              <Form.Item label="自定义拆分人群">
                <Radio.Group
                  value={splitMode}
                  onChange={(event) => setSplitMode(event.target.value)}
                  optionType="button"
                  buttonStyle="solid"
                  options={[
                    { value: 'count', label: '按人数拆分' },
                    { value: 'ratio', label: '按比例拆分' },
                    { value: 'algorithm', label: '算法分层拆分' },
                  ]}
                />
              </Form.Item>
            </Form>

            {splitMode === 'algorithm' && (
              <Card
                type="inner"
                title="算法分层拆分配置"
                extra={<Tag color="blue">目标人群包共 {TOTAL_USERS.toLocaleString()} 人</Tag>}
              >
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message="排序口径：仅在当前目标人群包内，统计用户最近一年行为，严格按「订单用券率 DESC、全核销率 DESC」排序后按整数百分比分层。"
                  description="从排名第一的用户开始顺序切分；未覆盖部分自动归入「剩余人群」；最近一年无有效支付订单或无收券记录的用户固定进入「兜底人群」，不参与分层。"
                />

                <Table<SplitLayer>
                  rowKey="key"
                  size="middle"
                  pagination={false}
                  dataSource={layers}
                  columns={layerColumns}
                  footer={() => (
                    <Flex vertical gap={8}>
                      <Flex justify="space-between" align="center">
                        <Space>
                          <Text strong>剩余人群</Text>
                          <Text type="secondary">排名前 {configuredTotal}% – 100%</Text>
                        </Space>
                        <Space size={16}>
                          <Text type={ratioValid ? 'secondary' : 'danger'}>
                            占比 {remainRatio}%{!ratioValid ? '（总比例已超 100%）' : ''}
                          </Text>
                          <Text>
                            预计 {estimates.__remain != null ? `${estimates.__remain.toLocaleString()} 人` : '—'}
                          </Text>
                        </Space>
                      </Flex>
                      <Flex justify="space-between" align="center">
                        <Space>
                          <Text strong>兜底人群</Text>
                          <Tag>数据不足</Tag>
                        </Space>
                        <Space size={16}>
                          <Text type="secondary">固定独立人群</Text>
                          <Text>
                            预计 {estimates.__fallback != null ? `${estimates.__fallback.toLocaleString()} 人` : '—'}
                          </Text>
                        </Space>
                      </Flex>
                    </Flex>
                  )}
                />

                <Flex justify="space-between" align="center" style={{ marginTop: 16 }}>
                  <Space>
                    <Button
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={addLayer}
                      disabled={layers.length >= MAX_LAYERS}
                    >
                      新增子人群（{layers.length}/{MAX_LAYERS}）
                    </Button>
                    <Text type={ratioValid ? 'secondary' : 'danger'}>
                      已配置总比例 {configuredTotal}% / 100%
                    </Text>
                  </Space>
                  <Button
                    icon={<SearchOutlined />}
                    loading={estimating}
                    onClick={handleEstimate}
                    disabled={!ratioValid}
                  >
                    查询预计人数
                  </Button>
                </Flex>

                {!ratioValid && (
                  <Alert
                    type="error"
                    showIcon
                    style={{ marginTop: 16 }}
                    message="子人群比例合计超过 100%，请减少某一层比例后再保存。"
                  />
                )}
              </Card>
            )}

            {splitMode !== 'algorithm' && (
              <Alert
                type="info"
                showIcon
                message={
                  splitMode === 'count'
                    ? '按人数拆分：将目标人群按固定人数随机拆成若干子人群。'
                    : '按比例拆分：将目标人群按百分比随机拆成若干子人群。'
                }
              />
            )}
          </Card>
        </Content>
      </Layout>
    </Layout>
  )
}
