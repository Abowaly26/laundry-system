const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  if (config.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  let response;
  
  // معالجة أخطاء الاتصال بالشبكة
  try {
    response = await fetch(`${API_BASE}${endpoint}`, config);
  } catch (networkError) {
    console.error('Network error:', networkError);
    throw new Error('فشل الاتصال بالخادم. تأكد من أن الخادم يعمل على المنفذ 5000');
  }

  // معالجة حالة عدم التصريح
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('غير مصرح - يرجى تسجيل الدخول');
  }

  // محاولة قراءة البيانات بصيغة JSON
  let data;
  try {
    data = await response.json();
  } catch (parseError) {
    console.error('JSON parse error:', parseError);
    data = null;
  }

  // معالجة الأخطاء من الخادم
  if (!response.ok) {
    const errorMessage = data?.message || data?.error || 'حدث خطأ في الاتصال';
    const error = new Error(errorMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  // إرجاع البيانات كما هي (السيرفر بيرجع { success, data, message })
  return data;
}

function buildQuery(params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, value);
    }
  });
  const str = query.toString();
  return str ? `?${str}` : '';
}

// ===== Auth =====
export const authAPI = {
  login: (credentials) =>
    request('/auth/login', { method: 'POST', body: credentials }),
  getMe: () =>
    request('/auth/me'),
};

// ===== Customers =====
export const customersAPI = {
  getAll: (params = {}) =>
    request(`/customers${buildQuery(params)}`),
  getById: (id) =>
    request(`/customers/${id}`),
  create: (data) =>
    request('/customers', { method: 'POST', body: data }),
  update: (id, data) =>
    request(`/customers/${id}`, { method: 'PUT', body: data }),
  delete: (id) =>
    request(`/customers/${id}`, { method: 'DELETE' }),
  search: (query) =>
    request(`/customers/search${buildQuery({ q: query })}`),
};

// ===== Services =====
export const servicesAPI = {
  getAll: (params = {}) =>
    request(`/services${buildQuery(params)}`),
  getById: (id) =>
    request(`/services/${id}`),
  create: (data) =>
    request('/services', { method: 'POST', body: data }),
  update: (id, data) =>
    request(`/services/${id}`, { method: 'PUT', body: data }),
  delete: (id) =>
    request(`/services/${id}`, { method: 'DELETE' }),
};

// ===== Item Types & Pricing Matrix =====
export const itemTypesAPI = {
  getAll: () =>
    request('/item-types'),
  create: (data) =>
    request('/item-types', { method: 'POST', body: data }),
  update: (id, data) =>
    request(`/item-types/${id}`, { method: 'PUT', body: data }),
  delete: (id) =>
    request(`/item-types/${id}`, { method: 'DELETE' }),
};

// ===== Orders =====
export const ordersAPI = {
  getAll: (params = {}) =>
    request(`/orders${buildQuery(params)}`),
  getById: (id) =>
    request(`/orders/${id}`),
  create: (data) =>
    request('/orders', { method: 'POST', body: data }),
  update: (id, data) =>
    request(`/orders/${id}`, { method: 'PUT', body: data }),
  delete: (id) =>
    request(`/orders/${id}`, { method: 'DELETE' }),
  track: (trackingCode) =>
    request(`/orders/track/${trackingCode}`),
  getWorkloadStatus: () =>
    request('/orders/workload/status'),
  getWorkloadTimeline: (date) =>
    request(`/orders/workload/timeline${date ? `?date=${date}` : ''}`),
  getWeeklyWorkload: () =>
    request('/orders/workload/weekly'),
};

// ===== Items =====
export const itemsAPI = {
  getById: (id) =>
    request(`/items/${id}`),
  updateStatus: (id, status) =>
    request(`/items/${id}/status`, { method: 'PUT', body: { status } }),
  scanQR: (code) =>
    request(`/items/scan/${code}`),
  advanceStatus: (id) =>
    request(`/items/${id}/advance`, { method: 'PUT' }),
};

// ===== Payments =====
export const paymentsAPI = {
  getAll: (params = {}) =>
    request(`/payments${buildQuery(params)}`),
  create: (data) =>
    request('/payments', { method: 'POST', body: data }),
  getByOrder: (orderId) =>
    request(`/payments/order/${orderId}`),
};

// ===== Dashboard =====
export const dashboardAPI = {
  getStats: () =>
    request('/dashboard/stats'),
  getRevenue: (params = {}) =>
    request(`/dashboard/revenue${buildQuery(params)}`),
  getPopularServices: () =>
    request('/dashboard/popular-services'),
  getOverdue: () =>
    request('/dashboard/overdue'),
};

// ===== Users =====
export const usersAPI = {
  getAll: () =>
    request('/users'),
  create: (data) =>
    request('/users', { method: 'POST', body: data }),
  update: (id, data) =>
    request(`/users/${id}`, { method: 'PUT', body: data }),
  delete: (id) =>
    request(`/users/${id}`, { method: 'DELETE' }),
};

// ===== Customer Portal =====
export const portalAPI = {
  trackOrder: (query) =>
    request(`/portal/track${buildQuery(query)}`),
};

// ===== Laundries (Super Owner) =====
export const laundriesAPI = {
  getAll: () =>
    request('/laundries'),
  getById: (id) =>
    request(`/laundries/${id}`),
  create: (data) =>
    request('/laundries', { method: 'POST', body: data }),
  update: (id, data) =>
    request(`/laundries/${id}`, { method: 'PUT', body: data }),
  delete: (id) =>
    request(`/laundries/${id}`, { method: 'DELETE' }),
  getStats: (id) =>
    request(`/laundries/${id}/stats`),
};

export default request;
