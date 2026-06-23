/** @odoo-module **/

/**
 * Peta Strong Point — Titik Konsentrasi Tugas Lapangan
 * Choropleth per kabupaten/kecamatan/desa — warna biru berdasarkan jumlah strong point.
 */

// ── Skala warna biru ──────────────────────────────────────────────────────────
const STRONG_COLORS = [
    { min: 51, max: Infinity, color: '#1a3a5c', label: '> 50 Strong Point'    },
    { min: 21, max: 50,       color: '#1a6b9a', label: '21 – 50 Strong Point' },
    { min: 11, max: 20,       color: '#5dade2', label: '11 – 20 Strong Point' },
    { min:  1, max: 10,       color: '#aed6f1', label: '1 – 10 Strong Point'  },
    { min:  0, max:  0,       color: '#eaf4fb', label: 'Tidak Ada Strong Point' },
];

function getStrongColor(jumlah) {
    for (const tier of STRONG_COLORS) {
        if (jumlah >= tier.min) return tier.color;
    }
    return '#eaf4fb';
}

// ── Legend ───────────────────────────────────────────────────────────────────
function _addStrongLegend(ctx) {
    removeStrongLegend(ctx);
    const StrongLegend = L.Control.extend({
        onAdd() {
            const div = L.DomUtil.create('div', 'petadigi-legend petadigi-legend--strong');
            div.innerHTML = `
                <div class="petadigi-legend-title">
                    <i class="fa fa-map-pin"></i> Legenda Strong Point
                </div>
                <ul class="petadigi-legend-list">
                    ${STRONG_COLORS.map(t => `
                        <li>
                            <span class="petadigi-legend-swatch" style="background:${t.color};"></span>
                            <span class="petadigi-legend-label">${t.label}</span>
                        </li>
                    `).join('')}
                </ul>
                <div class="petadigi-legend-title" style="margin-top:8px;">
                    <i class="fa fa-map-pin" style="color:#e67e22;"></i> Proses
                    &nbsp;&nbsp;
                    <i class="fa fa-map-pin" style="color:#27ae60;"></i> Selesai
                </div>`;
            L.DomEvent.disableClickPropagation(div);
            L.DomEvent.disableScrollPropagation(div);
            return div;
        },
        onRemove() {}
    });
    ctx._strongLegend = new StrongLegend({ position: 'bottomright' });
    ctx._strongLegend.addTo(ctx.map);
}

export function removeStrongLegend(ctx) {
    if (ctx._strongLegend) { ctx._strongLegend.remove(); ctx._strongLegend = null; }
}

// ── Helpers filter ────────────────────────────────────────────────────────────
function _getActiveFilters(ctx) {
    return {
        kabupatenId: ctx.filterKabupaten?.el?.value ? parseInt(ctx.filterKabupaten.el.value) : null,
        stateValue:  ctx.filterState?.el?.value || '',
        dateFrom:    ctx.activeDateFrom || '',
        dateTo:      ctx.activeDateTo   || '',
    };
}

function _buildDomain(filters, extraDomain = []) {
    const domain = [...extraDomain];
    if (filters.stateValue) domain.push(['state',          '=',  filters.stateValue]);
    if (filters.dateFrom)   domain.push(['tanggal_mulai',  '>=', filters.dateFrom + ' 00:00:00']);
    if (filters.dateTo)     domain.push(['tanggal_mulai',  '<=', filters.dateTo   + ' 23:59:59']);
    return domain;
}

function _buildCountMap(groups, field) {
    const m = {};
    for (const g of groups) {
        if (!g[field]) continue;
        const id = Array.isArray(g[field]) ? g[field][0] : g[field];
        m[id] = g.__count || 0;
    }
    return m;
}

function _fmtDt(val) {
    if (!val) return '-';
    return val.slice(0, 16).replace('T', ' ');
}

