import { ChartConfiguration } from 'chart.js';

/**
 * Placeholder chart datasets for the dashboard framework. No analytics
 * backend exists yet — swap these for real API-backed data per chart when
 * the corresponding ERP domain module ships real data.
 */

export const MATERIAL_STATUS_CHART: ChartConfiguration['data'] = {
  labels: ['Delivered', 'In Transit', 'Awaiting Inspection', 'On Hold'],
  datasets: [{ data: [420, 180, 65, 22], backgroundColor: ['#2E7D32', '#1976D2', '#ED6C02', '#D32F2F'] }],
};

export const PURCHASE_TREND_CHART: ChartConfiguration['data'] = {
  labels: ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
  datasets: [
    { label: 'Purchase Orders ($k)', data: [180, 220, 195, 260, 310, 285], borderColor: '#1976D2', backgroundColor: 'rgba(25,118,210,.15)', tension: 0.35, fill: true },
  ],
};

export const VENDOR_PERFORMANCE_CHART: ChartConfiguration['data'] = {
  labels: ['Al Falah Steel', 'Gulf Precision', 'Nordic Valve', 'Apex Fabrication', 'Delta Supplies'],
  datasets: [{ label: 'On-time delivery %', data: [96, 88, 91, 78, 84], backgroundColor: '#1976D2' }],
};

export const PROJECT_PROGRESS_CHART: ChartConfiguration['data'] = {
  labels: ['Refinery Expansion', 'Port Terminal', 'Solar Farm', 'Water Treatment'],
  datasets: [
    { label: 'Complete', data: [72, 45, 90, 28], backgroundColor: '#2E7D32' },
    { label: 'Remaining', data: [28, 55, 10, 72], backgroundColor: '#DCE5EE' },
  ],
};

export const INVENTORY_LEVEL_CHART: ChartConfiguration['data'] = {
  labels: ['Rebar 12mm', 'Welding Electrodes', 'Cement (Bags)', 'Structural Steel', 'PVC Piping'],
  datasets: [
    { label: 'Current Stock', data: [340, 60, 890, 210, 150], backgroundColor: '#1976D2' },
    { label: 'Minimum Threshold', data: [200, 100, 500, 150, 100], backgroundColor: '#D32F2F' },
  ],
};

export const QA_STATUS_CHART: ChartConfiguration['data'] = {
  labels: ['Passed', 'Passed with NCR', 'Failed', 'Pending'],
  datasets: [{ data: [58, 14, 4, 9], backgroundColor: ['#2E7D32', '#ED6C02', '#D32F2F', '#8098b8'] }],
};
