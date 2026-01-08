import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

type Config = {
  port: number;
  djangoBaseUrl: string;
  djangoApiBasePath: string;
  collabBasePath: string;
  collabHmacSecret: string;
  cacheMaxEntries: number;
  cacheMaxAgeMs: number;
};

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, "");
const stripLeadingSlash = (value: string): string => value.replace(/^\/+/, "");

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function getEnv(name: string, fallback = ""): string {
  const value = process.env[name];
  if (value === undefined) {
    return fallback;
  }
  return value;
}

function getNumberEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
}

const normalizeBasePath = (value: string): string =>
  stripLeadingSlash(stripTrailingSlash(value));

export const config: Config = {
  port: Number(requireEnv("PORT", "1234")),
  djangoBaseUrl: requireEnv("DJANGO_BASE_URL", "http://localhost:8000"),
  djangoApiBasePath: normalizeBasePath(getEnv("DJANGO_API_BASE_PATH", "api")),
  collabBasePath: normalizeBasePath(getEnv("BASE_URL", "collab/")),
  collabHmacSecret: requireEnv("COLLAB_HMAC_SECRET"),
  cacheMaxEntries: getNumberEnv("COLLAB_CACHE_MAX_ENTRIES", 100),
  cacheMaxAgeMs: getNumberEnv("COLLAB_CACHE_MAX_AGE_MS", 0)
};
