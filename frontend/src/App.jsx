import { useCallback, useEffect, useMemo, useState } from 'react'
import logo from './assets/repolens-logo.svg'
import './App.css'

const API_BASE_URL = 'http://localhost:3000'
const TOKEN_KEY = 'repolens_token'

const metricLabels = {
  codeQuality: 'Code Quality',
  readability: 'Readability',
  bestPractices: 'Best Practices',
  documentation: 'Documentation',
}

const initialAuth = {
  name: '',
  email: '',
  password: '',
}

const initialRepoForm = {
  repoUrl: '',
}

function getStatusTone(score) {
  if (score >= 8) return 'excellent'
  if (score >= 6) return 'good'
  if (score >= 4) return 'average'
  return 'poor'
}

function formatDate(value) {
  if (!value) return 'Just now'
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function extractRepoName(url) {
  if (!url) return 'Unknown repository'
  try {
    const parsed = new URL(url)
    return parsed.pathname.replace(/^\/|\/$/g, '') || url
  } catch {
    return url
  }
}

function BrandMark({ compact = false }) {
  return (
    <div className={`brand ${compact ? 'compact' : ''}`}>
      <img src={logo} alt="RepoLens logo" className="brand-logo" />
      <div>
        <span className="brand-name">RepoLens</span>
        {!compact && <p className="brand-tag">AI repository reviews for real engineering decisions</p>}
      </div>
    </div>
  )
}

function App() {
  const [mode, setMode] = useState('login')
  const [authForm, setAuthForm] = useState(initialAuth)
  const [repoForm, setRepoForm] = useState(initialRepoForm)
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) ?? '')
  const [user, setUser] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [analysisResult, setAnalysisResult] = useState(null)
  const [history, setHistory] = useState([])
  const isAuthenticated = Boolean(token)

  const metrics = useMemo(() => {
    if (!analysisResult?.analysis) return []
    return Object.entries(metricLabels).map(([key, label]) => ({
      key,
      label,
      value: Number(analysisResult.analysis[key] ?? 0),
    }))
  }, [analysisResult])

  const statusTone = getStatusTone(analysisResult?.score ?? 0)

  const apiRequest = useCallback(async (path, options = {}, authToken = token) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...options.headers,
      },
      ...options,
    })

    const contentType = response.headers.get('content-type') || ''
    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text()

    if (!response.ok) {
      const message =
        typeof payload === 'object' && payload?.message
          ? payload.message
          : 'Request failed'
      throw new Error(message)
    }

    return payload
  }, [token])

  const loadProfile = useCallback(async (authToken) => {
    setProfileLoading(true)
    try {
      const payload = await apiRequest('/auth/profile', {}, authToken)
      setUser(payload.user ?? null)
    } catch (error) {
      setUser(null)
      setToken('')
      setErrorMessage(error.message || 'Unable to load profile')
    } finally {
      setProfileLoading(false)
    }
  }, [apiRequest])

  const loadHistory = useCallback(async (authToken) => {
    setHistoryLoading(true)
    try {
      const payload = await apiRequest('/api/analysis/history', {}, authToken)
      setHistory(payload.history ?? [])
    } catch (error) {
      setHistory([])
      setErrorMessage(error.message || 'Unable to load history')
    } finally {
      setHistoryLoading(false)
    }
  }, [apiRequest])

  useEffect(() => {
    if (!token) {
      setHistory([])
      return
    }

    const timeoutId = window.setTimeout(() => {
      loadHistory(token)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [token, loadHistory])

  useEffect(() => {
    if (!token) {
      localStorage.removeItem(TOKEN_KEY)
      return
    }

    localStorage.setItem(TOKEN_KEY, token)
    const timeoutId = window.setTimeout(() => {
      loadProfile(token)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [token, loadProfile])

  function updateAuthField(event) {
    const { name, value } = event.target
    setAuthForm((current) => ({ ...current, [name]: value }))
  }

  function updateRepoField(event) {
    const { name, value } = event.target
    setRepoForm((current) => ({ ...current, [name]: value }))
  }

  async function handleAuthSubmit(event) {
    event.preventDefault()
    setAuthLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const payload = await apiRequest(`/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify(authForm),
      }, '')

      if (mode === 'signup') {
        setMode('login')
        setAuthForm((current) => ({ ...current, password: '' }))
        setSuccessMessage('Account created. Sign in to start analyzing repositories.')
      } else {
        setToken(payload.token ?? '')
        setUser(payload.user ?? null)
        setSuccessMessage('Login successful. Your workspace is ready.')
      }
    } catch (error) {
      setErrorMessage(error.message || 'Authentication failed')
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleAnalyze(event) {
    event.preventDefault()
    setAnalysisLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const payload = await apiRequest('/api/analysis', {
        method: 'POST',
        body: JSON.stringify(repoForm),
      })

      setAnalysisResult(payload)
      setSuccessMessage('Repository analyzed successfully.')
      loadHistory(token)
    } catch (error) {
      setErrorMessage(error.message || 'Analysis failed')
    } finally {
      setAnalysisLoading(false)
    }
  }

  function handleLogout() {
    setToken('')
    setUser(null)
    setAnalysisResult(null)
    setHistory([])
    setSuccessMessage('You have been signed out.')
  }

  if (!isAuthenticated) {
    return (
      <div className="app-shell auth-shell">
        <div className="ambient ambient-left"></div>
        <div className="ambient ambient-right"></div>

        <main className="auth-layout">
          <section className="auth-brand panel">
            <BrandMark />
            <h1 className="auth-title">
              Welcome to RepoLens — a platform designed to turn your GitHub projects into interview-ready assets.
            </h1>
          </section>

          <section className="auth-card panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Authentication</p>
                <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
              </div>
              <div className="segmented-control" role="tablist" aria-label="Authentication mode">
                <button
                  type="button"
                  className={mode === 'login' ? 'active' : ''}
                  onClick={() => setMode('login')}
                >
                  Login
                </button>
                <button
                  type="button"
                  className={mode === 'signup' ? 'active' : ''}
                  onClick={() => setMode('signup')}
                >
                  Signup
                </button>
              </div>
            </div>

            {(errorMessage || successMessage) && (
              <div className={`feedback ${errorMessage ? 'error' : 'success'}`}>
                {errorMessage || successMessage}
              </div>
            )}

            <form className="stack-form" onSubmit={handleAuthSubmit}>
              {mode === 'signup' && (
                <label>
                  <span>Full name</span>
                  <input
                    type="text"
                    name="name"
                    placeholder="Aditya Sharma"
                    value={authForm.name}
                    onChange={updateAuthField}
                  />
                </label>
              )}

              <label>
                <span>Email address</span>
                <input
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={authForm.email}
                  onChange={updateAuthField}
                />
              </label>

              <label>
                <span>Password</span>
                <input
                  type="password"
                  name="password"
                  placeholder="Minimum 6 characters"
                  value={authForm.password}
                  onChange={updateAuthField}
                />
              </label>

              <button type="submit" className="primary-button wide" disabled={authLoading}>
                {authLoading ? 'Processing...' : mode === 'login' ? 'Login to RepoLens' : 'Create RepoLens account'}
              </button>
            </form>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell workspace-shell">
      <div className="ambient ambient-left"></div>
      <div className="ambient ambient-right"></div>

      <header className="workspace-header panel">
        <BrandMark compact />
        <div className="workspace-header-meta">
          <div className="workspace-user">
            <span className="section-label">Signed in</span>
            <strong>{profileLoading ? 'Loading profile...' : user?.name ?? 'RepoLens user'}</strong>
            <small>{user?.email ?? 'Authenticated session'}</small>
          </div>
          <button type="button" className="ghost-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-grid">
        <section className="analysis-stage panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Analysis workspace</p>
              <h1 className="workspace-title">Analyze repositories with RepoLens</h1>
            </div>
            <span className={`status-pill ${statusTone}`}>
              {analysisResult?.status ?? 'Ready for a new repository'}
            </span>
          </div>

          <form className="repo-form" onSubmit={handleAnalyze}>
            <label className="repo-input">
              <span>GitHub repository URL</span>
              <input
                type="url"
                name="repoUrl"
                placeholder="https://github.com/owner/repository"
                value={repoForm.repoUrl}
                onChange={updateRepoField}
              />
            </label>
            <button type="submit" className="primary-button" disabled={analysisLoading}>
              {analysisLoading ? 'Analyzing...' : 'Analyze now'}
            </button>
          </form>

          {(errorMessage || successMessage) && (
            <div className={`feedback ${errorMessage ? 'error' : 'success'}`}>
              {errorMessage || successMessage}
            </div>
          )}

          <div className="hero-visual workspace-hero">
            <div className="orbit-card">
              <span className="orbital-ring ring-one"></span>
              <span className="orbital-ring ring-two"></span>
              <div className="score-chip">RepoLens score engine</div>
              <div className="visual-core">
                <div className="core-label">RepoLens</div>
                <strong>{analysisResult?.score ?? '9.1'}</strong>
                <span>{analysisResult?.status ?? 'Repository confidence signal'}</span>
              </div>
              <div className="visual-grid">
                {Object.values(metricLabels).map((label, index) => (
                  <div className="mini-card" key={label} style={{ '--delay': `${index * 120}ms` }}>
                    <span>{label}</span>
                    <strong>{metrics[index]?.value ?? [8.9, 8.4, 8.1, 9.0][index]}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="metric-grid">
            {metrics.length > 0
              ? metrics.map((metric) => (
                  <article className="metric-card" key={metric.key}>
                    <div className="metric-header">
                      <span>{metric.label}</span>
                      <strong>{metric.value.toFixed(1)}</strong>
                    </div>
                    <div className="meter-track">
                      <div className="meter-fill" style={{ width: `${metric.value * 10}%` }}></div>
                    </div>
                  </article>
                ))
              : Object.values(metricLabels).map((label) => (
                  <article className="metric-card placeholder" key={label}>
                    <div className="metric-header">
                      <span>{label}</span>
                      <strong>--</strong>
                    </div>
                    <div className="meter-track">
                      <div className="meter-fill idle"></div>
                    </div>
                  </article>
                ))}
          </div>

          <div className="results-grid">
            <article className="result-card spotlight">
              <p className="section-label">Latest analysis</p>
              <h3>{extractRepoName(analysisResult?.savedAnalysis?.repoUrl ?? analysisResult?.repoUrl ?? repoForm.repoUrl)}</h3>
              <div className="score-display">
                <strong>{analysisResult?.score ?? '--'}</strong>
                <span>Weighted RepoLens score</span>
              </div>
              <p>{analysisResult?.status ?? 'Run an analysis to see the current repository score and readiness status.'}</p>
            </article>

            <article className="result-card">
              <p className="section-label">AI issues</p>
              <ul className="insight-list">
                {(analysisResult?.analysis?.issues ?? ['RepoLens will list detected issues here after analysis.']).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>

            <article className="result-card">
              <p className="section-label">AI suggestions</p>
              <ul className="insight-list">
                {(analysisResult?.analysis?.suggestions ?? ['RepoLens recommendations will appear here after analysis.']).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <aside className="history-rail panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Saved history</p>
              <h2>RepoLens timeline</h2>
            </div>
            <button type="button" className="ghost-button" onClick={() => loadHistory(token)}>
              {historyLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          <div className="history-list">
            {historyLoading && history.length === 0 ? (
              <div className="history-empty">Loading saved analyses...</div>
            ) : history.length > 0 ? (
              history.map((item) => (
                <button
                  type="button"
                  key={item._id}
                  className="history-item"
                  onClick={() => setAnalysisResult(item)}
                >
                  <div>
                    <strong>{extractRepoName(item.repoUrl)}</strong>
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                  <div className={`history-score ${getStatusTone(item.score)}`}>
                    <strong>{item.score}</strong>
                    <span>{item.status}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="history-empty">
                No saved RepoLens reports yet. Your analyses will appear here on the same page.
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  )
}

export default App
