// src/services/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://api.societyflow.in:5000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach JWT & log request ─────────────
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request details
    const method = config.method?.toUpperCase();
    const endpoint = config.url;
    console.log(`🔵 [API] ${method} ${endpoint}`);
    if (config.data) console.log(`   Data:`, config.data);
    
  } catch (err) {
    console.warn('[API] Token retrieval error:', err.message);
  }
  return config;
});

// ── Response interceptor: log response & handle errors ────────
api.interceptors.response.use(
  (res) => {
    const method = res.config.method?.toUpperCase();
    const endpoint = res.config.url;
    const status = res.status;
    
    // Log successful response
    console.log(`✅ [API] ${method} ${endpoint} (${status})`);
    if (res.data?.data) {
      const dataKeys = typeof res.data.data === 'object' ? Object.keys(res.data.data) : 'array/primitive';
      console.log(`   Response keys:`, dataKeys);
    }
    
    return res;
  },
  async (err) => {
    try {
      const method = err.config?.method?.toUpperCase();
      const endpoint = err.config?.url;
      const status = err.response?.status;
      const errMsg = err.response?.data?.error || err.message;
      
      // Log error with details
      console.error(`❌ [API] ${method} ${endpoint} (${status})`);
      console.error(`   Error: ${errMsg}`);
      if (err.response?.data) console.error(`   Body:`, JSON.stringify(err.response.data));
      
      // Handle 401 - clear cache and show login
      if (status === 401) {
        console.warn('[API] 🚪 Unauthorized (401), clearing cache and redirecting to login');
        await AsyncStorage.multiRemove(['token', 'user', 'society']);
      }
      
    } catch (clearErr) {
      console.warn('[API] Error clearing cache:', clearErr.message);
    }
    
    return Promise.reject(err);
  }
);

// ── Token helpers ─────────────────────────────────────────────
export const saveToken   = (t)  => AsyncStorage.setItem('token', t);
export const getToken    = ()   => AsyncStorage.getItem('token');
export const saveUser    = (u)  => AsyncStorage.setItem('user', JSON.stringify(u));
export const getUser     = async () => { try { return JSON.parse(await AsyncStorage.getItem('user')); } catch { return null; } };
export const saveSociety = (s)  => AsyncStorage.setItem('society', JSON.stringify(s));
export const getSociety  = async () => { try { return JSON.parse(await AsyncStorage.getItem('society')); } catch { return null; } };
export const clearAll    = ()   => AsyncStorage.multiRemove(['token', 'user', 'society']);

// ── Photo URL Helper ────────────────────────────────────────────
/**
 * Convert photo path to full URL
 * Uploads served on http://api.societyflow.in (NO port for uploads)
 * Other APIs use http://api.societyflow.in:5000
 */
export const getPhotoUrl = (photoPath) => {
  if (!photoPath) return null;
  
  // Already full URL (http/https)
  if (photoPath.startsWith('http')) return photoPath;
  
  // Base64 encoded image (old format, still works)
  if (photoPath.startsWith('data:')) return photoPath;
  
  // File URI (local file system)
  if (photoPath.startsWith('file://')) return photoPath;
  
  // Uploads: /api/uploads/visitors/gate_A101_1712345678.jpg
  if (photoPath.startsWith('/api/uploads/')) {
    return 'http://api.societyflow.in' + photoPath;  // NO :5000 for uploads
  }
  
  // Other API paths use full BASE_URL with :5000
  if (photoPath.startsWith('/api/')) {
    return BASE_URL + photoPath;
  }
  
  // Relative path starting with / - try with BASE_URL
  if (photoPath.startsWith('/')) {
    return BASE_URL + photoPath;
  }
  
  // Last resort: treat as uploads path
  return 'http://api.societyflow.in/api/uploads/' + photoPath;
};

// ── AUTH ──────────────────────────────────────────────────────
export const register = (data) => api.post('/api/auth/register', data);
export const login = (data) => api.post('/api/auth/login', data);
export const getMe = () => api.get('/api/auth/me');
export const updateProfile = (data) => api.put('/api/settings', data);
export const forgotPassword = (data) => api.post('/api/auth/forgot-password', data);
export const changePassword = (newPassword) =>
  api.post('/api/auth/change-password', { new_password: newPassword });

// ── RESIDENTS ─────────────────────────────────────────────────
export const getResidents = () => api.get('/api/residents');
export const lookupResidentByFlat = (flatNo) =>
  api.get('/api/residents/lookup', { params: { flat_no: flatNo } });
export const addResident = (data) => api.post('/api/residents', data);
export const updateResident = (id, data) => api.put(`/api/residents/${id}`, data);
export const deleteResident = (id) => api.delete(`/api/residents/${id}`);
export const selfRegister = (data) => api.post('/api/residents/self-register', data);

