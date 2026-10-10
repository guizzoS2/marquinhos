import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { DataTable, EmptyRow, TableActions, TBody } from '../ui/DataTable';
import { FieldModal } from '../ui/FieldModal';
import { Icon } from '../ui/Icon';
import { IconPicker } from '../ui/IconPicker';
import { Input } from '../ui/Input';
import { SegmentedControl } from '../ui/SegmentedControl';
import { TaxonomyCard, TaxonomyChildren } from '../ui/TaxonomyCard';
import { SubCell, SubRow, SubTable, TaxonomyHead, TaxonomyRow } from '../ui/TaxonomyTable';
import { useViewMode } from '../ui/useViewMode';
import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';
import { groupIcon } from '../../services/catalogTaxonomy';
import { GROUP_ICONS } from '../../services/taxonomyIcons';
import {
  addFormat,
  addMenuGroup,
  addMenuSubgroup,
  deleteFormat,
  deleteMenuGroup,
  deleteMenuSubgroup,
  editFormat,
  editMenuGroup,
  editMenuSubgroup,
} from '../../services/dashboardService';

function NameForm({
  label,
  initial = '',
  initialDescription = '',
  initialIcon = '',
  withDescription = false,
  withIcon = false,
  submitLabel,
  onSubmit,
  onCancel,
}) {
  const toast = useToast();
  const [name, setName] = useState(initial);
  const [description, setDescription] = useState(initialDescription);
  const [icon, setIcon] = useState(initialIcon || 'category');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit(name, description, icon);
      onCancel();
    } catch (err) {
      const message = err?.message || 'Não foi possível salvar.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <Input label={label} value={name} onChange={(event) => setName(event.target.value)} required />
      {withDescription ? (
        <div className="space-y-2">
          <label htmlFor="grupo-descricao" className="pl-1 text-xs font-label font-bold uppercase text-on-surface-variant">
            Descrição
          </label>
          <textarea
            id="grupo-descricao"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Opcional"
            rows={3}
            className="min-h-11 w-full rounded-2xl border border-outline bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface outline-none placeholder:font-normal placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-0"
          />
        </div>
      ) : null}
      {withIcon ? <IconPicker value={icon} onChange={setIcon} related={GROUP_ICONS} relatedLabel="Cardápio e estoque" /> : null}
      {error ? <p className="text-sm font-medium text-error">{error}</p> : null}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" type="button" onClick={onCancel}>
          <Icon name="cancel" />
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          <Icon name="save" />
          {saving ? 'Salvando...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function GroupActions({ group, onEdit, onDelete, onAddSub }) {
  return (
    <TableActions>
      <Button type="button" size="icon" variant="secondary" aria-label={`Novo subgrupo em ${group.name}`} onClick={onAddSub}>
        <Icon name="add" />
      </Button>
      <Button type="button" size="icon" variant="secondary" aria-label={`Editar ${group.name}`} onClick={onEdit}>
        <Icon name="edit" />
      </Button>
      <Button type="button" size="icon" variant="danger" aria-label={`Excluir ${group.name}`} onClick={onDelete}>
        <Icon name="delete" />
      </Button>
    </TableActions>
  );
}

function plural(count, one, many) {
  return `${count} ${count === 1 ? one : many}`;
}

export function GroupsPanel({ groups = [], formats = [], items = [] }) {
  const toast = useToast();
  const { openModal } = useModal();
  const queryClient = useQueryClient();
  const [view, setView] = useViewMode('grupos');
  const [editor, setEditor] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
  }

  function toggle(id) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirmRemove(message, action, success) {
    openModal('confirm', {
      message,
      confirmLabel: 'Excluir',
      successMessage: success,
      errorMessage: 'Não foi possível excluir.',
      onConfirm: async () => {
        await action();
        refresh();
      },
    });
  }

  async function run(action, success) {
    await action();
    toast.success(success);
    refresh();
  }

  function productCount(groupId, subgroupId) {
    return items.filter(
      (item) => item.grupoId === groupId && (subgroupId === undefined || item.subgrupoId === subgroupId)
    ).length;
  }

  function groupSubtitle(group) {
    const subs = (group.subgroups || []).length;
    return `${plural(subs, 'subgrupo', 'subgrupos')} · ${plural(productCount(group.id), 'produto', 'produtos')}`;
  }

  function groupActions(group) {
    return (
      <GroupActions
        group={group}
        onAddSub={() => setEditor({ kind: 'subgroup', group })}
        onEdit={() => setEditor({ kind: 'group', group })}
        onDelete={() =>
          confirmRemove(`Excluir o grupo "${group.name}"?`, () => deleteMenuGroup(group.id), 'Grupo excluído.')
        }
      />
    );
  }

  function subgroupActions(group, sub) {
    return (
      <TableActions>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          aria-label={`Editar ${sub.name}`}
          onClick={() => setEditor({ kind: 'subgroup', group, subgroup: sub })}
        >
          <Icon name="edit" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="danger"
          aria-label={`Excluir ${sub.name}`}
          onClick={() =>
            confirmRemove(
              `Excluir o subgrupo "${sub.name}"?`,
              () => deleteMenuSubgroup(group.id, sub.id),
              'Subgrupo excluído.'
            )
          }
        >
          <Icon name="delete" />
        </Button>
      </TableActions>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl
          label="Visualização dos grupos"
          items={[
            { id: 'list', label: 'Lista' },
            { id: 'cards', label: 'Cards' },
          ]}
          value={view}
          onChange={setView}
        />
        <Button type="button" onClick={() => setEditor({ kind: 'group' })}>
          <Icon name="add" />
          Novo grupo
        </Button>
      </div>
      {view === 'cards' ? (
        groups.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Nenhum grupo.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {groups.map((group) => (
              <TaxonomyCard
                key={group.id}
                icon={groupIcon(group)}
                title={group.name}
                subtitle={groupSubtitle(group)}
                description={group.description}
                actions={groupActions(group)}
              >
                <TaxonomyChildren
                  label="Subgrupos"
                  items={group.subgroups || []}
                  empty="Nenhum subgrupo."
                  renderMeta={(sub) => plural(productCount(group.id, sub.id), 'produto', 'produtos')}
                  renderActions={(sub) => subgroupActions(group, sub)}
                />
              </TaxonomyCard>
            ))}
          </div>
        )
      ) : (
        <DataTable>
          <TaxonomyHead label="Grupo" />
          <TBody>
            {groups.length === 0 ? (
              <EmptyRow colSpan={4}>Nenhum grupo.</EmptyRow>
            ) : (
              groups.map((group) => {
                const subs = group.subgroups || [];
                const open = expanded.has(group.id);
                return (
                  <TaxonomyRow
                    key={group.id}
                    icon={groupIcon(group)}
                    title={group.name}
                    subtitle={groupSubtitle(group)}
                    description={group.description}
                    actions={groupActions(group)}
                    open={open}
                    onToggle={subs.length ? () => toggle(group.id) : null}
                    expandLabel={`${open ? 'Recolher' : 'Ver'} subgrupos de ${group.name}`}
                  >
                    <SubTable
                      columns={[
                        { label: 'Subgrupo' },
                        { label: 'Produtos', align: 'right' },
                        { label: 'Ações', align: 'right' },
                      ]}
                    >
                      {subs.map((sub) => (
                        <SubRow key={sub.id}>
                          <SubCell>
                            <span className="font-semibold">{sub.name}</span>
                          </SubCell>
                          <SubCell align="right" muted fit>
                            {productCount(group.id, sub.id)}
                          </SubCell>
                          <SubCell align="right" fit>
                            {subgroupActions(group, sub)}
                          </SubCell>
                        </SubRow>
                      ))}
                    </SubTable>
                  </TaxonomyRow>
                );
              })
            )}
          </TBody>
        </DataTable>
      )}
      <article className="space-y-3 rounded-xl border border-outline bg-surface p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary">
              <Icon name="straighten" filled className="text-2xl" />
            </div>
            <div>
              <h3 className="font-headline text-lg font-extrabold text-on-surface">Formatos</h3>
              <p className="text-xs text-on-surface-variant">{plural(formats.length, 'formato', 'formatos')}</p>
            </div>
          </div>
          <Button type="button" variant="secondary" onClick={() => setEditor({ kind: 'format' })}>
            <Icon name="add" />
            Novo formato
          </Button>
        </div>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {formats.map((format) => (
            <li
              key={format}
              className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-outline-variant px-3 py-1"
            >
              <span className="min-w-0 break-words text-sm font-semibold text-on-surface">{format}</span>
              <TableActions>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  aria-label={`Editar formato ${format}`}
                  onClick={() => setEditor({ kind: 'format', format })}
                >
                  <Icon name="edit" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="danger"
                  aria-label={`Excluir formato ${format}`}
                  onClick={() =>
                    confirmRemove(`Excluir o formato "${format}"?`, () => deleteFormat(format), 'Formato excluído.')
                  }
                >
                  <Icon name="delete" />
                </Button>
              </TableActions>
            </li>
          ))}
        </ul>
      </article>
      {editor?.kind === 'group' ? (
        <FieldModal
          title={editor.group ? 'Editar grupo' : 'Novo grupo'}
          icon="category"
          onClose={() => setEditor(null)}
        >
          <NameForm
            label="Nome do grupo"
            initial={editor.group?.name || ''}
            initialDescription={editor.group?.description || ''}
            initialIcon={editor.group ? groupIcon(editor.group) : ''}
            withDescription
            withIcon
            submitLabel={editor.group ? 'Salvar' : 'Criar grupo'}
            onCancel={() => setEditor(null)}
            onSubmit={(name, description, icon) =>
              run(
                () =>
                  editor.group
                    ? editMenuGroup(editor.group.id, name, description, icon)
                    : addMenuGroup(name, description, icon),
                editor.group ? 'Grupo atualizado.' : 'Grupo criado.'
              )
            }
          />
        </FieldModal>
      ) : null}
      {editor?.kind === 'subgroup' ? (
        <FieldModal
          title={editor.subgroup ? 'Editar subgrupo' : 'Novo subgrupo'}
          icon="category"
          onClose={() => setEditor(null)}
        >
          <NameForm
            label="Nome do subgrupo"
            initial={editor.subgroup?.name || ''}
            submitLabel={editor.subgroup ? 'Salvar' : 'Criar subgrupo'}
            onCancel={() => setEditor(null)}
            onSubmit={(name) =>
              run(
                () =>
                  editor.subgroup
                    ? editMenuSubgroup(editor.group.id, editor.subgroup.id, name)
                    : addMenuSubgroup(editor.group.id, name),
                editor.subgroup ? 'Subgrupo atualizado.' : 'Subgrupo criado.'
              )
            }
          />
        </FieldModal>
      ) : null}
      {editor?.kind === 'format' ? (
        <FieldModal
          title={editor.format ? 'Editar formato' : 'Novo formato'}
          icon="straighten"
          onClose={() => setEditor(null)}
        >
          <NameForm
            label="Formato"
            initial={editor.format || ''}
            submitLabel={editor.format ? 'Salvar' : 'Criar formato'}
            onCancel={() => setEditor(null)}
            onSubmit={(name) =>
              run(
                () => (editor.format ? editFormat(editor.format, name) : addFormat(name)),
                editor.format ? 'Formato atualizado.' : 'Formato criado.'
              )
            }
          />
        </FieldModal>
      ) : null}
    </section>
  );
}
