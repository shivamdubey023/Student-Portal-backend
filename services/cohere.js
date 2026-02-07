const { requestJson } = require('./http');

const cohereGenerate = async (prompt, maxTokens = 400) => {
  const apiKey = process.env.COHERE_API_KEY;
  if (!apiKey) return null;
  const body = JSON.stringify({
    model: 'command-r',
    prompt,
    max_tokens: maxTokens,
    temperature: 0.3
  });
  const data = await requestJson('https://api.cohere.ai/v1/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }
  }, body);
  const generations = data.generations || [];
  return generations[0]?.text?.trim() || null;
};

const generateOutline = async (content) => {
  const prompt = [
    'Create a concise lesson outline from the content below.',
    'Use bullet points and keep it short.',
    '',
    content
  ].join('\n');
  return cohereGenerate(prompt, 300);
};

const rephraseContent = async (content) => {
  const prompt = [
    'Rephrase the following lesson content for clarity and readability.',
    'Keep meaning unchanged and avoid adding new facts.',
    '',
    content
  ].join('\n');
  return cohereGenerate(prompt, 800);
};

const generateCourseContent = async (title, description) => {
  const prompt = [
    'You are creating course content.',
    'Return JSON only.',
    'Schema: { "modules": [ { "title": "Module title", "lessons": [ { "title": "Lesson title", "content": "Lesson text content" } ] } ] }',
    'Constraints: 2 modules, each with 3 lessons. Keep content short and practical.',
    '',
    `Course Title: ${title}`,
    `Course Description: ${description || ''}`
  ].join('\n');
  const raw = await cohereGenerate(prompt, 900);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const evaluateAssignment = async ({ title, description, instructions, repoUrl, prUrl, marks }) => {
  const prompt = [
    'You are grading a student assignment submission.',
    'Return JSON only: { "score": number, "status": "Approved"|"Rejected", "feedback": "short feedback" }',
    'Score must be between 0 and the max marks.',
    `Max marks: ${marks || 10}`,
    '',
    `Assignment Title: ${title}`,
    `Assignment Description: ${description}`,
    `Instructions: ${instructions}`,
    `Repository URL: ${repoUrl}`,
    `Pull Request URL: ${prUrl || ''}`
  ].join('\n');
  const raw = await cohereGenerate(prompt, 300);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

module.exports = { generateOutline, rephraseContent, generateCourseContent, evaluateAssignment };