// ── VISITORS ──────────────────────────────────────────────────
export const getVisitors = () => api.get('/api/visitors');
export const getVisitorById = (id) => api.get(`/api/visitors/${id}`);
export const createVisitor = (data) => api.post('/api/visitors', data);
export const checkoutVisitor = (id) => api.put(`/api/visitors/${id}/checkout`);

// ── COMPLAINTS ────────────────────────────────────────────────
export const getComplaints = (status = null) => {
  const config = status ? { params: { status } } : {};
  return api.get('/api/complaints', config);
};
export const createComplaint = (data) => api.post('/api/complaints', data);
export const updateComplaint = (id, data) => api.put(`/api/complaints/${id}`, data);
export const deleteComplaint = (id) => api.delete(`/api/complaints/${id}`);

// ── BILLS ─────────────────────────────────────────────────────
export const getAllBills = () => api.get('/api/bills');
export const getMyBills = () => api.get('/api/bills/my');
export const getBillSummary = () => api.get('/api/bills/summary');

// NEW: Get bills with parking info and billing config in one call
export const getBillsWithConfig = () => api.get('/api/bills/my-full');

// NEW: Get billing configuration (due_day, late_fee, reminder_days, etc)
export const getBillingConfig = () => api.get('/api/billing-config');

// NEW: Mark a bill as paid
export const markBillAsPaid = (billId, paymentMode) => 
  api.put(`/api/bills/${billId}/pay`, { payment_mode: paymentMode });

// NEW: Razorpay - Create payment order
export const createPaymentOrder = (billId, amount) =>
  api.post('/api/payments/create-order', { bill_id: billId, amount });

// NEW: Razorpay - Verify payment signature
export const verifyPayment = (razorpayPaymentId, razorpayOrderId, razorpaySignature, billId) =>
  api.post('/api/payments/verify', {
    razorpay_payment_id: razorpayPaymentId,
    razorpay_order_id: razorpayOrderId,
    razorpay_signature: razorpaySignature,
    bill_id: billId
  });

// Legacy exports for backward compatibility
export const addBill = (data) => api.post('/api/bills', data);
export const bulkCreateBills = (data) => api.post('/api/bills/bulk', data);
export const payBill = (id, data) => api.put(`/api/bills/${id}/pay`, data);
export const deleteBill = (id) => api.delete(`/api/bills/${id}`);

// ── NOTICES ───────────────────────────────────────────────────
export const getNotices = () => api.get('/api/notices');
export const addNotice = (data) => api.post('/api/notices', data);
export const deleteNotice = (id) => api.delete(`/api/notices/${id}`);

// ── ALERTS (CCTV) ────────────────────────────────────────────
export const getAlerts = () => api.get('/api/alerts');
export const getEmergencyAlerts = () => api.get('/api/emergency-alerts?active=true');
export const createAlert = (data) => api.post('/api/alerts', data);
export const resolveAlert = (id) => api.put(`/api/alerts/${id}/resolve`);
export const deleteAlert = (id) => api.delete(`/api/alerts/${id}`);
export const acknowledgeAlert = (id) => api.put(`/api/alerts/${id}/resolve`);

// ── EMERGENCY ─────────────────────────────────────────────────
export const getEmergencyConfig = () => api.get('/api/emergency-config');
export const triggerSOS = (message) => api.post('/api/sos', { message });

// ── AMENITIES ─────────────────────────────────────────────────
// GET /api/amenities returns default seeded amenities with pricing (name, icon, price_per_hour, min/max duration, timings)
export const getAmenities = () => api.get('/api/amenities');

// ── BOOKINGS (Section 2 – GET / POST / DELETE /api/bookings) ──
// Returns: [{ id, amenity, flat_no, resident_name, booking_date, start_time, end_time,
//            price_per_hour, duration_mins, total_amount, payment_status, status, created_at }]
export const getBookings = () => api.get('/api/bookings');

// Body: { amenity, flat_no, resident_name, booking_date, start_time, end_time, notes? }
// Server auto-calculates: duration_mins, price_per_hour (from AmenityConfig), total_amount, payment_status
export const createBooking = (data) => api.post('/api/bookings', data);

export const deleteBooking = (id) => api.delete(`/api/bookings/${id}`);
export const cancelBooking = (bookingId) => deleteBooking(bookingId);

// ── NOTIFICATIONS ────────────────────────────────────────────
export const stayCheck = () => api.post('/api/notifications/stay-check');

// ── REGISTRATIONS ────────────────────────────────────────────
export const getRegistrations = (status = null) => {
  const config = status ? { params: { status } } : {};
  return api.get('/api/registrations', config);
};

