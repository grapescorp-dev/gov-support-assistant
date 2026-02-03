import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useDocumentStore = create(
  persist(
    (set) => ({
      documents: [],
      currentDocument: null,

      createDocument: (programId, programTitle) => {
        const newDoc = {
          id: Date.now().toString(),
          programId,
          programTitle,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sections: {
            overview: '',
            problem: '',
            solution: '',
            market: '',
            team: '',
            budget: '',
            timeline: '',
          },
        }
        set((state) => ({
          documents: [...state.documents, newDoc],
          currentDocument: newDoc,
        }))
        return newDoc
      },

      updateSection: (docId, sectionKey, content) =>
        set((state) => ({
          documents: state.documents.map((doc) =>
            doc.id === docId
              ? {
                  ...doc,
                  sections: { ...doc.sections, [sectionKey]: content },
                  updatedAt: new Date().toISOString(),
                }
              : doc
          ),
          currentDocument:
            state.currentDocument?.id === docId
              ? {
                  ...state.currentDocument,
                  sections: { ...state.currentDocument.sections, [sectionKey]: content },
                  updatedAt: new Date().toISOString(),
                }
              : state.currentDocument,
        })),

      setCurrentDocument: (docId) =>
        set((state) => ({
          currentDocument: state.documents.find((d) => d.id === docId) || null,
        })),

      deleteDocument: (docId) =>
        set((state) => ({
          documents: state.documents.filter((d) => d.id !== docId),
          currentDocument:
            state.currentDocument?.id === docId ? null : state.currentDocument,
        })),
    }),
    {
      name: 'documents',
    }
  )
)
