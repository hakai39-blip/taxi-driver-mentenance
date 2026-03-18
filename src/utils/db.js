// 共有データベース (サーバーサイドAPI) の管理ユーティリティ

export const initDB = () => { }; // サーバーサイドで初期化済み

// 入力値の正規化 (ハイフン・スペース削除)
export const normalizePhone = (str) => str.replace(/[-\s\u3000]/g, '');
export const normalizeName = (str) => str.replace(/[\s\u3000]/g, '');

// 電話番号のバリデーション (正規化後、10桁または11桁の数字であること)
export const isValidPhone = (str) => {
  const normalized = normalizePhone(str);
  return /^\d{10,11}$/.test(normalized);
};

const api = async (path, method = 'GET', body = null) => {
  const options = { method, headers: {} };
  if (body) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const res = await fetch(path, options);
  return res.json();
};

export const getUsers = () => api('/api/users');
export const addUser = (user) => api('/api/users', 'POST', user);
export const getChecks = () => api('/api/checks');
export const addCheck = (check) => api('/api/checks', 'POST', check);
export const getStatus = () => api('/api/status');
export const updateStatus = (userId, data) => api(`/api/status/${userId}`, 'PATCH', data);
export const uploadVideo = (userId, videoData) => api('/api/upload-video', 'POST', { userId, videoData });
export const updateUser = (userId, userData) => api(`/api/users/${userId}`, 'PATCH', userData);
export const deleteUser = (userId) => api(`/api/users/${userId}`, 'DELETE');
