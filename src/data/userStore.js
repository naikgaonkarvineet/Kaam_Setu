// Persistent User Database and Profile Store using localStorage
import { AVAILABLE_WORKERS } from './mockData'

const STORAGE_KEY = 'kaamsetu_users_db'
const SESSION_KEY = 'kaamsetu_active_session'

// Default pre-seeded users for demo & instant access
export const INITIAL_USERS = [
  {
    id: 1001,
    phone: '9876543210',
    name: 'Raju Kumar',
    role: 'worker',
    expertise: 'masonry',
    location: 'Andheri West, Mumbai',
    experience: '5 Years in Construction & Masonry',
    languages: 'Hindi, Marathi, Bhojpuri',
    skills: ['Masonry', 'Plastering', 'Bricklaying', 'Tile Fitting'],
    rating: 4.9,
    verified: true
  },
  {
    id: 1002,
    phone: '9820154321',
    name: 'Shiv Kumar Sharma',
    role: 'contractor',
    expertise: 'contractor',
    location: 'Andheri West, Mumbai',
    company: 'Shiv Builders & Infra',
    experience: '8 Years General Contractor',
    languages: 'Hindi, Marathi, English',
    skills: ['Contracting', 'Site Planning', 'Crew Management'],
    rating: 4.8,
    verified: true
  },
  {
    id: 1003,
    phone: '9819000111',
    name: 'Anil Deshmukh',
    role: 'employer',
    expertise: 'employer',
    location: 'Bandra Kurla Complex, Mumbai',
    company: 'Skyline Homes',
    experience: 'Property Developer',
    languages: 'English, Marathi, Hindi',
    skills: ['Project Oversight', 'Hiring'],
    rating: 4.9,
    verified: true
  }
]

export function getAllUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_USERS))
      return INITIAL_USERS
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_USERS
  } catch (err) {
    console.error('Error loading users from localStorage:', err)
    return INITIAL_USERS
  }
}

export function findUserByPhone(phone) {
  if (!phone) return null
  const cleaned = phone.replace(/\D/g, '').slice(-10)
  const users = getAllUsers()
  return users.find(u => u.phone.replace(/\D/g, '').slice(-10) === cleaned) || null
}

export function saveUser(userData) {
  try {
    const users = getAllUsers()
    const cleanedPhone = userData.phone.replace(/\D/g, '').slice(-10)
    const existingIndex = users.findIndex(u => u.phone.replace(/\D/g, '').slice(-10) === cleanedPhone)

    let updatedUser
    if (existingIndex >= 0) {
      updatedUser = { ...users[existingIndex], ...userData, phone: cleanedPhone }
      users[existingIndex] = updatedUser
    } else {
      updatedUser = {
        id: userData.id || Date.now(),
        ...userData,
        phone: cleanedPhone,
        verified: true
      }
      users.push(updatedUser)
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(users))
    setActiveSession(updatedUser)
    return updatedUser
  } catch (err) {
    console.error('Error saving user profile:', err)
    return userData
  }
}

export function getActiveSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setActiveSession(user) {
  try {
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(SESSION_KEY)
    }
  } catch (err) {
    console.error('Error updating session:', err)
  }
}

export function clearActiveSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch (err) {
    console.error('Error clearing session:', err)
  }
}

// -----------------------------------------------------------------------------
// POSTED JOBS STORE (Persists across reloads, role switches & app restarts)
// -----------------------------------------------------------------------------
const POSTED_JOBS_KEY = 'kaamsetu_posted_jobs'

export function getPostedJobs() {
  try {
    const raw = localStorage.getItem(POSTED_JOBS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function savePostedJob(job) {
  try {
    const existing = getPostedJobs()
    const filtered = existing.filter(j => j.id !== job.id)
    const updated = [job, ...filtered]
    localStorage.setItem(POSTED_JOBS_KEY, JSON.stringify(updated))
    return updated
  } catch (err) {
    console.error('Error saving posted job:', err)
    return []
  }
}

// -----------------------------------------------------------------------------
// WORKERS DIRECTORY STORE (Newly created worker accounts appear here immediately)
// -----------------------------------------------------------------------------
const WORKERS_KEY = 'kaamsetu_registered_workers'

export function getRegisteredWorkers() {
  try {
    const raw = localStorage.getItem(WORKERS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveWorkerToDirectory(worker) {
  try {
    const existing = getRegisteredWorkers()
    const filtered = existing.filter(w => w.id !== worker.id && w.phone !== worker.phone)
    const updated = [worker, ...filtered]
    localStorage.setItem(WORKERS_KEY, JSON.stringify(updated))
    return updated
  } catch (err) {
    console.error('Error saving worker to directory:', err)
    return []
  }
}

export function getWorkersDirectory() {
  try {
    const registered = getRegisteredWorkers()
    const combined = [...registered, ...AVAILABLE_WORKERS]
    return Array.from(new Map(combined.map(w => [String(w.phone || w.id), w])).values())
  } catch {
    return AVAILABLE_WORKERS
  }
}

// -----------------------------------------------------------------------------
// BOOKINGS / WORK REQUESTS STORE (Worker accept/deny & email notifications)
// -----------------------------------------------------------------------------
const BOOKINGS_KEY = 'kaamsetu_bookings'

const TEST_EMAIL_KEY = 'kaamsetu_test_email'

export function getSavedTestEmail() {
  try {
    return localStorage.getItem(TEST_EMAIL_KEY) || 'naikgaonkarvineet@gmail.com'
  } catch {
    return 'naikgaonkarvineet@gmail.com'
  }
}

export function saveTestEmail(email) {
  try {
    if (email && typeof email === 'string' && email.trim() && email.includes('@')) {
      localStorage.setItem(TEST_EMAIL_KEY, email.trim())
    }
  } catch {
    // ignore
  }
}

export const INITIAL_BOOKINGS = [
  {
    id: 'booking-seed-1',
    customerName: 'Vineet Naik Gaonkar',
    customerEmail: getSavedTestEmail() || 'naikgaonkarvineet@gmail.com',
    customerPhone: '+91 98190 00111',
    workerName: 'Raju Kumar',
    service: 'Welding',
    scheduledFor: '2026-09-20 10:00',
    wage: 850,
    status: 'pending',
    createdAt: '2026-09-12T10:00:00Z',
    location: 'Andheri West, Mumbai'
  }
]

export function getBookings() {
  try {
    const raw = localStorage.getItem(BOOKINGS_KEY)
    if (!raw) {
      const seed = [
        {
          ...INITIAL_BOOKINGS[0],
          customerEmail: getSavedTestEmail() || 'naikgaonkarvineet@gmail.com'
        }
      ]
      localStorage.setItem(BOOKINGS_KEY, JSON.stringify(seed))
      return seed
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : INITIAL_BOOKINGS
  } catch {
    return INITIAL_BOOKINGS
  }
}

export function saveBooking(booking) {
  try {
    const existing = getBookings()
    const filtered = existing.filter(b => b.id !== booking.id)
    const updated = [booking, ...filtered]
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(updated))
    return updated
  } catch (err) {
    console.error('Error saving booking:', err)
    return []
  }
}

export function updateBookingStatus(bookingId, newStatus, newEmail) {
  try {
    const existing = getBookings()
    const updated = existing.map(b => {
      if (b.id === bookingId) {
        return {
          ...b,
          status: newStatus,
          ...(newEmail ? { customerEmail: newEmail.trim() } : {})
        }
      }
      return b
    })
    localStorage.setItem(BOOKINGS_KEY, JSON.stringify(updated))
    return updated
  } catch (err) {
    console.error('Error updating booking status:', err)
    return []
  }
}

