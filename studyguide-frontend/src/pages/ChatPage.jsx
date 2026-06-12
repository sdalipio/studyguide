import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Quote } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import { BackLink, PageTitle } from '../components/ui'
import { getTopic, streamChat } from '../services/apiService'

export default function ChatPage() {
  const { topicId } = useParams()
  const [topic, setTopic] = useState(null)
  const [messages, setMessages] = useState([]) // {role, text, sources?}
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    getTopic(topicId).then(setTopic).catch(() => {})
  }, [topicId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function send() {
    const question = input.trim()
    if (!question || streaming) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: question }, { role: 'assistant', text: '', sources: [] }])
    setStreaming(true)

    try {
      await streamChat(topicId, question, (evt) => {
        setMessages((m) => {
          const next = m.slice()
          const i = next.length - 1
          const last = { ...next[i] } // copy, never mutate existing state
          if (evt.type === 'sources') last.sources = evt.sources
          else if (evt.type === 'token') last.text = last.text + evt.text
          else if (evt.type === 'error') last.text = last.text + `\n\n⚠ ${evt.text}`
          next[i] = last
          return next
        })
      })
    } catch {
      setMessages((m) => {
        const next = m.slice()
        const i = next.length - 1
        next[i] = { ...next[i], text: next[i].text + '\n\n⚠ Connection error.' }
        return next
      })
    } finally {
      setStreaming(false)
    }
  }

  return (
    <PageTransition>
      <BackLink to={`/topic/${topicId}`}>{topic?.title || 'Topic'}</BackLink>
      <PageTitle overline="Chat" title="Ask your document" />

      <div
        ref={scrollRef}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--rule)',
          borderRadius: 16,
          padding: 24,
          height: '52vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        {messages.length === 0 && (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Quote size={28} style={{ marginBottom: 10 }} />
            <div style={{ fontFamily: 'var(--serif)', fontSize: 18 }}>
              Ask anything about “{topic?.title}”
            </div>
            <div style={{ fontSize: 13.5, marginTop: 6 }}>
              Answers are grounded in this topic, with citations.
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '82%' }}
            >
              <div
                style={{
                  background: msg.role === 'user' ? 'linear-gradient(135deg,#0D9488,#0F766E)' : 'var(--bg-app)',
                  color: msg.role === 'user' ? '#fff' : 'var(--text-dark)',
                  border: msg.role === 'user' ? 'none' : '1px solid var(--rule)',
                  borderRadius: 14,
                  padding: '12px 16px',
                  fontSize: 14.5,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {msg.text}
                {msg.role === 'assistant' && streaming && i === messages.length - 1 && (
                  <span className="type-caret">▍</span>
                )}
              </div>

              {msg.sources?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {msg.sources.map((s, j) => (
                    <span
                      key={j}
                      title={s.snippet}
                      style={{
                        fontSize: 11.5,
                        color: 'var(--primary-dark)',
                        background: 'var(--primary-light)',
                        padding: '3px 9px',
                        borderRadius: 20,
                      }}
                    >
                      {s.location}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Type your question…"
          style={{
            flex: 1,
            padding: '13px 16px',
            borderRadius: 12,
            border: '1px solid var(--border)',
            fontSize: 14.5,
            outline: 'none',
            background: 'var(--bg-card)',
          }}
        />
        <button
          onClick={send}
          disabled={streaming || !input.trim()}
          style={{
            border: 'none',
            borderRadius: 12,
            padding: '0 20px',
            background: 'linear-gradient(135deg,#0D9488,#0F766E)',
            color: '#fff',
            cursor: streaming ? 'default' : 'pointer',
            opacity: streaming || !input.trim() ? 0.6 : 1,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <Send size={18} />
        </button>
      </div>
    </PageTransition>
  )
}
