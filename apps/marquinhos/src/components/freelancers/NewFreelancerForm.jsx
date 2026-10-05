import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Icon } from '../ui/Icon';
import { useToast } from '../../contexts/ToastContext';
import { createFreelancer, editFreelancer } from '../../services/dashboardService';
import { isValidPhone, maskPhone } from '../../services/freelancerSchedule';
import { readLocalImage } from '../../services/readLocalImage';
import { RoleSelect } from './RoleSelect';

export function NewFreelancerForm({ person, roles, onSuccess, onCancel }) {
  const toast = useToast();
  const options = person?.role && !roles.includes(person.role) ? [person.role, ...roles] : roles;
  const [form, setForm] = useState({
    name: person?.name || '',
    contact: person?.contact ? maskPhone(person.contact) : '',
    role: person?.role || options[0] || 'Barman',
    image: person?.image || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handlePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    try {
      const image = await readLocalImage(file);
      setForm((prev) => ({ ...prev, image }));
    } catch (err) {
      setError(err.message || 'Não foi possível ler a foto.');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError('Informe o nome completo.');
      return;
    }
    if (!isValidPhone(form.contact)) {
      setError('Informe um telefone com DDD. Ex.: (11) 98765-4321.');
      return;
    }
    if (!form.role) {
      setError('Selecione a função.');
      return;
    }

    setSaving(true);
    setError('');
    const payload = {
      name: form.name.trim(),
      contact: maskPhone(form.contact),
      role: form.role,
      image: form.image,
      status: person?.status || 'available',
    };
    try {
      if (person?.id != null) {
        await editFreelancer(person.id, payload);
        toast.success('Freelancer atualizado.');
      } else {
        await createFreelancer(payload);
        toast.success('Freelancer cadastrado com sucesso.');
      }
      onSuccess?.();
      onCancel();
    } catch {
      setError(person ? 'Não foi possível atualizar o freelancer.' : 'Não foi possível cadastrar o freelancer.');
      toast.error(person ? 'Falha ao atualizar freelancer.' : 'Falha ao cadastrar freelancer.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <Input
        label="Nome completo"
        name="freelancer-name"
        value={form.name}
        onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
        required
      />
      <Input
        label="Contato"
        name="freelancer-contact"
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        placeholder="(11) 98765-4321"
        value={form.contact}
        onChange={(event) => setForm((prev) => ({ ...prev, contact: maskPhone(event.target.value) }))}
        required
      />
      <RoleSelect
        id="freelancer-role"
        label="Função / especialidade"
        roles={options}
        value={form.role}
        onChange={(role) => setForm((prev) => ({ ...prev, role }))}
        required
      />
      <div className="space-y-2">
        <label
          htmlFor="freelancer-photo"
          className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest pl-1"
        >
          Foto (opcional)
        </label>
        <input
          id="freelancer-photo"
          type="file"
          accept="image/*"
          onChange={handlePhoto}
          className="w-full min-h-11 text-sm text-on-surface file:mr-3 file:min-h-11 file:px-4 file:rounded-xl file:border-0 file:bg-primary file:text-on-primary file:font-semibold"
        />
        {form.image ? (
          <div className="flex items-center gap-3">
            <img src={form.image} alt="" className="w-14 h-14 rounded-2xl object-cover" />
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, image: '' }))}
              className="min-h-11 px-3 text-sm font-semibold text-on-surface-variant hover:text-error"
            >
              Remover foto
            </button>
          </div>
        ) : (
          <p className="text-xs text-on-surface-variant pl-1">Arquivo local. Sem link.</p>
        )}
      </div>
      {error ? <p className="text-sm text-error font-medium">{error}</p> : null}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          <Icon name={person ? 'edit' : 'person_add'} />
          {saving ? 'Salvando...' : person ? 'Salvar' : 'Adicionar freelancer'}
        </Button>
      </div>
    </form>
  );
}
