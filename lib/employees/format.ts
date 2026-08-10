export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatJoinDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

// Deterministic pastel-ish avatar background from a string (no randomness
// so the same employee always gets the same color across renders).
const AVATAR_PALETTE = [
  { bg: '#EFF6FF', text: '#1D4ED8' }, // blue
  { bg: '#F0FDF4', text: '#15803D' }, // green
  { bg: '#FFF7ED', text: '#C2410C' }, // orange
  { bg: '#FEF2F2', text: '#B91C1C' }, // red
  { bg: '#F5F3FF', text: '#6D28D9' }, // violet
  { bg: '#ECFEFF', text: '#0E7490' }, // cyan
];

export function getAvatarColors(seed: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}
