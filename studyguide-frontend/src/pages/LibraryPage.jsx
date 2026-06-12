import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { UploadCloud, FileText, FileType2, Trash2, Loader2, AlertCircle } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import { Card, PageTitle, ProgressBar, ConfirmDialog } from '../components/ui'
import { useDocuments } from '../context/DocumentContext'
import { uploadDocument, deleteDocument } from '../services/apiService'

export default function LibraryPage() {
  const { documents, refresh } = useDocuments()
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [confirmId, setConfirmId] = useState(null)
  const [error, setError] = useState('')
  const inputRef = useRef(null)
  const navigate = useNavigate()

  // Poll while any document is still processing.
  useEffect(() => {
    if (!documents.some((d) => d.status === 'processing')) return
    const id = setInterval(refresh, 1500)
    return () => clearInterval(id)
  }, [documents, refresh])

  async function handleFiles(files) {
    const file = files?.[0]
    if (!file) return
    setError('')
    setUploadPct(0)
    setUploading(true)
    try {
      await uploadDocument(file, setUploadPct)
      await refresh()
    } catch (e) {
      setError(e?.response?.data?.detail || 'Upload failed. Use a .pdf or .docx file.')
    } finally {
      setUploading(false)
    }
  }

  const confirmDoc = documents.find((d) => d.id === confirmId)

  async function confirmDelete() {
    const id = confirmId
    setConfirmId(null)
    if (id == null) return
    await deleteDocument(id)
    refresh()
  }

  return (
    <PageTransition>
      <PageTitle
        overline="Your Library"
        title="What shall we study today?"
        subtitle="Upload a PDF or Word document. StudyGuide breaks it into topics you can chat with, summarize, and quiz yourself on."
      />

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--primary)' : 'var(--rule)'}`,
          background: dragging ? 'var(--primary-light)' : 'var(--bg-card)',
          borderRadius: 16,
          padding: '44px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.18s ease',
          marginBottom: 14,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div style={{ display: 'grid', placeItems: 'center', gap: 12 }}>
          {uploading ? (
            <Loader2 size={34} className="spin" color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <UploadCloud size={34} color="var(--primary)" />
          )}
          <div style={{ fontFamily: 'var(--serif)', fontSize: 19, color: 'var(--text-dark)' }}>
            {uploading ? `Uploading… ${uploadPct}%` : 'Drop a document here'}
          </div>
          {uploading ? (
            <div style={{ width: 240, maxWidth: '80%' }}>
              <ProgressBar value={uploadPct} />
            </div>
          ) : (
            <div style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
              PDF or Word (.docx) · click to browse
            </div>
          )}
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--danger)', fontSize: 13.5, marginBottom: 18 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 16,
          marginTop: 24,
        }}
      >
        {documents.map((doc, i) => (
          <motion.div
            key={doc.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
            whileHover={{ y: -4 }}
            onClick={() => doc.status === 'ready' && navigate(`/doc/${doc.id}`)}
          >
            <Card
              style={{
                cursor: doc.status === 'ready' ? 'pointer' : 'default',
                opacity: doc.status === 'error' ? 0.7 : 1,
                height: '100%',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                {doc.source_type === 'pdf' ? (
                  <FileText size={26} color="var(--primary)" />
                ) : (
                  <FileType2 size={26} color="var(--info)" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setConfirmId(doc.id)
                  }}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 17, marginTop: 14, color: 'var(--text-dark)', lineHeight: 1.3 }}>
                {doc.title}
              </div>
              <div style={{ marginTop: 12 }}>
                <StatusBadge doc={doc} />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <ConfirmDialog
        open={confirmId != null}
        title="Delete this document?"
        message={
          confirmDoc
            ? `“${confirmDoc.title}” and all of its topics, chats, flashcards and quizzes will be permanently removed.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmId(null)}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </PageTransition>
  )
}

function StatusBadge({ doc }) {
  if (doc.status === 'processing') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-muted)' }}>
          <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
          {doc.stage || 'Analyzing…'}{doc.progress ? ` · ${doc.progress}%` : ''}
        </span>
        <ProgressBar value={doc.progress || 0} />
      </div>
    )
  }
  if (doc.status === 'error') {
    return <span style={{ fontSize: 12.5, color: 'var(--danger)' }}>Failed to process</span>
  }
  return (
    <span style={{ fontSize: 12.5, color: 'var(--primary-dark)', background: 'var(--primary-light)', padding: '3px 10px', borderRadius: 20 }}>
      Ready · {doc.topic_method === 'outline' ? 'outline' : 'AI topics'}
    </span>
  )
}
