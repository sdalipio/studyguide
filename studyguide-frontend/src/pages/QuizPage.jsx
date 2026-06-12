import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, X, Shuffle, Plus, Loader2 } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import { BackLink, PageTitle, SkeletonLines, Card, Button } from '../components/ui'
import { getTopic, getQuiz, scoreQuiz, generateMoreQuiz } from '../services/apiService'
import { shuffle } from '../utils/shuffle'

const ROUND_SIZE = 5

// Build a playable round: a shuffled sample of the bank, with each question's
// answer options shuffled too. `optionMap[displayedIndex] = originalIndex` lets
// us translate the user's choice back to the server's option index for scoring.
function buildRound(bank, size = ROUND_SIZE) {
  return shuffle(bank)
    .slice(0, size)
    .map((q) => {
      const order = shuffle(q.options.map((_, i) => i))
      return {
        id: q.id,
        question: q.question,
        explanation: q.explanation,
        options: order.map((i) => q.options[i]),
        correct_index: order.indexOf(q.correct_index),
        optionMap: order,
      }
    })
}

export default function QuizPage() {
  const { topicId } = useParams()
  const [topic, setTopic] = useState(null)
  const [bank, setBank] = useState([])
  const [round, setRound] = useState([])
  const [answers, setAnswers] = useState({}) // qId -> displayed option index
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    getTopic(topicId).then((t) => active && setTopic(t)).catch(() => {})
    getQuiz(topicId)
      .then((d) => {
        if (!active) return
        setBank(d)
        setRound(buildRound(d))
      })
      .catch(() => active && setError('Could not generate a quiz. Is the Groq API key set?'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [topicId])

  async function submit() {
    // translate displayed option indices back to the server's original indices
    const payload = {}
    for (const [qid, displayed] of Object.entries(answers)) {
      const q = round.find((x) => String(x.id) === String(qid))
      payload[qid] = q ? q.optionMap[displayed] : displayed
    }
    const res = await scoreQuiz(topicId, payload)
    setResult(res)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function newMix() {
    setRound(buildRound(bank))
    setAnswers({})
    setResult(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function doGenerateMore() {
    setGenerating(true)
    try {
      const all = await generateMoreQuiz(topicId)
      setBank(all)
      setRound(buildRound(all))
      setAnswers({})
      setResult(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setError('Could not generate more questions. Is the Groq API key set?')
    } finally {
      setGenerating(false)
    }
  }

  const allAnswered = round.length > 0 && Object.keys(answers).length === round.length

  return (
    <PageTransition>
      <BackLink to={`/topic/${topicId}`}>{topic?.title || 'Topic'}</BackLink>
      <PageTitle
        overline="Quiz"
        title={topic?.title || 'Loading…'}
        subtitle={bank.length ? `${round.length} questions · drawn from a bank of ${bank.length}` : undefined}
      />

      {loading ? (
        <Card><SkeletonLines count={5} /></Card>
      ) : error ? (
        <Card><div style={{ color: 'var(--danger)' }}>{error}</div></Card>
      ) : (
        <>
          {result && (
            <ScoreBanner
              result={result}
              onNewMix={newMix}
              onGenerateMore={doGenerateMore}
              generating={generating}
            />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {round.map((q, qi) => (
              <Card key={`${q.id}-${qi}`}>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--text-dark)', marginBottom: 16 }}>
                  {qi + 1}. {q.question}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {q.options.map((opt, oi) => {
                    const selected = answers[q.id] === oi
                    const graded = result?.results[q.id] !== undefined
                    const isCorrect = oi === q.correct_index
                    let border = 'var(--border)'
                    let bg = 'var(--bg-card)'
                    if (graded) {
                      if (isCorrect) { border = 'var(--success)'; bg = '#ecfdf5' }
                      else if (selected) { border = 'var(--danger)'; bg = '#fef2f2' }
                    } else if (selected) {
                      border = 'var(--primary)'; bg = 'var(--primary-light)'
                    }
                    return (
                      <motion.div
                        key={oi}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: oi * 0.05 }}
                        onClick={() => !result && setAnswers((a) => ({ ...a, [q.id]: oi }))}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          border: `1.5px solid ${border}`,
                          background: bg,
                          borderRadius: 10,
                          padding: '12px 16px',
                          cursor: result ? 'default' : 'pointer',
                          fontSize: 14.5,
                        }}
                      >
                        <span style={{ flex: 1 }}>{opt}</span>
                        {graded && isCorrect && <Check size={17} color="var(--success)" />}
                        {graded && selected && !isCorrect && <X size={17} color="var(--danger)" />}
                      </motion.div>
                    )
                  })}
                </div>
                {result && q.explanation && (
                  <div style={{ marginTop: 12, fontSize: 13.5, color: 'var(--text-mid)', fontStyle: 'italic' }}>
                    {q.explanation}
                  </div>
                )}
              </Card>
            ))}
          </div>

          {!result && (
            <div style={{ marginTop: 22 }}>
              <Button onClick={submit} disabled={!allAnswered} style={{ opacity: allAnswered ? 1 : 0.6 }}>
                Submit answers
              </Button>
            </div>
          )}
        </>
      )}
    </PageTransition>
  )
}

function ScoreBanner({ result, onNewMix, onGenerateMore, generating }) {
  const [display, setDisplay] = useState(0)
  const pct = result.total ? Math.round((result.correct / result.total) * 100) : 0

  useEffect(() => {
    let raf
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min((now - start) / 800, 1)
      setDisplay(Math.round(p * result.correct))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [result.correct])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        background: 'linear-gradient(135deg,#0D9488,#0F766E)',
        color: '#fff',
        borderRadius: 16,
        padding: '24px 28px',
        marginBottom: 22,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <div>
        <div style={{ fontSize: 13, opacity: 0.85, textTransform: 'uppercase', letterSpacing: 1 }}>Your score</div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 38, fontWeight: 600 }}>
          {display} / {result.total}
        </div>
        <div style={{ fontSize: 14, opacity: 0.9 }}>{pct}% correct</div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Button variant="ghost" onClick={onNewMix} style={{ color: 'var(--primary-dark)' }}>
          <Shuffle size={16} /> New mix
        </Button>
        <Button variant="ghost" onClick={onGenerateMore} disabled={generating} style={{ color: 'var(--primary-dark)', opacity: generating ? 0.7 : 1 }}>
          {generating ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} />}
          {generating ? 'Generating…' : 'Generate more'}
        </Button>
      </div>
    </motion.div>
  )
}
