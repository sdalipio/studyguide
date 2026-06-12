import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  BookOpenText, GitBranch, ArrowRight, ChevronDown,
  MessagesSquare, ScrollText, Layers, ListChecks,
  UploadCloud, ListTree, GraduationCap,
} from 'lucide-react'
import PaperOrbs from '../components/PaperOrbs'
import { Button } from '../components/ui'

const GITHUB_URL = 'https://github.com/sdalipio/studyguide'
const SOURCES = ['textbooks', 'lecture PDFs', 'medical notes', 'Word docs']

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.08 } },
}
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
}

export default function LandingPage() {
  const navigate = useNavigate()
  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--bg-app)', overflowX: 'hidden' }}>
      <PaperOrbs />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <TopBar navigate={navigate} />
        <Hero navigate={navigate} />
        <Features />
        <HowItWorks />
        <TechAndCTA navigate={navigate} />
        <Footer />
      </div>
    </div>
  )
}

function TopBar({ navigate }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '22px clamp(20px, 5vw, 56px)', maxWidth: 1200, margin: '0 auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: 'linear-gradient(135deg,#0D9488,#0F766E)',
          display: 'grid', placeItems: 'center', boxShadow: '0 4px 12px rgba(13,148,136,0.3)',
        }}>
          <BookOpenText size={20} color="#fff" />
        </div>
        <span style={{ fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 19, color: 'var(--text-dark)' }}>
          StudyGuide
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost"><GitBranch size={16} /> GitHub</Button>
        </a>
        <Button onClick={() => navigate('/library')}>Start studying</Button>
      </div>
    </div>
  )
}

function Typewriter() {
  const [i, setI] = useState(0)
  const [text, setText] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const current = SOURCES[i]
    let t
    if (!deleting && text.length < current.length) {
      t = setTimeout(() => setText(current.slice(0, text.length + 1)), 80)
    } else if (!deleting && text.length === current.length) {
      t = setTimeout(() => setDeleting(true), 1600)
    } else if (deleting && text.length > 0) {
      t = setTimeout(() => setText(current.slice(0, text.length - 1)), 40)
    } else {
      setDeleting(false)
      setI((p) => (p + 1) % SOURCES.length)
    }
    return () => clearTimeout(t)
  }, [text, deleting, i])

  return (
    <span>
      <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{text}</span>
      <span className="type-caret">▍</span>
    </span>
  )
}

function Hero({ navigate }) {
  return (
    <section style={{
      minHeight: 'calc(100vh - 82px)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      padding: '0 clamp(20px, 5vw, 40px)', maxWidth: 880, margin: '0 auto',
    }}>
      <motion.div variants={container} initial="hidden" animate="show"
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
        <motion.div variants={item} style={{
          fontSize: 12, textTransform: 'uppercase', letterSpacing: 2,
          color: 'var(--primary)', fontWeight: 600,
          background: 'var(--primary-light)', padding: '6px 14px', borderRadius: 20,
        }}>
          AI-powered study tools
        </motion.div>

        <motion.h1 variants={item} style={{
          margin: 0, fontFamily: 'var(--serif)', fontWeight: 600,
          fontSize: 'clamp(38px, 7vw, 68px)', lineHeight: 1.08, color: 'var(--text-dark)',
        }}>
          Turn any document into a{' '}
          <span style={{
            background: 'linear-gradient(135deg,#0D9488,#0F766E)',
            backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent',
          }}>
            study guide
          </span>
        </motion.h1>

        <motion.div variants={item} style={{
          fontSize: 'clamp(16px, 2.2vw, 22px)', color: 'var(--text-mid)', fontFamily: 'var(--serif)',
        }}>
          Built from your <Typewriter />
        </motion.div>

        <motion.p variants={item} style={{
          margin: 0, fontSize: 'clamp(14px, 1.7vw, 16.5px)', color: 'var(--text-mid)',
          maxWidth: 600, lineHeight: 1.7,
        }}>
          Upload a PDF or Word document and instantly get topic-based chat, summaries,
          flashcards, and quizzes — grounded in your own material with a
          Retrieval-Augmented Generation pipeline.
        </motion.p>

        <motion.div variants={item} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button onClick={() => navigate('/library')} style={{ padding: '13px 24px', fontSize: 15.5 }}>
            Start studying <ArrowRight size={17} />
          </Button>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" style={{ padding: '13px 24px', fontSize: 15.5 }}>
              <GitBranch size={17} /> View on GitHub
            </Button>
          </a>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} transition={{ delay: 1.2, duration: 1 }}
        style={{ marginTop: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}
      >
        <span style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' }}>Scroll to explore</span>
        <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.8, repeat: Infinity }}>
          <ChevronDown size={18} />
        </motion.div>
      </motion.div>
    </section>
  )
}

const FEATURES = [
  { icon: MessagesSquare, title: 'Chat with your document', desc: 'Ask questions and get streaming answers grounded in the source, with page citations.', color: '#0D9488' },
  { icon: ScrollText, title: 'AI summaries', desc: 'A concise, well-structured overview of any topic in a click.', color: '#0EA5A4' },
  { icon: Layers, title: 'Flashcards', desc: 'Auto-generated flip cards with shuffle and endless “generate more”.', color: '#0891B2' },
  { icon: ListChecks, title: 'Quizzes', desc: 'Scored multiple-choice rounds drawn from a growing question bank.', color: '#F59E0B' },
]

