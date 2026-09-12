import { supabase, isSupabaseConfigured } from '../supabaseClient'
import { findUserByPhone, saveUser, getRegisteredWorkers, getPostedJobs } from '../data/userStore'
import {
  INITIAL_JOBS,
  AVAILABLE_WORKERS,
  WORKER_REVIEWS,
  INITIAL_APPLICATIONS,
  INITIAL_CREW
} from '../data/mockData'

// Helpers
export function cleanPhone(raw) {
  if (!raw) return ''
  return String(raw).replace(/\D/g, '').slice(-10)
}

// Map database job record to UI format
export function mapJobRecord(dbJob) {
  const tradeMap = {
    masonry: { en: 'Masonry', hi: 'राजमिस्त्री' },
    painting: { en: 'Painting', hi: 'पेंटर' },
    plumbing: { en: 'Plumbing', hi: 'प्लंबर' },
    carpentry: { en: 'Carpentry', hi: 'बढ़ई' },
    electrician: { en: 'Electrician', hi: 'इलेक्ट्रीशियन' },
    welding: { en: 'Welding', hi: 'वेल्डर' },
    helper: { en: 'General Labor', hi: 'सहायक / लेबर' }
  }

  const tradeKey = (dbJob.job_type || 'helper').toLowerCase()
  const tradeInfo = tradeMap[tradeKey] || { en: dbJob.job_type || 'General Labor', hi: 'कारीगर' }

  return {
    id: dbJob.id,
    titleEn: `${tradeInfo.en} Required`,
    titleHi: `${tradeInfo.hi} चाहिए`,
    tradeId: tradeKey,
    tradeEn: tradeInfo.en,
    tradeHi: tradeInfo.hi,
    employer: dbJob.users?.name || 'Shiv Builders & Infra',
    contactPerson: dbJob.users?.name || 'Site Supervisor',
    contactPhone: dbJob.users?.phone_number ? `+91 ${dbJob.users.phone_number}` : '+91 98201 54321',
    place: dbJob.location || 'Mumbai',
    wage: Number(dbJob.wage || 800),
    referenceWage: Number(dbJob.wage || 800) - 40,
    tone: 'fair',
    time: 'Today',
    timeHi: 'आज से',
    workingHours: dbJob.working_hours || '8:30 AM – 5:30 PM (8 hrs)',
    workingHoursHi: 'सुबह 8:30 – शाम 5:30 (8 घंटे)',
    peopleNeeded: Number(dbJob.num_laborers_required || 1),
    requirements: (dbJob.required_skills && dbJob.required_skills.length > 0)
      ? dbJob.required_skills.map(s => ({ trade: s, count: 1 }))
      : [{ trade: tradeInfo.en, count: Number(dbJob.num_laborers_required || 1) }],
    status: dbJob.status || 'active',
    urgent: Boolean(dbJob.is_urgent)
  }
}

// Map database user + worker profile to directory card
export function mapWorkerRecord(user) {
  const profile = Array.isArray(user.worker_profiles)
    ? user.worker_profiles[0]
    : user.worker_profiles || {}

  return {
    id: user.id,
    name: user.name,
    tradeId: (profile.expertise || 'masonry').toLowerCase(),
    tradeEn: profile.expertise || 'Masonry',
    tradeHi: 'कारीगर',
    experienceEn: profile.work_experience || '3+ Years Experience',
    experienceHi: profile.work_experience || '3+ वर्ष का अनुभव',
    location: user.location || 'Mumbai',
    dailyWage: 850,
    phone: user.phone_number ? `+91 ${user.phone_number}` : '+91 98765 43210',
    languagesEn: (profile.spoken_languages || ['Hindi', 'Marathi']).join(', '),
    languagesHi: 'हिंदी, मराठी',
    skills: profile.skills || ['Brickwork', 'Plastering'],
    rating: Number(profile.rating_avg || 4.9),
    reviewsCount: 12,
    verified: true
  }
}

// ============================================================================
// 1. AUTHENTICATION & PROFILE APIS
// ============================================================================

export async function sendPhoneOtp(rawPhone) {
  const phone10 = cleanPhone(rawPhone)
  if (!phone10 || !/^[6-9]\d{9}$/.test(phone10)) {
    return { success: false, error: new Error('Invalid phone number. Must be a 10-digit Indian mobile number.') }
  }

  // Simulated OTP for development/testing: 123456
  return { success: true, otp: '123456', simulated: true }
}

