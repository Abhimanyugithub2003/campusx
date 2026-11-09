import { io } from 'socket.io-client';

const API_BASE = '';
const ML_BASE = '/ml';

export const DEMO_STUDENTS = [
  { id: '1', name: 'Rahul Sharma', email: 'rahul@lpu.in', university: 'Lovely Professional University', role: 'Seller (Laptops, Tech)' },
  { id: '2', name: 'Sneha Patel', email: 'sneha@university.edu', university: 'University Campus', role: 'Seller (iPad, Design, Audio)' },
  { id: '3', name: 'Amit Kumar', email: 'amit@lpu.in', university: 'Lovely Professional University', role: 'Buyer (Tech) / Seller (Cycles)' },
  { id: '4', name: 'Priya Verma', email: 'priya@university.edu', university: 'University Campus', role: 'Buyer (Books) / Bidder (Auctions)' },
  { id: '5', name: 'Vikram Singh', email: 'vikram@campusx.edu', university: 'CampusX Tech Institute', role: 'Seller (Events, Sports)' },
];

export function getAuthToken() {
  return localStorage.getItem('campusx_token');
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('campusx_token', token);
  } else {
    localStorage.removeItem('campusx_token');
  }
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem('campusx_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user) {
  if (user) {
    localStorage.setItem('campusx_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('campusx_user');
  }
}

async function request(url, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let errMsg = 'Request failed';
    try {
      const data = await res.json();
      errMsg = data.error || errMsg;
    } catch {
      errMsg = res.statusText;
    }
    throw new Error(errMsg);
  }
  return res.json();
}

export const api = {
  // Auth
  sendOtp: (email, purpose = 'register') =>
    request('/api/auth/send-otp', { method: 'POST', body: JSON.stringify({ email, purpose }) }),
  verifyOtp: (email, otp, purpose = 'register') =>
    request('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp, purpose }) }),
  register: (data) =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (email, password) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  getMe: () => request('/api/auth/me'),
  getSeller: (id) => request(`/api/auth/sellers/${id}`),

  // Products
  getProducts: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/products${q ? '?' + q : ''}`);
  },
  getProduct: (id) => request(`/api/products/${id}`),
  createProduct: (data) => request('/api/products', { method: 'POST', body: JSON.stringify(data) }),
  deleteProduct: (id) => request(`/api/products/${id}`, { method: 'DELETE' }),
  getMyPrivateProducts: () => request('/api/products/mine/private'),

  // Auctions
  getAuctions: () => request('/api/auctions'),
  getAuction: (id) => request(`/api/auctions/${id}`),
  createAuction: (data) => request('/api/auctions', { method: 'POST', body: JSON.stringify(data) }),
  placeBid: (id, amount) => request(`/api/auctions/${id}/bid`, { method: 'POST', body: JSON.stringify({ amount }) }),

  // Negotiations
  getNegotiations: () => request('/api/negotiations'),
  getNegotiation: (id) => request(`/api/negotiations/${id}`),
  createNegotiation: (productId, amount) =>
    request('/api/negotiations', { method: 'POST', body: JSON.stringify({ product_id: productId, amount }) }),
  sendCounterOffer: (id, amount) =>
    request(`/api/negotiations/${id}/offer`, { method: 'POST', body: JSON.stringify({ amount }) }),
  acceptOffer: (id) => request(`/api/negotiations/${id}/accept`, { method: 'POST' }),
  rejectOffer: (id) => request(`/api/negotiations/${id}/reject`, { method: 'POST' }),
  getChat: (id) => request(`/api/negotiations/${id}/chat`),
  sendChatMessage: (id, text) =>
    request(`/api/negotiations/${id}/chat`, { method: 'POST', body: JSON.stringify({ text }) }),

  // Orders & Payment
  buyFixed: (productId) => request(`/api/orders/buy/${productId}`, { method: 'POST' }),
  getOrders: () => request('/api/orders'),
  getOrder: (id) => request(`/api/orders/${id}`),
  initiatePayment: (orderId) => request(`/api/orders/${orderId}/pay`, { method: 'POST' }),
  verifyPayment: (orderId, data = {}) =>
    request(`/api/orders/${orderId}/verify`, { method: 'POST', body: JSON.stringify(data) }),
  getContact: (orderId) => request(`/api/orders/${orderId}/contact`),
  setMeeting: (orderId, location, time) =>
    request(`/api/orders/${orderId}/meeting`, { method: 'POST', body: JSON.stringify({ location, time }) }),
  confirmHandover: (orderId) => request(`/api/orders/${orderId}/confirm`, { method: 'POST' }),
  getReceipt: (orderId) => request(`/api/orders/${orderId}/receipt`),

  // Reviews
  createReview: (data) => request('/api/reviews', { method: 'POST', body: JSON.stringify(data) }),
  getUserReviews: (userId) => request(`/api/reviews/user/${userId}`),

  // Upload image
  uploadImage: async (file) => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!res.ok) throw new Error('Image upload failed');
    return res.json();
  },

  // ML Service
  getRecommendations: (userId) => request(`${ML_BASE}/recommend/${userId}`),
  getTrustScore: (userId) => request(`${ML_BASE}/trust/${userId}`),
  getCategoryStats: () => request(`${ML_BASE}/analytics/category-stats`),
  getMonthlyRevenue: () => request(`${ML_BASE}/analytics/monthly-revenue`),
  getTopSellers: () => request(`${ML_BASE}/analytics/top-sellers`),
  getAuctionRate: () => request(`${ML_BASE}/analytics/auction-success-rate`),
  getLowConversion: () => request(`${ML_BASE}/analytics/high-views-low-conversion`),
};

let socket = null;
export function getSocket() {
  const token = getAuthToken();
  if (!token) return null;
  if (!socket) {
    socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function resetSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

