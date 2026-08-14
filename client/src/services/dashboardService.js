import {
  getOverview,
  getCashFlow,
  getInventory,
  getFreelancers,
  registerDaily,
  addFreelancer,
  createExpense,
  deleteExpense,
  createIncome,
  registerStockEntry,
  deleteInventoryItem,
  updateFreelancerStatus,
  deleteFreelancer,
} from './firestoreService';

export function fetchOverview() {
  return getOverview();
}

export function fetchCashFlow() {
  return getCashFlow();
}

export function fetchInventory() {
  return getInventory();
}

export function fetchFreelancers() {
  return getFreelancers();
}

export function createDaily(payload) {
  return registerDaily(payload);
}

export function createFreelancer(payload) {
  return addFreelancer(payload);
}

export function createCashExpense(payload) {
  return createExpense(payload);
}

export function removeCashExpense(expenseId) {
  return deleteExpense(expenseId);
}

export function createCashIncome(payload) {
  return createIncome(payload);
}

export function addStockEntry(payload) {
  return registerStockEntry(payload);
}

export function removeInventoryItem(itemId) {
  return deleteInventoryItem(itemId);
}

export function settleFreelancer(freelancerId) {
  return updateFreelancerStatus(freelancerId, 'available');
}

export function removeFreelancer(freelancerId) {
  return deleteFreelancer(freelancerId);
}
