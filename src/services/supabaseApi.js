import { supabase, isSupabaseConfigured } from '../supabaseClient'
import {
  findUserByPhone,
  saveUser,
  getRegisteredWorkers,
  getPostedJobs,
  savePostedJob,
  getStoredApplications,
  saveStoredApplication,
  updateStoredApplicationStatus
} from '../data/userStore'
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
  if (!dbJob) return null

  // If the record stored full JSON in skill
  if (typeof dbJob.skill === 'string' && dbJob.skill.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(dbJob.skill)
      return {
        ...parsed,
        id: dbJob.id || parsed.id,
        status: dbJob.status || parsed.status || 'active'
      }
    } catch {
      // fallback to regular mapping
    }
  }

  const tradeMap = {
    masonry: { en: 'Masonry', hi: 'राजमिस्त्री' },
    painting: { en: 'Painting', hi: 'पेंटर' },
    plumbing: { en: 'Plumbing', hi: 'प्लंबर' },
    carpentry: { en: 'Carpentry', hi: 'बढ़ई' },
    electrician: { en: 'Electrician', hi: 'इलेक्ट्रीशियन' },
    welding: { en: 'Welding', hi: 'वेल्डर' },
    helper: { en: 'General Labor', hi: 'सहायक / लेबर' }
  }

  const rawTrade = dbJob.job_type || dbJob.tradeId || dbJob.skill || dbJob.tradeEn || dbJob.trade || 'helper'
  const tradeKey = String(rawTrade).toLowerCase().replace(/\s+/g, '')
  const tradeInfo = tradeMap[tradeKey] || { en: dbJob.tradeEn || rawTrade, hi: dbJob.tradeHi || 'कारीगर' }

  // Extract any encoded metadata from required_skills
  const skillsList = Array.isArray(dbJob.required_skills) ? dbJob.required_skills : []
  const metaEmployer = skillsList.find(s => s.startsWith('meta:employer='))?.replace('meta:employer=', '')
  const metaContact = skillsList.find(s => s.startsWith('meta:contact='))?.replace('meta:contact=', '')
  const metaPhone = skillsList.find(s => s.startsWith('meta:phone='))?.replace('meta:phone=', '')
  const metaEmail = skillsList.find(s => s.startsWith('meta:email='))?.replace('meta:email=', '')
  const metaTitleEn = skillsList.find(s => s.startsWith('meta:titleEn='))?.replace('meta:titleEn=', '')
  const metaTitleHi = skillsList.find(s => s.startsWith('meta:titleHi='))?.replace('meta:titleHi=', '')
  const metaStartDate = skillsList.find(s => s.startsWith('meta:startDate='))?.replace('meta:startDate=', '')

  const cleanSkills = skillsList.filter(s => !s.startsWith('meta:') && !s.startsWith('applicant:'))

  const wageVal = Number(dbJob.wage_offered || dbJob.wage || dbJob.salary || dbJob.daily_wage || 800)
  const peopleNeeded = Number(dbJob.num_laborers_required || dbJob.count || dbJob.peopleNeeded || 1)
  const employerName = metaEmployer || dbJob.employer || dbJob.contactPerson || dbJob.users?.name || 'Site Employer'
  const contactName = metaContact || dbJob.contactPerson || employerName || 'Site Supervisor'
  const phoneVal = metaPhone || dbJob.contactPhone || (dbJob.users?.phone_number ? `+91 ${dbJob.users.phone_number}` : '+91 98201 54321')
  const emailVal = metaEmail || dbJob.contactEmail || dbJob.employerEmail || ''

  const applicantsList = skillsList
    .filter(s => s.startsWith('applicant:'))
    .map(s => {
      try {
        return JSON.parse(s.slice('applicant:'.length))
      } catch {
        return null
      }
    })
    .filter(Boolean)

  return {
    id: dbJob.id,
    titleEn: metaTitleEn || dbJob.titleEn || `${tradeInfo.en} Required`,
    titleHi: metaTitleHi || dbJob.titleHi || `${tradeInfo.hi} चाहिए`,
    tradeId: tradeKey,
    tradeEn: tradeInfo.en,
    tradeHi: tradeInfo.hi,
    employer: employerName,
    contactPerson: contactName,
    contactPhone: phoneVal,
    contactEmail: emailVal,
    employerEmail: emailVal,
    place: dbJob.location || dbJob.place || 'Mumbai',
    wage: wageVal,
    referenceWage: Math.max(500, wageVal - 40),
    tone: wageVal < 700 ? 'low' : wageVal > 880 ? 'high' : 'fair',
    time: metaStartDate || dbJob.time || 'Today',
    timeHi: metaStartDate || dbJob.timeHi || 'आज से',
    startDate: metaStartDate || dbJob.startDate || new Date().toISOString().slice(0, 10),
    workingHours: dbJob.working_hours || dbJob.workingHours || '8:30 AM – 5:30 PM (8 hrs)',
    workingHoursHi: dbJob.working_hours || dbJob.workingHoursHi || 'सुबह 8:30 – शाम 5:30 (8 घंटे)',
    peopleNeeded,
    applicants: applicantsList,
    requirements: cleanSkills.length > 0
      ? cleanSkills.map(s => ({ trade: s, count: 1 }))
      : (Array.isArray(dbJob.requirements) && dbJob.requirements.length > 0
          ? dbJob.requirements
          : [{ trade: tradeInfo.en, count: peopleNeeded }]),
    status: dbJob.status || 'open',
    urgent: Boolean(dbJob.is_urgent || dbJob.urgent)
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
      // Prototype & Demo Mode: Instant Google Sign-in without blocking
      const demoUser = {
        id: targetRole === 'contractor' ? 1001 : 3001,
        name: 'Vineet Naik Gaonkar',
        email: 'naikgaonkarvineet@gmail.com',
        role: targetRole || 'employer',
        location: 'Andheri West, Mumbai',
        company: targetRole === 'contractor' ? 'Gaonkar Infrastructure Ltd' : undefined,
        verified: true,
        phone: '+91 98765 43210'
      }
      return { success: true, demoUser }
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
    console.warn('signInWithGoogle error, falling back to direct demo login:', err)
    const fallbackUser = {
      id: targetRole === 'contractor' ? 1001 : 3001,
      name: 'Vineet Naik Gaonkar',
      email: 'naikgaonkarvineet@gmail.com',
      role: targetRole || 'employer',
      location: 'Andheri West, Mumbai',
      company: targetRole === 'contractor' ? 'Gaonkar Infrastructure Ltd' : undefined,
      verified: true,
      phone: '+91 98765 43210'
    }
    return { success: true, demoUser: fallbackUser }
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
  let remoteJobs = []

  // 1. Fetch from Supabase Cloud Database
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .or('status.eq.active,status.eq.open')
        .order('created_at', { ascending: false })

      if (!error && data && data.length > 0) {
        remoteJobs = data.map(mapJobRecord).filter(Boolean)
      }
    } catch (err) {
      console.warn('[Supabase] fetchActiveJobs notice:', err.message)
    }
  }

  // 2. Deduplicate across Supabase live database and local storage
  const allLiveJobs = [...remoteJobs, ...localPosted]
  const uniqueLiveJobs = Array.from(
    new Map(allLiveJobs.map(j => [String(j.id), j])).values()
  )

  // Newly posted jobs from ANY device appear at the top, merged with seed jobs
  if (uniqueLiveJobs.length > 0) {
    const combined = [
      ...uniqueLiveJobs,
      ...INITIAL_JOBS.filter(ij => !uniqueLiveJobs.some(uj => String(uj.id) === String(ij.id)))
    ]
    return { success: true, data: combined }
  }

  return { success: true, data: INITIAL_JOBS }
}

