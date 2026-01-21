import { create } from 'zustand'

export const useSearchStore = create((set) => ({
  keyword: '',
  results: [],
  selectedProgram: null,
  isLoading: false,
  error: null,

  setKeyword: (keyword) => set({ keyword }),
  setResults: (results) => set({ results }),
  setSelectedProgram: (program) => set({ selectedProgram: program }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  clearResults: () => set({ results: [], selectedProgram: null }),
}))
