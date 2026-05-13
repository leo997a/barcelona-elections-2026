import { proxyBridgeGet } from '../_lib/reoBridge.js';
import { sendMethodNotAllowed, type ServerlessRequest, type ServerlessResponse } from '../_lib/http.js';

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end('');
    return;
  }

  if (req.method !== 'GET') {
    return sendMethodNotAllowed(res, 'GET, OPTIONS', { error: 'Method not allowed' });
  }

  return proxyBridgeGet(res, '/api/match');
}
