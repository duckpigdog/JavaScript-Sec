import { Security } from './security.js';

export async function getOrderList(uid, page) {
  const { auth, t } = await Security.buildAuth(uid, page);
  const url = `./orders.php?ajax=1&debug=1&uid=${encodeURIComponent(uid)}&page=${encodeURIComponent(page)}&t=${encodeURIComponent(t)}&auth=${encodeURIComponent(auth)}`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  const data = await res.json();
  return data;
}
