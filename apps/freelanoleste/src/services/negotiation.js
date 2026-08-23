import { formatBrl } from './money';
import { isBarSession, isFreelaSession, readSession } from './session';
import {
  hasReview,
  loadFreelaStore,
  nextId,
  PROPOSAL_STATUS,
  saveFreelaStore,
} from './freelaStore';
import { ensureBarProfile, saveOwnerStore } from './ownerStore';
import { appendPlatformPayment } from './platformStore';
import { mirrorAcceptedDailyToCashFlow } from './tenantOpsApi';

function appendMessage(store, roomId, message) {
  const list = store.messages[roomId] ? [...store.messages[roomId]] : [];
  list.push(message);
  store.messages = { ...store.messages, [roomId]: list };
  return message;
}

function packAllowed(pack, session) {
  if (!pack) return false;
  if (isBarSession(session)) {
    return pack.job?.tenantId === session.tenantId;
  }
  if (isFreelaSession(session)) {
    return pack.proposal?.freelaId === session.id;
  }
  return false;
}

export function getProposalPack(roomId, session = readSession()) {
  const store = loadFreelaStore();
  const room = store.rooms.find((item) => item.id === roomId);
  if (!room) return null;
  const proposal = store.proposals.find((item) => item.id === room.proposalId);
  const job = store.jobs.find((item) => item.id === room.jobId);
  if (!proposal || !job) return null;
  const messages = store.messages[roomId] || [];
  const history = store.history.find((item) => item.proposalId === proposal.id) || null;
  const pack = { room, proposal, job, messages, history };
  if (!packAllowed(pack, session)) return null;
  return pack;
}

function requireAccessibleRoom(roomId, from) {
  const session = readSession();
  if (from === 'freela' && !isFreelaSession(session)) {
    throw new Error('Acesso restrito ao painel do freela.');
  }
  if (from === 'bar' && !isBarSession(session)) {
    throw new Error('Acesso restrito ao dono do bar.');
  }
  const pack = getProposalPack(roomId, session);
  if (!pack) {
    throw new Error('Sala não encontrada.');
  }
  return { session, pack };
}

export function listProposals() {
  const store = loadFreelaStore();
  return store.proposals.map((proposal) => {
    const job = store.jobs.find((item) => item.id === proposal.jobId) || null;
    const room = store.rooms.find((item) => item.id === proposal.roomId) || null;
    const history = store.history.find((item) => item.proposalId === proposal.id) || null;
    return { ...proposal, job, room, history };
  });
}

