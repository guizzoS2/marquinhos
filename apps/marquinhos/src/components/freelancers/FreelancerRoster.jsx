import { DataTable, StatusPill, TBody, Td, Th, THead, Tr } from '../ui/DataTable';
import { EntityCard, EntityCardGrid } from '../ui/EntityCard';
import { Icon } from '../ui/Icon';
import { Pagination } from '../ui/Pagination';
import { usePagedList } from '../ui/usePagedList';

function StatusBadge({ status, label }) {
  if (status === 'on_shift') {
    return (
      <StatusPill tone="accent" dot>
        {label}
      </StatusPill>
    );
  }

  if (status === 'pending_payment') {
    return <StatusPill tone="danger">{label}</StatusPill>;
  }

  return <StatusPill tone="neutral">{label}</StatusPill>;
}

export function FreelancerRoster({ people, onOpen, view = 'cards' }) {
  const page = usePagedList(people, people.map((person) => person.id).join('|'));

  if (!people.length) {
    return <p className="text-on-surface-variant">Nenhum freelancer encontrado.</p>;
  }

  if (view === 'list') {
    return (
      <div className="space-y-4">
        <DataTable>
          <THead>
            <Th>Nome</Th>
            <Th>Função</Th>
            <Th>Contato</Th>
            <Th>Status</Th>
            <Th align="right">Diária</Th>
          </THead>
          <TBody>
            {page.rows.map((person) => (
              <Tr
                key={person.id}
                tabIndex={0}
                onClick={() => onOpen(person.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpen(person.id);
                  }
                }}
              >
                <Td>
                  <div className="flex items-center gap-3">
                    <img alt="" src={person.image} className="h-11 w-11 rounded-lg object-cover" />
                    <span className="font-semibold text-on-surface">{person.name}</span>
                  </div>
                </Td>
                <Td>{person.role}</Td>
                <Td tone="muted">{person.contact || '—'}</Td>
                <Td>
                  <StatusBadge status={person.status} label={person.statusLabel} />
                </Td>
                <Td align="right" tone="strong">
                  {person.dailyRate}
                </Td>
              </Tr>
            ))}
          </TBody>
        </DataTable>
        <Pagination state={page} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
    <EntityCardGrid>
      {page.rows.map((person) => (
        <EntityCard
          key={person.id}
          image={person.image}
          icon="person"
          title={person.name}
          accent={person.status === 'pending_payment'}
          onClick={() => onOpen(person.id)}
          badge={<StatusBadge status={person.status} label={person.statusLabel} />}
        >
          <p className="text-sm text-on-surface-variant">{person.role}</p>
          {person.contact ? <p className="text-sm text-on-surface-variant">{person.contact}</p> : null}
          <div className="mt-auto flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-on-surface-variant">Valor diária</p>
              <p className="font-headline text-xl font-extrabold text-on-surface">{person.dailyRate}</p>
            </div>
            <Icon name="chevron_right" className="text-on-surface-variant" />
          </div>
        </EntityCard>
      ))}
    </EntityCardGrid>
    <Pagination state={page} />
    </div>
  );
}
