import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import PageTransition from '../components/PageTransition'
import { BackLink, PageTitle, Card, SkeletonLines } from '../components/ui'
import { getTopic, getSummary } from '../services/apiService'

export default function SummaryPage() {
  const { topicId } = useParams()
  const [topic, setTopic] = useState(null)
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getTopic(topicId).then((t) => active && setTopic(t)).catch(() => {})
    getSummary(topicId)
      .then((d) => active && setSummary(d.summary))
      .catch(() => active && setError('Could not generate a summary. Is the Groq API key set?'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [topicId])

  return (
    <PageTransition>
      <BackLink to={`/topic/${topicId}`}>{topic?.title || 'Topic'}</BackLink>
      <PageTitle overline="Summary" title={topic?.title || 'Loading…'} />

      <Card style={{ padding: 32 }}>
        {loading ? (
          <SkeletonLines count={6} />
        ) : error ? (
          <div style={{ color: 'var(--danger)' }}>{error}</div>
        ) : (
          <p style={{ fontFamily: 'var(--serif)', fontSize: 18, lineHeight: 1.8, color: 'var(--text-dark)', margin: 0 }}>
            {summary}
          </p>
        )}
      </Card>
    </PageTransition>
  )
}
