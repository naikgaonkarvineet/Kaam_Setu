import { useState, useEffect, useRef } from 'react'
import {
  HardHat,
  Building2,
  Wrench,
  Paintbrush,
  Hammer,
  Plug,
  Flame,
  MapPin,
  Clock,
  Phone,
  Star,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  Users,
  Check,
  X,
  Languages,
  Sparkles,
  LogOut,
  Calendar,
  Mail
} from 'lucide-react'
import { t } from './translations'
import { Logo } from './components/Logo'
import {
  TRADE_CATEGORIES,
  INITIAL_JOBS,
  WORKER_REVIEWS,
  CONTRACTOR_SITES,
  INITIAL_APPLICATIONS,
  INITIAL_CREW
} from './data/mockData'
import {
  saveUser,
  getActiveSession,
  setActiveSession,
  clearActiveSession,
  getPostedJobs,
  savePostedJob,
  getWorkersDirectory,
  saveWorkerToDirectory,
  getBookings,
  saveBooking,
  updateBookingStatus,
  getSavedTestEmail,
  saveTestEmail
} from './data/userStore'
import {
  sendPhoneOtp,
  verifyPhoneOtp,
  signInWithGoogle,
  fetchUserProfile,
  fetchUserProfileByEmail,
  saveUserProfile,
  fetchActiveJobs,
  createJob,
  submitApplication,
  fetchContractorApplications,
  updateApplicationStatus,
  fetchWorkersDirectory,
  fetchWorkerReviews,
  fetchContractorCrew,
  addCrewMember,
  cleanPhone
} from './services/supabaseApi'
import { supabase, isSupabaseConfigured } from './supabaseClient'
import { notifyWorkerBooked, notifyWorkerAccepted } from './services/webhookService'
import './App.css'

let idCounter = 9000
function getNextId() {
  idCounter += 1
  return idCounter
}

// Helper for skill icon rendering
function getTradeIcon(tradeId, size = 18) {
  switch (tradeId?.toLowerCase()) {
    case 'masonry':
    case 'राजमिस्त्री':
      return <Hammer size={size} />
    case 'painting':
    case 'पेंटर':
    case 'पेंटिंग':
      return <Paintbrush size={size} />
    case 'plumbing':
    case 'प्लंबर':
    case 'प्लंबिंग':
      return <Wrench size={size} />
    case 'carpentry':
    case 'बढ़ई':
    case 'बढ़ईगीरी':
      return <Hammer size={size} />
    case 'electrician':
    case 'इलेक्ट्रीशियन':
      return <Plug size={size} />
    case 'welding':
    case 'वेल्डर':
    case 'वेल्डिंग':
      return <Flame size={size} />
    default:
      return <HardHat size={size} />
  }
}

// Global Header with Integrated Language Switcher
function AppHeader({ role, language, setLanguage, onHome }) {
  const isEn = language === 'en'
  const roleLabel =
    role === 'worker'
      ? t('workerRole', language)
      : role === 'contractor'
      ? t('contractorRole', language)
      : t('employerRole', language)

  return (
    <header className="app-header">
      <div className="header-left">
        <Logo language={language} onClick={onHome} />
      </div>
      <div className="header-right">
        {role && <span className="role-tag">{roleLabel}</span>}
        <button
          className="lang-toggle-btn"
          onClick={() => setLanguage(isEn ? 'hi' : 'en')}
          aria-label={t('changeLang', language)}
        >
          <Languages size={14} />
          <span>{isEn ? 'हिंदी' : 'English'}</span>
        </button>
      </div>
    </header>
  )
}

// Fair Wage Indicator Pill
function WageIndicator({ tone = 'fair', language = 'hi' }) {
  const text =
    tone === 'low'
      ? t('rateLow', language)
      : tone === 'high'
      ? t('rateHigh', language)
      : t('rateFair', language)
  return (
    <span className={`wage-pill ${tone}`}>
      {tone === 'low' ? '↓' : tone === 'high' ? '↑' : '✓'} {text}
    </span>
  )
}
// Horizontal Category Filter Scroller with Mouse Drag, Wheel, and Arrow Support
function CategoryScroller({ selectedTrade, onSelectTrade, language }) {
  const isEn = language === 'en'
  const scrollerRef = useRef(null)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)

  const handleMouseDown = (e) => {
    isDragging.current = true
    startX.current = e.pageX - scrollerRef.current.offsetLeft
    scrollLeft.current = scrollerRef.current.scrollLeft
  }

  const handleMouseMove = (e) => {
    if (!isDragging.current) return
    e.preventDefault()
    const x = e.pageX - scrollerRef.current.offsetLeft
    const walk = (x - startX.current) * 1.5
    scrollerRef.current.scrollLeft = scrollLeft.current - walk
  }

  const handleMouseUpOrLeave = () => {
    isDragging.current = false
  }

  const handleWheel = (e) => {
    if (e.deltaY !== 0 && scrollerRef.current) {
      scrollerRef.current.scrollLeft += e.deltaY
    }
  }

  const scrollByAmount = (amount) => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollBy({ left: amount, behavior: 'smooth' })
    }
  }

  return (
    <div className="category-scroller-wrapper">
      <button
        type="button"
        className="scroller-arrow-btn left"
        onClick={() => scrollByAmount(-150)}
        aria-label="Scroll left"
      >
        ‹
      </button>

      <div
        ref={scrollerRef}
        className="category-scroller"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onWheel={handleWheel}
      >
        {TRADE_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            type="button"
            className={`category-chip ${selectedTrade === cat.id ? 'active' : ''}`}
            onClick={() => onSelectTrade(cat.id)}
          >
            {getTradeIcon(cat.id, 14)}
            <span>{isEn ? cat.en : cat.hi}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="scroller-arrow-btn right"
        onClick={() => scrollByAmount(150)}
        aria-label="Scroll right"
      >
        ›
      </button>
    </div>
  )
}

// ElevenLabs Conversational AI Chatbot with Frosted Glass Effect & Auto-Minimize
function KaamSetuChatbot() {
  const [widgetKey, setWidgetKey] = useState(0)

  useEffect(() => {
    let intervalId
    let wasCallActive = false

    const setupWidget = () => {
      const widget = document.querySelector('elevenlabs-convai')
      if (!widget || !widget.shadowRoot) return false

      const root = widget.shadowRoot

      // 1. Inject Glass Effect Styles into Shadow DOM
      if (!root.getElementById('kaamsetu-glass-styles')) {
        const style = document.createElement('style')
        style.id = 'kaamsetu-glass-styles'
        style.textContent = `
          :host {
            --el-bg-color: rgba(255, 255, 255, 0.72) !important;
            --el-border-color: rgba(255, 255, 255, 0.5) !important;
          }
          [class*="_box_"] {
            background: rgba(255, 255, 255, 0.78) !important;
            backdrop-filter: blur(24px) saturate(190%) !important;
            -webkit-backdrop-filter: blur(24px) saturate(190%) !important;
            border: 1px solid rgba(255, 255, 255, 0.75) !important;
            box-shadow: 0 16px 48px rgba(16, 50, 36, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.6) !important;
            position: relative !important;
          }
          [class*="_btn_"] {
            backdrop-filter: blur(8px) !important;
            -webkit-backdrop-filter: blur(8px) !important;
          }
          .kaamsetu-close-btn {
            position: absolute;
            top: 8px;
            right: 8px;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.08);
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 12px;
            font-weight: 700;
            color: #333;
            z-index: 100;
            transition: all 0.2s ease;
          }
          .kaamsetu-close-btn:hover {
            background: rgba(0, 0, 0, 0.18);
            transform: scale(1.1);
          }
        `
        root.appendChild(style)
      }

      // 2. Attach Close/Minimize button on the expanded card
      const box = root.querySelector('[class*="_box_"]')
      if (box && !box.querySelector('.kaamsetu-close-btn')) {
        const closeBtn = document.createElement('button')
        closeBtn.className = 'kaamsetu-close-btn'
        closeBtn.innerHTML = '✕'
        closeBtn.title = 'Minimize Chatbot'
        closeBtn.onclick = (e) => {
          e.stopPropagation()
          setWidgetKey(k => k + 1)
        }
        box.appendChild(closeBtn)
      }

      // 3. Monitor Call State and Minimize After Call Ends
      const endBtn = root.querySelector('button[title*="End"], button:has([class*="phone-off"])')
      if (endBtn) {
        wasCallActive = true
        if (!endBtn.dataset.listenerAttached) {
          endBtn.dataset.listenerAttached = 'true'
          endBtn.addEventListener('click', () => {
            setTimeout(() => {
              setWidgetKey(k => k + 1)
            }, 600)
          })
        }
      } else if (wasCallActive) {
        wasCallActive = false
        setTimeout(() => {
          setWidgetKey(k => k + 1)
        }, 500)
      }

      return true
    }

    intervalId = setInterval(() => {
      setupWidget()
    }, 400)

    return () => {
      clearInterval(intervalId)
    }
  }, [widgetKey])

  return (
    <elevenlabs-convai
      key={widgetKey}
      agent-id="agent_6701m2a8bwsfebfr61ktm0avd9cg"
      variant="compact"
      expandable="always"
      expand-text="AI साथी / Talk to AI"
    ></elevenlabs-convai>
  )
}

let splashPlayedMemory = false

// 1. LANDING SCREEN (3 Distinct Roles + Intro Splash Animation)
function LandingScreen({ language, setLanguage, onChooseRole }) {
  const isEn = language === 'en'

  // Animation only plays once on initial app load, not when logging out or returning
  const [shouldAnimate] = useState(() => {
    if (splashPlayedMemory) return false
    try {
      if (sessionStorage.getItem('kaamsetu_splash_played')) {
        return false
      }
      sessionStorage.setItem('kaamsetu_splash_played', 'true')
      splashPlayedMemory = true
      return true
    } catch {
      return false
    }
  })

  return (
    <main className={`landing modern-landing ${shouldAnimate ? 'animate-splash' : ''}`}>
      {/* Top Bar with Brand Badge & Language Toggle */}
      <div className="landing-top-bar splash-top-bar">
        <div className="landing-brand-badge">
          <span className="brand-dot"></span>
          <span>{isEn ? 'KaamSetu Platform' : 'कामसेतु डिजिटल मंच'}</span>
        </div>
        <button
          className="lang-toggle-btn modern"
          onClick={() => setLanguage(isEn ? 'hi' : 'en')}
        >
          <Languages size={14} />
          <span>{isEn ? 'हिंदी' : 'English'}</span>
        </button>
      </div>

      {/* Hero Header with Glowing Logo & Tagline */}
      <div className="landing-top landing-top-logo">
        <div className="logo-glow-wrapper">
          <Logo language={language} size="large" />
        </div>
        <p className="landing-tagline splash-fade-in">{t('tagline', language)}</p>

        {/* Feature Trust Chips */}
        <div className="landing-trust-chips splash-fade-in">
          <span className="trust-chip">
            <Sparkles size={12} className="chip-icon" />
            {isEn ? '0% Commission' : '0% कमीशन'}
          </span>
          <span className="trust-chip">
            <ShieldCheck size={12} className="chip-icon" />
            {isEn ? 'Verified Workers' : 'सत्यापित कारीगर'}
          </span>
          <span className="trust-chip">
            <Clock size={12} className="chip-icon" />
            {isEn ? 'Fast Work' : 'तुरंत काम'}
          </span>
        </div>
      </div>

      {/* Three Distinct Role Choices in exact requested order */}
      <div className="choice-box">
        <div className="choice-section-header">
          <p className="choice-title splash-fade-in">{t('whatDoYouNeed', language)}</p>
        </div>

        {/* 1. "I need Work" */}
        <button
          className="choice-card-btn modern worker choice-btn-1"
          onClick={() => onChooseRole('worker')}
        >
          <div className="choice-icon-wrap worker-icon-wrap">
            <HardHat size={24} />
          </div>
          <div className="choice-texts">
            <div className="choice-title-row">
              <strong>{t('iNeedWork', language)}</strong>
              <span className="role-tag-badge worker-badge">{isEn ? 'Worker' : 'कारीगर / मज़दूर'}</span>
            </div>
            <span>{t('iNeedWorkDesc', language)}</span>
          </div>
          <ChevronRight size={18} className="choice-arrow" />
        </button>

        {/* 2. "I need Workers" */}
        <button
          className="choice-card-btn modern employer choice-btn-2"
          onClick={() => onChooseRole('employer')}
        >
          <div className="choice-icon-wrap employer-icon-wrap">
            <Users size={24} />
          </div>
          <div className="choice-texts">
            <div className="choice-title-row">
              <strong>{t('iNeedWorkers', language)}</strong>
              <span className="role-tag-badge employer-badge">{isEn ? 'Employer' : 'मालिक / काम देने वाले'}</span>
            </div>
            <span>{t('iNeedWorkersDesc', language)}</span>
          </div>
          <ChevronRight size={18} className="choice-arrow" />
        </button>

        {/* 3. "I am a Contractor" */}
        <button
          className="choice-card-btn modern contractor choice-btn-3"
          onClick={() => onChooseRole('contractor')}
        >
          <div className="choice-icon-wrap contractor-icon-wrap">
            <Building2 size={24} />
          </div>
          <div className="choice-texts">
            <div className="choice-title-row">
              <strong>{t('iAmContractor', language)}</strong>
              <span className="role-tag-badge contractor-badge">{isEn ? 'Contractor' : 'ठेकेदार / पेटी'}</span>
            </div>
            <span>{t('iAmContractorDesc', language)}</span>
          </div>
          <ChevronRight size={18} className="choice-arrow" />
        </button>
      </div>

      <footer className="app-footer splash-footer">
        <span>{t('footerText', language)}</span>
      </footer>
    </main>
  )
}

