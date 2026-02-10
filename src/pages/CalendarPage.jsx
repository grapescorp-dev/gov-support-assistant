import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfileStore, INTERESTS } from '../stores/useProfileStore'
import { useBookmarkStore } from '../stores/useBookmarkStore'
import { useSearchStore } from '../stores/useSearchStore'
import { mockAnnouncements } from '../data/mockAnnouncements'
import { searchAnnouncements } from '../api/announcements'
import { getAnnouncementLink } from '../utils/getAnnouncementLink'
import {
  calculateMatchingScore,
  calculateDday,
  formatDday,
  groupByMonth,
  formatMonthName,
  extractRegionRestriction,
  getRegionName,
  checkEligibility,
} from '../utils/matchingScore'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  Bookmark,
  BookmarkCheck,
  Building2,
  Clock,
  TrendingUp,
  MapPin,
  Coins,
  Sun,
  Moon,
  UserCircle,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Briefcase,
  CalendarDays,
  Info,
} from 'lucide-react'
import { Link } from 'react-router-dom'

// 맞춤 공고 필터링 기준 점수
const MATCHING_THRESHOLD = 30

/**
 * 공고 유형 배지 컴포넌트
 * - funding: 지원금/과제 (기본값)
 * - event: 행사
 * - info: 안내
 */
