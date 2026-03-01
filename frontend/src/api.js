// All API requests go to /api — Vite proxies in dev, same origin in production
const API_BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (res.redirected) {
    // Handle the 307 redirect from /a/{ident}
    const redirectPath = new URL(res.url).pathname.replace(/^\/api/, '');
    return request(redirectPath, { method: 'GET' });
  }
  if (!res.ok) {
    // 204 No Content has no body
    if (res.status === 204) return null;
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  // 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

// ── Items ──────────────────────────────────────────────────────────

export function listRootItems() {
  return request('/items');
}

export function getItem(id) {
  return request(`/items/${id}`);
}

export function lookupByIdent(ident) {
  return request(`/a/${ident}`);
}

export function createItem(data) {
  return request('/items', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateItem(id, data) {
  return request(`/items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function getItemPath(id) {
  return request(`/items/${id}/path`);
}

export function searchItems(query) {
  return request(`/items/search?q=${encodeURIComponent(query)}`);
}

export function recentItems() {
  return request('/items/recent');
}

// ── Metadata ───────────────────────────────────────────────────────

export function listMetadataAttributes() {
  return request('/metadata-attributes/');
}

export function createMetadataAttribute(data) {
  return request('/metadata-attributes/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function reorderMetadataAttributes(order) {
  return request('/metadata-attributes/reorder', {
    method: 'PUT',
    body: JSON.stringify({ order }),
  });
}

export function deleteMetadataAttribute(id) {
  return request(`/metadata-attributes/${id}`, {
    method: 'DELETE',
  });
}

export function setItemMetadata(itemId, values) {
  return request(`/items/${itemId}/metadata`, {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export function deleteItemMetadata(itemId, attributeId) {
  return request(`/items/${itemId}/metadata/${attributeId}`, {
    method: 'DELETE',
  });
}

// ── Ident Generator ────────────────────────────────────────────────

export function generateIdent(data) {
  return request('/ident/generate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Settings ───────────────────────────────────────────────────────

export function listSettings() {
  return request('/settings/');
}

export function getSetting(key) {
  return request(`/settings/${encodeURIComponent(key)}`);
}

export function setSetting(key, value) {
  return request(`/settings/${encodeURIComponent(key)}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
}
