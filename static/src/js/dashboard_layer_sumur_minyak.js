/** @odoo-module **/

import { renderKabupatenSummaryMarkers, renderSummaryMarkers } from './dashboard_helpers';

/**
 * Peta Sumur Minyak Masyarakat
 * Choropleth per kabupaten/kecamatan/desa — warna coklat/amber berdasarkan jumlah sumur.
 */

// ── Skala warna coklat/amber ─────────────────────────────────────────────────
const SUMUR_COLORS = [
    { min: 51, max: Infinity, color: '#7E5109', label: '> 50 Sumur'    },
    { min: 21, max: 50,       color: '#A04000', label: '21 – 50 Sumur' },
    { min: 11, max: 20,       color: '#CA6F1E', label: '11 – 20 Sumur' },
    { min:  1, max: 10,       color: '#E59866', label: '1 – 10 Sumur'  },
    { min:  0, max:  0,       color: '#FDEBD0', label: 'Tidak Ada Sumur' },
];

function getSumurColor(jumlah) {
    for (const tier of SUMUR_COLORS) {
        if (jumlah >= tier.min) return tier.color;
    }
    return '#FDEBD0';
}

// ── Legend ───────────────────────────────────────────────────────────────────
export function addSumurLegend(ctx) {
    if (ctx.sumurLegend) { ctx.sumurLegend.remove(); ctx.sumurLegend = null; }
    const SumurLegend = L.Control.extend({
        onAdd() {
            const div = L.DomUtil.create('div', 'petadigi-legend petadigi-legend--sumur');
            div.innerHTML = `
                <div class="petadigi-legend-title">
                    <i class="fa fa-tint"></i> Legenda Sumur Minyak
                </div>
                <ul class="petadigi-legend-list">
                    ${SUMUR_COLORS.map(t => `
                        <li>
                            <span class="petadigi-legend-swatch" style="background:${t.color};"></span>
                            <span class="petadigi-legend-label">${t.label}</span>
                        </li>
                    `).join('')}
                </ul>`;
            L.DomEvent.disableClickPropagation(div);
            L.DomEvent.disableScrollPropagation(div);
            return div;
        },
        onRemove() {}
    });
    ctx.sumurLegend = new SumurLegend({ position: 'bottomright' });
    ctx.sumurLegend.addTo(ctx.map);
}

export function removeSumurLegend(ctx) {
    if (ctx.sumurLegend) { ctx.sumurLegend.remove(); ctx.sumurLegend = null; }
}

// ── Helpers filter ───────────────────────────────────────────────────────────
function _getActiveFilters(ctx) {
    return {
        kabupatenId: ctx.filterKabupaten?.el?.value     ? parseInt(ctx.filterKabupaten.el.value)     : null,
        stateValue:  ctx.filterState?.el?.value         || '',
        kategoriId:  ctx.filterKategoriSumur?.el?.value ? parseInt(ctx.filterKategoriSumur.el.value) : null,
    };
}

