import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchBarProposals, formatBrl } from '../../services/ownerApi';
import { proposalStatusLabel, subscribeFreelaStore } from '../../services/freelaStore';
import { Button } from '../../components/Button';

export function BarProposalsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState(() => fetchBarProposals());

  useEffect(() => {
    return subscribeFreelaStore(() => setItems(fetchBarProposals()));
  }, []);

  const openCount = useMemo(
    () => items.filter((item) => item.status !== 'ACEITA' && item.status !== 'RECUSADA').length,
    [items]
  );

  return (
    <div className="space-y-6 md:space-y-8 max-w-4xl">
      <section className="space-y-2">
        <h2 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight">
          Propostas do seu tenant
        </h2>
        <p className="text-on-surface-variant text-sm">
          Só vagas deste bar. {openCount} em aberto. Valor travado bloqueia contra-proposta.
        </p>
      </section>

      <div className="flex flex-col gap-4">
        {items.map((item) => (
          <article
            key={item.id}
            className="bg-surface-container-lowest rounded-2xl p-4 md:p-6 shadow-sm space-y-3 min-h-11"
          >
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div>
                <p className="font-headline font-bold text-lg">{item.freelaName}</p>
                <p className="text-sm">{item.job?.title || item.room?.title}</p>
                <p className="text-xs text-on-surface-variant">
                  {proposalStatusLabel[item.status]} · {formatBrl(item.lastAmount)}
                  {item.isNegotiable ? '' : ' · valor travado'}
                </p>
              </div>
              <Button
                className="w-full md:w-auto min-h-11 min-w-11"
                onClick={() => navigate(`/bar/chat/${item.roomId}`)}
              >
                Abrir chat
              </Button>
            </div>
          </article>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-on-surface-variant">Nenhuma proposta neste tenant.</p>
      ) : null}
    </div>
  );
}
