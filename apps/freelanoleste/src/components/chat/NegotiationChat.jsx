import { useEffect, useRef, useState } from 'react';
import { formatBrl } from '../../services/money';
import {
  hasReview,
  PROPOSAL_STATUS,
  proposalStatusLabel,
  subscribeFreelaStore,
} from '../../services/freelaStore';
import { connectChatRoom } from '../../services/chatSocket';
import { ReviewForm } from '../freela/ReviewForm';
import { ReviewStars } from '../freela/ReviewStars';
import { Button } from '../Button';
import { Icon } from '../Icon';

export function NegotiationChat({
  actor,
  roomId,
  onClose,
  loadPack,
  postMessage,
  sendCounter,
  resolve,
  submitReview,
}) {
  const [pack, setPack] = useState(() => (roomId ? loadPack(roomId) : null));
  const [text, setText] = useState('');
  const [counter, setCounter] = useState('');
  const [error, setError] = useState('');
  const scrollerRef = useRef(null);
  const inputRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!roomId) return undefined;
    setPack(loadPack(roomId));
    const unsub = subscribeFreelaStore(() => {
      setPack(loadPack(roomId));
    });
    socketRef.current = connectChatRoom(roomId, () => {
      setPack(loadPack(roomId));
    });
    return () => {
      unsub();
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [roomId, loadPack]);

  useEffect(() => {
    const node = scrollerRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [pack?.messages?.length]);

  if (!roomId || !pack || !pack.proposal) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-sm text-on-surface-variant">Sala não encontrada.</p>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold min-h-11 inline-flex items-center"
          >
            Voltar
          </button>
        ) : null}
      </div>
    );
  }

  const { room, proposal, messages } = pack;
  const closed =
    proposal.status === PROPOSAL_STATUS.ACEITA ||
    proposal.status === PROPOSAL_STATUS.RECUSADA;
  const showCounter = proposal.isNegotiable && !closed;
  const peerName = actor === 'bar' ? room.freelaName || 'Freela' : room.barName;

  function handleSend(event) {
    event.preventDefault();
    setError('');
    try {
      const message = postMessage(roomId, text);
      socketRef.current?.send({ type: 'chat', messageId: message.id, from: actor });
      setText('');
      inputRef.current?.focus();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleCounter(event) {
    event.preventDefault();
    setError('');
    try {
      sendCounter(roomId, counter);
      setCounter('');
    } catch (err) {
      setError(err.message);
    }
  }

  function handleDecision(decision) {
    setError('');
    try {
      resolve(roomId, decision);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full bg-surface">
      <div className="shrink-0 border-b border-outline-variant px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Voltar"
          className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-full hover:bg-surface-container"
        >
          <Icon name="arrow_back" />
        </button>
        <div className="min-w-0">
          <p className="font-headline font-bold truncate">{peerName}</p>
          <p className="text-xs text-on-surface-variant truncate">
            {room.title} · {proposalStatusLabel[proposal.status]} · {formatBrl(proposal.lastAmount)}
            {proposal.isNegotiable ? '' : ' · valor travado'}
          </p>
        </div>
      </div>

      <div ref={scrollerRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((message) => {
          const mine = message.from === actor;
          return (
            <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                  mine
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low text-on-surface'
                }`}
              >
                <p>{message.text}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="shrink-0 border-t border-outline-variant bg-white px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3">
        {error ? <p className="text-sm text-error font-medium">{error}</p> : null}

        {!proposal.isNegotiable && !closed ? (
          <p className="text-sm text-on-surface-variant">
            Valor travado. Contra-proposta bloqueada — só aceite ou recuse.
          </p>
        ) : null}

        {closed ? (
          <div className="space-y-3">
            <p className="text-sm text-on-surface-variant">Negociação encerrada.</p>
            {proposal.status === PROPOSAL_STATUS.ACEITA && pack.history && submitReview ? (
              actor === 'freela' ? (
                hasReview(pack.history.reviewGiven) ? (
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                      Seu review
                    </p>
                    <ReviewStars value={pack.history.reviewGiven.rating} />
                    <p className="text-sm">{pack.history.reviewGiven.comment}</p>
                  </div>
                ) : (
                  <ReviewForm
                    title="Avalie o bar"
                    onSubmit={({ rating, comment }) =>
                      submitReview({ proposalId: proposal.id, rating, comment })
                    }
                  />
                )
              ) : hasReview(pack.history.reviewReceived) ? (
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                    Seu review
                  </p>
                  <ReviewStars value={pack.history.reviewReceived.rating} />
                  <p className="text-sm">{pack.history.reviewReceived.comment}</p>
                </div>
              ) : (
                <ReviewForm
                  title="Avalie o freela"
                  onSubmit={({ rating, comment }) =>
                    submitReview({ proposalId: proposal.id, rating, comment })
                  }
                />
              )
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button className="w-full" onClick={() => handleDecision('accept')}>
              Aceitar {formatBrl(proposal.lastAmount)}
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => handleDecision('reject')}
            >
              Recusar
            </Button>
          </div>
        )}

        {showCounter ? (
          <form className="flex gap-2" onSubmit={handleCounter}>
            <input
              type="number"
              min="0"
              value={counter}
              onChange={(event) => setCounter(event.target.value)}
              placeholder="Contra-proposta"
              className="flex-1 bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
            />
            <Button type="submit" variant="dark">
              Contra
            </Button>
          </form>
        ) : null}

        {!closed ? (
          <form className="flex gap-2" onSubmit={handleSend}>
            <input
              ref={inputRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Mensagem"
              autoComplete="off"
              enterKeyHint="send"
              className="flex-1 bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
            />
            <Button type="submit" className="min-w-11 min-h-11">
              Enviar
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
