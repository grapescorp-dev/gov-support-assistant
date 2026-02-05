import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * 사용자 피드백 저장소 (5단계: 사용자 피드백 시스템)
 * - 잘못된 추천 신고 저장
 * - 피드백 패턴 분석용 데이터 수집
 * - localStorage에 영속화
 */

// 피드백 유형
export const FEEDBACK_TYPES = {
  WRONG_REGION: 'wrong_region',       // 지역 불일치
  WRONG_INDUSTRY: 'wrong_industry',   // 산업/분야 불일치
  NOT_ELIGIBLE: 'not_eligible',       // 자격 조건 미충족
  ALREADY_CLOSED: 'already_closed',   // 이미 마감된 공고
  IRRELEVANT: 'irrelevant',           // 관련 없는 공고
  OTHER: 'other',                     // 기타
}

// 피드백 유형 라벨
export const FEEDBACK_TYPE_LABELS = {
  [FEEDBACK_TYPES.WRONG_REGION]: '지역이 맞지 않아요',
  [FEEDBACK_TYPES.WRONG_INDUSTRY]: '분야가 맞지 않아요',
  [FEEDBACK_TYPES.NOT_ELIGIBLE]: '자격 조건이 안 맞아요',
  [FEEDBACK_TYPES.ALREADY_CLOSED]: '이미 마감된 공고예요',
  [FEEDBACK_TYPES.IRRELEVANT]: '관련 없는 공고예요',
  [FEEDBACK_TYPES.OTHER]: '기타',
}

export const useFeedbackStore = create(
  persist(
    (set, get) => ({
      // 피드백 목록: { announcementId, feedbackType, profileId, comment, createdAt }
      feedbacks: [],

      // 블랙리스트: 사용자가 "다시 보지 않기"한 공고 ID
      blacklist: [],

      /**
       * 피드백 추가
       * @param {Object} feedback - { announcementId, feedbackType, profileId, comment? }
       */
      addFeedback: (feedback) =>
        set((state) => {
          const newFeedback = {
            ...feedback,
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
          }

          // 같은 공고에 대한 기존 피드백이 있으면 업데이트
          const existingIndex = state.feedbacks.findIndex(
            (f) => f.announcementId === feedback.announcementId && f.profileId === feedback.profileId
          )

          if (existingIndex !== -1) {
            const updatedFeedbacks = [...state.feedbacks]
            updatedFeedbacks[existingIndex] = newFeedback
            return { feedbacks: updatedFeedbacks }
          }

          return { feedbacks: [...state.feedbacks, newFeedback] }
        }),

      /**
       * 피드백 삭제
       * @param {string} feedbackId - 피드백 ID
       */
      removeFeedback: (feedbackId) =>
        set((state) => ({
          feedbacks: state.feedbacks.filter((f) => f.id !== feedbackId),
        })),

      /**
       * 특정 공고에 대한 피드백 조회
       * @param {string} announcementId - 공고 ID
       * @param {string} profileId - 프로필 ID (optional)
       * @returns {Object|null} 피드백 또는 null
       */
      getFeedback: (announcementId, profileId = null) => {
        const feedbacks = get().feedbacks
        if (profileId) {
          return feedbacks.find(
            (f) => f.announcementId === announcementId && f.profileId === profileId
          ) || null
        }
        return feedbacks.find((f) => f.announcementId === announcementId) || null
      },

      /**
       * 특정 공고에 피드백이 있는지 확인
       * @param {string} announcementId - 공고 ID
       * @returns {boolean}
       */
      hasFeedback: (announcementId) =>
        get().feedbacks.some((f) => f.announcementId === announcementId),

      /**
       * 블랙리스트에 추가 (다시 보지 않기)
       * @param {string} announcementId - 공고 ID
       */
      addToBlacklist: (announcementId) =>
        set((state) => ({
          blacklist: state.blacklist.includes(announcementId)
            ? state.blacklist
            : [...state.blacklist, announcementId],
        })),

      /**
       * 블랙리스트에서 제거
       * @param {string} announcementId - 공고 ID
       */
      removeFromBlacklist: (announcementId) =>
        set((state) => ({
          blacklist: state.blacklist.filter((id) => id !== announcementId),
        })),

      /**
       * 블랙리스트 여부 확인
       * @param {string} announcementId - 공고 ID
       * @returns {boolean}
       */
      isBlacklisted: (announcementId) => get().blacklist.includes(announcementId),

      /**
       * 피드백 통계 조회
       * @returns {Object} { total, byType: { wrong_region: n, ... } }
       */
      getStats: () => {
        const feedbacks = get().feedbacks
        const byType = {}

        feedbacks.forEach((f) => {
          byType[f.feedbackType] = (byType[f.feedbackType] || 0) + 1
        })

        return {
          total: feedbacks.length,
          byType,
          blacklistCount: get().blacklist.length,
        }
      },

      /**
       * 특정 유형의 피드백이 많은 공고 ID 목록 조회
       * (패턴 분석용)
       * @param {string} feedbackType - 피드백 유형
       * @param {number} minCount - 최소 피드백 수 (기본 2)
       * @returns {string[]} 공고 ID 배열
       */
      getFrequentlyReportedAnnouncements: (feedbackType, minCount = 2) => {
        const feedbacks = get().feedbacks.filter((f) => f.feedbackType === feedbackType)
        const countMap = {}

        feedbacks.forEach((f) => {
          countMap[f.announcementId] = (countMap[f.announcementId] || 0) + 1
        })

        return Object.entries(countMap)
          .filter(([, count]) => count >= minCount)
          .map(([id]) => id)
      },

      /**
       * 전체 피드백 삭제
       */
      clearFeedbacks: () => set({ feedbacks: [] }),

      /**
       * 블랙리스트 초기화
       */
      clearBlacklist: () => set({ blacklist: [] }),
    }),
    {
      name: 'recommendation-feedback',
    }
  )
)