export const getRegistrationById = (id) => api.get(`/api/registrations/${id}`);
export const approveRegistration = (id, data) => api.put(`/api/registrations/${id}/approve`, data);
export const rejectRegistration = (id, data) => api.put(`/api/registrations/${id}/reject`, data);
export const deleteRegistration = (id) => api.delete(`/api/registrations/${id}`);

/**
 * Get pending visitor registrations for the current user's flat
 * Used to show notification alerts for visitors waiting for approval
 */
export const getPendingVisitors = async () => {
  try {
    const res = await api.get('/api/registrations', { params: { status: 'pending' } });
    const allRegistrations = res.data?.data || [];
    
    console.log('═══════════════════════════════════════════════════');
    console.log('[API] 📋 PENDING VISITORS (ALL - No flat filtering)');
    console.log('═══════════════════════════════════════════════════');
    console.log(`📊 Total pending registrations: ${allRegistrations.length}`);
    
    allRegistrations.forEach((reg, idx) => {
      console.log(`\n[${idx}] ${reg.name || reg.visitor_name}`);
      console.log(`   - Flat: ${reg.visiting_flat}`);
      console.log(`   - Phone: ${reg.phone}`);
      console.log(`   - Purpose: ${reg.purpose}`);
      console.log(`   - Status: ${reg.status}`);
    });
    
    console.log('\n═══════════════════════════════════════════════════\n');
    
    // Return ALL pending visitors - show all to guards/residents for approval
    return allRegistrations;
  } catch (err) {
    console.error('[API] getPendingVisitors error:', err.message);
    return [];
  }
};
/**
 * Get ALL pending registrations (unfiltered) - for debugging
 */
export const getAllPendingRegistrations = async () => {
  try {
    const res = await api.get('/api/registrations', { params: { status: 'pending' } });
    const allPending = res.data?.data || [];
    
    console.log('\n🔍 ALL PENDING REGISTRATIONS (Raw from API - NO filtering):');
    console.log('═══════════════════════════════════════════════════');
    console.log(`Total: ${allPending.length}`);
    
    allPending.forEach((reg, idx) => {
      console.log(`\n[${idx}] ${reg.name || reg.visitor_name}`);
      console.log(`   ID: ${reg.id}`);
      console.log(`   visiting_flat: "${reg.visiting_flat}"`);
      console.log(`   status: ${reg.status}`);
      console.log(`   registered_at: ${reg.registered_at || reg.created_at}`);
      console.log(`   phone: ${reg.phone}`);
      console.log(`   purpose: ${reg.purpose}`);
    });
    
    console.log('\n═══════════════════════════════════════════════════\n');
    
    return allPending;
  } catch (err) {
    console.error('[API] Error fetching all pending:', err.message);
    return [];
  }
};

/**
 * Get debug info from backend about pending visitor matching
 */
export const debugPendingVisitors = async () => {
  try {
    const res = await api.get('/api/debug/pending-visitors');
    console.log('\n🔧 BACKEND DEBUG INFO:');
    console.log('═══════════════════════════════════════════════════');
    const data = res.data?.data || {};
    
    if (data.current_user) {
      console.log('📱 Current User:');
      console.log(`  - ID: ${data.current_user.id}`);
      console.log(`  - Name: ${data.current_user.name}`);
      console.log(`  - flat_no: "${data.current_user.flat_fields.flat_no}"`);
      console.log(`  - apartment: "${data.current_user.flat_fields.apartment}"`);
      console.log(`  - flat: "${data.current_user.flat_fields.flat}"`);
      console.log(`  - Selected flat: "${data.current_user.selected_flat_uppercase}"`);
    }
    
    if (data.all_pending_registrations) {
      console.log(`\n📋 All Pending Registrations (${data.all_pending_registrations.length}):`);
      data.all_pending_registrations.forEach((reg, idx) => {
        console.log(`  [${idx}] ${reg.visitor_name}`);
        console.log(`     - visiting_flat: "${reg.visiting_flat}" → "${reg.visiting_flat_uppercase}"`);
        console.log(`     - status: ${reg.status}`);
      });
    }
    
    if (data.matching_logic?.matches) {
      console.log(`\n🔗 Matching Results:`);
      data.matching_logic.matches.forEach((m) => {
        const icon = m.is_pending_for_user ? '✅' : '❌';
        console.log(`  ${icon} ${m.visitor_name}`);
        console.log(`     - reg: "${m.reg_flat}" vs user: "${m.user_flat}"`);
        console.log(`     - exact: ${m.exact_match}, flexible: ${m.flexible_match}`);
      });
    }
    
    console.log('═══════════════════════════════════════════════════\n');
    
    return data;
  } catch (err) {
    console.error('[API] Debug endpoint error:', err.message);
    if (err.response?.data?.error) {
      console.error('[API] Error details:', err.response.data.error);
    }
    return null;
  }
};
// ── NOTIFICATIONS ──────────────────────────────────────────
// Smart notification system: Fetch all notifications and count unread ones
export const getNotifications = () => {
  // GET /api/notifications returns: [{ id, type, title, message, link, priority, photo, created_at }]
  // Types: visitor_request, complaint, stay_exceeded, cctv, pending_resident
  return api.get('/api/notifications');
};

