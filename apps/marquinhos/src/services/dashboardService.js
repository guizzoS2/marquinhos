import {
  getOverview,
  getCashFlow,
  getInventory,
  getFreelancers,
  registerDaily,
  addFreelancer,
  addSupplier,
  getSuppliers,
  deleteSupplier,
  createExpense,
  deleteExpense,
  createIncome,
  registerStockEntry,
  deleteInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  updateFreelancerStatus,
  deleteFreelancer,
  importStatementRows,
  listStaffPeople,
  createHouseStaff,
  updateHouseStaff,
  inviteHouseStaff,
  saveHouseStaffAccess,
  removeHouseStaff,
} from './firestoreService';
import { getCurrentRole, getCurrentUser } from './authService';
import { isAdminRole, isBarOwner } from './roles';

function requireAdmin() {
  if (!isAdminRole(getCurrentRole())) {
    throw new Error('Acesso restrito ao administrador.');
  }
}

function requireOwner() {
  if (!isBarOwner(getCurrentUser())) {
    throw new Error('Acesso restrito ao dono.');
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

export function createFreelancer(payload) {
  requireAdmin();
  return addFreelancer(payload);
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

export function addInventoryProduct(payload) {
  return createInventoryItem(payload);
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
  return listStaffPeople();
}

export function createStaff(payload) {
  requireOwner();
  return createHouseStaff(payload);
}

export function updateStaff(staffId, payload) {
  requireOwner();
  return updateHouseStaff(staffId, payload);
}

export function inviteStaff(staffId, payload) {
  requireOwner();
  return inviteHouseStaff(staffId, payload);
}

export function saveStaffAccess(staffId, payload) {
  requireOwner();
  return saveHouseStaffAccess(staffId, payload);
}

export function removeStaff(staffId) {
  requireOwner();
  return removeHouseStaff(staffId);
}
