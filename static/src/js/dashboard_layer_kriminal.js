/** @odoo-module **/

import { loadModeComingSoon } from "./dashboard_helpers";

/**
 * Peta Kriminal
 * TODO: implementasi tampilan titik/heatmap data petadigi.kriminalitas
 *
 * @param {DashboardMap} ctx
 */
export async function loadModeKriminal(ctx) {
    await loadModeComingSoon(ctx, 'Peta Kriminal', '#e74c3c');
}
