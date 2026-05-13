import { DeleteOutlined, PlusOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons'
import {
  AutoComplete,
  Button,
  Drawer,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { formatDate } from '../lib/domain'
import { FEILIAN_DIRECTORY } from '../lib/mockData'
import { CURRENT_USER, useAdminStore } from '../lib/store'
import type { FeilianProfile, Role, User, UserStatus } from '../lib/types'

const { Title, Text } = Typography

export function UsersListPage() {
  const { state, createUser, updateUser, deleteUser } = useAdminStore()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [feilianProfile, setFeilianProfile] = useState<FeilianProfile | null>(null)
  const [feilianQuery, setFeilianQuery] = useState('')
  const [form] = Form.useForm()

  const dataSource = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return state.users
      .filter((u) => !keyword || u.username.toLowerCase().includes(keyword) || u.displayName.toLowerCase().includes(keyword) || u.phone.includes(keyword))
      .filter((u) => !roleFilter || u.roleIds.includes(roleFilter))
      .filter((u) => !statusFilter || u.status === statusFilter)
      .map((user) => ({
        ...user,
        key: user.id,
        roleNames: user.roleIds
          .map((rid) => state.roles.find((r) => r.id === rid)?.name)
          .filter((n): n is string => Boolean(n)),
      }))
  }, [state.users, state.roles, search, roleFilter, statusFilter])

  const feilianOptions = useMemo(() => {
    const q = feilianQuery.trim().toLowerCase()
    const existingUsernames = new Set(state.users.map((u) => u.username))
    const candidates = FEILIAN_DIRECTORY.filter((p) => !existingUsernames.has(p.username))
    const matched = q
      ? candidates.filter((p) =>
          p.displayName.toLowerCase().includes(q)
          || p.username.toLowerCase().includes(q)
          || p.phone.includes(q),
        )
      : candidates
    return matched.slice(0, 8).map((p) => ({
      value: p.displayName,
      label: `${p.displayName}（${p.department}）`,
      profile: p,
    }))
  }, [feilianQuery, state.users])

  function handleCreate() {
    setEditingUser(null)
    setFeilianProfile(null)
    setFeilianQuery('')
    form.resetFields()
    form.setFieldsValue({ status: 'ACTIVE', roleIds: [] })
    setDrawerOpen(true)
  }

  function handleEdit(user: User) {
    setEditingUser(user)
    setFeilianProfile({
      displayName: user.displayName,
      employeeId: user.employeeId ?? '',
      username: user.username,
      phone: user.phone,
      email: user.email,
      jobTitle: user.jobTitle ?? '',
      department: user.department ?? '',
      reportsTo: user.reportsTo ?? '',
    })
    setFeilianQuery(user.displayName)
    form.setFieldsValue({
      displayName: user.displayName,
      roleIds: user.roleIds,
      remark: user.remark ?? '',
      status: user.status,
    })
    setDrawerOpen(true)
  }

  function handleSelectFeilian(_: string, option: { profile: FeilianProfile }) {
    setFeilianProfile(option.profile)
    setFeilianQuery(option.profile.displayName)
    form.setFieldValue('displayName', option.profile.displayName)
  }

  function handleToggleStatus(user: User) {
    const nextStatus: UserStatus = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
    updateUser(user.id, { ...user, status: nextStatus })
  }

  function handleDelete(user: User) {
    Modal.confirm({
      title: '确认删除',
      content: `确认删除用户「${user.displayName}」吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => deleteUser(user.id),
    })
  }

  function handleSave() {
    form.validateFields().then((values) => {
      if (!feilianProfile) {
        form.setFields([{ name: 'displayName', errors: ['请通过姓名联想从飞连选择员工'] }])
        return
      }
      const profile = feilianProfile
      if (!editingUser) {
        const dup = state.users.some((u) => u.username === profile.username)
        if (dup) {
          form.setFields([{ name: 'displayName', errors: ['该员工已添加，请直接编辑现有账号'] }])
          return
        }
      }
      const patch: Partial<User> = {
        username: profile.username,
        displayName: profile.displayName,
        email: profile.email,
        phone: profile.phone,
        employeeId: profile.employeeId,
        jobTitle: profile.jobTitle,
        department: profile.department,
        reportsTo: profile.reportsTo,
        roleIds: values.roleIds,
        remark: values.remark || '',
        status: values.status,
      }
      if (editingUser) {
        updateUser(editingUser.id, { ...editingUser, ...patch })
      } else {
        const id = createUser()
        const draft = state.users.find((u) => u.id === id)
        if (draft) {
          updateUser(id, { ...draft, ...patch } as User)
        }
      }
      setDrawerOpen(false)
      form.resetFields()
      setFeilianProfile(null)
      setFeilianQuery('')
    })
  }

  function closeDrawer() {
    setDrawerOpen(false)
    form.resetFields()
    setFeilianProfile(null)
    setFeilianQuery('')
  }

  const columns: ColumnsType<(typeof dataSource)[number]> = [
    {
      title: '用户账号',
      dataIndex: 'username',
      key: 'username',
      render: (text: string, record) => (
        <Space>
          <UserOutlined style={{ color: 'var(--ant-color-text-quaternary)' }} />
          <Button type="link" style={{ padding: 0 }} onClick={() => handleEdit(record)}>
            {text}
          </Button>
        </Space>
      ),
    },
    {
      title: '用户姓名',
      dataIndex: 'displayName',
      key: 'displayName',
      width: 120,
    },
    {
      title: '角色',
      key: 'role',
      width: 220,
      render: (_, record) => (
        <Flex wrap="wrap" gap={4}>
          {record.roleNames.length === 0
            ? <Text type="secondary">—</Text>
            : record.roleNames.map((name) => (
                <Tag key={name} color="blue" style={{ margin: 0 }}>{name}</Tag>
              ))}
        </Flex>
      ),
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 140,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 200,
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      width: 240,
      render: (text: string | undefined) => text || <Text type="secondary">—</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: UserStatus) => (
        <Tag color={status === 'ACTIVE' ? 'success' : 'default'}>
          {status === 'ACTIVE' ? '正常' : '已禁用'}
        </Tag>
      ),
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 160,
      render: (text: string | null) => text ? formatDate(text) : '—',
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_, record) => {
        const isOwner = record.createdBy === CURRENT_USER
        return (
          <Space>
            <Button type="link" size="small" style={{ padding: 0 }} onClick={() => handleEdit(record)}>
              编辑
            </Button>
            <Button type="link" size="small" style={{ padding: 0 }} onClick={() => handleToggleStatus(record)}>
              {record.status === 'ACTIVE' ? '禁用' : '启用'}
            </Button>
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
          </Space>
        )
      },
    },
  ]

  const roleOptions = state.roles.map((r: Role) => ({ label: r.name, value: r.id }))

  return (
    <Space direction="vertical" size="large" style={{ display: 'flex' }}>
      <Space direction="vertical" size={4}>
        <Title level={4} style={{ margin: 0 }}>用户管理</Title>
        <Text type="secondary">从飞连员工目录添加账号并分配角色（无需手动设置密码）</Text>
      </Space>

      <Row justify="space-between" align="middle">
        <Space>
          <Input
            placeholder="搜索用户账号/姓名/手机号"
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 240 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            placeholder="角色"
            allowClear
            style={{ width: 140 }}
            value={roleFilter || undefined}
            onChange={(v) => setRoleFilter(v || '')}
            options={roleOptions}
          />
          <Select
            placeholder="状态"
            allowClear
            style={{ width: 100 }}
            value={statusFilter || undefined}
            onChange={(v) => setStatusFilter(v || '')}
            options={[
              { label: '正常', value: 'ACTIVE' },
              { label: '已禁用', value: 'DISABLED' },
            ]}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新建用户
        </Button>
      </Row>

      <Table
        columns={columns}
        dataSource={dataSource}
        scroll={{ x: 1280 }}
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }}
        locale={{ emptyText: <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
      />

      <Drawer
        title={editingUser ? `编辑用户 - ${editingUser.displayName}` : '新建用户'}
        open={drawerOpen}
        onClose={closeDrawer}
        width={560}
        footer={
          <Flex justify="end" gap={8}>
            <Button onClick={closeDrawer}>取消</Button>
            <Button type="primary" onClick={handleSave}>保存</Button>
          </Flex>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="displayName"
            label="用户姓名"
            rules={[{ required: true, message: '请输入用户姓名' }]}
            extra={editingUser ? '编辑模式下姓名不可更改' : '输入姓名从飞连员工目录联想，命中后自动带出工号、账号、手机号等信息'}
          >
            <AutoComplete
              disabled={Boolean(editingUser)}
              value={feilianQuery}
              options={feilianOptions}
              onSearch={(v) => {
                setFeilianQuery(v)
                if (feilianProfile && v !== feilianProfile.displayName) {
                  setFeilianProfile(null)
                }
              }}
              onSelect={handleSelectFeilian}
              placeholder="输入姓名搜索飞连员工"
              filterOption={false}
              allowClear
              onClear={() => {
                setFeilianProfile(null)
                setFeilianQuery('')
                form.setFieldValue('displayName', '')
              }}
            />
          </Form.Item>

          <Form.Item label="员工工号">
            <Input value={feilianProfile?.employeeId ?? ''} disabled placeholder="选择员工后自动带出" />
          </Form.Item>

          <Form.Item label="用户账号">
            <Input value={feilianProfile?.username ?? ''} disabled placeholder="选择员工后自动带出" />
          </Form.Item>

          <Form.Item label="手机号">
            <Input value={feilianProfile?.phone ?? ''} disabled placeholder="选择员工后自动带出" />
          </Form.Item>

          <Form.Item label="邮箱">
            <Input value={feilianProfile?.email ?? ''} disabled placeholder="选择员工后自动带出" />
          </Form.Item>

          <Form.Item label="职位">
            <Input value={feilianProfile?.jobTitle ?? ''} disabled placeholder="选择员工后自动带出" />
          </Form.Item>

          <Form.Item label="任职部门">
            <Input value={feilianProfile?.department ?? ''} disabled placeholder="选择员工后自动带出" />
          </Form.Item>

          <Form.Item label="直接上级">
            <Input value={feilianProfile?.reportsTo ?? ''} disabled placeholder="选择员工后自动带出" />
          </Form.Item>

          <Form.Item
            name="roleIds"
            label="角色"
            rules={[{ required: true, message: '请选择角色', type: 'array', min: 1 }]}
            extra="可多选，最终权限为所选角色权限的并集"
          >
            <Select mode="multiple" allowClear placeholder="选择一个或多个角色" options={roleOptions} />
          </Form.Item>

          <Form.Item name="remark" label="备注">
            <Input.TextArea placeholder="请输入备注信息" rows={3} maxLength={200} showCount />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            initialValue="ACTIVE"
          >
            <Select
              options={[
                { label: '正常', value: 'ACTIVE' },
                { label: '已禁用', value: 'DISABLED' },
              ]}
            />
          </Form.Item>
        </Form>
      </Drawer>
    </Space>
  )
}
