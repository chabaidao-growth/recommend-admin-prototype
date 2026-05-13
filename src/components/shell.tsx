import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Breadcrumb, Flex, Layout, Menu, Typography } from 'antd'
import {
  AppstoreOutlined,
  BarChartOutlined,
  EyeOutlined,
  GiftOutlined,
  OrderedListOutlined,
  SafetyOutlined,
  UserOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'

const { Sider, Header, Content } = Layout
const { Text } = Typography

const menuItems: MenuProps['items'] = [
  {
    key: 'group-pool',
    label: '选品管理',
    type: 'group',
    children: [
      {
        key: '/pools',
        label: <NavLink to="/pools">商品选品池</NavLink>,
        icon: <GiftOutlined />,
      },
    ],
  },
  {
    key: 'group-strategy',
    label: '排序策略',
    type: 'group',
    children: [
      {
        key: '/strategies',
        label: <NavLink to="/strategies">排序策略</NavLink>,
        icon: <OrderedListOutlined />,
      },
    ],
  },
  {
    key: '/combinations',
    label: <NavLink to="/combinations">策略组合</NavLink>,
    icon: <AppstoreOutlined />,
  },
  {
    key: '/monitoring',
    label: <NavLink to="/monitoring">效果监控</NavLink>,
    icon: <BarChartOutlined />,
  },
  {
    key: 'group-tools',
    label: '工具 & 诊断',
    type: 'group',
    children: [
      {
        key: '/preview',
        label: <NavLink to="/preview">全链路预览</NavLink>,
        icon: <EyeOutlined />,
      },
    ],
  },
  {
    key: 'group-system',
    label: '系统设置',
    type: 'group',
    children: [
      {
        key: '/users',
        label: <NavLink to="/users">用户管理</NavLink>,
        icon: <UserOutlined />,
      },
      {
        key: '/roles',
        label: <NavLink to="/roles">角色管理</NavLink>,
        icon: <SafetyOutlined />,
      },
    ],
  },
]

const breadcrumbLabels: Record<string, string> = {
  pools: '商品选品池',
  strategies: '排序策略',
  combinations: '策略组合',
  monitoring: '效果监控',
  preview: '全链路预览',
  users: '用户管理',
  roles: '角色管理',
  edit: '编辑',
}

function buildBreadcrumbs(pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  const items = [{ title: '推荐系统' }]

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    // 排序策略子页面：面包屑只到"排序策略"
    if (parts[0] === 'strategies' && i > 0) break
    if (part === 'edit') {
      items.push({ title: '编辑' })
    } else if (breadcrumbLabels[part]) {
      items.push({ title: breadcrumbLabels[part] })
    } else if (i > 0 && !breadcrumbLabels[part]) {
      items.push({ title: '详情' })
    }
  }

  return items
}

export function AppShell() {
  const location = useLocation()
  const breadcrumbs = buildBreadcrumbs(location.pathname)

  const selectedKey = '/' + (location.pathname.split('/')[1] || '')

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={240} theme="light" style={{ borderRight: '1px solid #f0f0f0' }}>
        <Flex
          align="center"
          gap={10}
          style={{ padding: '0 24px', height: 56, borderBottom: '1px solid #f0f0f0' }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'linear-gradient(135deg, #722ed1, #1677ff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            荐
          </div>
          <Text strong style={{ fontSize: 14 }}>推荐系统运营管理后台</Text>
        </Flex>

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          style={{ border: 'none' }}
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
            justifyContent: 'space-between',
            height: 56,
          }}
        >
          <Breadcrumb items={breadcrumbs} />
          <Flex align="center" gap={8}>
            <UserOutlined />
            <Text>陈悦 · 成都大区</Text>
          </Flex>
        </Header>

        <Content style={{ padding: 24, background: '#f5f5f5', minHeight: 0 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
