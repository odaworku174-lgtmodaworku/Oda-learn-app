import type { IncomingMessage, ServerResponse } from 'http';
import { createExpressApp } from '../server.ts';

let cachedApp: Awaited<ReturnType<typeof createExpressApp>> | null = null;

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!cachedApp) {
    cachedApp = await createExpressApp();
  }
  return cachedApp(req, res);
}
