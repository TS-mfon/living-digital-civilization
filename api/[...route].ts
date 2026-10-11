import type { IncomingMessage, ServerResponse } from 'node:http';
import { app } from '../apps/api/src/server.js';

type VercelRequest = IncomingMessage & { body?: unknown };

export default async function handler(request: VercelRequest, response: ServerResponse): Promise<void> {
  try {
    const originalUrl = request.url ?? '/';
    const url = originalUrl.replace(/^\/api(?=\/|\?)/, '') || '/';
    const body = request.body;
    const payload = body === undefined ? undefined : typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
    const result = await app.inject({
      method: request.method ?? 'GET',
      url,
      headers: request.headers,
      payload,
    });
    response.statusCode = result.statusCode;
    for (const [name, value] of Object.entries(result.headers)) {
      if (value !== undefined) response.setHeader(name, value as string | number | readonly string[]);
    }
    response.end(result.rawPayload);
  } catch {
    response.statusCode = 500;
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ error: 'internal_error' }));
  }
}