// ── Markers ───────────────────────────────────────────────────────────────────
async function _loadStrongMarkers(ctx, domain) {
    ctx.markerLayerGroup.clearLayers();

    const records = await ctx.orm.searchRead(
        'petadigi.strong_point',
        [['latitude', '!=', 0], ['longitude', '!=', 0], ...domain],
        ['id', 'code', 'polres_id', 'polsek_id', 'kabupaten_id', 'lokasi_id',
         'tanggal_mulai', 'tanggal_selesai', 'personel_count', 'state', 'latitude', 'longitude'],
        { limit: 2000 }
    );

    records.forEach(r => {
        const color  = r.state === 'SELESAI' ? '#27ae60' : '#e67e22';
        const polres = Array.isArray(r.polres_id)    ? r.polres_id[1]    : '-';
        const polsek = Array.isArray(r.polsek_id)    ? r.polsek_id[1]    : '-';
        const kab    = Array.isArray(r.kabupaten_id) ? r.kabupaten_id[1] : '-';
        const lokasi = Array.isArray(r.lokasi_id)    ? r.lokasi_id[1]    : '-';

        const icon = L.divIcon({
            className: '',
            html: `<div class="petadigi-bencana-marker" style="border-color:${color};">
                       <i class="fa fa-map-pin" style="color:${color};"></i>
                   </div>`,
            iconSize:   [24, 24],
            iconAnchor: [12, 12],
        });
        const marker = L.marker([r.latitude, r.longitude], { icon });

        marker.bindPopup(`
            <div class="petadigi-popup">
                <div class="petadigi-popup-header" style="background:${color};">
                    <i class="fa fa-map-pin"></i>
                    <strong>${r.code}</strong>
                </div>
                <div class="petadigi-popup-body">
                    <table>
                        <tr><td><i class="fa fa-shield"></i> Polres</td><td><strong>${polres}</strong></td></tr>
                        <tr><td><i class="fa fa-building"></i> Polsek</td><td><strong>${polsek}</strong></td></tr>
                        <tr><td><i class="fa fa-map"></i> Kabupaten</td><td><strong>${kab}</strong></td></tr>
                        <tr><td><i class="fa fa-map-pin"></i> Lokasi</td><td><strong>${lokasi}</strong></td></tr>
                        <tr><td><i class="fa fa-calendar"></i> Mulai</td><td><strong>${_fmtDt(r.tanggal_mulai)}</strong></td></tr>
                        <tr><td><i class="fa fa-calendar-check-o"></i> Selesai</td><td><strong>${_fmtDt(r.tanggal_selesai)}</strong></td></tr>
                        <tr><td><i class="fa fa-users"></i> Personel</td><td><strong>${r.personel_count || 0}</strong></td></tr>
                        <tr><td><i class="fa fa-flag"></i> Status</td><td><strong style="color:${color};">${r.state}</strong></td></tr>
                    </table>
                </div>
                <div class="petadigi-popup-footer">
                    <button class="petadigi-btn-detail" style="background:${color};" id="btn-detail-strong-${r.id}">
                        <i class="fa fa-external-link"></i> Lihat Detail
                    </button>
                </div>
            </div>
        `, { maxWidth: 300, className: 'petadigi-leaflet-popup' });

        marker.on('popupopen', () => {
            setTimeout(() => {
                const btn = document.getElementById(`btn-detail-strong-${r.id}`);
                if (btn) btn.addEventListener('click', () => ctx.action.doAction({
                    type: 'ir.actions.act_window',
                    res_model: 'petadigi.strong_point',
                    res_id: r.id,
                    views: [[false, 'form']],
                    target: 'current',
                }));
            }, 0);
        });

        ctx.markerLayerGroup.addLayer(marker);
    });
}

