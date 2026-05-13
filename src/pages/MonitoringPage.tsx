import { useMemo, useState } from 'react'
import { Card, Col, Form, Radio, Row, Select, Space, Statistic, Table, Tag, Typography, DatePicker } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ArrowDownOutlined, ArrowUpOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { useAdminStore } from '../lib/store'
import type { DashboardPoint } from '../lib/types'

const { RangePicker } = DatePicker

const planTableColumns: ColumnsType<{
  planId: string
  planName: string
  ctr: number
  cvr: number
  exposure: number
  status: string
}> = [
  {
    title: '投放计划',
    dataIndex: 'planName',
    key: 'planName',
    render: (text: string) => <Typography.Text strong>{text}</Typography.Text>,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 80,
    render: (text: string) => {
      const colorMap: Record<string, string> = {
        投放中: 'green',
        已暂停: 'orange',
        草稿: 'default',
        已结束: 'default',
      }
      return <Tag color={colorMap[text] ?? 'default'}>{text}</Tag>
    },
  },
  {
    title: 'CTR',
    dataIndex: 'ctr',
    key: 'ctr',
    width: 100,
    render: (v: unknown) => typeof v === 'number'
      ? <Typography.Text type={v > 5 ? 'success' : 'secondary'}>{v.toFixed(2)}%</Typography.Text>
      : '--',
  },
  {
    title: 'CVR',
    dataIndex: 'cvr',
    key: 'cvr',
    width: 100,
    render: (v: unknown) => typeof v === 'number'
      ? <Typography.Text type={v > 2 ? 'success' : 'secondary'}>{v.toFixed(2)}%</Typography.Text>
      : '--',
  },
  {
    title: '曝光量',
    dataIndex: 'exposure',
    key: 'exposure',
    width: 120,
    render: (v: unknown) => typeof v === 'number' ? v.toLocaleString() : '--',
    sorter: (a, b) => a.exposure - b.exposure,
    defaultSortOrder: 'descend',
  },
]

const experimentColumns: ColumnsType<{
  key: string
  name: string
  traffic: number
  ctr: number
  cvr: number
  significance: string
}> = [
  {
    title: '实验组',
    dataIndex: 'name',
    key: 'name',
    render: (text: string) => <Typography.Text strong>{text}</Typography.Text>,
  },
  {
    title: '流量占比',
    dataIndex: 'traffic',
    key: 'traffic',
    width: 100,
    render: (v: unknown) => typeof v === 'number' ? `${v}%` : '--',
  },
  {
    title: 'CTR',
    dataIndex: 'ctr',
    key: 'ctr',
    width: 100,
    render: (v: unknown) => typeof v === 'number' ? `${v.toFixed(2)}%` : '--',
  },
  {
    title: 'CVR',
    dataIndex: 'cvr',
    key: 'cvr',
    width: 100,
    render: (v: unknown) => typeof v === 'number' ? `${v.toFixed(2)}%` : '--',
  },
  {
    title: '显著性',
    dataIndex: 'significance',
    key: 'significance',
    width: 100,
    render: (text: string) => {
      const color = text === '显著' ? 'green' : text === '基线' ? 'default' : 'orange'
      return <Tag color={color}>{text}</Tag>
    },
  },
]

export function MonitoringPage() {
  const { state } = useAdminStore()
  const [selectedPlans, setSelectedPlans] = useState<string[]>(['plan-lunch'])
  const [activeMetric, setActiveMetric] = useState<string>('ctr')
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>([dayjs().subtract(1, 'day'), dayjs()])

  const series = state.dashboardSeries

  const metrics = useMemo(() => ({
    avgCtr: 10.48,
    avgCvr: 3.25,
    totalExposure: 2828000, // GMV = totalExposure * 0.5 = 1414000
    emptyRate: 0.0,
  }), [])

  // 投放计划曝光量 Top3 — 硬编码 mock，完全独立于 series
  const planTableDataSource = [
    { planId: 'plan-lunch', planName: '午高峰果茶加推', status: '投放中', ctr: 11.20, cvr: 3.21, exposure: 28500 },
    { planId: 'plan-new-user', planName: '新用户首单推荐', status: '投放中', ctr: 9.80, cvr: 2.85, exposure: 19200 },
    { planId: 'plan-autumn', planName: '秋季上新预热', status: '已暂停', ctr: 7.90, cvr: 2.30, exposure: 15800 },
  ]

  // 实验对比 — 硬编码 mock，完全独立于 planTableDataSource
  const experimentTableDataSource = [
    { key: 'exp-a', name: '对照组 A', traffic: 50, ctr: 8.2, cvr: 2.1, significance: '基线' },
    { key: 'exp-b', name: '实验组 B（个性化推荐）', traffic: 50, ctr: 10.5, cvr: 2.8, significance: '显著' },
  ]

  const planOptions = state.plans.map((p) => ({ label: p.name, value: p.id }))

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Header */}
      <Space direction="vertical" size={4}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          效果监控
        </Typography.Title>
        <Typography.Text type="secondary">
          实时查看推荐系统核心指标：CTR、CVR、归因 GMV、坑位空置率
        </Typography.Text>
      </Space>

      {/* ===== 第 1 行：时间区间筛选（影响全页） ===== */}
      <Form layout="inline">
        <Form.Item label="时间区间">
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
            placeholder={['开始日期', '结束日期']}
          />
        </Form.Item>
      </Form>

      {/* ===== 第 2 行：投放计划效果表格（全局 Top 3，独立） ===== */}
      <Card size="small" title="投放计划曝光量 Top3">
        <Table
          columns={planTableColumns}
          dataSource={planTableDataSource}
          rowKey="planId"
          pagination={{ pageSize: 3, showSizeChanger: false, hideOnSinglePage: true }}
          size="small"
          locale={{ emptyText: '暂无数据' }}
        />
      </Card>

      {/* ===== 第 3 行：投放计划 Select（影响下方指标卡片、趋势图、实验对比） ===== */}
      <Form layout="inline">
        <Form.Item label="投放计划">
          <Select
            mode="tags"
            style={{ width: 240 }}
            value={selectedPlans.length > 0 ? selectedPlans : undefined}
            onChange={(v) => setSelectedPlans(v ?? [])}
            options={planOptions}
            allowClear
            placeholder="选择投放计划"
          />
        </Form.Item>
      </Form>

      {/* ===== 第 4 行：4 个核心指标卡片 ===== */}
      <Row gutter={16}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="推荐位 CTR"
              value={metrics.avgCtr}
              suffix="%"
              precision={2}
              valueStyle={{ color: '#3f8600' }}
              prefix={<ArrowUpOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="推荐位 CVR"
              value={metrics.avgCvr}
              suffix="%"
              precision={2}
              valueStyle={{ color: '#3f8600' }}
              prefix={<ArrowUpOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="归因 GMV"
              value={metrics.totalExposure * 0.5}
              prefix="¥"
              valueStyle={{ color: '#3f8600' }}
              precision={0}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="坑位空置率"
              value={metrics.emptyRate}
              suffix="%"
              precision={1}
              valueStyle={{ color: '#cf1322' }}
              prefix={<ArrowDownOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* ===== 第 5 行：趋势图 ===== */}
      <Card
        title="趋势图"
        extra={
          <Radio.Group
            className="ant-radio-group-button"
            buttonStyle="solid"
            value={activeMetric}
            onChange={(e) => setActiveMetric(e.target.value)}
          >
            <Radio.Button value="ctr">CTR</Radio.Button>
            <Radio.Button value="cvr">CVR</Radio.Button>
            <Radio.Button value="exposure">曝光量</Radio.Button>
          </Radio.Group>
        }
      >
        <div style={{ height: 280, padding: '0 8px' }}>
          <TrendChart data={series} metric={activeMetric} />
        </div>
      </Card>

      {/* ===== 第 6 行：实验对比 ===== */}
      <Card size="small" title="实验对比">
        <Table
          columns={experimentColumns}
          dataSource={experimentTableDataSource}
          rowKey="key"
          pagination={false}
          size="small"
        />
      </Card>
    </Space>
  )
}

