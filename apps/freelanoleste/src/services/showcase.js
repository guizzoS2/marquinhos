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

const raw = [
  { id: 'f1', kind: 'freela', name: 'Ricardo Alves', specialty: 'Barman', rating: 4.9 },
  { id: 'b-mq', kind: 'bar', name: "Marquinho's", specialty: 'Bar', rating: 4.5 },
  { id: 'f2', kind: 'freela', name: 'Marina Santos', specialty: 'Garçom', rating: 4.7 },
  { id: 'b-bl', kind: 'bar', name: 'Bar do Leste', specialty: 'Bar', rating: 4.2 },
  { id: 'f3', kind: 'freela', name: 'Lucas Silva', specialty: 'Cozinha', rating: 4.8 },
  { id: 'f4', kind: 'freela', name: 'Patrícia Moura', specialty: 'Barwoman', rating: 4.4 },
  { id: 'b-ca', kind: 'bar', name: 'Casa Amarela', specialty: 'Bar', rating: 4.8 },
  { id: 'f-demo', kind: 'freela', name: 'Freela demo', specialty: 'Barman', rating: 4.6 },
];

export function fetchShowcase() {
  return raw.map((item) => ({
    id: item.id,
    kind: item.kind,
    displayName: partialName(item.name),
    specialty: item.specialty,
    rating: item.rating,
    initials: initials(item.name),
  }));
}
