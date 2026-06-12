import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import { BackLink, PageTitle, SkeletonLines, Card } from '../components/ui'
import { getDocument, getTopics } from '../services/apiService'

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV']

export default function OutlinePage() {
  const { docId } = useParams()
  const navigate = useNavigate()
  const [doc, setDoc] = useState(null)
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      const [d, t] = await Promise.all([getDocument(docId), getTopics(docId)])
      if (!active) return
      setDoc(d)
      setTopics(t)
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [docId])

  return (
    <PageTransition>
      <BackLink to="/">Library</BackLink>
      <PageTitle
        overline="Table of Contents"
        title={doc?.title || 'Loading…'}
        subtitle={
          topics.length
            ? `${topics.length} topics · pick one to begin studying`
            : 'Reading the document…'
        }
      />

      {loading ? (
        <Card>
          <SkeletonLines count={6} />
        </Card>
      ) : (
        <Card style={{ padding: 8 }}>
          {topics.map((topic, i) => (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              onClick={() => navigate(`/topic/${topic.id}`)}
              whileHover={{ backgroundColor: 'var(--primary-light)' }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 18,
                padding: '16px 18px',
                borderRadius: 10,
                cursor: 'pointer',
                borderBottom: i < topics.length - 1 ? '1px solid var(--rule)' : 'none',
              }}
            >
              <span style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--primary)', width: 38, fontStyle: 'italic' }}>
                {ROMAN[i] || i + 1}
              </span>
              <span style={{ flex: 1, fontFamily: 'var(--serif)', fontSize: 17, color: 'var(--text-dark)' }}>
                {topic.title}
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                {topic.chunk_count} passages
              </span>
              <ChevronRight size={18} color="var(--text-muted)" />
            </motion.div>
          ))}
        </Card>
      )}
    </PageTransition>
  )
}
