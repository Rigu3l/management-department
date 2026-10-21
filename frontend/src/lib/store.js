// src/lib/store.js — data layer: tries the PHP API, falls back to demo
// data when the backend is unreachable (frontend-only preview).

import { api } from './api';
import {
  mockDashboard, mockReport, mockBudgetsList, mockTargetsList,
  mockSaveBudget, mockDeleteBudget, mockSaveTarget, mockDeleteTarget,
  mockDecisionsList, mockSaveDecision, mockDeleteDecision,
  mockAlertsList, mockCreateAlert, mockSetAlertStatus, mockDeleteAlert,
} from './mock';

let usingMock = false;
export const isDemo = () => usingMock;

async function withFallback(fn, fallback) {
  try {
    return await fn();
  } catch (e) {
    usingMock = true;
    console.warn('[management] API unreachable, using demo data:', e.message);
    return fallback();
  }
}

export const store = {
  getDashboard: (params) => withFallback(() => api.dashboard(params), () => mockDashboard(params)),
  getReport: (params) => withFallback(() => api.report(params), () => mockReport(params)),
  logReport: (data) => withFallback(() => api.logReport(data), async () => ({ success: true })),

  getBudgets: (month) => withFallback(() => api.budgets(month), () => mockBudgetsList(month)),
  getTargets: (params) => withFallback(() => api.targets(params), () => mockTargetsList(params)),
  saveBudget: (data) => withFallback(() => api.saveBudget(data), () => mockSaveBudget(data)),
  deleteBudget: (id) => withFallback(() => api.deleteBudget(id), () => mockDeleteBudget(id)),
  saveTarget: (data) => withFallback(() => api.saveTarget(data), () => mockSaveTarget(data)),
  deleteTarget: (id) => withFallback(() => api.deleteTarget(id), () => mockDeleteTarget(id)),

  getDecisions: (params) => withFallback(() => api.decisions(params), () => mockDecisionsList(params)),
  saveDecision: (data) => withFallback(() => api.saveDecision(data), () => mockSaveDecision(data)),
  deleteDecision: (id) => withFallback(() => api.deleteDecision(id), () => mockDeleteDecision(id)),

  getAlerts: (params) => withFallback(() => api.alerts(params), () => mockAlertsList(params)),
  createAlert: (data) => withFallback(() => api.createAlert(data), () => mockCreateAlert(data)),
  setAlertStatus: (id, status) => withFallback(() => api.setAlertStatus(id, status), () => mockSetAlertStatus(id, status)),
  deleteAlert: (id) => withFallback(() => api.deleteAlert(id), () => mockDeleteAlert(id)),
};
