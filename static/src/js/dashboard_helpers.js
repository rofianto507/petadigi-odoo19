/** @odoo-module **/

// ─────────────────────────────────────────────────────────────────────────────
// FILTER INIT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Isi dropdown filter Tahun & Kabupaten.
 * @param {DashboardMap} ctx - instance komponen utama
 */
export async function initFilters(ctx) {
    // Dropdown Tahun
    const tahunEl = ctx.filterTahun.el;
    if (tahunEl) {
        const currentYear = new Date().getFullYear();
        for (let y = currentYear; y >= 2020; y--) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            tahunEl.appendChild(opt);
        }
    }

    // Dropdown Kabupaten
    const kabEl = ctx.filterKabupaten.el;
    if (kabEl) {
        try {
            const kabs = await ctx.orm.searchRead('petadigi.kabupaten', [], ['id', 'name']);
            kabs.forEach(k => {
                const opt = document.createElement('option');
                opt.value = k.id;
                opt.textContent = k.name;
                kabEl.appendChild(opt);
            });
        } catch (_) {}
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// BACK BUTTON
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tambahkan tombol kembali di sudut kiri atas peta.
 * @param {DashboardMap} ctx
 * @param {'kabupaten'|'kecamatan'} targetLevel
 * @param {object|null} backCtx - data konteks untuk kembali ke level sebelumnya
 */
export function addBackButton(ctx, targetLevel, backCtx) {
    if (ctx.backButton) { ctx.backButton.remove(); ctx.backButton = null; }

    const labelMap = {
        kabupaten: 'Kembali ke Peta Kabupaten',
        kecamatan: 'Kembali ke Peta Kecamatan',
    };

    const BackControl = L.Control.extend({
        onAdd: () => {
            const btn = L.DomUtil.create('button', 'petadigi-btn-back');
            btn.innerHTML = `<i class="fa fa-arrow-left"></i> ${labelMap[targetLevel]}`;
            L.DomEvent.on(btn, 'click', async (ev) => {
                L.DomEvent.stopPropagation(ev);
                ctx.map.closePopup();

                // Import dinamis agar tidak circular dependency
                const { loadKabupatenLayer, drillDownKecamatan } = await import("./dashboard_layer_umum");

                if (targetLevel === 'kabupaten') {
                    ctx.kecamatanLayerGroup.clearLayers();
                    ctx.kecamatanLabelGroup.clearLayers();
                    ctx.desaLayerGroup.clearLayers();
                    ctx.desaLabelGroup.clearLayers();
                    ctx._updateBreadcrumb(`<i class="fa fa-map"></i> Peta Umum`);
                    await loadKabupatenLayer(ctx);
                } else if (targetLevel === 'kecamatan' && backCtx) {
                    ctx.desaLayerGroup.clearLayers();
                    ctx.desaLabelGroup.clearLayers();
                    // Trim breadcrumb
                    const items = ctx.breadcrumbRef.el.querySelectorAll('.petadigi-breadcrumb-item');
                    if (items.length > 2) {
                        items[items.length - 1].previousSibling?.remove();
                        items[items.length - 1].remove();
                    }
                    await drillDownKecamatan(ctx, backCtx.kabProps, backCtx.kecLayer);
                }

                if (ctx.backButton) { ctx.backButton.remove(); ctx.backButton = null; }
            });
            return btn;
        },
        onRemove: () => {}
    });

    ctx.backButton = new BackControl({ position: 'topleft' });
    ctx.backButton.addTo(ctx.map);
}

// ─────────────────────────────────────────────────────────────────────────────
// COMING SOON CONTROL
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tampilkan layer kabupaten sebagai background + banner "Segera Hadir".
 * @param {DashboardMap} ctx
 * @param {string} label - nama mode
 * @param {string} color - warna aksen
 */
export async function loadModeComingSoon(ctx, label, color) {
    // Background layer kabupaten
    try {
        const records = await ctx.orm.searchRead(
            'petadigi.kabupaten', [], ['name', 'geometry']
        );
        const features = records.filter(r => r.geometry).map(r => {
            try {
                return { type: "Feature", geometry: JSON.parse(r.geometry), properties: { name: r.name } };
            } catch (_) { return null; }
        }).filter(Boolean);

        const geoLayer = L.geoJSON({ type: "FeatureCollection", features }, {
            style: () => ({
                color: color || '#888888',
                weight: 1.5,
                opacity: 0.6,
                fillColor: '#cccccc',
                fillOpacity: 0.2,
            }),
            onEachFeature: (feature, layer) => {
                layer.on('add', () => {
                    const center = layer.getBounds().getCenter();
                    const lbl = L.marker(center, {
                        icon: L.divIcon({
                            className: 'kabupaten-label',
                            html: `<span>${feature.properties.name}</span>`,
                            iconSize: null,
                        }),
                        interactive: false,
                        zIndexOffset: 100,
                    });
                    ctx.kabupatenLabelGroup.addLayer(lbl);
                });
            }
        });
        ctx.kabupatenLayerGroup.addLayer(geoLayer);
        ctx.map.fitBounds(geoLayer.getBounds());
    } catch (e) {
        console.error(e);
    }

    // Banner coming soon
    const ComingSoonControl = L.Control.extend({
        onAdd: () => {
            const div = L.DomUtil.create('div', 'petadigi-coming-soon');
            div.innerHTML = `
                <i class="fa fa-wrench"></i>
                <strong>${label}</strong>
                <span>Segera hadir</span>
            `;
            div.style.borderLeft = `4px solid ${color}`;
            return div;
        },
        onRemove: () => {}
    });
    ctx.comingSoonControl = new ComingSoonControl({ position: 'topright' });
    ctx.comingSoonControl.addTo(ctx.map);
}
