import { Hono } from 'hono';
import { basicAuth } from 'hono/basic-auth';
import { HTTPException } from 'hono/http-exception';
import { cors } from 'hono/cors';
import { html } from 'hono/html';
import { z } from 'zod';
import { format } from 'date-fns';
import { HtmlEscapedString } from 'hono/utils/html';
import clsx from 'clsx';
import type { Env } from './type';
import { getWhatWeekOfMonth } from '../lib/date';

export const hono = new Hono<{ Bindings: Env }>();

hono.get('/favicon.ico', (c) => c.notFound());
hono.use('*', cors({ origin: ['http://localhost:8787'] }));
hono.use('*', async (c, next) => {
  const auth = basicAuth({ username: c.env.SITE_USERNAME, password: c.env.SITE_PASSWORD });
  await auth(c, next);
});

// eslint-disable-next-line @typescript-eslint/naming-convention
const nonNullable = <T, _>(value: T): value is NonNullable<T> => value != null;

const dateSchema = z.object({
  year: z.number(),
  month: z.number(),
  dy: z.number(),
});
const timeSchema = z.object({ hour: z.number().min(0).max(24), minute: z.number().min(0).max(59) });
const tempSchema = z.number().min(0).max(100);
const airConditionerSettingsSchema = z.object({
  operationMode: z.enum(['COOL', 'HEAT']),
  settingsTemp: tempSchema,
});
const triggerSchema = z.object({
  time: timeSchema,
  roomTemp: tempSchema,
  airConditionerSettings: airConditionerSettingsSchema,
});
type Trigger = z.infer<typeof triggerSchema>;

const triggersSchema = z.array(triggerSchema);
const dateTriggerSchema = z.object({
  date: dateSchema,
  triggers: triggersSchema,
});
type DateTrigger = z.infer<typeof dateTriggerSchema>;

const AddOrEditTriggerForm = ({ trigger, className = '' }: { trigger?: Trigger; className?: string }) => (
  <form class={clsx(className, 'flex flex-col gap-2')} method="POST" action="/api/trigger/create">
    <div class="grid grid-cols-2 my-3 gap-3">
      <label class="font-medium" for="time">
        時刻
      </label>
      <input type="time" id="time" name="time" value={trigger ? `${trigger.time.hour}:${trigger.time.minute}` : '12:00'} required />
      <label class="font-medium" for="roomTemp">
        室温（℃）
      </label>
      <input type="number" id="roomTemp" name="roomTemp" value={trigger?.roomTemp ?? 0} required min="0" max="100" />
      <p class="font-medium">運転モード</p>
      <div class="flex flex-col gap-3">
        <label for="cool">
          <input
            type="radio"
            id="cool"
            name="operationMode"
            required
            checked={trigger?.airConditionerSettings.operationMode === 'COOL' || true}
            value="COOL"
          />
          冷房
        </label>
        <label for="heat">
          <input
            type="radio"
            id="heat"
            name="operationMode"
            checked={trigger?.airConditionerSettings.operationMode === 'HEAT'}
            value="HEAT"
          />
          暖房
        </label>
      </div>
      <label class="font-medium" for="settingsTemp">
        設定温度（℃）
      </label>
      <input type="number" id="settingsTemp" name="settingsTemp" required value={0} min={0} max={100} />
    </div>
    <div class="flex flex-row gap-3 justify-center">
      <button
        class="text-gray-900 font-medium bg-white border border-gray-200 px-5 py-2.5 hover:bg-gray-100 hover:text-blue-700 focus:ring-4 focus:ring-gray-200 rounded-lg focus:outline-none"
        type="button"
        onclick="redirectToTop()"
      >
        戻る
      </button>
      <button
        class="text-white font-medium bg-blue-700 px-5 py-2.5 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 rounded-lg focus:outline-none"
        type="submit"
      >
        保存
      </button>
    </div>
    {html` <script>
      const redirectToTop = () => {
        location.href = '/';
      };
    </script>`}
  </form>
);