function Features() {
  return (
    <Section>
      <SectionHeading overline="Four ways to study" title="Everything you need from one upload" />
      <motion.div
        variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 18 }}
      >
        {FEATURES.map((f) => {
          const Icon = f.icon
          return (
            <motion.div key={f.title} variants={item} whileHover={{ y: -6 }}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--rule)', borderRadius: 16, padding: 24 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: `${f.color}1a`, display: 'grid', placeItems: 'center', marginBottom: 16 }}>
                <Icon size={24} color={f.color} />
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 19, color: 'var(--text-dark)', marginBottom: 6 }}>{f.title}</div>
              <div style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.6 }}>{f.desc}</div>
            </motion.div>
          )
        })}
      </motion.div>
    </Section>
  )
}

const STEPS = [
  { icon: UploadCloud, title: 'Upload', desc: 'Drop in a PDF or Word document — even a 2,000-page textbook.' },
  { icon: ListTree, title: 'Auto-detected topics', desc: 'StudyGuide segments it into topics from its outline, or with AI.' },
  { icon: GraduationCap, title: 'Study four ways', desc: 'Chat, summarize, flip flashcards, and quiz yourself per topic.' },
]

function HowItWorks() {
  return (
    <Section>
      <SectionHeading overline="How it works" title="From document to study session in seconds" />
      <motion.div
        variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}
      >
        {STEPS.map((s, idx) => {
          const Icon = s.icon
          return (
            <motion.div key={s.title} variants={item}
              style={{ background: 'var(--bg-card)', border: '1px solid var(--rule)', borderRadius: 16, padding: 28, textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 15, fontStyle: 'italic', color: 'var(--primary)', marginBottom: 12 }}>
                Step {idx + 1}
              </div>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--primary-light)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
                <Icon size={26} color="var(--primary-dark)" />
              </div>
              <div style={{ fontFamily: 'var(--serif)', fontSize: 20, color: 'var(--text-dark)', marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 14, color: 'var(--text-mid)', lineHeight: 1.6 }}>{s.desc}</div>
            </motion.div>
          )
        })}
      </motion.div>
    </Section>
  )
}

const TECH = ['React', 'Vite', 'FastAPI', 'LangChain', 'Groq · Llama 3.3', 'PostgreSQL + pgvector', 'sentence-transformers']

function TechAndCTA({ navigate }) {
  return (
    <Section>
      <SectionHeading overline="Built with" title="A modern, cost-free RAG stack" />
      <motion.div
        variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}
        style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 56 }}
      >
        {TECH.map((t) => (
          <motion.span key={t} variants={item} style={{
            fontSize: 13.5, fontWeight: 600, color: 'var(--text-mid)',
            background: 'var(--bg-card)', border: '1px solid var(--rule)',
            padding: '8px 16px', borderRadius: 20,
          }}>
            {t}
          </motion.span>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }} whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.5 }}
        style={{
          background: 'linear-gradient(135deg,#0D9488,#0F766E)', borderRadius: 22,
          padding: 'clamp(32px, 6vw, 56px)', textAlign: 'center', color: '#fff',
          boxShadow: '0 20px 50px rgba(13,148,136,0.28)',
        }}
      >
        <h2 style={{ margin: 0, fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 'clamp(26px, 4vw, 38px)' }}>
          Ready to study smarter?
        </h2>
        <p style={{ margin: '12px auto 24px', maxWidth: 460, fontSize: 15.5, opacity: 0.92, lineHeight: 1.6 }}>
          Upload your first document and turn it into an interactive study session.
        </p>
        <Button onClick={() => navigate('/library')}
          style={{ background: '#fff', color: 'var(--primary-dark)', boxShadow: 'none', padding: '13px 26px', fontSize: 15.5 }}>
          Start studying <ArrowRight size={17} />
        </Button>
      </motion.div>
    </Section>
  )
}

function Footer() {
  return (
    <footer style={{
      textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)', fontSize: 13.5,
      borderTop: '1px solid var(--rule)', marginTop: 40,
    }}>
      StudyGuide — an AI-powered learning platform ·{' '}
      <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-dark)', fontWeight: 600 }}>
        GitHub
      </a>
    </footer>
  )
}

function Section({ children }) {
  return (
    <section style={{ maxWidth: 1000, margin: '0 auto', padding: 'clamp(48px, 9vw, 96px) clamp(20px, 5vw, 40px)' }}>
      {children}
    </section>
  )
}

function SectionHeading({ overline, title }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.5 }}
      style={{ textAlign: 'center', marginBottom: 40 }}
    >
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--primary)', fontWeight: 600, marginBottom: 10 }}>
        {overline}
      </div>
      <h2 style={{ margin: 0, fontFamily: 'var(--serif)', fontWeight: 600, fontSize: 'clamp(26px, 4vw, 38px)', color: 'var(--text-dark)' }}>
        {title}
      </h2>
    </motion.div>
  )
}
