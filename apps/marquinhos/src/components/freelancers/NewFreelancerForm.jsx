import { useState } from 'react';
import { Button } from '../ui/Button';
import { FileField } from '../ui/FileField';
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
      const saved =
        person?.id != null
          ? await editFreelancer(person.id, payload)
          : await createFreelancer(payload);
      toast.success(person?.id != null ? 'Freelancer atualizado.' : 'Freelancer cadastrado com sucesso.');
      onSuccess?.(saved);
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
        <FileField
          id="freelancer-photo"
          label="Foto (opcional)"
          accept="image/*"
          onChange={handlePhoto}
          cleared={!form.image}
        />
        {form.image ? (
          <div className="flex items-center gap-3">
            <img src={form.image} alt="" className="w-14 h-14 rounded-2xl object-cover" />
            <Button type="button" variant="secondary" onClick={() => setForm((prev) => ({ ...prev, image: '' }))}>
              <Icon name="delete" />
              Remover foto
            </Button>
          </div>
        ) : (
          <p className="text-xs text-on-surface-variant pl-1">Arquivo local. Sem link.</p>
        )}
      </div>
      {error ? <p className="text-sm text-error font-medium">{error}</p> : null}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="secondary" type="button" onClick={onCancel}>
          <Icon name="cancel" />
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          <Icon name={person ? 'save' : 'add'} />
          {saving ? 'Salvando...' : person ? 'Salvar' : 'Adicionar freelancer'}
        </Button>
      </div>
    </form>
  );
}