const TriggersList = ({ triggers, className = '' }: { triggers: Trigger[]; className?: string }) => (
  <table class={clsx(className, 'w-full text-sm text-left text-gray-500 text-center')}>
    <thead class="text-xs text-gray-700 bg-gray-50">
      <tr>
        <th scope="col" class="px-6 py-3">
          時刻
        </th>
        <th scope="col" class="px-6 py-3">
          基準室温
        </th>
        <th scope="col" class="px-6 py-3">
          運転モード
        </th>
        <th scope="col" class="px-6 py-3">
          設定温度
        </th>
        <th scope="col" class="px-6 py-3">
          操作
        </th>
      </tr>
    </thead>
    <tbody>
      {triggers.length === 0 ? (
        <tr>
          <td colspan={5}>
            <div class="flex justify-center p-4 mb-4 text-sm text-blue-800 rounded-lg bg-blue-50 " role="alert">
              <svg
                class="flex-shrink-0 inline w-4 h-4 mr-3"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z" />
              </svg>
              <p>保存されているトリガーはありません。</p>
            </div>
          </td>
        </tr>
      ) : (
        triggers.map((n) => (
          <tr class="bg-white border-b">
            <td class="px-6 py-4 font-medium">
              {n.time.hour.toString().padStart(2, '0')}:{n.time.minute.toString().padStart(2, '0')}
            </td>
            <td class="px-6 py-4">{n.roomTemp}℃</td>
            <td class="px-6 py-4">{n.airConditionerSettings.operationMode}</td>
            <td class="px-6 py-4">{n.airConditionerSettings.settingsTemp}℃</td>
            <td class="px-6 py-4 flex flex-row gap-4">
              <a class="inline-block mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 576 512">
                  <path d="M402.6 83.2l90.2 90.2c3.8 3.8 3.8 10 0 13.8L274.4 405.6l-92.8 10.3c-12.4 1.4-22.9-9.1-21.5-21.5l10.3-92.8L388.8 83.2c3.8-3.8 10-3.8 13.8 0zm162-22.9l-48.8-48.8c-15.2-15.2-39.9-15.2-55.2 0l-35.4 35.4c-3.8 3.8-3.8 10 0 13.8l90.2 90.2c3.8 3.8 10 3.8 13.8 0l35.4-35.4c15.2-15.3 15.2-40 0-55.2zM384 346.2V448H64V128h229.8c3.2 0 6.2-1.3 8.5-3.5l40-40c7.6-7.6 2.2-20.5-8.5-20.5H48C21.5 64 0 85.5 0 112v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V306.2c0-10.7-12.9-16-20.5-8.5l-40 40c-2.2 2.3-3.5 5.3-3.5 8.5z" />
                </svg>
              </a>
              <a class="inline-block mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 448 512">
                  <path d="M135.2 17.7C140.6 6.8 151.7 0 163.8 0H284.2c12.1 0 23.2 6.8 28.6 17.7L320 32h96c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 96 0 81.7 0 64S14.3 32 32 32h96l7.2-14.3zM32 128H416V448c0 35.3-28.7 64-64 64H96c-35.3 0-64-28.7-64-64V128zm96 64c-8.8 0-16 7.2-16 16V432c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16V432c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16V432c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16z" />
                </svg>
              </a>
            </td>
          </tr>
        ))
      )}
      <tr>
        <td colspan={5}>
          <div class="mx-auto my-3 w-10 border border-black rounded-full flex justify-center">
            <a class="p-2" href="/trigger/create">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24">
                <path d="M24 10h-10v-10h-4v10h-10v4h10v10h4v-10h10z" />
              </svg>
            </a>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
);

const DateTriggersList = ({ dateTriggers }: { dateTriggers: DateTrigger[] }) =>
  dateTriggers.length === 0 ? (
    <div class="flex items-center p-4 mb-4 text-sm text-blue-800 rounded-lg bg-blue-50 " role="alert">
      <svg
        class="flex-shrink-0 inline w-4 h-4 mr-3"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z" />
      </svg>
      <div>保存されている日付はありません。</div>
    </div>
  ) : (
    <>
      {dateTriggers.map((n) => (
        <p>{n}</p>
      ))}
    </>
  );

const Layout = ({
  children,
  title = 'エアコンを自動で起動しよう',
  description = 'SwitchBotを利用してエアコンを自動で起動させる設定を行います、',
}: {
  children: HtmlEscapedString | HtmlEscapedString[];
  title?: string;
  description?: string;
}) => (
  <html lang="ja">
    <body>
      <head>
        <title>{title}</title>
        <meta name="description" value={description} />
        <script src="https://cdn.tailwindcss.com" />
      </head>
      <main class="container mx-auto">
        <h1 class="text-2xl font-bold text-center my-2">{title}</h1>
        <div class="mx-60 my-3">{children}</div>
      </main>
    </body>
  </html>
);