export async function verifyPhoneOtp(rawPhone, token) {
  const phone10 = cleanPhone(rawPhone)
  const cleanToken = String(token || '').trim()

  if (!cleanToken || cleanToken.length !== 6) {
    return { success: false, error: new Error('OTP must be 6 digits') }
  }

  if (cleanToken === '123456') {
    return { success: true, simulated: true, user: { phone: phone10 } }
  }

  return { success: false, error: new Error('Incorrect verification code') }
}

export async function signInWithGoogle(targetRole = 'contractor') {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('kaamsetu_oauth_role', targetRole)
    }

    if (!isSupabaseConfigured() || !supabase) {
      return {
        success: false,
        error: new Error('Supabase is not configured yet. Please check VITE_SUPABASE_URL in .env.')
      }
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })

    if (error) throw error
    return { success: true, data }
  } catch (err) {
    console.warn('signInWithGoogle error:', err)
    return { success: false, error: err }
  }
}

export async function fetchUserProfileByEmail(email) {
  if (!email) return { success: false, data: null }
  const cleanEmail = String(email).trim().toLowerCase()

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*, worker_profiles(*), contractor_profiles(*)')
        .eq('email', cleanEmail)
        .maybeSingle()

      if (error) throw error
      if (data) {
        const workerProfile = Array.isArray(data.worker_profiles) ? data.worker_profiles[0] : data.worker_profiles
        const contractorProfile = Array.isArray(data.contractor_profiles) ? data.contractor_profiles[0] : data.contractor_profiles

        return {
          success: true,
          data: {
            id: data.id,
            email: data.email,
            phone: data.phone_number,
            name: data.name,
            role: data.role === 'needs_workers' ? 'employer' : data.role,
            location: data.location || 'Andheri West, Mumbai',
            preferredLanguage: data.preferred_language || 'hindi',
            expertise: workerProfile?.expertise || (data.role === 'contractor' ? 'contractor' : 'employer'),
            experience: workerProfile?.work_experience || '5 Years Experience',
            languages: (workerProfile?.spoken_languages || ['Hindi', 'English']).join(', '),
            skills: workerProfile?.skills || ['General Labor'],
            company: contractorProfile?.company_name || `${data.name} Builders`,
            rating: Number(workerProfile?.rating_avg || 4.9),
            verified: true
          }
        }
      }
    } catch (err) {
      console.warn('fetchUserProfileByEmail error:', err.message)
    }
  }

  // Fallback search in local storage
  return { success: true, data: null }
}

export async function checkUserExists(phoneOrUid) {
  try {
    const res = await fetchUserProfile(phoneOrUid)
    const hasProfile = Boolean(res?.data && res.data.name)
    return { exists: hasProfile, profile: hasProfile ? res.data : null }
  } catch (err) {
    console.warn('checkUserExists error:', err)
    const phone10 = cleanPhone(phoneOrUid)
    const local = findUserByPhone(phone10)
    const hasLocal = Boolean(local && local.name)
    return { exists: hasLocal, profile: hasLocal ? local : null }
  }
}