function TrendChart({ data, metric }: { data: DashboardPoint[]; metric: string }) {
  const width = 800
  const height = 260
  const padTop = 20
  const padBottom = 30
  const padLeft = 50
  const padRight = 20

  // Aggregate by date — only valid entries
  const dailyMap = useMemo(() => {
    const map = new Map<string, number>()
    const countMap = new Map<string, number>()
    for (const d of data) {
      const val = metric === 'exposure' ? d.exposure : metric === 'ctr' ? d.ctr : d.cvr
      if (typeof val !== 'number') continue
      const existing = map.get(d.date) ?? 0
      const count = countMap.get(d.date) ?? 0
      map.set(d.date, existing + val)
      countMap.set(d.date, count + 1)
    }
    return { map, countMap }
  }, [data, metric])

  const dates = Array.from(dailyMap.map.keys()).sort()

  // Compute average per date for ctr/cvr, sum for exposure
  const finalValues = dates.map((date) => {
    const total = dailyMap.map.get(date)!
    if (metric !== 'exposure') {
      const count = dailyMap.countMap.get(date) ?? 1
      return Math.round(total / count * 100) / 100
    }
    return total
  })

  if (finalValues.length < 2) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography.Text type="secondary">暂无趋势数据</Typography.Text>
      </div>
    )
  }

  const maxVal = Math.max(...finalValues)
  const minVal = Math.min(...finalValues)
  const range = maxVal - minVal || 1
  const plotW = width - padLeft - padRight
  const plotH = height - padTop - padBottom

  const xStep = plotW / (dates.length - 1)
  const points = finalValues.map((v, i) => ({
    x: padLeft + i * xStep,
    y: padTop + plotH - ((v - minVal) / range) * plotH,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  // Grid lines (5 horizontal) — clip labels that would overflow
  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const y = padTop + (plotH / 4) * i
    const val = maxVal - (range / 4) * i
    return { y, label: i === 4 && minVal === 0 ? '0' : Math.round(val * 100) / 100 }
  })

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Grid */}
      {gridLines.map((g, i) => (
        <g key={i}>
          <line x1={padLeft} y1={g.y} x2={width - padRight} y2={g.y} stroke="#f0f0f0" strokeWidth={1} />
          <text x={padLeft - 8} y={g.y + 4} textAnchor="end" fontSize={10} fill="#999">{g.label}</text>
        </g>
      ))}

      {/* X-axis labels */}
      {dates.map((d, i) => {
        if (dates.length > 14 && i % 3 !== 0) return null
        const x = padLeft + i * (dates.length > 1 ? plotW / (dates.length - 1) : 0)
        return <text key={d} x={x} y={height - 4} textAnchor="middle" fontSize={9} fill="#999">{d.slice(5)}</text>
      })}

      {/* Area fill */}
      <path
        d={`${linePath} L${points[points.length - 1].x.toFixed(1)},${(padTop + plotH).toFixed(1)} L${points[0].x.toFixed(1)},${(padTop + plotH).toFixed(1)} Z`}
        fill="#1677ff"
        opacity={0.06}
      />

      {/* Line */}
      <path d={linePath} fill="none" stroke="#1677ff" strokeWidth={2} />

      {/* Data points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="#fff" stroke="#1677ff" strokeWidth={2} />
      ))}
    </svg>
  )
}
