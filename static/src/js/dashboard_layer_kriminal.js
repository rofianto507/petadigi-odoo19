/** @odoo-module **/

/**
 * Peta Kriminal
 * Menampilkan choropleth kriminalitas per kabupaten
 * dengan legenda di pojok kanan bawah.
 */

// ── Skala warna berdasarkan jumlah kasus ────────────────────────────────────
export const KRIMINAL_COLORS = [
    { min: 2001, max: Infinity, color: '#922b21', label: '> 2.000 Kasus' },
    { min: 1001, max: 2000,    color: '#e74c3c', label: '> 1.000 Kasus' },
    { min:  501, max: 1000,    color: '#e67e22', label: '> 500 Kasus'   },
    { min:    1, max:  500,    color: '#f1c40f', label: '>= 1 Kasus'    },
    { min:    0, max:    0,    color: '#abebc6', label: 'Tidak Ada Kasus' },
];

export function getKriminalColor(jumlah) {
    for (const tier of KRIMINAL_COLORS) {
        if (jumlah >= tier.min) return tier.color;
    }
    return '#abebc6';
}

// ── Legend Control ───────────────────────────────────────────────────────────
export function addKriminalLegend(ctx) {
    // Hapus legend lama jika ada
    if (ctx.kriminalLegend) {
        ctx.kriminalLegend.remove();
        ctx.kriminalLegend = null;
    }

    const KriminalLegend = L.Control.extend({
        onAdd() {
            const div = L.DomUtil.create('div', 'petadigi-legend petadigi-legend--kriminal');
            div.innerHTML = `
                <div class="petadigi-legend-title">
                    <i class="fa fa-exclamation-triangle"></i> Legenda Kriminalitas
                </div>
                <ul class="petadigi-legend-list">
                    ${KRIMINAL_COLORS.map(tier => `
                        <li>
                            <span class="petadigi-legend-swatch" style="background:${tier.color};"></span>
                            <span class="petadigi-legend-label">${tier.label}</span>
                        </li>
                    `).join('')}
                </ul>
            `;
            // Cegah klik/scroll di legend meneruskan ke map
            L.DomEvent.disableClickPropagation(div);
            L.DomEvent.disableScrollPropagation(div);
            return div;
        },
        onRemove() {}
    });

    ctx.kriminalLegend = new KriminalLegend({ position: 'bottomright' });
    ctx.kriminalLegend.addTo(ctx.map);
}

export function removeKriminalLegend(ctx) {
    if (ctx.kriminalLegend) {
        ctx.kriminalLegend.remove();
        ctx.kriminalLegend = null;
    }
}

// ── Main loader ──────────────────────────────────────────────────────────────
export async function loadModeKriminal(ctx) {
    ctx._clearAllLayers();

    // Tampilkan legenda
    addKriminalLegend(ctx);

    // TODO: load choropleth kriminalitas per kabupaten
    // (akan diimplementasi di langkah berikutnya)
}