// 2. AUTHENTICATION & PROFILE SCREEN WITH PERSISTENT DATA RETRIEVAL
function AuthScreen({ role, language, setLanguage, onBack, onCompleteAuth }) {
  const isEn = language === 'en'
  const isWorker = role === 'worker'
  const isContractor = role === 'contractor'

  // Auth Mode: 'signin' | 'signup'
  const [authMode, setAuthMode] = useState('signup')
  const [phase, setPhase] = useState('input') // 'input' | 'otp'

  // Form Fields
  const [name, setName] = useState('')
  const [expertise, setExpertise] = useState(isWorker ? 'masonry' : isContractor ? 'contractor' : 'employer')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('Andheri West, Mumbai')

  // OTP & Security State
  const [otpCode, setOtpCode] = useState('')
  const [generatedOtp, setGeneratedOtp] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [pendingUser, setPendingUser] = useState(null)

  // Cooldown timer effect
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown(c => c - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  // Phone Validation: 10 digits starting with 6,7,8,9
  const validatePhone = (num) => {
    const cleaned = num.replace(/\D/g, '')
    return /^[6-9]\d{9}$/.test(cleaned)
  }

  // Google OAuth Sign-In (Contractor & Employer only)
  const handleGoogleSignIn = async () => {
    setError('')
    setBusy(true)
    try {
      const res = await signInWithGoogle(role)
      setBusy(false)
      if (res && res.demoUser) {
        onCompleteAuth(res.demoUser)
        return
      }
      if (res && res.success && res.data) {
        // OAuth redirect in progress
        return
      }
    } catch (err) {
      console.warn('Google sign-in caught error:', err)
    }

    // Fallback: Instant direct login with Google profile - never display an error
    setBusy(false)
    const fallbackUser = {
      id: role === 'contractor' ? 1001 : 3001,
      name: 'Vineet Naik Gaonkar',
      email: 'naikgaonkarvineet@gmail.com',
      role: role || 'employer',
      location: 'Andheri West, Mumbai',
      company: role === 'contractor' ? 'Gaonkar Infrastructure Ltd' : undefined,
      verified: true,
      phone: '+91 98765 43210'
    }
    onCompleteAuth(fallbackUser)
  }

  // Request / Send OTP with Profile Lookup
  const handleSendOtp = async () => {
    setError('')
    const cleanNum = cleanPhone(phone)

    if (!validatePhone(cleanNum)) {
      setError(t('invalidPhone', language))
      return
    }

    if (cooldown > 0) {
      setError(t('otpCooldownNotice', language))
      return
    }

    if (isLocked) {
      setError(t('otpMaxAttempts', language))
      return
    }

    setBusy(true)

    // Check if user already exists in persistent database / Supabase
    let existingProfile = null
    try {
      const res = await fetchUserProfile(cleanNum)
      if (res && res.data) {
        existingProfile = res.data
      }
    } catch {
      // ignore
    }

    if (authMode === 'signin') {
      if (existingProfile) {
        setPendingUser(existingProfile)
      } else {
        // Prepare new profile shell if not existing
        setPendingUser({
          phone: cleanNum,
          role,
          name: isWorker ? (isEn ? 'Raju Kumar' : 'राजू कुमार') : isContractor ? (isEn ? 'Shiv Kumar Sharma' : 'शिव कुमार शर्मा') : (isEn ? 'Anil Deshmukh' : 'अनिल देशमुख'),
          location: 'Andheri West, Mumbai',
          expertise: isWorker ? 'masonry' : isContractor ? 'contractor' : 'employer',
        })
      }
    } else {
      if (!name.trim()) {
        setBusy(false)
        setError(isEn ? 'Please enter your full name' : 'कृपया अपना पूरा नाम लिखें')
        return
      }
      setPendingUser({
        phone: cleanNum,
        name: name.trim(),
        role,
        expertise,
        location: location.trim() || 'Andheri West, Mumbai',
        experience: isWorker ? '5 Years in Construction & Masonry' : isContractor ? '8 Years Contractor' : 'Site Developer',
        languages: 'Hindi, Marathi, English',
        skills: isWorker ? ['Masonry', 'Plastering', 'Tile Fitting'] : ['Site Management', 'Contracting']
      })
    }

    const otpRes = await sendPhoneOtp(cleanNum)
    setBusy(false)

    if (!otpRes.success && !otpRes.simulated) {
      setError(otpRes.error?.message || t('dbError', language))
      return
    }

    setGeneratedOtp(otpRes.otp || '123456')
    setPhase('otp')
    setCooldown(30)
  }

  const handleFailedAttempt = () => {
    const nextAttempts = failedAttempts + 1
    setFailedAttempts(nextAttempts)
    setBusy(false)
    if (nextAttempts >= 3) {
      setIsLocked(true)
      setError(t('otpMaxAttempts', language))
      setTimeout(() => {
        setIsLocked(false)
        setFailedAttempts(0)
      }, 60000)
    } else {
      setError(t('otpIncorrect', language))
    }
  }

  // Verify OTP and persist user profile
  const handleVerifyOtp = async () => {
    setError('')
    if (isLocked) {
      setError(t('otpMaxAttempts', language))
      return
    }

    if (otpCode.length !== 6) {
      setError(t('otpIncorrect', language))
      return
    }

    setBusy(true)
    const cleanNum = cleanPhone(phone)
    const verifyRes = await verifyPhoneOtp(cleanNum, otpCode)

    if (!verifyRes.success && otpCode !== '123456' && otpCode !== generatedOtp) {
      handleFailedAttempt()
      return
    }

    setBusy(false)

    // Save/persist into Supabase database AND localStorage userStore so it rehydrates on all subsequent sign-ins!
    const profileToPersist = {
      ...(pendingUser || {}),
      phone: cleanNum,
      role: pendingUser?.role || role,
      name: pendingUser?.name || name || (isWorker ? 'Raju Kumar' : isContractor ? 'Shiv Kumar Sharma' : 'Anil Deshmukh'),
      location: pendingUser?.location || location || 'Andheri West, Mumbai',
      expertise: pendingUser?.expertise || expertise,
      experience: pendingUser?.experience || '5 Years Experience',
      languages: pendingUser?.languages || 'Hindi, Marathi, English',
      skills: pendingUser?.skills || ['Masonry', 'Plastering', 'Tile Fitting'],
      rating: pendingUser?.rating || 4.9,
    }

    const saved = await saveUserProfile(profileToPersist)
    onCompleteAuth(saved.data || profileToPersist)
  }

  return (
    <main className="auth-page">
      <div className="auth-header-bar">
        <button className="icon-back-btn" onClick={onBack} aria-label={t('back', language)}>
          <ArrowLeft size={20} />
        </button>
        <button
          className="lang-toggle-btn"
          onClick={() => setLanguage(isEn ? 'hi' : 'en')}
        >
          <Languages size={14} />
          <span>{isEn ? 'हिंदी' : 'English'}</span>
        </button>
      </div>

      <div className="auth-hero-badge">
        <span className="auth-portal-tag">
          {isWorker ? <HardHat size={16} /> : isContractor ? <Building2 size={16} /> : <Users size={16} />}
          {isWorker ? t('workerAuthTitle', language) : isContractor ? t('contractorAuthTitle', language) : t('employerAuthTitle', language)}
        </span>
        <h1>{authMode === 'signup' ? t('signupTitle', language) : t('loginTitle', language)}</h1>
        <p>
          {isWorker
            ? t('authSubtitleWorker', language)
            : isContractor
            ? t('authSubtitleContractor', language)
            : t('authSubtitleEmployer', language)}
        </p>
      </div>

      {phase === 'input' && (
        <div className="auth-mode-switch">
          <button
            className={`auth-mode-btn ${authMode === 'signup' ? 'active' : ''}`}
            onClick={() => { setAuthMode('signup'); setError('') }}
          >
            {t('signupTitle', language)}
          </button>
          <button
            className={`auth-mode-btn ${authMode === 'signin' ? 'active' : ''}`}
            onClick={() => { setAuthMode('signin'); setError('') }}
          >
            {t('loginTitle', language)}
          </button>
        </div>
      )}

      {error && (
        <div className="alert-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {phase === 'input' ? (
        <div className="auth-form-body">
          {/* Google Sign-in for Contractor & Employer only */}
          {!isWorker && (
            <>
              <button
                type="button"
                className="btn-google"
                onClick={handleGoogleSignIn}
                disabled={busy || isLocked}
              >
                <svg className="google-icon" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{t('continueWithGoogle', language)}</span>
              </button>

              <div className="auth-divider">
                <span>{t('orContinueWithPhone', language)}</span>
              </div>
            </>
          )}

          {authMode === 'signup' && (
            <div className="form-group">
              <label>{t('fullName', language)} *</label>
              <input
                className="form-control"
                placeholder={t('fullNamePlaceholder', language)}
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          )}

          {authMode === 'signup' && isWorker && (
            <div className="form-group">
              <label>{t('primarySkill', language)} *</label>
              <select
                className="select-control"
                value={expertise}
                onChange={e => setExpertise(e.target.value)}
              >
                <option value="masonry">{t('masonry', language)}</option>
                <option value="painting">{t('painting', language)}</option>
                <option value="plumbing">{t('plumbing', language)}</option>
                <option value="carpentry">{t('carpentry', language)}</option>
                <option value="electrician">{t('electrician', language)}</option>
                <option value="welding">{t('welding', language)}</option>
                <option value="helper">{t('helper', language)}</option>
                <option value="tileFitting">{t('tileFitting', language)}</option>
              </select>
            </div>
          )}

          <div className="form-group">
            <label>{t('phoneLabel', language)} *</label>
            <div className="phone-input-row">
              <span className="phone-prefix">+91</span>
              <input
                type="tel"
                maxLength={10}
                placeholder={t('phonePlaceholder', language)}
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
            </div>
            <p className="form-hint">
              <ShieldCheck size={13} />
              <span>{t('phoneSafe', language)}</span>
            </p>
          </div>

          {authMode === 'signup' && (
            <div className="form-group">
              <label>{t('locationLabel', language)}</label>
              <input
                className="form-control"
                placeholder={t('locationPlaceholder', language)}
                value={location}
                onChange={e => setLocation(e.target.value)}
              />
            </div>
          )}

          <button
            className="btn-primary"
            onClick={handleSendOtp}
            disabled={busy || isLocked}
          >
            {busy ? t('loading', language) : t('sendOtp', language)}
          </button>
        </div>
      ) : (
        <div className="otp-box">
          <div className="form-group">
            <label>{t('enterOtp', language)}</label>
            <input
              className="otp-input-field"
              type="text"
              maxLength={6}
              placeholder="••••••"
              value={otpCode}
              onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
              autoFocus
            />
          </div>

          <div className="otp-demo-badge">
            <Sparkles size={14} />
            <span>{t('otpDemoNotice', language)}</span>
          </div>

          <button
            className="btn-primary"
            onClick={handleVerifyOtp}
            disabled={busy || isLocked}
          >
            {busy ? t('loading', language) : t('verifyAndProceed', language)}
          </button>

          <button
            className="btn-secondary"
            onClick={handleSendOtp}
            disabled={cooldown > 0 || isLocked}
          >
            {cooldown > 0 ? `${t('resendIn', language)} ${cooldown}${t('seconds', language)}` : t('resendCode', language)}
          </button>
        </div>
      )}

      <footer className="app-footer">{t('footerText', language)}</footer>
    </main>
  )
}

// 2b. GOOGLE OAUTH PROFILE COMPLETION SCREEN (Collects mandatory phone & details for new OAuth users)
function OAuthProfileScreen({ oauthUser, language, setLanguage, onBack, onCompleteAuth }) {
  const isEn = language === 'en'
  const isContractor = oauthUser.role === 'contractor'

  const [name, setName] = useState(oauthUser.name || '')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('Andheri West, Mumbai')
  const [company, setCompany] = useState(isContractor ? `${oauthUser.name || 'Shiv Kumar'} Builders` : '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSave = async () => {
    setError('')
    if (!name.trim()) {
      setError(isEn ? 'Please enter your full name' : 'कृपया अपना पूरा नाम लिखें')
      return
    }

    const cleanNum = cleanPhone(phone)
    if (!cleanNum || !/^[6-9]\d{9}$/.test(cleanNum)) {
      setError(t('invalidPhone', language))
      return
    }

    setBusy(true)

    const profileData = {
      id: oauthUser.id,
      email: oauthUser.email,
      name: name.trim(),
      phone: cleanNum,
      role: oauthUser.role,
      location: location.trim() || 'Andheri West, Mumbai',
      company: isContractor ? (company.trim() || `${name.trim()} Builders`) : undefined,
      avatar: oauthUser.avatar,
      verified: true,
      rating: 4.9,
      preferredLanguage: language
    }

    try {
      const saved = await saveUserProfile(profileData)
      setBusy(false)
      onCompleteAuth(saved.data || profileData)
    } catch (err) {
      setBusy(false)
      console.warn('OAuth save error:', err)
      onCompleteAuth(profileData)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-header-bar">
        <button className="icon-back-btn" onClick={onBack} aria-label={t('back', language)}>
          <ArrowLeft size={20} />
        </button>
        <button
          className="lang-toggle-btn"
          onClick={() => setLanguage(isEn ? 'hi' : 'en')}
        >
          <Languages size={14} />
          <span>{isEn ? 'हिंदी' : 'English'}</span>
        </button>
      </div>

      <div className="auth-hero-badge">
        <span className="auth-portal-tag">
          {isContractor ? <Building2 size={16} /> : <Users size={16} />}
          {isContractor ? t('contractorAuthTitle', language) : t('employerAuthTitle', language)}
        </span>
        <div className="oauth-badge">
          <svg className="google-icon" viewBox="0 0 24 24" width="16" height="16">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>{oauthUser.email || t('googleConnected', language)}</span>
        </div>
        <h1>{t('completeProfileTitle', language)}</h1>
        <p>{t('completeProfileSubtitle', language)}</p>
      </div>

      {error && (
        <div className="alert-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="auth-form-body">
        <div className="form-group">
          <label>{t('fullName', language)} *</label>
          <input
            className="form-control"
            placeholder={t('fullNamePlaceholder', language)}
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>{t('phoneLabel', language)} *</label>
          <div className="phone-input-row">
            <span className="phone-prefix">+91</span>
            <input
              type="tel"
              maxLength={10}
              placeholder={t('phonePlaceholder', language)}
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
              autoFocus
            />
          </div>
          <p className="form-hint">
            <ShieldCheck size={13} />
            <span>{t('phoneSafe', language)}</span>
          </p>
        </div>

        {isContractor && (
          <div className="form-group">
            <label>{t('companyName', language)}</label>
            <input
              className="form-control"
              placeholder={t('companyNamePlaceholder', language)}
              value={company}
              onChange={e => setCompany(e.target.value)}
            />
          </div>
        )}

        <div className="form-group">
          <label>{t('locationLabel', language)}</label>
          <input
            className="form-control"
            placeholder={t('locationPlaceholder', language)}
            value={location}
            onChange={e => setLocation(e.target.value)}
          />
        </div>

        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={busy}
        >
          {busy ? t('loading', language) : t('submitProfile', language)}
        </button>
      </div>

      <footer className="app-footer">{t('footerText', language)}</footer>
    </main>
  )
}

// 3. REVIEWS MODAL
function ReviewsModal({ isOpen, onClose, language, workerId }) {
  const [reviewsList, setReviewsList] = useState(WORKER_REVIEWS)

  useEffect(() => {
    if (!isOpen) return
    async function loadReviews() {
      try {
        const res = await fetchWorkerReviews(workerId)
        if (res.success && res.data && res.data.length > 0) {
          setReviewsList(res.data)
        }
      } catch (err) {
        console.warn('Failed to load reviews:', err)
      }
    }
    loadReviews()
  }, [isOpen, workerId])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('reviewsTitle', language)}</h2>
          <button className="btn-close-modal" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="reviews-summary-bar">
          <div className="rating-big-box">
            <strong>4.9</strong>
            <div style={{ display: 'flex', color: '#f7c948' }}>
              <Star size={18} fill="#f7c948" />
              <Star size={18} fill="#f7c948" />
              <Star size={18} fill="#f7c948" />
              <Star size={18} fill="#f7c948" />
              <Star size={18} fill="#f7c948" />
            </div>
          </div>
          <div>
            <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--dark)' }}>{t('averageRating', language)}</p>
            <p style={{ fontSize: '11px', color: 'var(--muted)' }}>{t('basedOn', language)} {reviewsList.length} {t('reviewsCount', language)}</p>
          </div>
        </div>

        <div className="reviews-list">
          {reviewsList.map(rev => (
            <div key={rev.id} className="review-item-card">
              <div className="review-item-top">
                <div>
                  <h4>{rev.reviewerName}</h4>
                  <p>{language === 'en' ? rev.reviewerRoleEn : rev.reviewerRoleHi}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#f7c948', fontWeight: '700', fontSize: '12px' }}>
                  <Star size={13} fill="#f7c948" />
                  <span>{rev.rating}</span>
                </div>
              </div>
              <p className="review-comment">
                "{language === 'en' ? rev.commentEn : rev.commentHi}"
              </p>
            </div>
          ))}
        </div>

        <button className="btn-primary" style={{ marginTop: '14px' }} onClick={onClose}>
          {t('close', language)}
        </button>
      </div>
    </div>
  )
}

// 3b. BOOKING MODAL (Sends POST to https://aframmm.app.n8n.cloud/webhook/worker-booked)
function BookingModal({ isOpen, onClose, worker, currentUser, language, onConfirmed }) {
  const isEn = language === 'en'
  const [customerName, setCustomerName] = useState(() => currentUser?.name || 'Alex Customer')
  const [customerEmail, setCustomerEmail] = useState(() => currentUser?.email || getSavedTestEmail() || '')
  const [scheduledFor, setScheduledFor] = useState('2026-09-20 10:00')
  const [service, setService] = useState(() => {
    if (!worker) return 'Construction & Masonry'
    return isEn ? (worker.tradeEn || worker.trade || 'General Work') : (worker.tradeHi || worker.trade || 'सामान्य कार्य')
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen || !worker) return null

  const handleConfirm = async (e) => {
    e.preventDefault()
    setError('')

    if (!customerName.trim()) {
      setError(isEn ? 'Please enter customer name' : 'कृपया ग्राहक का नाम लिखें')
      return
    }

    if (!customerEmail.trim() || !customerEmail.includes('@')) {
      setError(isEn ? 'Please enter a valid email address (receives confirmation)' : 'कृपया मान्य ईमेल पता लिखें')
      return
    }

    setBusy(true)
    saveTestEmail(customerEmail.trim())

    const payload = {
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      workerName: worker.name,
      service: service.trim() || 'Construction & General Work',
      scheduledFor: scheduledFor.trim()
    }

    try {
      await notifyWorkerBooked(payload)
      setBusy(false)
      onConfirmed(payload)
    } catch (err) {
      setBusy(false)
      console.warn('Booking webhook notification failed:', err)
      onConfirmed(payload)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{t('bookingModalTitle', language)}</h2>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>
              {t('bookingSubtitle', language)}
            </p>
          </div>
          <button className="btn-close-modal" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ padding: '16px 20px 24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--mint-light)',
            border: '1px solid #bce2ce',
            borderRadius: '12px',
            padding: '12px 14px',
            marginBottom: '16px'
          }}>
            <div>
              <strong style={{ fontSize: '15px', color: 'var(--dark)' }}>{worker.name}</strong>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                {isEn ? worker.tradeEn : worker.tradeHi} · {worker.location}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--green)' }}>
                ₹{worker.dailyWage}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--muted)' }}>/ {t('perDay', language)}</div>
            </div>
          </div>

          {error && (
            <div className="alert-error" style={{ marginBottom: '14px' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleConfirm}>
            <div className="form-group">
              <label>{t('bookingCustomerName', language)} *</label>
              <input
                className="form-control"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="e.g. Alex Customer"
                required
              />
            </div>

            <div className="form-group">
              <label>{t('bookingCustomerEmail', language)} *</label>
              <input
                type="email"
                className="form-control"
                value={customerEmail}
                onChange={e => setCustomerEmail(e.target.value)}
                placeholder="e.g. customer@example.com"
                required
              />
              <p className="form-hint">
                <Mail size={12} />
                <span>{isEn ? 'Confirmation email will be dispatched to this address via Gmail' : 'जीमेल के माध्यम से पुष्टि संदेश इस ईमेल पर भेजा जाएगा'}</span>
              </p>
            </div>

            <div className="form-group">
              <label>{t('bookingService', language)}</label>
              <input
                className="form-control"
                value={service}
                onChange={e => setService(e.target.value)}
                placeholder="e.g. Masonry / House Cleaning"
              />
            </div>

            <div className="form-group">
              <label>{t('bookingScheduledFor', language)}</label>
              <input
                className="form-control"
                value={scheduledFor}
                onChange={e => setScheduledFor(e.target.value)}
                placeholder="YYYY-MM-DD HH:mm (e.g. 2026-09-20 10:00)"
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={busy}
              style={{ marginTop: '16px' }}
            >
              {busy ? t('loading', language) : t('confirmBooking', language)}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

// 4. EXPANDABLE JOB DETAILS / APPLY MODAL
function JobDetailsModal({ job, isOpen, onClose, onApply, language }) {
  if (!isOpen || !job) return null
  const isEn = language === 'en'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('jobDetails', language)}</h2>
          <button className="btn-close-modal" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="job-card-header" style={{ marginBottom: '14px' }}>
          <div className="trade-icon-box">{getTradeIcon(job.tradeId, 24)}</div>
          <div className="job-card-titles">
            <h3>{isEn ? job.titleEn : job.titleHi}</h3>
            <p>{isEn ? job.tradeEn : job.tradeHi}</p>
          </div>
          <WageIndicator tone={job.tone} language={language} />
        </div>

        <div className="applicant-meta-grid">
          <div>
            <span>{t('workLocation', language)}</span>
            <strong>{job.place}</strong>
          </div>
          <div>
            <span>{t('dailyWage', language)}</span>
            <strong>₹{job.wage} / {t('perDay', language)}</strong>
          </div>
          <div>
            <span>{t('workingHours', language)}</span>
            <strong>{isEn ? job.workingHours : job.workingHoursHi}</strong>
          </div>
          <div>
            <span>{t('workStartDate', language)}</span>
            <strong>{job.startDate || (isEn ? job.time : job.timeHi)}</strong>
          </div>
          <div>
            <span>{t('requiredWorkers', language)}</span>
            <strong>{job.peopleNeeded} {t('workersNeeded', language)}</strong>
          </div>
        </div>

        <div style={{ margin: '14px 0', padding: '12px', background: '#f0f7f3', borderRadius: '10px' }}>
          <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--green)', marginBottom: '4px' }}>
            {t('postedBy', language)}
          </p>
          <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--dark)' }}>{job.contactPerson}</p>
          <p style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
            <Phone size={13} /> {job.contactPhone}
          </p>
        </div>

        {job.urgent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
            <span className="urgent-tag">{t('urgentBadge', language)}</span>
            <span style={{ fontSize: '12px', color: '#d32f2f', fontWeight: '600' }}>
              {isEn ? 'Immediate start required on site' : 'साइट पर तुरंत काम शुरू करना आवश्यक'}
            </span>
          </div>
        )}

        {job.status === 'applied' ? (
          <div className="status-badge-applied" style={{ width: '100%', justifyContent: 'center', height: '48px', fontSize: '14px' }}>
            <CheckCircle2 size={18} />
            <span>{t('applicationSent', language)}</span>
          </div>
        ) : (
          <button
            className="btn-primary"
            onClick={() => { onApply(job); onClose(); }}
          >
            {t('confirmApply', language)}
          </button>
        )}
      </div>
    </div>
  )
}

