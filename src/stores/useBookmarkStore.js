import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useBookmarkStore = create(
  persist(
    (set, get) => ({
      bookmarks: [], // 북마크된 공고 ID 배열

      addBookmark: (announcementId) =>
        set((state) => ({
          bookmarks: state.bookmarks.includes(announcementId)
            ? state.bookmarks
            : [...state.bookmarks, announcementId],
        })),

      removeBookmark: (announcementId) =>
        set((state) => ({
          bookmarks: state.bookmarks.filter((id) => id !== announcementId),
        })),

      toggleBookmark: (announcementId) =>
        set((state) => ({
          bookmarks: state.bookmarks.includes(announcementId)
            ? state.bookmarks.filter((id) => id !== announcementId)
            : [...state.bookmarks, announcementId],
        })),

      isBookmarked: (announcementId) => get().bookmarks.includes(announcementId),

      clearBookmarks: () => set({ bookmarks: [] }),
    }),
    {
      name: 'bookmarks',
    }
  )
)