function AnnouncementTypeBadge({ type }) {
  const config = {
    funding: { label: '지원금/과제', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', icon: Briefcase },
    event: { label: '행사', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300', icon: CalendarDays },
    info: { label: '안내', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400', icon: Info },
  }

  const { label, color, icon: Icon } = config[type] || config.funding

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${color}`}>
      <Icon size={12} />
      {label}
    </span>
  )
}

const VIEWS = [
  { value: 'monthly', label: '월간' },
  { value: 'quarterly', label: '분기' },
  { value: 'yearly', label: '연간' },
]

// SearchPage와 동일한 카테고리 필터 (INTERESTS 기반)
const CATEGORIES = ['전체', ...INTERESTS.map(i => i.value)]

export function CalendarPage() {
  const navigate = useNavigate()
  const { getActiveProfile } = useProfileStore()
  const { bookmarks, toggleBookmark, isBookmarked } = useBookmarkStore()
  const { results: searchResults, setResults: setSearchResults } = useSearchStore()

  const activeProfile = getActiveProfile()

  // 상태
  const [year, setYear] = useState(new Date().getFullYear())
  const [view, setView] = useState('monthly')
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [selectedOrg, setSelectedOrg] = useState('')
  const [showHighMatchOnly, setShowHighMatchOnly] = useState(false)
  const [showOnlyMatched, setShowOnlyMatched] = useState(false) // 맞춤 공고만 표시
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false)
  const [showExpired, setShowExpired] = useState(false) // 마감된 공고 표시 여부
  const [darkMode, setDarkMode] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [announcements, setAnnouncements] = useState([])

  // API에서 공고 데이터 가져오기
  useEffect(() => {
    const fetchData = async () => {
      // 이미 검색 결과가 있으면 사용
      if (searchResults && searchResults.length > 0) {
        setAnnouncements(searchResults)
        return
      }

      setIsLoading(true)
      try {
        const data = await searchAnnouncements('', {})
        setAnnouncements(data)
        setSearchResults(data) // 검색 스토어에도 저장
      } catch (error) {
        console.error('[CalendarPage] API 오류, mock 데이터 사용:', error)
        setAnnouncements(mockAnnouncements)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 다크모드 토글
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // 기관 목록 추출
  const organizations = useMemo(() => {
    const orgs = [...new Set(announcements.map((a) => a.organization))]
    return orgs.sort()
  }, [announcements])

  // 필터링된 공고 목록
  const filteredAnnouncements = useMemo(() => {
    let filtered = announcements.map((announcement) => {
      const regionRestriction = extractRegionRestriction(announcement)
      const isRegionMismatch =
        activeProfile?.region &&
        regionRestriction.type === 'restricted' &&
        regionRestriction.region !== activeProfile.region

      // 자격 검사 (하드필터 결과 포함)
      const eligibility = checkEligibility(activeProfile, announcement)

      return {
        ...announcement,
        matchingScore: calculateMatchingScore(activeProfile, announcement),
        dday: announcement.deadline ? calculateDday(announcement.deadline) : 999,
        regionRestriction,
        isRegionMismatch,
        eligible: eligibility.eligible,
        hardPass: eligibility.hardPass,
        failReasons: eligibility.failReasons,
      }
    })

    // 연도 필터 (deadline이 있는 경우만)
    filtered = filtered.filter((a) => {
      if (!a.deadline) return false
      const deadlineYear = new Date(a.deadline).getFullYear()
      return deadlineYear === year
    })

    // 카테고리 필터 (INTERESTS 기반, SearchPage와 동일)
    if (selectedCategory !== '전체') {
      const interest = INTERESTS.find(i => i.value === selectedCategory)
      const keywords = interest?.keywords || [selectedCategory.toLowerCase()]

      filtered = filtered.filter((a) => {
        const searchText = [
          a.title || '',
          a.summary || '',
          ...(a.category || []),
          ...(a.tags || []),
          ...(a.eligibility || []),
        ].join(' ').toLowerCase()

        return keywords.some(kw => searchText.includes(kw.toLowerCase()))
      })
    }

    // 기관 필터
    if (selectedOrg) {
      filtered = filtered.filter((a) => a.organization === selectedOrg)
    }

    // 높은 매칭률만 (80% 이상)
    if (showHighMatchOnly) {
      filtered = filtered.filter((a) => a.matchingScore >= 80)
    }

    // 맞춤 공고만 표시 (프로필 있고 토글 켜진 경우)
    // ⚠️ 하드필터 적용: hardPass !== false 조건 추가 (SearchPage와 동일)
    if (showOnlyMatched && activeProfile) {
      filtered = filtered.filter((a) =>
        a.matchingScore >= MATCHING_THRESHOLD &&
        a.eligible &&
        a.hardPass !== false  // 하드필터 통과 또는 unknown만 포함
      )
    }

    // 북마크만
    if (showBookmarksOnly) {
      filtered = filtered.filter((a) => bookmarks.includes(a.id))
    }

    // 마감된 공고 필터링
    if (!showExpired) {
      filtered = filtered.filter((a) => a.dday >= 0)
    }

    return filtered
  }, [announcements, year, selectedCategory, selectedOrg, showHighMatchOnly, showOnlyMatched, showBookmarksOnly, showExpired, activeProfile, bookmarks])

  // 월별 그룹핑
  const groupedAnnouncements = useMemo(() => {
    return groupByMonth(filteredAnnouncements)
  }, [filteredAnnouncements])

  // 표시할 월 목록
  const monthsToShow = useMemo(() => {
    const months = []
    const startMonth = view === 'quarterly' ? Math.floor(new Date().getMonth() / 3) * 3 : 0
    const endMonth = view === 'quarterly' ? startMonth + 3 : 12

    for (let m = startMonth; m < endMonth; m++) {
      const key = `${year}-${String(m + 1).padStart(2, '0')}`
      months.push(key)
    }
    return months
  }, [year, view])

  // 공고 카드 클릭
  const handleAnnouncementClick = (announcement) => {
    navigate(`/search?id=${announcement.id}`)
  }

  return (
    <div className={`min-h-screen transition-colors ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto">
        {/* 상단 헤더 */}
        <div className={`sticky top-0 z-20 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} py-4`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                지원사업 캘린더
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setYear(year - 1)}
                  className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}
                >
                  <ChevronLeft size={20} />
                </button>
                <span className={`text-lg font-semibold min-w-[80px] text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {year}년
                </span>
                <button
                  onClick={() => setYear(year + 1)}
                  className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* 뷰 전환 */}
              <div className={`flex rounded-lg p-1 ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                {VIEWS.map((v) => (
                  <button
                    key={v.value}
                    onClick={() => setView(v.value)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      view === v.value
                        ? 'bg-blue-600 text-white'
                        : darkMode
                        ? 'text-gray-400 hover:text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>

              {/* 다크모드 토글 */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg ${darkMode ? 'bg-gray-800 text-yellow-400' : 'bg-gray-200 text-gray-600'}`}
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {/* 필터 토글 (모바일) */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={`lg:hidden p-2 rounded-lg ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'}`}
              >
                <Filter size={20} />
              </button>
            </div>
          </div>

          {/* 통계 */}
          <div className="flex gap-4 mt-4 text-sm">
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              총 <span className="font-semibold text-blue-500">{filteredAnnouncements.length}</span>개 공고
            </span>
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              북마크 <span className="font-semibold text-yellow-500">{bookmarks.length}</span>개
            </span>
          </div>

          {/* 프로필 미설정 안내 */}
          {!activeProfile && (
            <div className={`mt-4 flex items-center gap-3 p-3 rounded-lg ${
              darkMode ? 'bg-yellow-900/30 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <UserCircle size={20} className="text-yellow-500 flex-shrink-0" />
              <p className={`text-sm ${darkMode ? 'text-yellow-200' : 'text-yellow-700'}`}>
                프로필을 설정하면 맞춤형 공고 추천과 매칭률을 확인할 수 있습니다.
              </p>
              <Link
                to="/profile"
                className="text-sm font-medium text-yellow-600 hover:text-yellow-700 whitespace-nowrap"
              >
                프로필 설정 →
              </Link>
            </div>
          )}

          {/* 프로필 설정된 경우 맞춤 공고 토글 표시 */}
          {activeProfile && (
            <div className={`mt-4 flex items-center gap-3 p-3 rounded-lg ${
              darkMode ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-50 border border-blue-200'
            }`}>
              <TrendingUp size={20} className="text-blue-500 flex-shrink-0" />
              <p className={`text-sm ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                <span className="font-medium">{activeProfile.serviceName || activeProfile.companyName || '내 프로필'}</span> 기준 맞춤 공고
              </p>
              <label className="flex items-center gap-2 cursor-pointer ml-auto">
                <span className={`text-sm font-medium ${darkMode ? 'text-blue-200' : 'text-blue-700'}`}>맞춤만</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showOnlyMatched}
                    onChange={(e) => setShowOnlyMatched(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:bg-gray-700 dark:peer-checked:bg-blue-600"></div>
                </div>
              </label>
            </div>
          )}
        </div>

        <div className="flex gap-6">
          {/* 사이드바 필터 */}
          <aside
            className={`${
              sidebarOpen ? 'block' : 'hidden'
            } lg:block w-full lg:w-64 flex-shrink-0 ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            } rounded-xl p-4 border ${darkMode ? 'border-gray-700' : 'border-gray-200'} h-fit sticky top-32`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>필터</h3>
              <button
                onClick={() => {
                  setSelectedCategory('전체')
                  setSelectedOrg('')
                  setShowHighMatchOnly(false)
                  setShowOnlyMatched(false)
                  setShowBookmarksOnly(false)
                  setShowExpired(false)
                }}
                className="text-xs text-blue-500 hover:underline"
              >
                초기화
              </button>
            </div>

            {/* 분야 필터 - SearchPage와 동일 */}
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                분야
              </label>
              {/* 전체 버튼 */}
              <button
                onClick={() => setSelectedCategory('전체')}
                className={`w-full mb-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  selectedCategory === '전체'
                    ? 'bg-blue-600 text-white'
                    : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                전체
              </button>
              {/* 그룹별 카테고리 */}
              {['기술', '산업', '지원유형'].map(group => {
                const groupInterests = INTERESTS.filter(i => i.group === group)
                if (groupInterests.length === 0) return null
                return (
                  <div key={group} className="mb-2">
                    <span className={`text-xs font-medium ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {group}
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {groupInterests.map((interest) => (
                        <button
                          key={interest.value}
                          onClick={() => setSelectedCategory(interest.value)}
                          className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                            selectedCategory === interest.value
                              ? 'bg-blue-600 text-white'
                              : darkMode
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {interest.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 기관 필터 */}
            <div className="mb-4">
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                기관
              </label>
              <select
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                className={`w-full px-3 py-2 text-sm rounded-lg border ${
                  darkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="">전체 기관</option>
                {organizations.map((org) => (
                  <option key={org} value={org}>
                    {org}
                  </option>
                ))}
              </select>
            </div>

            {/* 체크박스 필터 */}
            <div className="space-y-2">
              <label className={`flex items-center gap-2 cursor-pointer ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <input
                  type="checkbox"
                  checked={showHighMatchOnly}
                  onChange={(e) => setShowHighMatchOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">매칭률 80% 이상</span>
              </label>
              <label className={`flex items-center gap-2 cursor-pointer ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <input
                  type="checkbox"
                  checked={showBookmarksOnly}
                  onChange={(e) => setShowBookmarksOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">북마크만 보기</span>
              </label>
              <label className={`flex items-center gap-2 cursor-pointer ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <input
                  type="checkbox"
                  checked={showExpired}
                  onChange={(e) => setShowExpired(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">마감된 공고 포함</span>
              </label>
            </div>
          </aside>

          {/* 메인 콘텐츠 - 월별 타임라인 */}
          <main className="flex-1 space-y-6 pb-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={40} className="animate-spin text-blue-500" />
              </div>
            ) : null}
            {!isLoading && monthsToShow.map((monthKey) => {
              const announcements = groupedAnnouncements[monthKey] || []
              const monthName = formatMonthName(monthKey)

              return (
                <section key={monthKey}>
                  {/* 월 헤더 */}
                  <div className={`flex items-center gap-3 mb-3 sticky top-28 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} py-2 z-10`}>
                    <div className={`flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      <Calendar size={20} className="text-blue-500" />
                      <h3 className="text-lg font-semibold">{monthName}</h3>
                    </div>
                    <span className={`text-sm px-2 py-0.5 rounded-full ${
                      announcements.length > 0
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        : darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {announcements.length}개
                    </span>
                  </div>

                  {/* 공고 목록 */}
                  {announcements.length > 0 ? (
                    <div className="grid gap-3">
                      {announcements.map((announcement) => (
                        <AnnouncementCard
                          key={announcement.id}
                          announcement={announcement}
                          darkMode={darkMode}
                          isBookmarked={isBookmarked(announcement.id)}
                          onBookmarkToggle={() => toggleBookmark(announcement.id)}
                          onClick={() => handleAnnouncementClick(announcement)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className={`text-center py-8 rounded-lg border ${
                      darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'
                    }`}>
                      해당 월 공고 없음
                    </div>
                  )}
                </section>
              )
            })}
          </main>
        </div>
      </div>
    </div>
  )
}

// 공고 카드 컴포넌트
function AnnouncementCard({ announcement, darkMode, isBookmarked, onBookmarkToggle, onClick }) {
  const { dday, matchingScore } = announcement
  const isUrgent = dday >= 0 && dday <= 7
  const isExpired = dday < 0

  return (
    <div
      onClick={onClick}
      className={`group relative p-4 rounded-xl border cursor-pointer transition-all ${
        darkMode
          ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
      } ${isExpired ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* 상단: 공고유형 + D-day + 매칭률 */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {/* 공고 유형 배지 */}
            <AnnouncementTypeBadge type={announcement.announcementType || 'funding'} />
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded ${
                isExpired
                  ? 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  : isUrgent
                  ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300'
                  : 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
              }`}
            >
              {formatDday(dday)}
            </span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded ${
                matchingScore >= 80
                  ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
                  : matchingScore >= 50
                  ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-300'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              <TrendingUp size={12} className="inline mr-1" />
              {matchingScore}%
            </span>
          </div>

          {/* 제목 */}
          <h4 className={`font-medium mb-1 truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {announcement.title}
          </h4>

          {/* 요약 (SearchPage와 동일) */}
          {announcement.summary && (
            <p className={`text-sm mt-1 line-clamp-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {announcement.summary}
            </p>
          )}

          {/* 기관 + 마감일 + 지역 */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm mt-2">
            <span className={`flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <Building2 size={14} />
              {announcement.organization}
            </span>
            <span className={`flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <Clock size={14} />
              {announcement.deadline}
            </span>
            {announcement.regionRestriction?.type !== 'nationwide' && announcement.regionRestriction?.region && (
              <span className={`flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <MapPin size={14} />
                {getRegionName(announcement.regionRestriction.region, announcement.regionRestriction.detectedCity)}
              </span>
            )}
          </div>

          {/* 지원금액 */}
          {announcement.budget && (
            <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              <Coins size={14} />
              {announcement.budget}
            </div>
          )}
        </div>

        {/* 버튼 영역 */}
        <div className="flex items-center gap-1">
          {/* 공고 바로가기 버튼 */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              window.open(getAnnouncementLink(announcement), '_blank')
            }}
            className={`p-2 rounded-lg transition-colors ${
              darkMode
                ? 'text-gray-500 hover:text-blue-400'
                : 'text-gray-400 hover:text-blue-600'
            }`}
            title="공고 페이지로 이동"
          >
            <ExternalLink size={18} />
          </button>

          {/* 북마크 버튼 */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onBookmarkToggle()
            }}
            className={`p-2 rounded-lg transition-colors ${
              isBookmarked
                ? 'text-yellow-500 hover:text-yellow-600'
                : darkMode
                ? 'text-gray-500 hover:text-yellow-500'
                : 'text-gray-400 hover:text-yellow-500'
            }`}
          >
            {isBookmarked ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
          </button>
        </div>
      </div>

      {/* 카테고리 태그 */}
      <div className="flex flex-wrap gap-1 mt-3">
        {announcement.category.map((cat) => (
          <span
            key={cat}
            className={`text-xs px-2 py-0.5 rounded ${
              darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {cat}
          </span>
        ))}
      </div>

      {/* 지역 불일치 경고 */}
      {announcement.isRegionMismatch && (
        <div className={`flex items-center gap-1.5 mt-2 px-2 py-1 rounded text-xs ${
          darkMode
            ? 'bg-orange-900/30 border border-orange-700 text-orange-300'
            : 'bg-orange-50 border border-orange-200 text-orange-700'
        }`}>
          <AlertTriangle size={12} />
          <span>
            {getRegionName(announcement.regionRestriction.region, announcement.regionRestriction.detectedCity)} 지역 관련 공고입니다 (지원 자격을 확인하세요)
          </span>
        </div>
      )}
    </div>
  )
}
