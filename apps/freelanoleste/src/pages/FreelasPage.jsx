import { fetchPublicCatalog } from '../services/ownerApi';
import { ReviewStars } from '../components/freela/ReviewStars';
import { formatBrl } from '../services/money';

export function FreelasPage() {
  const people = fetchPublicCatalog();

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-12 space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-extrabold">Freelas</h1>
        <p className="text-on-surface-variant mt-2">
          Visível para donos com assinatura ativa. Filtros e chat ficam no painel do contratante.
        </p>
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {people.map((person) => (
          <li
            key={person.id}
            className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm space-y-2"
          >
            <h2 className="font-headline font-bold text-lg">{person.name}</h2>
            <p className="text-sm text-on-surface-variant">{person.role}</p>
            <ReviewStars value={person.rating} />
            <p className="text-sm font-semibold">Piso {formatBrl(person.minBaseRate)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
