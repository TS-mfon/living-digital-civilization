import type { IncomingMessage, ServerResponse } from 'node:http';
import dispatch from '../[...route].js';

type VercelRequest = IncomingMessage & { body?: unknown };

export default async function handler(request: VercelRequest, response: ServerResponse): Promise<void> {
  try {
    await dispatch(request, response);
  } catch {
    response.statusCode = 500;
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ error: 'internal_error' }));
  }
}
