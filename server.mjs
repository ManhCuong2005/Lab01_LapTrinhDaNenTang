import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';

const file = new URL('./surveys.json', import.meta.url);
const port = Number(process.env.PORT || 8787);
async function readSurveys() {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
function reply(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Idempotency-Key', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' });
  res.end(JSON.stringify(data));
}
createServer(async (req, res) => {
  if (req.url !== '/api/surveys') return reply(res, 404, { error: 'Not found' });
  if (req.method === 'OPTIONS') return reply(res, 204, {});
  if (req.method === 'GET') return reply(res, 200, await readSurveys());
  if (req.method !== 'POST') return reply(res, 405, { error: 'Method not allowed' });
  try {
    let body = '';
    for await (const chunk of req) { body += chunk; if (body.length > 8_000_000) throw new Error('Payload too large'); }
    const survey = JSON.parse(body);
    if (typeof survey.id !== 'string' || !survey.id || !survey.building || !survey.room || !survey.createdAt) return reply(res, 400, { error: 'Invalid survey' });
    const surveys = await readSurveys();
    if (!surveys.some(item => item.id === survey.id)) {
      surveys.push(survey);
      await writeFile(file, JSON.stringify(surveys, null, 2), 'utf8');
    }
    return reply(res, 200, { id: survey.id });
  } catch (error) { return reply(res, 400, { error: String(error) }); }
}).listen(port, () => console.log(`Survey API: http://localhost:${port}/api/surveys`));
