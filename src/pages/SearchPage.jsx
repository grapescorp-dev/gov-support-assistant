import { useState, useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useSearchStore } from '../stores/useSearchStore'
import { useProfileStore } from '../stores/useProfileStore'
import { useDocumentStore } from '../stores/useDocumentStore'
import { searchAnnouncements, analyzeProgram } from '../api/announcements'
import { calculateMatchingScore, extractRegionRestriction, getRegionName } from '../utils/matchingScore'
import { getAnnouncementLink } from '../utils/getAnnouncementLink'
import { stripHtml } from '../utils/stripHtml'
import { Search, Loader2, ExternalLink, Sparkles, Filter, Calendar, Building2, Tag, ArrowUpDown, UserCircle, TrendingUp, MapPin, AlertTriangle } from 'lucide-react'

const categories = ['전체', 'AI', '음악', 'ICT', 'IT', 'CT', '콘텐츠', '창업']

// 맞춤 공고 필터링 기준 점수
const MATCHING_THRESHOLD = 30

export function SearchPage() {
  const navigate = useNavigate()
  const { keyword, setKeyword, results, setResults, selectedProgram, setSelectedProgram, isLoading, setLoading } = useSearchStore()
  const { getActiveProfile } = useProfileStore()
  const { createDocument } = useDocumentStore()

  const activeProfile = getActiveProfile()

  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [sortBy, setSortBy] = useState('deadline') // 'deadline' | 'matching'
  const [showExpired, setShowExpired] = useState(false) // 마감된 공고 표시 여부
  const [showOnlyMatched, setShowOnlyMatched] = useState(false) // 맞춤 공고만 표시 여부
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // 매칭률 계산 및 정렬된 결과
  const sortedResults = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let withMatchingScore = results.map((program) => {
      const regionRestriction = extractRegionRestriction(program)
      const isRegionMismatch =
        activeProfile?.region &&
        regionRestriction.type === 'restricted' &&
        regionRestriction.region !== activeProfile.region

      return {
        ...program,
        matchingScore: calculateMatchingScore(activeProfile, program),
        isExpired: program.deadline ? new Date(program.deadline) < today : false,
        regionRestriction,
        isRegionMismatch,
      }
    })

    // 마감된 공고 필터링
    if (!showExpired) {
      withMatchingScore = withMatchingScore.filter((p) => !p.isExpired)
    }

    // 맞춤 공고만 표시 (프로필이 있고 토글이 켜져 있을 때)
    if (showOnlyMatched && activeProfile) {
      withMatchingScore = withMatchingScore.filter((p) => p.matchingScore >= MATCHING_THRESHOLD)
    }

    // 카테고리 필터링 (클라이언트 측에서 추가 필터링)
    if (selectedCategory !== '전체') {
      withMatchingScore = withMatchingScore.filter((p) => {
        const categories = p.category || []
        // 정확한 매칭 또는 부분 매칭 (예: 'CT'는 'CT', '콘텐츠'와 매칭)
        return categories.some((cat) => {
          const catLower = cat.toLowerCase()
          const selectedLower = selectedCategory.toLowerCase()
          return catLower === selectedLower || catLower.includes(selectedLower)
        })
      })
    }

    if (sortBy === 'matching') {
      return [...withMatchingScore].sort((a, b) => b.matchingScore - a.matchingScore)
    }
    // deadline 정렬 (가까운 순, deadline 없는 건 뒤로)
    return [...withMatchingScore].sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0
      if (!a.deadline) return 1
      if (!b.deadline) return -1
      return new Date(a.deadline) - new Date(b.deadline)
    })
  }, [results, activeProfile, sortBy, showExpired, showOnlyMatched, selectedCategory])

  // 초기 로딩 - 전체 목록 가져오기
  useEffect(() => {
    if (results.length === 0) {
      handleSearch(null, true)
    }
  }, [])

  const handleSearch = async (e, initial = false) => {
    if (e) e.preventDefault()

    setLoading(true)
    setSelectedProgram(null)
    setAiAnalysis(null)

    console.log('[SearchPage] 검색 시작:', { keyword, initial })

    try {
      // API는 키워드만으로 검색, 카테고리는 클라이언트에서 필터링
      const data = await searchAnnouncements(keyword, {})
      console.log('[SearchPage] API 검색 결과:', data.length, '건')
      setResults(data)
    } catch (error) {
      console.error('[SearchPage] 검색 오류:', error)
      // 개발 환경에서는 로컬 목업 데이터 사용
      const { searchAnnouncements: localSearch } = await import('../data/mockAnnouncements')
      const filtered = localSearch(keyword)
      console.log('[SearchPage] 로컬 데이터 사용:', filtered.length, '건')
      setResults(filtered)
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryChange = (category) => {
    setSelectedCategory(category)
  }

  const handleSelectProgram = async (program) => {
    setSelectedProgram(program)
    setIsAnalyzing(true)

    try {
      const analysis = await analyzeProgram(program, activeProfile)
      setAiAnalysis(analysis)
    } catch (error) {
      // 개발 환경용 기본 분석
      setAiAnalysis({
        summary: `${program.title}은(는) ${program.summary}`,
        matchAnalysis: {
          score: 75,
          level: 'high',
          reason: '귀사의 사업 분야와 높은 적합도를 보입니다.',
          strengths: ['관련 분야 사업 경험', '기술력 보유'],
          weaknesses: ['프로필 정보 보완 필요'],
        },
        writingDirection: [
          '기술 혁신성과 차별화 포인트를 명확히 제시하세요',
          '시장 규모와 성장 가능성을 구체적인 데이터로 뒷받침하세요',
          '팀의 역량과 실행력을 검증 가능한 실적으로 보여주세요',
          '정부 정책 방향과의 부합성을 강조하세요',
          '구체적인 사업화 일정과 목표를 제시하세요',
        ],
        keyPoints: [
          '기술성: 기술의 혁신성과 완성도',
          '사업성: 시장 규모 및 수익 모델',
          '성장성: 확장 가능성과 지속가능성',
        ],
        tips: [
          '평가 기준에 맞춰 사업계획서 목차를 구성하세요',
          '정량적 목표와 달성 방안을 구체적으로 기술하세요',
          '유사 사업 선정 사례를 분석하여 참고하세요',
        ],
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleStartWriting = () => {
    if (!selectedProgram) return
    const newDoc = createDocument(selectedProgram.id, selectedProgram.title)
    navigate(`/editor/${newDoc.id}`)
  }

  // 카테고리 변경은 클라이언트 측 필터링으로 처리 (sortedResults에서 처리됨)
  // API 재검색 불필요

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">지원사업 검색</h2>
        <div className="text-sm text-gray-500">
          {showOnlyMatched && activeProfile ? (
            <>
              맞춤 <span className="font-semibold text-blue-600">{sortedResults.length}</span>개
              <span className="text-gray-400 mx-1">/</span>
              전체 {results.length}개 공고
            </>
          ) : (
            <>
              {selectedCategory !== '전체' ? (
                <>
                  <span className="font-semibold text-blue-600">{sortedResults.length}</span>개
                  <span className="text-gray-400 mx-1">/</span>
                  전체 {results.length}개 공고
                </>
              ) : (
                <>총 <span className="font-semibold text-blue-600">{sortedResults.length}</span>개 공고</>
              )}
            </>
          )}
        </div>
      </div>

      {/* 검색바 */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="키워드로 검색 (예: AI, 창업, 음악, 콘텐츠)"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
        >
          {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
          검색
        </button>
      </form>

      {/* 프로필 미설정 안내 */}
      {!activeProfile && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
          <UserCircle size={20} className="text-yellow-500 flex-shrink-0" />
          <p className="text-sm text-yellow-700">
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
        <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <TrendingUp size={20} className="text-blue-500 flex-shrink-0" />
          <p className="text-sm text-blue-700">
            <span className="font-medium">{activeProfile.serviceName || activeProfile.companyName || '내 프로필'}</span> 기준 맞춤 공고를 확인하세요.
          </p>
          <label className="flex items-center gap-2 cursor-pointer ml-auto">
            <span className="text-sm font-medium text-blue-700">맞춤 공고만</span>
            <div className="relative">
              <input
                type="checkbox"
                checked={showOnlyMatched}
                onChange={(e) => setShowOnlyMatched(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </div>
          </label>
        </div>
      )}

      {/* 카테고리 필터 + 정렬 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={16} className="text-gray-500" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 정렬 옵션 + 마감 공고 필터 */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showExpired}
              onChange={(e) => setShowExpired(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            마감된 공고 포함
          </label>
          <div className="flex items-center gap-2">
            <ArrowUpDown size={16} className="text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="deadline">마감일순</option>
              <option value="matching">매칭률순</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* 검색 결과 목록 */}
        <div className="lg:col-span-3 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">검색 결과</h3>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-blue-600" />
            </div>
          ) : sortedResults.length === 0 ? (
            <p className="text-gray-500 text-center py-12 bg-white rounded-lg border border-gray-200">
              검색 결과가 없습니다. 다른 키워드로 검색해보세요.
            </p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {sortedResults.map((program) => (
                <div
                  key={program.id}
                  onClick={() => handleSelectProgram(program)}
                  className={`bg-white p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedProgram?.id === program.id
                      ? 'border-blue-500 ring-2 ring-blue-100'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{program.title}</h4>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded flex items-center gap-1 ${
                          program.matchingScore >= 80
                            ? 'bg-green-100 text-green-600'
                            : program.matchingScore >= 50
                            ? 'bg-yellow-100 text-yellow-600'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        <TrendingUp size={12} />
                        {program.matchingScore}%
                      </span>
                    </div>
                    <a
                      href={getAnnouncementLink(program)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-gray-400 hover:text-blue-600"
                      title="공고 페이지로 이동"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
  {stripHtml(program.summary)}
</p>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                      <Building2 size={12} />
                      {program.organization}
                    </span>
                    {program.budget ? (
  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
    {program.budget}
  </span>
) : null}

                    <span className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded">
                      <Calendar size={12} />
                      {program.deadline}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {program.category.map((cat) => (
                      <span key={cat} className="flex items-center gap-1 text-xs text-gray-500">
                        <Tag size={10} />
                        {cat}
                      </span>
                    ))}
                  </div>

                  {/* 지역 불일치 경고 */}
                  {program.isRegionMismatch && (
                    <div className="flex items-center gap-1.5 mt-2 px-2 py-1 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                      <AlertTriangle size={12} />
                      <span>
                        {getRegionName(program.regionRestriction.region, program.regionRestriction.detectedCity)} 지역 관련 공고입니다 (지원 자격을 확인하세요)
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI 분석 패널 */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Sparkles size={20} className="text-yellow-500" />
            AI 분석
          </h3>

          {selectedProgram ? (
            <div className="bg-white p-5 rounded-lg border border-gray-200 space-y-4">
              {isAnalyzing ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 size={32} className="animate-spin text-blue-600 mb-3" />
                  <p className="text-gray-500">AI 분석 중...</p>
                </div>
              ) : aiAnalysis ? (
                <>
                  {/* 제목 및 적합도 */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">{selectedProgram.title}</h4>
                    {aiAnalysis.matchAnalysis && (
                      <div className="flex items-center gap-2">
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${
                          aiAnalysis.matchAnalysis.level === 'high'
                            ? 'bg-green-100 text-green-700'
                            : aiAnalysis.matchAnalysis.level === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          <TrendingUp size={14} />
                          적합도 {aiAnalysis.matchAnalysis.score}%
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 공고 요약 */}
                  <div>
                    <h5 className="font-medium text-gray-800 mb-1">공고 요약</h5>
                    <p className="text-sm text-gray-600">{aiAnalysis.summary}</p>
                  </div>

                  {/* 적합도 분석 */}
                  {aiAnalysis.matchAnalysis && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <h5 className="font-medium text-gray-800 mb-2">프로필 적합도 분석</h5>
                      <p className="text-sm text-gray-600 mb-2">{aiAnalysis.matchAnalysis.reason}</p>
                      {aiAnalysis.matchAnalysis.strengths?.length > 0 && (
                        <div className="mb-2">
                          <span className="text-xs font-medium text-green-600">강점:</span>
                          <ul className="text-sm text-gray-600 list-disc list-inside">
                            {aiAnalysis.matchAnalysis.strengths.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {aiAnalysis.matchAnalysis.weaknesses?.length > 0 && (
                        <div>
                          <span className="text-xs font-medium text-orange-600">보완점:</span>
                          <ul className="text-sm text-gray-600 list-disc list-inside">
                            {aiAnalysis.matchAnalysis.weaknesses.map((w, i) => (
                              <li key={i}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 작성 방향 */}
                  {aiAnalysis.writingDirection?.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-800 mb-1">작성 방향 제안</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {aiAnalysis.writingDirection.map((dir, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-blue-500 font-medium">{i + 1}.</span>
                            {dir}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 심사 핵심 포인트 */}
                  {aiAnalysis.keyPoints?.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-800 mb-1">심사 핵심 포인트</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {aiAnalysis.keyPoints.map((point, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-purple-500">★</span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 합격 팁 */}
                  {aiAnalysis.tips?.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-800 mb-1">합격 팁</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {aiAnalysis.tips.map((tip, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-green-500">✓</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    onClick={handleStartWriting}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <Sparkles size={18} />
                    이 지원사업으로 문서 작성 시작
                  </button>
                </>
              ) : null}
            </div>
          ) : (
            <div className="bg-gray-50 p-6 rounded-lg text-center text-gray-500 border border-gray-200">
              <Sparkles size={32} className="mx-auto mb-3 text-gray-300" />
              <p>지원사업을 선택하면<br />AI 분석 결과를 확인할 수 있습니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
