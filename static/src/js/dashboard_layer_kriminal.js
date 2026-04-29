/** @odoo-module **/

/**
 * Peta Kriminal
 * Choropleth kriminalitas per kabupaten/kecamatan — warna berdasarkan jumlah kasus.
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

// ── Helpers: baca nilai filter aktif ────────────────────────────────────────
function _getActiveFilters(ctx) {
    const tahun     = ctx.filterTahun?.el?.value     || '';
    const kabupaten = ctx.filterKabupaten?.el?.value || '';
    return { tahun, kabupatenId: kabupaten ? parseInt(kabupaten) : null };
}

// ── Helper: build domain filter ──────────────────────────────────────────────
function _buildDomain(tahun, extraDomain = []) {
    const domain = [...extraDomain];
    if (tahun) {
        domain.push(['tanggal_kejadian', '>=', `${tahun}-01-01 00:00:00`]);
        domain.push(['tanggal_kejadian', '<=', `${tahun}-12-31 23:59:59`]);
    }
    return domain;
}

// ── Helper: parse kabupaten_id dari hasil read_group ─────────────────────────
function _buildKasusMap(groups) {
    const kasusMap = {};
    for (const g of groups) {
        if (!g.kabupaten_id) continue;
        const kabId = Array.isArray(g.kabupaten_id) ? g.kabupaten_id[0] : g.kabupaten_id;
        kasusMap[kabId] = g.__count || 0;
    }
    return kasusMap;
}

function _buildKecamatanKasusMap(groups) {
    const kasusMap = {};
    for (const g of groups) {
        if (!g.kecamatan_id) continue;
        const kecId = Array.isArray(g.kecamatan_id) ? g.kecamatan_id[0] : g.kecamatan_id;
        kasusMap[kecId] = g.__count || 0;
    }
    return kasusMap;
}

// ════════════════════════════════════════════════════════════════════════════
// LEVEL 1 — KABUPATEN
// ════════════════════════════════════════════════════════════════════════════
export async function loadModeKriminal(ctx) {
    addKriminalLegend(ctx);
    ctx.currentLevel = 'kabupaten';

    const { tahun, kabupatenId } = _getActiveFilters(ctx);
    const baseDomain = kabupatenId ? [['kabupaten_id', '=', kabupatenId]] : [];

    try {
        // 1. Jumlah kasus per kabupaten
        const groups = await ctx.orm.call(
            'petadigi.kriminalitas',
            'read_group',
            [_buildDomain(tahun, baseDomain), ['kabupaten_id'], ['kabupaten_id']],
            { lazy: false }
        );
        const kasusMap = _buildKasusMap(groups);

        // 2. Geometry kabupaten
        const kabDomain = kabupatenId ? [['id', '=', kabupatenId]] : [];
        const records = await ctx.orm.searchRead(
            'petadigi.kabupaten',
            kabDomain,
            ['id', 'code', 'name', 'type', 'kecamatan_ids', 'geometry'],
        );

        const features = records
            .filter(r => r.geometry)
            .map(r => {
                try {
                    const jumlah = kasusMap[r.id] || 0;
                    return {
                        type: "Feature",
                        geometry: JSON.parse(r.geometry),
                        properties: {
                            id: r.id,
                            code: r.code,
                            name: r.name,
                            type: r.type,
                            jumlah_kecamatan: r.kecamatan_ids ? r.kecamatan_ids.length : 0,
                            jumlah_kasus: jumlah,
                            color: getKriminalColor(jumlah),
                        }
                    };
                } catch (e) {
                    console.warn(`Gagal parse geometry kabupaten: ${r.name}`, e);
                    return null;
                }
            })
            .filter(Boolean);

        if (features.length === 0) return;

        // 3. Render choropleth kabupaten
        const geoLayer = L.geoJSON({ type: "FeatureCollection", features }, {
            style: (feature) => ({
                color: '#555555', weight: 1.5, opacity: 1,
                fillColor: feature.properties.color, fillOpacity: 0.75,
            }),
            onEachFeature: (feature, layer) => {
                const props = feature.properties;

                layer.on('add', () => {
                    const center = layer.getBounds().getCenter();
                    const label = L.marker(center, {
                        icon: L.divIcon({
                            className: 'kabupaten-label',
                            html: `<span>${props.name}</span>`,
                            iconSize: null,
                        }),
                        interactive: false,
                        zIndexOffset: 100,
                    });
                    ctx.kabupatenLabelGroup.addLayer(label);
                });

                layer.on('mouseover', () => {
                    layer.setStyle({ weight: 2.5, fillOpacity: 0.9 });
                    layer.bringToFront();
                });
                layer.on('mouseout', () => {
                    layer.setStyle({ weight: 1.5, fillOpacity: 0.75 });
                });
                layer.on('click', (e) => _showKriminalKabupatenPopup(ctx, e, props, layer, tahun));
            }
        });

        ctx.kabupatenLayerGroup.addLayer(geoLayer);
        ctx.map.fitBounds(geoLayer.getBounds());

    } catch (error) {
        console.error("Gagal memuat data kriminalitas:", error);
    }
}

// ── Popup Kabupaten ──────────────────────────────────────────────────────────
function _showKriminalKabupatenPopup(ctx, e, props, layer, tahun) {
    const tipeLabel  = props.type === 'KOTA' ? 'Kota' : 'Kabupaten';
    const tahunLabel = tahun ? `Tahun ${tahun}` : 'Semua Tahun';
    const kasusLabel = props.jumlah_kasus > 0
        ? `<strong style="color:${props.color};">${props.jumlah_kasus.toLocaleString('id-ID')} Kasus</strong>`
        : `<strong style="color:#27ae60;">Tidak Ada Kasus</strong>`;

    const popupContent = `
        <div class="petadigi-popup">
            <div class="petadigi-popup-header" style="background:#922b21;">
                <i class="fa fa-exclamation-triangle"></i>
                <strong>${tipeLabel} ${props.name}</strong>
            </div>
            <div class="petadigi-popup-body">
                <table>
                    <tr>
                        <td><i class="fa fa-barcode"></i> Kode</td>
                        <td><strong>${props.code}</strong></td>
                    </tr>
                    <tr>
                        <td><i class="fa fa-calendar"></i> Periode</td>
                        <td><strong>${tahunLabel}</strong></td>
                    </tr>
                    <tr>
                        <td><i class="fa fa-list"></i> Kecamatan</td>
                        <td><strong>${props.jumlah_kecamatan} Kecamatan</strong></td>
                    </tr>
                    <tr>
                        <td><i class="fa fa-exclamation-circle" style="color:#e74c3c;"></i> Kasus</td>
                        <td>${kasusLabel}</td>
                    </tr>
                </table>
            </div>
            <div class="petadigi-popup-footer">
                <button class="petadigi-btn-detail" style="background:#922b21;" id="btn-kriminal-kec-${props.id}">
                    <i class="fa fa-search-plus"></i> Lihat Detail Kecamatan
                </button>
            </div>
        </div>
    `;

    const popup = L.popup({ maxWidth: 280, className: 'petadigi-leaflet-popup' })
        .setLatLng(e.latlng)
        .setContent(popupContent);

    popup.once('add', () => {
        setTimeout(() => {
            const btn = document.getElementById(`btn-kriminal-kec-${props.id}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    ctx.map.closePopup();
                    ctx._updateBreadcrumb(`<i class="fa fa-exclamation-triangle"></i> Peta Kriminal`);
                    ctx._appendBreadcrumb(`<i class="fa fa-map-marker"></i> ${tipeLabel} ${props.name}`);
                    drillDownKriminalKecamatan(ctx, props, layer, tahun);
                });
            }
        }, 0);
    });

    popup.openOn(ctx.map);
}

// ════════════════════════════════════════════════════════════════════════════
// LEVEL 2 — KECAMATAN (dalam kabupaten terpilih)
// ════════════════════════════════════════════════════════════════════════════
export async function drillDownKriminalKecamatan(ctx, kabProps, kabLayer, tahun) {
    ctx.currentLevel = 'kecamatan';
    ctx.kabupatenLayerGroup.clearLayers();
    ctx.kabupatenLabelGroup.clearLayers();
    ctx.kecamatanLayerGroup.clearLayers();
    ctx.kecamatanLabelGroup.clearLayers();

    ctx.map.fitBounds(kabLayer.getBounds(), { padding: [40, 40] });

    try {
        // 1. Jumlah kasus per kecamatan dalam kabupaten ini
        const domain = _buildDomain(tahun, [['kabupaten_id', '=', kabProps.id]]);
        const groups = await ctx.orm.call(
            'petadigi.kriminalitas',
            'read_group',
            [domain, ['kecamatan_id'], ['kecamatan_id']],
            { lazy: false }
        );
        const kasusMap = _buildKecamatanKasusMap(groups);

        // 2. Geometry kecamatan dalam kabupaten ini
        const records = await ctx.orm.searchRead(
            'petadigi.kecamatan',
            [['kabupaten_id', '=', kabProps.id]],
            ['id', 'code', 'name', 'desa_ids', 'geometry'],
        );

        const features = records
            .filter(r => r.geometry)
            .map(r => {
                try {
                    const jumlah = kasusMap[r.id] || 0;
                    return {
                        type: "Feature",
                        geometry: JSON.parse(r.geometry),
                        properties: {
                            id: r.id,
                            code: r.code,
                            name: r.name,
                            jumlah_desa: r.desa_ids ? r.desa_ids.length : 0,
                            jumlah_kasus: jumlah,
                            color: getKriminalColor(jumlah),
                        }
                    };
                } catch (e) {
                    console.warn(`Gagal parse geometry kecamatan: ${r.name}`, e);
                    return null;
                }
            })
            .filter(Boolean);

        if (features.length === 0) {
            console.warn('[drillDownKriminalKecamatan] Tidak ada kecamatan dengan geometry.');
            await loadModeKriminal(ctx);
            return;
        }

        // 3. Render choropleth kecamatan
        const geoLayer = L.geoJSON({ type: "FeatureCollection", features }, {
            style: (feature) => ({
                color: '#555555', weight: 1.5, opacity: 1,
                fillColor: feature.properties.color, fillOpacity: 0.75,
            }),
            onEachFeature: (feature, layer) => {
                const props = feature.properties;

                layer.on('add', () => {
                    const center = layer.getBounds().getCenter();
                    const label = L.marker(center, {
                        icon: L.divIcon({
                            className: 'kabupaten-label',
                            html: `<span>${props.name}</span>`,
                            iconSize: null,
                        }),
                        interactive: false,
                        zIndexOffset: 100,
                    });
                    ctx.kecamatanLabelGroup.addLayer(label);
                });

                layer.on('mouseover', () => {
                    layer.setStyle({ weight: 2.5, fillOpacity: 0.9 });
                    layer.bringToFront();
                });
                layer.on('mouseout', () => {
                    layer.setStyle({ weight: 1.5, fillOpacity: 0.75 });
                });
                layer.on('click', (e) => _showKriminalKecamatanPopup(ctx, e, props, tahun));
            }
        });

        ctx.kecamatanLayerGroup.addLayer(geoLayer);

        // Tombol kembali ke level kabupaten
        _addKriminalBackButton(ctx, 'kabupaten', { kabProps, kabLayer, tahun });

    } catch (error) {
        console.error("Gagal memuat data kecamatan kriminal:", error);
    }
}

// ── Popup Kecamatan ──────────────────────────────────────────────────────────
function _showKriminalKecamatanPopup(ctx, e, props, tahun) {
    const tahunLabel = tahun ? `Tahun ${tahun}` : 'Semua Tahun';
    const kasusLabel = props.jumlah_kasus > 0
        ? `<strong style="color:${props.color};">${props.jumlah_kasus.toLocaleString('id-ID')} Kasus</strong>`
        : `<strong style="color:#27ae60;">Tidak Ada Kasus</strong>`;

    const popupContent = `
        <div class="petadigi-popup">
            <div class="petadigi-popup-header" style="background:#c0392b;">
                <i class="fa fa-map"></i>
                <strong>Kec. ${props.name}</strong>
            </div>
            <div class="petadigi-popup-body">
                <table>
                    <tr>
                        <td><i class="fa fa-barcode"></i> Kode</td>
                        <td><strong>${props.code}</strong></td>
                    </tr>
                    <tr>
                        <td><i class="fa fa-calendar"></i> Periode</td>
                        <td><strong>${tahunLabel}</strong></td>
                    </tr>
                    <tr>
                        <td><i class="fa fa-home"></i> Desa/Kel.</td>
                        <td><strong>${props.jumlah_desa} Desa/Kelurahan</strong></td>
                    </tr>
                    <tr>
                        <td><i class="fa fa-exclamation-circle" style="color:#e74c3c;"></i> Kasus</td>
                        <td>${kasusLabel}</td>
                    </tr>
                </table>
            </div>
        </div>
    `;

    L.popup({ maxWidth: 280, className: 'petadigi-leaflet-popup' })
        .setLatLng(e.latlng)
        .setContent(popupContent)
        .openOn(ctx.map);
}

// ── Back Button khusus mode kriminal ─────────────────────────────────────────
function _addKriminalBackButton(ctx, targetLevel, backCtx) {
    if (ctx.backButton) { ctx.backButton.remove(); ctx.backButton = null; }

    const labelMap = { kabupaten: 'Kembali ke Peta Kabupaten' };

    const BackControl = L.Control.extend({
        onAdd: () => {
            const btn = L.DomUtil.create('button', 'petadigi-btn-back');
            btn.innerHTML = `<i class="fa fa-arrow-left"></i> ${labelMap[targetLevel] || 'Kembali'}`;
            L.DomEvent.on(btn, 'click', async (ev) => {
                L.DomEvent.stopPropagation(ev);
                ctx.map.closePopup();
                if (ctx.backButton) { ctx.backButton.remove(); ctx.backButton = null; }

                if (targetLevel === 'kabupaten') {
                    ctx.kecamatanLayerGroup.clearLayers();
                    ctx.kecamatanLabelGroup.clearLayers();
                    ctx._updateBreadcrumb(`<i class="fa fa-exclamation-triangle"></i> Peta Kriminal`);
                    await loadModeKriminal(ctx);
                }
            });
            return btn;
        },
        onRemove: () => {}
    });

    ctx.backButton = new BackControl({ position: 'topleft' });
    ctx.backButton.addTo(ctx.map);
}
