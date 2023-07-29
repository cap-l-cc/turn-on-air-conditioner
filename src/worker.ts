import { type Handler, scheduled, hono } from './handler';

const app: Handler = {
  scheduled,
  fetch: hono.fetch,
};

export default app;
