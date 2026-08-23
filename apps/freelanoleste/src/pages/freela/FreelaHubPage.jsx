import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  applyToJob,
  fetchFreelaProfile,
  fetchHistory,
  fetchJobs,
  fetchStripeBalance,
  formatBrl,
  postChatMessage,
  resolveProposal,
  sendCounterProposal,
  submitFreelaReview,
  fetchProposalByRoom,
} from '../../services/freelaApi';
import {
  PROPOSAL_STATUS,
  proposalStatusLabel,
  subscribeFreelaStore,
  hasReview,
} from '../../services/freelaStore';
import { PosterCard } from '../../components/street/PosterCard';
import { RoughButton } from '../../components/street/RoughButton';
import { FreelaSheet } from '../../components/freela/FreelaSheet';
import { FreelaModal } from '../../components/freela/FreelaModal';
import { FreelaProfileForm } from '../../components/freela/FreelaProfileForm';
import { FreelaFinancePanel } from '../../components/freela/FreelaFinancePanel';
import { NegotiationChat } from '../../components/chat/NegotiationChat';
import { ReviewForm } from '../../components/freela/ReviewForm';
import { ReviewStars } from '../../components/freela/ReviewStars';
import { Button } from '../../components/Button';

const PAGE_SIZE = 8;

function HistoryCard({ item, onReviewed }) {
  return (
    <PosterCard variant="paper" rotate="rotate-1" className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-xl uppercase tracking-wide">{item.barName}</p>
          <p className="text-sm text-outline">{item.title}</p>
        </div>
        <p className="font-spray text-xl text-primary">{formatBrl(item.amountReceived)}</p>
      </div>
      <p className="text-xs text-outline">
        {new Date(`${item.date}T12:00:00`).toLocaleDateString('pt-BR')} · {item.stripeTransferId}
      </p>
      {hasReview(item.reviewGiven) ? (
        <div className="space-y-1">
          <ReviewStars value={item.reviewGiven.rating} />
          <p className="text-sm">{item.reviewGiven.comment}</p>
        </div>
      ) : item.proposalId ? (
        <ReviewForm
          title="Avalie o bar"
          onSubmit={({ rating, comment }) => {
            submitFreelaReview({ proposalId: item.proposalId, rating, comment });
            onReviewed();
          }}
        />
      ) : null}
      {hasReview(item.reviewReceived) ? (
        <p className="text-xs text-outline">
          Bar: {item.reviewReceived.rating}★ — {item.reviewReceived.comment}
        </p>
      ) : (
        <p className="text-xs text-outline">Aguardando review do bar.</p>
      )}
    </PosterCard>
  );
}

