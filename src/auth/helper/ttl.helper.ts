import type { StringValue } from 'ms';

export function asStringValue(value: string): StringValue {
  // ms admite: ms, s, m, h, d, w, y
  if (!/^\d+(ms|s|m|h|d|w|y)$/.test(value)) {
    throw new Error(`Invalid TTL format: "${value}" (use e.g. 15m, 7d, 1h)`);
  }
  return value as StringValue;
}
