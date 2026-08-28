import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import 'dayjs/locale/zh-cn'
import { Q3CdpAlgorithmSplitPage } from './pages/Q3CdpAlgorithmSplitPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider locale={zhCN}>
      <Q3CdpAlgorithmSplitPage />
    </ConfigProvider>
  </StrictMode>,
)
