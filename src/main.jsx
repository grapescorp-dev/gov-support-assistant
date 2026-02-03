import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerHardFilterDebugGlobal } from './utils/hardFilterDebug'

// Hard Filter 디버그 함수 등록 (개발 환경에서 콘솔 확인용)
registerHardFilterDebugGlobal()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
