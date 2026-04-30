const ZERO_WIDTH_CHARACTERS = /[\u200B-\u200D\uFEFF]/g;
const SEPARATOR_CHARACTERS = /[._-]+/g;
const MULTI_SPACE = /\s+/g;

export function normalizeDisplayNameForCheck(value: string): string {
  return value
    .normalize("NFKC")
    .replace(ZERO_WIDTH_CHARACTERS, "")
    .replace(SEPARATOR_CHARACTERS, " ")
    .replace(MULTI_SPACE, " ")
    .trim()
    .toLowerCase();
}

export function sanitizeDisplayNameForModeration(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(ZERO_WIDTH_CHARACTERS, "")
    .replace(/[^a-z0-9\p{L}\p{N}]+/gu, "");
}

const RESERVED_DISPLAY_NAME_LIST = [
  "admin",
  "administrator",
  "root",
  "system",
  "moderator",
  "mod",
  "support",
  "help",
  "staff",
  "official",
  "team",
  "security",
  "billing",
  "payments",
  "service",
  "customersupport",
  "customer support",
  "api",
  "www",
  "mail",
  "ftp",
  "app",
  "dev",
  "test",
  "staging",
  "login",
  "logout",
  "signin",
  "signup",
  "register",
  "account",
  "profile",
  "settings",
  "dashboard",
  "search",
  "explore",
  "messages",
  "notifications",
  "about",
  "contact",
  "privacy",
  "terms",
  "shop",
  "store",
  "cart",
  "checkout",
  "orders",
  "sex",
  "sexy",
  "xxx",
  "porn",
  "porno",
  "adult",
  "nsfw",
  "onlyfans",
  "escort",
  "camgirl",
  "camboy",
  "fetish",
  "nude",
  "nudes",
  "verified",
  "real",
  "authentic",
  "trusted",
  "investment",
  "invest",
  "forex",
  "crypto",
  "bitcoin",
  "loan",
  "cash",
  "money",
  "bank",
  "wallet",
  "vuxsy",
];

export const RESERVED_DISPLAY_NAMES = new Set(
  RESERVED_DISPLAY_NAME_LIST.map((name) => normalizeDisplayNameForCheck(name))
);

export const BLOCKED_DISPLAY_NAME_PATTERNS: RegExp[] = [
  /admin/i,
  /administrator/i,
  /support/i,
  /official/i,
  /team/i,
  /customer\s?support/i,

  /sex/i,
  /xxx/i,
  /porn/i,
  /escort/i,
  /onlyfans/i,

  /crypto/i,
  /bitcoin/i,
  /forex/i,
  /invest(?:ment)?/i,
  /money/i,
  /bank/i,

  /vuxsy/i,
];

export function isBlockedDisplayName(displayName: string): boolean {
  const normalized = normalizeDisplayNameForCheck(displayName);
  const sanitized = sanitizeDisplayNameForModeration(displayName);

  if (!normalized) return false;

  if (RESERVED_DISPLAY_NAMES.has(normalized)) {
    return true;
  }

  if (RESERVED_DISPLAY_NAMES.has(sanitized)) {
    return true;
  }

  return BLOCKED_DISPLAY_NAME_PATTERNS.some(
    (pattern) => pattern.test(normalized) || pattern.test(sanitized)
  );
}

const ALLOWED_CHARACTERS_REGEX = /^[\p{L}\p{N} .’'&()\-]+$/u;
const LETTER_REGEX = /\p{L}/u;
const NUMBER_REGEX = /\p{N}/u;

function getDisplayNameLength(value: string): number {
  return Array.from(value).length;
}

function isRepeatedCharacter(value: string): boolean {
  const compact = value.replace(MULTI_SPACE, "");
  const chars = Array.from(compact);

  if (chars.length < 4) return false;

  return chars.every((char) => char === chars[0]);
}

export function validateDisplayName(
  displayName: string,
  isAdmin = false
): string | null {
  const trimmed = displayName.trim();

  if (!trimmed) {
    return "Display name is required.";
  }

  const length = getDisplayNameLength(trimmed);

  if (length < 2) {
    return "Display name must be at least 2 characters.";
  }

  if (length > 40) {
    return "Display name must be at most 40 characters.";
  }

  if (!ALLOWED_CHARACTERS_REGEX.test(trimmed)) {
    return "Display name contains unsupported characters.";
  }

  const hasLetter = LETTER_REGEX.test(trimmed);
  const hasNumber = NUMBER_REGEX.test(trimmed);

  if (!hasLetter && hasNumber) {
    return "Display name cannot be only numbers.";
  }

  if (!hasLetter && !hasNumber) {
    return "Display name cannot be only symbols.";
  }

  if (isRepeatedCharacter(trimmed)) {
    return "Display name cannot be a repeated character.";
  }

  if (!isAdmin && isBlockedDisplayName(trimmed)) {
    return "Display name is not allowed.";
  }

  return null;
}