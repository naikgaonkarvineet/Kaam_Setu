// ============================================================================
// N8N LIVE WEBHOOKS INTEGRATION SERVICE
// Endpoints:
// 1. Booking created (worker booked): https://aframmm.app.n8n.cloud/webhook/worker-booked
// 2. Worker accepted: https://aframmm.app.n8n.cloud/webhook/worker-accepted
// ============================================================================

export const N8N_WEBHOOKS = {
  workerBooked: 'https://aframmm.app.n8n.cloud/webhook/worker-booked',
  workerAccepted: 'https://aframmm.app.n8n.cloud/webhook/worker-accepted',
}

/**
 * Format date for the webhook payload: 'YYYY-MM-DD HH:mm'
 */
export function formatScheduledDate(dateInput) {
  if (typeof dateInput === 'string' && dateInput.trim()) {
    return dateInput.trim()
  }

  const d = dateInput instanceof Date ? dateInput : new Date(Date.now() + 86400000)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours() || 10).padStart(2, '0')
  const minutes = String(d.getMinutes() || 0).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}`
}

/**
 * Send POST request to n8n webhook with exact expected JSON structure:
 * {
 *   "customerName": "Alex Customer",
 *   "customerEmail": "customer@example.com",
 *   "workerName": "Jordan Worker",
 *   "service": "House Cleaning",
 *   "scheduledFor": "2026-09-20 10:00"
 * }
 */
async function sendWebhook(endpointType, payload) {
  const directUrl = N8N_WEBHOOKS[endpointType]
  if (!directUrl) {
    console.error(`[Webhook] Invalid endpoint type: ${endpointType}`)
    return { success: false, error: new Error(`Invalid endpoint type: ${endpointType}`) }
  }

  const bodyData = {
    customerName: String(payload.customerName || 'Customer').trim(),
    customerEmail: String(payload.customerEmail || 'customer@example.com').trim(),
    workerName: String(payload.workerName || 'Worker').trim(),
    service: String(payload.service || 'Construction & General Work').trim(),
    scheduledFor: formatScheduledDate(payload.scheduledFor)
  }

  console.log(`[Webhook] Dispatching ${endpointType} to ${directUrl}:`, bodyData)

  // 1. First attempt: Direct fetch to live n8n URL (n8n Cloud returns CORS headers for POST requests)
  try {
    const response = await fetch(directUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyData)
    })

    if (response.ok) {
      const resData = await response.json().catch(() => ({ message: 'Workflow was started' }))
      console.log(`[Webhook] ${endpointType} direct delivery confirmed:`, resData)
      return { success: true, data: resData }
    } else {
      const errText = await response.text().catch(() => response.statusText)
      console.warn(`[Webhook] Direct fetch failed with status ${response.status}:`, errText)
    }
  } catch (directErr) {
    console.warn(`[Webhook] Direct fetch to ${directUrl} encountered error:`, directErr.message)
  }

  // 2. Second attempt: Local dev proxy fallback (e.g. /api/webhook/worker-accepted)
  const proxyUrl = `/api/webhook/${endpointType === 'workerBooked' ? 'worker-booked' : 'worker-accepted'}`
  try {
    console.log(`[Webhook] Attempting proxy delivery to ${proxyUrl}:`, bodyData)
    const proxyRes = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyData)
    })

    if (proxyRes.ok) {
      const proxyData = await proxyRes.json().catch(() => ({ message: 'Workflow was started' }))
      console.log(`[Webhook] ${endpointType} proxy delivery confirmed:`, proxyData)
      return { success: true, data: proxyData }
    } else {
      const errTxt = await proxyRes.text().catch(() => proxyRes.statusText)
      console.error(`[Webhook] Proxy dispatch responded with error:`, errTxt)
      return { success: false, status: proxyRes.status, error: new Error(errTxt) }
    }
  } catch (proxyErr) {
    console.error(`[Webhook] Both direct and proxy deliveries failed:`, proxyErr)
    return { success: false, error: proxyErr }
  }
}

/**
 * 1. Booking created (worker booked)
 * Triggered when a customer/contractor books or hires a worker.
 */
export async function notifyWorkerBooked({ customerName, customerEmail, workerName, service, scheduledFor }) {
  return await sendWebhook('workerBooked', {
    customerName,
    customerEmail,
    workerName,
    service,
    scheduledFor
  })
}

/**
 * 2. Worker accepted
 * Triggered when a worker accepts a booking or when contractor accepts a worker application.
 */
export async function notifyWorkerAccepted({ customerName, customerEmail, workerName, service, scheduledFor }) {
  return await sendWebhook('workerAccepted', {
    customerName,
    customerEmail,
    workerName,
    service,
    scheduledFor
  })
}
