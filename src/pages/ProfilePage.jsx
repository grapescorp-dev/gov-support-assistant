import { useState, useMemo } from 'react'
import {
  useProfileStore,
  COMPANY_TYPES,
  BUSINESS_AGES,
  REGIONS,
  SEOUL_DISTRICTS,
  REVENUES,
  EMPLOYEES,
  CERTIFICATIONS,
  INVESTMENT_STAGES,
  INTERESTS,
  EXCLUDED_INTEREST_OPTIONS,
} from '../stores/useProfileStore'
import { useToastStore } from '../stores/useToastStore'
import {
  INTERESTS_COPY,
  SERVICE_NAME_COPY,
  BUSINESS_OVERVIEW_COPY,
  COMPANY_INFO_COPY,
  REGION_COPY,
  countDomainKeywords,
  isOverviewAbstract,
} from '../constants/microcopy'
import {
  Save,
  Trash2,
  Building2,
  Users,
  Award,
  Target,
  Briefcase,
  Plus,
  Check,
  Edit3,
  X,
  AlertCircle,
  Lightbulb,
  Star,
  Zap,
  MapPin,
} from 'lucide-react'

// 도메인 키워드 (matchingScore.js와 동일)
const DOMAIN_KEYWORDS = {
  ai: ['ai', '인공지능', '머신러닝', '딥러닝', 'llm', 'gpt', 'chatgpt'],
  saas: ['saas', '구독', '클라우드', '서비스형'],
  data: ['데이터', '빅데이터', '데이터분석', '데이터플랫폼'],
  ict: ['ict', 'it', '정보통신', '소프트웨어', 'sw'],
  content: ['콘텐츠', '미디어', '영상', '음악', '게임', '웹툰'],
  fintech: ['핀테크', '금융', '블록체인', '암호화폐', '결제'],
  bio: ['바이오', '헬스케어', '의료', '건강'],
  manufacturing: ['제조', '생산', '공장', '스마트팩토리'],
  foodtech: ['푸드테크', '식품', '음식'],
  education: ['교육', '에듀테크', '이러닝', '학습'],
  mobility: ['모빌리티', '자율주행', '전기차', '물류'],
  energy: ['에너지', '친환경', '그린', '탄소중립', 'esg'],
}

// 도메인 한글명 매핑
const DOMAIN_LABELS = {
  ai: 'AI/인공지능',
  saas: 'SaaS/클라우드',
  data: '데이터',
  ict: 'ICT/SW',
  content: '콘텐츠/미디어',
  fintech: '핀테크/금융',
  bio: '바이오/헬스케어',
  manufacturing: '제조/스마트팩토리',
  foodtech: '푸드테크/식품',
  education: '교육/에듀테크',
  mobility: '모빌리티',
  energy: '에너지/친환경',
}

// 핵심 도메인 (기술/산업 분야) - 우선 선택 유도
const CORE_INTERESTS = INTERESTS.filter(i => i.group === '기술' || i.group === '산업')
// 보조 관심분야 (지원유형)
const SECONDARY_INTERESTS = INTERESTS.filter(i => i.group === '지원유형')

// 텍스트에서 도메인 키워드 감지
function detectDomainKeywords(text) {
  if (!text) return []
  const lowerText = text.toLowerCase()
  const detected = []

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      detected.push(domain)
    }
  }
  return detected
}