// ════════════════════════════════════════════════════════════════════════════
// LEVEL 1 — KABUPATEN
// ════════════════════════════════════════════════════════════════════════════
export async function loadModeStrong(ctx) {
    const ver = ctx._modeVersion;
    _addStrongLegend(ctx);
    ctx.currentLevel = 'kabupaten';

    const filters    = _getActiveFilters(ctx);
    const baseDomain = filters.kabupatenId ? [['kabupaten_id', '=', filters.kabupatenId]] : [];

    try {
        const groups = await ctx.orm.call(
            'petadigi.strong_point',
            'read_group',
            [_buildDomain(filters, baseDomain), ['kabupaten_id'], ['kabupaten_id']],
            { lazy: false }
        );
        const countMap = _buildCountMap(groups, 'kabupaten_id');

        const kabDomain = filters.kabupatenId ? [['id', '=', filters.kabupatenId]] : [];
        const records   = await ctx.orm.searchRead(
            'petadigi.kabupaten',
            kabDomain,
            ['id', 'code', 'name', 'type', 'kecamatan_ids', 'geometry'],
        );

        const features = records
            .filter(r => r.geometry)
            .map(r => {
                try {
                    const jumlah = countMap[r.id] || 0;
                    return {
                        type: 'Feature',
                        geometry: JSON.parse(r.geometry),
                        properties: {
                            id: r.id, code: r.code, name: r.name, type: r.type,
                            jumlah_kecamatan: r.kecamatan_ids ? r.kecamatan_ids.length : 0,
                            jumlah: jumlah,
                            color: getStrongColor(jumlah),
                        }
                    };
                } catch (e) {
                    console.warn(`Gagal parse geometry kabupaten: ${r.name}`, e);
                    return null;
                }
            })
            .filter(Boolean);

        if (!features.length) return;

        const geoLayer = L.geoJSON({ type: 'FeatureCollection', features }, {
            style: f => ({ color: '#555', weight: 1.5, opacity: 1, fillColor: f.properties.color, fillOpacity: 0.75 }),
            onEachFeature: (feature, layer) => {
                const props = feature.properties;

                layer.on('add', () => {
                    const bounds = layer.getBounds();
                    const label = L.marker(bounds.getCenter(), {
                        icon: L.divIcon({ className: 'kabupaten-label', html: `<span>${props.name}</span>`, iconSize: null }),
                        interactive: false, zIndexOffset: -100,
                    });
                    label._polygonBounds = bounds;
                    ctx.kabupatenLabelGroup.addLayer(label);
                });

                layer.on('mouseover', () => { layer.setStyle({ weight: 2.5, fillOpacity: 0.9 }); layer.bringToFront(); });
                layer.on('mouseout',  () => { layer.setStyle({ weight: 1.5, fillOpacity: 0.75 }); });
                layer.on('click',     e  => _showStrongKabupatenPopup(ctx, e, props, layer, filters));
            }
        });

        if (ctx._modeVersion !== ver) return;
        ctx.kabupatenLayerGroup.addLayer(geoLayer);
        ctx.map.fitBounds(geoLayer.getBounds());
        await _loadStrongMarkers(ctx, _buildDomain(filters, baseDomain));
    } catch (error) {
        console.error('Gagal memuat data strong point:', error);
    }
}