export function postNegotiationMessage(roomId, text, from) {
  requireAccessibleRoom(roomId, from);
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
  requireAccessibleRoom(roomId, from);
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

function appendAcceptedHistory(store, proposal) {
  if (store.history.some((item) => item.proposalId === proposal.id)) {
    return store.history.find((item) => item.proposalId === proposal.id);
  }
  const job = store.jobs.find((item) => item.id === proposal.jobId);
  const transferId = `tr_mock_${proposal.id}`;
  const record = {
    id: nextId('h'),
    freelaId: proposal.freelaId,
    tenantId: job?.tenantId || null,
    proposalId: proposal.id,
    barName: job?.barName || '',
    title: job?.title || '',
    date: job?.date || new Date().toISOString().slice(0, 10),
    amountReceived: proposal.lastAmount,
    stripeTransferId: transferId,
    reviewGiven: null,
    reviewReceived: null,
  };
  store.history = [...store.history, record];
  return record;
}

export function resolveNegotiation(roomId, decision, from) {
  requireAccessibleRoom(roomId, from);
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
  let history = null;
  if (next === PROPOSAL_STATUS.ACEITA) {
    history = appendAcceptedHistory(store, proposal);
    const job = store.jobs.find((item) => item.id === proposal.jobId);
    const gross = Number(proposal.lastAmount) || 0;
    appendPlatformPayment({
      id: `pi_split_${proposal.id}`,
      kind: 'split',
      label: 'Diária — split plataforma + freela',
      party: proposal.freelaName,
      stripeId: history.stripeTransferId || 'mock',
      amount: formatBrl(gross),
      status: 'paid',
      proposalId: proposal.id,
      tenantId: history.tenantId || job?.tenantId,
      gross,
      platformFee: null,
      freelaNet: gross,
    });
    mirrorAcceptedDailyToCashFlow({
      tenantId: history.tenantId || job?.tenantId,
      proposalId: proposal.id,
      amount: proposal.lastAmount,
      freelaName: proposal.freelaName,
      date: history.date || job?.date,
    });
  }
  const actor = from === 'bar' ? 'O bar' : 'O freela';
  const paidNote =
    next === PROPOSAL_STATUS.ACEITA
      ? `${actor} aceitou ${formatBrl(proposal.lastAmount)}. Pagamento mock ${history.stripeTransferId}.`
      : `${actor} recusou a proposta.`;
  const message = appendMessage(store, roomId, {
    id: nextId('msg'),
    from,
    type: 'status',
    text: paidNote,
    at: new Date().toISOString(),
  });
  saveFreelaStore(store);
  return {
    proposal: store.proposals.find((item) => item.id === proposal.id),
    message,
    history,
  };
}

function averageRating(previousRating, previousCount, nextRating) {
  const count = Number(previousCount) || 0;
  const rating = Number(previousRating) || 0;
  const total = rating * count + nextRating;
  const nextCount = count + 1;
  return {
    rating: Math.round((total / nextCount) * 10) / 10,
    reviewCount: nextCount,
  };
}

export function submitReview({ proposalId, rating, comment }) {
  const session = readSession();
  const value = Number(rating);
  if (!Number.isFinite(value) || value < 1 || value > 5) {
    throw new Error('Nota de 1 a 5.');
  }
  const text = String(comment || '').trim();
  if (!text) {
    throw new Error('Escreva um comentário.');
  }
  const store = loadFreelaStore();
  const proposal = store.proposals.find((item) => item.id === proposalId);
  if (!proposal) {
    throw new Error('Proposta não encontrada.');
  }
  if (proposal.status !== PROPOSAL_STATUS.ACEITA) {
    throw new Error('Review só depois de proposta aceita.');
  }
  const job = store.jobs.find((item) => item.id === proposal.jobId);
  const historyIdx = store.history.findIndex((item) => item.proposalId === proposalId);
  if (historyIdx < 0) {
    throw new Error('Histórico não encontrado.');
  }
  const history = store.history[historyIdx];
  const actorIsFreela = isFreelaSession(session);
  const actorIsOwner = isBarSession(session);

  if (actorIsFreela) {
    if (proposal.freelaId !== session.id || history.freelaId !== session.id) {
      throw new Error('Review de outro freela.');
    }
    if (hasReview(history.reviewGiven)) {
      throw new Error('Você já avaliou este bar.');
    }
    store.history[historyIdx] = {
      ...history,
      reviewGiven: { rating: value, comment: text },
    };
    const tenantId = history.tenantId || job?.tenantId;
    if (tenantId) {
      const ownerStore = ensureBarProfile(tenantId, history.barName || job?.barName);
      const profile = ownerStore.profiles[tenantId];
      const freela = store.profiles.find((item) => item.id === proposal.freelaId);
      profile.reviews = [
        ...(profile.reviews || []),
        {
          id: nextId('br'),
          from: freela?.name || proposal.freelaName,
          rating: value,
          comment: text,
          date: new Date().toISOString().slice(0, 10),
          proposalId,
        },
      ];
      saveOwnerStore(ownerStore);
    }
  } else if (actorIsOwner) {
    if ((history.tenantId || job?.tenantId) !== session.tenantId) {
      throw new Error('Review de outro tenant.');
    }
    if (hasReview(history.reviewReceived)) {
      throw new Error('Você já avaliou este freela.');
    }
    store.history[historyIdx] = {
      ...history,
      reviewReceived: { rating: value, comment: text },
    };
    const profileIdx = store.profiles.findIndex((item) => item.id === proposal.freelaId);
    if (profileIdx >= 0) {
      const current = store.profiles[profileIdx];
      store.profiles[profileIdx] = {
        ...current,
        ...averageRating(current.rating, current.reviewCount, value),
      };
    }
  } else {
    throw new Error('Sessão inválida para review.');
  }

  saveFreelaStore(store);
  return store.history[historyIdx];
}

export { appendMessage };
