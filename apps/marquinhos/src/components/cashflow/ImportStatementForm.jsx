import { useState } from 'react';
import { Button } from '../ui/Button';
import { FileField } from '../ui/FileField';
import { Icon } from '../ui/Icon';
import { Dropdown } from '../ui/Dropdown';
import { useToast } from '../../contexts/ToastContext';
import { formatCents } from '../../services/cashFlowUtils';
import { parseStatementFile } from '../../services/statementImport';
import { importCashStatement } from '../../services/dashboardService';

export function ImportStatementForm({ onSuccess, onCancel }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [fileName, setFileName] = useState('');

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setFileName(file.name);
    try {
      const parsed = await parseStatementFile(file);
      if (!parsed.length) {
        throw new Error('Nenhum lançamento encontrado. Tente um CSV do banco.');
      }
      setRows(parsed);
    } catch (err) {
      setRows([]);
      setError(err?.message || 'Não foi possível ler o arquivo.');
    }
  }

  function patchRow(id, patch) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  async function handleConfirm() {
    const selected = rows.filter((row) => row.selected);
    if (!selected.length) {
      setError('Selecione ao menos um lançamento.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await importCashStatement(selected);
      toast.success(
        `${result.created} lançamento(s) gravado(s). ${result.skipped} já existiam.`
      );
      onSuccess?.();
      onCancel();
    } catch (err) {
      const message = err?.message || 'Falha ao lançar o extrato.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-on-surface-variant">
        Envie o PDF ou CSV do banco. Nada entra no caixa até você revisar e confirmar. Diária de
        freela não passa por aqui.
      </p>
      <FileField
        label="Arquivo"
        accept=".pdf,.csv,.txt,.ofx,application/pdf,text/csv"
        onChange={handleFile}
        fileName={fileName}
      />

      {rows.length ? (
        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {rows.map((row) => (
            <article
              key={row.id}
              className="bg-surface-container-low rounded-2xl p-3 space-y-2"
            >
              <label className="flex items-center gap-3 min-h-11">
                <input
                  type="checkbox"
                  checked={row.selected}
                  onChange={(event) => patchRow(row.id, { selected: event.target.checked })}
                  className="h-5 w-5"
                />
                <span className="text-xs text-on-surface-variant">{row.date}</span>
                <span className="font-semibold">{formatCents(row.amountCents)}</span>
              </label>
              <input
                value={row.description}
                onChange={(event) => patchRow(row.id, { description: event.target.value })}
                className="w-full bg-surface-container-lowest border border-outline rounded-xl py-2 px-3 min-h-11 text-sm outline-none focus:border-primary focus:outline-none focus:ring-0"
              />
              <Dropdown
                label="Tipo do lançamento"
                muted
                value={row.kind}
                onChange={(kind) => patchRow(row.id, { kind })}
                options={[
                  { value: 'entrada', label: 'Entrada' },
                  { value: 'saida', label: 'Saída' },
                ]}
              />
            </article>
          ))}
        </div>
      ) : null}

      {error ? <p className="text-sm text-error font-medium">{error}</p> : null}

      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="secondary" type="button" onClick={onCancel}>
          <Icon name="cancel" />
          Cancelar
        </Button>
        <Button type="button" onClick={handleConfirm} disabled={saving || !rows.length}>
          <Icon name="check" />
          {saving ? 'Lançando...' : 'Confirmar lançamentos'}
        </Button>
      </div>
    </div>
  );
}
