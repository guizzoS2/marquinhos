import { formatBrl } from './money';
import {
  loadFreelaStore,
  nextId,
  PROPOSAL_STATUS,
  saveFreelaStore,
} from './freelaStore';

function appendMessage(store, roomId, message) {
  const list = store.messages[roomId] ? [...store.messages[roomId]] : [];
  list.push(message);
  store.messages = { ...store.messages, [roomId]: list };
  return message;
}

export function getProposalPack(roomId) {
  const store = loadFreelaStore();
  const room = store.rooms.find((item) => item.id === roomId);
  if (!room) return null;
  const proposal = store.proposals.find((item) => item.id === room.proposalId);
  const job = store.jobs.find((item) => item.id === room.jobId);
  if (!proposal || !job) return null;
  const messages = store.messages[roomId] || [];
  return { room, proposal, job, messages };
}

export function listProposals() {
  const store = loadFreelaStore();
  return store.proposals.map((proposal) => {
    const job = store.jobs.find((item) => item.id === proposal.jobId) || null;
    const room = store.rooms.find((item) => item.id === proposal.roomId) || null;
    return { ...proposal, job, room };
  });
}

export function postNegotiationMessage(roomId, text, from) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    throw new Error('Escreva uma mensagem.');
  }
  if (from !== 'freela' && from !== 'bar') {
    throw new Error('Remetente inválido.');
  }
  const store = loadFreelaStore();
  const room = store.rooms.find((item) => item.id === roomId);
  if (!room) {
    throw new Error('Sala de chat não encontrada.');
  }
  const message = appendMessage(store, roomId, {
    id: nextId('msg'),
    from,
    type: 'text',
    text: trimmed,
    at: new Date().toISOString(),
  });
  saveFreelaStore(store);
  return message;
}

export function sendNegotiationCounter(roomId, amount, from, { minAmount } = {}) {
  if (from !== 'freela' && from !== 'bar') {
    throw new Error('Remetente inválido.');
  }
  const store = loadFreelaStore();
  const proposal = store.proposals.find((item) => item.roomId === roomId);
  if (!proposal) {
    throw new Error('Proposta não encontrada.');
  }
  if (!proposal.isNegotiable) {
    throw new Error('Valor travado: só aceite ou recuse.');
  }
  if (
    proposal.status === PROPOSAL_STATUS.ACEITA ||
    proposal.status === PROPOSAL_STATUS.RECUSADA
  ) {
    throw new Error('Proposta encerrada.');
  }
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Informe um valor válido.');
  }
  if (minAmount != null && value < minAmount) {
    throw new Error(`Valor abaixo do mínimo (${formatBrl(minAmount)}).`);
  }
  store.proposals = store.proposals.map((item) =>
    item.id === proposal.id
      ? {
          ...item,
          status: PROPOSAL_STATUS.CONTRA_PROPOSTA,
          lastAmount: value,
        }
      : item
  );
  const prefix = from === 'bar' ? 'Contra-proposta do bar' : 'Contra-proposta';
  const message = appendMessage(store, roomId, {
    id: nextId('msg'),
    from,
    type: 'proposal',
    text: `${prefix}: ${formatBrl(value)}`,
    amount: value,
    at: new Date().toISOString(),
  });
  saveFreelaStore(store);
  return message;
}

export function resolveNegotiation(roomId, decision, from) {
  if (from !== 'freela' && from !== 'bar') {
    throw new Error('Remetente inválido.');
  }
  const store = loadFreelaStore();
  const proposal = store.proposals.find((item) => item.roomId === roomId);
  if (!proposal) {
    throw new Error('Proposta não encontrada.');
  }
  if (
    proposal.status === PROPOSAL_STATUS.ACEITA ||
    proposal.status === PROPOSAL_STATUS.RECUSADA
  ) {
    throw new Error('Proposta já encerrada.');
  }
  const next =
    decision === 'accept' ? PROPOSAL_STATUS.ACEITA : PROPOSAL_STATUS.RECUSADA;
  store.proposals = store.proposals.map((item) =>
    item.id === proposal.id ? { ...item, status: next } : item
  );
  const actor = from === 'bar' ? 'O bar' : 'O freela';
  const message = appendMessage(store, roomId, {
    id: nextId('msg'),
    from,
    type: 'status',
    text:
      next === PROPOSAL_STATUS.ACEITA
        ? `${actor} aceitou ${formatBrl(proposal.lastAmount)}. Pagamento via Stripe.`
        : `${actor} recusou a proposta.`,
    at: new Date().toISOString(),
  });
  saveFreelaStore(store);
  return { proposal: store.proposals.find((item) => item.id === proposal.id), message };
}

export { appendMessage };
