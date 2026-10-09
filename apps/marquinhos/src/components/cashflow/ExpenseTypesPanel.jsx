import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { DataTable, EmptyRow, TableActions, Tag, TBody, Td, Th, THead, Tr } from '../ui/DataTable';
import { FieldModal } from '../ui/FieldModal';
import { Icon } from '../ui/Icon';
import { Input } from '../ui/Input';
import { SegmentedControl } from '../ui/SegmentedControl';
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
import { activeExpenseTypes, categoryAllowsSubtypes, expenseTag, fixedExpenseCategory } from '../../services/catalogTaxonomy';

function NameForm({
  label,
  initial = '',
  initialDescription = '',
  withDescription = false,
  allows = false,
  showMode = false,
  submitLabel,
  onSubmit,
  onCancel,
}) {
  const toast = useToast();
  const [name, setName] = useState(initial);
  const [description, setDescription] = useState(initialDescription);
  const [mode, setMode] = useState(allows ? 'com' : 'sem');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit(name, mode === 'com', description);
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
  const fixed = fixedExpenseCategory(category.id);
  if (fixed) return <span className="text-sm text-on-surface-variant">(fixo)</span>;
  return (
    <TableActions>
      <Button type="button" size="icon" variant="secondary" aria-label={`Editar ${category.name}`} onClick={onEdit}>
        <Icon name="edit" />
      </Button>
      {categoryAllowsSubtypes(category) ? (
        <Button type="button" size="icon" variant="secondary" aria-label={`Nova subcategoria em ${category.name}`} onClick={onAddSub}>
          <Icon name="add" />
        </Button>
      ) : null}
      <Button type="button" size="icon" variant="danger" aria-label={`Excluir ${category.name}`} onClick={onDelete}>
        <Icon name="delete" />
      </Button>
    </TableActions>
  );
}

function CategoryTag({ category }) {
  const tag = expenseTag(category.id, { icon: category.icon, name: category.name });
  return (
    <Tag tone={tag.tone} icon={tag.icon}>
      {category.name}
    </Tag>
  );
}

function SubtypeRow({ subtype, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="min-w-0 break-words text-sm text-on-surface">{subtype.name}</span>
      <div className="flex shrink-0 gap-2">
        <Button type="button" size="icon" variant="secondary" aria-label={`Editar ${subtype.name}`} onClick={onEdit}>
          <Icon name="edit" />
        </Button>
        <Button type="button" size="icon" variant="danger" aria-label={`Excluir ${subtype.name}`} onClick={onDelete}>
          <Icon name="delete" />
        </Button>
      </div>
    </div>
  );
}

