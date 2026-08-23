import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { roleLabel } from '../services/roles';
import { getUserProfile } from '../services/firestoreService';

export function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    name: '',
    title: '',
    email: '',
    phone: '',
    company: '',
    photoURL: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      if (!user?.uid) return;
      const profile = (await getUserProfile(user.uid)) || user;
      if (!active) return;
      setForm({
        name: profile.name || '',
        title: profile.title || '',
        email: profile.email || user.email || '',
        phone: profile.phone || '',
        company: profile.company || '',
        photoURL: profile.photoURL || '',
      });
    }

    load();
    return () => {
      active = false;
    };
  }, [user]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await updateProfile(form);
      setMessage('Perfil atualizado com sucesso.');
      toast.success('Perfil atualizado com sucesso.');
    } catch {
      setError('Não foi possível salvar o perfil.');
      toast.error('Não foi possível salvar o perfil.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 md:space-y-8">
      <section className="space-y-2">
        <h1 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">
          Perfil do Usuário
        </h1>
        <p className="text-on-surface-variant font-body">
          Dados da sua conta neste bar.
        </p>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <Card className="p-5 md:p-8 space-y-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <img
              alt="Avatar do perfil"
              className="w-28 h-28 rounded-2xl object-cover ring-4 ring-primary-container/20"
              src={form.photoURL}
            />
            <div>
              <h2 className="font-headline text-xl font-bold text-on-surface">
                {form.name || 'Usuário'}
              </h2>
              <p className="text-sm text-on-surface-variant">{form.title}</p>
            </div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container/30 text-on-secondary-container text-xs font-bold uppercase tracking-wider">
              <Icon name="verified" className="text-sm" />
              {roleLabel(user?.role)}
            </span>
          </div>
        </Card>

        <Card className="p-5 md:p-8 lg:col-span-2">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nome completo"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
              <Input
                label="Cargo"
                name="title"
                value={form.title}
                onChange={handleChange}
              />
              <Input
                label="E-mail"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                disabled
              />
              <Input
                label="Telefone"
                name="phone"
                value={form.phone}
                onChange={handleChange}
              />
              <Input
                label="Empresa"
                name="company"
                value={form.company}
                onChange={handleChange}
                containerClassName="md:col-span-2"
              />
              <Input
                label="URL da foto"
                name="photoURL"
                value={form.photoURL}
                onChange={handleChange}
                containerClassName="md:col-span-2"
              />
            </div>

            {message ? (
              <p className="text-sm font-medium text-secondary">{message}</p>
            ) : null}
            {error ? <p className="text-sm font-medium text-error">{error}</p> : null}

            <div className="flex justify-end">
              <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                <Icon name="save" />
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