export async function fetchUserProfile(phoneOrUid) {
  const isId = typeof phoneOrUid === 'string' && (phoneOrUid.includes('-') || phoneOrUid.length > 15)
  const phone10 = isId ? null : cleanPhone(phoneOrUid)

  if (isSupabaseConfigured() && supabase) {
    try {
      let data = null

      if (isId) {
        const res = await supabase.from('users').select('*').eq('id', phoneOrUid).maybeSingle()
        data = res.data
      } else if (phone10) {
        // Try phone_number column first, fallback to phone column
        const res1 = await supabase.from('users').select('*').eq('phone_number', phone10).maybeSingle()
        if (!res1.error && res1.data) {
          data = res1.data
        } else {
          const res2 = await supabase.from('users').select('*').eq('phone', phone10).maybeSingle()
          data = res2.data
        }
      }

      if (data) {
        return {
          success: true,
          data: {
            id: data.id,
            email: data.email,
            phone: data.phone_number || data.phone || phone10,
            name: data.name,
            role: data.role === 'needs_workers' ? 'employer' : data.role,
            location: data.location || data.city || 'Andheri West, Mumbai',
            preferredLanguage: data.preferred_language || 'hindi',
            expertise: data.expertise || (data.role === 'contractor' ? 'contractor' : 'employer'),
            experience: data.work_experience || '5 Years Experience',
            languages: 'Hindi, English',
            skills: ['General Labor'],
            company: `${data.name} Builders`,
            rating: Number(data.rating || 4.9),
            verified: true
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch profile from Supabase:', err.message)
    }
  }

  // Fallback to local userStore
  const local = phone10 ? findUserByPhone(phone10) : null
  return { success: true, data: local }
}

export async function saveUserProfile(userData) {
  const phone10 = cleanPhone(userData.phone)
  const dbRole = userData.role === 'employer' ? 'needs_workers' : userData.role

  if (isSupabaseConfigured() && supabase) {
    try {
      const userPayload = {
        name: userData.name,
        role: dbRole
      }

      if (userData.preferredLanguage) userPayload.preferred_language = userData.preferredLanguage
      if (userData.email) userPayload.email = userData.email
      if (userData.id) userPayload.id = userData.id
      if (phone10) userPayload.phone_number = phone10
      if (userData.location) userPayload.location = userData.location

      // Attempt upsert with standard phone_number
      let { error: userError } = await supabase
        .from('users')
        .upsert(userPayload, { onConflict: userData.id ? 'id' : (phone10 ? 'phone_number' : 'id') })
        .select()
        .maybeSingle()

      // If failed due to column 'phone_number' not existing in table, retry with 'phone' & 'city'
      if (userError && (userError.message?.includes('phone_number') || userError.message?.includes('location'))) {
        delete userPayload.phone_number
        delete userPayload.location
        if (phone10) userPayload.phone = phone10
        if (userData.location) userPayload.city = userData.location

        const retry = await supabase
          .from('users')
          .upsert(userPayload, { onConflict: userData.id ? 'id' : (phone10 ? 'phone' : 'id') })
          .select()
          .maybeSingle()
        userError = retry.error
      }

      if (userError) {
        console.warn('Supabase profile upsert warning:', userError.message)
      }
    } catch (err) {
      console.warn('Failed to sync profile to Supabase, saving locally:', err.message)
    }
  }

  // Always persist locally in userStore
  const saved = saveUser(userData)
  return { success: true, data: saved }
}

// ============================================================================
// 2. JOBS APIS
// ============================================================================

export async function fetchActiveJobs() {
  const localPosted = getPostedJobs()

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data && data.length > 0) {
        const remoteJobs = data.map(mapJobRecord)
        const combined = [...localPosted, ...remoteJobs.filter(rj => !localPosted.some(lp => lp.id === rj.id))]
        return { success: true, data: combined }
      }
    } catch (err) {
      console.warn('Supabase fetchActiveJobs failed, falling back to local jobs:', err.message)
    }
  }

  const combined = [...localPosted, ...INITIAL_JOBS.filter(ij => !localPosted.some(lp => lp.id === ij.id))]
  return { success: true, data: combined }
}

export async function createJob(jobData) {
  if (isSupabaseConfigured() && supabase) {
    try {
      const payload = {
        contractor_id: jobData.contractorId || null,
        job_type: jobData.tradeId || jobData.job_type || 'masonry',
        location: jobData.place || jobData.location || 'Mumbai',
        wage: Number(jobData.wage || 800),
        working_hours: jobData.workingHours || '8:30 AM – 5:30 PM (8 hrs)',
        num_laborers_required: Number(jobData.peopleNeeded || jobData.num_laborers_required || 1),
        required_skills: jobData.required_skills || [jobData.tradeEn || 'General Labor'],
        is_urgent: Boolean(jobData.urgent || jobData.is_urgent),
        status: 'active'
      }

      const { data, error } = await supabase
        .from('jobs')
        .insert(payload)
        .select('*')
        .single()

      if (error) throw error
      return { success: true, data: mapJobRecord(data) }
    } catch (err) {
      console.warn('Supabase createJob failed, creating locally:', err.message)
    }
  }

  const localJob = {
    id: Date.now(),
    ...jobData,
    status: 'active'
  }
  return { success: true, data: localJob }
}

// ============================================================================
// 3. APPLICATIONS APIS
// ============================================================================