function _buildDomain(filters, extraDomain = []) {
    const domain = [...extraDomain];
    if (filters.stateValue) domain.push(['state',       '=', filters.stateValue]);
    if (filters.kategoriId) domain.push(['kategori_id', '=', filters.kategoriId]);
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

// ── Marker ───────────────────────────────────────────────────────────────────
async function _loadSumurMarkers(ctx, domain) {
    ctx.markerLayerGroup.clearLayers();

    const records = await ctx.orm.searchRead(
        'petadigi.sumur_minyak',
        [['latitude', '!=', 0], ['longitude', '!=', 0], ...domain],
        ['id', 'code', 'name', 'latitude', 'longitude',
         'kecamatan_id', 'jumlah_minyak', 'is_data_lengkap', 'state', 'kategori_id'],
    );

    records.forEach(r => {
        const stateColor  = r.state === 'AKTIF' ? '#A04000' : '#7F8C8D';
        const stateLabel  = r.state === 'AKTIF' ? 'Aktif' : 'Tidak Aktif';
        const kecamatan   = Array.isArray(r.kecamatan_id) ? r.kecamatan_id[1] : '-';
        const kategori    = Array.isArray(r.kategori_id)  ? r.kategori_id[1]  : '-';
        const lengkapIcon = r.is_data_lengkap
            ? '<i class="fa fa-check-circle" style="color:#27AE60;"></i> Lengkap'
            : '<i class="fa fa-times-circle" style="color:#E74C3C;"></i> Tidak Lengkap';

        const icon = L.divIcon({
            className: '',
            html: `<div class="petadigi-bencana-marker" style="border-color:${stateColor};">
                       <i class="fa fa-tint" style="color:${stateColor};"></i>
                   </div>`,
            iconSize:   [24, 24],
            iconAnchor: [12, 12],
        });

        const marker = L.marker([r.latitude, r.longitude], { icon });
        marker.bindPopup(`
            <div class="petadigi-popup">
                <div class="petadigi-popup-header" style="background:#A04000;">
                    <i class="fa fa-tint"></i>
                    <strong>${r.code}</strong>
                </div>
                <div class="petadigi-popup-body">
                    <table>
                        <tr><td><i class="fa fa-tag"></i> Nama</td><td><strong>${r.name || '-'}</strong></td></tr>
                        <tr><td><i class="fa fa-map"></i> Kecamatan</td><td><strong>${kecamatan}</strong></td></tr>
                        <tr><td><i class="fa fa-list"></i> Kategori</td><td><strong>${kategori}</strong></td></tr>
                        <tr><td><i class="fa fa-tint"></i> Jml. Minyak</td><td><strong>${r.jumlah_minyak ? r.jumlah_minyak.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</strong></td></tr>
                        <tr><td><i class="fa fa-check"></i> Data</td><td><strong>${lengkapIcon}</strong></td></tr>
                        <tr><td><i class="fa fa-flag"></i> Status</td><td><strong style="color:${stateColor};">${stateLabel}</strong></td></tr>
                    </table>
                </div>
                <div class="petadigi-popup-footer">
                    <button class="petadigi-btn-detail" style="background:#A04000;" id="btn-detail-sumur-${r.id}">
                        <i class="fa fa-external-link"></i> Lihat Detail
                    </button>
                </div>
            </div>
        `, { maxWidth: 300, className: 'petadigi-leaflet-popup' });

        marker.on('popupopen', () => {
            setTimeout(() => {
                const btn = document.getElementById(`btn-detail-sumur-${r.id}`);
                if (btn) btn.addEventListener('click', () => ctx.action.doAction({
                    type: 'ir.actions.act_window',
                    res_model: 'petadigi.sumur_minyak',
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
export async function loadModeSumur(ctx) {
    const ver = ctx._modeVersion;
    addSumurLegend(ctx);
    ctx.currentLevel = 'kabupaten';

    const filters    = _getActiveFilters(ctx);
    const baseDomain = filters.kabupatenId ? [['kabupaten_id', '=', filters.kabupatenId]] : [];

    try {
        const kabDomain = filters.kabupatenId ? [['id', '=', filters.kabupatenId]] : [];
        const [groups, records] = await Promise.all([
            ctx.orm.call(
                'petadigi.sumur_minyak',
                'read_group',
                [_buildDomain(filters, baseDomain), ['kabupaten_id'], ['kabupaten_id']],
                { lazy: false }
            ),
            ctx.orm.searchRead(
                'petadigi.kabupaten',
                kabDomain,
                ['id', 'code', 'name', 'type', 'kecamatan_ids', 'geometry'],
            ),
        ]);
        const countMap = _buildCountMap(groups, 'kabupaten_id');

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
                            jumlah_sumur: jumlah,
                            color: getSumurColor(jumlah),
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
            style: f => ({ color: '#555', weight: 1.5, opacity: 1, fillColor: f.properties.color, fillOpacity: 0.45 }),
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

                layer.on('mouseover', () => { layer.setStyle({ weight: 2.5, fillOpacity: 0.65 }); layer.bringToFront(); });
                layer.on('mouseout',  () => { layer.setStyle({ weight: 1.5, fillOpacity: 0.45 }); });
                layer.on('click',     e  => _showSumurKabupatenPopup(ctx, e, props, layer, filters));
            }
        });

        if (ctx._modeVersion !== ver) return;
        ctx.kabupatenLayerGroup.addLayer(geoLayer);
        ctx._fitBoundsZoomedIn(geoLayer.getBounds());
        renderKabupatenSummaryMarkers(ctx, geoLayer, filters, 'jumlah_sumur',
            `<i class="fa fa-tint"></i> Peta Sumur Minyak`,
            'fa-tint', drillDownSumurKecamatan);
    } catch (error) {
        console.error('Gagal memuat data sumur minyak:', error);
    }
}

// ── Popup Kabupaten ──────────────────────────────────────────────────────────
function _showSumurKabupatenPopup(ctx, e, props, layer, filters) {
    const tipeLabel  = props.type === 'KOTA' ? 'Kota' : 'Kabupaten';
    const sumurLabel = props.jumlah_sumur > 0
        ? `<strong style="color:${props.color === '#FDEBD0' ? '#A04000' : props.color};">${props.jumlah_sumur.toLocaleString('id-ID')} Sumur</strong>`
        : `<strong style="color:#999;">Tidak Ada Sumur</strong>`;

    const popup = L.popup({ maxWidth: 280, className: 'petadigi-leaflet-popup' })
        .setLatLng(e.latlng)
        .setContent(`
            <div class="petadigi-popup">
                <div class="petadigi-popup-header" style="background:#A04000;">
                    <i class="fa fa-tint"></i>
                    <strong>${tipeLabel} ${props.name}</strong>
                </div>
                <div class="petadigi-popup-body">
                    <table>
                        <tr><td><i class="fa fa-barcode"></i> Kode</td><td><strong>${props.code}</strong></td></tr>
                        <tr><td><i class="fa fa-list"></i> Kecamatan</td><td><strong>${props.jumlah_kecamatan} Kecamatan</strong></td></tr>
                        <tr><td><i class="fa fa-tint" style="color:#A04000;"></i> Sumur</td><td>${sumurLabel}</td></tr>
                    </table>
                </div>
                <div class="petadigi-popup-footer">
                    <button class="petadigi-btn-detail" style="background:#A04000;" id="btn-sumur-kec-${props.id}">
                        <i class="fa fa-search-plus"></i> Lihat Detail Kecamatan
                    </button>
                </div>
            </div>
        `);

    popup.once('add', () => {
        setTimeout(() => {
            const btn = document.getElementById(`btn-sumur-kec-${props.id}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    ctx.map.closePopup();
                    ctx._updateBreadcrumb(`<i class="fa fa-tint"></i> Peta Sumur Minyak`);
                    ctx._appendBreadcrumb(`<i class="fa fa-tint"></i> ${tipeLabel} ${props.name}`);
                    drillDownSumurKecamatan(ctx, props, layer, filters);
                });
            }
        }, 0);
    });

    popup.openOn(ctx.map);
}

// ════════════════════════════════════════════════════════════════════════════
// LEVEL 2 — KECAMATAN
// ════════════════════════════════════════════════════════════════════════════
export async function drillDownSumurKecamatan(ctx, kabProps, kabLayer, filters) {
    ctx.currentLevel = 'kecamatan';
    ctx.kabupatenLayerGroup.clearLayers();
    ctx.kabupatenLabelGroup.clearLayers();
    ctx.kecamatanLayerGroup.clearLayers();
    ctx.kecamatanLabelGroup.clearLayers();

    ctx._fitBoundsZoomedIn(kabLayer.getBounds(), { padding: [40, 40] });

    try {
        const domain = _buildDomain(filters, [['kabupaten_id', '=', kabProps.id]]);
        const [groups, records] = await Promise.all([
            ctx.orm.call(
                'petadigi.sumur_minyak',
                'read_group',
                [domain, ['kecamatan_id'], ['kecamatan_id']],
                { lazy: false }
            ),
            ctx.orm.searchRead(
                'petadigi.kecamatan',
                [['kabupaten_id', '=', kabProps.id]],
                ['id', 'code', 'name', 'desa_ids', 'geometry'],
            ),
        ]);
        const countMap = _buildCountMap(groups, 'kecamatan_id');

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
                            jumlah_sumur: jumlah,
                            color: getSumurColor(jumlah),
                        }
                    };
                } catch (e) {
                    console.warn(`Gagal parse geometry kecamatan: ${r.name}`, e);
                    return null;
                }
            })
            .filter(Boolean);

        if (!features.length) {
            await loadModeSumur(ctx);
            return;
        }

        const geoLayer = L.geoJSON({ type: 'FeatureCollection', features }, {
            style: f => ({ color: '#555', weight: 1.5, opacity: 1, fillColor: f.properties.color, fillOpacity: 0.45 }),
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

                layer.on('mouseover', () => { layer.setStyle({ weight: 2.5, fillOpacity: 0.65 }); layer.bringToFront(); });
                layer.on('mouseout',  () => { layer.setStyle({ weight: 1.5, fillOpacity: 0.45 }); });
                layer.on('click',     e  => _showSumurKecamatanPopup(ctx, e, props, layer, filters, kabProps, kabLayer));
            }
        });

        ctx.kecamatanLayerGroup.addLayer(geoLayer);
        renderSummaryMarkers(ctx, geoLayer, 'jumlah_sumur', (props, polygonLayer) => {
            ctx._appendBreadcrumb(`<i class="fa fa-map"></i> Kec. ${props.name}`);
            drillDownSumurKelurahan(ctx, props, polygonLayer, filters, kabProps, kabLayer);
        });
        _addSumurBackButton(ctx, 'kabupaten', { kabProps, kabLayer, filters });

        ctx.drillKabupatenId = kabProps.id;
        ctx.drillKecamatanId = null;
        if (ctx.filterKabupaten?.el) ctx.filterKabupaten.el.value = String(kabProps.id);
        ctx._updateFilterSummary(ctx.currentMode);
        ctx._updateKpiCards(ctx.currentMode);
        ctx._updateCharts(ctx.currentMode);
    } catch (error) {
        console.error('Gagal memuat data kecamatan sumur:', error);
    }
}

// ── Popup Kecamatan ──────────────────────────────────────────────────────────
function _showSumurKecamatanPopup(ctx, e, props, layer, filters, kabProps, kabLayer) {
    const sumurLabel = props.jumlah_sumur > 0
        ? `<strong style="color:${props.color === '#FDEBD0' ? '#A04000' : props.color};">${props.jumlah_sumur.toLocaleString('id-ID')} Sumur</strong>`
        : `<strong style="color:#999;">Tidak Ada Sumur</strong>`;

    const popup = L.popup({ maxWidth: 280, className: 'petadigi-leaflet-popup' })
        .setLatLng(e.latlng)
        .setContent(`
            <div class="petadigi-popup">
                <div class="petadigi-popup-header" style="background:#CA6F1E;">
                    <i class="fa fa-map"></i>
                    <strong>Kec. ${props.name}</strong>
                </div>
                <div class="petadigi-popup-body">
                    <table>
                        <tr><td><i class="fa fa-barcode"></i> Kode</td><td><strong>${props.code}</strong></td></tr>
                        <tr><td><i class="fa fa-home"></i> Desa/Kel.</td><td><strong>${props.jumlah_desa} Desa/Kelurahan</strong></td></tr>
                        <tr><td><i class="fa fa-tint" style="color:#A04000;"></i> Sumur</td><td>${sumurLabel}</td></tr>
                    </table>
                </div>
                <div class="petadigi-popup-footer">
                    <button class="petadigi-btn-detail" style="background:#CA6F1E;" id="btn-sumur-desa-${props.id}">
                        <i class="fa fa-search-plus"></i> Lihat Detail Desa/Kelurahan
                    </button>
                </div>
            </div>
        `);

    popup.once('add', () => {
        setTimeout(() => {
            const btn = document.getElementById(`btn-sumur-desa-${props.id}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    ctx.map.closePopup();
                    ctx._appendBreadcrumb(`<i class="fa fa-map"></i> Kec. ${props.name}`);
                    drillDownSumurKelurahan(ctx, props, layer, filters, kabProps, kabLayer);
                });
            }
        }, 0);
    });

    popup.openOn(ctx.map);
}

// ════════════════════════════════════════════════════════════════════════════
// LEVEL 3 — DESA/KELURAHAN
// ════════════════════════════════════════════════════════════════════════════
export async function drillDownSumurKelurahan(ctx, kecProps, kecLayer, filters, kabProps, kabLayer) {
    ctx.currentLevel = 'desa';
    ctx.kecamatanLayerGroup.clearLayers();
    ctx.kecamatanLabelGroup.clearLayers();
    ctx.desaLayerGroup.clearLayers();
    ctx.desaLabelGroup.clearLayers();

    ctx.map.fitBounds(kecLayer.getBounds(), { padding: [40, 40] });

    try {
        const domain = _buildDomain(filters, [['kecamatan_id', '=', kecProps.id]]);
        const [groups, records] = await Promise.all([
            ctx.orm.call(
                'petadigi.sumur_minyak',
                'read_group',
                [domain, ['desa_id'], ['desa_id']],
                { lazy: false }
            ),
            ctx.orm.searchRead(
                'petadigi.desa',
                [['kecamatan_id', '=', kecProps.id]],
                ['id', 'code', 'name', 'type', 'geometry'],
            ),
        ]);
        const countMap = _buildCountMap(groups, 'desa_id');

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
                            jumlah_sumur: jumlah,
                            color: getSumurColor(jumlah),
                        }
                    };
                } catch (e) {
                    console.warn(`Gagal parse geometry desa: ${r.name}`, e);
                    return null;
                }
            })
            .filter(Boolean);

        if (!features.length) {
            drillDownSumurKecamatan(ctx, kabProps, kabLayer, filters);
            return;
        }

        const geoLayer = L.geoJSON({ type: 'FeatureCollection', features }, {
            style: f => ({ color: '#555', weight: 1.5, opacity: 1, fillColor: f.properties.color, fillOpacity: 0.45 }),
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

                layer.on('mouseover', () => { layer.setStyle({ weight: 2.5, fillOpacity: 0.65 }); layer.bringToFront(); });
                layer.on('mouseout',  () => { layer.setStyle({ weight: 1.5, fillOpacity: 0.45 }); });
                layer.on('click',     e  => _showSumurDesaPopup(ctx, e, props));
            }
        });

        ctx.desaLayerGroup.addLayer(geoLayer);
        await _loadSumurMarkers(ctx, _buildDomain(filters, [['kecamatan_id', '=', kecProps.id]]));
        _addSumurBackButton(ctx, 'kecamatan', { kecProps, kecLayer, filters, kabProps, kabLayer });

        ctx.drillKecamatanId = kecProps.id;
        ctx._updateKpiCards(ctx.currentMode);
        ctx._updateCharts(ctx.currentMode);
    } catch (error) {
        console.error('Gagal memuat data desa sumur:', error);
    }
}

