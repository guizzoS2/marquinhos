const {
  overview,
  cashFlow,
  inventory,
  freelancers,
  suppliers,
} = require('../data/mocks');

function getOverview(_req, res) {
  return res.json(overview);
}

function getCashFlow(_req, res) {
  return res.json(cashFlow);
}

function getInventory(_req, res) {
  return res.json(inventory);
}

function getFreelancers(_req, res) {
  return res.json(freelancers);
}

function getSuppliers(_req, res) {
  return res.json(suppliers);
}

function createDaily(req, res) {
  const { freelancerId, date, role, value } = req.body || {};

  if (!freelancerId || !date || !role || value == null) {
    return res.status(400).json({ message: 'Dados incompletos para diária.' });
  }

  return res.status(201).json({
    message: 'Diária registrada (mock).',
    daily: { freelancerId, date, role, value },
  });
}

module.exports = {
  getOverview,
  getCashFlow,
  getInventory,
  getFreelancers,
  getSuppliers,
  createDaily,
};
