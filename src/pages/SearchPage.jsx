import { useState, useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useSearchStore } from '../stores/useSearchStore'
import { useProfileStore, INTERESTS, COMPANY_TYPES, BUSINESS_AGES, REGIONS } from '../stores/useProfileStore'
import { useDocumentStore } from '../stores/useDocumentStore'
import {
  searchAnnouncements,
  analyzeProgram,
  summarizeProgramFromDoc,
  classifyAnnouncementsBatch,
  getIndustryClassFromCache,
  getIndustryClassCacheStats,
} from '../api/announcements'
import {
  calculateMatchingScore,
  extractRegionRestriction,
  getRegionName,
  checkEligibility,
  calculateHybridMatchingScore,
} from '../utils/matchingScore'
import { getAnnouncementLink } from '../utils/getAnnouncementLink'
import { stripHtml } from '../utils/stripHtml'
import { CollapsibleTags } from '../components/CollapsibleTags'
import {
  PROFILE_WEAK_SIGNAL_BANNER,
  SEARCH_RESULTS_COPY,
  MISMATCH_HELP_COPY,
  checkProfileSignalWeak,
} from '../constants/microcopy'
import { Search, Loader2, ExternalLink, Sparkles, Filter, Calendar, Building2, Tag, ArrowUpDown, UserCircle, TrendingUp, MapPin, AlertTriangle, Briefcase, CalendarDays, Info, FileText, AlertCircle, CheckCircle2, X, ChevronDown, Settings, Star, Clock, Eye } from 'lucide-react'

// 맞춤 공고 필터링 기준 점수
const MATCHING_THRESHOLD = 30

// 공고 타입 정의
const ANNOUNCEMENT_TYPES = [
  { value: 'all', label: '전체', icon: null },
  { value: 'funding', label: '지원금/과제', icon: Briefcase },
  { value: 'event', label: '행사', icon: CalendarDays },
  { value: 'info', label: '안내', icon: Info },
]

// 행사 하위 탭 정의
const EVENT_SUB_TABS = [
  { value: 'all', label: '전체 행사' },
  { value: 'exhibition', label: '전시/로드쇼', tag: '전시/로드쇼' },
  { value: 'seminar', label: '세미나/교육', tag: '교육/세미나' },
  { value: 'ir', label: 'IR/데모데이', tags: ['투자/IR', '데모데이/피칭'] },
]

// 태그 필터: 대상/지원유형 중심 (관심분야와 역할 분리)
// - 관심분야 필터: 기술/산업 분야 (무엇을 하는 기업인가)
// - 태그 필터: 지원 대상/유형 (어떤 지원을 받고 싶은가)
const TAG_FILTER_GROUPS = {
  대상: ['창업/스타트업', '소상공인', '중소기업', '예비창업', '여성기업', '청년창업'],
  지원유형: ['R&D', '바우처/이용권', '입주/공간', '컨설팅/멘토링', '인력지원', '자금/융자'],
  행사: ['전시/로드쇼', '교육/세미나', '투자/IR', '데모데이/피칭', '네트워킹'],
}

// 소스(organization) 필터 옵션
const SOURCE_FILTERS = [
  { value: 'all', label: '전체 소스' },
  { value: 'bizinfo', label: '기업마당', color: 'bg-blue-100 text-blue-700' },
  { value: 'kstartup', label: 'K-Startup', color: 'bg-green-100 text-green-700' },
  { value: 'mss_api', label: '중소벤처기업부', color: 'bg-purple-100 text-purple-700' },
]

