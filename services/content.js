const { requestJson } = require('./http');

const resolveContentUrl = (baseUrl, contentId) => {
  if (!baseUrl) return null;
  if (baseUrl.includes('{id}')) return baseUrl.replace('{id}', encodeURIComponent(contentId));
  const trimmed = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${trimmed}/${encodeURIComponent(contentId)}`;
};

const normalizeContent = (payload) => {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  return payload.content || payload.body || payload.text || payload.html || '';
};

const fetchLessonContent = async (contentId) => {
  const baseUrl = process.env.CONTENT_API_URL;
  if (!baseUrl) return '';
  const url = resolveContentUrl(baseUrl, contentId);
  const data = await requestJson(url, { method: 'GET' });
  return normalizeContent(data);
};

module.exports = { fetchLessonContent };
