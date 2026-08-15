const people = [
  { name: 'Ricardo Alves', role: 'Barman', rating: '4,9' },
  { name: 'Marina Santos', role: 'Garçonete', rating: '4,7' },
  { name: 'Lucas Silva', role: 'Cozinha', rating: '4,8' },
];

export function FreelasPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-12 space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-extrabold">Freelas</h1>
        <p className="text-on-surface-variant mt-2">
          Visível para donos de bar com assinatura ativa. Review só depois de serviço pago.
        </p>
      </div>
      <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {people.map((person) => (
          <li
            key={person.name}
            className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm space-y-2"
          >
            <h2 className="font-headline font-bold text-lg">{person.name}</h2>
            <p className="text-sm text-on-surface-variant">{person.role}</p>
            <p className="text-sm font-semibold">Nota {person.rating}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
