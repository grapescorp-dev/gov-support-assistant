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

  // 사업 규모
  revenue: '',
  employees: '',

  // 인증 및 투자
  certifications: [],
  investmentStage: '',

  // 관심 분야
  interests: [],
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

export const INTERESTS = [
  { value: 'AI', label: 'AI' },
  { value: '음악', label: '음악' },
  { value: 'ICT', label: 'ICT' },
  { value: 'IT', label: 'IT' },
  { value: 'CT', label: 'CT' },
  { value: '콘텐츠', label: '콘텐츠' },
  { value: '창업', label: '창업' },
  { value: '수출', label: '수출' },
  { value: 'R&D', label: 'R&D' },
]
