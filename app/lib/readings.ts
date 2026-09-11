import data from "../data/readings.json";

const READINGS = data as Record<string, string[]>;

/** Every Jyutping reading CC-Canto attests for a single character. */
export function readingsFor(character: string): string[] {
  return READINGS[character] ?? [];
}

export function hasReading(character: string): boolean {
  return character in READINGS;
}