hono.get('/', async (c) => {
  const triggerKeys = await c.env.RULE.list({ prefix: 'trigger:', limit: 20 });
  const triggers = await Promise.all(triggerKeys.keys.map(async (key) => c.env.RULE.get(key.name, { type: 'json' }))).then((arr) =>
    arr
      .map((v) => triggerSchema.safeParse(v))
      .map((v) => (v.success ? v.data : undefined))
      .filter(nonNullable),
  );
  const now = new Date();
  const dateTriggerKeys = await c.env.RULE.list({ prefix: `date:${format(now, 'yyyy-MM')}:${getWhatWeekOfMonth(now)}:` });
  const dateTriggers = await Promise.all(dateTriggerKeys.keys.map(async (key) => c.env.RULE.get(key.name))).then((arr) =>
    arr
      .map((v) => dateTriggerSchema.safeParse(v))
      .map((v) => (v.success ? v.data : undefined))
      .filter(nonNullable),
  );

  return c.html(
    <Layout title="エアコンを自動で起動しよう">
      <section>
        <h2 class="text-xl font-semibold my-2">初期トリガー</h2>
        <p>特別トリガーが指定されていない日は、以下の内容で判定します。</p>
        <TriggersList className="my-3" triggers={triggers} />
      </section>
      <section>
        <h2 class="text-xl font-semibold my-2">日付with</h2>
        <p>今週と来週の設定一覧です。</p>
        <p>トリガーが明示的に設定されていない日は、初期トリガーの内容で判定します。</p>
        <DateTriggersList {...{ dateTriggers }} />
      </section>
    </Layout>,
  );
});

hono.get('/trigger/create', (c) =>
  c.html(
    <Layout title="初期トリガーを新規作成">
      <AddOrEditTriggerForm className="max-w-md mx-auto" />
    </Layout>,
  ),
);

hono.get('/trigger/create/completed', (c) =>
  c.html(
    <Layout>
      <div class="flex items-center p-4 mb-4 text-sm text-green-800 rounded-lg bg-green-50" role="alert">
        <svg
          class="flex-shrink-0 inline w-4 h-4 mr-3"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z" />
        </svg>
        <div>トリガーを追加しました。</div>
      </div>
      <button
        class="text-white font-medium bg-blue-700 px-5 py-2.5 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 rounded-lg focus:outline-none"
        onclick="redirectToTop();"
      >
        戻る
      </button>
      {html` <script>
        const redirectToTop = () => {
          location.href = '/';
        };
      </script>`}
    </Layout>,
  ),
);

hono.post('/api/trigger/create', async (c) => {
  try {
    const schema = z.object({
      time: z.string().regex(/^(0[6-9]|1[0-9]|2[0-3]):[0-5][0-9]$/),
      roomTemp: z.string().regex(/^(0|[1-9]?[0-9]|100)$/),
      operationMode: z.enum(['COOL', 'HEAT']),
      settingsTemp: z.string().regex(/^(0|[1-9]?[0-9]|100)$/),
    });
    const data = await c.req.parseBody();
    const res = schema.safeParse(data);
    if (!res.success) {
      return c.json('Unexpected Schema!', 400);
    }

    const input = res.data;
    const newTrigger: Trigger = {
      time: {
        hour: parseInt(input.time.substring(0, 2), 10),
        minute: parseInt(input.time.substring(3), 10),
      },
      roomTemp: parseInt(input.roomTemp, 10),
      airConditionerSettings: {
        operationMode: input.operationMode,
        settingsTemp: parseInt(input.settingsTemp, 10),
      },
    };
    const key = `${newTrigger.time.hour}${newTrigger.time.minute}`;
    c.executionCtx.waitUntil(c.env.RULE.put(`trigger:${key}`, JSON.stringify(newTrigger)));

    return c.redirect('/trigger/create/completed');
  } catch (err) {
    return c.json({ message: 'Error while parsing your data.' }, 400);
  }
});

hono.onError(async (err, c) => {
  if (err instanceof HTTPException && err.status === 401) {
    return c.json({ message: 'Authentication is required to access this page!' }, 401);
  }

  console.error(err);

  return c.json({ message: 'Internal Server Error' }, 500);
});
hono.notFound((c) => c.json({ message: 'The page you are looking for is not found.' }, 404));
