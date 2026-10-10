import React, { useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

const defaultAuthForm = {
  name: '',
  email: '',
  password: '',
  department: '',
  programOfStudy: '',
  studentNumber: ''
}

const defaultGroupForm = {
  name: '',
  courseCode: 'CS201',
  department: 'School of Natural Sciences'
}

const getStoredSession = () => {
  try {
    const stored = JSON.parse(localStorage.getItem('unza-session'))
    return stored?.user && stored?.token ? stored : null
  } catch {
    return null
  }
}

function App() {
  const [storedSession] = useState(getStoredSession)
  const [user, setUser] = useState(storedSession?.user || null)
  const [token, setToken] = useState(storedSession?.token || null)
  const [tutors, setTutors] = useState([])
  const [groups, setGroups] = useState([])
  const [resources, setResources] = useState([])
  const [quizzes, setQuizzes] = useState([])
  const [joinedGroupIds, setJoinedGroupIds] = useState(new Set())
  const [pendingGroupRequestIds, setPendingGroupRequestIds] = useState(new Set())
  const [sessions, setSessions] = useState([])
  const [messages, setMessages] = useState([])
  const [search, setSearch] = useState('')
  const [tutorCourseFilter, setTutorCourseFilter] = useState('')
  const [tutorSchoolFilter, setTutorSchoolFilter] = useState('')
  const [activeSection, setActiveSection] = useState('overview')
  const [resourceTab, setResourceTab] = useState('materials')
  const [resourceSearch, setResourceSearch] = useState('')
  const [resourceCourseFilter, setResourceCourseFilter] = useState('')
  const [resourceTypeFilter, setResourceTypeFilter] = useState('')
  const [activeQuiz, setActiveQuiz] = useState(null)
  const [quizAnswers, setQuizAnswers] = useState({})
  const [quizResult, setQuizResult] = useState(null)
  const [selectedTutorId, setSelectedTutorId] = useState(1)
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState(defaultAuthForm)
  const [groupForm, setGroupForm] = useState(defaultGroupForm)
  const createGroupDetailsRef = useRef(null)
  const [bookingForm, setBookingForm] = useState({
    courseCode: 'CS201',
    date: '',
    notes: ''
  })
  const [status, setStatus] = useState({ type: '', message: '' })
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [profileForm, setProfileForm] = useState({ name: '', department: '', programOfStudy: '', studentNumber: '' })
  const [profileSaving, setProfileSaving] = useState(false)

  const persistSession = (nextUser, nextToken) => {
    if (nextUser && nextToken) {
      localStorage.setItem('unza-session', JSON.stringify({ user: nextUser, token: nextToken }))
    }
  }

  const loadData = async (accessToken = null) => {
    try {
      const privateOptions = accessToken
        ? { headers: { Authorization: `Bearer ${accessToken}` } }
        : undefined
      const [tutorsRes, groupsRes, resourcesRes, quizzesRes, membershipsRes, requestsRes, sessionsRes, messagesRes] = await Promise.all([
        fetch(`${API_BASE}/tutors`),
        fetch(`${API_BASE}/groups`),
        fetch(`${API_BASE}/resources`),
        fetch(`${API_BASE}/quizzes`),
        accessToken ? fetch(`${API_BASE}/groups/memberships`, privateOptions) : Promise.resolve(null),
        accessToken ? fetch(`${API_BASE}/groups/requests`, privateOptions) : Promise.resolve(null),
        accessToken ? fetch(`${API_BASE}/sessions`, privateOptions) : Promise.resolve(null),
        accessToken ? fetch(`${API_BASE}/messages`, privateOptions) : Promise.resolve(null)
      ])

      const [tutorsData, groupsData, resourcesData, quizzesData, membershipsData, requestsData, sessionsData, messagesData] = await Promise.all([
        tutorsRes.json(),
        groupsRes.json(),
        resourcesRes.json(),
        quizzesRes.json(),
        membershipsRes ? membershipsRes.json() : Promise.resolve({ success: true, data: [] }),
        requestsRes ? requestsRes.json() : Promise.resolve({ success: true, data: [] }),
        sessionsRes ? sessionsRes.json() : Promise.resolve({ success: true, data: [] }),
        messagesRes ? messagesRes.json() : Promise.resolve({ success: true, data: [] })
      ])

      if (tutorsData.success) setTutors(tutorsData.data)
      if (groupsData.success) setGroups(groupsData.data)
      if (resourcesData.success) setResources(resourcesData.data)
      if (quizzesData.success) setQuizzes(quizzesData.data)
      if (membershipsData.success) setJoinedGroupIds(new Set(membershipsData.data))
      if (requestsData.success) setPendingGroupRequestIds(new Set(requestsData.data))
      if (sessionsData.success) setSessions(sessionsData.data)
      if (messagesData.success) setMessages(messagesData.data)
    } catch (error) {
      console.error(error)
      setStatus({ type: 'error', message: 'Unable to connect to the API. Start the server first.' })
    }
  }

  useEffect(() => {
    loadData()
    if (storedSession) {
      loadData(storedSession.token)
    }
  }, [])

  const openAccount = () => {
    setProfileForm({
      name: user?.name || '',
      department: user?.department || '',
      programOfStudy: user?.programOfStudy || '',
      studentNumber: user?.studentNumber || ''
    })
    setAccountOpen(true)
    setMenuOpen(false)
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    if (!token) return

    setProfileSaving(true)
    try {
      const response = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(profileForm)
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to update your account.')
      }

      setUser(data.data)
      persistSession(data.data, token)
      setAccountOpen(false)
      setStatus({ type: 'success', message: 'Account details updated.' })
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    } finally {
      setProfileSaving(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('unza-session')
    setUser(null)
    setToken(null)
    setSessions([])
    setMessages([])
    setActiveSection('overview')
    setMenuOpen(false)
    setAuthMode('login')
    setStatus({ type: '', message: '' })
  }

  const tutorCourses = useMemo(
    () => [...new Set(tutors.map((tutor) => tutor.courseCode).filter(Boolean))].sort(),
    [tutors]
  )
  const tutorSchools = useMemo(
    () => [...new Set(tutors.map((tutor) => tutor.department).filter(Boolean))].sort(),
    [tutors]
  )
  const filteredTutors = useMemo(() => {
    const term = search.toLowerCase()
    return tutors.filter((tutor) =>
      (!term ||
        tutor.name.toLowerCase().includes(term) ||
        tutor.courseCode.toLowerCase().includes(term) ||
        tutor.department.toLowerCase().includes(term)) &&
      (!tutorCourseFilter || tutor.courseCode === tutorCourseFilter) &&
      (!tutorSchoolFilter || tutor.department === tutorSchoolFilter)
    )
  }, [tutors, search, tutorCourseFilter, tutorSchoolFilter])

  const resourceCourses = useMemo(
    () => [...new Set([...resources, ...quizzes].map((item) => item.courseCode).filter(Boolean))].sort(),
    [resources, quizzes]
  )
  const resourceTypes = useMemo(
    () => [...new Set(resources.map((resource) => resource.resourceType).filter(Boolean))].sort(),
    [resources]
  )
  const filteredResources = useMemo(() => {
    const term = resourceSearch.toLowerCase()
    return resources.filter((resource) =>
      (!term || `${resource.title} ${resource.courseCode} ${resource.description}`.toLowerCase().includes(term)) &&
      (!resourceCourseFilter || resource.courseCode === resourceCourseFilter) &&
      (!resourceTypeFilter || resource.resourceType === resourceTypeFilter)
    )
  }, [resources, resourceSearch, resourceCourseFilter, resourceTypeFilter])
  const filteredQuizzes = useMemo(() => {
    const term = resourceSearch.toLowerCase()
    return quizzes.filter((quiz) =>
      (!term || `${quiz.title} ${quiz.courseCode} ${quiz.description}`.toLowerCase().includes(term)) &&
      (!resourceCourseFilter || quiz.courseCode === resourceCourseFilter)
    )
  }, [quizzes, resourceSearch, resourceCourseFilter])

  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const scrollToAuth = () => scrollToSection('login-card')

  const handleAuthSubmit = async (event) => {
    event.preventDefault()

    const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register'
    const payload = authMode === 'login'
      ? { email: authForm.email, password: authForm.password }
      : {
          name: authForm.name,
          email: authForm.email,
          password: authForm.password,
          department: authForm.department,
          programOfStudy: authForm.programOfStudy,
          studentNumber: authForm.studentNumber
        }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Authentication failed')
      }

      setUser(data.data.user)
      setToken(data.data.token)
      persistSession(data.data.user, data.data.token)
      setStatus({ type: '', message: '' })
      setAuthForm(defaultAuthForm)
      await loadData(data.data.token)
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    }
  }

  const handleJoinGroup = async (groupId) => {
    try {
      const response = await fetch(`${API_BASE}/groups/${groupId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to request to join study group.')
      }

      setPendingGroupRequestIds((current) => new Set(current).add(data.data.groupId))
      const group = groups.find((entry) => entry.id === data.data.groupId)
      setStatus({ type: 'success', message: 'Your request to join ' + (group?.name || 'the study group') + ' is pending.' })
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    }
  }

  const handleStartQuiz = (quiz) => {
    setActiveQuiz(quiz)
    setQuizAnswers({})
    setQuizResult(null)
  }

  const handleSubmitQuiz = async (event) => {
    event.preventDefault()
    if (!activeQuiz) return

    if (Object.keys(quizAnswers).length !== activeQuiz.questions.length) {
      setStatus({ type: 'error', message: 'Answer every question before submitting.' })
      return
    }

    try {
      const response = await fetch(`${API_BASE}/quizzes/${activeQuiz.id}/attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: activeQuiz.questions.map((_, index) => quizAnswers[index]) })
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to submit this practice test.')
      }

      setQuizResult(data.data)
      setStatus({ type: '', message: '' })
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    }
  }

  const handleCreateGroup = async (event) => {
    event.preventDefault()

    if (!token) {
      setStatus({ type: 'error', message: 'Please log in before creating a study group.' })
      scrollToAuth()
      return
    }

    try {
      const response = await fetch(`${API_BASE}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(groupForm)
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to create study group')
      }

      setGroups((current) => [data.data, ...current])
      setJoinedGroupIds((current) => new Set(current).add(data.data.id))
      setGroupForm(defaultGroupForm)
      if (createGroupDetailsRef.current) createGroupDetailsRef.current.open = false
      setStatus({ type: 'success', message: 'Study group created successfully.' })
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    }
  }

  const handleBookSession = async (event) => {
    event.preventDefault()

    if (!token) {
      setStatus({ type: 'error', message: 'Please log in before booking a session.' })
      scrollToAuth()
      return
    }

    if (!selectedTutorId) {
      setStatus({ type: 'error', message: 'Please select a tutor.' })
      return
    }

    try {
      const response = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tutorId: selectedTutorId,
          courseCode: bookingForm.courseCode,
          date: bookingForm.date,
          notes: bookingForm.notes
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Booking failed')
      }

      setSessions((current) => [data.data, ...current])
      setStatus({ type: 'success', message: 'Session booked successfully.' })
      setBookingForm({
        courseCode: 'CS201',
        date: '',
        notes: ''
      })
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    }
  }

  const handleSendMessage = async (event) => {
    event.preventDefault()
    const messageText = event.target.message.value

    if (!messageText.trim()) return

    if (!token) {
      setStatus({ type: 'error', message: 'Please log in before sending a message.' })
      scrollToAuth()
      return
    }

    try {
      const response = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          receiver: event.target.receiver.value.trim(),
          content: messageText
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to send message')
      }

      setMessages((current) => [...current, data.data])
      event.target.reset()
      setStatus({ type: 'success', message: 'Message sent.' })
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    }
  }

  if (!user) {
    return (
      <div className="login-page">
        <main className="login-card" id="login-card" aria-labelledby="login-title">
          <div className="login-brand">
            <div className="brand-mark">THE LEARNING HUB</div>
            <span>Learning made easy</span>
          </div>

          <div className="login-card-heading">
            <p className="eyebrow">Peer Tutoring & Study Groups</p>
            <h1 id="login-title">{authMode === 'login' ? 'Welcome' : 'Create your account'}</h1>
            <p>{authMode === 'login' ? 'Sign in to continue to your learning dashboard.' : 'Join your campus learning community.'}</p>
          </div>

          <form onSubmit={handleAuthSubmit} className="stack-form login-form">
            {authMode === 'register' && (
              <label>
                Full name
                <input
                  autoComplete="name"
                  value={authForm.name}
                  onChange={(event) => setAuthForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Your full name"
                  required
                />
              </label>
            )}

            {authMode === 'register' && (
              <>
                <label>
                  School
                  <input
                    value={authForm.department}
                    onChange={(event) => setAuthForm((current) => ({ ...current, department: event.target.value }))}
                    placeholder="Your school"
                    maxLength={255}
                    required
                  />
                </label>
                <label>
                  Program of study
                  <input
                    value={authForm.programOfStudy}
                    onChange={(event) => setAuthForm((current) => ({ ...current, programOfStudy: event.target.value }))}
                    placeholder="e.g. Computer Science"
                    maxLength={255}
                    required
                  />
                </label>
                <label>
                  Student number
                  <input
                    value={authForm.studentNumber}
                    onChange={(event) => setAuthForm((current) => ({ ...current, studentNumber: event.target.value }))}
                    placeholder="Your student number"
                    maxLength={64}
                    required
                  />
                </label>
              </>
            )}

            <label>
              Email address
              <input
                autoComplete="email"
                type="email"
                value={authForm.email}
                onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="you@example.com"
                required
              />
            </label>

            <label>
              Password
              <input
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                type="password"
                value={authForm.password}
                onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
                placeholder={authMode === 'login' ? 'Enter your password' : 'At least 8 characters'}
                minLength={authMode === 'register' ? 8 : undefined}
                maxLength={72}
                required
              />
            </label>

            <button className="primary-button login-submit" type="submit">
              {authMode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="auth-switch">
            {authMode === 'login' ? 'New to the study community?' : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => {
                setAuthMode((current) => current === 'login' ? 'register' : 'login')
                setAuthForm(defaultAuthForm)
                setStatus({ type: '', message: '' })
              }}
            >
              {authMode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>

          {status.message && <div className={`status-banner ${status.type}`} role="alert">{status.message}</div>}
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar" id="dashboard">
        <a className="brand-block" href="#dashboard" aria-label="Peer Learning dashboard">
          <span className="brand-mark">THE LEARNING HUB</span>
          <span className="brand-copy">
            <small>Tutoring & study groups</small>
          </span>
        </a>

        <nav className="dashboard-menu" aria-label="Learning hub sections">
          <button type="button" className={`dashboard-menu-item ${activeSection === 'overview' ? 'active' : ''}`} onClick={() => setActiveSection('overview')}>Dashboard</button>
          <button type="button" className={`dashboard-menu-item ${activeSection === 'tutors' ? 'active' : ''}`} onClick={() => setActiveSection('tutors')}>Available tutors</button>
          <button type="button" className={`dashboard-menu-item ${activeSection === 'groups' ? 'active' : ''}`} onClick={() => setActiveSection('groups')}>Study groups</button>
          <button type="button" className={`dashboard-menu-item ${activeSection === 'resources' ? 'active' : ''}`} onClick={() => setActiveSection('resources')}>Course resources</button>
          <button type="button" className={`dashboard-menu-item ${activeSection === 'sessions' ? 'active' : ''}`} onClick={() => setActiveSection('sessions')}>Sessions</button>
          <button type="button" className={`dashboard-menu-item ${activeSection === 'messages' ? 'active' : ''}`} onClick={() => setActiveSection('messages')}>Messages</button>
        </nav>

        <div className="account-actions">
          <button type="button" className="quiet-button" onClick={openAccount}>My account</button>
          <button type="button" className="logout-button" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-content" id="dashboard-content">
        {activeSection === 'overview' ? (
        <section className="profile-dashboard">
          <div className="profile-dashboard-heading">
            <div>
              <p className="eyebrow">Student information</p>
              <h1>Student information</h1>
            </div>
            <span className="profile-record-status">Active student</span>
          </div>
          <div className="student-profile-card">
            <dl className="student-detail-list">
              <div>
                <dt>Student number</dt>
                <dd>{user.studentNumber || 'Not provided'}</dd>
              </div>
              <div>
                <dt>Full name</dt>
                <dd>{user.name}</dd>
              </div>
              <div>
                <dt>Programme of study</dt>
                <dd>{user.programOfStudy || 'Not provided'}</dd>
              </div>
              <div>
                <dt>School / Department</dt>
                <dd>{user.department || 'Not provided'}</dd>
              </div>
            </dl>
            {!user.studentNumber && <p className="demo-profile-note">Add your student number in My account.</p>}
          </div>
        </section>
        ) : (
          <div className="section-page-heading">
            <button type="button" className="back-link" onClick={() => setActiveSection('overview')}>← Dashboard</button>
            <p className="eyebrow">Your learning space</p>
            <h1>{activeSection === 'tutors' ? 'Find a tutor' : activeSection === 'groups' ? 'Study groups' : activeSection === 'resources' ? 'Course resources' : activeSection === 'sessions' ? 'Tutoring sessions' : 'Messages'}</h1>
          </div>
        )}

        {status.message && <div className={`status-banner ${status.type}`} role="status">{status.message}</div>}

        {activeSection === 'tutors' && (
        <div className="dashboard-overview-grid">
          <section className="dashboard-section" id="tutors-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Get help with your courses</p>
              <h2>Available tutors</h2>
            </div>
            <div className="tutor-filters" aria-label="Filter tutors">
              <label className="search-field">
                <span className="visually-hidden">Search tutors</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name or course"
                />
              </label>
              <label className="tutor-filter">
                <span className="visually-hidden">Filter by course</span>
                <select value={tutorCourseFilter} onChange={(event) => setTutorCourseFilter(event.target.value)}>
                  <option value="">All courses</option>
                  {tutorCourses.map((course) => <option key={course} value={course}>{course}</option>)}
                </select>
              </label>
              <label className="tutor-filter">
                <span className="visually-hidden">Filter by school</span>
                <select value={tutorSchoolFilter} onChange={(event) => setTutorSchoolFilter(event.target.value)}>
                  <option value="">All schools</option>
                  {tutorSchools.map((school) => <option key={school} value={school}>{school}</option>)}
                </select>
              </label>
            </div>
          </div>

          {filteredTutors.length ? (
            <div className="tutor-grid">
              {filteredTutors.map((tutor) => (
                <article className="tutor-card" key={tutor.id}>
                  <div className="tutor-card-heading">
                    <div className="avatar-circle" aria-hidden="true">{tutor.name.charAt(0)}</div>
                    <span className="rating">{tutor.rating}</span>
                  </div>
                  <h3>{tutor.name}</h3>
                  <p className="tutor-course">{tutor.courseCode} <span aria-hidden="true">/</span> {tutor.department}</p>
                  <p className="tutor-bio">{tutor.bio}</p>
                  <p className="availability">Available: {tutor.availability}</p>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setSelectedTutorId(tutor.id)
                      setBookingForm((current) => ({ ...current, courseCode: tutor.courseCode }))
                      setActiveSection('sessions')
                    }}
                  >
                    Book a session
                  </button>
                </article>
              ))}
            </div>
          ) : <p className="empty-state">No tutors match that search. Try another name or course.</p>}
          </section>
        </div>
        )}

        {activeSection === 'groups' && (
        <div className="dashboard-overview-grid">
          <section className="dashboard-section" id="groups-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Learn together</p>
              <h2>Study groups</h2>
            </div>
            <details className="create-group-details" ref={createGroupDetailsRef}>
              <summary className="primary-button">Create a group</summary>
              <form onSubmit={handleCreateGroup} className="stack-form create-group-form">
                <label>
                  Group name
                  <input
                    value={groupForm.name}
                    onChange={(event) => setGroupForm((current) => ({ ...current, name: event.target.value }))}
                    maxLength="255"
                    required
                  />
                </label>
                <label>
                  Course code
                  <input
                    value={groupForm.courseCode}
                    onChange={(event) => setGroupForm((current) => ({ ...current, courseCode: event.target.value }))}
                    maxLength="50"
                    required
                  />
                </label>
                <label>
                  Department
                  <input
                    value={groupForm.department}
                    onChange={(event) => setGroupForm((current) => ({ ...current, department: event.target.value }))}
                    maxLength="255"
                    required
                  />
                </label>
                <button className="primary-button" type="submit">Create study group</button>
              </form>
            </details>
          </div>

          {groups.length ? (
            <div className="group-list">
              {groups.map((group) => {
                const isJoined = joinedGroupIds.has(group.id)
                const hasPendingRequest = pendingGroupRequestIds.has(group.id)
                return (
                  <article className="group-row" key={group.id}>
                    <div className="group-icon" aria-hidden="true">G</div>
                    <div className="group-details">
                      <h3>{group.name}</h3>
                      <p>{group.courseCode} <span aria-hidden="true">/</span> {group.department}</p>
                      <small>{group.members} members <span aria-hidden="true">·</span> {group.nextSession}</small>
                    </div>
                    <button
                      type="button"
                      className={isJoined || hasPendingRequest ? 'joined-button' : 'secondary-button'}
                      onClick={() => handleJoinGroup(group.id)}
                      disabled={isJoined || hasPendingRequest}
                    >
                      {isJoined ? 'Joined' : hasPendingRequest ? 'Pending request' : 'Request to join'}
                    </button>
                  </article>
                )
              })}
            </div>
          ) : <p className="empty-state">No study groups yet. Create one to get started.</p>}
          </section>
        </div>
        )}

        {activeSection === 'resources' && (
        <div className="dashboard-overview-grid">
          <section className="dashboard-section" id="resources-panel">
            <div className="section-heading resource-heading">
              <div>
                <p className="eyebrow">Study smarter</p>
                <h2>Course resources</h2>
              </div>
              <div className="resource-tabs" role="group" aria-label="Resource type">
                <button type="button" className={resourceTab === 'materials' ? 'active' : ''} aria-pressed={resourceTab === 'materials'} onClick={() => setResourceTab('materials')}>Materials</button>
                <button type="button" className={resourceTab === 'practice' ? 'active' : ''} aria-pressed={resourceTab === 'practice'} onClick={() => setResourceTab('practice')}>Practice tests</button>
              </div>
            </div>

            <div className="resource-filters">
              <label className="search-field">
                <span className="visually-hidden">Search course resources</span>
                <input value={resourceSearch} onChange={(event) => setResourceSearch(event.target.value)} placeholder="Search by title or course" />
              </label>
              <label className="tutor-filter">
                <span className="visually-hidden">Filter resources by course</span>
                <select value={resourceCourseFilter} onChange={(event) => setResourceCourseFilter(event.target.value)}>
                  <option value="">All courses</option>
                  {resourceCourses.map((course) => <option key={course} value={course}>{course}</option>)}
                </select>
              </label>
              {resourceTab === 'materials' && (
                <label className="tutor-filter">
                  <span className="visually-hidden">Filter by material type</span>
                  <select value={resourceTypeFilter} onChange={(event) => setResourceTypeFilter(event.target.value)}>
                    <option value="">All material types</option>
                    {resourceTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
              )}
            </div>

            {resourceTab === 'materials' ? (
              filteredResources.length ? (
                <div className="resource-grid">
                  {filteredResources.map((resource) => (
                    <article className="resource-card" key={resource.id}>
                      <div className="resource-card-meta"><span>{resource.courseCode}</span><span>{resource.resourceType}</span></div>
                      <h3>{resource.title}</h3>
                      <p>{resource.description}</p>
                      <div className="resource-card-footer">
                        <small>{resource.source}</small>
                        <a className="secondary-button" href={`${API_BASE}${resource.downloadUrl}`} download={resource.downloadName} aria-label={`Download ${resource.title}`}>Download</a>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <p className="empty-state">No materials match those filters.</p>
            ) : activeQuiz ? (
              <div className="quiz-workspace">
                <button type="button" className="back-link quiz-back-link" onClick={() => { setActiveQuiz(null); setQuizResult(null); setQuizAnswers({}) }}>← All practice tests</button>
                <div className="quiz-title-row">
                  <div><p className="eyebrow">{activeQuiz.courseCode} practice test</p><h3>{activeQuiz.title}</h3><p>{activeQuiz.description}</p></div>
                  {quizResult && <strong className="quiz-score">{quizResult.score} / {quizResult.total} correct</strong>}
                </div>
                <form onSubmit={handleSubmitQuiz}>
                  <ol className="quiz-question-list">
                    {activeQuiz.questions.map((question, questionIndex) => {
                      const result = quizResult?.results[questionIndex]
                      return (
                        <li className="quiz-question" key={`${activeQuiz.id}-${questionIndex}`}>
                          <fieldset>
                            <legend>{question.prompt}</legend>
                            <div className="quiz-options">
                              {question.options.map((option, optionIndex) => {
                                const isCorrect = result && result.correctIndex === optionIndex
                                const isIncorrectSelection = result && result.selectedIndex === optionIndex && !result.isCorrect
                                return (
                                  <label className={`${quizAnswers[questionIndex] === optionIndex ? 'selected' : ''} ${isCorrect ? 'correct' : ''} ${isIncorrectSelection ? 'incorrect' : ''}`} key={option}>
                                    <input
                                      type="radio"
                                      name={`question-${questionIndex}`}
                                      value={optionIndex}
                                      checked={quizAnswers[questionIndex] === optionIndex}
                                      disabled={Boolean(quizResult)}
                                      required
                                      onChange={() => setQuizAnswers((current) => ({ ...current, [questionIndex]: optionIndex }))}
                                    />
                                    <span>{option}</span>
                                  </label>
                                )
                              })}
                            </div>
                          </fieldset>
                          {result && <p className={`quiz-explanation ${result.isCorrect ? 'correct' : 'incorrect'}`}><strong>{result.isCorrect ? 'Correct.' : `Answer: ${result.correctAnswer}.`}</strong> {result.explanation}</p>}
                        </li>
                      )
                    })}
                  </ol>
                  {quizResult ? (
                    <button type="button" className="secondary-button" onClick={() => handleStartQuiz(activeQuiz)}>Try again</button>
                  ) : (
                    <button type="submit" className="primary-button">Submit answers</button>
                  )}
                </form>
              </div>
            ) : (
              filteredQuizzes.length ? (
                <div className="resource-grid">
                  {filteredQuizzes.map((quiz) => (
                    <article className="resource-card practice-card" key={quiz.id}>
                      <div className="resource-card-meta"><span>{quiz.courseCode}</span><span>{quiz.questions.length} questions</span></div>
                      <h3>{quiz.title}</h3>
                      <p>{quiz.description}</p>
                      <div className="resource-card-footer">
                        <small>Answers and feedback after submission</small>
                        <button type="button" className="primary-button" onClick={() => handleStartQuiz(quiz)}>Start test</button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <p className="empty-state">No practice tests match those filters.</p>
            )}
          </section>
        </div>
        )}

        {activeSection === 'sessions' && (
        <div className="dashboard-activity-grid">
          <section className="dashboard-section" id="sessions-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Plan your learning</p>
              <h2>Tutoring sessions</h2>
            </div>
          </div>
          <div className="sessions-layout">
            <form onSubmit={handleBookSession} className="stack-form session-form">
              <label>
                Tutor
                <select
                  value={selectedTutorId}
                  onChange={(event) => setSelectedTutorId(Number(event.target.value))}
                  required
                >
                  {tutors.map((tutor) => (
                    <option key={tutor.id} value={tutor.id}>{tutor.name} ({tutor.courseCode})</option>
                  ))}
                </select>
              </label>
              <label>
                Course code
                <input
                  value={bookingForm.courseCode}
                  onChange={(event) => setBookingForm((current) => ({ ...current, courseCode: event.target.value }))}
                  required
                />
              </label>
              <label>
                Date and time
                <input
                  type="datetime-local"
                  value={bookingForm.date}
                  onChange={(event) => setBookingForm((current) => ({ ...current, date: event.target.value }))}
                  required
                />
              </label>
              <label>
                Notes <span className="optional-label">(optional)</span>
                <textarea
                  rows="3"
                  value={bookingForm.notes}
                  onChange={(event) => setBookingForm((current) => ({ ...current, notes: event.target.value }))}
                />
              </label>
              <button className="primary-button" type="submit">Request a session</button>
            </form>

            <div className="session-list">
              <h3>Your recent sessions</h3>
              {sessions.length ? sessions.slice(0, 4).map((session) => (
                <article className="session-row" key={session.id}>
                  <strong>{session.courseCode}</strong>
                  <span>{new Date(session.date).toLocaleString()}</span>
                  <small>{session.status}</small>
                </article>
              )) : <p className="empty-state">Your booked sessions will appear here.</p>}
            </div>
          </div>
          </section>

        </div>
        )}

        {activeSection === 'messages' && (
        <div className="dashboard-activity-grid">
          <section className="dashboard-section" id="messages-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Keep in touch</p>
              <h2>Messages</h2>
            </div>
          </div>
          <div className="message-list">
            {messages.length ? messages.slice(0, 5).map((message) => (
              <article className="message-item" key={message.id}>
                <div className="message-header">
                  <strong>{message.sender} <span className="message-arrow">to</span> {message.receiver}</strong>
                  <small>{new Date(message.sentAt).toLocaleString()}</small>
                </div>
                <p>{message.content}</p>
              </article>
            )) : <p className="empty-state">Your conversations will show up here.</p>}
          </div>
          <form onSubmit={handleSendMessage} className="message-form">
            <label>
              Send to
              <input name="receiver" placeholder="Tutor or student name" maxLength="255" required />
            </label>
            <label className="message-compose">
              Message
              <input name="message" placeholder="Write a message..." maxLength="5000" required />
            </label>
            <button className="primary-button" type="submit">Send message</button>
          </form>
          </section>
        </div>
        )}
        </div>
      </main>
      {accountOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setAccountOpen(false)}>
          <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="account-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="section-kicker">Account settings</span>
                <h2 id="account-title">My profile</h2>
              </div>
              <button type="button" className="icon-button" onClick={() => setAccountOpen(false)} aria-label="Close account settings">×</button>
            </div>
            <form className="stack-form" onSubmit={saveProfile}>
              <label>
                Full name
                <input
                  value={profileForm.name}
                  onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </label>
              <label>
                School
                <input
                  value={profileForm.department}
                  onChange={(event) => setProfileForm((current) => ({ ...current, department: event.target.value }))}
                  required
                />
              </label>
              <label>
                Program of study
                <input
                  value={profileForm.programOfStudy}
                  onChange={(event) => setProfileForm((current) => ({ ...current, programOfStudy: event.target.value }))}
                  maxLength={255}
                />
              </label>
              <label>
                Student number
                <input
                  value={profileForm.studentNumber}
                  onChange={(event) => setProfileForm((current) => ({ ...current, studentNumber: event.target.value }))}
                  maxLength={64}
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="ghost-button" onClick={() => setAccountOpen(false)}>Cancel</button>
                <button type="submit" className="primary-button" disabled={profileSaving}>
                  {profileSaving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