// Track read notifications in local storage
export const getReadNotificationIds = async () => {
  try {
    const notificationReadList = await AsyncStorage.getItem('notification_read_ids');
    return notificationReadList ? JSON.parse(notificationReadList) : [];
  } catch (err) {
    console.warn('[API] Error loading read notification IDs:', err.message);
    return [];
  }
};

export const markNotificationRead = async (notificationId) => {
  try {
    // Track read notifications in local storage
    const readIds = await getReadNotificationIds();
    if (!readIds.includes(notificationId)) {
      readIds.push(notificationId);
      await AsyncStorage.setItem('notification_read_ids', JSON.stringify(readIds));
      console.log(`✅ [API] Notification ${notificationId} marked as read locally`);
    }
    return Promise.resolve({ data: { success: true } });
  } catch (err) {
    console.warn('[API] Error marking notification as read:', err.message);
    return Promise.resolve({ data: { success: true } });
  }
};

export const clearReadNotifications = () => {
  // Clear read notification tracking (e.g., on logout)
  return AsyncStorage.removeItem('notification_read_ids');
};

// ── GATE (Public) ────────────────────────────────────────────
export const getSocieties = () => api.get('/api/gate/societies');
export const registerViaGate = (data) => api.post('/api/gate/register', data);
export const checkRegistrationStatus = (socId, regId) => api.get(`/api/gate/status/${socId}/${regId}`);

// ── STATS ─────────────────────────────────────────────────────
export const getStats = () => api.get('/api/stats');

// ── SUPPORT TICKETS ──────────────────────────────────────────
export const getMyTickets = () => api.get('/api/support/tickets');
export const createTicket = (data) => api.post('/api/support/tickets', data);

// ── DATABASE CONNECTIVITY & HEALTH CHECK ──────────────────────
export const checkDatabaseHealth = async () => {
  try {
    console.log('🏥 [DATABASE] Checking server health...');
    const response = await api.get('/api/health');
    console.log('✅ [DATABASE] Server is healthy:', response.data);
    return { status: 'ok', data: response.data };
  } catch (err) {
    console.error('❌ [DATABASE] Server health check failed:', err.message);
    return { status: 'error', error: err.message };
  }
};

export const testAPIConnection = async () => {
  try {
    console.log('📡 [TEST] Testing API connectivity...');
    const response = await api.get('/api');
    console.log('✅ [TEST] API is reachable');
    return { connected: true, baseUrl: BASE_URL };
  } catch (err) {
    console.error('❌ [TEST] Cannot reach API:', err.message);
    return { connected: false, baseUrl: BASE_URL, error: err.message };
  }
};

export const validateLogin = async (email, password) => {
  try {
    console.log(`🔐 [LOGIN] Attempting login for: ${email}`);
    const response = await api.post('/api/auth/login', { email, password });
    
    const token = response.data?.data?.token;
    const user = response.data?.data?.user;
    
    console.log('✅ [LOGIN] Login successful');
    console.log(`   User: ${user?.name} (${user?.email})`);
    console.log(`   Society: ${user?.society_id}`);
    console.log(`   Token length: ${token?.length} chars`);
    
    return { success: true, user, token };
  } catch (err) {
    console.error('❌ [LOGIN] Login failed:', err.message);
    return { success: false, error: err.message };
  }
};

