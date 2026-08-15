import { useNavigate } from 'react-router-dom';
import { fetchShowcase } from '../services/showcase';
import { ReviewStars } from '../components/freela/ReviewStars';

function MarqueeRow({ items, reverse = false }) {
  const navigate = useNavigate();
  const loop = [...items, ...items];

  return (
    <div className="overflow-hidden border-y-4 border-primary">
      <ul
        className={`flex w-max gap-4 py-4 px-4 motion-reduce:animate-none ${
          reverse ? 'animate-marquee-reverse' : 'animate-marquee'
        } hover:[animation-play-state:paused]`}
      >
        {loop.map((person, index) => (
          <li key={`${person.id}-${index}`} className="shrink-0">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="flex items-center gap-3 min-h-11 min-w-11 px-4 py-3 bg-tertiary text-inverse-on-surface border-2 border-primary text-left"
            >
              <span
                aria-hidden="true"
                className="min-h-11 min-w-11 inline-flex items-center justify-center bg-primary text-on-primary font-headline font-extrabold text-sm"
              >
                {person.initials}
              </span>
              <span className="space-y-0.5">
                <span className="block font-headline font-extrabold uppercase tracking-tight">
                  {person.displayName}
                </span>
                <span className="block text-xs uppercase tracking-widest text-primary">
                  {person.kind === 'bar' ? 'Bar' : 'Freela'} · {person.specialty}
                </span>
                <ReviewStars value={person.rating} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PessoalPage() {
  const people = fetchShowcase();
  const navigate = useNavigate();
  const bars = people.filter((item) => item.kind === 'bar');
  const freelas = people.filter((item) => item.kind === 'freela');

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-secondary-dim text-inverse-on-surface">
      <div className="px-4 md:px-8 py-12 md:py-16 space-y-10 max-w-7xl mx-auto">
        <header className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-primary">
            Centro-Leste · vitrine
          </p>
          <h1 className="font-headline text-4xl md:text-6xl font-extrabold uppercase tracking-tighter">
            Pessoal
          </h1>
          <p className="text-sm md:text-base text-outline max-w-xl">
            Quem circula na noite. Nome parcial, especialidade e nota. Contato e valores só depois
            do login.
          </p>
        </header>
      </div>

      <section aria-label="Letreiro de bares e freelas" className="space-y-0">
        <MarqueeRow items={[...freelas, ...bars]} />
        <MarqueeRow items={[...bars, ...freelas]} reverse />
      </section>

      <div className="px-4 md:px-8 py-12">
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="min-h-11 px-6 py-3 border-4 border-primary bg-primary text-on-primary font-headline font-extrabold uppercase tracking-tight hover:bg-transparent hover:text-primary"
        >
          Entrar para ver perfis
        </button>
      </div>
    </div>
  );
}