export async function submitApplication(jobId, workerId, workerData) {
  if (isSupabaseConfigured() && supabase && workerId) {
    try {
      const { data, error } = await supabase
        .from('applications')
        .insert({
          job_id: jobId,
          worker_id: workerId,
          status: 'pending'
        })
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (err) {
      console.warn('Supabase submitApplication failed, storing locally:', err.message)
    }
  }

  const localApp = {
    id: Date.now(),
    jobId,
    jobTitleEn: workerData?.jobTitleEn || 'Active Job',
    jobTitleHi: workerData?.jobTitleHi || 'सक्रिय कार्य',
    workerName: workerData?.name || 'Raju Kumar',
    phone: workerData?.phone ? `+91 ${workerData.phone}` : '+91 98765 43210',
    trade: workerData?.expertise || 'Masonry',
    tradeHi: 'राजमिस्त्री',
    experience: workerData?.experience || '5 Years',
    experienceHi: '5 वर्ष',
    location: workerData?.location || 'Andheri West, Mumbai',
    locationHi: 'अंधेरी, मुंबई',
    languages: workerData?.languages || 'Hindi, Marathi',
    languagesHi: 'हिंदी, मराठी',
    skills: workerData?.skills || ['Masonry', 'Plastering'],
    appliedAt: 'Just now',
    appliedAtHi: 'अभी-अभी',
    status: 'pending'
  }

  return { success: true, data: localApp }
}

export async function fetchContractorApplications(contractorId) {
  if (isSupabaseConfigured() && supabase) {
    try {
      let query = supabase
        .from('applications')
        .select('*, jobs!inner(*), users!applications_worker_id_fkey(*, worker_profiles(*))')
        .order('applied_at', { ascending: false })

      if (contractorId) {
        query = query.eq('jobs.contractor_id', contractorId)
      }

      const { data, error } = await query

      if (error) throw error
      if (data && data.length > 0) {
        const formatted = data.map(app => ({
          id: app.id,
          jobId: app.job_id,
          jobTitleEn: `${app.jobs?.job_type || 'Trade'} Work`,
          jobTitleHi: `${app.jobs?.job_type || 'काम'}`,
          workerName: app.users?.name || 'Applicant',
          phone: app.users?.phone_number ? `+91 ${app.users.phone_number}` : '+91 98765 43210',
          trade: app.users?.worker_profiles?.[0]?.expertise || 'Masonry',
          tradeHi: 'कारीगर',
          experience: app.users?.worker_profiles?.[0]?.work_experience || '3 Years',
          experienceHi: '3 वर्ष',
          location: app.users?.location || 'Mumbai',
          locationHi: 'मुंबई',
          languages: (app.users?.worker_profiles?.[0]?.spoken_languages || ['Hindi']).join(', '),
          languagesHi: 'हिंदी',
          skills: app.users?.worker_profiles?.[0]?.skills || ['General Labor'],
          appliedAt: 'Recently',
          appliedAtHi: 'हाल ही में',
          status: app.status || 'pending'
        }))
        return { success: true, data: formatted }
      }
    } catch (err) {
      console.warn('Supabase fetchContractorApplications failed, using local list:', err.message)
    }
  }

  return { success: true, data: INITIAL_APPLICATIONS }
}

export async function updateApplicationStatus(applicationId, newStatus) {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: newStatus })
        .eq('id', applicationId)

      if (error) throw error
    } catch (err) {
      console.warn('Supabase updateApplicationStatus failed:', err.message)
    }
  }

  return { success: true, id: applicationId, status: newStatus }
}

// ============================================================================
// 4. WORKERS DIRECTORY & REVIEWS APIS
// ============================================================================

export async function fetchWorkersDirectory() {
  const registeredLocal = getRegisteredWorkers()

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'worker')

      if (error) throw error
      if (data && data.length > 0) {
        const remoteWorkers = data.map(mapWorkerRecord)
        const combined = [...registeredLocal, ...remoteWorkers]
        const unique = Array.from(new Map(combined.map(w => [String(w.phone || w.id), w])).values())
        return { success: true, data: [...unique, ...AVAILABLE_WORKERS.filter(aw => !unique.some(u => String(u.phone) === String(aw.phone)))] }
      }
    } catch (err) {
      console.warn('Supabase fetchWorkersDirectory failed, using directory list:', err.message)
    }
  }

  const combined = [...registeredLocal, ...AVAILABLE_WORKERS]
  const unique = Array.from(new Map(combined.map(w => [String(w.phone || w.id), w])).values())
  return { success: true, data: unique }
}