export const testSelectedEndpoints = async () => {
  const results = {};
  
  console.log('\n🧪 [TEST] Running endpoint tests...\n');
  
  // Test getMe
  try {
    const res = await getMe();
    results.getMe = { status: 'success', data: res.data?.data };
    console.log('✅ getMe() - User data retrieved');
  } catch (err) {
    results.getMe = { status: 'error', error: err.message };
    console.log('❌ getMe() - Failed');
  }
  
  // Test getBillSummary
  try {
    const res = await getBillSummary();
    results.getBillSummary = { status: 'success', data: res.data?.data };
    console.log('✅ getBillSummary() - Bills data retrieved');
  } catch (err) {
    results.getBillSummary = { status: 'error', error: err.message };
    console.log('❌ getBillSummary() - Failed');
  }
  
  // Test getNotices
  try {
    const res = await getNotices();
    results.getNotices = { status: 'success', count: res.data?.data?.length || 0 };
    console.log(`✅ getNotices() - ${res.data?.data?.length || 0} notices retrieved`);
  } catch (err) {
    results.getNotices = { status: 'error', error: err.message };
    console.log('❌ getNotices() - Failed');
  }
  
  // Test getVisitors
  try {
    const res = await getVisitors();
    results.getVisitors = { status: 'success', count: res.data?.data?.length || 0 };
    console.log(`✅ getVisitors() - ${res.data?.data?.length || 0} visitors retrieved`);
  } catch (err) {
    results.getVisitors = { status: 'error', error: err.message };
    console.log('❌ getVisitors() - Failed');
  }
  
  // Test getComplaints
  try {
    const res = await getComplaints();
    results.getComplaints = { status: 'success', count: res.data?.data?.length || 0 };
    console.log(`✅ getComplaints() - ${res.data?.data?.length || 0} complaints retrieved`);
  } catch (err) {
    results.getComplaints = { status: 'error', error: err.message };
    console.log('❌ getComplaints() - Failed');
  }
  
  console.log('\n📊 [TEST] Summary:');
  const successCount = Object.values(results).filter(r => r.status === 'success').length;
  const totalCount = Object.keys(results).length;
  console.log(`   ${successCount}/${totalCount} endpoints working\n`);
  
  return results;
};

// ── PROFILE & USER ────────────────────────────────────────────
export const uploadProfilePicture = (photoBase64) => api.post('/api/profile/photo', { photo: photoBase64 });

// ── VISITOR APPROVALS ─────────────────────────────────────────
export const getVisitorApprovals = () => api.get('/api/visitors/pending-approvals');
export const approveVisitor = (id, data) => api.put(`/api/visitors/${id}/approve`, data);
export const rejectVisitor = (id, reason) => api.put(`/api/visitors/${id}/reject`, { reason });

// ── SMART CACHE SYNC (Once per 24 hours) ──────────────────────
// Helper to check if 24 hours have passed since last fetch
const shouldRefreshCache = async (cacheKey) => {
  try {
    const lastFetch = await AsyncStorage.getItem(`${cacheKey}_lastfetch`);
    if (!lastFetch) return true; // No cache, should fetch
    
    const timePassed = Date.now() - parseInt(lastFetch);
    const hoursElapsed = timePassed / (1000 * 60 * 60);
    
    console.log(`⏱️ [Cache] ${cacheKey}: ${hoursElapsed.toFixed(1)}h elapsed`);
    return hoursElapsed >= 24; // Return true if 24+ hours passed
  } catch (err) {
    console.warn(`[Cache] Error checking ${cacheKey}:`, err.message);
    return true; // On error, refresh
  }
};