// ── Popup Kabupaten ──────────────────────────────────────────────────────────
function _showStrongKabupatenPopup(ctx, e, props, layer, filters) {
    const tipeLabel   = props.type === 'KOTA' ? 'Kota' : 'Kabupaten';
    const strongLabel = props.jumlah > 0
        ? `<strong style="color:${props.color === '#eaf4fb' ? '#1a6b9a' : props.color};">${props.jumlah.toLocaleString('id-ID')} Strong Point</strong>`
        : `<strong style="color:#999;">Tidak Ada Strong Point</strong>`;

    const popup = L.popup({ maxWidth: 280, className: 'petadigi-leaflet-popup' })
        .setLatLng(e.latlng)
        .setContent(`
            <div class="petadigi-popup">
                <div class="petadigi-popup-header" style="background:#1a6b9a;">
                    <i class="fa fa-map-pin"></i>
                    <strong>${tipeLabel} ${props.name}</strong>
                </div>
                <div class="petadigi-popup-body">
                    <table>
                        <tr><td><i class="fa fa-barcode"></i> Kode</td><td><strong>${props.code}</strong></td></tr>
                        <tr><td><i class="fa fa-list"></i> Kecamatan</td><td><strong>${props.jumlah_kecamatan} Kecamatan</strong></td></tr>
                        <tr><td><i class="fa fa-map-pin" style="color:#1a6b9a;"></i> Strong Point</td><td>${strongLabel}</td></tr>
                    </table>
                </div>
                <div class="petadigi-popup-footer">
                    <button class="petadigi-btn-detail" style="background:#1a6b9a;" id="btn-strong-kec-${props.id}">
                        <i class="fa fa-search-plus"></i> Lihat Detail Kecamatan
                    </button>
                </div>
            </div>
        `);

    popup.once('add', () => {
        setTimeout(() => {
            const btn = document.getElementById(`btn-strong-kec-${props.id}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    ctx.map.closePopup();
                    ctx._updateBreadcrumb(`<i class="fa fa-map-pin"></i> Peta Strong Point`);
                    ctx._appendBreadcrumb(`<i class="fa fa-map-pin"></i> ${tipeLabel} ${props.name}`);
                    drillDownStrongKecamatan(ctx, props, layer, filters);
                });
            }
        }, 0);
    });

    popup.openOn(ctx.map);
}

// ════════════════════════════════════════════════════════════════════════════
// LEVEL 2 — KECAMATAN
// ════════════════════════════════════════════════════════════════════════════
export async function drillDownStrongKecamatan(ctx, kabProps, kabLayer, filters) {
    ctx.currentLevel = 'kecamatan';
    ctx.kabupatenLayerGroup.clearLayers();
    ctx.kabupatenLabelGroup.clearLayers();
    ctx.kecamatanLayerGroup.clearLayers();
    ctx.kecamatanLabelGroup.clearLayers();

    ctx.map.fitBounds(kabLayer.getBounds(), { padding: [40, 40] });

    try {
        const domain = _buildDomain(filters, [['kabupaten_id', '=', kabProps.id]]);
        const groups = await ctx.orm.call(
            'petadigi.strong_point',
            'read_group',
            [domain, ['kecamatan_id'], ['kecamatan_id']],
            { lazy: false }
        );
        const countMap = _buildCountMap(groups, 'kecamatan_id');

        const records = await ctx.orm.searchRead(
            'petadigi.kecamatan',
            [['kabupaten_id', '=', kabProps.id]],
            ['id', 'code', 'name', 'desa_ids', 'geometry'],
        );

        const features = records
            .filter(r => r.geometry)
            .map(r => {
                try {
                    const jumlah = countMap[r.id] || 0;
                    return {
                        type: 'Feature',
                        geometry: JSON.parse(r.geometry),
                        properties: {
                            id: r.id, code: r.code, name: r.name,
                            jumlah_desa: r.desa_ids ? r.desa_ids.length : 0,
                            jumlah: jumlah,
                            color: getStrongColor(jumlah),
                        }
                    };
                } catch (e) {
                    console.warn(`Gagal parse geometry kecamatan: ${r.name}`, e);
                    return null;
                }
            })
            .filter(Boolean);

        if (!features.length) {
            await loadModeStrong(ctx);
            return;
        }

        const geoLayer = L.geoJSON({ type: 'FeatureCollection', features }, {
            style: f => ({ color: '#555', weight: 1.5, opacity: 1, fillColor: f.properties.color, fillOpacity: 0.75 }),
            onEachFeature: (feature, layer) => {
                const props = feature.properties;

                layer.on('add', () => {
                    const bounds = layer.getBounds();
                    const label = L.marker(bounds.getCenter(), {
                        icon: L.divIcon({ className: 'kabupaten-label', html: `<span>${props.name}</span>`, iconSize: null }),
                        interactive: false, zIndexOffset: -100,
                    });
                    label._polygonBounds = bounds;
                    ctx.kecamatanLabelGroup.addLayer(label);
                });

                layer.on('mouseover', () => { layer.setStyle({ weight: 2.5, fillOpacity: 0.9 }); layer.bringToFront(); });
                layer.on('mouseout',  () => { layer.setStyle({ weight: 1.5, fillOpacity: 0.75 }); });
                layer.on('click',     e  => _showStrongKecamatanPopup(ctx, e, props, layer, filters, kabProps, kabLayer));
            }
        });

        ctx.kecamatanLayerGroup.addLayer(geoLayer);
        await _loadStrongMarkers(ctx, _buildDomain(filters, [['kabupaten_id', '=', kabProps.id]]));
        _addStrongBackButton(ctx, 'kabupaten', { kabProps, kabLayer, filters });

        ctx.drillKabupatenId = kabProps.id;
        ctx.drillKecamatanId = null;
        if (ctx.filterKabupaten?.el) ctx.filterKabupaten.el.value = String(kabProps.id);
        ctx._updateFilterSummary(ctx.currentMode);
        ctx._updateKpiCards(ctx.currentMode);
        ctx._updateCharts(ctx.currentMode);
    } catch (error) {
        console.error('Gagal memuat data kecamatan strong point:', error);
    }
}

// ── Popup Kecamatan ──────────────────────────────────────────────────────────
function _showStrongKecamatanPopup(ctx, e, props, layer, filters, kabProps, kabLayer) {
    const strongLabel = props.jumlah > 0
        ? `<strong style="color:${props.color === '#eaf4fb' ? '#1a6b9a' : props.color};">${props.jumlah.toLocaleString('id-ID')} Strong Point</strong>`
        : `<strong style="color:#999;">Tidak Ada Strong Point</strong>`;

    const popup = L.popup({ maxWidth: 280, className: 'petadigi-leaflet-popup' })
        .setLatLng(e.latlng)
        .setContent(`
            <div class="petadigi-popup">
                <div class="petadigi-popup-header" style="background:#2e86c1;">
                    <i class="fa fa-map"></i>
                    <strong>Kec. ${props.name}</strong>
                </div>
                <div class="petadigi-popup-body">
                    <table>
                        <tr><td><i class="fa fa-barcode"></i> Kode</td><td><strong>${props.code}</strong></td></tr>
                        <tr><td><i class="fa fa-home"></i> Desa/Kel.</td><td><strong>${props.jumlah_desa} Desa/Kelurahan</strong></td></tr>
                        <tr><td><i class="fa fa-map-pin" style="color:#1a6b9a;"></i> Strong Point</td><td>${strongLabel}</td></tr>
                    </table>
                </div>
                <div class="petadigi-popup-footer">
                    <button class="petadigi-btn-detail" style="background:#2e86c1;" id="btn-strong-desa-${props.id}">
                        <i class="fa fa-search-plus"></i> Lihat Detail Desa/Kelurahan
                    </button>
                </div>
            </div>
        `);

    popup.once('add', () => {
        setTimeout(() => {
            const btn = document.getElementById(`btn-strong-desa-${props.id}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    ctx.map.closePopup();
                    ctx._appendBreadcrumb(`<i class="fa fa-map"></i> Kec. ${props.name}`);
                    drillDownStrongKelurahan(ctx, props, layer, filters, kabProps, kabLayer);
                });
            }
        }, 0);
    });

    popup.openOn(ctx.map);
}

