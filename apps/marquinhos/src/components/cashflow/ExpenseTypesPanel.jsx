import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { DataTable, EmptyRow, TableActions, TBody } from '../ui/DataTable';
import { FieldModal } from '../ui/FieldModal';
import { Icon } from '../ui/Icon';
import { IconPicker } from '../ui/IconPicker';
import { Input } from '../ui/Input';
import { SegmentedControl } from '../ui/SegmentedControl';
import { TaxonomyCard, TaxonomyChildren } from '../ui/TaxonomyCard';
import { SubCell, SubRow, SubTable, TaxonomyHead, TaxonomyRow } from '../ui/TaxonomyTable';
import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';
import { useViewMode } from '../ui/useViewMode';
import {
  createExpenseCategory,
  addExpenseSubtype,
  deleteExpenseCategory,
  deleteExpenseSubtype,
  editExpenseCategory,
  editExpenseSubtype,
  fetchCashFlow,
} from '../../services/dashboardService';
import {
  activeExpenseTypes,
  categoryAllowsSubtypes,
  expenseIcon,
  fixedExpenseCategory,
} from '../../services/catalogTaxonomy';
import { EXPENSE_ICONS } from '../../services/taxonomyIcons';

function NameForm({
  label,
  initial = '',
  initialDescription = '',
  initialIcon = '',
  withDescription = false,
  withIcon = false,
  allows = false,
  showMode = false,
  submitLabel,
  onSubmit,
  onCancel,
}) {
  const toast = useToast();
  const [name, setName] = useState(initial);
  const [description, setDescription] = useState(initialDescription);
  const [icon, setIcon] = useState(initialIcon || 'category');
  const [mode, setMode] = useState(allows ? 'com' : 'sem');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit(name, { allowsSubtypes: mode === 'com', description, icon });
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
          <label htmlFor="categoria-descricao" className="pl-1 text-xs font-label font-bold uppercase text-on-surface-variant">
            Descrição
          </label>
          <textarea
            id="categoria-descricao"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Opcional"
            rows={3}
            className="min-h-11 w-full rounded-2xl border border-outline bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface outline-none placeholder:font-normal placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-0"
          />
        </div>
      ) : null}
      {showMode ? (
        <SegmentedControl
          className="w-full"
          label="Subcategoria"
          items={[
            { id: 'sem', label: 'Sem subcategoria' },
            { id: 'com', label: 'Com subcategoria' },
          ]}
          value={mode}
          onChange={setMode}
        />
      ) : null}
      {withIcon ? <IconPicker value={icon} onChange={setIcon} related={EXPENSE_ICONS} relatedLabel="Despesas e compras" /> : null}
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

function CategoryActions({ category, onEdit, onDelete, onAddSub }) {
  if (fixedExpenseCategory(category.id)) {
    return (
      <span className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-on-surface-variant">
        <Icon name="lock" className="text-base" />
        Não editável
      </span>
    );
  }
  return (
    <TableActions>
      {categoryAllowsSubtypes(category) ? (
        <Button type="button" size="icon" variant="secondary" aria-label={`Nova subcategoria em ${category.name}`} onClick={onAddSub}>
          <Icon name="add" />
        </Button>
      ) : null}
      <Button type="button" size="icon" variant="secondary" aria-label={`Editar ${category.name}`} onClick={onEdit}>
        <Icon name="edit" />
      </Button>
      <Button type="button" size="icon" variant="danger" aria-label={`Excluir ${category.name}`} onClick={onDelete}>
        <Icon name="delete" />
      </Button>
    </TableActions>
  );
}

function natureLabel(nature) {
  return nature === 'fixed' ? 'Fixa' : 'Variável';
}

function plural(count, one, many) {
  return `${count} ${count === 1 ? one : many}`;
}