// 재사용 가능한 Select 컴포넌트
function SelectField({ label, name, value, onChange, options, placeholder, hint }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <select
        name={name}
        value={value || ''}
        onChange={onChange}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
      >
        <option value="">{placeholder || `${label} 선택`}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

// 추천 정확도 가이드 컴포넌트
function KeywordGuide({ detectedKeywords, hasCoreDomain }) {
  const count = detectedKeywords.length

  if (count === 0 && !hasCoreDomain) {
    return (
      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-700">업종 키워드를 추가해보세요</p>
            <p className="text-xs text-amber-600 mt-0.5">
              AI, 헬스케어, 콘텐츠 등 구체적인 키워드가 있으면 맞춤 추천이 가능합니다.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (count >= 1 && count <= 2) {
    return (
      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <Lightbulb size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-700">기본 추천 가능</p>
            <p className="text-xs text-blue-600 mt-0.5">
              감지된 키워드: {detectedKeywords.map(d => DOMAIN_LABELS[d]).join(', ')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
      <div className="flex items-start gap-2">
        <Zap size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-green-700">맞춤 추천 가능</p>
          <p className="text-xs text-green-600 mt-0.5">
            감지된 키워드: {detectedKeywords.map(d => DOMAIN_LABELS[d]).join(', ')}
          </p>
        </div>
      </div>
    </div>
  )
}

// 추천 품질 시각화 컴포넌트
function RecommendationQualityIndicator({ quality, reasons }) {
  const configs = {
    low: {
      label: '낮음',
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
      barColor: 'bg-amber-400',
      width: '33%',
    },
    medium: {
      label: '보통',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      barColor: 'bg-blue-500',
      width: '66%',
    },
    high: {
      label: '높음',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      barColor: 'bg-green-500',
      width: '100%',
    },
  }

  const config = configs[quality]

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Star size={18} className={config.color} />
          <span className="font-medium text-gray-900">예상 추천 품질</span>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.color}`}>
          {config.label}
        </span>
      </div>

      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full ${config.barColor} transition-all duration-500`}
          style={{ width: config.width }}
        />
      </div>

      {reasons.length > 0 && (
        <ul className="space-y-1">
          {reasons.map((reason, idx) => (
            <li key={idx} className="text-xs text-gray-600 flex items-start gap-1.5">
              <span className="text-gray-400">•</span>
              {reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// 핵심 도메인 선택 컴포넌트 (복수 선택 가능)
function CoreDomainSelector({ label, options, selectedValues = [], onToggle }) {
  // 그룹별로 분류
  const groupedOptions = options.reduce((acc, opt) => {
    if (!acc[opt.group]) acc[opt.group] = []
    acc[opt.group].push(opt)
    return acc
  }, {})

  const selectedCount = selectedValues.filter(v =>
    options.some(o => o.value === v)
  ).length

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <span className="text-xs text-gray-500">
          {selectedCount}개 선택됨
        </span>
      </div>

      {Object.entries(groupedOptions).map(([group, groupOpts]) => (
        <div key={group} className="mb-4">
          <p className="text-xs text-gray-500 mb-2 font-medium">{group}</p>
          <div className="flex flex-wrap gap-2">
            {groupOpts.map((opt) => {
              const isSelected = selectedValues.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onToggle(opt.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// 보조 관심분야 선택 컴포넌트
function SecondaryInterestSelector({ label, options, selectedValues = [], onToggle }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = selectedValues.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onToggle(opt.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                isSelected
                  ? 'bg-gray-700 text-white border-gray-700'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// 재사용 가능한 Checkbox Group 컴포넌트
function CheckboxGroup({ label, options, selectedValues = [], onToggle }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-3">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const isSelected = selectedValues.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onToggle(opt.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// 섹션 헤더 컴포넌트
// eslint-disable-next-line no-unused-vars
function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="text-blue-600" size={20} />
      </div>
      <div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  )
}

// 프로필 카드 컴포넌트
function ProfileCard({ profile, isActive, onSelect, onDelete, onRename }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(profile.name)

  const handleRename = () => {
    if (editName.trim()) {
      onRename(profile.id, editName.trim())
    }
    setIsEditing(false)
  }

  return (
    <div
      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
        isActive
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
      onClick={() => onSelect(profile.id)}
    >
      {isActive && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
          <Check size={14} className="text-white" />
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRename()
                  if (e.key === 'Escape') setIsEditing(false)
                }}
              />
              <button
                onClick={handleRename}
                className="p-1 text-green-600 hover:bg-green-50 rounded"
              >
                <Check size={16} />
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="p-1 text-gray-400 hover:bg-gray-100 rounded"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-gray-900 truncate">{profile.name}</h4>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setEditName(profile.name)
                  setIsEditing(true)
                }}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              >
                <Edit3 size={14} />
              </button>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1 truncate">
            {profile.serviceName || '서비스명 미설정'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(profile.updatedAt).toLocaleDateString('ko-KR')} 수정
          </p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(profile.id)
          }}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* 관심분야 태그 */}
      {profile.interests && profile.interests.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {profile.interests.slice(0, 3).map((interest) => (
            <span
              key={interest}
              className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
            >
              {interest}
            </span>
          ))}
          {profile.interests.length > 3 && (
            <span className="text-xs text-gray-400">+{profile.interests.length - 3}</span>
          )}
        </div>
      )}
    </div>
  )
}

export function ProfilePage() {
  const {
    profiles,
    activeProfileId,
    getActiveProfile,
    addProfile,
    updateProfile,
    updateActiveProfile,
    deleteProfile,
    setActiveProfile,
    toggleCertification,
    toggleInterest,
    toggleExcludedInterest,
  } = useProfileStore()

  const { success, error } = useToastStore()

  const activeProfile = getActiveProfile()

  // 도메인 키워드 감지 (서비스명 + 사업개요)
  const detectedKeywords = useMemo(() => {
    if (!activeProfile) return []
    const text = [
      activeProfile.serviceName || '',
      activeProfile.businessOverview || '',
      activeProfile.targetMarket || '',
    ].join(' ')
    return detectDomainKeywords(text)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile?.serviceName, activeProfile?.businessOverview, activeProfile?.targetMarket])

  // 핵심 도메인 선택 여부
  const activeInterests = activeProfile?.interests
  const hasCoreDomain = useMemo(() => {
    if (!activeInterests) return false
    return activeInterests.some(i =>
      CORE_INTERESTS.some(ci => ci.value === i)
    )
  }, [activeInterests])

  // 추천 품질 계산
  const recommendationQuality = useMemo(() => {
    if (!activeProfile) return { quality: 'low', reasons: [] }

    const reasons = []
    let score = 0

    // 핵심 도메인 선택
    const coreCount = (activeProfile.interests || []).filter(i =>
      CORE_INTERESTS.some(ci => ci.value === i)
    ).length

    if (coreCount >= 2) {
      score += 3
    } else if (coreCount === 1) {
      score += 2
      reasons.push('핵심 도메인을 추가로 선택하면 추천 정확도가 올라갑니다')
    } else {
      reasons.push('핵심 도메인을 선택해주세요')
    }

    // 서비스명/사업개요 키워드
    if (detectedKeywords.length >= 3) {
      score += 2
    } else if (detectedKeywords.length >= 1) {
      score += 1
      reasons.push('사업 개요에 구체적인 키워드를 추가해보세요')
    } else {
      reasons.push('서비스명이나 사업 개요에 업종 키워드가 없습니다')
    }

    // 업력
    if (activeProfile.businessAge) {
      score += 1
    } else {
      reasons.push('업력을 선택하면 단계별 맞춤 추천이 가능합니다')
    }

    // 지역
    if (activeProfile.region) {
      score += 1
    }

    // 품질 결정
    let quality = 'low'
    if (score >= 5) {
      quality = 'high'
    } else if (score >= 3) {
      quality = 'medium'
    }

    return { quality, reasons }
  }, [activeProfile, detectedKeywords])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (activeProfileId) {
      updateProfile(activeProfileId, { [name]: value })
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (activeProfile) {
      success('프로필이 저장되었습니다')
    }
  }

  const handleAddProfile = () => {
    const newProfile = addProfile(`프로필 ${profiles.length + 1}`)
    setActiveProfile(newProfile.id)
    success('새 프로필이 추가되었습니다')
  }

  const handleDeleteProfile = (id) => {
    if (profiles.length === 1) {
      error('최소 하나의 프로필이 필요합니다')
      return
    }
    if (window.confirm('이 프로필을 삭제하시겠습니까?')) {
      deleteProfile(id)
      success('프로필이 삭제되었습니다')
    }
  }

  const handleRenameProfile = (id, newName) => {
    updateProfile(id, { name: newName })
    success('프로필 이름이 변경되었습니다')
  }

  // 프로필 완성도 계산
  const calculateProgress = () => {
    if (!activeProfile) return 0
    const fields = [
      activeProfile.serviceName,
      activeProfile.companyType,
      activeProfile.businessAge,
      activeProfile.region,
      activeProfile.revenue,
      activeProfile.employees,
      activeProfile.businessOverview,
    ]
    const filledFields = fields.filter((f) => f && f.length > 0).length
    const hasInterests = activeProfile.interests && activeProfile.interests.length > 0
    const total = fields.length + 1
    const filled = filledFields + (hasInterests ? 1 : 0)
    return Math.round((filled / total) * 100)
  }

  const progress = calculateProgress()

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">기업 프로필 설정</h2>
        {activeProfile && (
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-500">완성도</div>
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-sm font-medium text-blue-600">{progress}%</div>
          </div>
        )}
      </div>

      {/* 프로필 목록 */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">내 프로필 ({profiles.length})</h3>
          <button
            onClick={handleAddProfile}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Plus size={16} />
            새 프로필
          </button>
        </div>

        {profiles.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-8 text-center border border-dashed border-gray-300">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="text-gray-400" size={24} />
            </div>
            <p className="text-gray-500 mb-4">아직 프로필이 없습니다</p>
            <button
              onClick={handleAddProfile}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={18} />
              첫 프로필 만들기
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {profiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                isActive={profile.id === activeProfileId}
                onSelect={setActiveProfile}
                onDelete={handleDeleteProfile}
                onRename={handleRenameProfile}
              />
            ))}
            <button
              onClick={handleAddProfile}
              className="p-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-blue-600"
            >
              <Plus size={24} />
              <span className="text-sm font-medium">프로필 추가</span>
            </button>
          </div>
        )}
      </section>

      {/* 프로필 편집 폼 */}
      {activeProfile && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 예상 추천 품질 (상단에 배치) */}
          <RecommendationQualityIndicator
            quality={recommendationQuality.quality}
            reasons={recommendationQuality.reasons}
          />

          {/* 섹션 1: 핵심 도메인 (가장 중요) */}
          <section className="bg-white rounded-xl p-6 border-2 border-blue-200">
            <SectionHeader
              icon={Target}
              title="핵심 도메인"
              description="가장 중요! 사업의 주요 분야를 선택하세요 (복수 선택 가능)"
            />

            {/* [마이크로카피] 관심분야 안내 */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm space-y-1">
              <p className="font-medium text-blue-800">{INTERESTS_COPY.importance}</p>
              <p className="text-blue-700">{INTERESTS_COPY.filterInfo}</p>
              <p className="text-blue-600">{INTERESTS_COPY.tipGood}</p>
              <p className="text-blue-600">{INTERESTS_COPY.tipBad}</p>
            </div>

            <CoreDomainSelector
              label=""
              options={CORE_INTERESTS}
              selectedValues={activeProfile.interests || []}
              onToggle={toggleInterest}
            />

            {/* [마이크로카피] 관심분야 비어있을 때 경고 */}
            {!hasCoreDomain && (
              <p className="mt-3 text-sm text-amber-600 flex items-center gap-1">
                <AlertCircle size={14} />
                {INTERESTS_COPY.emptyWarning}
              </p>
            )}
          </section>

          {/* 섹션 2: 서비스 정보 */}
          <section className="bg-white rounded-xl p-6 border border-gray-200">
            <SectionHeader
              icon={Briefcase}
              title="서비스 정보"
              description="구체적일수록 추천 정확도가 높아집니다"
            />
            <div className="space-y-4">
              {/* [마이크로카피] 서비스명 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">서비스명</label>
                <input
                  type="text"
                  name="serviceName"
                  value={activeProfile.serviceName || ''}
                  onChange={handleChange}
                  placeholder="예: AI 기반 헬스케어 플랫폼"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* [마이크로카피] 사업 개요 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">사업 개요</label>
                <p className="text-xs text-gray-500 mb-2">{BUSINESS_OVERVIEW_COPY.info}</p>
                <textarea
                  name="businessOverview"
                  value={activeProfile.businessOverview || ''}
                  onChange={handleChange}
                  rows={3}
                  placeholder={BUSINESS_OVERVIEW_COPY.placeholder}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />

                {/* [마이크로카피] 사업개요 추상적 경고 */}
                {activeProfile.businessOverview && isOverviewAbstract(activeProfile.businessOverview) && (
                  <p className="mt-2 text-xs text-amber-600 flex items-start gap-1">
                    <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                    {BUSINESS_OVERVIEW_COPY.abstractWarning}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">타겟 시장</label>
                <textarea
                  name="targetMarket"
                  value={activeProfile.targetMarket || ''}
                  onChange={handleChange}
                  rows={2}
                  placeholder="목표 고객과 시장을 설명해주세요"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* 추천 정확도 가이드 */}
              <KeywordGuide
                detectedKeywords={detectedKeywords}
                hasCoreDomain={hasCoreDomain}
              />
            </div>
          </section>

          {/* 섹션 3: 기업 기본정보 */}
          <section className="bg-white rounded-xl p-6 border border-gray-200">
            <SectionHeader
              icon={Building2}
              title="기업 기본정보"
              description="기업 형태와 업력에 따라 지원 자격이 달라집니다"
            />

            {/* [마이크로카피] 기업형태/업력 안내 */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg text-xs space-y-1">
              <p className="text-gray-600">{COMPANY_INFO_COPY.companyType}</p>
              <p className="text-gray-600">{COMPANY_INFO_COPY.businessAge.main}</p>
              <p className="text-gray-500">{COMPANY_INFO_COPY.businessAge.sub}</p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <SelectField
                label="기업 형태"
                name="companyType"
                value={activeProfile.companyType}
                onChange={handleChange}
                options={COMPANY_TYPES}
              />
              <SelectField
                label="업력"
                name="businessAge"
                value={activeProfile.businessAge}
                onChange={handleChange}
                options={BUSINESS_AGES}
                hint="예비창업자는 초기검증/사업화 공고를 우선 추천"
              />
              <div>
                <SelectField
                  label="소재지"
                  name="region"
                  value={activeProfile.region}
                  onChange={(e) => {
                    handleChange(e)
                    // 서울이 아닌 다른 지역 선택 시 subRegion 초기화
                    if (e.target.value !== 'seoul') {
                      updateActiveProfile({ subRegion: '' })
                    }
                  }}
                  options={REGIONS}
                />
                {/* [마이크로카피] 지역 안내 */}
                <div className="mt-2 text-xs text-gray-500 flex items-start gap-1">
                  <MapPin size={12} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p>{REGION_COPY.main}</p>
                    <p className="text-gray-400">{REGION_COPY.sub}</p>
                  </div>
                </div>
              </div>
              {/* 서울 선택 시 구 단위 선택 표시 */}
              {activeProfile.region === 'seoul' && (
                <SelectField
                  label="세부 지역 (서울시 구)"
                  name="subRegion"
                  value={activeProfile.subRegion || ''}
                  onChange={handleChange}
                  options={SEOUL_DISTRICTS}
                  placeholder="구 선택 (선택사항)"
                />
              )}
            </div>

            {/* 업종 부족 안내 */}
            {(activeProfile.region || activeProfile.companyType) && !hasCoreDomain && detectedKeywords.length === 0 && (
              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600 flex items-center gap-1.5">
                  <AlertCircle size={14} className="text-gray-400" />
                  업종 정보가 부족하면 지역/형태 무관 공고 위주로 노출됩니다
                </p>
              </div>
            )}
          </section>

          {/* 섹션 4: 사업 규모 */}
          <section className="bg-white rounded-xl p-6 border border-gray-200">
            <SectionHeader
              icon={Users}
              title="사업 규모"
              description="매출과 인력 규모에 따른 지원사업을 찾을 수 있습니다"
            />
            <div className="grid md:grid-cols-2 gap-4">
              <SelectField
                label="연 매출 규모"
                name="revenue"
                value={activeProfile.revenue}
                onChange={handleChange}
                options={REVENUES}
              />
              <SelectField
                label="고용 인원"
                name="employees"
                value={activeProfile.employees}
                onChange={handleChange}
                options={EMPLOYEES}
              />
            </div>
          </section>

          {/* 섹션 5: 인증 및 투자 */}
          <section className="bg-white rounded-xl p-6 border border-gray-200">
            <SectionHeader
              icon={Award}
              title="인증 및 투자"
              description="보유 인증과 투자 이력을 선택해주세요"
            />
            <div className="space-y-5">
              <CheckboxGroup
                label="보유 인증 (다중 선택 가능)"
                options={CERTIFICATIONS}
                selectedValues={activeProfile.certifications}
                onToggle={toggleCertification}
              />
              <SelectField
                label="투자 유치 이력"
                name="investmentStage"
                value={activeProfile.investmentStage}
                onChange={handleChange}
                options={INVESTMENT_STAGES}
              />
            </div>
          </section>

          {/* 섹션 6: 보조 관심분야 */}
          <section className="bg-white rounded-xl p-6 border border-gray-200">
            <SectionHeader
              icon={Lightbulb}
              title="보조 관심분야"
              description="추가로 관심 있는 지원 유형을 선택하세요 (선택사항)"
            />
            <SecondaryInterestSelector
              label=""
              options={SECONDARY_INTERESTS}
              selectedValues={activeProfile.interests || []}
              onToggle={toggleInterest}
            />
          </section>

          {/* 섹션 7: 제외 관심 분야 */}
          <section className="bg-white rounded-xl p-6 border border-gray-200">
            <SectionHeader
              icon={X}
              title="제외 관심 분야"
              description="추천에서 제외할 분야를 선택하세요 (선택된 분야의 공고는 추천 목록에서 제외됩니다)"
            />
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg mb-4">
              <p className="text-sm text-amber-700">
                <strong>팁:</strong> 사업과 명확히 관련 없는 분야를 선택하면 더 정확한 추천을 받을 수 있습니다.
                예를 들어, IT 서비스 기업이라면 농업/축산, 수산/어업, 건설/건축 등을 제외할 수 있습니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {EXCLUDED_INTEREST_OPTIONS.map((option) => {
                const isSelected = (activeProfile.excludedInterests || []).includes(option.value)
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleExcludedInterest(option.value)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                      isSelected
                        ? 'bg-red-100 border-red-300 text-red-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {isSelected && <X size={14} />}
                      {option.label}
                    </span>
                  </button>
                )
              })}
            </div>
            {(activeProfile.excludedInterests || []).length > 0 && (
              <p className="text-xs text-gray-500 mt-3">
                {(activeProfile.excludedInterests || []).length}개 분야 제외 중 - 해당 분야 공고는 추천 목록에 표시되지 않습니다.
              </p>
            )}
          </section>

          {/* 저장 버튼 */}
          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Save size={18} />
              프로필 저장
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