// 공고 유형 라벨 컴포넌트
function AnnouncementTypeBadge({ type }) {
  const config = {
    funding: { label: '지원금/과제', color: 'bg-blue-100 text-blue-700', icon: Briefcase },
    event: { label: '행사', color: 'bg-pink-100 text-pink-700', icon: CalendarDays },
    info: { label: '안내', color: 'bg-gray-100 text-gray-600', icon: Info },
  }
  const { label, color, icon: Icon } = config[type] || config.info
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded flex items-center gap-1 ${color}`}>
      <Icon size={10} />
      {label}
    </span>
  )
}

export function SearchPage() {
  const navigate = useNavigate()
  const { keyword, setKeyword, results, setResults, selectedProgram, setSelectedProgram, isLoading, setLoading } = useSearchStore()
  const { getActiveProfile } = useProfileStore()
  const { createDocument } = useDocumentStore()

  const activeProfile = getActiveProfile()

  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [sortBy, setSortBy] = useState('deadline') // 'deadline' | 'matching'
  const [showExpired, setShowExpired] = useState(false) // 마감된 공고 표시 여부
  // eslint-disable-next-line no-unused-vars
  const [showOnlyMatched, setShowOnlyMatched] = useState(false) // 맞춤 공고만 표시 여부 (향후 UI 추가 예정)
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // 문서 기반 AI 요약 상태
  const [docSummary, setDocSummary] = useState(null)
  const [isDocSummarizing, setIsDocSummarizing] = useState(false)
  const [docSummaryError, setDocSummaryError] = useState(null)

  // 타입 필터 상태
  const [selectedType, setSelectedType] = useState('all')
  const [selectedEventSubTab, setSelectedEventSubTab] = useState('all')

  // 태그 필터 상태 (다중 선택)
  const [selectedTags, setSelectedTags] = useState([])

  // 소스 필터 상태
  const [selectedSource, setSelectedSource] = useState('all')

  // [UX 개선] 상세 필터 접기/펼치기 상태
  const [isFilterExpanded, setIsFilterExpanded] = useState(false)

  // [하이브리드 매칭] AI 분류 상태
  const [isClassifying, setIsClassifying] = useState(false)
  const [classificationProgress, setClassificationProgress] = useState({ cached: 0, total: 0, processed: 0 })
  const [classificationMap, setClassificationMap] = useState(new Map())
  const [useHybridMatching, setUseHybridMatching] = useState(true) // 하이브리드 매칭 사용 여부

  // [탭 UI] 맞춤/전체 공고 탭 상태
  const [activeTab, setActiveTab] = useState('recommended') // 'recommended' | 'all'

  // 필터가 적용되었는지 확인 (하나라도 선택되면 true)
  const hasActiveFilters = selectedTags.length > 0 || selectedCategory !== '전체' || selectedSource !== 'all'

  // 타입별 공고 수 계산
  const typeCounts = useMemo(() => {
    const counts = { all: 0, funding: 0, event: 0, info: 0, unknown: 0 }
    results.forEach(p => {
      const type = p.type || 'unknown'
      counts[type] = (counts[type] || 0) + 1
      counts.all++
    })
    return counts
  }, [results])

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

      // 자격 검증 수행 (프로필이 있을 때만)
      const eligibilityResult = activeProfile
        ? checkEligibility(activeProfile, program)
        : { eligible: true, excludedReason: null, hardFilterResult: null }

      // hardFilterResult에서 hardPass 추출 (v2)
      const hardFilterResult = eligibilityResult.hardFilterResult
      let hardPass = hardFilterResult?.hardPass // true, false, or null (unknown)

      // [하이브리드 매칭] AI 분류 결과 가져오기
      const classification = classificationMap.get(program.id) || getIndustryClassFromCache(program)

      // [하이브리드 매칭] 점수 계산
      let matchingScore
      let hybridBreakdown = null
      let aiHardPassOverride = null // AI 분류로 인한 hardPass 오버라이드

      if (useHybridMatching && classification && activeProfile) {
        // 하이브리드 매칭 사용
        const hybridResult = calculateHybridMatchingScore(activeProfile, program, classification)
        matchingScore = hybridResult.score
        hybridBreakdown = hybridResult.breakdown

        // ⭐ [옵션 A] AI 분류 결과를 하드필터에 연동
        // 강한 불일치(target_mismatch, industry_mismatch)면 hardPass를 false로 오버라이드
        if (hybridBreakdown && !hybridBreakdown.aiMatch) {
          const aiReason = hybridBreakdown.aiReason || ''
          const isStrongMismatch =
            aiReason.includes('교육생') ||
            aiReason.includes('참가자') ||
            aiReason.includes('운영사') ||
            aiReason.includes('장비') ||
            aiReason.includes('시설') ||
            aiReason.includes('업종 불일치') ||
            hybridBreakdown.aiAdjustment <= -40  // 40점 이상 감점은 강한 불일치

          if (isStrongMismatch && classification.confidence >= 70) {
            // AI confidence가 70% 이상이고 강한 불일치면 hardPass를 false로
            aiHardPassOverride = {
              reason: aiReason,
              source: 'ai_classification',
              confidence: classification.confidence,
            }
            hardPass = false
          }
        }
      } else {
        // 기존 규칙 기반 매칭
        matchingScore = calculateMatchingScore(activeProfile, program)
      }

      // 디버그: 특정 공고 또는 첫 5개 공고의 매칭 결과 로깅
      const programIdStr = String(program.id || '')
      const isTargetProgram =
        programIdStr.includes('176145') || // 메이커 장비
        programIdStr.includes('118169') || // 기후테크
        programIdStr.includes('118094') || // 관악구
        (program.title || '').includes('메이커') ||
        (program.title || '').includes('기후테크') ||
        (program.title || '').includes('관악구')

      if (isTargetProgram || (program.id && results.indexOf(program) < 3)) {
        console.log(`[Matching] ${(program.title || '').substring(0, 40)}...`, {
          id: program.id,
          matchingScore,
          eligible: eligibilityResult.eligible,
          hardPass,
          aiHardPassOverride: aiHardPassOverride ? aiHardPassOverride.reason : null,  // AI로 인한 오버라이드
          hardFailReasons: hardFilterResult?.hardFailReasons?.map(r => r.message),
          regionRestriction: {
            type: regionRestriction.type,
            region: regionRestriction.region,
            detectedDistrict: regionRestriction.detectedDistrict,
          },
          profileRegion: {
            region: activeProfile?.region,
            subRegion: activeProfile?.subRegion,
          },
          classification: classification ? {
            primaryIndustry: classification.primaryIndustry,
            targetType: classification.targetType,
            confidence: classification.confidence,
          } : null,
          hybridBreakdown,
        })
      }

      return {
        ...program,
        matchingScore,
        hybridBreakdown,
        classification,
        isExpired: program.deadline ? new Date(program.deadline) < today : false,
        regionRestriction,
        isRegionMismatch,
        eligible: eligibilityResult.eligible,
        excludedReason: eligibilityResult.excludedReason,
        // Hard Filter v2 필드
        hardPass,
        hardFilterResult,
        // [옵션 A] AI 분류로 인한 hardPass 오버라이드 정보
        aiHardPassOverride,
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

    // 타입 필터링
    if (selectedType !== 'all') {
      withMatchingScore = withMatchingScore.filter((p) => p.type === selectedType)

      // 행사 하위 탭 필터링
      if (selectedType === 'event' && selectedEventSubTab !== 'all') {
        const subTab = EVENT_SUB_TABS.find(t => t.value === selectedEventSubTab)
        if (subTab) {
          withMatchingScore = withMatchingScore.filter((p) => {
            const tags = p.tags || []
            if (subTab.tag) {
              return tags.includes(subTab.tag)
            }
            if (subTab.tags) {
              return subTab.tags.some(t => tags.includes(t))
            }
            return true
          })
        }
      }
    }

    // 태그 필터링 (다중 선택 - OR 조건: 선택된 태그 중 하나라도 포함되면 표시)
    if (selectedTags.length > 0) {
      withMatchingScore = withMatchingScore.filter((p) => {
        const programTags = p.tags || []
        return selectedTags.some(tag => programTags.includes(tag))
      })
    }

    // 소스 필터링
    if (selectedSource !== 'all') {
      withMatchingScore = withMatchingScore.filter((p) => p.source === selectedSource)
    }

    // 카테고리 필터링 (INTERESTS의 keywords 활용)
    if (selectedCategory !== '전체') {
      const selectedInterest = INTERESTS.find(i => i.value === selectedCategory)
      const searchKeywords = selectedInterest?.keywords || [selectedCategory.toLowerCase()]

      withMatchingScore = withMatchingScore.filter((p) => {
        // 공고의 모든 텍스트를 검색 대상으로
        const searchText = [
          p.title || '',
          p.summary || '',
          ...(p.category || []),
          ...(p.tags || []),
        ].join(' ').toLowerCase()

        // 키워드 중 하나라도 매칭되면 표시
        return searchKeywords.some(keyword => searchText.includes(keyword))
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
  }, [results, activeProfile, sortBy, showExpired, showOnlyMatched, selectedCategory, selectedType, selectedEventSubTab, selectedTags, selectedSource, classificationMap, useHybridMatching])

  // 초기 로딩 - 전체 목록 가져오기
  useEffect(() => {
    if (results.length === 0) {
      handleSearch(null, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = async (e, initial = false) => {
    if (e) e.preventDefault()

    setLoading(true)
    setSelectedProgram(null)
    setAiAnalysis(null)

    console.log('[SearchPage] 검색 시작:', { keyword, initial, hasProfile: !!activeProfile })

    try {
      // API는 키워드만으로 검색, 카테고리는 클라이언트에서 필터링
      const data = await searchAnnouncements(keyword, {})
      console.log('[SearchPage] API 검색 결과:', data.length, '건')
      console.log('[SearchPage] 프로필 상태:', activeProfile ? '있음' : '없음')
      setResults(data)

      // [하이브리드 매칭] 프로필이 있고, 하이브리드 매칭이 켜져 있으면 AI 분류 실행
      if (activeProfile && useHybridMatching && data.length > 0) {
        runHybridClassification(data)
      }
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

  // [하이브리드 매칭] AI 분류 실행
  const runHybridClassification = async (announcements) => {
    setIsClassifying(true)
    setClassificationProgress({ cached: 0, total: announcements.length, processed: 0 })

    try {
      // 캐시 통계 먼저 확인
      const cacheStats = getIndustryClassCacheStats()
      console.log('[HybridMatching] 캐시 통계:', cacheStats)

      // 배치 분류 실행 (10개씩 배치 처리)
      const classMap = await classifyAnnouncementsBatch(
        announcements,
        10,
        (progress) => {
          setClassificationProgress(progress)
          console.log('[HybridMatching] 진행률:', progress)
        }
      )

      setClassificationMap(classMap)
      console.log('[HybridMatching] 분류 완료:', classMap.size, '건')
    } catch (error) {
      console.error('[HybridMatching] 분류 오류:', error)
    } finally {
      setIsClassifying(false)
    }
  }

  const handleCategoryChange = (category) => {
    setSelectedCategory(category)
  }

  const handleTypeChange = (type) => {
    setSelectedType(type)
    // 타입 변경 시 행사 하위 탭 초기화
    if (type !== 'event') {
      setSelectedEventSubTab('all')
    }
  }

  // 태그 필터 토글 (다중 선택)
  const toggleTagFilter = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  // 태그 필터 전체 해제
  const clearTagFilters = () => {
    setSelectedTags([])
  }

  // 공고 선택 (AI 분석 자동 호출 제거 - 비용 절감)
  const handleSelectProgram = (program) => {
    setSelectedProgram(program)
    // AI 분석 상태 초기화 (버튼 클릭 시에만 분석 수행)
    setAiAnalysis(null)
    setIsAnalyzing(false)
    // 문서 요약 상태 초기화
    setDocSummary(null)
    setDocSummaryError(null)
  }

  // AI 맞춤 분석 요청 (버튼 클릭 시에만 호출 - 비용 절감)
  const handleRequestAnalysis = async () => {
    if (!selectedProgram) return

    setIsAnalyzing(true)
    try {
      const analysis = await analyzeProgram(selectedProgram, activeProfile)
      setAiAnalysis(analysis)
    } catch {
      // 개발 환경용 기본 분석
      setAiAnalysis({
        summary: `${selectedProgram.title}은(는) ${selectedProgram.summary}`,
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

  // 문서 기반 AI 요약 핸들러
  const handleDocSummarize = async () => {
    if (!selectedProgram) return

    setIsDocSummarizing(true)
    setDocSummaryError(null)

    try {
      const result = await summarizeProgramFromDoc(selectedProgram)

      if (result.success) {
        setDocSummary(result.data)
        if (result.fromCache) {
          console.log('[DocSummary] Loaded from cache')
        }
      } else {
        setDocSummaryError(result.error?.message || '요약 생성에 실패했습니다.')
      }
    } catch (error) {
      console.error('[DocSummary] Error:', error)
      setDocSummaryError(error.message || '서버 요청 중 오류가 발생했습니다.')
    } finally {
      setIsDocSummarizing(false)
    }
  }

  // MSS 공고이고 첨부파일이 있는지 확인
  const hasMssDocuments = (program) => {
    return program?.source === 'mss_api' &&
           program?.mssMeta?.files &&
           program.mssMeta.files.length > 0
  }


  // 카테고리 변경은 클라이언트 측 필터링으로 처리 (sortedResults에서 처리됨)
  // API 재검색 불필요

  // ========================================
  // [UX 개선] 추천 공고와 전체 공고 분리
  // - 데이터 필터링 로직 변경 없음
  // - 이미 계산된 sortedResults를 UI에서만 분리
  // ========================================
  // [매칭 정확도 개선] 추천 공고는 eligible === true이고 hardPass !== false인 공고만 포함
  const recommendedResults = useMemo(() => {
    if (!activeProfile) return []
    return sortedResults.filter(p =>
      p.eligible &&
      p.matchingScore >= MATCHING_THRESHOLD &&
      p.hardPass !== false  // 하드필터 통과 또는 unknown만 포함
    )
  }, [sortedResults, activeProfile])

  // 전체 공고 (필터 적용된 모든 공고)
  const allResults = useMemo(() => {
    return sortedResults
  }, [sortedResults])

  // ========================================
  // [UX 개선] 프로필 정보 라벨 변환 헬퍼
  // ========================================
  const getCompanyTypeLabel = (value) => COMPANY_TYPES.find(t => t.value === value)?.label || value
  const getBusinessAgeLabel = (value) => BUSINESS_AGES.find(t => t.value === value)?.label || value
  const getRegionLabel = (value) => REGIONS.find(t => t.value === value)?.label || value
  const getInterestLabels = (values) => {
    if (!values || values.length === 0) return []
    return values.map(v => INTERESTS.find(i => i.value === v)?.label || v).slice(0, 3)
  }

  // ========================================
  // [UX 개선] 공고 카드 배지 생성 함수
  // - 기존 데이터 필드만 사용
  // - UI 조건문으로 추정 기반 배지 표시
  // ========================================
  const getRecommendBadges = (program) => {
    const badges = []

    // 매칭률 기반 배지
    if (program.matchingScore >= 70) {
      badges.push({ label: '높은 적합도', color: 'bg-green-100 text-green-700', icon: Star })
    }

    // 지역 적합 배지
    if (activeProfile?.region && !program.isRegionMismatch) {
      const regionRestriction = program.regionRestriction
      if (regionRestriction?.type === 'restricted' && regionRestriction.region === activeProfile.region) {
        badges.push({ label: '지역 적합', color: 'bg-blue-100 text-blue-700', icon: MapPin })
      }
    }

    // 예비창업 가능 배지 (태그 또는 카테고리 기반)
    const programText = [program.title, program.summary, ...(program.tags || [])].join(' ').toLowerCase()
    if (activeProfile?.companyType === 'preliminary' &&
        (programText.includes('예비창업') || programText.includes('예비 창업'))) {
      badges.push({ label: '예비창업 가능', color: 'bg-purple-100 text-purple-700', icon: CheckCircle2 })
    }

    // 마감 임박 배지
    if (program.deadline) {
      const daysLeft = Math.ceil((new Date(program.deadline) - new Date()) / (1000 * 60 * 60 * 24))
      if (daysLeft > 0 && daysLeft <= 7) {
        badges.push({ label: `D-${daysLeft}`, color: 'bg-red-100 text-red-700', icon: Clock })
      }
    }

    return badges.slice(0, 3) // 최대 3개
  }

  // 프로필 신호 부족 여부 판단
  const profileSignal = useMemo(() => {
    return checkProfileSignalWeak(activeProfile)
  }, [activeProfile])

  // 현재 탭에 따른 결과
  const currentResults = activeTab === 'recommended' ? recommendedResults : allResults

  return (
    <div className="space-y-0">
      {/* ========================================
          [스크롤 시 고정되는 상단 영역]
          - AI 분류 진행 상태
          - 프로필 신호 부족 배너
          - 프로필 요약
          - 검색창
          - 카테고리/필터
          ======================================== */}
      <div className="sticky top-0 z-30 bg-gray-50 pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-gray-200 shadow-sm">
        {/* [하이브리드 매칭] AI 분류 진행 상태 표시 */}
        {isClassifying && (
          <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl mb-3">
            <div className="flex items-center gap-3">
              <Loader2 size={18} className="text-indigo-500 animate-spin" />
              <div className="flex-1">
                <p className="text-sm font-medium text-indigo-800">
                  AI가 맞춤 공고를 분석하고 있어요 ({classificationProgress.processed}/{classificationProgress.total})
                </p>
                <div className="w-full bg-indigo-200 rounded-full h-1.5 mt-1">
                  <div
                    className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${(classificationProgress.processed / classificationProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* [마이크로카피] 프로필 신호 부족 배너 (조건부) */}
        {activeProfile && profileSignal.isWeak && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl mb-3">
            <div className="flex items-center gap-3">
              <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">{PROFILE_WEAK_SIGNAL_BANNER.title}</p>
              </div>
              <Link
                to="/profile"
                className="flex-shrink-0 bg-amber-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
              >
                {PROFILE_WEAK_SIGNAL_BANNER.cta}
              </Link>
            </div>
          </div>
        )}

        {/* 프로필 요약 영역 */}
        {activeProfile ? (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-xl border border-blue-200 mb-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <UserCircle size={16} className="text-blue-600" />
                <span className="font-medium text-gray-900 text-sm">
                  {activeProfile.serviceName || activeProfile.name || '내 프로필'}
                </span>
                {activeProfile.companyType && (
                  <span className="bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-700 text-xs">
                    {getCompanyTypeLabel(activeProfile.companyType)}
                  </span>
                )}
                {activeProfile.region && (
                  <span className="bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-700 text-xs flex items-center gap-1">
                    <MapPin size={10} />
                    {getRegionLabel(activeProfile.region)}
                  </span>
                )}
                {getInterestLabels(activeProfile.interests).slice(0, 2).map((label, i) => (
                  <span key={i} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                    {label}
                  </span>
                ))}
              </div>
              <Link
                to="/profile"
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
              >
                <Settings size={12} />
                수정
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-3 rounded-xl border border-yellow-200 mb-3">
            <div className="flex items-center gap-3">
              <UserCircle size={20} className="text-yellow-600" />
              <p className="text-sm text-gray-700 flex-1">프로필을 설정하면 맞춤 추천을 받을 수 있어요</p>
              <Link
                to="/profile"
                className="bg-yellow-500 text-white px-3 py-1.5 rounded-lg hover:bg-yellow-600 transition-colors font-medium text-sm"
              >
                프로필 설정
              </Link>
            </div>
          </div>
        )}

        {/* 검색창 */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="지원사업 검색 (예: AI, 콘텐츠, 수출)"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 text-sm"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            검색
          </button>
        </form>

        {/* 공고 타입 탭 */}
        <div className="border-b border-gray-200 mb-3">
          <nav className="flex gap-1 -mb-px">
            {ANNOUNCEMENT_TYPES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => handleTypeChange(value)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  selectedType === value
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {Icon && <Icon size={14} />}
                {label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  selectedType === value ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {typeCounts[value] || 0}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* 행사 하위 탭 (행사 탭 선택 시에만 표시) */}
        {selectedType === 'event' && (
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="text-xs text-gray-500">행사 유형:</span>
            {EVENT_SUB_TABS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setSelectedEventSubTab(value)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedEventSubTab === value
                    ? 'bg-pink-600 text-white'
                    : 'bg-pink-50 text-pink-600 hover:bg-pink-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* 정렬/필터 영역 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-2 rounded-lg border border-gray-200">
          {/* 정렬 옵션 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <ArrowUpDown size={14} className="text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="deadline">마감일순</option>
                <option value="matching">매칭률순</option>
              </select>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-600">
              <input
                type="checkbox"
                checked={showExpired}
                onChange={(e) => setShowExpired(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              마감 포함
            </label>
          </div>

          {/* 상세 필터 토글 버튼 */}
          <button
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              hasActiveFilters
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Filter size={12} />
            상세 필터
            {hasActiveFilters && (
              <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                {(selectedTags.length > 0 ? 1 : 0) + (selectedCategory !== '전체' ? 1 : 0) + (selectedSource !== 'all' ? 1 : 0)}
              </span>
            )}
            <ChevronDown size={12} className={`transition-transform ${isFilterExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* 상세 필터 영역 (접기/펼치기) */}
        {isFilterExpanded && (
          <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-200 mt-2">
            {/* 태그 필터 (대상/지원유형 중심) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Tag size={12} className="text-gray-500" />
                  <span className="text-xs font-medium text-gray-700">대상/지원유형</span>
                </div>
                {selectedTags.length > 0 && (
                  <button
                    onClick={clearTagFilters}
                    className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-0.5"
                  >
                    <X size={10} />
                    초기화
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                {Object.entries(TAG_FILTER_GROUPS).map(([group, tags]) => (
                  <div key={group} className="flex items-center gap-1 flex-wrap">
                    <span className="text-xs text-gray-400 w-14 flex-shrink-0">{group}</span>
                    {tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTagFilter(tag)}
                        className={`text-xs px-1.5 py-0.5 rounded-full border transition-colors ${
                          selectedTags.includes(tag)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* 관심분야/카테고리 필터 */}
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Briefcase size={12} className="text-gray-500" />
                  <span className="text-xs font-medium text-gray-700">관심분야</span>
                </div>
                {selectedCategory !== '전체' && (
                  <button
                    onClick={() => handleCategoryChange('전체')}
                    className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-0.5"
                  >
                    <X size={10} />
                    초기화
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <button
                  onClick={() => handleCategoryChange('전체')}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                    selectedCategory === '전체'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 border border-gray-300 hover:border-blue-400'
                  }`}
                >
                  전체
                </button>
                {['기술', '산업'].map(group => (
                  <div key={group} className="flex items-center gap-1 flex-wrap">
                    <span className="text-xs text-gray-400 w-12 flex-shrink-0">{group}</span>
                    {INTERESTS.filter(i => i.group === group).map(interest => (
                      <button
                        key={interest.value}
                        onClick={() => handleCategoryChange(interest.value)}
                        className={`px-1.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          selectedCategory === interest.value
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-600 border border-gray-300 hover:border-blue-400 hover:text-blue-600'
                        }`}
                      >
                        {interest.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* 소스 필터 */}
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Building2 size={12} className="text-gray-500" />
                <span className="text-xs font-medium text-gray-700 mr-1">소스</span>
                {SOURCE_FILTERS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setSelectedSource(value)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                      selectedSource === value
                        ? 'bg-gray-800 text-white'
                        : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================
          메인 콘텐츠 영역
          ======================================== */}
      <div className="grid lg:grid-cols-5 gap-6 pt-4">
        {/* 검색 결과 목록 */}
        <div className="lg:col-span-3 space-y-4">
          {/* 맞춤/전체 탭 */}
          {activeProfile && (
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('recommended')}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'recommended'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Star size={16} />
                맞춤 공고
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === 'recommended' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {isClassifying ? <Loader2 size={12} className="animate-spin" /> : recommendedResults.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'all'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Briefcase size={16} />
                전체 공고
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === 'all' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {allResults.length}
                </span>
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={32} className="animate-spin text-blue-600" />
            </div>
          ) : sortedResults.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <Search size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 mb-2">검색 결과가 없습니다</p>
              <p className="text-sm text-gray-400">다른 키워드나 필터 조건으로 검색해보세요</p>
            </div>
          ) : (
            <>
              {/* AI 분석 중 안내 (맞춤 탭에서만) */}
              {activeTab === 'recommended' && isClassifying && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-center">
                  <Loader2 size={24} className="animate-spin text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-green-700 font-medium">AI가 맞춤 공고를 분석하고 있어요</p>
                  <p className="text-xs text-green-600 mt-1">
                    분석이 완료되면 프로필에 맞는 공고만 추천해드려요
                  </p>
                </div>
              )}

              {/* 맞춤 탭 - 추천 공고 안내 */}
              {activeTab === 'recommended' && !isClassifying && recommendedResults.length > 0 && (
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <p className="text-sm text-gray-700">{SEARCH_RESULTS_COPY.main}</p>
                  <p className="text-xs text-gray-500 mt-1">{SEARCH_RESULTS_COPY.sub}</p>
                </div>
              )}

              {/* 맞춤 탭 - 추천 공고 없음 */}
              {activeTab === 'recommended' && !isClassifying && recommendedResults.length === 0 && (
                <div className="bg-gray-50 border border-gray-200 p-6 rounded-xl text-center">
                  <AlertCircle size={24} className="text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 font-medium">현재 프로필 기준 추천 공고가 없어요</p>
                  <p className="text-xs text-gray-500 mt-1">
                    전체 공고 탭에서 다른 공고를 확인하거나, 프로필 정보를 더 구체적으로 입력해보세요
                  </p>
                  <Link
                    to="/profile"
                    className="inline-flex items-center gap-1 mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    프로필 수정하기
                  </Link>
                </div>
              )}

              {/* 공고 목록 - 단일 스크롤 구조 (독립 스크롤 제거) */}
              <div className="space-y-3">
                {currentResults.map((program) => {
                  const badges = activeTab === 'recommended' ? getRecommendBadges(program) : []
                  const isRecommendedTab = activeTab === 'recommended'

                  return (
                    <div
                      key={program.id}
                      onClick={() => handleSelectProgram(program)}
                      className={`bg-white p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedProgram?.id === program.id
                          ? isRecommendedTab
                            ? 'border-green-500 ring-2 ring-green-100'
                            : 'border-blue-500 ring-2 ring-blue-100'
                          : isRecommendedTab
                            ? 'border-green-200 hover:border-green-300 hover:shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      {/* 추천 배지 (맞춤 탭에서만) */}
                      {isRecommendedTab && badges.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {badges.map((badge, i) => (
                            <span key={i} className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${badge.color}`}>
                              <badge.icon size={10} />
                              {badge.label}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {/* 공고 유형 배지 */}
                            <AnnouncementTypeBadge type={program.type || 'funding'} />
                            {/* 매칭률 */}
                            {activeProfile && (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded flex items-center gap-1 ${
                                program.matchingScore >= 80 ? 'bg-green-100 text-green-600' :
                                program.matchingScore >= 50 ? 'bg-yellow-100 text-yellow-600' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                <TrendingUp size={12} />
                                {program.matchingScore}%
                              </span>
                            )}
                          </div>
                          <h4 className="font-semibold text-gray-900">{program.title}</h4>
                        </div>
                        <a
                          href={getAnnouncementLink(program)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-gray-400 hover:text-blue-600 ml-2"
                          title="공고 페이지로 이동"
                        >
                          <ExternalLink size={16} />
                        </a>
                      </div>

                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {stripHtml(program.summary)}
                      </p>

                      <div className="flex flex-wrap gap-2 text-xs mb-2">
                        <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                          <Building2 size={12} />
                          {program.organization}
                        </span>
                        {program.budget && (
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                            {program.budget}
                          </span>
                        )}
                        <span className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded">
                          <Calendar size={12} />
                          {program.deadline}
                        </span>
                      </div>

                      {program.tags && program.tags.length > 0 && (
                        <CollapsibleTags tags={program.tags} maxLines={1} className="mb-2" />
                      )}

                      {program.isRegionMismatch && (
                        <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                          <AlertTriangle size={12} />
                          <span>
                            {getRegionName(program.regionRestriction.region, program.regionRestriction.detectedCity)} 지역 관련 공고
                          </span>
                        </div>
                      )}

                      {/* Hard Filter v2 상태 표시 */}
                      {program.hardPass === null && (
                        <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
                          <AlertCircle size={12} />
                          <span>지원자격 확인 필요</span>
                        </div>
                      )}

                      {/* 행동 유도 버튼 */}
                      <div className="flex gap-2 pt-2 border-t border-gray-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectProgram(program)
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Eye size={14} />
                          상세 검토
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            console.log('[관심 공고] 저장:', program.id)
                          }}
                          className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <Star size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* 맞춤 탭 하단 안내 */}
              {activeTab === 'recommended' && !isClassifying && recommendedResults.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
                  <p className="text-sm text-gray-600">{MISMATCH_HELP_COPY.question}</p>
                  <p className="text-xs text-gray-500 mt-1">{MISMATCH_HELP_COPY.suggestion}</p>
                  <Link
                    to="/profile"
                    className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {MISMATCH_HELP_COPY.cta}
                  </Link>
                </div>
              )}
            </>
          )}
        </div>

        {/* AI 분석 패널 - 스크롤 시 상단 헤더 아래에 고정 */}
        <div className="lg:col-span-2">
          <div className="sticky top-[280px] space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 bg-gray-50 py-2 sticky top-0 z-10">
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
              ) : !aiAnalysis ? (
                /* AI 분석 요청 버튼 (비용 절감: 자동 분석 대신 수동 요청) */
                <div className="flex flex-col items-center justify-center py-8">
                  <h4 className="font-semibold text-gray-900 mb-3">{selectedProgram.title}</h4>
                  <p className="text-sm text-gray-500 mb-4 text-center">
                    AI가 이 공고와 프로필의 적합도를 분석하고<br />
                    맞춤형 작성 가이드를 제공합니다.
                  </p>
                  <button
                    onClick={handleRequestAnalysis}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Sparkles size={18} />
                    AI 맞춤 분석 요청
                  </button>
                </div>
              ) : (
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

                  {/* 문서 기반 AI 요약 섹션 (MSS 공고 전용) */}
                  {hasMssDocuments(selectedProgram) && (
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium text-gray-800 flex items-center gap-2">
                          <FileText size={16} className="text-blue-500" />
                          문서 기반 AI 요약
                        </h5>
                        {!docSummary && !isDocSummarizing && (
                          <button
                            onClick={handleDocSummarize}
                            disabled={isDocSummarizing}
                            className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors font-medium flex items-center gap-1"
                          >
                            <FileText size={14} />
                            요약 생성
                          </button>
                        )}
                      </div>

                      {/* 로딩 상태 */}
                      {isDocSummarizing && (
                        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                          <Loader2 size={20} className="animate-spin text-blue-600" />
                          <div>
                            <p className="text-sm font-medium text-blue-700">문서 분석 중...</p>
                            <p className="text-xs text-blue-600">첨부파일에서 지원자격 정보를 추출하고 있습니다.</p>
                          </div>
                        </div>
                      )}

                      {/* 에러 상태 */}
                      {docSummaryError && !isDocSummarizing && (
                        <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg">
                          <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-red-700">요약 생성 실패</p>
                            <p className="text-xs text-red-600 mt-1">{docSummaryError}</p>
                            <button
                              onClick={handleDocSummarize}
                              className="text-xs text-red-600 hover:text-red-700 underline mt-2"
                            >
                              다시 시도
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 요약 결과 표시 */}
                      {docSummary && !isDocSummarizing && (
                        <div className="space-y-3">
                          {/* 신뢰도 표시 */}
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              docSummary.confidence === 'high' ? 'bg-green-100 text-green-700' :
                              docSummary.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {docSummary.confidence === 'high' ? '높은 신뢰도' :
                               docSummary.confidence === 'medium' ? '중간 신뢰도' : '낮은 신뢰도'}
                            </span>
                            {docSummary.fileName && (
                              <span className="text-xs text-gray-500">
                                파일: {docSummary.fileName}
                              </span>
                            )}
                          </div>

                          {/* AI 요약 */}
                          {docSummary.summary && (
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <p className="text-sm text-gray-700 whitespace-pre-line">{docSummary.summary}</p>
                            </div>
                          )}

                          {/* 핵심 지원자격 */}
                          {docSummary.keyEligibility?.length > 0 && (
                            <div>
                              <h6 className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                                <CheckCircle2 size={12} className="text-green-500" />
                                핵심 지원자격
                              </h6>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {docSummary.keyEligibility.map((item, i) => (
                                  <li key={i} className="flex gap-2">
                                    <span className="text-green-500">•</span>
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* 핵심 제외조건 */}
                          {docSummary.keyExclusion?.length > 0 && (
                            <div>
                              <h6 className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                                <AlertTriangle size={12} className="text-orange-500" />
                                제외/제한 조건
                              </h6>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {docSummary.keyExclusion.map((item, i) => (
                                  <li key={i} className="flex gap-2">
                                    <span className="text-orange-500">•</span>
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* 필수 요건 */}
                          {docSummary.keyMandatory?.length > 0 && (
                            <div>
                              <h6 className="text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                                <FileText size={12} className="text-blue-500" />
                                필수 요건/서류
                              </h6>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {docSummary.keyMandatory.map((item, i) => (
                                  <li key={i} className="flex gap-2">
                                    <span className="text-blue-500">•</span>
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* 추천 */}
                          {docSummary.recommendation && (
                            <div className="bg-green-50 p-3 rounded-lg">
                              <p className="text-sm text-green-700">
                                💡 {docSummary.recommendation}
                              </p>
                            </div>
                          )}

                          {/* 노트 (파싱 실패 정보 등) */}
                          {docSummary.notes?.length > 0 && (
                            <div className="text-xs text-gray-500 space-y-1">
                              {docSummary.notes.map((note, i) => (
                                <p key={i}>※ {note}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
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
              )}
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
    </div>
  )
}
