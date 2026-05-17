import * as fs from "fs";
import * as path from "path";

const DATA_DIR = process.env.DATA_DIR ?? path.resolve("data");
const DB_PATH = path.join(DATA_DIR, "experiences.json");
const META_PATH = path.join(DATA_DIR, "meta.json");

const MAX_GAMES = 80;

export interface StoredExperience {
  states: number[][];
  outcome: number;
}

interface Meta {
  gamesPlayed: number;
}

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readExperiences(): StoredExperience[] {
  ensureDir();
  if (!fs.existsSync(DB_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8")) as StoredExperience[];
  } catch {
    return [];
  }
}

function writeExperiences(experiences: StoredExperience[]): void {
  ensureDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(experiences));
}

function readMeta(): Meta {
  ensureDir();
  if (!fs.existsSync(META_PATH)) return { gamesPlayed: 0 };
  try {
    return JSON.parse(fs.readFileSync(META_PATH, "utf-8")) as Meta;
  } catch {
    return { gamesPlayed: 0 };
  }
}

function writeMeta(meta: Meta): void {
  ensureDir();
  fs.writeFileSync(META_PATH, JSON.stringify(meta));
}

export function insertExperience(states: number[][], outcome: number): void {
  const all = readExperiences();
  all.push({ states, outcome });
  writeExperiences(all.slice(-MAX_GAMES));

  const meta = readMeta();
  writeMeta({ gamesPlayed: meta.gamesPlayed + 1 });
}

export function getRecentExperiences(): StoredExperience[] {
  return readExperiences();
}

export function getGamesPlayed(): number {
  return readMeta().gamesPlayed;
}