// Helper to get cached data
const getCachedData = async (cacheKey) => {
  try {
    const cached = await AsyncStorage.getItem(`${cacheKey}_data`);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};

// Helper to save data to cache with timestamp
const setCacheData = async (cacheKey, data) => {
  try {
    await AsyncStorage.multiSet([
      [`${cacheKey}_data`, JSON.stringify(data)],
      [`${cacheKey}_lastfetch`, Date.now().toString()],
    ]);
    console.log(`💾 [Cache] Saved ${cacheKey}`);
  } catch (err) {
    console.warn(`[Cache] Error saving ${cacheKey}:`, err.message);
  }
};

// Smart getters with caching
export const getEmergencyContactsWithCache = async (forceRefresh = false) => {
  const cacheKey = 'emergency_contacts';
  const fromCache = !forceRefresh && !(await shouldRefreshCache(cacheKey));
  
  if (fromCache) {
    const cached = await getCachedData(cacheKey);
    if (cached) {
      console.log('📦 [Cache] Using cached emergency contacts');
      return { data: { data: cached } }; // Return in API response format
    }
  }
  
  console.log('🔄 [Cache] Fetching fresh emergency contacts from API');
  const response = await api.get('/api/emergency-contacts');
  await setCacheData(cacheKey, response.data?.data);
  return response;
};

export const getDocumentsWithCache = async (forceRefresh = false) => {
  const cacheKey = 'documents';
  const fromCache = !forceRefresh && !(await shouldRefreshCache(cacheKey));
  
  if (fromCache) {
    const cached = await getCachedData(cacheKey);
    if (cached) {
      console.log('📦 [Cache] Using cached documents');
      return { data: { data: cached } };
    }
  }
  
  console.log('🔄 [Cache] Fetching fresh documents from: http://api.societyflow.in:5000/api/documents');
  try {
    const response = await api.get('/api/documents');
    console.log('✅ [Documents] Successfully fetched:', response.data?.data?.length || 0, 'documents');
    await setCacheData(cacheKey, response.data?.data);
    return response;
  } catch (err) {
    console.error('❌ [Documents] Failed to fetch:', err.message);
    // Return cached data if available, or empty array
    const cached = await getCachedData(cacheKey);
    if (cached) {
      console.log('📦 [Cache] Falling back to cached documents');
      return { data: { data: cached } };
    }
    throw err;
  }
};

export const getVendorsWithCache = async (forceRefresh = false) => {
  const cacheKey = 'vendors';
  const fromCache = !forceRefresh && !(await shouldRefreshCache(cacheKey));
  
  if (fromCache) {
    const cached = await getCachedData(cacheKey);
    if (cached) {
      console.log('📦 [Cache] Using cached vendors');
      return { data: { data: cached } };
    }
  }
  
  console.log('🔄 [Cache] Fetching fresh vendors from API');
  const response = await api.get('/api/vendors');
  await setCacheData(cacheKey, response.data?.data);
  return response;
};

// ── EMERGENCY & SOS ───────────────────────────────────────────
export const getSocietyEmergencyContacts = () => api.get('/api/society/emergency-contacts');
export const sendSOS = (message, location) => api.post('/api/sos', { message, location });
export const getSOSHistory = () => api.get('/api/sos/history');
export const getEmergencyContacts = () => api.get('/api/emergency-contacts');

// ── REAL-TIME EMERGENCY CONTACTS (REST API with polling fallback) ────
export const getEmergencyContactsRealtime = async (forceRefresh = false) => {
  const cacheKey = 'emergency_contacts_realtime';
  const fromCache = !forceRefresh && !(await shouldRefreshCache(cacheKey));
  
  if (fromCache) {
    const cached = await getCachedData(cacheKey);
    if (cached) {
      console.log('📦 [API] Using cached emergency contacts (realtime)');
      return { data: { data: cached } };
    }
  }
  
  console.log('📡 [API] Fetching fresh emergency contacts from server...');
  try {
    const response = await api.get('/api/emergency-contacts');
    const contacts = response.data?.data || [];
    
    // Transform contact data for display
    const transformedContacts = contacts.map(c => ({
      id: c.id,
      name: c.name,
      phone: c.number,
      category: c.category || 'Emergency',
      icon: c.icon || '📞',
      description: c.description,
      is_national: c.is_national,
      is_active: c.is_active,
      sort_order: c.sort_order || 0,
    }));
    
    await setCacheData(cacheKey, transformedContacts);
    return { data: { data: transformedContacts } };
  } catch (err) {
    console.error('❌ [API] Emergency contacts fetch error:', err.message);
    // Return empty array on error, don't break the screen
    return { data: { data: [] } };
  }
};

export const getEmergencyAlertsRealtime = async () => {
  try {
    console.log('📡 [API] Fetching emergency alerts...');
    const response = await api.get('/api/emergency-alerts?active=true');
    return response;
  } catch (err) {
    console.error('❌ [API] Emergency alerts fetch error:', err.message);
    return { data: { data: [] } };
  }
};

export const getEmergencyConfigRealtime = async () => {
  try {
    console.log('⚙️  [API] Fetching emergency config...');
    const response = await api.get('/api/emergency-config');
    return response;
  } catch (err) {
    console.error('❌ [API] Emergency config fetch error:', err.message);
    return { data: { data: { sos_number: '112' } } };
  }
};

export const subscribeToEmergencyUpdates = async (callback) => {
  try {
    const mod = await import('./socket');
    const socketService = mod.default;
    await socketService.initialize();
    socketService.on('emergency:contacts-updated', callback);
    console.log('✅ [API] Subscribed to emergency updates via socket');
  } catch (err) {
    console.warn('⚠️  [API] Socket subscription failed, using REST polling:', err.message);
    // Fallback: poll REST API every 30 seconds
    setInterval(async () => {
      try {
        const data = await getEmergencyContactsRealtime(true);
        callback(data.data?.data);
      } catch (_) {}
    }, 30000);
  }
};

// ── PARKING ───────────────────────────────────────────────────
export const getParkingSlots = () => api.get('/api/parking/slots');
export const getMyParkingSlot = () => api.get('/api/parking/my-slot');
export const getParkingLogs = () => api.get('/api/parking/logs');
export const getParkingVehicleStats = () => api.get('/api/parking/vehicle-stats');
export const getParkingLogsSearch = (query) => api.get('/api/parking/logs/search', { params: { q: query } });

// ── DOCUMENTS ─────────────────────────────────────────────────
export const getDocuments = () => api.get('/api/documents');
export const downloadDocument = (id) => api.get(`/api/documents/${id}/download`);

// ── PERSONAL DOCUMENTS (Resident Uploads) ────────────────────
export const getMyDocuments = () => api.get('/api/my/documents');
export const uploadMyDocument = (data) => api.post('/api/my/documents', data);
export const downloadMyDocument = (id) => api.get(`/api/my/documents/${id}/download`);
export const deleteMyDocument = (id) => api.delete(`/api/my/documents/${id}`);

// ── VENDORS ───────────────────────────────────────────────────
export const getVendors = () => api.get('/api/vendors');

// ── COMMUNITY (POSTS, COMMENTS, POLLS) ────────────────────────
export const getCommunityPosts = () => api.get('/api/community/posts');
export const createCommunityPost = (data) => api.post('/api/community/posts', data);
export const likeCommunityPost = (id) => api.post(`/api/community/posts/${id}/like`);
export const getPostComments = (id) => api.get(`/api/community/posts/${id}/comments`);
export const addCommentToPost = (id, data) => api.post(`/api/community/posts/${id}/comments`, data);

// ── POLLS ──────────────────────────────────────────────────────
// Get active polls only (for voting screen)
export const getActivePolls = () => api.get('/api/polls');

// Get ALL polls - active and closed with voter_details (for results screen)
// Used to: view poll results, see who voted (after poll closes), historical polls
export const getAllPolls = () => api.get('/api/polls/all');

// Cast a vote on a poll
export const votePoll = (id, data) => api.post(`/api/polls/${id}/vote`, data);

// ── PROFILE UPDATE REQUESTS ───────────────────────────────────
export const getProfileUpdateRequests = () => api.get('/api/profile-update-requests');
export const createProfileUpdateRequest = (data) => api.post('/api/profile-update-requests', data);

// ── CAB LOGS ──────────────────────────────────────────────────
export const getCabLogs = () => api.get('/api/cab-logs');
export const createCabLog = (data) => api.post('/api/cab-logs', data);

// ── STAFF ─────────────────────────────────────────────────────
export const getStaffMembers = () => api.get('/api/staff');
export const getStaffDirectory = () => api.get('/api/staff');

// ── MY PROFILE FULL DATA ──────────────────────────────────────

// ── PAYMENTS (RAZORPAY) ───────────────────────────────────────
export const recordManualPayment = (data) => api.post('/api/payments/manual', data);
export const getPaymentHistory = () => api.get('/api/payments');

// ── FAMILY MEMBERS ────────────────────────────────────────────
// Use /me/family — no resident ID needed, backend resolves from auth token
export const getMyFamilyMembers = () => api.get('/api/residents/me/family');
export const addMyFamilyMember = (data) => api.post('/api/residents/me/family', data);
// Legacy (kept for reference, not used in app)
export const getFamilyMembers = (residentId) => api.get(`/api/residents/${residentId}/family`);
export const addFamilyMember = (residentId, data) => api.post(`/api/residents/${residentId}/family`, data);
export const updateFamilyMember = (familyId, data) => api.put(`/api/family/${familyId}`, data);
export const deleteFamilyMember = (familyId) => api.delete(`/api/family/${familyId}`);
export const updateFamilyNotifications = (familyId, data) => api.put(`/api/family/${familyId}/notifications`, data);

// ── PROFILE UPDATE REQUESTS (EXTENDED) ────────────────────────
export const updateProfileUpdateRequest = (id, data) => api.put(`/api/profile-update-requests/${id}`, data);
export const deleteProfileUpdateRequest = (id) => api.delete(`/api/profile-update-requests/${id}`);

// ── CCTV & CAMERAS ────────────────────────────────────────────
export const acknowledgeEmergencyAlert = (id) => api.post(`/api/emergency-alerts/${id}/acknowledge`);
export const getCCTVAlerts = () => api.get('/api/alerts');
export const resolveCCTVAlert = (id) => api.put(`/api/alerts/${id}/resolve`, {});

// ── VISITOR PRE-REGISTRATION (Resident pre-registers visitor before arrival) ──
export const createVisitorPreRegistration = (data) => api.post('/api/visitors', data);
export const getVisitorRegistrations = (status = null) => {
  const config = status ? { params: { status } } : {};
  return api.get('/api/registrations', config);
};

// ── PRE-REGISTER MODULE (new spec — /api/pre-register) ───────
export const getPreRegistrations = () => api.get('/api/pre-register');
export const preRegisterVisitor = (data) => api.post('/api/pre-register', data);
export const cancelPreRegistration = (id) => api.delete(`/api/pre-register/${id}`);
export const generateVisitorInvite = (data) => api.post('/api/pre-register/invite', data);
export const getRegistrationStatus = (regId) => api.get(`/api/registrations/${regId}`);
export const approveGateVisitor = (regId, data) => api.put(`/api/registrations/${regId}/approve`, data);
export const rejectGateVisitor = (regId, data) => api.put(`/api/registrations/${regId}/reject`, data);

// ── GATE SELF-REGISTRATION (Visitor registers at gate kiosk) ──────────────
export const getGateSocieties = () => api.get('/api/gate/societies');
export const registerVisitorAtGate = (data) => api.post('/api/gate/register', data);
export const checkGateRegistrationStatus = (societyId, registrationId) => 
  api.get(`/api/gate/status/${societyId}/${registrationId}`);

// ── SEARCH ────────────────────────────────────────────────────
export const globalSearch = (query) => api.get('/api/search', { params: { q: query } });
export const searchResidents = (query) => api.get('/api/search/residents', { params: { q: query } });

// ── WHATSAPP & NOTIFICATIONS CONFIG ──────────────────────────
export const getWhatsAppConfig = () => api.get('/api/whatsapp/config');
export const saveWhatsAppConfig = (data) => api.put('/api/whatsapp/config', data);
export const sendTestWhatsApp = (data) => api.post('/api/whatsapp/test', data);
export const sendBillReminders = () => api.post('/api/whatsapp/bill-reminders');

// ── POLLING (EXTENDED) ────────────────────────────────────────
export const getPolls = () => api.get('/api/polls');

// ── INVOICE & RECEIPTS ────────────────────────────────────────
// New resident invoice endpoint from backend team
// GET /api/bills/{bill_id}/invoice
export const getBillInvoice = (billId) => api.get(`/api/bills/${billId}/invoice`);

// Backward-compatible aliases used by existing screens
export const getInvoice = (billId) => getBillInvoice(billId);
export const getInvoiceData = (billId) => getBillInvoice(billId);
export const generateInvoice = (billId) => getBillInvoice(billId);

// Legacy admin invoices endpoint (if still used elsewhere)
export const getInvoices = () => api.get('/api/invoices');

// ── MARKETPLACE (Buy/Sell/Exchange) ───────────────────────────
/**
 * Get marketplace listings with optional category filter
 * @param {string} category - Optional: "For Sale", "Wanted", "Exchange", "Free"
 */
export const getMarketplaceListings = (category = null) => {
  const config = category ? { params: { category } } : {};
  return api.get('/api/marketplace', config);
};

/**
 * Get detailed view of a single marketplace listing with comments
 * @param {number} id - Listing ID
 */
export const getMarketplaceDetail = (id) => api.get(`/api/marketplace/${id}`);

/**
 * Create a new marketplace listing with title, description, price, category, media
 * @param {object} data - { title, description, category, price, price_negotiable, media }
 */
export const createListing = (data) => api.post('/api/marketplace', data);

/**
 * Like/Unlike a marketplace listing
 * @param {number} id - Listing ID
 */
export const likeMarketplacePost = (id) => api.post(`/api/marketplace/${id}/like`);

/**
 * Toggle sold status of a listing
 * @param {number} id - Listing ID
 */
export const toggleSoldStatus = (id) => api.put(`/api/marketplace/${id}/sold`);

/**
 * Get all comments on a marketplace listing
 * @param {number} id - Listing ID
 */
export const getMarketplaceComments = (id) => api.get(`/api/marketplace/${id}/comments`);

/**
 * Post a comment on a marketplace listing
 * @param {number} id - Listing ID
 * @param {string} content - Comment text
 */
export const postMarketplaceComment = (id, content) => 
  api.post(`/api/marketplace/${id}/comments`, { content });

/**
 * [ADMIN] Pin/Unpin a marketplace listing to top
 * @param {number} id - Listing ID
 */
export const adminPinPost = (id) => api.put(`/api/marketplace/${id}/pin`);

/**
 * [ADMIN] Edit a marketplace listing (title, description, price, category)
 * @param {number} id - Listing ID
 * @param {object} data - { title, description, category, price, price_negotiable }
 */
export const adminEditListing = (id, data) => api.put(`/api/marketplace/${id}`, data);

/**
 * [ADMIN] Delete a marketplace listing
 * @param {number} id - Listing ID
 */
export const adminDeleteListing = (id) => api.delete(`/api/marketplace/${id}`);

/**
 * [ADMIN] Delete a comment from a marketplace listing
 * @param {number} commentId - Comment ID
 */
export const adminDeleteMarketplaceComment = (commentId) => 
  api.delete(`/api/marketplace/comments/${commentId}`);

// ── MEDIA URL REFRESH ──────────────────────────────────────────
/**
 * Get a fresh signed URL for a media file (S3)
 * Used when photo_url or media_url expires (after 1 hour)
 * @param {string} key - Storage key like "visitors/gate_A101_123.jpg" or "marketplace/mp_12_456.jpg"
 * @returns {Promise} - { success, data: { url, expires_in } }
 */
export const getMediaUrl = (key) => 
  api.get('/api/media/url', { params: { key } });

export default api;
