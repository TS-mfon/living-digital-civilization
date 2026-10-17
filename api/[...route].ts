import type { IncomingMessage, ServerResponse } from 'node:http';

type VercelRequest = IncomingMessage & { body?: unknown };

export default async function handler(request: VercelRequest, response: ServerResponse): Promise<void> {
  try {
    const { app } = await import('../apps/api/src/server.js');
    const originalUrl = request.url ?? '/';
    const url = originalUrl.replace(/^\/api(?=\/|\?)/, '') || '/';
    if ((request.method ?? 'GET') === 'GET' && url.split('?')[0] === '/v1/stream') {
      await app.ready();
      if (response.destroyed || response.writableEnded) return;
      request.url = url;
      return await new Promise<void>((resolve, reject) => {
        const cleanup = () => {
          response.off('close', finish);
          response.off('finish', finish);
          response.off('error', finish);
        };
        const finish = () => { cleanup(); resolve(); };
        response.once('close', finish);
        response.once('finish', finish);
        response.once('error', finish);
        try {
          app.routing(request, response);
        } catch (error) {
          cleanup();
          reject(error);
        }
      });
    }
    const body = request.body;
    const payload = body === undefined ? undefined : typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
    // Vercel has already parsed the body. Re-serialization can change its byte
    // length, so let inject calculate framing for the payload it actually reads.
    const headers = { ...request.headers };
    delete headers['content-length'];
    delete headers['transfer-encoding'];
    const result = await app.inject({
      method: request.method ?? 'GET',
      url,
      headers,
      payload,
    });
    response.statusCode = result.statusCode;
    for (const [name, value] of Object.entries(result.headers)) {
      if (value !== undefined) response.setHeader(name, value as string | number | readonly string[]);
    }
    response.end(result.rawPayload);
  } catch (error) {
    console.error('API function initialization failed', error);
    if (response.destroyed || response.writableEnded) return;
    if (response.headersSent) {
      response.destroy();
      return;
    }
    response.statusCode = 500;
    response.setHeader('content-type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ error: 'internal_error' }));
  }
}
