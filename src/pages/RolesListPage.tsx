import { DeleteOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import {
  Button,
  Checkbox,
  Divider,
  Drawer,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Popover,
  Row,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { formatDate } from '../lib/domain'
import { CURRENT_USER, useAdminStore } from '../lib/store'
import type { Role } from '../lib/types'

const { Title, Text } = Typography

const MODULES = [
  { key: 'pool', label: '选品池' },
  { key: 'strategy', label: '排序策略' },
  { key: 'combination', label: '策略组合' },
  { key: 'monitoring', label: '效果监控' },
  { key: 'preview', label: '全链路预览' },
  { key: 'user', label: '用户管理' },
  { key: 'role', label: '角色管理' },
]

const MODULE_ACTIONS: Record<string, string[]> = {
  pool: ['pool:read', 'pool:write'],
  strategy: ['strategy:read', 'strategy:write'],
  combination: ['combination:read', 'combination:write'],
  monitoring: ['monitoring:read'],
  preview: ['preview:read'],
  user: ['user:read', 'user:write'],
  role: ['role:read', 'role:write'],
}

export function RolesListPage() {
  const { state, createRole, updateRole, deleteRole } = useAdminStore()
  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [form] = Form.useForm()

  const dataSource = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return state.roles
      .filter((r) => !keyword || r.name.toLowerCase().includes(keyword))
      .map((role) => ({
        ...role,
        key: role.id,
        isSystem: role.kind === 'SYSTEM',
      }))
  }, [state.roles, search])

  function handleCreate() {
    setEditingRole(null)
    form.resetFields()
    form.setFieldsValue({ name: '', description: '', permissions: [] })
    setDrawerOpen(true)
  }

  function handleEdit(role: Role) {
    setEditingRole(role)
    form.setFieldsValue({
      name: role.name,
      description: role.description,
      permissions: role.permissions,
    })
    setDrawerOpen(true)
  }

  function handleDelete(role: Role) {
    if (role.kind === 'SYSTEM') return
    Modal.confirm({
      title: '确认删除',
      content: `确认删除角色「${role.name}」吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => deleteRole(role.id),
    })
  }

  function handleSave() {
    form.validateFields().then((values) => {
      const trimmed = (values.name || '').trim()
      const duplicated = state.roles.some(
        (r) => r.name === trimmed && r.id !== editingRole?.id,
      )
      if (duplicated) {
        form.setFields([{ name: 'name', errors: ['角色名称已存在'] }])
        return
      }
      if (editingRole) {
        updateRole(editingRole.id, {
          ...editingRole,
          name: trimmed,
          description: values.description || '',
          permissions: values.permissions || [],
        })
      } else {
        const id = createRole()
        const role = state.roles.find((r) => r.id === id)
        if (role) {
          updateRole(id, {
            ...role,
            name: trimmed,
            description: values.description || '',
            permissions: values.permissions || [],
          })
        }
      }
      setDrawerOpen(false)
      form.resetFields()
    })
  }

  const columns: ColumnsType<(typeof dataSource)[number]> = [
    {
      title: '角色名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record) => (
        <Space>
          <Button type="link" style={{ padding: 0 }} onClick={() => handleEdit(record)}>
            {text}
          </Button>
          {record.isSystem && <Tag color="blue">系统</Tag>}
        </Space>
      ),
    },
    {
      title: '角色标识',
      dataIndex: 'code',
      key: 'code',
      width: 160,
      render: (code: string) => <Text code>{code}</Text>,
    },
    {
      title: '权限数量',
      dataIndex: 'permissions',
      key: 'permissions',
      width: 420,
      render: (perms: string[]) => (
        <Flex align="center" gap={6} wrap="nowrap">
          <Tag color="blue">{perms.length}</Tag>
          <Flex wrap="nowrap" gap={4}>
            {perms.slice(0, 3).map((p) => (
              <Tag key={p} style={{ margin: 0, fontSize: 11 }}>{p}</Tag>
            ))}
            {perms.length > 3 && (
              <Popover
                title="完整权限列表"
                content={(
                  <Flex wrap="wrap" gap={4} style={{ maxWidth: 420 }}>
                    {perms.map((p) => (
                      <Tag key={p} style={{ margin: 0, fontSize: 11 }}>{p}</Tag>
                    ))}
                  </Flex>
                )}
              >
                <Tag style={{ margin: 0, fontSize: 11, cursor: 'pointer' }}>
                  +{perms.length - 3}
                </Tag>
              </Popover>
            )}
          </Flex>
        </Flex>
      ),
    },
    {
      title: '创建人',
      dataIndex: 'createdBy',
      key: 'createdBy',
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (text: string) => formatDate(text),
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      render: (_, record) => {
        const isOwner = record.createdBy === CURRENT_USER
        return (
          <Space>
            <Button type="link" size="small" style={{ padding: 0 }} onClick={() => handleEdit(record)}>
              {record.isSystem ? '查看' : '编辑'}
            </Button>
            {!record.isSystem && (
              <Button
                type="link"
                size="small"
                style={{ padding: 0 }}
                danger
                icon={<DeleteOutlined />}
                disabled={!isOwner}
                onClick={() => handleDelete(record)}
              >
                删除
              </Button>
            )}
          </Space>
        )
      },
    },
  ]

  return (
    <Space direction="vertical" size="large" style={{ display: 'flex' }}>
      <Space direction="vertical" size={4}>
        <Title level={4} style={{ margin: 0 }}>角色管理</Title>
        <Text type="secondary">管理用户角色与权限分配</Text>
      </Space>

      <Row justify="space-between" align="middle">
        <Input
          placeholder="搜索角色名称"
          prefix={<SearchOutlined />}
          allowClear
          style={{ width: 200 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建角色
        </Button>
      </Row>

      <Table
        columns={columns}
        dataSource={dataSource}
        scroll={{ x: 1150 }}
        pagination={false}
        locale={{ emptyText: <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
      />

      <Drawer
        title={editingRole ? (editingRole.kind === 'SYSTEM' ? `查看角色 - ${editingRole.name}` : `编辑角色 - ${editingRole.name}`) : '新建角色'}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); form.resetFields() }}
        width={560}
        footer={
          <Flex justify="end" gap={8}>
            <Button onClick={() => { setDrawerOpen(false); form.resetFields() }}>
              {editingRole?.kind === 'SYSTEM' ? '关闭' : '取消'}
            </Button>
            {editingRole?.kind !== 'SYSTEM' && (
              <Button type="primary" onClick={handleSave}>保存</Button>
            )}
          </Flex>
        }
      >
        <Form form={form} layout="vertical" disabled={editingRole?.kind === 'SYSTEM'}>
          <Form.Item
            name="name"
            label="角色名称"
            rules={[{ required: true, message: '请输入角色名称' }]}
          >
            <Input placeholder="如：商品运营" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="选填，描述该角色的职责" rows={2} />
          </Form.Item>

          <Divider orientation="left">权限配置</Divider>

          {MODULES.map((mod) => (
            <div key={mod.key} style={{ marginBottom: 16 }}>
              <Text strong style={{ fontSize: 13 }}>{mod.label}</Text>
              <Form.Item
                name="permissions"
                valuePropName="value"
                noStyle
              >
                <Checkbox.Group
                  style={{ display: 'flex', gap: 16, marginTop: 8 }}
                  options={MODULE_ACTIONS[mod.key].map((perm) => ({
                    label: perm.includes('write') ? '编辑' : '查看',
                    value: perm,
                  }))}
                />
              </Form.Item>
            </div>
          ))}
        </Form>
      </Drawer>
    </Space>
  )
}
