const COOLDOWN_MS = 24 * 60 * 60 * 1000;

export type PromoteCooldownInput = {
  createdAt?: string | number | Date | null;
  lastPromotedAt?: string | number | Date | null;
};

const getCooldownAnchor = ({ createdAt, lastPromotedAt }: PromoteCooldownInput) => {
  const anchor = lastPromotedAt ?? createdAt;
  if (!anchor) return null;
  const timestamp = new Date(anchor).getTime();
  if (Number.isNaN(timestamp)) return null;
  return timestamp;
};

export function canPromoteListing(input: PromoteCooldownInput) {
  const anchor = getCooldownAnchor(input);
  if (!anchor) return true;
  return Date.now() - anchor >= COOLDOWN_MS;
}

export function getPromoteCooldownLabel(input: PromoteCooldownInput): string | null {
  const anchor = getCooldownAnchor(input);
  if (!anchor) return null;
  const elapsed = Date.now() - anchor;
  const remaining = COOLDOWN_MS - elapsed;
  if (remaining <= 0) return null;

  const remainingHours = Math.ceil(remaining / (60 * 60 * 1000));
  if (remainingHours >= 1) {
    return `Next in ${remainingHours}h`;
  }

  const remainingMinutes = Math.ceil(remaining / (60 * 1000));
  return `Next in ${Math.max(remainingMinutes, 1)}m`;
}