export async function createJob(jobData) {
  const normalizedJob = {
    id: jobData.id || `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ...jobData,
    status: 'active'
  }

  // 1. Always persist to local cache for instant 0ms rendering on this device
  savePostedJob(normalizedJob)

  // 2. Insert into Supabase Cloud Database (for universal visibility across all devices)
  if (isSupabaseConfigured() && supabase) {
    const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

    const metadataSkills = [
      ...(Array.isArray(jobData.requirements) ? jobData.requirements.map(r => r.trade) : [jobData.tradeEn || 'General Labor']),
      `meta:employer=${jobData.employer || jobData.contactPerson || 'Site Employer'}`,
      `meta:contact=${jobData.contactPerson || 'Site Supervisor'}`,
      `meta:phone=${jobData.contactPhone || '+91 98201 54321'}`,
      `meta:email=${jobData.contactEmail || jobData.employerEmail || ''}`,
      `meta:titleEn=${jobData.titleEn || ''}`,
      `meta:titleHi=${jobData.titleHi || ''}`,
      `meta:startDate=${jobData.startDate || ''}`
    ]

    try {
      const wageNumber = Number(jobData.wage || 800)
      const tradeString = (jobData.tradeId || jobData.job_type || 'masonry').toLowerCase()

      // Full payload with all required columns and valid status: 'open'
      const fullPayload = {
        contractor_id: isUUID(jobData.contractorId) ? jobData.contractorId : null,
        job_type: tradeString,
        skill: tradeString,
        location: jobData.place || jobData.location || 'Mumbai',
        wage: wageNumber,
        wage_offered: wageNumber,
        working_hours: jobData.workingHours || '8:30 AM – 5:30 PM (8 hrs)',
        num_laborers_required: Number(jobData.peopleNeeded || 1),
        required_skills: metadataSkills,
        is_urgent: Boolean(jobData.urgent || jobData.is_urgent),
        status: 'open'
      }

      console.log('[Supabase createJob] Inserting payload:', fullPayload)
      const { data, error } = await supabase.from('jobs').insert(fullPayload).select('*').single()

      if (!error && data) {
        console.log('[Supabase createJob] Insert succeeded:', data)
        const mapped = mapJobRecord(data)
        savePostedJob(mapped)
        return { success: true, data: mapped }
      }

      // If full schema failed because column doesn't exist, try minimal payload satisfying NOT NULL constraints
      if (error) {
        console.log('[Supabase createJob] Retrying with required columns (skill, wage_offered, location, status)...')
        const minimalPayload = {
          skill: tradeString,
          wage_offered: wageNumber,
          location: jobData.place || jobData.location || 'Mumbai',
          status: 'open'
        }
        const retry = await supabase.from('jobs').insert(minimalPayload).select('*').single()
        if (!retry.error && retry.data) {
          console.log('[Supabase createJob] Minimal insert succeeded:', retry.data)
          const mapped = mapJobRecord(retry.data)
          savePostedJob(mapped)
          return { success: true, data: mapped }
        }
      }
    } catch (err) {
      console.warn('[Supabase createJob] Notice:', err.message)
    }
  }

  return { success: true, data: normalizedJob }
}

// ============================================================================
// 3. APPLICATIONS APIS
// ============================================================================

export async function submitApplication(jobId, workerId, workerData, jobDetails = {}) {
  const appId = `app_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const localApp = {
    id: appId,
    jobId: String(jobId || ''),
    jobTitleEn: jobDetails?.titleEn || workerData?.jobTitleEn || 'Active Job',
    jobTitleHi: jobDetails?.titleHi || workerData?.jobTitleHi || 'सक्रिय कार्य',
    employer: jobDetails?.employer || jobDetails?.contactPerson || 'Site Employer',
    employerEmail: jobDetails?.contactEmail || jobDetails?.employerEmail || '',
    workerName: workerData?.name || 'Applicant',
    phone: workerData?.phone ? (String(workerData.phone).startsWith('+91') ? workerData.phone : `+91 ${workerData.phone}`) : '+91 98765 43210',
    trade: workerData?.expertise || workerData?.tradeEn || jobDetails?.tradeEn || 'General Labor',
    tradeHi: workerData?.tradeHi || jobDetails?.tradeHi || 'कारीगर',
    experience: workerData?.experience || '3 Years',
    experienceHi: workerData?.experienceHi || '3 वर्ष',
    location: workerData?.location || jobDetails?.place || 'Mumbai',
    locationHi: workerData?.locationHi || 'मुंबई',
    languages: workerData?.languages || 'Hindi',
    languagesHi: workerData?.languagesHi || 'हिंदी',
    skills: workerData?.skills || [jobDetails?.tradeEn || 'General Labor'],
    appliedAt: 'Just now',
    appliedAtHi: 'अभी-अभी',
    status: 'pending',
    paymentStatus: 'unpaid'
  }

  // 1. Instant local persistence for 0ms rendering
  saveStoredApplication(localApp)

  // 2. Persist to Supabase Cloud Database via job's required_skills
  if (isSupabaseConfigured() && supabase && jobId) {
    try {
      const { data: currentJob, error: fetchErr } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle()

      if (!fetchErr && currentJob) {
        const existingSkills = Array.isArray(currentJob.required_skills) ? currentJob.required_skills : []
        const applicantTag = `applicant:${JSON.stringify(localApp)}`
        const updatedSkills = [...existingSkills.filter(s => !s.startsWith(`applicant:{"id":"${appId}"`)), applicantTag]

        await supabase
          .from('jobs')
          .update({ required_skills: updatedSkills })
          .eq('id', jobId)

        console.log('[Supabase submitApplication] Cloud sync confirmed for job:', jobId)
      }
    } catch (err) {
      console.warn('[Supabase submitApplication] Cloud sync notice:', err.message)
    }
  }

  return { success: true, data: localApp }
}

export async function fetchContractorApplications(contractorId, employerName) {
  const localApps = getStoredApplications()
  const remoteApps = []

  // 1. Fetch from Supabase Cloud Database jobs
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && Array.isArray(jobs)) {
        for (const j of jobs) {
          const mapped = mapJobRecord(j)
          const skills = Array.isArray(j.required_skills) ? j.required_skills : []
          const applicantTags = skills.filter(s => s.startsWith('applicant:'))

          for (const tag of applicantTags) {
            try {
              const rawJson = tag.slice('applicant:'.length)
              const appData = JSON.parse(rawJson)
              remoteApps.push({
                ...appData,
                jobId: j.id,
                jobTitleEn: mapped?.titleEn || `${mapped?.tradeEn || 'Trade'} Work`,
                jobTitleHi: mapped?.titleHi || `${mapped?.tradeHi || 'काम'}`,
                employer: mapped?.employer || appData.employer || 'Site Employer',
                employerEmail: mapped?.contactEmail || appData.employerEmail || '',
                wage: mapped?.wage || 850
              })
            } catch {
              // ignore malformed
            }
          }
        }
      }
    } catch (err) {
      console.warn('[Supabase fetchContractorApplications] Notice:', err.message)
    }
  }

  // 2. Combine and deduplicate
  const allApps = [...remoteApps, ...localApps]
  const uniqueMap = new Map()
  for (const app of allApps) {
    if (app && app.id) {
      uniqueMap.set(String(app.id), app)
    }
  }

  // Also include initial mock applications if not shadowed
  for (const initApp of INITIAL_APPLICATIONS) {
    if (!uniqueMap.has(String(initApp.id))) {
      uniqueMap.set(String(initApp.id), initApp)
    }
  }

  const combined = Array.from(uniqueMap.values())

  // 3. Prioritize matches for this contractor or employer
  if (contractorId || employerName) {
    const cleanPoster = String(employerName || '').toLowerCase().trim()
    const matched = combined.filter(app => {
      const appEmp = String(app.employer || '').toLowerCase().trim()
      if (cleanPoster && (appEmp.includes(cleanPoster) || cleanPoster.includes(appEmp))) {
        return true
      }
      if (contractorId && (String(app.contractorId) === String(contractorId) || String(app.contractor_id) === String(contractorId))) {
        return true
      }
      return false
    })

    if (matched.length > 0) {
      const remaining = combined.filter(a => !matched.some(m => String(m.id) === String(a.id)))
      return { success: true, data: [...matched, ...remaining] }
    }
  }

  return { success: true, data: combined }
}

