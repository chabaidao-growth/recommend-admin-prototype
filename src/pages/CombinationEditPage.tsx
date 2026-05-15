import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  HolderOutlined,
} from '@ant-design/icons'
import {
  Button,
  Breadcrumb,
  Card,
  Col,
  Empty,
  Flex,
  Input,
  InputNumber,
  message,
  Modal,
  Row,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { createId, estimateCombinationCoverage } from '../lib/domain'
import { canEditEntity, useAdminStore } from '../lib/store'
import type { Combination, CombinationSlot } from '../lib/types'

const GROUP_COLORS = ['#1677ff', '#fa8c16', '#52c41a', '#722ed1', '#eb2f96', '#13c2c2']

export function CombinationEditPage() {
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { state, updateCombination, deleteCombination } = useAdminStore()
  const combination = state.combinations.find((item) => item.id === id)
  const [draft, setDraft] = useState<Combination | null>(combination ?? null)
  const isOwner = combination ? canEditEntity(combination) : false
  const [isEditing, setIsEditing] = useState(false)
  const readonly = !isEditing
  const location = useLocation()
  const [isNewSession] = useState((location.state as any)?.isNew === true)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )


  // 策略分组：统计每个策略被哪些 slot 使用
  const strategyGroups = useMemo(() => {
    if (!draft) return { indexes: new Map(), colors: new Map() }
    const groups = new Map<string | null, number[]>()
    draft.slots.forEach((slot, index) => {
      const key = slot.strategyId
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(index)
    })
    // 只为出现 2 次以上的策略分配颜色
    const colorMap = new Map<string, string>()
    let ci = 0
    for (const [strategyId, indexes] of groups) {
      if (!strategyId || indexes.length < 2) continue
      colorMap.set(strategyId, GROUP_COLORS[ci % GROUP_COLORS.length])
      ci += 1
    }
    return { indexes: groups, colors: colorMap }
  }, [draft?.slots])

  useEffect(() => {
    setDraft(combination ?? null)
  }, [combination])

  // 新建后自动进入编辑态
  useEffect(() => {
    if ((location.state as any)?.initialMode === 'edit') setIsEditing(true)
  }, [])

  // 坑位数变化时自动补齐或截断 slots
  const targetSlotCount = draft?.slotCount ?? 0
  useEffect(() => {
    if (!draft || targetSlotCount === 0) return
    const current = draft.slots.length
    if (current === targetSlotCount) return
    let slots = [...draft.slots]
    if (current < targetSlotCount) {
      // 补齐
      for (let i = current; i < targetSlotCount; i++) {
        slots.push({ id: createId('slot'), strategyId: null })
      }
    } else {
      // 截尾
      if (!isNewSession) {
        message.warning(`已从 ${current} 个坑位调整为 ${targetSlotCount} 个，末尾 ${current - targetSlotCount} 个已移除`)
      }
      slots = slots.slice(0, targetSlotCount)
    }
    setDraft({ ...draft, slots })
  }, [draft?.slotCount, targetSlotCount])

  if (!combination || !draft) {
    return (
      <Empty description="组合不存在，请返回组合列表重新选择。">
        <Button type="primary" onClick={() => navigate('/combinations')}>返回列表</Button>
      </Empty>
    )
  }

  const coverage = estimateCombinationCoverage(state, draft)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = draft!.slots.findIndex((slot) => slot.id === active.id)
    const newIndex = draft!.slots.findIndex((slot) => slot.id === over.id)
    setDraft({ ...draft!, slots: arrayMove(draft!.slots, oldIndex, newIndex) })
  }

  function handleSlotChange(slotId: string, patch: Partial<CombinationSlot>) {
    setDraft((current) => current
      ? { ...current, slots: current.slots.map((slot) => (slot.id === slotId ? { ...slot, ...patch } : slot)) }
      : current)
  }

  function handleSave() {
    if (!draft) return
    if (!draft.name.trim()) {
      Modal.warning({
        title: '保存失败',
        content: '策略组合名称不能为空',
        okText: '知道了',
      })
      return
    }
    if (!draft.slotCount || draft.slotCount < 1 || draft.slotCount > 50) {
      Modal.warning({
        title: '保存失败',
        content: '坑位数必须在 1-50 之间',
        okText: '知道了',
      })
      return
    }
    const missingStrategySlots = draft.slots.filter((s) => !s.strategyId)
    if (missingStrategySlots.length > 0) {
      const indexes = missingStrategySlots.map((s) => `POS ${draft.slots.indexOf(s) + 1}`).join('、')
      Modal.warning({
        title: '保存失败',
        content: `请为 ${indexes} 选择策略`,
        okText: '知道了',
      })
      return
    }
    updateCombination(draft.id, { ...draft, name: draft.name.trim() })
    navigate('/combinations')
  }

  function handleCancel() {
    if (isNewSession) {
      deleteCombination(draft!.id)
      navigate('/combinations')
      return
    }
    setDraft(combination ?? null)
    setIsEditing(false)
  }

  function handleBack() {
    if (isNewSession && isEditing) deleteCombination(draft!.id)
    navigate('/combinations')
  }

  function handleDelete() {
    Modal.confirm({
      title: '确认删除',
      content: `确认删除策略组合「${draft!.name}」吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        deleteCombination(draft!.id)
        navigate('/combinations')
      },
    })
  }

  function handleToggleStatus() {
    updateCombination(draft!.id, {
      ...draft!,
      status: draft!.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
    })
  }

  return (
    <Flex vertical style={{ gap: 24 }}>
      <Breadcrumb
        items={[
          { title: '推荐系统' },
          { title: <a onClick={() => navigate('/combinations')}>策略组合</a> },
          { title: isEditing ? '编辑' : '详情' },
        ]}
        style={{ marginBottom: 8 }}
      />
      {/* 页面头部 */}
      <Flex align="center" justify="space-between">
        <Flex align="center" gap={12}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={handleBack} />
          <Typography.Title level={4} style={{ margin: 0 }}>
            {isEditing ? draft.name : combination.name}
          </Typography.Title>
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
                      <Button onClick={handleToggleStatus}>{draft.status === 'ACTIVE' ? '停用' : '启用'}</Button>
                      {draft.status === 'ACTIVE' ? (
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
                      <Button icon={<EditOutlined />} disabled>编辑</Button>
                      <Button disabled>{draft.status === 'ACTIVE' ? '停用' : '启用'}</Button>
                    </>
                  )}
                </>
              )
          }
        </Space>
      </Flex>

      <Row gutter={24}>
        {/* 坑位配置 + 全局策略 */}
        <Col span={24}>
          <Flex vertical gap={24}>
            {/* 基本信息 */}
            <Card title="基本信息">
              <Flex vertical gap={16}>
                <Flex align="center" gap={12}>
                  <Typography.Text style={{ width: 72, flexShrink: 0 }}>组合名称</Typography.Text>
                  {readonly ? (
                    <Typography.Text>{draft.name || '—'}</Typography.Text>
                  ) : (
                    <Input
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      placeholder="请输入组合名称"
                      maxLength={30}
                      showCount
                      style={{ width: 320 }}
                    />
                  )}
                </Flex>
                <Flex align="center" gap={12}>
                  <Typography.Text style={{ width: 72, flexShrink: 0 }}>组合 ID</Typography.Text>
                  <Typography.Text copyable={{ text: draft.id }}>{draft.id}</Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>（系统自动生成，用于装修配置）</Typography.Text>
                </Flex>
                <Flex align="center" gap={12}>
                  <Typography.Text style={{ width: 72, flexShrink: 0 }}>坑位数</Typography.Text>
                {readonly ? (
                  <Typography.Text>{draft.slotCount}</Typography.Text>
                ) : !isNewSession ? (
                  <Tooltip title="保存后不可修改坑位数，如需调整请通过「复制」生成新组合">
                    <InputNumber
                      value={draft.slotCount}
                      min={1}
                      max={50}
                      precision={0}
                      disabled
                      style={{ width: 120 }}
                    />
                  </Tooltip>
                ) : (
                  <InputNumber
                    value={draft.slotCount}
                    onChange={(value) => setDraft({ ...draft, slotCount: value ?? 0 })}
                    min={1}
                    max={50}
                    precision={0}
                    placeholder="请输入坑位数（1-50）"
                    style={{ width: 160 }}
                  />
                )}
              </Flex>
              </Flex>
            </Card>

            {/* 坑位配置区 */}
            <Card
              title={
                <Flex align="center" gap={12}>
                  <span>坑位配置（共 {targetSlotCount} 个坑位）</span>
                  <Typography.Text type="secondary">覆盖 {coverage} 件商品</Typography.Text>
                </Flex>
              }
            >
              {targetSlotCount === 0 ? (
                <Empty description="请输入坑位数" />
              ) : (
                <Flex vertical gap={16}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={draft.slots.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                    {draft.slots.map((slot, index) => {
                      const groupColor = slot.strategyId
                        ? strategyGroups.colors.get(slot.strategyId)
                        : undefined
                      const sameStrategySlots = slot.strategyId
                        ? strategyGroups.indexes.get(slot.strategyId) ?? []
                        : []
                      const isFirst = sameStrategySlots[0] === index
                      const posInGroup = sameStrategySlots.findIndex((i: number) => i === index)
                      const prevIndex = posInGroup > 0 ? sameStrategySlots[posInGroup - 1] : undefined
                      return (
                        <div key={slot.id}>
                          <SlotCard
                            index={index}
                            slot={slot}
                            readonly={readonly}
                            groupColor={groupColor}
                            continuation={(!isFirst && sameStrategySlots.length > 1 && prevIndex !== undefined)
                              ? {
                                  prevIndex,
                                  displayRank: posInGroup + 1,
                                  color: groupColor ?? 'var(--ant-color-primary)',
                                }
                              : undefined}
                            onChange={(patch) => handleSlotChange(slot.id, patch)}
                          />
                        </div>
                      )
                    })}
                  </SortableContext>
                </DndContext>
              </Flex>
              )}
            </Card>

            {/* 全局策略区 */}
            <Card title="全局策略">
              <Flex vertical gap={16}>
                <Flex align="center" gap={8}>
                  <Typography.Text>Session 内去重</Typography.Text>
                  <Tag color="success">已开启</Tag>
                  <Typography.Text type="secondary">（系统默认开启，不可关闭）</Typography.Text>
                </Flex>
              </Flex>
            </Card>
          </Flex>
        </Col>
      </Row>
    </Flex>
  )
}

function SlotCard({
  index,
  slot,
  readonly,
  groupColor,
  continuation,
  onChange,
}: {
  index: number
  slot: CombinationSlot
  readonly: boolean
  groupColor?: string
  continuation?: { prevIndex: number; displayRank: number; color: string }
  onChange: (patch: Partial<CombinationSlot>) => void
}) {
  const { state } = useAdminStore()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slot.id })
  const strategy = state.strategies.find((item) => item.id === slot.strategyId)
  const pool = state.pools.find((item) => item.id === strategy?.poolId)

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        transition,
        opacity: isDragging ? 0.5 : 1,
        background: isDragging ? 'var(--ant-color-fill-quaternary)' : undefined,
        position: 'relative',
      }}
    >
      {/* 左侧色条分组 */}
      {groupColor && (
        <div style={{
          position: 'absolute',
          left: 0,
          top: 8,
          bottom: 8,
          width: 4,
          borderRadius: 2,
          background: groupColor,
        }} />
      )}
      <Card size="small" bodyStyle={{ padding: '12px 16px' }}>
        <Flex align="center" gap={12}>
          {/* 拖拽手柄 */}
          {!readonly && (
            <span
              {...attributes}
              {...listeners}
              style={{ cursor: 'grab', color: 'var(--ant-color-text-quaternary)', fontSize: 16, flexShrink: 0 }}
            >
              <HolderOutlined />
            </span>
          )}
          {/* 序号 */}
          <Tag style={{ fontSize: 14, fontWeight: 600, minWidth: 48, textAlign: 'center', margin: 0 }}>
            POS {index + 1}
          </Tag>
          {/* 策略选择 + 选品来源 + 接续说明 */}
          <Flex vertical gap={4} style={{ flex: 1, minWidth: 0 }}>
            <Select
              value={slot.strategyId ?? undefined}
              placeholder="请选择策略"
              onChange={(value) => onChange({ strategyId: value || null })}
              allowClear
              disabled={readonly}
              style={{ width: '100%' }}
              options={state.strategies
                .filter((item) => item.status === 'ACTIVE' || item.id === slot.strategyId)
                .map((item) => ({
                  value: item.id,
                  label: item.status === 'INACTIVE'
                    ? `${item.name} · ${item.mode}（已停用）`
                    : `${item.name} · ${item.mode}`,
                  disabled: item.status === 'INACTIVE',
                  style: item.status === 'INACTIVE' ? { color: 'var(--ant-color-text-tertiary)' } : undefined,
                }))}
            />
            {pool && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                选品来源：{pool.name}
              </Typography.Text>
            )}
            {/* 接续说明（非起始位） */}
            {continuation && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                <span style={{ color: continuation.color, marginRight: 4 }}>●</span>
                接续 POS {continuation.prevIndex + 1}，展示第 {continuation.displayRank} 名
              </Typography.Text>
            )}
          </Flex>
        </Flex>
      </Card>
    </div>
  )
}
