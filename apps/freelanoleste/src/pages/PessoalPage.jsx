import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeFreelaStore } from '../services/freelaStore';
import { fetchShowcase } from '../services/showcase';
import { ReviewStars } from '../components/freela/ReviewStars';
import { PosterCard } from '../components/street/PosterCard';
import { RoughButton } from '../components/street/RoughButton';
import { StatusStamp } from '../components/street/StatusStamp';

const rotates = ['-rotate-1', 'rotate-1', 'rotate-2', '-rotate-2'];

export function PessoalPage() {
  const [people, setPeople] = useState(() => fetchShowcase());
  const navigate = useNavigate();

  useEffect(() => subscribeFreelaStore(() => setPeople(fetchShowcase())), []);

  return (
    <div className="min-h-[calc(100dvh-4rem)] overflow-x-hidden">
      <div className="px-4 md:px-8 py-12 md:py-16 space-y-10 max-w-7xl mx-auto">
        <header className="space-y-4">
          <StatusStamp>NO LESTE</StatusStamp>
          <h1 className="font-spray text-4xl md:text-6xl -rotate-2 motion-reduce:rotate-0 w-fit">
            Pessoal
          </h1>
          <p className="text-sm md:text-base text-outline max-w-xl">
            Quem circula na noite. Nome parcial, especialidade e nota. Contato só depois do login.
          </p>
        </header>

        <section
          aria-label="Bares e freelas"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
        >
          {people.map((person, index) => (
            <button
              key={person.id}
              type="button"
              onClick={() => navigate('/login')}
              className="text-left min-h-11"
            >
              <PosterCard
                variant={person.kind === 'bar' ? 'paper' : 'ink'}
                rotate={rotates[index % rotates.length]}
              >
                {person.photoDataUrl ? (
                  <img
                    src={person.photoDataUrl}
                    alt=""
                    className="sticker mb-4 object-cover w-14 h-14 p-0"
                  />
                ) : (
                  <span className="sticker mb-4">{person.initials}</span>
                )}
                <span className="block font-display text-2xl uppercase tracking-tight mt-3">
                  {person.displayName}
                </span>
                <span className="block font-display text-sm tracking-widest uppercase text-primary mt-1">
                  {person.kind === 'bar' ? 'Bar' : 'Freela'} · {person.specialty}
                </span>
                <span className="block mt-2">
                  <ReviewStars value={person.rating} />
                </span>
              </PosterCard>
            </button>
          ))}
        </section>

        <RoughButton onClick={() => navigate('/login')}>Entrar para ver perfis</RoughButton>
      </div>
    </div>
  );
}
