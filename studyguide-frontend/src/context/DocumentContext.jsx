import { createContext, useContext, useState, useCallback } from 'react'
import { listDocuments } from '../services/apiService'

const DocumentContext = createContext(null)

export function DocumentProvider({ children }) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setDocuments(await listDocuments())
    } finally {
      setLoading(false)
    }
  }, [])

  return (
    <DocumentContext.Provider value={{ documents, loading, refresh }}>
      {children}
    </DocumentContext.Provider>
  )
}

export function useDocuments() {
  const ctx = useContext(DocumentContext)
  if (!ctx) throw new Error('useDocuments must be used within DocumentProvider')
  return ctx
}