export async function fetchWorkerReviews(workerId) {
  if (isSupabaseConfigured() && supabase && workerId) {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data && data.length > 0) {
        const formatted = data.map(r => ({
          id: r.id,
          reviewerName: r.reviewer_name,
          reviewerRoleEn: 'Contractor / Employer',
          reviewerRoleHi: 'ठेकेदार / मकान मालिक',
          rating: Number(r.rating || 5),
          date: 'Recently',
          dateHi: 'हाल ही में',
          tradeEn: 'Contract Work',
          tradeHi: 'ठेका काम',
          commentEn: r.comment,
          commentHi: r.comment
        }))
        return { success: true, data: formatted }
      }
    } catch (err) {
      console.warn('Supabase fetchWorkerReviews failed, using reviews:', err.message)
    }
  }

  return { success: true, data: WORKER_REVIEWS }
}

// ============================================================================
// 5. CREW & WAGE LOGGING APIS
// ============================================================================

export async function fetchContractorCrew(contractorId) {
  if (isSupabaseConfigured() && supabase) {
    try {
      let query = supabase
        .from('crew')
        .select('*, users!crew_worker_id_fkey(*, worker_profiles(*))')

      if (contractorId) {
        query = query.eq('contractor_id', contractorId)
      }

      const { data, error } = await query

      if (error) throw error
      if (data && data.length > 0) {
        const formatted = data.map(c => ({
          id: c.id,
          name: c.users?.name || 'Crew Member',
          tradeEn: c.users?.worker_profiles?.[0]?.expertise || 'Laborer',
          tradeHi: 'कारीगर',
          phone: c.users?.phone_number ? `+91 ${c.users.phone_number}` : '+91 98765 43210',
          dailyWage: 850,
          verified: true,
          wageLog: c.daily_wage_log || []
        }))
        return { success: true, data: formatted }
      }
    } catch (err) {
      console.warn('Supabase fetchContractorCrew failed, using crew list:', err.message)
    }
  }

  return { success: true, data: INITIAL_CREW }
}

export async function addCrewMember(contractorId, memberData) {
  if (isSupabaseConfigured() && supabase && memberData.workerId) {
    try {
      const { data, error } = await supabase
        .from('crew')
        .insert({
          contractor_id: contractorId || null,
          worker_id: memberData.workerId,
          daily_wage_log: []
        })
        .select('*, users!crew_worker_id_fkey(*)')
        .single()

      if (error) throw error
      return {
        success: true,
        data: {
          id: data.id,
          name: data.users?.name || memberData.name,
          tradeEn: memberData.tradeEn || 'Mason',
          tradeHi: memberData.tradeHi || 'राजमिस्त्री',
          phone: data.users?.phone_number || memberData.phone,
          dailyWage: Number(memberData.dailyWage || 800),
          verified: true
        }
      }
    } catch (err) {
      console.warn('Supabase addCrewMember failed, saving locally:', err.message)
    }
  }

  const localMember = {
    id: Date.now(),
    name: memberData.name,
    tradeEn: memberData.tradeEn || memberData.trade || 'Worker',
    tradeHi: memberData.tradeHi || 'कारीगर',
    phone: memberData.phone,
    dailyWage: Number(memberData.dailyWage || 800),
    verified: true
  }

  return { success: true, data: localMember }
}

export async function logDailyWage(crewId, date, wage) {
  if (isSupabaseConfigured() && supabase && crewId) {
    try {
      const { data: row } = await supabase.from('crew').select('daily_wage_log').eq('id', crewId).maybeSingle()
      const existingLogs = Array.isArray(row?.daily_wage_log) ? row.daily_wage_log : []
      const updated = [...existingLogs.filter(l => l.date !== date), { date, wage, present: true }]

      await supabase.from('crew').update({ daily_wage_log: updated }).eq('id', crewId)
    } catch (err) {
      console.warn('Supabase logDailyWage failed:', err.message)
    }
  }

  return { success: true, crewId, date, wage }
}
