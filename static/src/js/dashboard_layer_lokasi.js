/** @odoo-module **/

import { loadModeComingSoon } from "./dashboard_helpers";

/**
 * Lokasi Penting
 * TODO: implementasi tampilan lokasi penting (Polres, RS, dll)
 *
 * @param {DashboardMap} ctx
 */
export async function loadModeLokasi(ctx) {
    await loadModeComingSoon(ctx, 'Lokasi Penting', '#27ae60');
}
