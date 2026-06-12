import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, X, Shuffle, Plus, Loader2 } from 'lucide-react'
import PageTransition from '../components/PageTransition'
import { BackLink, PageTitle, SkeletonLines, Card, Button, SetSwitcher } from '../components/ui'
import { getTopic, getQuiz, scoreQuiz, generateMoreQuiz } from '../services/apiService'
import { shuffle } from '../utils/shuffle'
import { setNumbers } from '../utils/sets'

const questionsInSet = (all, n) => all.filter((q) => (q.set_index || 1) === n)

// Build a playable round from one set's questions: question order shuffled, and
// each question's options shuffled too. `optionMap[displayedIndex] = originalIndex`
// translates the user's choice back to the server's option index for scoring.
// `correctSet` holds the correct option(s) in DISPLAYED-index space; questions
// with more than one are "select all that apply" (SATA).
function buildRound(items) {
  return shuffle(items).map((q) => {
    const order = shuffle(q.options.map((_, i) => i))
    const correctSet = (q.correct_indices || []).map((ci) => order.indexOf(ci))
    return {
      id: q.id,
      question: q.question,
      explanation: q.explanation,
      options: order.map((i) => q.options[i]),
      correctSet,
      isMulti: correctSet.length > 1,
      optionMap: order,
    }
  })
}

export default function QuizPage() {
  const { topicId } = useParams()
  const [topic, setTopic] = useState(null)
  const [bank, setBank] = useState([])       // every question across all sets
  const [activeSet, setActiveSet] = useState(1)
  const [round, setRound] = useState([])     // the active set, shuffled & playable
  const [answers, setAnswers] = useState({}) // qId -> array of displayed option indices
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  // Load all questions and open the newest set as a fresh round.
  function openNewest(all) {
    const sets = setNumbers(all)
    const newest = sets[sets.length - 1] || 1
    setBank(all)
    setActiveSet(newest)
    setRound(buildRound(questionsInSet(all, newest)))
    setAnswers({})
    setResult(null)
  }

  useEffect(() => {
    let active = true
    getTopic(topicId).then((t) => active && setTopic(t)).catch(() => {})
    getQuiz(topicId)
      .then((d) => active && openNewest(d))
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
      payload[qid] = (displayed || []).map((d) => (q ? q.optionMap[d] : d))
    }
    const res = await scoreQuiz(topicId, payload)
    setResult(res)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function selectSet(n) {
    setActiveSet(n)
    setRound(buildRound(questionsInSet(bank, n)))
    setAnswers({})
    setResult(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function newMix() {
    setRound(buildRound(questionsInSet(bank, activeSet)))
    setAnswers({})
    setResult(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function doGenerateMore() {
    setGenerating(true)
    try {
      openNewest(await generateMoreQuiz(topicId))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setError('Could not generate more questions. Is the Groq API key set?')
    } finally {
      setGenerating(false)
    }
  }

  const allAnswered = round.length > 0 && round.every((q) => (answers[q.id] || []).length > 0)

  return (
    <PageTransition>
      <BackLink to={`/topic/${topicId}`}>{topic?.title || 'Topic'}</BackLink>
      <PageTitle
        overline="Quiz"
        title={topic?.title || 'Loading…'}
        subtitle={round.length ? `Set ${activeSet} of ${setNumbers(bank).length} · ${round.length} questions` : undefined}
      />

      {loading ? (
        <Card><SkeletonLines count={5} /></Card>
      ) : error ? (
        <Card><div style={{ color: 'var(--danger)' }}>{error}</div></Card>
      ) : (
        <>
          <SetSwitcher sets={setNumbers(bank)} active={activeSet} onSelect={selectSet} />
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
                <div style={{ fontFamily: 'var(--serif)', fontSize: 18, color: 'var(--text-dark)', marginBottom: q.isMulti ? 6 : 16 }}>
                  {qi + 1}. {q.question}
                </div>
                {q.isMulti && (
                  <div style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--primary-dark)', marginBottom: 14 }}>
                    Select all that apply
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {q.options.map((opt, oi) => {
                    const selected = (answers[q.id] || []).includes(oi)
                    const graded = result?.results[q.id] !== undefined
                    const isCorrect = q.correctSet.includes(oi)
                    let border = 'var(--border)'
                    let bg = 'var(--bg-card)'
                    if (graded) {
                      if (isCorrect) { border = 'var(--success)'; bg = '#ecfdf5' }
                      else if (selected) { border = 'var(--danger)'; bg = '#fef2f2' }
                    } else if (selected) {
                      border = 'var(--primary)'; bg = 'var(--primary-light)'
                    }
                    const toggle = () => {
                      if (result) return
                      setAnswers((a) => {
                        const cur = a[q.id] || []
                        if (!q.isMulti) return { ...a, [q.id]: [oi] }
                        const next = cur.includes(oi) ? cur.filter((x) => x !== oi) : [...cur, oi]
                        return { ...a, [q.id]: next }
                      })
                    }
                    return (
                      <motion.div
                        key={oi}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: oi * 0.05 }}
                        onClick={toggle}
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
                        <span
                          style={{
                            flexShrink: 0,
                            width: 18,
                            height: 18,
                            borderRadius: q.isMulti ? 5 : '50%',
                            border: `1.5px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                            background: selected ? 'var(--primary)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {selected && <Check size={12} color="#fff" />}
                        </span>
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
          {generating ? 'Generating…' : 'Generate new set'}
        </Button>
      </div>
    </motion.div>
  )
}
