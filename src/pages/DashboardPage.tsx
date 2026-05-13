import { useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts'
import { getAbTestTable, getDashboardSeries, getMetricSummary } from '../lib/domain'
import { useAdminStore } from '../lib/store'
import type { DashboardMetric } from '../lib/types'
import {
  Card,
  Col,
  Row,
  Segmented,
  Select,
  Statistic,
  Table,
  Typography,
} from 'antd'
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

const { Title, Paragraph } = Typography

const metricOptions = [
  { label: 'CTR', value: 'ctr' },
  { label: 'CVR', value: 'cvr' },
  { label: '曝光量', value: 'exposure' },
]

const abColumns: ColumnsType<{
  id: string
  planName: string
  name: string
  ctr: string
  cvr: string
  exposure: number
  significance: string
}> = [
  { title: '计划', dataIndex: 'planName', key: 'planName' },
  {
    title: '分组名称',
    dataIndex: 'name',
    key: 'name',
    render: (text: string) => <strong>{text}</strong>,
  },
  { title: 'CTR', dataIndex: 'ctr', key: 'ctr', render: (v: string) => `${v}%` },
  { title: 'CVR', dataIndex: 'cvr', key: 'cvr', render: (v: string) => `${v}%` },
  { title: '曝光量', dataIndex: 'exposure', key: 'exposure' },
  { title: '显著性', dataIndex: 'significance', key: 'significance' },
]

const antdColors = ['#1677FF', '#52C41A', '#FAAD14', '#722ED1', '#EB2F96', '#13C2C2']

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <Card
      size="small"
      style={{
        boxShadow: 'var(--ant-box-shadow-secondary)',
        minWidth: 160,
      }}
      styles={{ body: { padding: '8px 12px' } }}
    >
      <Typography.Text strong style={{ fontSize: 12, marginBottom: 6, display: 'block' }}>
        {label}
      </Typography.Text>
      {payload.map((entry, index) => (
        <div
          key={entry.dataKey}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            fontSize: 12,
            lineHeight: '22px',
            color: 'var(--ant-color-text)',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: antdColors[index % antdColors.length],
                opacity: 0.85,
              }}
            />
            {entry.name}
          </span>
          <Typography.Text strong>{entry.value}</Typography.Text>
        </div>
      ))}
    </Card>
  )
}

export function DashboardPage() {
  const { state } = useAdminStore()
  const [metric, setMetric] = useState<DashboardMetric>('ctr')
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>(() => {
    const first = state.plans.find((p) => p.status !== 'ENDED')
    return first ? [first.id] : []
  })

  const chartSeries = getDashboardSeries(state, metric, selectedPlanIds, [])
  const ctr = getMetricSummary(state, 'ctr', selectedPlanIds, [])
  const cvr = getMetricSummary(state, 'cvr', selectedPlanIds, [])
  const exposure = getMetricSummary(state, 'exposure', selectedPlanIds, [])
  const abTable = getAbTestTable(state, selectedPlanIds)
  const lineKeys = chartSeries.flatMap((row) =>
    Object.keys(row).filter((key) => key !== 'date'),
  )
  const uniqueLineKeys = [...new Set(lineKeys)]

  const planOptions = state.plans
    .filter((plan) => plan.status !== 'ENDED')
    .map((plan) => ({ label: plan.name, value: plan.id }))

  return (
    <div>
      <Title level={3}>数据报告</Title>
      <Paragraph type="secondary">查看推荐位各维度的运营效果数据</Paragraph>

      <Card title="筛选器" style={{ marginBottom: 16 }}>
        <Row gutter={[24, 16]}>
          <Col span={24}>
            <Typography.Text strong style={{ marginRight: 12, marginBottom: 8, display: 'inline-block' }}>投放计划</Typography.Text>
            <Select
              mode="multiple"
              options={planOptions}
              value={selectedPlanIds}
              onChange={setSelectedPlanIds}
              placeholder="选择投放计划"
              style={{ width: '100%', maxWidth: 400, marginBottom: 8 }}
              allowClear
            />
          </Col>
        </Row>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="CTR"
              value={ctr.value}
              precision={2}
              suffix="%"
              prefix={
                ctr.delta >= 0 ? (
                  <ArrowUpOutlined style={{ color: 'var(--ant-color-success)' }} />
                ) : (
                  <ArrowDownOutlined style={{ color: 'var(--ant-color-error)' }} />
                )
              }
            />
            <Typography.Text type="secondary">
              {ctr.delta >= 0 ? '+' : ''}{ctr.delta.toFixed(2)} 环比
            </Typography.Text>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="CVR"
              value={cvr.value}
              precision={2}
              suffix="%"
              prefix={
                cvr.delta >= 0 ? (
                  <ArrowUpOutlined style={{ color: 'var(--ant-color-success)' }} />
                ) : (
                  <ArrowDownOutlined style={{ color: 'var(--ant-color-error)' }} />
                )
              }
            />
            <Typography.Text type="secondary">
              {cvr.delta >= 0 ? '+' : ''}{cvr.delta.toFixed(2)} 环比
            </Typography.Text>
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="曝光量"
              value={Math.round(exposure.value)}
              prefix={
                exposure.delta >= 0 ? (
                  <ArrowUpOutlined style={{ color: 'var(--ant-color-success)' }} />
                ) : (
                  <ArrowDownOutlined style={{ color: 'var(--ant-color-error)' }} />
                )
              }
            />
            <Typography.Text type="secondary">
              {exposure.delta >= 0 ? '+' : ''}{Math.abs(exposure.delta).toFixed(0)} 环比
            </Typography.Text>
          </Card>
        </Col>
      </Row>

      <Card
        title="趋势图"
        extra={
          <Segmented
            options={metricOptions}
            value={metric}
            onChange={(value) => setMetric(value as DashboardMetric)}
          />
        }
        style={{ marginBottom: 16 }}
      >
        <div style={{ width: '100%', height: 360 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--ant-color-border-secondary)" />
              <XAxis dataKey="date" stroke="var(--ant-color-border)" tick={{ fill: 'var(--ant-color-text-secondary)', fontSize: 12 }} />
              <YAxis domain={['auto', 'auto']} stroke="var(--ant-color-border)" tick={{ fill: 'var(--ant-color-text-secondary)', fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {uniqueLineKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={antdColors[index % antdColors.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {abTable.length > 0 && (
        <Card title="实验效果对比">
          <Table
            columns={abColumns}
            dataSource={abTable}
            rowKey="id"
            pagination={false}
            size="middle"
          />
        </Card>
      )}
    </div>
  )
}