// ── Popup Desa ───────────────────────────────────────────────────────────────
function _showSumurDesaPopup(ctx, e, props) {
    const tipeLabel  = props.type === 'KELURAHAN' ? 'Kelurahan' : 'Desa';
    const sumurLabel = props.jumlah_sumur > 0
        ? `<strong style="color:${props.color === '#FDEBD0' ? '#A04000' : props.color};">${props.jumlah_sumur.toLocaleString('id-ID')} Sumur</strong>`
        : `<strong style="color:#999;">Tidak Ada Sumur</strong>`;

    L.popup({ maxWidth: 280, className: 'petadigi-leaflet-popup' })
        .setLatLng(e.latlng)
        .setContent(`
            <div class="petadigi-popup">
                <div class="petadigi-popup-header" style="background:#A04000;">
                    <i class="fa fa-home"></i>
                    <strong>${tipeLabel} ${props.name}</strong>
                </div>
                <div class="petadigi-popup-body">
                    <table>
                        <tr><td><i class="fa fa-barcode"></i> Kode</td><td><strong>${props.code}</strong></td></tr>
                        <tr><td><i class="fa fa-tag"></i> Tipe</td><td><strong>${tipeLabel}</strong></td></tr>
                        <tr><td><i class="fa fa-tint" style="color:#A04000;"></i> Sumur</td><td>${sumurLabel}</td></tr>
                    </table>
                </div>
            </div>
        `)
        .openOn(ctx.map);
}

// ── Back Button ──────────────────────────────────────────────────────────────
function _addSumurBackButton(ctx, targetLevel, backCtx) {
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
                    ctx._updateBreadcrumb(`<i class="fa fa-tint"></i> Peta Sumur Minyak`);
                    ctx._updateFilterSummary(ctx.currentMode);
                    await loadModeSumur(ctx);
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
                    await drillDownSumurKecamatan(ctx, backCtx.kabProps, backCtx.kabLayer, backCtx.filters);
                }
            });
            return btn;
        },
        onRemove: () => {}
    });

    ctx.backButton = new BackControl({ position: 'topleft' });
    ctx.backButton.addTo(ctx.map);
}
