import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 빈 프로필 템플릿
const createEmptyProfile = (name = '새 프로필') => ({
  id: `profile-${Date.now()}`,
  name,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),

  // 서비스 정보
  serviceName: '',
  businessOverview: '',
  targetMarket: '',

  // 기업 기본정보
  companyType: '',
  businessAge: '',
  region: '',
  subRegion: '', // 서울시 구 단위 (region이 'seoul'인 경우에만 사용)

  // 사업 규모
  revenue: '',
  employees: '',

  // 인증 및 투자
  certifications: [],
  investmentStage: '',

  // 관심 분야
  interests: [],

  // 제외 관심 분야 (이 분야의 공고는 추천에서 제외)
  excludedInterests: [],
})

export const useProfileStore = create(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfileId: null,
      isLoggedIn: false,

      // 로그인
      login: (profileId) => {
        const state = get()
        const profile = state.profiles.find((p) => p.id === profileId)
        if (profile) {
          set({ activeProfileId: profileId, isLoggedIn: true })
          return true
        }
        return false
      },

      // 로그아웃
      logout: () => {
        set({ activeProfileId: null, isLoggedIn: false })
      },

      // 현재 활성 프로필 가져오기
      getActiveProfile: () => {
        const state = get()
        if (!state.isLoggedIn || !state.activeProfileId) return null
        return state.profiles.find((p) => p.id === state.activeProfileId) || null
      },

      // 새 프로필 추가
      addProfile: (name = '새 프로필') => {
        const newProfile = createEmptyProfile(name)
        set((state) => ({
          profiles: [...state.profiles, newProfile],
        }))
        return newProfile
      },

      // 프로필 업데이트
      updateProfile: (id, updates) =>
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === id
              ? { ...p, ...updates, updatedAt: new Date().toISOString() }
              : p
          ),
        })),

      // 활성 프로필 업데이트 (편의 함수)
      updateActiveProfile: (updates) => {
        const state = get()
        if (state.activeProfileId) {
          set((state) => ({
            profiles: state.profiles.map((p) =>
              p.id === state.activeProfileId
                ? { ...p, ...updates, updatedAt: new Date().toISOString() }
                : p
            ),
          }))
        }
      },

      // 프로필 삭제
      deleteProfile: (id) =>
        set((state) => {
          const newProfiles = state.profiles.filter((p) => p.id !== id)
          const wasActive = state.activeProfileId === id
          return {
            profiles: newProfiles,
            activeProfileId: wasActive ? null : state.activeProfileId,
            isLoggedIn: wasActive ? false : state.isLoggedIn,
          }
        }),

      // 활성 프로필 변경 (로그인 상태 유지하면서)
      setActiveProfile: (id) => {
        const state = get()
        if (state.isLoggedIn) {
          set({ activeProfileId: id })
        }
      },

      // 인증 토글 (활성 프로필)
      toggleCertification: (cert) =>
        set((state) => {
          const activeProfile = state.profiles.find(
            (p) => p.id === state.activeProfileId
          )
          if (!activeProfile) return state

          const certs = activeProfile.certifications || []
          const newCerts = certs.includes(cert)
            ? certs.filter((c) => c !== cert)
            : [...certs, cert]

          return {
            profiles: state.profiles.map((p) =>
              p.id === state.activeProfileId
                ? { ...p, certifications: newCerts, updatedAt: new Date().toISOString() }
                : p
            ),
          }
        }),

      // 관심분야 토글 (활성 프로필)
      toggleInterest: (interest) =>
        set((state) => {
          const activeProfile = state.profiles.find(
            (p) => p.id === state.activeProfileId
          )
          if (!activeProfile) return state

          const interests = activeProfile.interests || []
          const newInterests = interests.includes(interest)
            ? interests.filter((i) => i !== interest)
            : [...interests, interest]

          return {
            profiles: state.profiles.map((p) =>
              p.id === state.activeProfileId
                ? { ...p, interests: newInterests, updatedAt: new Date().toISOString() }
                : p
            ),
          }
        }),

      // 제외 관심분야 토글 (활성 프로필)
      toggleExcludedInterest: (interest) =>
        set((state) => {
          const activeProfile = state.profiles.find(
            (p) => p.id === state.activeProfileId
          )
          if (!activeProfile) return state

          const excludedInterests = activeProfile.excludedInterests || []
          const newExcludedInterests = excludedInterests.includes(interest)
            ? excludedInterests.filter((i) => i !== interest)
            : [...excludedInterests, interest]

          return {
            profiles: state.profiles.map((p) =>
              p.id === state.activeProfileId
                ? { ...p, excludedInterests: newExcludedInterests, updatedAt: new Date().toISOString() }
                : p
            ),
          }
        }),

      // 모든 프로필 초기화
      clearAllProfiles: () =>
        set({ profiles: [], activeProfileId: null, isLoggedIn: false }),
    }),
    {
      name: 'user-profiles',
      version: 3,
      migrate: (persistedState, version) => {
        // 이전 단일 프로필 데이터 마이그레이션
        if (version === 0 || version === 1) {
          const oldProfile = persistedState.profile
          if (oldProfile && Object.keys(oldProfile).some((k) => oldProfile[k])) {
            const migratedProfile = {
              ...createEmptyProfile('기존 프로필'),
              ...oldProfile,
              id: 'profile-migrated',
            }
            return {
              profiles: [migratedProfile],
              activeProfileId: null,
              isLoggedIn: false,
            }
          }
          return { profiles: [], activeProfileId: null, isLoggedIn: false }
        }
        // version 2 -> 3: isLoggedIn 추가
        if (version === 2) {
          return {
            ...persistedState,
            isLoggedIn: false,
          }
        }
        return persistedState
      },
    }
  )
)