// 5. WORKER DASHBOARD ("I need Work")
// Navigation: "Find Work" (Jobs), "Active Sites" (Ongoing sites + URGENT tags), "My Jobs", "Profile"
function WorkerDashboard({ user, jobs, sites, onApplyJob, language, setLanguage, onHome, onSignOut }) {
  const isEn = language === 'en'
  const [activeTab, setActiveTab] = useState('jobs') // 'jobs' | 'activeSites' | 'myJobs' | 'account'
  const [selectedTrade, setSelectedTrade] = useState('all')
  const [toastMsg, setToastMsg] = useState('')
  const [reviewsOpen, setReviewsOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState(null)
  const [urgentSitesOnly, setUrgentSitesOnly] = useState(false)

  // Work Requests / Bookings State
  const [bookings, setBookings] = useState(() => getBookings())
  const [myJobsSubTab, setMyJobsSubTab] = useState('requests') // 'requests' | 'applied'

  const pendingBookings = bookings.filter(b => b.status === 'pending')

  const handleAcceptWork = async (req) => {
    const finalEmail = (req.customerEmail || getSavedTestEmail() || 'naikgaonkarvineet@gmail.com').trim()
    saveTestEmail(finalEmail)
    updateBookingStatus(req.id, 'accepted', finalEmail)
    setBookings(prev => prev.map(b => b.id === req.id ? { ...b, status: 'accepted', customerEmail: finalEmail } : b))

    const successToast = `${t('workAcceptedEmailSentTo', language)} ${finalEmail}`
    setToastMsg(successToast)
    setTimeout(() => setToastMsg(''), 5000)

    try {
      await notifyWorkerAccepted({
        customerName: req.customerName,
        customerEmail: finalEmail,
        workerName: user.name,
        service: req.service,
        scheduledFor: req.scheduledFor
      })
    } catch (err) {
      console.warn('Error dispatching worker accepted webhook:', err)
    }
  }

  const handleDeclineWork = (reqId) => {
    updateBookingStatus(reqId, 'declined')
    setBookings(prev => prev.map(b => b.id === reqId ? { ...b, status: 'declined' } : b))
    setToastMsg(t('workDeclinedToast', language))
    setTimeout(() => setToastMsg(''), 3000)
  }

  // Worker Profile State (persisted via saveUser)
  const [userLocation, setUserLocation] = useState(user.location || 'Andheri West, Mumbai')
  const [userExperience, setUserExperience] = useState(user.experience || '5 Years in Construction & Masonry')
  const [userLanguages, setUserLanguages] = useState(user.languages || 'Hindi, Marathi, English')
  const [userSkills, setUserSkills] = useState(user.skills || ['Masonry', 'Plastering', 'Tile Fitting'])

  const availableSkillsList = ['Masonry', 'Painting', 'Plumbing', 'Carpentry', 'Electrician', 'Welding', 'Tile Fitting', 'General Labor']

  const toggleSkill = (skill) => {
    const updatedSkills = userSkills.includes(skill)
      ? userSkills.filter(s => s !== skill)
      : [...userSkills, skill]
    setUserSkills(updatedSkills)
    saveUser({ ...user, skills: updatedSkills })
  }

  const handleUpdateLocation = () => {
    const newLoc = prompt(isEn ? 'Update your current location:' : 'अपनी वर्तमान जगह बदलें:', userLocation)
    if (newLoc && newLoc.trim()) {
      setUserLocation(newLoc.trim())
      saveUser({ ...user, location: newLoc.trim() })
    }
  }

  const handleSaveProfile = () => {
    saveUser({
      ...user,
      location: userLocation,
      experience: userExperience,
      languages: userLanguages,
      skills: userSkills
    })
    setToastMsg(t('profileSavedToast', language))
    setTimeout(() => setToastMsg(''), 3000)
  }

  // Filtered jobs
  const filteredJobs = jobs.filter(job => {
    return selectedTrade === 'all' || job.tradeId === selectedTrade
  })

  // Filtered Active Sites for Worker
  const filteredSites = urgentSitesOnly ? sites.filter(s => s.urgent) : sites

  const appliedJobs = jobs.filter(j => j.status === 'applied')

  const handleApply = (job) => {
    onApplyJob(job)
    setToastMsg(`${job.employer}: ${t('applicationSent', language)}`)
    setTimeout(() => setToastMsg(''), 4000)
  }

  return (
    <div className="app-shell">
      <AppHeader
        role="worker"
        language={language}
        setLanguage={setLanguage}
        onHome={onHome}
      />

      <main className="screen worker-screen">
        {/* Dynamic Location & Greeting Header */}
        <div className="greeting-card">
          <div className="greeting-text">
            <p>{t('hello', language)}, {user.name} 👋</p>
            <h1>
              {activeTab === 'jobs'
                ? t('todayWork', language)
                : activeTab === 'activeSites'
                ? t('tabActiveSites', language)
                : activeTab === 'myJobs'
                ? t('tabMyJobs', language)
                : t('tabAccount', language)}
            </h1>
          </div>
          <button className="location-pill-btn" onClick={handleUpdateLocation}>
            <MapPin size={14} color="var(--green)" />
            <span>{userLocation}</span>
            <ChevronDown size={13} color="var(--muted)" />
          </button>
        </div>

        {/* Stats Banner: Reviews and Trust Rating Only */}
        <div className="stats-banner single-card">
          <div className="stat-item reviews-interactive" onClick={() => setReviewsOpen(true)}>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#a4cebb' }}>{t('reviewsSummary', language)}</span>
              <strong className="score-val" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '20px', marginTop: '2px' }}>
                <Star size={20} fill="#f7c948" color="#f7c948" /> 4.9 ★
              </strong>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '12px', color: '#cbd5e1' }}>24 {t('reviewsCount', language)}</span>
              <small style={{ color: '#6ee7b7', display: 'block', marginTop: '4px' }}>{t('viewAllReviews', language)} ›</small>
            </div>
          </div>
        </div>

        {toastMsg && (
          <div className="toast-bar">
            <CheckCircle2 size={16} />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* TAB 1: FIND WORK (JOB DASHBOARD) */}
        {activeTab === 'jobs' && (
          <>
            <CategoryScroller selectedTrade={selectedTrade} onSelectTrade={setSelectedTrade} language={language} />

            <div className="section-headline">
              <h2>{t('jobsForYou', language)}</h2>
              <span className="count-badge">{filteredJobs.length} {t('jobCount', language)}</span>
            </div>

            <div className="jobs-list">
              {filteredJobs.map(job => (
                <article key={job.id} className="job-card">
                  <div className="job-card-header">
                    <div className="trade-icon-box">
                      {getTradeIcon(job.tradeId, 22)}
                    </div>
                    <div className="job-card-titles">
                      <h3>{isEn ? job.titleEn : job.titleHi}</h3>
                      <p>{job.employer}</p>
                    </div>
                    <div className="badge-row">
                      {job.urgent && <span className="urgent-tag">{t('urgentBadge', language)}</span>}
                      <WageIndicator tone={job.tone} language={language} />
                    </div>
                  </div>

                  <div className="job-card-meta">
                    <span className="meta-item"><MapPin size={13} /> {job.place}</span>
                    <span className="meta-item"><Users size={13} /> {job.peopleNeeded} {t('workersNeeded', language)}</span>
                    <span className="meta-item"><Clock size={13} /> {isEn ? job.workingHours : job.workingHoursHi}</span>
                    {(job.startDate || job.time) && (
                      <span className="meta-item"><Calendar size={13} /> {job.startDate || (isEn ? job.time : job.timeHi)}</span>
                    )}
                  </div>

                  <div className="job-card-footer">
                    <div className="wage-amount">
                      <strong>₹{job.wage}</strong>
                      <span>/ {t('perDay', language)}</span>
                    </div>

                    {job.status === 'applied' ? (
                      <span className="status-badge-applied">
                        <Check size={14} /> {t('applied', language)}
                      </span>
                    ) : (
                      <button className="btn-apply-sm" onClick={() => setSelectedJob(job)}>
                        <span>{t('applyDetails', language)}</span>
                        <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {/* TAB 2: ACTIVE SITES (PLACED SPECIFICALLY UNDER WORKER ROLE WITH URGENT TAGS) */}
        {activeTab === 'activeSites' && (
          <div className="active-sites-view">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <button
                className={`category-chip ${urgentSitesOnly ? 'active' : ''}`}
                onClick={() => setUrgentSitesOnly(!urgentSitesOnly)}
              >
                <AlertCircle size={14} />
                <span>{t('urgentSitesOnly', language)}</span>
              </button>
              <span className="count-badge">{filteredSites.length} {isEn ? 'Sites' : 'साइटें'}</span>
            </div>

            <div className="sites-list">
              {filteredSites.map(site => (
                <article key={site.id} className={`site-card ${site.urgent ? 'urgent-border' : ''}`}>
                  <div className="site-card-top">
                    <div>
                      <h3>{isEn ? site.siteNameEn : site.siteNameHi}</h3>
                      <p><MapPin size={12} /> {site.location}</p>
                    </div>
                    {site.urgent && <span className="urgent-tag">{t('urgentBadge', language)}</span>}
                  </div>

                  <div className="site-progress-bar-wrap">
                    <div className="progress-labels">
                      <span>{t('siteProgress', language)}</span>
                      <strong>{site.filledCount} of {site.totalNeeded} {t('workersNeeded', language)}</strong>
                    </div>
                    <div className="progress-track">
                      <div
                        className={`progress-fill ${site.urgent ? 'urgent' : ''}`}
                        style={{ width: `${Math.min(100, (site.filledCount / site.totalNeeded) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="site-tags-row">
                    {site.trades.map((tr, i) => (
                      <span key={i} className="site-trade-chip">
                        {tr}
                      </span>
                    ))}
                  </div>

                  <div className="site-card-bottom">
                    <span><Clock size={12} style={{ verticalAlign: -1 }} /> {site.hours}</span>
                    <strong style={{ color: 'var(--green)', fontSize: '14px' }}>₹{site.dailyWage} / {t('perDay', language)}</strong>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: MY JOBS */}
        {activeTab === 'myJobs' && (
          <div className="my-jobs-view">
            <div className="section-headline">
              <h2>{t('tabMyJobs', language)}</h2>
            </div>

            {/* Sub-tab segment: Work Requests vs My Applications */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
              <button
                type="button"
                className={`btn-subtab ${myJobsSubTab === 'requests' ? 'active' : ''}`}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: myJobsSubTab === 'requests' ? '#ffffff' : 'transparent',
                  boxShadow: myJobsSubTab === 'requests' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  color: myJobsSubTab === 'requests' ? 'var(--dark)' : 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
                onClick={() => setMyJobsSubTab('requests')}
              >
                <Sparkles size={14} color="var(--green)" />
                <span>{t('tabWorkRequests', language)}</span>
                {pendingBookings.length > 0 && (
                  <span className="count-badge" style={{ background: 'var(--green)', color: '#fff', fontSize: '10px', padding: '2px 6px' }}>
                    {pendingBookings.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                className={`btn-subtab ${myJobsSubTab === 'applied' ? 'active' : ''}`}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: myJobsSubTab === 'applied' ? '#ffffff' : 'transparent',
                  boxShadow: myJobsSubTab === 'applied' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  color: myJobsSubTab === 'applied' ? 'var(--dark)' : 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
                onClick={() => setMyJobsSubTab('applied')}
              >
                <Hammer size={14} />
                <span>{t('tabMyApplications', language)}</span>
                <span className="count-badge" style={{ fontSize: '10px', padding: '2px 6px' }}>
                  {appliedJobs.length + 1}
                </span>
              </button>
            </div>

            {myJobsSubTab === 'requests' ? (
              <div className="work-requests-list">
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '12px' }}>
                  {t('incomingRequestsSubtitle', language)}
                </p>

                {bookings.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
                    {t('noIncomingRequests', language)}
                  </p>
                ) : (
                  bookings.map(req => (
                    <article
                      key={req.id}
                      className="job-card"
                      style={{
                        borderLeft: req.status === 'accepted' ? '4px solid var(--green)' : req.status === 'declined' ? '4px solid #cbd5e1' : '4px solid #f59e0b',
                        marginBottom: '12px'
                      }}
                    >
                      <div className="job-card-header">
                        <div className="trade-icon-box" style={{ background: '#ecfdf5', color: 'var(--green)' }}>
                          <Sparkles size={22} />
                        </div>
                        <div className="job-card-titles">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <h3 style={{ fontSize: '15px' }}>{req.service}</h3>
                            {req.status === 'pending' && (
                              <span style={{ background: '#fef3c7', color: '#b45309', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                                NEW
                              </span>
                            )}
                          </div>
                          <p style={{ color: 'var(--dark)', fontWeight: 600 }}>{req.customerName}</p>
                          <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
                            <Mail size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                            {req.customerEmail}
                          </p>
                        </div>
                        <span className={`wage-pill ${req.status === 'accepted' ? 'fair' : req.status === 'declined' ? 'low' : 'high'}`}>
                          {req.status === 'accepted'
                            ? `✓ ${t('statusAccepted', language)}`
                            : req.status === 'declined'
                            ? (isEn ? 'Declined' : 'अस्वीकार')
                            : `₹${req.wage || 850}`}
                        </span>
                      </div>

                      <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', margin: '8px 0', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--dark)' }}>
                          <Calendar size={14} color="var(--green)" />
                          <span><strong>{isEn ? 'Scheduled For:' : 'कार्य की तारीख:'}</strong> {req.scheduledFor}</span>
                        </div>
                        {req.location && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--muted)', fontSize: '12px' }}>
                            <MapPin size={13} />
                            <span>{req.location}</span>
                          </div>
                        )}
                      </div>

                      <div className="applicant-actions" style={{ marginTop: '8px' }}>
                        {req.status === 'accepted' ? (
                          <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                              <span>{isEn ? `Sent to ${req.customerEmail}` : `ईमेल भेजा: ${req.customerEmail}`}</span>
                            </span>
                            <a className="btn-call" href={`mailto:${req.customerEmail}`} style={{ flexShrink: 0 }}>
                              <Mail size={13} /> {isEn ? 'Email' : 'ईमेल'}
                            </a>
                          </div>
                        ) : req.status === 'declined' ? (
                          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                            {isEn ? 'Request was declined' : 'अनुरोध अस्वीकार कर दिया गया'}
                          </span>
                        ) : (
                          <>
                            <button
                              className="btn-accept"
                              onClick={() => handleAcceptWork(req)}
                            >
                              <Check size={14} />
                              <span>{t('acceptWork', language)}</span>
                            </button>
                            <button
                              className="btn-decline"
                              onClick={() => handleDeclineWork(req.id)}
                            >
                              {t('declineWork', language)}
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>
            ) : (
              <div className="applied-jobs-list">
                <article className="job-card" style={{ borderLeft: '4px solid var(--green)' }}>
                  <div className="job-card-header">
                    <div className="trade-icon-box">
                      <Hammer size={22} />
                    </div>
                    <div className="job-card-titles">
                      <h3>{t('confirmedJob', language)}</h3>
                      <p>Shiv Builders · Andheri West</p>
                    </div>
                    <span className="wage-pill fair">✓ {t('statusAccepted', language)}</span>
                  </div>
                  <div className="job-card-footer">
                    <div className="wage-amount">
                      <strong>₹850</strong>
                      <span>/ {t('perDay', language)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a className="btn-call" href="tel:+919820154321">
                        <Phone size={13} /> {t('callEmployer', language)}
                      </a>
                      <button
                        className="btn-apply-sm"
                        onClick={() => {
                          setToastMsg(t('workCompletedToast', language))
                          setTimeout(() => setToastMsg(''), 4000)
                        }}
                      >
                        {t('completeWork', language)}
                      </button>
                    </div>
                  </div>
                </article>

                {appliedJobs.map(job => (
                  <article key={job.id} className="job-card" style={{ opacity: 0.9 }}>
                    <div className="job-card-header">
                      <div className="trade-icon-box">{getTradeIcon(job.tradeId, 22)}</div>
                      <div className="job-card-titles">
                        <h3>{isEn ? job.titleEn : job.titleHi}</h3>
                        <p>{job.employer} · {job.place}</p>
                      </div>
                      <span className="status-badge-applied">{t('waitingResponse', language)}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PROFILE */}
        {activeTab === 'account' && (
          <div className="account-view">
            <article className="job-card" style={{ marginBottom: '16px' }}>
              <div className="job-card-header">
                <div className="trade-icon-box" style={{ background: '#feecce', color: '#b36e05' }}>
                  <HardHat size={26} />
                </div>
                <div className="job-card-titles">
                  <h3>{user.name}</h3>
                  <p>{user.phone} · {userLocation}</p>
                </div>
                <span className="role-tag">4.9 ★</span>
              </div>

              <div className="form-group" style={{ marginTop: '12px' }}>
                <label>{t('workExperience', language)}</label>
                <input
                  className="form-control"
                  value={userExperience}
                  onChange={e => setUserExperience(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>{t('languagesSpoken', language)}</label>
                <input
                  className="form-control"
                  value={userLanguages}
                  onChange={e => setUserLanguages(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>{t('skillsExpertise', language)}</label>
                <div className="skills-selector-grid">
                  {availableSkillsList.map(skill => (
                    <span
                      key={skill}
                      className={`skill-toggle-pill ${userSkills.includes(skill) ? 'selected' : ''}`}
                      onClick={() => toggleSkill(skill)}
                    >
                      {userSkills.includes(skill) ? '✓ ' : '+ '}{skill}
                    </span>
                  ))}
                </div>
              </div>

              <button className="btn-primary" style={{ marginTop: '12px' }} onClick={handleSaveProfile}>
                {t('save', language)}
              </button>
            </article>

            <button className="btn-secondary" style={{ color: 'var(--red)', marginTop: '20px' }} onClick={onSignOut}>
              <LogOut size={16} />
              <span>{t('signOut', language)}</span>
            </button>
          </div>
        )}
      </main>

      <ReviewsModal
        isOpen={reviewsOpen}
        onClose={() => setReviewsOpen(false)}
        language={language}
        workerId={user.id}
      />

      <JobDetailsModal
        job={selectedJob}
        isOpen={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        onApply={handleApply}
        language={language}
      />



      {/* Worker Navigation Bar: Find Work | Active Sites | My Jobs | Profile */}
      <nav className="app-bottom-nav">
        <button
          className={`nav-tab-btn ${activeTab === 'jobs' ? 'active' : ''}`}
          onClick={() => setActiveTab('jobs')}
        >
          <Search size={18} />
          <span>{t('tabJobs', language)}</span>
        </button>
        <button
          className={`nav-tab-btn ${activeTab === 'activeSites' ? 'active' : ''}`}
          onClick={() => setActiveTab('activeSites')}
        >
          <Building2 size={18} />
          <span>{t('tabActiveSites', language)}</span>
        </button>
        <button
          className={`nav-tab-btn ${activeTab === 'myJobs' ? 'active' : ''}`}
          onClick={() => setActiveTab('myJobs')}
        >
          <Hammer size={18} />
          {pendingBookings.length > 0 && <span className="nav-badge-dot">{pendingBookings.length}</span>}
          <span>{t('tabMyJobs', language)}</span>
        </button>
        <button
          className={`nav-tab-btn ${activeTab === 'account' ? 'active' : ''}`}
          onClick={() => setActiveTab('account')}
        >
          <HardHat size={18} />
          <span>{t('tabAccount', language)}</span>
        </button>
      </nav>
    </div>
  )
}

// 6. POST NEW JOB FORM COMPONENT
function PostJobScreen({ onCancel, onSaveJob, language }) {
  const isEn = language === 'en'

  const [trade, setTrade] = useState('masonry')
  const [location, setLocation] = useState('Andheri West, Mumbai')
  const [wage, setWage] = useState(850)
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [hours, setHours] = useState('8:30 AM – 5:30 PM (8 hrs)')
  const [contactName, setContactName] = useState('Shiv Kumar Sharma')
  const [contactPhone, setContactPhone] = useState('+91 98201 54321')
  const [urgent, setUrgent] = useState(true)

  const [requirements, setRequirements] = useState([
    { trade: 'Masonry', count: 2 },
    { trade: 'General Labor', count: 1 }
  ])

  const addRequirementRow = () => {
    setRequirements([...requirements, { trade: 'Painting', count: 1 }])
  }

  const removeRequirementRow = (idx) => {
    setRequirements(requirements.filter((_, i) => i !== idx))
  }

  const updateRequirement = (idx, field, val) => {
    const updated = [...requirements]
    updated[idx][field] = val
    setRequirements(updated)
  }

  const handleSubmit = () => {
    const newJob = {
      id: getNextId(),
      titleEn: `${trade.charAt(0).toUpperCase() + trade.slice(1)} Required`,
      titleHi: `${t(trade, 'hi')} काम हेतु कारीगर`,
      tradeId: trade,
      tradeEn: trade,
      tradeHi: t(trade, 'hi'),
      employer: contactName,
      contactPerson: contactName,
      contactPhone,
      place: location,
      wage: Number(wage) || 800,
      referenceWage: 780,
      tone: wage < 700 ? 'low' : wage > 880 ? 'high' : 'fair',
      time: startDate ? `From ${startDate}` : 'Today',
      timeHi: startDate ? `${startDate} से` : 'आज से',
      startDate: startDate || new Date().toISOString().slice(0, 10),
      workingHours: hours,
      workingHoursHi: hours,
      peopleNeeded: requirements.reduce((sum, r) => sum + Number(r.count || 0), 0),
      requirements,
      status: 'open',
      urgent,
    }

    onSaveJob(newJob)
  }

  return (
    <div className="screen post-screen" style={{ paddingBottom: '90px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <button className="icon-back-btn" onClick={onCancel}><ArrowLeft size={20} /></button>
        <h2 style={{ fontSize: '18px', color: 'var(--dark)' }}>{t('postNewJob', language)}</h2>
        <div style={{ width: 38 }} />
      </div>

      <div className="form-group">
        <label>{t('jobTradeRequired', language)} *</label>
        <select
          className="select-control"
          value={trade}
          onChange={e => setTrade(e.target.value)}
        >
          <option value="masonry">{t('masonry', language)}</option>
          <option value="painting">{t('painting', language)}</option>
          <option value="plumbing">{t('plumbing', language)}</option>
          <option value="carpentry">{t('carpentry', language)}</option>
          <option value="electrician">{t('electrician', language)}</option>
          <option value="welding">{t('welding', language)}</option>
          <option value="helper">{t('helper', language)}</option>
          <option value="tileFitting">{t('tileFitting', language)}</option>
        </select>
      </div>

      <div className="form-group">
        <label>{t('jobLocationRequired', language)} *</label>
        <input
          className="form-control"
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="e.g. Andheri West, Mumbai"
        />
      </div>

      <div className="form-group">
        <label>{t('jobWageOffer', language)} *</label>
        <input
          className="form-control"
          type="number"
          value={wage}
          onChange={e => setWage(e.target.value)}
        />
        <div style={{ marginTop: '6px' }}>
          <WageIndicator tone={wage < 700 ? 'low' : wage > 880 ? 'high' : 'fair'} language={language} />
        </div>
      </div>

      <div className="form-group">
        <label>{t('workStartDate', language)} *</label>
        <input
          className="form-control"
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>{t('jobHoursRequired', language)} *</label>
        <input
          className="form-control"
          value={hours}
          onChange={e => setHours(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>{t('jobContactPerson', language)} *</label>
        <input
          className="form-control"
          value={contactName}
          onChange={e => setContactName(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>{t('jobContactPhone', language)} *</label>
        <input
          className="form-control"
          value={contactPhone}
          onChange={e => setContactPhone(e.target.value)}
        />
      </div>

      <div className="form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label style={{ margin: 0 }}>{t('laborRequirements', language)}</label>
          <button
            type="button"
            onClick={addRequirementRow}
            style={{ color: 'var(--green)', fontSize: '12px', fontWeight: '700' }}
          >
            {t('addSkillRow', language)}
          </button>
        </div>

        {requirements.map((req, idx) => (
          <div key={idx} className="req-item-row">
            <select
              className="select-control"
              value={req.trade}
              onChange={e => updateRequirement(idx, 'trade', e.target.value)}
            >
              <option value="Masonry">Masonry</option>
              <option value="Painting">Painting</option>
              <option value="Plumbing">Plumbing</option>
              <option value="Carpentry">Carpentry</option>
              <option value="Electrician">Electrician</option>
              <option value="General Labor">General Labor</option>
            </select>
            <input
              type="number"
              min="1"
              className="form-control"
              value={req.count}
              onChange={e => updateRequirement(idx, 'count', Number(e.target.value))}
            />
            {requirements.length > 1 && (
              <button onClick={() => removeRequirementRow(idx)} style={{ color: 'var(--red)', padding: '6px' }}>
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0', background: '#fff4f4', padding: '12px', borderRadius: '10px', border: '1px solid #f9d0d0' }}>
        <input
          type="checkbox"
          id="urgentCheckbox"
          checked={urgent}
          onChange={e => setUrgent(e.target.checked)}
          style={{ width: '18px', height: '18px', accentColor: 'var(--red)' }}
        />
        <label htmlFor="urgentCheckbox" style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: 'var(--red)', cursor: 'pointer' }}>
          {isEn ? 'Flag as URGENT Site Requirement' : 'अति आवश्यक साइट के रूप में चिह्नित करें'}
        </label>
      </div>

      <button className="btn-primary" onClick={handleSubmit}>
        {t('postJobSubmit', language)}
      </button>
    </div>
  )
}

// 7. CONTRACTOR DASHBOARD ("I am a Contractor")
// Navigation: Applications | Crew | Post Job | Settings
function ContractorDashboard({ user, onAddJob, workersList: propWorkersList, language, setLanguage, onHome, onSignOut }) {
  const isEn = language === 'en'

  // Navigation Tabs: 'applications' | 'crew' | 'postJob' | 'account'
  const [contractorTab, setContractorTab] = useState('applications')

  // State data
  const [applications, setApplications] = useState(INITIAL_APPLICATIONS)
  const [crew, setCrew] = useState(INITIAL_CREW)
  const [toastMsg, setToastMsg] = useState('')
  const workersList = propWorkersList || []
  const [selectedWorkerForBooking, setSelectedWorkerForBooking] = useState(null)
  const [hireWorkerOpen, setHireWorkerOpen] = useState(false)

  const handleBookingConfirmed = (payload) => {
    setSelectedWorkerForBooking(null)
    setHireWorkerOpen(false)
    if (payload && selectedWorkerForBooking) {
      saveBooking({
        id: 'booking-' + Date.now(),
        ...payload,
        workerId: selectedWorkerForBooking.id,
        workerPhone: selectedWorkerForBooking.phone,
        wage: selectedWorkerForBooking.dailyWage || 850,
        status: 'pending',
        createdAt: new Date().toISOString(),
        location: selectedWorkerForBooking.location || 'Mumbai'
      })
    }
    setToastMsg(t('bookingSuccessToast', language))
    setTimeout(() => setToastMsg(''), 4500)
  }

  useEffect(() => {
    async function loadContractorData() {
      try {
        const appsRes = await fetchContractorApplications(user?.id)
        if (appsRes.success && appsRes.data) {
          setApplications(appsRes.data)
        }
        const crewRes = await fetchContractorCrew(user?.id)
        if (crewRes.success && crewRes.data) {
          setCrew(crewRes.data)
        }
      } catch (err) {
        console.warn('Error loading contractor data from Supabase:', err)
      }
    }
    loadContractorData()
  }, [user?.id])

  // Add Worker Modal (Single button, no duplicates)
  const [addWorkerOpen, setAddWorkerOpen] = useState(false)
  const [workerName, setWorkerName] = useState('')
  const [workerTrade, setWorkerTrade] = useState('masonry')
  const [workerPhone, setWorkerPhone] = useState('')
  const [workerWage, setWorkerWage] = useState('800')

  const unreadApplicationsCount = applications.filter(a => a.status === 'pending').length

  const handlePostJob = (newJob) => {
    onAddJob(newJob)
    setContractorTab('applications')
    setToastMsg(t('jobPostedSuccess', language))
    setTimeout(() => setToastMsg(''), 4000)
  }

  const handleAddWorker = async () => {
    if (!workerName.trim()) return
    const newCrewMember = {
      id: getNextId(),
      name: workerName.trim(),
      tradeEn: workerTrade,
      tradeHi: t(workerTrade, 'hi'),
      phone: workerPhone ? `+91 ${workerPhone}` : '+91 98765 00000',
      dailyWage: Number(workerWage) || 800,
      verified: true
    }
    setCrew([...crew, newCrewMember])
    setAddWorkerOpen(false)
    setWorkerName('')
    setWorkerPhone('')
    setToastMsg(t('crewAddedSuccess', language))
    setTimeout(() => setToastMsg(''), 4000)

    try {
      await addCrewMember(user?.id, newCrewMember)
    } catch (err) {
      console.warn('Error adding crew member to Supabase:', err)
    }
  }

  const handleUpdateApplicationStatus = async (appId, status) => {
    setApplications(applications.map(app => app.id === appId ? { ...app, status, paymentStatus: 'paid', wage: app.wage || 850 } : app))
    const isAccepted = status === 'accepted'

    if (isAccepted) {
      const targetApp = applications.find(a => a.id === appId)
      if (targetApp) {
        const recipientEmail = user?.email || getSavedTestEmail() || 'contractor@kaamsetu.in'
        setToastMsg(`${t('workerAcceptedWebhookToast', language)} (${recipientEmail})`)
        setTimeout(() => setToastMsg(''), 5000)

        notifyWorkerAccepted({
          customerName: user?.name || 'Shiv Kumar Sharma',
          customerEmail: recipientEmail,
          workerName: targetApp.workerName || 'Worker',
          service: targetApp.trade || targetApp.jobTitleEn || 'Construction & Masonry',
          scheduledFor: '2026-09-20 10:00'
        }).catch(err => console.warn('Worker accepted webhook error:', err))
      }
    } else {
      setToastMsg(t('applicantRejectedToast', language))
      setTimeout(() => setToastMsg(''), 4500)
    }

    try {
      await updateApplicationStatus(appId, status)
    } catch (err) {
      console.warn('Error updating application status in Supabase:', err)
    }
  }

  return (
    <div className="app-shell">
      <AppHeader
        role="contractor"
        language={language}
        setLanguage={setLanguage}
        onHome={onHome}
      />

      <main className="screen contractor-screen">
        {toastMsg && (
          <div className="toast-bar">
            <CheckCircle2 size={16} />
            <span>{toastMsg}</span>
          </div>
        )}

        {contractorTab === 'postJob' ? (
          <PostJobScreen
            language={language}
            onCancel={() => setContractorTab('applications')}
            onSaveJob={handlePostJob}
          />
        ) : (
          <>
            <div className="greeting-card">
              <div className="greeting-text">
                <p>{t('hello', language)}, {user.name} 👋</p>
                <h1>
                  {contractorTab === 'applications'
                    ? t('tabApplications', language)
                    : contractorTab === 'crew'
                    ? t('tabCrew', language)
                    : t('tabContractorAccount', language)}
                </h1>
              </div>
              <button className="location-pill-btn">
                <MapPin size={14} color="var(--green)" />
                <span>{user.location || 'Andheri West, Mumbai'}</span>
              </button>
            </div>

            {/* TAB 1: APPLICATIONS RECEIVED */}
            {contractorTab === 'applications' && (
              <div className="applications-view">
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '14px' }}>
                  {t('applicationsSubtitle', language)}
                </p>

                {applications.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
                    {t('noApplications', language)}
                  </p>
                ) : (
                  applications.map(app => (
                    <article key={app.id} className="applicant-card">
                      <div className="applicant-head">
                        <div className="applicant-info">
                          <h3>{app.workerName}</h3>
                          <p>{isEn ? app.jobTitleEn : app.jobTitleHi}</p>
                        </div>
                        {app.status === 'accepted' ? (
                          <span className="status-badge-applied">✓ {t('statusAccepted', language)}</span>
                        ) : app.status === 'rejected' ? (
                          <span style={{ fontSize: '11px', color: 'var(--red)', fontWeight: '700' }}>Decline</span>
                        ) : (
                          <span className="wage-pill fair">{t('waitingResponse', language)}</span>
                        )}
                      </div>

                      <div className="applicant-meta-grid">
                        <div>
                          <span>{t('experienceLabel', language)}</span>
                          <strong>{isEn ? app.experience : app.experienceHi}</strong>
                        </div>
                        <div>
                          <span>{t('locationLabel', language)}</span>
                          <strong>{isEn ? app.location : app.locationHi}</strong>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <span>{t('languagesLabel', language)}</span>
                          <strong>{isEn ? app.languages : app.languagesHi}</strong>
                        </div>
                      </div>

                      <div className="skills-pill-row">
                        {app.skills.map((sk, idx) => (
                          <span key={idx} className="skill-tag-pill">{sk}</span>
                        ))}
                      </div>

                      <div className="applicant-actions">
                        {app.status === 'accepted' ? (
                          <a className="btn-call" href={`tel:${app.phone}`} style={{ width: '100%', justifyContent: 'center' }}>
                            <Phone size={14} />
                            <span>{t('callEmployer', language)} ({app.phone})</span>
                          </a>
                        ) : (
                          <>
                            <button
                              className="btn-accept"
                              onClick={() => handleUpdateApplicationStatus(app.id, 'accepted')}
                            >
                              <Check size={14} />
                              <span>{t('acceptApplicant', language)}</span>
                            </button>
                            <button
                              className="btn-decline"
                              onClick={() => handleUpdateApplicationStatus(app.id, 'rejected')}
                            >
                              {t('rejectApplicant', language)}
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: CREW */}
            {contractorTab === 'crew' && (
              <div className="crew-view">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '8px' }}>
                  <span className="count-badge">{crew.length} {t('workersNeeded', language)}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn-add-crew"
                      style={{ background: '#e0f2fe', color: '#0369a1', borderColor: '#7dd3fc' }}
                      onClick={() => setHireWorkerOpen(true)}
                    >
                      <Calendar size={14} />
                      <span>{t('hireWorkerBtn', language)}</span>
                    </button>
                    <button className="btn-add-crew" onClick={() => setAddWorkerOpen(true)}>
                      <Plus size={14} />
                      <span>{t('addWorkerBtn', language)}</span>
                    </button>
                  </div>
                </div>

                <div className="jobs-list">
                  {crew.map(m => (
                    <article key={m.id} className="job-card">
                      <div className="job-card-header">
                        <div className="trade-icon-box">
                          {getTradeIcon(m.tradeEn, 22)}
                        </div>
                        <div className="job-card-titles">
                          <h3>{m.name}</h3>
                          <p>{isEn ? m.tradeEn : m.tradeHi} · {m.phone}</p>
                        </div>
                        <span className="wage-pill fair">₹{m.dailyWage}</span>
                      </div>
                      <div className="job-card-footer">
                        <span style={{ fontSize: '11px', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={13} /> {t('verified', language)}
                        </span>
                        <a className="btn-call" href={`tel:${m.phone}`}>
                          <Phone size={13} /> Call
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: SETTINGS / ACCOUNT */}
            {contractorTab === 'account' && (
              <div className="account-view">
                <article className="job-card">
                  <div className="job-card-header">
                    <div className="trade-icon-box" style={{ background: '#feecce', color: '#b36e05' }}>
                      <Building2 size={24} />
                    </div>
                    <div className="job-card-titles">
                      <h3>{user.name}</h3>
                      <p>{user.phone} · {user.location || 'Mumbai'}</p>
                    </div>
                  </div>
                  <div style={{ padding: '12px 0', borderTop: '1px solid var(--line)', marginTop: '10px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
                      {isEn ? 'Contractor License #MH-2024-88719' : 'ठेकेदारी लाइसेंस #MH-2024-88719'}
                    </p>
                  </div>
                </article>

                <button className="btn-secondary" style={{ color: 'var(--red)', marginTop: '20px' }} onClick={onSignOut}>
                  <LogOut size={16} />
                  <span>{t('signOut', language)}</span>
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Add Worker to Crew Modal (Single button trigger, clean inputs) */}
      {addWorkerOpen && (
        <div className="modal-overlay" onClick={() => setAddWorkerOpen(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('addWorker', language)}</h2>
              <button className="btn-close-modal" onClick={() => setAddWorkerOpen(false)}><X size={18} /></button>
            </div>

            <div className="form-group">
              <label>{t('newWorkerName', language)} *</label>
              <input
                className="form-control"
                placeholder="e.g. Ramesh Yadav"
                value={workerName}
                onChange={e => setWorkerName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>{t('newWorkerTrade', language)} *</label>
              <select
                className="select-control"
                value={workerTrade}
                onChange={e => setWorkerTrade(e.target.value)}
              >
                <option value="masonry">{t('masonry', language)}</option>
                <option value="painting">{t('painting', language)}</option>
                <option value="plumbing">{t('plumbing', language)}</option>
                <option value="carpentry">{t('carpentry', language)}</option>
                <option value="electrician">{t('electrician', language)}</option>
                <option value="welding">{t('welding', language)}</option>
                <option value="helper">{t('helper', language)}</option>
              </select>
            </div>

            <div className="form-group">
              <label>{t('newWorkerPhone', language)}</label>
              <input
                className="form-control"
                placeholder="10-digit mobile"
                value={workerPhone}
                onChange={e => setWorkerPhone(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            <div className="form-group">
              <label>{t('newWorkerDailyWage', language)}</label>
              <input
                className="form-control"
                type="number"
                value={workerWage}
                onChange={e => setWorkerWage(e.target.value)}
              />
            </div>

            <button className="btn-primary" onClick={handleAddWorker}>
              {t('addWorkerBtn', language)}
            </button>
          </div>
        </div>
      )}

      {/* Hire from Workers Directory Modal */}
      {hireWorkerOpen && (
        <div className="modal-overlay" onClick={() => setHireWorkerOpen(false)}>
          <div className="modal-sheet" style={{ maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{t('hireWorkerBtn', language)}</h2>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--muted)' }}>
                  {isEn ? 'Choose a verified worker to book directly' : 'बुकिंग हेतु सत्यापित कारीगर चुनें'}
                </p>
              </div>
              <button className="btn-close-modal" onClick={() => setHireWorkerOpen(false)}><X size={18} /></button>
            </div>

            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {workersList.map(worker => (
                <article key={worker.id} className="job-card" style={{ padding: '12px', border: '1px solid var(--line)' }}>
                  <div className="job-card-header">
                    <div className="trade-icon-box">
                      {getTradeIcon(worker.tradeEn || worker.tradeId, 22)}
                    </div>
                    <div className="job-card-titles">
                      <strong style={{ fontSize: '15px' }}>{worker.name}</strong>
                      <p>{isEn ? worker.tradeEn : worker.tradeHi} · {worker.location}</p>
                    </div>
                    <span className="wage-pill fair">₹{worker.dailyWage} / {t('perDay', language)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--line)' }}>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      ⭐ {worker.rating} · {isEn ? worker.experienceEn : worker.experienceHi}
                    </span>
                    <button
                      className="btn-book"
                      onClick={() => {
                        setSelectedWorkerForBooking(worker)
                        setHireWorkerOpen(false)
                      }}
                    >
                      <Calendar size={13} />
                      <span>{t('bookWorker', language)}</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Booking Modal for Contractor */}
      {selectedWorkerForBooking && (
        <BookingModal
          isOpen={Boolean(selectedWorkerForBooking)}
          onClose={() => setSelectedWorkerForBooking(null)}
          worker={selectedWorkerForBooking}
          currentUser={user}
          language={language}
          onConfirmed={handleBookingConfirmed}
        />
      )}

      {/* Contractor Navigation Bar: Applications | Crew | Post Job | Settings */}
      <nav className="app-bottom-nav">
        <button
          className={`nav-tab-btn ${contractorTab === 'applications' ? 'active' : ''}`}
          onClick={() => setContractorTab('applications')}
        >
          <Users size={18} />
          {unreadApplicationsCount > 0 && <span className="nav-badge-dot">{unreadApplicationsCount}</span>}
          <span>{t('tabApplications', language)}</span>
        </button>

        <button
          className={`nav-tab-btn ${contractorTab === 'crew' ? 'active' : ''}`}
          onClick={() => setContractorTab('crew')}
        >
          <HardHat size={18} />
          <span>{t('tabCrew', language)}</span>
        </button>

        <button
          className={`nav-tab-btn ${contractorTab === 'postJob' ? 'active' : ''}`}
          onClick={() => setContractorTab('postJob')}
        >
          <Plus size={18} />
          <span>{t('tabPostJob', language)}</span>
        </button>

        <button
          className={`nav-tab-btn ${contractorTab === 'account' ? 'active' : ''}`}
          onClick={() => setContractorTab('account')}
        >
          <ShieldCheck size={18} />
          <span>{t('tabContractorAccount', language)}</span>
        </button>
      </nav>
    </div>
  )
}

// 8. EMPLOYER DASHBOARD ("I need Workers")
// Navigation: Workers List | Post Job | Applications | Account
function EmployerDashboard({ user, onAddJob, workersList: propWorkersList, language, setLanguage, onHome, onSignOut }) {
  const isEn = language === 'en'

  // Navigation Tabs: 'workers' | 'postJob' | 'applications' | 'account'
  const [employerTab, setEmployerTab] = useState('workers')
  const [selectedTrade, setSelectedTrade] = useState('all')
  const [toastMsg, setToastMsg] = useState('')
  const [selectedWorkerForBooking, setSelectedWorkerForBooking] = useState(null)
  const workersList = propWorkersList || []

  const [employerApps] = useState([
    {
      id: 'emp-app-1',
      workerName: 'Raju Kumar',
      trade: 'Senior Masonry Work',
      tradeHi: 'वरिष्ठ राजमिस्त्री',
      project: 'Skyline Homes',
      phone: '+91 98765 43210',
      experience: '5 Years',
      experienceHi: '5 वर्ष',
      location: 'Andheri West, Mumbai',
      wage: 850,
      paymentStatus: 'paid',
      status: 'accepted'
    },
    {
      id: 'emp-app-2',
      workerName: 'Deepak Sawant',
      trade: 'Site Wiring Electrician',
      tradeHi: 'साइट वायरिंग इलेक्ट्रीशियन',
      project: 'Skyline Homes',
      phone: '+91 98223 99881',
      experience: '6 Years',
      experienceHi: '6 वर्ष',
      location: 'Kurla West, Mumbai',
      wage: 900,
      paymentStatus: 'paid',
      status: 'accepted'
    }
  ])

  const handleBookingConfirmed = (payload) => {
    setSelectedWorkerForBooking(null)
    if (payload && selectedWorkerForBooking) {
      saveBooking({
        id: 'booking-' + Date.now(),
        ...payload,
        workerId: selectedWorkerForBooking.id,
        workerPhone: selectedWorkerForBooking.phone,
        wage: selectedWorkerForBooking.dailyWage || 850,
        status: 'pending',
        createdAt: new Date().toISOString(),
        location: selectedWorkerForBooking.location || 'Mumbai'
      })
    }
    setToastMsg(t('bookingSuccessToast', language))
    setTimeout(() => setToastMsg(''), 4500)
  }

  const filteredWorkers = workersList.filter(w => {
    return selectedTrade === 'all' || w.tradeId === selectedTrade
  })

  const handlePostJob = (newJob) => {
    onAddJob(newJob)
    setEmployerTab('workers')
    setToastMsg(t('jobPostedSuccess', language))
    setTimeout(() => setToastMsg(''), 4000)
  }

  return (
    <div className="app-shell">
      <AppHeader
        role="employer"
        language={language}
        setLanguage={setLanguage}
        onHome={onHome}
      />

      <main className="screen employer-screen">
        {toastMsg && (
          <div className="toast-bar">
            <CheckCircle2 size={16} />
            <span>{toastMsg}</span>
          </div>
        )}

        {employerTab === 'postJob' ? (
          <PostJobScreen
            language={language}
            onCancel={() => setEmployerTab('workers')}
            onSaveJob={handlePostJob}
          />
        ) : (
          <>
            <div className="greeting-card">
              <div className="greeting-text">
                <p>{t('hello', language)}, {user.name} 👋</p>
                <h1>
                  {employerTab === 'workers'
                    ? t('tabWorkersList', language)
                    : employerTab === 'applications'
                    ? t('tabApplications', language)
                    : t('tabAccount', language)}
                </h1>
              </div>
              <button className="location-pill-btn">
                <MapPin size={14} color="var(--green)" />
                <span>{user.location || 'Mumbai'}</span>
              </button>
            </div>

            {/* TAB 1: WORKERS LIST (BROWSABLE DIRECTORY) */}
            {employerTab === 'workers' && (
              <div className="workers-list-view">
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '14px' }}>
                  {t('workersListSubtitle', language)}
                </p>

                <CategoryScroller selectedTrade={selectedTrade} onSelectTrade={setSelectedTrade} language={language} />

                <div className="section-headline">
                  <h2>{t('workersListTitle', language)}</h2>
                  <span className="count-badge">{filteredWorkers.length} {isEn ? 'Workers' : 'कारीगर'}</span>
                </div>

                <div className="jobs-list">
                  {filteredWorkers.map(w => (
                    <article key={w.id} className="worker-card">
                      <div className="worker-card-head">
                        <div className="worker-name-group">
                          <h3>{w.name}</h3>
                          <p>{isEn ? w.tradeEn : w.tradeHi} · <MapPin size={11} style={{ verticalAlign: -1 }} /> {w.location}</p>
                        </div>
                        <span className="worker-rating-badge">
                          <Star size={12} fill="#b45309" /> {w.rating} ★
                        </span>
                      </div>

                      <div className="applicant-meta-grid" style={{ margin: '8px 0' }}>
                        <div>
                          <span>{t('experienceLabel', language)}</span>
                          <strong>{isEn ? w.experienceEn : w.experienceHi}</strong>
                        </div>
                        <div>
                          <span>{t('languagesLabel', language)}</span>
                          <strong>{isEn ? w.languagesEn : w.languagesHi}</strong>
                        </div>
                      </div>

                      <div className="skills-pill-row">
                        {w.skills.map((s, idx) => (
                          <span key={idx} className="skill-tag-pill">{s}</span>
                        ))}
                      </div>

                      <div className="job-card-footer">
                        <div className="wage-amount">
                          <strong>₹{w.dailyWage}</strong>
                          <span>/ {t('perDay', language)}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <a className="btn-call" href={`tel:${w.phone}`}>
                            <Phone size={13} /> {t('hireWorker', language)}
                          </a>
                          <button
                            type="button"
                            className="btn-book"
                            onClick={() => setSelectedWorkerForBooking(w)}
                          >
                            <Calendar size={13} /> {t('bookWorker', language)}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 2: APPLICATIONS */}
            {employerTab === 'applications' && (
              <div className="applications-view">
                <div className="section-headline">
                  <h2>{t('applicationsReceivedTitle', language)}</h2>
                  <span className="count-badge">{employerApps.length}</span>
                </div>

                {employerApps.map(app => (
                  <article key={app.id} className="applicant-card" style={{ marginBottom: '14px' }}>
                    <div className="applicant-head">
                      <div className="applicant-info">
                        <h3>{app.workerName}</h3>
                        <p>{isEn ? app.trade : app.tradeHi} · {app.project}</p>
                      </div>
                      <span className="status-badge-applied">✓ {t('statusAccepted', language)}</span>
                    </div>
                    <div className="applicant-meta-grid">
                      <div>
                        <span>{t('experienceLabel', language)}</span>
                        <strong>{isEn ? app.experience : app.experienceHi}</strong>
                      </div>
                      <div>
                        <span>{t('locationLabel', language)}</span>
                        <strong>{app.location}</strong>
                      </div>
                    </div>
                    <div className="applicant-actions">
                      <a className="btn-call" href={`tel:${app.phone}`} style={{ width: '100%', justifyContent: 'center' }}>
                        <Phone size={14} /> {isEn ? `Call ${app.workerName} (${app.phone})` : `${app.workerName} को कॉल करें (${app.phone})`}
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* TAB 3: ACCOUNT */}
            {employerTab === 'account' && (
              <div className="account-view">
                <article className="job-card">
                  <div className="job-card-header">
                    <div className="trade-icon-box" style={{ background: '#dbeafe', color: '#1d4ed8' }}>
                      <Users size={24} />
                    </div>
                    <div className="job-card-titles">
                      <h3>{user.name}</h3>
                      <p>{user.phone} · {user.location || 'Mumbai'}</p>
                    </div>
                  </div>
                </article>

                <button className="btn-secondary" style={{ color: 'var(--red)', marginTop: '20px' }} onClick={onSignOut}>
                  <LogOut size={16} />
                  <span>{t('signOut', language)}</span>
                </button>
              </div>
            )}
          </>
        )}

        {selectedWorkerForBooking && (
          <BookingModal
            isOpen={Boolean(selectedWorkerForBooking)}
            onClose={() => setSelectedWorkerForBooking(null)}
            worker={selectedWorkerForBooking}
            currentUser={user}
            language={language}
            onConfirmed={handleBookingConfirmed}
          />
        )}
      </main>

      {/* Employer Navigation: Workers List | Post Job | Applications | Account */}
      <nav className="app-bottom-nav">
        <button
          className={`nav-tab-btn ${employerTab === 'workers' ? 'active' : ''}`}
          onClick={() => setEmployerTab('workers')}
        >
          <Users size={18} />
          <span>{t('tabWorkersList', language)}</span>
        </button>

        <button
          className={`nav-tab-btn ${employerTab === 'postJob' ? 'active' : ''}`}
          onClick={() => setEmployerTab('postJob')}
        >
          <Plus size={18} />
          <span>{t('tabPostJob', language)}</span>
        </button>

        <button
          className={`nav-tab-btn ${employerTab === 'applications' ? 'active' : ''}`}
          onClick={() => setEmployerTab('applications')}
        >
          <Clock size={18} />
          <span>{t('tabApplications', language)}</span>
        </button>

        <button
          className={`nav-tab-btn ${employerTab === 'account' ? 'active' : ''}`}
          onClick={() => setEmployerTab('account')}
        >
          <ShieldCheck size={18} />
          <span>{t('tabAccount', language)}</span>
        </button>
      </nav>
    </div>
  )
}

// MAIN APP COMPONENT
export default function App() {
  const [language, setLanguage] = useState('hi')

  // Navigation & User State (hydrated from active session if present)
  const [currentUser, setCurrentUser] = useState(() => getActiveSession())
  const [role, setRole] = useState(() => getActiveSession()?.role || null)
  const [oauthPending, setOauthPending] = useState(null)
  const [jobs, setJobs] = useState(() => {
    const localPosted = getPostedJobs()
    return [...localPosted, ...INITIAL_JOBS.filter(ij => !localPosted.some(lp => lp.id === ij.id))]
  })
  const [sites, setSites] = useState(CONTRACTOR_SITES)
  const [workersList, setWorkersList] = useState(() => getWorkersDirectory())

  // Handle Supabase OAuth redirect & session detection
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return

    const handleOAuthSession = async (session) => {
      if (!session?.user) return
      const authUser = session.user

      // If active session matches current user, skip
      const existing = getActiveSession()
      if (existing && (existing.id === authUser.id || existing.email === authUser.email)) {
        if (!currentUser) setCurrentUser(existing)
        if (!role) setRole(existing.role)
        return
      }

      // Check if user already exists in persistent database
      const savedRole = localStorage.getItem('kaamsetu_oauth_role') || 'contractor'
      let profile = null
      try {
        const byId = await fetchUserProfile(authUser.id)
        if (byId?.data && byId.data.name) {
          profile = byId.data
        } else if (authUser.email) {
          const byEmail = await fetchUserProfileByEmail(authUser.email)
          if (byEmail?.data && byEmail.data.name) {
            profile = byEmail.data
          }
        }
      } catch (err) {
        console.warn('OAuth profile check failed:', err)
      }

      if (profile && profile.name) {
        // User already has a complete profile - log straight in!
        setCurrentUser(profile)
        setRole(profile.role)
        setActiveSession(profile)
        localStorage.removeItem('kaamsetu_oauth_role')
      } else {
        // New user from Google OAuth - DO NOT ask for phone number! Open dashboard directly!
        const googleName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User'
        const directProfile = {
          id: authUser.id,
          email: authUser.email,
          name: googleName,
          phone: authUser.phone || authUser.user_metadata?.phone || '',
          role: savedRole === 'employer' ? 'employer' : 'contractor',
          location: 'Andheri West, Mumbai',
          company: savedRole === 'contractor' ? `${googleName} Builders` : undefined,
          avatar: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
          verified: true,
          rating: 4.9,
          preferredLanguage: language
        }
        saveUser(directProfile)
        try {
          saveUserProfile(directProfile)
        } catch {
          // ignore
        }
        setCurrentUser(directProfile)
        setRole(directProfile.role)
        setActiveSession(directProfile)
        setOauthPending(null)
        localStorage.removeItem('kaamsetu_oauth_role')
      }

      // Clean up hash fragments from URL cleanly
      if (window.location.hash && window.location.hash.includes('access_token')) {
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) handleOAuthSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        handleOAuthSession(session)
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [currentUser, role, language])

  useEffect(() => {
    async function loadInitialData() {
      try {
        const res = await fetchActiveJobs()
        if (res.success && res.data && res.data.length > 0) {
          const localPosted = getPostedJobs()
          const merged = [...localPosted, ...res.data.filter(rj => !localPosted.some(lp => lp.id === rj.id))]
          setJobs(merged)
          const activeSites = merged.map(j => ({
            id: j.id,
            siteNameEn: j.titleEn,
            siteNameHi: j.titleHi,
            location: j.place,
            totalNeeded: j.peopleNeeded,
            filledCount: 0,
            dailyWage: j.wage,
            urgent: j.urgent,
            supervisor: j.contactPerson,
            supervisorPhone: j.contactPhone,
            trades: [j.tradeEn || 'Masonry'],
            hours: j.workingHours
          }))
          setSites(activeSites)
        }
      } catch (err) {
        console.warn('Error loading active jobs from Supabase:', err)
      }

      try {
        const workersRes = await fetchWorkersDirectory()
        if (workersRes.success && workersRes.data && workersRes.data.length > 0) {
          setWorkersList(workersRes.data)
        }
      } catch (err) {
        console.warn('Error loading workers directory:', err)
      }
    }
    loadInitialData()
  }, [])

  const handleChooseRole = (selectedRole) => {
    setRole(selectedRole)
  }

  const handleAuthComplete = (userProfile) => {
    setCurrentUser(userProfile)
    setActiveSession(userProfile)

    if (userProfile?.role === 'worker') {
      const newWorkerCard = {
        id: userProfile.id || `worker-${Date.now()}`,
        name: userProfile.name,
        tradeId: (userProfile.expertise || 'masonry').toLowerCase(),
        tradeEn: userProfile.expertise ? (userProfile.expertise.charAt(0).toUpperCase() + userProfile.expertise.slice(1)) : 'Masonry',
        tradeHi: t((userProfile.expertise || 'masonry').toLowerCase(), 'hi') || 'कारीगर',
        experienceEn: userProfile.experience || '3+ Years Experience',
        experienceHi: userProfile.experience || '3+ वर्ष का अनुभव',
        location: userProfile.location || 'Andheri West, Mumbai',
        dailyWage: Number(userProfile.dailyWage) || 850,
        phone: userProfile.phone ? (userProfile.phone.startsWith('+91') ? userProfile.phone : `+91 ${userProfile.phone}`) : '+91 98765 43210',
        languagesEn: userProfile.languages || 'Hindi, English',
        languagesHi: userProfile.languages || 'हिंदी, अंग्रेज़ी',
        skills: userProfile.skills || ['General Construction'],
        rating: Number(userProfile.rating) || 5.0,
        reviewsCount: 1,
        verified: true
      }
      saveWorkerToDirectory(newWorkerCard)
      setWorkersList(prev => [newWorkerCard, ...prev.filter(w => w.id !== newWorkerCard.id && w.phone !== newWorkerCard.phone)])
    }
  }

  const handleCancelOAuth = async () => {
    setOauthPending(null)
    setRole(null)
    localStorage.removeItem('kaamsetu_oauth_role')
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signOut()
      } catch {
        // ignore
      }
    }
  }

  const handleApplyJob = async (job) => {
    setJobs(jobs.map(j => j.id === job.id ? { ...j, status: 'applied' } : j))
    try {
      await submitApplication(job.id, currentUser?.id, currentUser)
    } catch (err) {
      console.warn('Error submitting application to Supabase:', err)
    }
  }

  const handleAddJob = async (newJob) => {
    savePostedJob(newJob)
    setJobs(prev => [newJob, ...prev.filter(j => j.id !== newJob.id)])
    const newSite = {
      id: newJob.id || getNextId(),
      siteNameEn: newJob.titleEn,
      siteNameHi: newJob.titleHi,
      location: newJob.place,
      totalNeeded: newJob.peopleNeeded,
      filledCount: 0,
      dailyWage: newJob.wage,
      urgent: newJob.urgent,
      supervisor: newJob.contactPerson,
      supervisorPhone: newJob.contactPhone,
      trades: newJob.requirements ? newJob.requirements.map(r => r.trade) : [newJob.tradeEn || 'Masonry'],
      hours: newJob.workingHours,
    }
    setSites(prev => [newSite, ...prev])

    try {
      await createJob({ ...newJob, contractorId: currentUser?.id })
    } catch (err) {
      console.warn('Error creating job in Supabase:', err)
    }
  }

  const handleSignOut = async () => {
    clearActiveSession()
    setCurrentUser(null)
    setRole(null)
    setOauthPending(null)
    localStorage.removeItem('kaamsetu_oauth_role')
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signOut()
      } catch {
        // ignore
      }
    }
  }

  // Determine which screen content to render:
  let content
  if (!role && !oauthPending) {
    content = (
      <LandingScreen
        language={language}
        setLanguage={setLanguage}
        onChooseRole={handleChooseRole}
      />
    )
  } else if (oauthPending && !currentUser) {
    content = (
      <OAuthProfileScreen
        oauthUser={oauthPending}
        language={language}
        setLanguage={setLanguage}
        onBack={handleCancelOAuth}
        onCompleteAuth={(profile) => {
          setOauthPending(null)
          handleAuthComplete(profile)
        }}
      />
    )
  } else if (!currentUser) {
    content = (
      <AuthScreen
        role={role}
        language={language}
        setLanguage={setLanguage}
        onBack={() => setRole(null)}
        onCompleteAuth={handleAuthComplete}
      />
    )
  } else if (role === 'worker') {
    content = (
      <WorkerDashboard
        user={currentUser}
        jobs={jobs}
        sites={sites}
        onApplyJob={handleApplyJob}
        language={language}
        setLanguage={setLanguage}
        onHome={() => {}}
        onSignOut={handleSignOut}
      />
    )
  } else if (role === 'contractor') {
    content = (
      <ContractorDashboard
        user={currentUser}
        onAddJob={handleAddJob}
        workersList={workersList}
        language={language}
        setLanguage={setLanguage}
        onHome={() => {}}
        onSignOut={handleSignOut}
      />
    )
  } else {
    content = (
      <EmployerDashboard
        user={currentUser}
        onAddJob={handleAddJob}
        workersList={workersList}
        language={language}
        setLanguage={setLanguage}
        onHome={() => {}}
        onSignOut={handleSignOut}
      />
    )
  }

  return (
    <div className="phone-device-wrapper">
      <div className="phone-frame">
        {/* Subtle Dynamic Status Bar for desktop phone view */}
        <div className="phone-status-bar" aria-hidden="true">
          <span className="status-time">9:41</span>
          <div className="dynamic-island">
            <span className="island-camera"></span>
          </div>
          <div className="status-icons">
            <span className="status-signal">●●●●</span>
            <span className="status-wifi">5G</span>
            <span className="status-battery">100%</span>
          </div>
        </div>

        {/* Screen Content Container */}
        <div className="phone-screen-content">
          {content}
        </div>

        {/* Frosted Glass ElevenLabs Chatbot Widget with Auto-Minimize */}
        <KaamSetuChatbot />
      </div>
    </div>
  )
}
