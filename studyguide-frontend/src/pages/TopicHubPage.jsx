import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MessagesSquare, ScrollText, Layers, ListChecks } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import { BackLink, PageTitle } from '../components/ui'
import { getTopic } from '../services/apiService'

const TOOLS = [
  { key: 'chat', label: 'Chat', desc: 'Ask questions and get cited answers', icon: MessagesSquare, color: '#0D9488' },
  { key: 'summary', label: 'Summary', desc: 'A concise overview of this topic', icon: ScrollText, color: '#0EA5A4' },
  { key: 'flashcards', label: 'Flashcards', desc: 'Study with flip cards', icon: Layers, color: '#0891B2' },
  { key: 'quiz', label: 'Quiz', desc: 'Test yourself and get scored', icon: ListChecks, color: '#F59E0B' },
]

export default function TopicHubPage() {
  const { topicId } = useParams()
  const navigate = useNavigate()
  const [topic, setTopic] = useState(null)

  useEffect(() => {
    getTopic(topicId).then(setTopic).catch(() => setTopic(null))
  }, [topicId])

  return (
    <PageTransition>
      <BackLink to={topic ? `/doc/${topic.document_id}` : '/'}>
        {topic?.document_title || 'Back'}
      </BackLink>
      <PageTitle overline="Topic" title={topic?.title || 'Loading…'} subtitle="Choose how you'd like to study this topic." />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
          gap: 18,
        }}
      >
        {TOOLS.map((tool, i) => {
          const Icon = tool.icon
          return (
            <motion.div
              key={tool.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.32 }}
              whileHover={{ y: -6 }}
              onClick={() => navigate(`/topic/${topicId}/${tool.key}`)}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--rule)',
                borderRadius: 16,
                padding: 24,
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: `${tool.color}1a`,
                  display: 'grid',
                  placeItems: 'center',
                  marginBottom: 16,
                }}
              >
                <Icon size={24} color={tool.color} />
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--text-dark)' }}>
                {tool.label}
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--text-mid)', marginTop: 6 }}>
                {tool.desc}
              </div>
            </motion.div>
          )
        })}
      </div>
    </PageTransition>
  )
}
