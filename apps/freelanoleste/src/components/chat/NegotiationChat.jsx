import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatBrl } from '../../services/money';
import { PROPOSAL_STATUS, proposalStatusLabel, subscribeFreelaStore } from '../../services/freelaStore';
import { connectChatRoom } from '../../services/chatSocket';
import { Button } from '../Button';
import { Icon } from '../Icon';

export function NegotiationChat({
  actor,
  backTo,
  loadPack,
  postMessage,
  sendCounter,
  resolve,
}) {
  const { roomId } = useParams();
  const [pack, setPack] = useState(() => loadPack(roomId));
  const [text, setText] = useState('');
  const [counter, setCounter] = useState('');
  const [error, setError] = useState('');
  const scrollerRef = useRef(null);
  const inputRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
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

  if (!pack || !pack.proposal) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-sm text-on-surface-variant">Sala não encontrada neste tenant.</p>
        <Link to={backTo} className="text-sm font-semibold min-h-11 inline-flex items-center">
          Voltar
        </Link>
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
        <Link
          to={backTo}
          aria-label="Voltar"
          className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-full hover:bg-surface-container"
        >
          <Icon name="arrow_back" />
        </Link>
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
          <p className="text-sm text-on-surface-variant">Negociação encerrada.</p>
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
