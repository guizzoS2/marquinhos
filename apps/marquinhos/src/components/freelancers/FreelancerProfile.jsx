import { Button } from '../ui/Button';
import { Pagination } from '../ui/Pagination';
import { usePagedList } from '../ui/usePagedList';
import { Icon } from '../ui/Icon';
import { formatCents, parseMoneyToCents } from '../../services/cashFlowUtils';
import { formatShiftDate, shiftStatusLabel, toIsoDate } from '../../services/freelancerSchedule';

export function FreelancerProfile({ person, dailies, onClose, onEdit, onDelete, onSettle }) {
  if (!person) return null;

  const today = toIsoDate(new Date());
  const history = dailies
    .filter((item) => String(item.freelancerId) === String(person.id))
    .slice()
    .sort((left, right) => String(right.date).localeCompare(String(left.date)));
  const upcoming = history.filter((item) => String(item.date) >= today);
  const worked = history.filter((item) => String(item.date) < today);

  return (
    <>
      <button
        type="button"
        aria-label="Fechar perfil"
        className="fixed inset-0 bg-on-surface/40 z-[60]"
        onClick={onClose}
      />
      <aside className="fixed right-0 top-0 z-[60] h-dvh w-full max-w-md bg-surface-container-lowest border-l border-outline-variant p-4 md:p-8 overflow-y-auto">
        <div className="flex items-start justify-between gap-3 mb-6">
          <h3 className="font-headline text-xl font-bold text-on-surface">Perfil</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="min-h-11 min-w-11 rounded-full text-on-surface-variant hover:bg-surface-container-low"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <img src={person.image} alt="" className="w-16 h-16 rounded-2xl object-cover shrink-0" />
          <div className="min-w-0">
            <p className="font-headline font-bold text-lg text-on-surface truncate">{person.name}</p>
            <p className="text-sm text-on-surface-variant">{person.role}</p>
            <p className="text-sm text-on-surface-variant">{person.contact || 'Sem contato'}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <Button className="w-full sm:w-auto" onClick={onEdit}>
            <Icon name="edit" />
            Editar
          </Button>
          {person.status === 'pending_payment' ? (
            <Button variant="secondary" className="w-full sm:w-auto" onClick={onSettle}>
              <Icon name="payments" />
              Dar baixa
            </Button>
          ) : null}
          <Button variant="danger" className="w-full sm:w-auto" onClick={onDelete}>
            <Icon name="delete" />
            Excluir
          </Button>
        </div>

        <History title="Próximas datas" items={upcoming} />
        <History title="Datas trabalhadas" items={worked} />
      </aside>
    </>
  );
}

function History({ title, items }) {
  const page = usePagedList(items, `${title}|${items.length}`);

  return (
    <section className="mb-6">
      <h4 className="text-xs font-label font-bold text-on-surface-variant uppercase mb-3">
        {title}
      </h4>
      {items.length ? (
        <ul className="space-y-2">
          {page.rows.map((item) => (
            <li
              key={item.id || `${item.date}-${item.value}`}
              className="rounded-2xl bg-surface-container-low p-4 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-semibold text-on-surface">{formatShiftDate(item.date)}</p>
                <p className="text-sm text-on-surface-variant">
                  {item.role} · {shiftStatusLabel(item.status)}
                </p>
              </div>
              <p className="font-headline font-bold text-on-surface shrink-0">
                {formatCents(parseMoneyToCents(item.value))}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-on-surface-variant">Nenhuma data.</p>
      )}
      <div className="mt-3">
        <Pagination state={page} />
      </div>
    </section>
  );
}
