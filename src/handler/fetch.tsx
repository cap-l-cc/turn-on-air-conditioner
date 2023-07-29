import { Hono } from 'hono';
import { basicAuth } from 'hono/basic-auth';
import { HTTPException } from 'hono/http-exception';
import { cors } from 'hono/cors';
import type { Env } from './type';

export const hono = new Hono<{ Bindings: Env }>();

hono.get('/favicon.ico', (c) => c.notFound());
hono.use('*', cors({ origin: [''] }));
hono.use('*', async (c, next) => {
  const auth = basicAuth({ username: c.env.SITE_USERNAME, password: c.env.SITE_PASSWORD });
  await auth(c, next);
});

hono.get('/', (c) =>
  c.html(
    <html lang="ja">
      <p>Hono!</p>
    </html>,
  ),
);

hono.onError(async (err, c) => {
  if (err instanceof HTTPException && err.status === 401) {
    return c.json(
      {
        message: 'Authentication is required to access this page!',
      },
      401,
    );
  }

  return c.json(
    {
      message: 'Internal Server Error',
    },
    500,
  );
});
hono.notFound((c) => c.json({ message: 'The page you are looking for is not found.' }, 404));
