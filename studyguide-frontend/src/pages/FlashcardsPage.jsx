import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, RotateCw, Shuffle, Plus, Loader2 } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import { BackLink, PageTitle, SkeletonLines, Card, Button } from '../components/ui'
import { getTopic, getFlashcards, generateMoreFlashcards } from '../services/apiService'
import { shuffle } from '../utils/shuffle'

export default function FlashcardsPage() {
  const { topicId } = useParams()
  const [topic, setTopic] = useState(null)
  const [cards, setCards] = useState([])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getTopic(topicId).then((t) => active && setTopic(t)).catch(() => {})
    getFlashcards(topicId)
      .then((d) => active && setCards(shuffle(d)))
      .catch(() => active && setError('Could not generate flashcards. Is the Groq API key set?'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [topicId])

  function go(dir) {
    setFlipped(false)
    setIndex((i) => Math.min(Math.max(i + dir, 0), cards.length - 1))
  }

  function doShuffle() {
    setCards((c) => shuffle(c))
    setIndex(0)
    setFlipped(false)
  }

  async function doGenerateMore() {
    setGenerating(true)
    try {
      const all = await generateMoreFlashcards(topicId)
      setCards(shuffle(all))
      setIndex(0)
      setFlipped(false)
    } catch {
      setError('Could not generate more cards. Is the Groq API key set?')
    } finally {
      setGenerating(false)
    }
  }

  const card = cards[index]

  return (
    <PageTransition>
      <BackLink to={`/topic/${topicId}`}>{topic?.title || 'Topic'}</BackLink>
      <PageTitle
        overline="Flashcards"
        title={topic?.title || 'Loading…'}
        subtitle={cards.length ? `Card ${index + 1} of ${cards.length} · click to flip` : undefined}
      />

      {loading ? (
        <Card><SkeletonLines count={4} /></Card>
      ) : error ? (
        <Card><div style={{ color: 'var(--danger)' }}>{error}</div></Card>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginBottom: 16 }}>
            <Button variant="ghost" onClick={doShuffle}>
              <Shuffle size={15} /> Shuffle
            </Button>
            <Button onClick={doGenerateMore} disabled={generating} style={{ opacity: generating ? 0.7 : 1 }}>
              {generating ? (
                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Plus size={15} />
              )}
              {generating ? 'Generating…' : 'Generate more'}
            </Button>
          </div>

          <div style={{ perspective: 1400 }}>
            <motion.div
              onClick={() => setFlipped((f) => !f)}
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              style={{
                position: 'relative',
                height: 320,
                transformStyle: 'preserve-3d',
                cursor: 'pointer',
              }}
            >
              <Face>
                <Tag>Question</Tag>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 24, lineHeight: 1.4, color: 'var(--text-dark)' }}>
                  {card?.question}
                </div>
                <Hint><RotateCw size={13} /> Click to reveal answer</Hint>
              </Face>
              <Face back>
                <Tag back>Answer</Tag>
                <div style={{ fontSize: 18, lineHeight: 1.7, color: 'var(--text-dark)' }}>
                  {card?.answer}
                </div>
              </Face>
            </motion.div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 }}>
            <Button variant="ghost" onClick={() => go(-1)} disabled={index === 0} style={{ opacity: index === 0 ? 0.5 : 1 }}>
              <ChevronLeft size={17} /> Prev
            </Button>
            <div style={{ display: 'flex', gap: 6 }}>
              {cards.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: i === index ? 'var(--primary)' : 'var(--rule)',
                  }}
                />
              ))}
            </div>
            <Button variant="ghost" onClick={() => go(1)} disabled={index === cards.length - 1} style={{ opacity: index === cards.length - 1 ? 0.5 : 1 }}>
              Next <ChevronRight size={17} />
            </Button>
          </div>

          {index === cards.length - 1 && (
            <div style={{ textAlign: 'center', marginTop: 18, color: 'var(--text-muted)', fontSize: 13.5 }}>
              You've reached the end — <strong>Shuffle</strong> to review again, or{' '}
              <strong>Generate more</strong> for new cards.
            </div>
          )}
        </>
      )}
    </PageTransition>
  )
}

function Face({ children, back }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backfaceVisibility: 'hidden',
        transform: back ? 'rotateY(180deg)' : 'none',
        background: back ? 'var(--primary-light)' : 'var(--bg-card)',
        border: '1px solid var(--rule)',
        borderRadius: 18,
        padding: 36,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 16,
      }}
    >
      {children}
    </div>
  )
}

function Tag({ children, back }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        left: 24,
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        fontWeight: 600,
        color: back ? 'var(--primary-dark)' : 'var(--primary)',
      }}
    >
      {children}
    </div>
  )
}

function Hint({ children }) {
  return (
    <div style={{ position: 'absolute', bottom: 20, left: 24, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--text-muted)' }}>
      {children}
    </div>
  )
}
