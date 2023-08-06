import { describe, expect, it } from 'vitest';
import { getWhatWeekOfMonth, isBannedHour, isWeekend } from './date';

describe('isWeekend', () => {
  it.each([0, 6])('should return true when given %i', (num) => {
    expect(isWeekend(num)).toBeTruthy();
  });

  it.each([-1, 1, 5, 7])('should return false when given %i', (num) => {
    expect(isWeekend(num)).toBeFalsy();
  });
});

describe('isBannedHour', () => {
  it.each([0, 1, 5, 6])('should return true when given %i', (num) => {
    expect(isBannedHour(num)).toBeTruthy();
  });

  it.each([-1, 7])('should return false when given %i', (num) => {
    expect(isBannedHour(num)).toBeFalsy();
  });
});

describe('getWhatWeekOfMonth', () => {
  it.each([
    [6, 28, 5],
    [6, 30, 5],
    [7, 1, 1],
  ])('What week of month for 2023/%i/%i is the %i', (month, day, whatWeek) => {
    // Dateの月は0-11
    const date = new Date(2023, month - 1, day);

    expect(getWhatWeekOfMonth(date)).toBe(whatWeek);
  });
});