// ════════════════════════════════════════════════════════════════════════════
// LEVEL 3 — DESA/KELURAHAN
// ════════════════════════════════════════════════════════════════════════════
export async function drillDownStrongKelurahan(ctx, kecProps, kecLayer, filters, kabProps, kabLayer) {
    ctx.currentLevel = 'desa';
    ctx.kecamatanLayerGroup.clearLayers();
    ctx.kecamatanLabelGroup.clearLayers();
    ctx.desaLayerGroup.clearLayers();
    ctx.desaLabelGroup.clearLayers();

    ctx.map.fitBounds(kecLayer.getBounds(), { padding: [40, 40] });

    try {
        const domain = _buildDomain(filters, [['kecamatan_id', '=', kecProps.id]]);
        const groups = await ctx.orm.call(
            'petadigi.strong_point',
            'read_group',
            [domain, ['desa_id'], ['desa_id']],
            { lazy: false }
        );
        const countMap = _buildCountMap(groups, 'desa_id');

        const records = await ctx.orm.searchRead(
            'petadigi.desa',
            [['kecamatan_id', '=', kecProps.id]],
            ['id', 'code', 'name', 'type', 'geometry'],
        );

        const features = records
            .filter(r => r.geometry)
            .map(r => {
                try {
                    const jumlah = countMap[r.id] || 0;
                    return {
                        type: 'Feature',
                        geometry: JSON.parse(r.geometry),
                        properties: {
                            id: r.id, code: r.code, name: r.name, type: r.type,
                            jumlah: jumlah,
                            color: getStrongColor(jumlah),
                        }
                    };
                } catch (e) {
                    console.warn(`Gagal parse geometry desa: ${r.name}`, e);
                    return null;
                }
            })
            .filter(Boolean);

        if (!features.length) {
            drillDownStrongKecamatan(ctx, kabProps, kabLayer, filters);
            return;
        }

        const geoLayer = L.geoJSON({ type: 'FeatureCollection', features }, {
            style: f => ({ color: '#555', weight: 1.5, opacity: 1, fillColor: f.properties.color, fillOpacity: 0.75 }),
            onEachFeature: (feature, layer) => {
                const props = feature.properties;

                layer.on('add', () => {
                    const bounds = layer.getBounds();
                    const label = L.marker(bounds.getCenter(), {
                        icon: L.divIcon({ className: 'kabupaten-label', html: `<span>${props.name}</span>`, iconSize: null }),
                        interactive: false, zIndexOffset: -100,
                    });
                    label._polygonBounds = bounds;
                    ctx.desaLabelGroup.addLayer(label);
                });

                layer.on('mouseover', () => { layer.setStyle({ weight: 2.5, fillOpacity: 0.9 }); layer.bringToFront(); });
                layer.on('mouseout',  () => { layer.setStyle({ weight: 1.5, fillOpacity: 0.75 }); });
                layer.on('click',     e  => _showStrongDesaPopup(ctx, e, props));
            }
        });

        ctx.desaLayerGroup.addLayer(geoLayer);
        await _loadStrongMarkers(ctx, _buildDomain(filters, [['kecamatan_id', '=', kecProps.id]]));
        _addStrongBackButton(ctx, 'kecamatan', { kecProps, kecLayer, filters, kabProps, kabLayer });

        ctx.drillKecamatanId = kecProps.id;
        ctx._updateKpiCards(ctx.currentMode);
        ctx._updateCharts(ctx.currentMode);
    } catch (error) {
        console.error('Gagal memuat data desa strong point:', error);
    }
}

