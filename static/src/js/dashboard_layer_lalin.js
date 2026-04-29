/** @odoo-module **/

import { loadModeComingSoon } from "./dashboard_helpers";

/**
 * Peta Lalu Lintas
 * TODO: implementasi tampilan data lalu lintas
 *
 * @param {DashboardMap} ctx
 */
export async function loadModeLayLin(ctx) {
    await loadModeComingSoon(ctx, 'Peta Lalu Lintas', '#e67e22');
}
