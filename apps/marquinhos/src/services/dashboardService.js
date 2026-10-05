import {
  getOverview,
  getCashFlow,
  getInventory,
  getFreelancers,
  registerDaily,
  updateDaily,
  addFreelancer,
  addSupplier,
  getSuppliers,
  deleteSupplier,
  createExpense,
  deleteExpense,
  createIncome,
  registerStockEntry,
  createProduction,
  createPromotion,
  createCombo,
  getCustomers,
  createCustomer,
  registerSale,
  deleteInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  peekNextProductCode,
  addInventoryCategory,
  updateFreelancerStatus,
  updateFreelancer,
  deleteFreelancer,
  importStatementRows,
  listStaff,
  createStaffMember,
} from './firestoreService';
import { getCurrentRole } from './authService';
import { isAdminRole } from './roles';

function requireAdmin() {
  if (!isAdminRole(getCurrentRole())) {
    throw new Error('Acesso restrito ao administrador.');
  }
}

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
  requireAdmin();
  return getFreelancers();
}

export function fetchSuppliers() {
  requireAdmin();
  return getSuppliers();
}

export function createSupplier(payload) {
  requireAdmin();
  return addSupplier(payload);
}

export function removeSupplier(supplierId) {
  requireAdmin();
  return deleteSupplier(supplierId);
}

export function createDaily(payload) {
  requireAdmin();
  return registerDaily(payload);
}

export function editDaily(target, payload) {
  requireAdmin();
  return updateDaily(target, payload);
}

export function createFreelancer(payload) {
  requireAdmin();
  return addFreelancer(payload);
}

export function editFreelancer(freelancerId, payload) {
  requireAdmin();
  return updateFreelancer(freelancerId, payload);
}

export function createCashExpense(payload) {
  requireAdmin();
  return createExpense(payload);
}

export function removeCashExpense(expenseId) {
  requireAdmin();
  return deleteExpense(expenseId);
}

export function createCashIncome(payload) {
  requireAdmin();
  return createIncome(payload);
}

export function addStockEntry(payload) {
  return registerStockEntry({
    ...payload,
    linkCash: isAdminRole(getCurrentRole()) && payload.linkCash !== false,
  });
}

export function addProduction(payload) {
  return createProduction(payload);
}

export function addPromotion(payload) {
  return createPromotion(payload);
}

export function addCombo(payload) {
  return createCombo(payload);
}

export function fetchCustomers() {
  return getCustomers();
}

export function addCustomer(payload) {
  return createCustomer(payload);
}

export function checkoutSale(payload) {
  return registerSale(payload);
}

export function addInventoryProduct(payload) {
  return createInventoryItem(payload);
}

export function peekInventoryCode() {
  return peekNextProductCode();
}

export function addInventoryFilter(name) {
  return addInventoryCategory(name);
}

export function editInventoryProduct(itemId, payload) {
  return updateInventoryItem(itemId, payload);
}

export function removeInventoryItem(itemId) {
  requireAdmin();
  return deleteInventoryItem(itemId);
}

export function settleFreelancer(freelancerId) {
  requireAdmin();
  return updateFreelancerStatus(freelancerId, 'available');
}

export function removeFreelancer(freelancerId) {
  requireAdmin();
  return deleteFreelancer(freelancerId);
}

export function importCashStatement(rows) {
  requireAdmin();
  return importStatementRows(rows);
}

export function fetchStaff() {
  requireAdmin();
  return listStaff();
}

export function addStaffMember(payload) {
  requireAdmin();
  return createStaffMember(payload);
}