export function ExpenseTypesPanel({ onClose }) {
  const toast = useToast();
  const { openModal } = useModal();
  const queryClient = useQueryClient();
  const cash = useQuery({ queryKey: ['cash-flow'], queryFn: fetchCashFlow });
  const [view, setView] = useViewMode('categorias');
  const [editor, setEditor] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  const types = activeExpenseTypes(cash.data?.categories || []);
  const expenses = cash.data?.expenses || [];

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
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

  function entryCount(categoryId, subtypeId) {
    return expenses.filter(
      (row) => row.categoryId === categoryId && (subtypeId === undefined || row.subtypeId === subtypeId)
    ).length;
  }

  function subtitle(type) {
    const subs = categoryAllowsSubtypes(type)
      ? plural((type.subtypes || []).length, 'subcategoria', 'subcategorias')
      : 'Sem subcategoria';
    return `${subs} · ${plural(entryCount(type.id), 'lançamento', 'lançamentos')}`;
  }

  function tags(type) {
    const list = [`Despesa ${natureLabel(type.defaultNature).toLowerCase()}`];
    if (fixedExpenseCategory(type.id)) list.unshift('Padrão');
    return list;
  }

  function categoryActions(type) {
    return (
      <CategoryActions
        category={type}
        onEdit={() => setEditor({ kind: 'type', type })}
        onAddSub={() => setEditor({ kind: 'subtype', type })}
        onDelete={() =>
          confirmRemove(`Excluir a categoria "${type.name}"?`, () => deleteExpenseCategory(type.id), 'Categoria excluída.')
        }
      />
    );
  }

  function subtypeActions(type, sub) {
    if (fixedExpenseCategory(type.id)) return null;
    return (
      <TableActions>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          aria-label={`Editar ${sub.name}`}
          onClick={() => setEditor({ kind: 'subtype', type, subtype: sub })}
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
              `Excluir a subcategoria "${sub.name}"?`,
              () => deleteExpenseSubtype(type.id, sub.id),
              'Subcategoria excluída.'
            )
          }
        >
          <Icon name="delete" />
        </Button>
      </TableActions>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl
          label="Visualização das categorias"
          items={[
            { id: 'list', label: 'Lista' },
            { id: 'cards', label: 'Cards' },
          ]}
          value={view}
          onChange={setView}
        />
        <Button type="button" onClick={() => setEditor({ kind: 'type' })}>
          <Icon name="add" />
          Nova categoria
        </Button>
      </div>
      {view === 'cards' ? (
        cash.isLoading ? (
          <p className="text-sm text-on-surface-variant">Carregando categorias...</p>
        ) : types.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Nenhuma categoria.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {types.map((type) => (
              <TaxonomyCard
                key={type.id}
                icon={expenseIcon(type)}
                title={type.name}
                subtitle={subtitle(type)}
                tags={tags(type)}
                description={type.description}
                actions={categoryActions(type)}
              >
                {categoryAllowsSubtypes(type) ? (
                  <TaxonomyChildren
                    label="Subcategorias"
                    items={type.subtypes || []}
                    empty="Nenhuma subcategoria."
                    renderMeta={(sub) =>
                      `${natureLabel(sub.defaultNature || type.defaultNature)} · ${plural(
                        entryCount(type.id, sub.id),
                        'lançamento',
                        'lançamentos'
                      )}`
                    }
                    renderActions={(sub) => subtypeActions(type, sub)}
                  />
                ) : null}
              </TaxonomyCard>
            ))}
          </div>
        )
      ) : (
        <DataTable>
          <TaxonomyHead label="Categoria" />
          <TBody>
            {types.length === 0 ? (
              <EmptyRow colSpan={4}>{cash.isLoading ? 'Carregando categorias...' : 'Nenhuma categoria.'}</EmptyRow>
            ) : (
              types.map((type) => {
                const subs = categoryAllowsSubtypes(type) ? type.subtypes || [] : [];
                const open = expanded.has(type.id);
                return (
                  <TaxonomyRow
                    key={type.id}
                    icon={expenseIcon(type)}
                    title={type.name}
                    tag={fixedExpenseCategory(type.id) ? 'Padrão' : ''}
                    subtitle={subtitle(type)}
                    description={type.description}
                    actions={categoryActions(type)}
                    open={open}
                    onToggle={subs.length ? () => toggle(type.id) : null}
                    expandLabel={`${open ? 'Recolher' : 'Ver'} subcategorias de ${type.name}`}
                  >
                    <SubTable
                      columns={[
                        { label: 'Subcategoria' },
                        { label: 'Natureza' },
                        { label: 'Lançamentos', align: 'right', desktopOnly: true },
                        { label: 'Ações', align: 'right' },
                      ]}
                    >
                      {subs.map((sub) => (
                        <SubRow key={sub.id}>
                          <SubCell>
                            <span className="font-semibold">{sub.name}</span>
                          </SubCell>
                          <SubCell muted fit>
                            {natureLabel(sub.defaultNature || type.defaultNature)}
                          </SubCell>
                          <SubCell align="right" muted fit desktopOnly>
                            {entryCount(type.id, sub.id)}
                          </SubCell>
                          <SubCell align="right" fit>
                            {subtypeActions(type, sub)}
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
      {onClose ? (
        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            <Icon name="close" />
            Fechar
          </Button>
        </div>
      ) : null}
      {editor?.kind === 'type' ? (
        <FieldModal title={editor.type ? 'Editar categoria' : 'Nova categoria'} icon="category" onClose={() => setEditor(null)}>
          <NameForm
            label="Nome da categoria"
            initial={editor.type?.name || ''}
            initialDescription={editor.type?.description || ''}
            initialIcon={editor.type ? expenseIcon(editor.type) : ''}
            withDescription
            withIcon
            allows={editor.type ? categoryAllowsSubtypes(editor.type) : false}
            showMode
            submitLabel={editor.type ? 'Salvar' : 'Criar categoria'}
            onCancel={() => setEditor(null)}
            onSubmit={(name, options) =>
              run(
                () => (editor.type ? editExpenseCategory(editor.type.id, name, options) : createExpenseCategory(name, options)),
                editor.type ? 'Categoria atualizada.' : 'Categoria criada.'
              )
            }
          />
        </FieldModal>
      ) : null}
      {editor?.kind === 'subtype' ? (
        <FieldModal
          title={editor.subtype ? 'Editar subcategoria' : 'Nova subcategoria'}
          icon="category"
          onClose={() => setEditor(null)}
        >
          <NameForm
            label="Nome da subcategoria"
            initial={editor.subtype?.name || ''}
            submitLabel={editor.subtype ? 'Salvar' : 'Criar subcategoria'}
            onCancel={() => setEditor(null)}
            onSubmit={(name) =>
              run(
                () =>
                  editor.subtype
                    ? editExpenseSubtype(editor.type.id, editor.subtype.id, name)
                    : addExpenseSubtype(editor.type.id, name),
                editor.subtype ? 'Subcategoria atualizada.' : 'Subcategoria criada.'
              )
            }
          />
        </FieldModal>
      ) : null}
    </div>
  );
}
