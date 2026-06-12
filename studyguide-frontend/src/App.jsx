import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import AppLayout from './components/layout/AppLayout'
import LibraryPage from './pages/LibraryPage'
import OutlinePage from './pages/OutlinePage'
import TopicHubPage from './pages/TopicHubPage'
import ChatPage from './pages/ChatPage'
import SummaryPage from './pages/SummaryPage'
import FlashcardsPage from './pages/FlashcardsPage'
import QuizPage from './pages/QuizPage'

export default function App() {
  const location = useLocation()
  return (
    <AppLayout>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<LibraryPage />} />
          <Route path="/doc/:docId" element={<OutlinePage />} />
          <Route path="/topic/:topicId" element={<TopicHubPage />} />
          <Route path="/topic/:topicId/chat" element={<ChatPage />} />
          <Route path="/topic/:topicId/summary" element={<SummaryPage />} />
          <Route path="/topic/:topicId/flashcards" element={<FlashcardsPage />} />
          <Route path="/topic/:topicId/quiz" element={<QuizPage />} />
        </Routes>
      </AnimatePresence>
    </AppLayout>
  )
}