// ── Popup Desa ───────────────────────────────────────────────────────────────
function _showStrongDesaPopup(ctx, e, props) {
    const tipeLabel   = props.type === 'KELURAHAN' ? 'Kelurahan' : 'Desa';
    const strongLabel = props.jumlah > 0
        ? `<strong style="color:${props.color === '#eaf4fb' ? '#1a6b9a' : props.color};">${props.jumlah.toLocaleString('id-ID')} Strong Point</strong>`
        : `<strong style="color:#999;">Tidak Ada Strong Point</strong>`;

    L.popup({ maxWidth: 280, className: 'petadigi-leaflet-popup' })
        .setLatLng(e.latlng)
        .setContent(`
            <div class="petadigi-popup">
                <div class="petadigi-popup-header" style="background:#1a6b9a;">
                    <i class="fa fa-home"></i>
                    <strong>${tipeLabel} ${props.name}</strong>
                </div>
                <div class="petadigi-popup-body">
                    <table>
                        <tr><td><i class="fa fa-barcode"></i> Kode</td><td><strong>${props.code}</strong></td></tr>
                        <tr><td><i class="fa fa-tag"></i> Tipe</td><td><strong>${tipeLabel}</strong></td></tr>
                        <tr><td><i class="fa fa-map-pin" style="color:#1a6b9a;"></i> Strong Point</td><td>${strongLabel}</td></tr>
                    </table>
                </div>
            </div>
        `)
        .openOn(ctx.map);
}

// ── Back Button ──────────────────────────────────────────────────────────────
function _addStrongBackButton(ctx, targetLevel, backCtx) {
    if (ctx.backButton) { ctx.backButton.remove(); ctx.backButton = null; }

    const labelMap = {
        kabupaten: 'Kembali ke Peta Kabupaten',
        kecamatan: 'Kembali ke Peta Kecamatan',
    };

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
                    ctx.drillKabupatenId = null;
                    ctx.drillKecamatanId = null;
                    if (ctx.filterKabupaten?.el) ctx.filterKabupaten.el.value = '';
                    ctx._updateBreadcrumb(`<i class="fa fa-map-pin"></i> Peta Strong Point`);
                    ctx._updateFilterSummary(ctx.currentMode);
                    await loadModeStrong(ctx);
                    ctx._updateKpiCards(ctx.currentMode);
                    ctx._updateCharts(ctx.currentMode);
                } else if (targetLevel === 'kecamatan' && backCtx) {
                    ctx.desaLayerGroup.clearLayers();
                    ctx.desaLabelGroup.clearLayers();
                    ctx.drillKecamatanId = null;
                    const items = ctx.breadcrumbRef.el.querySelectorAll('.petadigi-breadcrumb-item');
                    if (items.length > 1) {
                        items[items.length - 1].previousSibling?.remove();
                        items[items.length - 1].remove();
                    }
                    await drillDownStrongKecamatan(ctx, backCtx.kabProps, backCtx.kabLayer, backCtx.filters);
                }
            });
            return btn;
        },
        onRemove: () => {}
    });

    ctx.backButton = new BackControl({ position: 'topleft' });
    ctx.backButton.addTo(ctx.map);
}
