/** @odoo-module **/

import { loadModeComingSoon } from "./dashboard_helpers";

/**
 * Peta Bencana
 * TODO: implementasi tampilan data bencana
 *
 * @param {DashboardMap} ctx
 */
export async function loadModeBencana(ctx) {
    await loadModeComingSoon(ctx, 'Peta Bencana', '#2980b9');
}
