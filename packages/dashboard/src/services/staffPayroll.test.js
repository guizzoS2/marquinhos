import assert from 'node:assert/strict';
import test from 'node:test';
import {
  contractPayrollDates,
  fifthBusinessDay,
  syncStaffPayrollExpenses,
  toIsoDate,
} from './staffPayroll.js';

test('5º dia útil ignora sábado e domingo', () => {
  assert.equal(toIsoDate(fifthBusinessDay(2024, 0)), '2024-01-05');
  assert.equal(toIsoDate(fifthBusinessDay(2026, 9)), '2026-10-07');
});

test('mês fora da vigência não gera pagamento', () => {
  assert.deepEqual(contractPayrollDates('2024-01-06', '2024-01-31'), []);
  assert.deepEqual(contractPayrollDates('2024-01-01', '2024-02-29'), ['2024-01-05', '2024-02-07']);
});

test('custo novo só altera mês futuro', () => {
  const person = {
    id: 4,
    name: 'Ana',
    contractStart: '2024-01-01',
    contractEnd: '2024-02-29',
    monthlyCostCents: 200000,
  };
  const first = syncStaffPayrollExpenses([person], [], undefined, new Date(2024, 0, 10));
  const january = first.find((row) => row.isoDate === '2024-01-05');
  const raised = syncStaffPayrollExpenses(
    [{ ...person, monthlyCostCents: 300000 }],
    first,
    undefined,
    new Date(2024, 0, 10)
  );
  assert.equal(raised.find((row) => row.isoDate === '2024-01-05').amount, january.amount);
  assert.equal(raised.find((row) => row.isoDate === '2024-02-07').amount, 300000);
});

test('fim do contrato apaga lançamento futuro e guarda o passado', () => {
  const person = {
    id: 4,
    name: 'Ana',
    contractStart: '2024-01-01',
    contractEnd: '2024-02-29',
    monthlyCostCents: 200000,
  };
  const first = syncStaffPayrollExpenses([person], [], undefined, new Date(2024, 0, 10));
  const cut = syncStaffPayrollExpenses(
    [{ ...person, contractEnd: '2024-01-31' }],
    first,
    undefined,
    new Date(2024, 0, 10)
  );
  assert.equal(cut.some((row) => row.isoDate === '2024-01-05'), true);
  assert.equal(cut.some((row) => row.isoDate === '2024-02-07'), false);
});
