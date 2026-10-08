import {
  getOverview,
  getCashFlow,
  getInventory,
  getFreelancers,
  registerDaily,
  updateDaily,
  deleteDaily,
  addFreelancer,
  addSupplier,
  updateSupplier,
  getSuppliers,
  deleteSupplier,
  registerPurchase,
  cancelPurchase,
  createExpense,
  addExpenseCategory,
  updateExpense,
  deleteExpense,
  createIncome,
  updateIncome,
  deleteIncome,
  registerStockEntry,
  createProduction,
  updateProduction,
  deleteProduction,
  createPromotion,
  updatePromotion,
  deletePromotion,
  deactivatePromotion,
  createCombo,
  updateCombo,
  deleteCombo,
  getCustomers,
  createCustomer,
  registerSale,
  saveOpenSale,
  createOpenComanda,
  closeShift,
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
  saveStaffPerson,
  updateStaffPerson,
  setStaffActive,
  openStaffAccount,
  createStaffMember,
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

export function fetchOverview(period) {
  return getOverview(period);
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

export function editSupplier(supplierId, payload) {
  requireAdmin();
  return updateSupplier(supplierId, payload);
}

export function addPurchase(payload) {
  requireAdmin();
  return registerPurchase(payload);
}

export function reversePurchase(purchaseId) {
  requireAdmin();
  return cancelPurchase(purchaseId);
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

export function removeDaily(target) {
  requireAdmin();
  return deleteDaily(target);
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

export function createExpenseCategory(name) {
  requireAdmin();
  return addExpenseCategory(name);
}

export function editCashExpense(expenseId, payload) {
  requireAdmin();
  return updateExpense(expenseId, payload);
}

export function removeCashExpense(expenseId) {
  requireAdmin();
  return deleteExpense(expenseId);
}

export function createCashIncome(payload) {
  requireAdmin();
  return createIncome(payload);
}

export function editCashIncome(incomeId, payload) {
  requireAdmin();
  return updateIncome(incomeId, payload);
}

export function removeCashIncome(incomeId) {
  requireAdmin();
  return deleteIncome(incomeId);
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

export function editProduction(productionId, payload) {
  return updateProduction(productionId, payload);
}

export function removeProduction(productionId) {
  return deleteProduction(productionId);
}

export function addPromotion(payload) {
  return createPromotion(payload);
}

export function editPromotion(promotionId, payload) {
  return updatePromotion(promotionId, payload);
}

export function removePromotion(promotionId) {
  return deletePromotion(promotionId);
}

export function inactivatePromotion(promotionId) {
  return deactivatePromotion(promotionId);
}

export function addCombo(payload) {
  return createCombo(payload);
}

export function editCombo(comboId, payload) {
  return updateCombo(comboId, payload);
}

export function removeCombo(comboId) {
  return deleteCombo(comboId);
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

export function saveOpenTab(payload) {
  return saveOpenSale(payload);
}

export function openComanda(payload) {
  return createOpenComanda(payload);
}

export function closeCashShift() {
  requireAdmin();
  return closeShift();
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
  return saveStaffPerson(payload);
}

export function editStaffMember(staffId, payload) {
  requireAdmin();
  return updateStaffPerson(staffId, payload);
}

export function deactivateStaffMember(staffId) {
  requireAdmin();
  return setStaffActive(staffId, false);
}

export function reactivateStaffMember(staffId) {
  requireAdmin();
  return setStaffActive(staffId, true);
}

export function inviteStaffAccount(staffId, payload) {
  requireAdmin();
  return openStaffAccount(staffId, payload);
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