export function FreelaHubPage() {
  const { logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState(() => fetchFreelaProfile());
  const [jobs, setJobs] = useState(() => fetchJobs());
  const [history, setHistory] = useState(() => fetchHistory({ page: 1, pageSize: PAGE_SIZE }));
  const [balance, setBalance] = useState(null);
  const [section, setSection] = useState('now');
  const [profileOpen, setProfileOpen] = useState(false);
  const [financeOpen, setFinanceOpen] = useState(false);
  const [applyJob, setApplyJob] = useState(null);
  const [applyDraft, setApplyDraft] = useState({ amount: '', locked: false });
  const [chatRoomId, setChatRoomId] = useState(null);
  const [error, setError] = useState('');

  const refresh = useCallback(() => {
    setProfile(fetchFreelaProfile());
    setJobs(fetchJobs());
    setHistory(fetchHistory({ page: 1, pageSize: PAGE_SIZE }));
  }, []);

  useEffect(() => {
    return subscribeFreelaStore(refresh);
  }, [refresh]);

  useEffect(() => {
    fetchStripeBalance()
      .then(setBalance)
      .catch(() => setBalance(null));
  }, []);

  useEffect(() => {
    const chat = searchParams.get('chat');
    if (chat) setChatRoomId(chat);
    if (searchParams.get('finance') === 'open') setFinanceOpen(true);
  }, [searchParams]);

  const openChats = useMemo(
    () =>
      jobs.filter(
        (job) =>
          job.proposal &&
          job.proposal.status !== PROPOSAL_STATUS.ACEITA &&
          job.proposal.status !== PROPOSAL_STATUS.RECUSADA
      ).length,
    [jobs]
  );

  const loadPack = useCallback((roomId) => fetchProposalByRoom(roomId), []);

  function clearChatParam() {
    setChatRoomId(null);
    const next = new URLSearchParams(searchParams);
    next.delete('chat');
    setSearchParams(next, { replace: true });
  }

  function openChat(roomId) {
    setChatRoomId(roomId);
    const next = new URLSearchParams(searchParams);
    next.set('chat', roomId);
    setSearchParams(next, { replace: true });
  }

  function openApply(job) {
    setError('');
    setApplyJob(job);
    setApplyDraft({
      amount: String(job.suggestedRate),
      locked: false,
    });
  }

  function handleApplySubmit(event) {
    event.preventDefault();
    if (!applyJob) return;
    setError('');
    try {
      const result = applyToJob({
        jobId: applyJob.id,
        amount: applyDraft.amount || applyJob.suggestedRate,
        isNegotiable: !applyDraft.locked,
      });
      setApplyJob(null);
      refresh();
      openChat(result.roomId);
    } catch (err) {
      setError(err.message || 'Falha ao enviar proposta.');
    }
  }

  function closeFinance() {
    setFinanceOpen(false);
    const next = new URLSearchParams(searchParams);
    next.delete('finance');
    setSearchParams(next, { replace: true });
  }

  return (
    <>
      <header className="px-4 md:px-8 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline/20">
        <p className="font-spray text-2xl md:text-3xl text-primary -rotate-2 motion-reduce:rotate-0">
          FreelaNoLeste
        </p>
        <nav className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="sticker text-sm min-h-11 px-3 inline-flex items-center"
          >
            Perfil
          </button>
          <button
            type="button"
            onClick={() => setFinanceOpen(true)}
            className="sticker text-sm min-h-11 px-3 inline-flex items-center"
          >
            Receber
          </button>
          <button
            type="button"
            onClick={logout}
            className="sticker text-sm min-h-11 px-3 inline-flex items-center"
          >
            Sair
          </button>
        </nav>
      </header>

      <div className="px-4 md:px-8 py-8 max-w-3xl mx-auto space-y-8 pb-16">
        <section className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1 space-y-2">
            <p className="font-display text-sm tracking-[0.28em] uppercase text-primary">
              Profissional
            </p>
            <h1 className="font-spray text-4xl md:text-5xl">Oi, {profile.name.split(' ')[0]}</h1>
            <p className="text-sm text-outline">
              {profile.role} · piso {formatBrl(profile.minBaseRate)}
            </p>
          </div>
          <div className="w-16 h-16 border-2 border-primary overflow-hidden shrink-0 -rotate-2 motion-reduce:rotate-0">
            {profile.photoDataUrl ? (
              <img
                src={profile.photoDataUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs text-outline flex items-center justify-center h-full">
                Foto
              </span>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <PosterCard variant="yellow" rotate="-rotate-1" className="p-4 space-y-1">
            <p className="font-display text-xs uppercase tracking-widest text-on-primary">
              Disponível
            </p>
            <p className="font-spray text-2xl text-on-primary">
              {balance ? formatBrl(balance.available) : '—'}
            </p>
          </PosterCard>
          <PosterCard variant="ink" rotate="rotate-1" className="p-4 space-y-1">
            <p className="font-display text-xs uppercase tracking-widest text-outline">Vagas</p>
            <p className="font-spray text-2xl text-primary">{jobs.length}</p>
          </PosterCard>
          <PosterCard variant="paper" rotate="-rotate-2" className="p-4 space-y-1">
            <p className="font-display text-xs uppercase tracking-widest">Chats abertos</p>
            <p className="font-spray text-2xl text-primary">{openChats}</p>
          </PosterCard>
        </section>

        <RoughButton type="button" className="w-full sm:w-auto" onClick={() => setFinanceOpen(true)}>
          Receber
        </RoughButton>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSection('now')}
            className={`sticker min-h-11 px-4 ${section === 'now' ? 'sticker-on' : ''}`}
          >
            Pra você
          </button>
          <button
            type="button"
            onClick={() => setSection('past')}
            className={`sticker min-h-11 px-4 ${section === 'past' ? 'sticker-on' : ''}`}
          >
            Já rolou
          </button>
        </div>

        {error && section === 'now' ? (
          <p className="text-sm text-error font-medium">{error}</p>
        ) : null}

        {section === 'now' ? (
          <section className="space-y-4">
            {jobs.length === 0 ? (
              <p className="text-sm text-outline">Nenhuma vaga aberta ou convite agora.</p>
            ) : null}
            {jobs.map((job, index) => {
              const proposal = job.proposal;
              const rotate = index % 2 === 0 ? '-rotate-1' : 'rotate-1';
              return (
                <PosterCard
                  key={job.id}
                  variant={job.visibility === 'invite' ? 'yellow' : 'ink'}
                  rotate={rotate}
                  className="space-y-3"
                >
                  <p className="font-display text-xl uppercase tracking-wide">{job.barName}</p>
                  <p className="text-sm">{job.title}</p>
                  <p className="text-xs text-outline">
                    {job.visibility === 'invite' ? 'Convite' : 'Vaga aberta'} ·{' '}
                    {new Date(`${job.date}T12:00:00`).toLocaleDateString('pt-BR')} ·{' '}
                    {formatBrl(job.suggestedRate)}
                  </p>
                  <p className="text-sm text-outline">{job.description}</p>
                  {proposal ? (
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                      <p className="text-sm">
                        {proposalStatusLabel[proposal.status]} ·{' '}
                        {formatBrl(proposal.lastAmount)}
                      </p>
                      <RoughButton
                        type="button"
                        variant="ghost"
                        className="w-full sm:w-auto"
                        onClick={() => openChat(proposal.roomId)}
                      >
                        Chat
                      </RoughButton>
                    </div>
                  ) : (
                    <RoughButton
                      type="button"
                      className="w-full sm:w-auto"
                      onClick={() => openApply(job)}
                    >
                      Candidatar
                    </RoughButton>
                  )}
                </PosterCard>
              );
            })}
          </section>
        ) : (
          <section className="space-y-4">
            {history.items.length === 0 ? (
              <p className="text-sm text-outline">Nenhum turno no histórico.</p>
            ) : null}
            {history.items.map((item) => (
              <HistoryCard key={item.id} item={item} onReviewed={refresh} />
            ))}
          </section>
        )}
      </div>

      <FreelaModal open={profileOpen} title="Perfil" onClose={() => setProfileOpen(false)}>
        <FreelaProfileForm
          onSaved={(next) => {
            setProfile(next);
            setProfileOpen(false);
          }}
        />
      </FreelaModal>

      <FreelaModal open={financeOpen} title="Recebimentos" onClose={closeFinance}>
        <FreelaFinancePanel />
      </FreelaModal>

      <FreelaSheet
        open={Boolean(applyJob)}
        title="Candidatura"
        onClose={() => setApplyJob(null)}
      >
        {applyJob ? (
          <form className="p-4 space-y-4 overflow-y-auto" onSubmit={handleApplySubmit}>
            <p className="text-sm text-on-surface-variant">
              {applyJob.barName} · {applyJob.title}
            </p>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Sua proposta (R$)
              </span>
              <input
                type="number"
                min={profile.minBaseRate}
                required
                value={applyDraft.amount}
                onChange={(event) =>
                  setApplyDraft((current) => ({ ...current, amount: event.target.value }))
                }
                className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
              />
            </label>
            <label className="flex items-center gap-3 min-h-11">
              <input
                type="checkbox"
                checked={applyDraft.locked}
                onChange={(event) =>
                  setApplyDraft((current) => ({ ...current, locked: event.target.checked }))
                }
                className="w-5 h-5 accent-primary"
              />
              <span className="text-sm">Valor travado — sem contra-proposta</span>
            </label>
            {error ? <p className="text-sm text-error font-medium">{error}</p> : null}
            <Button type="submit" className="w-full min-h-11">
              Enviar e abrir chat
            </Button>
          </form>
        ) : null}
      </FreelaSheet>

      <FreelaSheet open={Boolean(chatRoomId)} title="" onClose={clearChatParam} fullScreen>
        {chatRoomId ? (
          <NegotiationChat
            actor="freela"
            roomId={chatRoomId}
            onClose={clearChatParam}
            loadPack={loadPack}
            postMessage={postChatMessage}
            sendCounter={sendCounterProposal}
            resolve={resolveProposal}
            submitReview={submitFreelaReview}
          />
        ) : null}
      </FreelaSheet>
    </>
  );
}
