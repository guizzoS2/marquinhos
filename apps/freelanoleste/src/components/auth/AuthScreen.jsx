import { createContext, useContext } from 'react';
import { Link } from 'react-router-dom';

const AuthToneContext = createContext('freela');

const tones = {
  bar: {
    shell: 'bg-primary text-on-surface',
    hint: 'text-on-surface/70',
    input:
      'w-full min-h-11 px-4 py-3 bg-transparent border-2 border-on-surface/30 rounded-none text-on-surface',
    submit:
      'w-full min-h-11 inline-flex items-center justify-center px-5 border-2 border-on-surface bg-on-surface text-primary font-headline font-extrabold uppercase tracking-tight hover:bg-transparent hover:text-on-surface',
    link: 'underline decoration-2 underline-offset-4 decoration-on-surface',
  },
  freela: {
    shell: 'bg-inverse-surface text-inverse-on-surface',
    hint: 'text-outline',
    input:
      'w-full min-h-11 px-4 py-3 bg-transparent border-2 border-white/20 rounded-none text-inverse-on-surface',
    submit:
      'w-full min-h-11 inline-flex items-center justify-center px-5 border-2 border-primary bg-primary text-on-primary font-headline font-extrabold uppercase tracking-tight hover:bg-transparent hover:text-primary',
    link: 'underline decoration-2 underline-offset-4 decoration-primary hover:text-primary',
  },
};

function useAuthTone() {
  return tones[useContext(AuthToneContext)] || tones.freela;
}

export function AuthScreen({ title, hint, tone = 'freela', children }) {
  const skin = tones[tone] || tones.freela;

  return (
    <AuthToneContext.Provider value={tone}>
      <div className={`flex-1 ${skin.shell} px-4 md:px-8 py-12`}>
        <div className="max-w-md mx-auto space-y-8">
          <Link
            to="/login"
            className={`inline-flex items-center min-h-11 font-semibold text-sm ${skin.link}`}
          >
            Voltar
          </Link>
          <div>
            <h1 className="font-headline text-3xl md:text-4xl font-extrabold uppercase tracking-tighter mb-2">
              {title}
            </h1>
            {hint ? <p className={`text-sm ${skin.hint}`}>{hint}</p> : null}
          </div>
          {children}
        </div>
      </div>
    </AuthToneContext.Provider>
  );
}

export function AuthField({ id, label, type = 'text', ...props }) {
  const skin = useAuthTone();

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-xs font-bold uppercase tracking-widest">
        {label}
      </label>
      <input id={id} type={type} className={skin.input} {...props} />
    </div>
  );
}

export function AuthSubmit({ children }) {
  const skin = useAuthTone();

  return (
    <button type="submit" className={skin.submit}>
      {children}
    </button>
  );
}

export function AuthSwitchLink({ to, prompt, action }) {
  const skin = useAuthTone();

  return (
    <p className="text-sm">
      {prompt}{' '}
      <Link to={to} className={skin.link}>
        {action}
      </Link>
    </p>
  );
}