export function ExpenseTypesPanel({ onClose }) {
  const toast = useToast();
  const { openModal } = useModal();
  const queryClient = useQueryClient();
  const cash = useQuery({ queryKey: ['cash-flow'], queryFn: fetchCashFlow });
  const [view, setView] = useViewMode('categorias');
  const [editor, setEditor] = useState(null);
  const types = activeExpenseTypes(cash.data?.categories || []);
  const fixedTypes = types.filter((type) => fixedExpenseCategory(type.id));
  const openTypes = types.filter((type) => !fixedExpenseCategory(type.id));

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
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

  function subtypeList(type) {
    if (!categoryAllowsSubtypes(type)) return 'Sem subcategoria';
    const names = (type.subtypes || []).map((item) => item.name);
    return names.length ? names.join(', ') : 'Nenhuma subcategoria';
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
      {cash.isLoading ? <p className="text-sm text-on-surface-variant">Carregando categorias...</p> : null}
      {fixedTypes.length ? (
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-on-surface">Fixas</h3>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {fixedTypes.map((type) => (
              <li key={type.id} className="min-w-0 rounded-xl border border-outline px-3 py-2">
                <CategoryTag category={type} />
                {type.description ? (
                  <p className="mt-1 break-words text-sm text-on-surface-variant">{type.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {!cash.isLoading && !openTypes.length && fixedTypes.length ? null : view === 'cards' ? (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {openTypes.map((type) => (
            <li key={type.id} className="space-y-3 rounded-xl border border-outline p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <CategoryTag category={type} />
                  {type.description ? (
                    <p className="break-words text-sm text-on-surface-variant">{type.description}</p>
                  ) : null}
                </div>
                <CategoryActions
                  category={type}
                  onEdit={() => setEditor({ kind: 'type', type })}
                  onAddSub={() => setEditor({ kind: 'subtype', type })}
                  onDelete={() =>
                    confirmRemove(
                      `Excluir a categoria "${type.name}"?`,
                      () => deleteExpenseCategory(type.id),
                      'Categoria excluída.'
                    )
                  }
                />
              </div>
              {categoryAllowsSubtypes(type) ? (
                <div className="space-y-2">
                  {(type.subtypes || []).length ? (
                    (type.subtypes || []).map((sub) => (
                      <SubtypeRow
                        key={sub.id}
                        subtype={sub}
                        onEdit={() => setEditor({ kind: 'subtype', type, subtype: sub })}
                        onDelete={() =>
                          confirmRemove(
                            `Excluir a subcategoria "${sub.name}"?`,
                            () => deleteExpenseSubtype(type.id, sub.id),
                            'Subcategoria excluída.'
                          )
                        }
                      />
                    ))
                  ) : (
                    <p className="text-sm text-on-surface-variant">Nenhuma subcategoria</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-on-surface-variant">Sem subcategoria</p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <DataTable>
          <THead>
            <Th>Categoria</Th>
            <Th>Descrição</Th>
            <Th>Subcategorias</Th>
            <Th align="right">Ações</Th>
          </THead>
          <TBody>
            {openTypes.length === 0 ? (
              <EmptyRow colSpan={4}>
                {cash.isLoading ? 'Carregando categorias...' : fixedTypes.length ? 'Nenhuma outra categoria.' : 'Nenhuma categoria.'}
              </EmptyRow>
            ) : (
              openTypes.map((type) => (
                <Tr key={type.id}>
                  <Td>
                    <CategoryTag category={type} />
                  </Td>
                  <Td tone="muted">{type.description || '—'}</Td>
                  <Td>
                    {categoryAllowsSubtypes(type) ? (
                      <div className="space-y-2">
                        {(type.subtypes || []).map((sub) => (
                          <SubtypeRow
                            key={sub.id}
                            subtype={sub}
                            onEdit={() => setEditor({ kind: 'subtype', type, subtype: sub })}
                            onDelete={() =>
                              confirmRemove(
                                `Excluir a subcategoria "${sub.name}"?`,
                                () => deleteExpenseSubtype(type.id, sub.id),
                                'Subcategoria excluída.'
                              )
                            }
                          />
                        ))}
                        {(type.subtypes || []).length ? null : (
                          <span className="text-sm text-on-surface-variant">Nenhuma subcategoria</span>
                        )}
                      </div>
                    ) : (
                      subtypeList(type)
                    )}
                  </Td>
                  <Td align="right" nowrap>
                    <CategoryActions
                      category={type}
                      onEdit={() => setEditor({ kind: 'type', type })}
                      onAddSub={() => setEditor({ kind: 'subtype', type })}
                      onDelete={() =>
                        confirmRemove(
                          `Excluir a categoria "${type.name}"?`,
                          () => deleteExpenseCategory(type.id),
                          'Categoria excluída.'
                        )
                      }
                    />
                  </Td>
                </Tr>
              ))
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
            withDescription
            allows={editor.type ? categoryAllowsSubtypes(editor.type) : false}
            showMode
            submitLabel={editor.type ? 'Salvar' : 'Criar categoria'}
            onCancel={() => setEditor(null)}
            onSubmit={(name, allowsSubtypes, description) =>
              run(
                () =>
                  editor.type
                    ? editExpenseCategory(editor.type.id, name, { allowsSubtypes, description })
                    : createExpenseCategory(name, { allowsSubtypes, description }),
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