// 옵션 상수 export
export const COMPANY_TYPES = [
  { value: 'preliminary', label: '예비창업자' },
  { value: 'sole', label: '개인사업자' },
  { value: 'sme', label: '법인(중소기업)' },
  { value: 'midsize', label: '법인(중견기업)' },
  { value: 'nonprofit', label: '비영리단체' },
]

export const BUSINESS_AGES = [
  { value: 'preliminary', label: '예비창업' },
  { value: 'under1', label: '1년 미만' },
  { value: '1to3', label: '1~3년' },
  { value: '3to7', label: '3~7년' },
  { value: 'over7', label: '7년 이상' },
]

export const REGIONS = [
  { value: 'seoul', label: '서울' },
  { value: 'gyeonggi', label: '경기' },
  { value: 'incheon', label: '인천' },
  { value: 'gangwon', label: '강원' },
  { value: 'daejeon', label: '대전' },
  { value: 'sejong', label: '세종' },
  { value: 'chungbuk', label: '충북' },
  { value: 'chungnam', label: '충남' },
  { value: 'jeonbuk', label: '전북' },
  { value: 'jeonnam', label: '전남' },
  { value: 'gwangju', label: '광주' },
  { value: 'gyeongbuk', label: '경북' },
  { value: 'gyeongnam', label: '경남' },
  { value: 'daegu', label: '대구' },
  { value: 'busan', label: '부산' },
  { value: 'ulsan', label: '울산' },
  { value: 'jeju', label: '제주' },
]

// 서울특별시 구 목록
export const SEOUL_DISTRICTS = [
  { value: '', label: '전체 (서울시)' },
  { value: 'gangnam', label: '강남구' },
  { value: 'gangdong', label: '강동구' },
  { value: 'gangbuk', label: '강북구' },
  { value: 'gangseo', label: '강서구' },
  { value: 'gwanak', label: '관악구' },
  { value: 'gwangjin', label: '광진구' },
  { value: 'guro', label: '구로구' },
  { value: 'geumcheon', label: '금천구' },
  { value: 'nowon', label: '노원구' },
  { value: 'dobong', label: '도봉구' },
  { value: 'dongdaemun', label: '동대문구' },
  { value: 'dongjak', label: '동작구' },
  { value: 'mapo', label: '마포구' },
  { value: 'seodaemun', label: '서대문구' },
  { value: 'seocho', label: '서초구' },
  { value: 'seongdong', label: '성동구' },
  { value: 'seongbuk', label: '성북구' },
  { value: 'songpa', label: '송파구' },
  { value: 'yangcheon', label: '양천구' },
  { value: 'yeongdeungpo', label: '영등포구' },
  { value: 'yongsan', label: '용산구' },
  { value: 'eunpyeong', label: '은평구' },
  { value: 'jongno', label: '종로구' },
  { value: 'jung', label: '중구' },
  { value: 'jungnang', label: '중랑구' },
]

export const REVENUES = [
  { value: 'none', label: '없음' },
  { value: 'under1', label: '1억 미만' },
  { value: '1to10', label: '1~10억' },
  { value: '10to50', label: '10~50억' },
  { value: 'over50', label: '50억 이상' },
]

export const EMPLOYEES = [
  { value: 'none', label: '없음(예비창업)' },
  { value: '1to5', label: '1~5명' },
  { value: '5to10', label: '5~10명' },
  { value: '10to50', label: '10~50명' },
  { value: 'over50', label: '50명 이상' },
]

export const CERTIFICATIONS = [
  { value: 'venture', label: '벤처기업 인증' },
  { value: 'innobiz', label: '이노비즈 인증' },
  { value: 'mainbiz', label: '메인비즈 인증' },
  { value: 'research', label: '기업부설연구소 보유' },
  { value: 'patent', label: '특허 보유' },
]

