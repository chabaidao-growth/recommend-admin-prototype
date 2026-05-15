import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Avatar,
  Breadcrumb,
  Button,
  Card,
  Collapse,
  Descriptions,
  Drawer,
  Empty,
  Flex,
  Input,
  List,
  message,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { TableProps } from 'antd'
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  ImportOutlined,
  LinkOutlined,
  PlusOutlined,
  SaveOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { formatDate, getPoolReferences, productMap } from '../lib/domain'
import { CURRENT_USER, useAdminStore } from '../lib/store'
import type { Product } from '../lib/types'
import { isBeverage } from '../lib/types'

const { Title, Text } = Typography

export function PoolDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { state, updatePool, deletePool } = useAdminStore()
  const pool = state.pools.find((p) => p.id === id)
  const productsById = productMap(state)

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [addDrawerOpen, setAddDrawerOpen] = useState(false)
  const [addSearchQuery, setAddSearchQuery] = useState('')

  // 基础信息编辑态
  const [editingInfo, setEditingInfo] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [descDraft, setDescDraft] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  if (!pool) {
    return (
      <Card>
        <Empty description="选品池不存在，可能已被删除">
          <Button type="primary" onClick={() => navigate('/pools')}>
            返回列表
          </Button>
        </Empty>
      </Card>
    )
  }

  const isSystem = pool.kind === 'SYSTEM'
  const isOwner = pool.createdBy === CURRENT_USER
  const canEditProducts = isOwner && !isSystem
  const references = getPoolReferences(state, pool.id)

  const poolProducts = useMemo(() => {
    return pool.productIds
      .map((pid) => productsById[pid])
      .filter((p) => p && isBeverage(p))
  }, [pool.productIds, productsById])

  const filteredProducts = useMemo(() => {
    if (!debouncedQuery.trim()) return poolProducts
    const q = debouncedQuery.trim().toLowerCase()
    return poolProducts.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q),
    )
  }, [poolProducts, debouncedQuery])

  const availableProducts = useMemo(() => {
    const existingIds = new Set(pool.productIds)
    const all = state.products.filter((p) => !existingIds.has(p.id) && isBeverage(p))
    if (!addSearchQuery.trim()) return all
    const q = addSearchQuery.trim().toLowerCase()
    return all.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q),
    )
  }, [state.products, pool.productIds, addSearchQuery])

  // Import parsing
  const parsedTokens = importText
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean)
  const allUniqueTokens = [...new Set(parsedTokens)]
  const uniqueTokens = allUniqueTokens.slice(0, 500)
  const validProducts = state.products.filter((p) => uniqueTokens.includes(p.spuId) && isBeverage(p))
  const duplicateProducts = validProducts.filter((p) => pool.productIds.includes(p.id))
  const effectiveProducts = validProducts.filter((p) => !pool.productIds.includes(p.id))
  const invalidTokens = uniqueTokens.filter(
    (token) => !state.products.some((p) => p.spuId === token),
  )

  function persist(nextProductIds: string[]) {
    updatePool(pool!.id, { ...pool!, productIds: nextProductIds })
  }

  function handleAddProducts(productIds: string[]) {
    const merged = [...new Set([...pool!.productIds, ...productIds])]
    const now = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' }).replace('T', ' ').slice(0, 16)
    const newTimes = { ...pool!.productAddedTimes }
    for (const pid of productIds) {
      if (!newTimes[pid]) newTimes[pid] = now
    }
    updatePool(pool!.id, { ...pool!, productIds: merged, productAddedTimes: newTimes })
    message.success(`已添加 ${productIds.length} 件商品`)
  }

  function handleRemove(productId: string) {
    persist(pool!.productIds.filter((pid) => pid !== productId))
    message.success('已移除')
  }

  function handleBatchRemove() {
    persist(pool!.productIds.filter((pid) => !selectedRowKeys.includes(pid)))
    message.success(`已移除 ${selectedRowKeys.length} 件商品`)
    setSelectedRowKeys([])
  }

  function handleImport() {
    const merged = [...new Set([...pool!.productIds, ...effectiveProducts.map((p) => p.id)])]
    const now = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' }).replace('T', ' ').slice(0, 16)
    const newTimes = { ...pool!.productAddedTimes }
    for (const p of effectiveProducts) {
      if (!newTimes[p.id]) newTimes[p.id] = now
    }
    updatePool(pool!.id, { ...pool!, productIds: merged, productAddedTimes: newTimes })
    setImportOpen(false)
    setImportText('')
    message.success(`已导入 ${effectiveProducts.length} 件商品`)
  }

  function startEditInfo() {
    setNameDraft(pool!.name)
    setDescDraft(pool!.description || '')
    setEditingInfo(true)
  }

  function saveInfo() {
    updatePool(pool!.id, { ...pool!, name: nameDraft.trim() || pool!.name, description: descDraft.trim() })
    setEditingInfo(false)
    message.success('基础信息已保存')
  }

  function cancelEditInfo() {
    setEditingInfo(false)
  }

  const columns: TableProps<Product>['columns'] = [
    {
      title: '商品',
      key: 'product',
      render: (_, record) => (
        <Space>
          <Avatar
            size={40}
            shape="square"
            style={{ background: record.accent, color: '#fff', fontSize: 12, fontWeight: 600 }}
          >
            {record.name.slice(0, 2)}
          </Avatar>
          <Typography.Text strong>{record.name}</Typography.Text>
        </Space>
      ),
    },
    {
      title: '品类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      filters: [...new Set(poolProducts.map((p) => p.category))].map((c) => ({
        text: c,
        value: c,
      })),
      onFilter: (value, record) => record.category === value,
    },
    {
      title: '添加时间',
      key: 'addTime',
      width: 140,
      defaultSortOrder: 'descend' as const,
      sorter: (a: Product, b: Product) => {
        const tA = pool.productAddedTimes[a.id] || pool.createdAt
        const tB = pool.productAddedTimes[b.id] || pool.createdAt
        return new Date(tA).getTime() - new Date(tB).getTime()
      },
      render: (_: unknown, record: Product) => formatDate(pool.productAddedTimes[record.id] || pool.createdAt),
    },
  ]

  if (canEditProducts) {
    columns.push({
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Popconfirm
          title="确认移除该商品？"
          description="仅解除关联，不会删除商品本身。"
          onConfirm={() => handleRemove(record.id)}
          okText="移除"
          cancelText="取消"
        >
          <Button type="link" danger size="small">
            移除
          </Button>
        </Popconfirm>
      ),
    })
  }

  return (
    <Flex vertical gap={24}>
      <Breadcrumb
        items={[
          { title: '推荐系统' },
          { title: <a onClick={() => navigate('/pools')}>商品选品池</a> },
          { title: '详情' },
        ]}
        style={{ marginBottom: 8 }}
      />
      {/* 返回导航 */}
      <Flex align="center" gap={12}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/pools')}
        />
        <Title level={4} style={{ margin: 0 }}>{pool.name}</Title>
        {isSystem && <Tag color="blue">系统内置</Tag>}
      </Flex>

      {/* ====== 区域一：基础信息 ====== */}
      <Card
        title="基础信息"
        extra={
          isSystem ? null : editingInfo ? (
            <Space size={8}>
              <Button type="primary" icon={<SaveOutlined />} onClick={saveInfo}>保存</Button>
              <Button onClick={cancelEditInfo}>取消</Button>
            </Space>
          ) : (
            <Space size={8}>
              {isOwner ? (
                <Button icon={<EditOutlined />} onClick={startEditInfo}>编辑基础信息</Button>
              ) : (
                <Tooltip title="仅创建人可编辑">
                  <Button icon={<EditOutlined />} disabled>编辑基础信息</Button>
                </Tooltip>
              )}
              {isOwner ? (
                <Button
                  onClick={() => {
                    if (pool.status === 'ACTIVE') {
                      Modal.confirm({
                        title: '确认停用',
                        content: '停用后，使用此选品池的排序策略将无法获取候选商品。确定停用？',
                        okText: '确定停用',
                        cancelText: '取消',
                        okButtonProps: { danger: true },
                        onOk() {
                          updatePool(pool.id, { ...pool, status: 'INACTIVE' })
                          message.success('已停用')
                        },
                      })
                    } else {
                      updatePool(pool.id, { ...pool, status: 'ACTIVE' })
                      message.success('已启用')
                    }
                  }}
                >
                  {pool.status === 'ACTIVE' ? '停用' : '启用'}
                </Button>
              ) : (
                <Tooltip title="仅创建人可操作">
                  <Button disabled>
                    {pool.status === 'ACTIVE' ? '停用' : '启用'}
                  </Button>
                </Tooltip>
              )}
              {isOwner ? (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    if (references.length > 0) {
                      Modal.warning({
                        title: '无法删除',
                        content: `该选品池被 ${references.length} 个排序策略使用，无法删除。请先解除关联。`,
                      })
                    } else {
                      Modal.confirm({
                        title: '确认删除',
                        icon: null,
                        content: (
                          <Flex vertical gap={12}>
                            <Text>确认删除选品池「{pool.name}」吗？删除后不可恢复。</Text>
                            <div>
                              <Text type="secondary" style={{ fontSize: 13 }}>请输入选品池名称以确认：</Text>
                              <Input
                                placeholder={pool.name}
                                id="delete-confirm-input"
                                style={{ marginTop: 4 }}
                                onChange={(e) => {
                                  const btn = document.querySelector('.ant-modal-confirm-btns .ant-btn-dangerous') as HTMLButtonElement | null
                                  if (btn) btn.disabled = e.target.value.trim() !== pool.name
                                }}
                              />
                            </div>
                          </Flex>
                        ),
                        okText: '确认删除',
                        cancelText: '取消',
                        okButtonProps: { danger: true, disabled: true },
                        onOk() {
                          const input = document.getElementById('delete-confirm-input') as HTMLInputElement | null
                          if (input?.value.trim() !== pool.name) {
                            message.error('名称输入不一致，无法删除')
                            return Promise.reject()
                          }
                          deletePool(pool.id)
                          message.success('已删除')
                          navigate('/pools')
                        },
                      })
                    }
                  }}
                >
                  删除
                </Button>
              ) : (
                <Tooltip title="仅创建人可操作">
                  <Button danger icon={<DeleteOutlined />} disabled>
                    删除
                  </Button>
                </Tooltip>
              )}
            </Space>
          )
        }
      >
        <Descriptions column={{ xs: 1, sm: 2, md: 4 }}>
          <Descriptions.Item label="选品池名称">
            {editingInfo ? (
              <Input
                value={nameDraft}
                maxLength={30}
                showCount
                style={{ width: 240 }}
                onChange={(e) => setNameDraft(e.target.value)}
              />
            ) : (
              pool.name
            )}
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={pool.status === 'ACTIVE' ? 'success' : 'default'}>
              {pool.status === 'ACTIVE' ? '启用' : '停用'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="商品数量">
            <Text strong>{pool.productIds.length}</Text> 件
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">{formatDate(pool.createdAt)}</Descriptions.Item>
          <Descriptions.Item label="描述" span={2}>
            {editingInfo ? (
              <Input.TextArea
                value={descDraft}
                maxLength={200}
                showCount
                rows={2}
                style={{ maxWidth: 480 }}
                onChange={(e) => setDescDraft(e.target.value)}
              />
            ) : pool.description ? (
              <Text>{pool.description}</Text>
            ) : (
              <Text type="secondary" italic>{isSystem ? '系统内置全量池' : '暂无描述'}</Text>
            )}
          </Descriptions.Item>
          <Descriptions.Item label="创建人">{pool.createdBy}</Descriptions.Item>
          <Descriptions.Item label="最新维护">
            {pool.updatedAt ? `${pool.updatedBy} · ${formatDate(pool.updatedAt)}` : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* ====== 区域二：商品清单 ====== */}
      <Card
        title={`商品清单（${poolProducts.length}）`}
        extra={
          <Space>
            <Input
              placeholder="搜索商品名"
              prefix={<SearchOutlined />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              allowClear
              style={{ width: 220 }}
            />
            {canEditProducts && (
              <>
                <Button icon={<PlusOutlined />} onClick={() => setAddDrawerOpen(true)}>
                  添加商品
                </Button>
                <Button icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>
                  批量导入
                </Button>
              </>
            )}
          </Space>
        }
      >
        {isSystem && (
          <Alert
            type="info"
            showIcon
            message="系统内置全量池，接入饮品货架实时更新，商品由系统自动维护，不支持手动增删。"
            style={{ marginBottom: 16 }}
          />
        )}

        {canEditProducts && selectedRowKeys.length > 0 && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={
              <Flex justify="space-between" align="center">
                <span>已选 {selectedRowKeys.length} 件商品</span>
                <Popconfirm
                  title={`确认移除 ${selectedRowKeys.length} 件商品？`}
                  onConfirm={handleBatchRemove}
                  okText="移除"
                  cancelText="取消"
                >
                  <Button danger size="small" icon={<DeleteOutlined />}>
                    批量移除
                  </Button>
                </Popconfirm>
              </Flex>
            }
          />
        )}

        <Table
          dataSource={filteredProducts}
          columns={columns}
          rowKey="id"
          rowSelection={
            canEditProducts
              ? {
                  selectedRowKeys,
                  onChange: (keys) => setSelectedRowKeys(keys),
                }
              : undefined
          }
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 件商品`,
          }}
          size="middle"
        />
      </Card>

      {/* 关联的排序策略 */}
      <Card>
        <Collapse
          ghost
          items={[
            {
              key: 'refs',
              label: (
                <Space>
                  <LinkOutlined />
                  <span>关联的排序策略（{references.length} 个）</span>
                </Space>
              ),
              children:
                references.length > 0 ? (
                  <List
                    size="small"
                    dataSource={references}
                    renderItem={(strategy) => (
                      <List.Item
                        actions={[
                          <Button
                            type="link"
                            size="small"
                            onClick={() => navigate(`/strategies/${strategy.id}/edit`)}
                          >
                            查看
                          </Button>,
                        ]}
                      >
                        <List.Item.Meta
                          title={strategy.name}
                          description={`排序方式：${strategy.mode === 'HOT' ? '热销排行' : strategy.mode === 'NEW' ? '新品排行' : '人工定序'}`}
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Text type="secondary">暂无排序策略使用此选品池</Text>
                ),
            },
          ]}
        />
      </Card>

      {/* 添加商品 Drawer */}
      <Drawer
        title="添加商品"
        open={addDrawerOpen}
        onClose={() => {
          setAddDrawerOpen(false)
          setAddSearchQuery('')
        }}
        width={520}
      >
        <Flex vertical gap={16}>
          <Input
            placeholder="搜索商品名 / 品类"
            prefix={<SearchOutlined />}
            value={addSearchQuery}
            onChange={(e) => setAddSearchQuery(e.target.value)}
            allowClear
          />
          <List
            size="small"
            dataSource={availableProducts}
            renderItem={(product) => (
              <List.Item
                actions={[
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => {
                      handleAddProducts([product.id])
                    }}
                  >
                    添加
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      size={36}
                      shape="square"
                      style={{ background: product.accent, color: '#fff', fontSize: 11, fontWeight: 600 }}
                    >
                      {product.name.slice(0, 2)}
                    </Avatar>
                  }
                  title={product.name}
                  description={product.category}
                />
              </List.Item>
            )}
            locale={{ emptyText: '没有可添加的商品' }}
          />
        </Flex>
      </Drawer>

      {/* 批量导入 Modal */}
      <Modal
        title="批量导入商品"
        open={importOpen}
        onCancel={() => {
          setImportOpen(false)
          setImportText('')
        }}
        onOk={handleImport}
        okText={`批量添加 ${effectiveProducts.length} 件`}
        okButtonProps={{ disabled: effectiveProducts.length === 0 }}
        cancelText="取消"
        width={560}
      >
        <Flex vertical gap={16}>
          <Text type="secondary">
            粘贴商品标识，支持逗号、空格、换行分隔（上限 500 个）
          </Text>
          <Input.TextArea
            rows={5}
            placeholder="CBD1001, CBD1002, CBD1003..."
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />

          {allUniqueTokens.length > 500 && (
            <Alert
              type="warning"
              showIcon
              message={`当前输入 ${allUniqueTokens.length} 条，超过上限 500 条。仅处理前 500 条。`}
            />
          )}

          {uniqueTokens.length > 0 && (
            <Flex gap={24}>
              <div style={{ flex: 1 }}>
                <Text strong style={{ color: 'var(--ant-color-success)' }}>
                  有效 ({effectiveProducts.length})
                </Text>
                {effectiveProducts.map((p) => (
                  <div key={p.id} style={{ fontSize: 'var(--ant-font-size-sm)', marginTop: 4 }}>
                    {p.name}（{p.category}）
                  </div>
                ))}
                {effectiveProducts.length === 0 && (
                  <Text type="secondary" style={{ fontSize: 'var(--ant-font-size-sm)' }}>暂无</Text>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <Text strong style={{ color: 'var(--ant-color-warning)' }}>
                  重复 ({duplicateProducts.length})
                </Text>
                {duplicateProducts.map((p) => (
                  <div key={p.id} style={{ fontSize: 'var(--ant-font-size-sm)', marginTop: 4 }}>
                    {p.name}（{p.category}）
                  </div>
                ))}
                {duplicateProducts.length === 0 && (
                  <Text type="secondary" style={{ fontSize: 'var(--ant-font-size-sm)' }}>暂无</Text>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <Text strong style={{ color: 'var(--ant-color-error)' }}>
                  无效 ({invalidTokens.length})
                </Text>
                {invalidTokens.map((token) => (
                  <div key={token} style={{ fontSize: 'var(--ant-font-size-sm)', marginTop: 4 }}>
                    {token}
                  </div>
                ))}
                {invalidTokens.length === 0 && (
                  <Text type="secondary" style={{ fontSize: 'var(--ant-font-size-sm)' }}>暂无</Text>
                )}
              </div>
            </Flex>
          )}
        </Flex>
      </Modal>
    </Flex>
  )
}
