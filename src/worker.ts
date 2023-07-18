import { utcToZonedTime } from 'date-fns-tz';
import { isHoliday } from '@holiday-jp/holiday_jp';
import { formatDate, isBannedHour, isWeekend } from './date';
import { filterValidTrigger, type Trigger } from './pair';
import { SwitchBotClient } from './switchbot';

export type Env = {
  TURN_ON_AIR_CON_HISTORY: KVNamespace;

  SWITCHBOT_TOKEN: string;
  SWITCHBOT_CLIENT_SECRET: string;
  METER_DEVICE_ID: string;
  AIR_CONDITIONER_DEVICE_ID: string;
};

const TIME_ZONE = 'Asia/Tokyo';

const TRIGGERS: readonly Trigger[] = [
  { hour: 16, temp: 38 },
  { hour: 17, temp: 35 },
  { hour: 18, temp: 33 },
];

/**
 * 与えられた日付においてエアコンをすでにこのプログラムによってつけたかどうかを返す
 * @param date 確認したい日付
 * @param kv Cloudflare KVのインスタンス
 * @returns 与えられた日付においてエアコンをすでにこのプログラムによってつけたかどうか
 */
const isAlreadyTurnedOnToday = async (date: string, kv: KVNamespace) => kv.get(date).then((v) => !!v);

const worker: ExportedHandler<Env> = {
  async scheduled(_ctrl, env, ctx) {
    const now = utcToZonedTime(new Date(), TIME_ZONE);
    if (isWeekend(now.getDay()) || isHoliday(now)) return;
    if (isBannedHour(now.getHours())) return;
    const formattedDate = formatDate(now);
    if (await isAlreadyTurnedOnToday(formattedDate, env.TURN_ON_AIR_CON_HISTORY)) return;

    const triggerTemps = [...new Set(filterValidTrigger(TRIGGERS, now.getHours()).map((t) => t.temp))];
    if (triggerTemps.length === 0) return;

    const client = new SwitchBotClient(env.SWITCHBOT_TOKEN, env.SWITCHBOT_CLIENT_SECRET);
    const actualTemp = await client.getMeterStatus(env.METER_DEVICE_ID).then((stat) => stat.temperature);
    const isTempHigherThanTriggers = !!triggerTemps.find((triggerTemp) => actualTemp >= triggerTemp);
    if (!isTempHigherThanTriggers) return;

    ctx.waitUntil(client.turnOnAirConditioner(env.AIR_CONDITIONER_DEVICE_ID, 28));
    // 1日でKVに書き込んだものを削除
    ctx.waitUntil(env.TURN_ON_AIR_CON_HISTORY.put(formattedDate, 'done!', { expirationTtl: 60 * 60 * 24 }));
  },
};

export default worker;