export const INVESTMENT_STAGES = [
  { value: 'none', label: '없음' },
  { value: 'seed', label: '시드' },
  { value: 'seriesA', label: '시리즈A' },
  { value: 'seriesB', label: '시리즈B 이상' },
]

// 관심분야 카테고리 (프로필 + 검색 페이지 공용)
// 그룹별로 정리: 기술 > 산업 > 지원유형
export const INTERESTS = [
  // 기술 분야
  { value: 'AI', label: 'AI/데이터', group: '기술', keywords: ['ai', '인공지능', '빅데이터', '머신러닝', '딥러닝'] },
  { value: 'ICT', label: 'ICT/SW', group: '기술', keywords: ['ict', 'sw', '소프트웨어', '정보통신'] },
  { value: '클라우드', label: '클라우드/SaaS', group: '기술', keywords: ['클라우드', 'saas', 'paas', 'iaas'] },
  { value: '블록체인', label: '블록체인/핀테크', group: '기술', keywords: ['블록체인', '핀테크', '금융'] },
  { value: 'IoT', label: 'IoT/스마트', group: '기술', keywords: ['iot', '사물인터넷', '스마트'] },

  // 산업 분야
  { value: '콘텐츠', label: '콘텐츠/미디어', group: '산업', keywords: ['콘텐츠', '미디어', '영상', '음악', '음원', '게임', '웹툰', '애니메이션'] },
  { value: '바이오', label: '바이오/헬스케어', group: '산업', keywords: ['바이오', '헬스케어', '의료', '제약', '진단'] },
  { value: '제조', label: '제조/스마트팩토리', group: '산업', keywords: ['제조', '스마트팩토리', '로봇', '자동화'] },
  { value: '에너지', label: '에너지/친환경', group: '산업', keywords: ['에너지', '친환경', '그린', '탄소중립', 'esg', '재생에너지'] },
  { value: '농식품', label: '농식품/푸드테크', group: '산업', keywords: ['농업', '농식품', '푸드테크', '스마트팜'] },
  { value: '모빌리티', label: '모빌리티/물류', group: '산업', keywords: ['모빌리티', '자율주행', '전기차', '물류'] },
  { value: '교육', label: '교육/에듀테크', group: '산업', keywords: ['교육', '에듀테크', '이러닝'] },
  { value: '관광', label: '관광/문화', group: '산업', keywords: ['관광', '문화', '여행', '레저'] },
  { value: '패션', label: '패션/뷰티', group: '산업', keywords: ['패션', '뷰티', '화장품', '의류'] },

  // 지원 유형
  { value: '창업', label: '창업지원', group: '지원유형', keywords: ['창업', '스타트업', '예비창업'] },
  { value: '수출', label: '수출/해외진출', group: '지원유형', keywords: ['수출', '해외진출', '글로벌', '무역'] },
  { value: 'R&D', label: 'R&D/기술개발', group: '지원유형', keywords: ['r&d', '연구개발', '기술개발'] },
]

// 제외 관심분야 옵션 (명확히 관련 없는 분야만 선택 가능)
// - 선택 시 해당 분야 공고는 추천 목록에서 완전히 제외됨
export const EXCLUDED_INTEREST_OPTIONS = [
  { value: 'bio', label: '바이오/헬스케어', keywords: ['바이오', '헬스케어', '의료', '제약', '진단', '임상', '신약', '생명공학'] },
  { value: 'agriculture', label: '농업/축산', keywords: ['농업', '축산', '농촌', '영농', '작물', '재배', '농가', '스마트팜'] },
  { value: 'fishery', label: '수산/어업', keywords: ['수산', '어업', '양식', '어촌', '해양', '어선'] },
  { value: 'tourism', label: '관광/여행/숙박', keywords: ['관광', '여행', '숙박', '호텔', '리조트', '펜션', '관광지'] },
  { value: 'construction', label: '건설/건축', keywords: ['건설', '건축', '시공', '토목', '리모델링', '배관', '전기공사'] },
  { value: 'manufacturing', label: '전통 제조/공방', keywords: ['가죽', '피혁', '봉제', '섬유', '직물', '공방', '수공예', '도자기', '목공', '소공인'] },
  { value: 'trade', label: '무역/수출입', keywords: ['수출', '무역', '해외진출', '통관', '관세', 'fta'] },
  { value: 'climate', label: '기후테크/환경', keywords: ['기후테크', '탄소중립', '그린뉴딜', '친환경', '재생에너지', '태양광', '풍력'] },
  { value: 'food', label: '요식업/식품', keywords: ['요식업', '외식업', '음식점', '식당', '베이커리', '프랜차이즈', '가맹점'] },
  { value: 'beauty', label: '미용/뷰티샵', keywords: ['미용실', '헤어샵', '네일샵', '피부관리실', '에스테틱'] },
]
