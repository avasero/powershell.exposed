import { supabase } from './supabase'

/**
 * Make an authenticated API call to the backend
 * @param {string} endpoint - API endpoint (e.g., '/user/profile')
 * @param {object} options - Fetch options (method, body, etc.)
 * @returns {Promise<Response>} - Fetch response
 */
export async function makeAuthenticatedRequest(endpoint, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const url = `${apiUrl}${endpoint}`
  
  // Prepare headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  }
  
  // Add authorization header if user is authenticated
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  
  // Make the request
  const response = await fetch(url, {
    ...options,
    headers
  })
  
  return response
}

/**
 * Make an authenticated API call and return JSON data
 * @param {string} endpoint - API endpoint
 * @param {object} options - Fetch options
 * @returns {Promise<object>} - JSON response data
 */
export async function makeAuthenticatedJSONRequest(endpoint, options = {}) {
  const response = await makeAuthenticatedRequest(endpoint, options)
  
  if (!response.ok) {
    const errorText = await response.text()
    let errorData
    
    try {
      errorData = JSON.parse(errorText)
    } catch {
      errorData = { error: errorText }
    }
    
    throw new Error(errorData.error || `HTTP ${response.status}: ${errorText}`)
  }
  
  return await response.json()
}

/**
 * Get user profile from API
 * @returns {Promise<object>} - User profile data
 */
export async function getUserProfile() {
  return await makeAuthenticatedJSONRequest('/user/profile')
}

/**
 * Update user profile
 * @param {object} profileData - Profile data to update
 * @returns {Promise<object>} - Update response
 */
export async function updateUserProfile(profileData) {
  return await makeAuthenticatedJSONRequest('/user/profile', {
    method: 'PUT',
    body: JSON.stringify(profileData)
  })
}

/**
 * Get user statistics
 * @returns {Promise<object>} - User statistics
 */
export async function getUserStatistics() {
  return await makeAuthenticatedJSONRequest('/user/statistics')
}

/**
 * Delete a user analysis
 * @param {string} analysisId - Analysis ID to delete
 * @returns {Promise<object>} - Delete response
 */
export async function deleteUserAnalysis(analysisId) {
  return await makeAuthenticatedJSONRequest(`/user/analysis/${analysisId}`, {
    method: 'DELETE'
  })
}

/**
 * Get user analyses with authentication
 * @param {number} limit - Number of analyses to fetch
 * @returns {Promise<object>} - User analyses
 */
export async function getUserAnalyses(limit = 20) {
  return await makeAuthenticatedJSONRequest(`/user-analyses?limit=${limit}`)
}

/**
 * Get user command evaluations with pagination
 * @param {number} limit - Number of records to return (max 100)
 * @param {number} offset - Pagination offset
 * @param {string} shortId - Filter by specific analysis short_id
 * @returns {Promise<object>} - User command evaluations
 */
export async function getUserCommandEvaluations(limit = null, offset = 0, shortId = null) {
  const params = new URLSearchParams()
  
  if (limit !== null) {
    params.append('limit', limit)
  }
  
  if (offset > 0) {
    params.append('offset', offset)
  }
  
  if (shortId) {
    params.append('short_id', shortId)
  }
  
  const queryString = params.toString()
  const endpoint = queryString ? `/user/command-evaluations?${queryString}` : '/user/command-evaluations'
  
  return await makeAuthenticatedJSONRequest(endpoint)
}

/**
 * Get user API key
 * @returns {Promise<object>} - User API key data
 */
export async function getUserApiKey() {
  return await makeAuthenticatedJSONRequest('/user/api-key')
}

/**
 * Create user API key
 * @returns {Promise<object>} - Created API key data
 */
export async function createUserApiKey() {
  return await makeAuthenticatedJSONRequest('/user/api-key', {
    method: 'POST'
  })
}

/**
 * Regenerate user API key
 * @returns {Promise<object>} - New API key data
 */
export async function regenerateUserApiKey() {
  return await makeAuthenticatedJSONRequest('/user/api-key', {
    method: 'PUT'
  })
}

/**
 * Revoke user API key
 * @returns {Promise<object>} - Revocation response
 */
export async function revokeUserApiKey() {
  return await makeAuthenticatedJSONRequest('/user/api-key', {
    method: 'DELETE'
  })
}

/* --- STRIPE INTEGRATION DISABLED ---
 * Create a Stripe Checkout Session for plan upgrade
 * @param {string} priceId - Stripe price ID (e.g., "price_xxx")
 * @returns {Promise<object>} - { success: true, url: "https://checkout.stripe.com/..." }
 */
// export async function createCheckoutSession(priceId) {
//   return await makeAuthenticatedJSONRequest('/stripe/create-checkout-session', {
//     method: 'POST',
//     body: JSON.stringify({ price_id: priceId })
//   })
// }
/* --- END STRIPE INTEGRATION DISABLED --- */
