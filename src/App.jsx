import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/common/Layout'
import { HomePage } from './pages/HomePage'
import { ProfilePage } from './pages/ProfilePage'
import { ProfileSelectPage } from './pages/ProfileSelectPage'
import { SearchPage } from './pages/SearchPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { EditorPage } from './pages/EditorPage'
import { CalendarPage } from './pages/CalendarPage'
import { ToastContainer } from './components/common/Toast'
import { useProfileStore } from './stores/useProfileStore'

// 로그인 필요 페이지를 위한 보호 라우트
function ProtectedRoute({ children }) {
  const { isLoggedIn } = useProfileStore()

  if (!isLoggedIn) {
    return <Navigate to="/profile/select" replace />
  }

  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 프로필 선택 페이지 (레이아웃 없이) */}
        <Route path="/profile/select" element={<ProfileSelectPage />} />

        {/* 메인 레이아웃 */}
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="profile" element={<ProfilePage />} />

          {/* 로그인 필요 페이지들 */}
          <Route
            path="search"
            element={
              <ProtectedRoute>
                <SearchPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="calendar"
            element={
              <ProtectedRoute>
                <CalendarPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="documents"
            element={
              <ProtectedRoute>
                <DocumentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="editor/:docId"
            element={
              <ProtectedRoute>
                <EditorPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  )
}

export default App
