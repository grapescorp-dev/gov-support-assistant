import { useState, useRef, useEffect } from 'react'
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import { Home, User, Search, Calendar, FileText, ChevronDown, Check, Plus, LogOut, UserCircle } from 'lucide-react'
import { useProfileStore } from '../../stores/useProfileStore'

const navItems = [
  { to: '/', icon: Home, label: '홈' },
  { to: '/profile', icon: User, label: '프로필' },
  { to: '/search', icon: Search, label: '검색' },
  { to: '/calendar', icon: Calendar, label: '캘린더' },
  { to: '/documents', icon: FileText, label: '문서' },
]

// 프로필 드롭다운 컴포넌트 (로그인 상태)
function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  const { profiles, activeProfileId, getActiveProfile, setActiveProfile, logout } =
    useProfileStore()

  const activeProfile = getActiveProfile()

  // 외부 클릭 감지
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSwitchProfile = (profileId) => {
    setActiveProfile(profileId)
    setIsOpen(false)
  }

  const handleLogout = () => {
    logout()
    setIsOpen(false)
    navigate('/profile/select')
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
      >
        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
          {activeProfile?.name?.charAt(0) || '?'}
        </div>
        <span className="hidden sm:inline max-w-[100px] truncate">
          {activeProfile?.name || '프로필'}
        </span>
        <ChevronDown
          size={16}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500">프로필 전환</p>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                onClick={() => handleSwitchProfile(profile.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors ${
                  profile.id === activeProfileId ? 'bg-blue-50' : ''
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    profile.id === activeProfileId
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {profile.name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {profile.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {profile.serviceName || '서비스명 미설정'}
                  </p>
                </div>
                {profile.id === activeProfileId && (
                  <Check size={16} className="text-blue-500 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-1">
            <Link
              to="/profile"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <User size={16} />
              프로필 관리
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={16} />
              로그아웃
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// 로그인 버튼 (비로그인 상태)
function LoginButton() {
  return (
    <Link
      to="/profile/select"
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
    >
      <UserCircle size={18} />
      프로필 선택
    </Link>
  )
}

export function Layout() {
  const { isLoggedIn } = useProfileStore()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-xl font-bold text-blue-600">
              정부지원사업 어시스턴트
            </Link>
            <nav className="hidden md:flex gap-1">
              {/* eslint-disable-next-line no-unused-vars */}
              {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`
                  }
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          {isLoggedIn ? <ProfileDropdown /> : <LoginButton />}
        </div>

        {/* 모바일 네비게이션 */}
        <nav className="md:hidden flex border-t border-gray-100 overflow-x-auto">
          {/* eslint-disable-next-line no-unused-vars */}
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-500'
                }`
              }
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Outlet />
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
          정부지원사업 매칭 및 작성 지원 서비스
        </div>
      </footer>
    </div>
  )
}
