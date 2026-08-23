import { listFreelaProfiles } from './freelaStore';
import { loadOwnerStore } from './ownerStore';

function partialName(fullName) {
  const parts = String(fullName)
    .replace(/['']/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) {
    const word = parts[0];
    return word.length <= 10 ? word : `${word.slice(0, 8)}.`;
  }
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function initials(fullName) {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const seedBars = [
  { id: 'b-mq', tenantId: 'marquinhos', kind: 'bar', name: "Marquinho's", specialty: 'Bar', rating: 4.5 },
  { id: 'b-bl', tenantId: 'bar-leste', kind: 'bar', name: 'Bar do Leste', specialty: 'Bar', rating: 4.2 },
  { id: 'b-ca', tenantId: 'casa-amarela', kind: 'bar', name: 'Casa Amarela', specialty: 'Bar', rating: 4.8 },
];

function barRating(profile, fallback) {
  const reviews = profile?.reviews || [];
  if (!reviews.length) return fallback;
  const sum = reviews.reduce((acc, item) => acc + Number(item.rating || 0), 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

function toCard(item) {
  return {
    id: item.id,
    kind: item.kind,
    displayName: partialName(item.name),
    specialty: item.specialty,
    rating: item.rating,
    initials: initials(item.name),
    photoDataUrl: item.photoDataUrl || '',
  };
}

export function fetchShowcase() {
  const owner = loadOwnerStore();
  const bars = seedBars.map((bar) => {
    const profile = owner.profiles[bar.tenantId];
    return {
      ...bar,
      name: profile?.name || bar.name,
      rating: barRating(profile, bar.rating),
      photoDataUrl: profile?.photoDataUrl || '',
    };
  });
  const freelas = listFreelaProfiles().map((person) => ({
    id: person.id,
    kind: 'freela',
    name: person.name,
    specialty: person.role,
    rating: person.rating ?? 0,
    photoDataUrl: person.photoDataUrl || '',
  }));
  return [...bars, ...freelas].map(toCard);
}