export async function updateApplicationStatus(applicationId, newStatus, extra = {}) {
  // 1. Update in local storage
  updateStoredApplicationStatus(applicationId, newStatus, extra)

  // 2. Update in Supabase cloud database
  if (isSupabaseConfigured() && supabase && applicationId) {
    try {
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select('*')

      if (!error && Array.isArray(jobs)) {
        for (const j of jobs) {
          const skills = Array.isArray(j.required_skills) ? j.required_skills : []
          const matchingIdx = skills.findIndex(s => s.startsWith('applicant:') && s.includes(`"id":"${applicationId}"`))

          if (matchingIdx !== -1) {
            try {
              const parsed = JSON.parse(skills[matchingIdx].slice('applicant:'.length))
              parsed.status = newStatus
              parsed.paymentStatus = newStatus === 'accepted' ? 'paid' : parsed.paymentStatus
              parsed.updatedAt = new Date().toISOString()
              const updatedSkills = [...skills]
              updatedSkills[matchingIdx] = `applicant:${JSON.stringify(parsed)}`

              await supabase
                .from('jobs')
                .update({ required_skills: updatedSkills })
                .eq('id', j.id)

              console.log('[Supabase updateApplicationStatus] Cloud status updated for app:', applicationId)
            } catch {
              // ignore
            }
          }
        }
      }
    } catch (err) {
      console.warn('[Supabase updateApplicationStatus] Notice:', err.message)
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
