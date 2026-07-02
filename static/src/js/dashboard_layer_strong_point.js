/** @odoo-module **/

import { LALIN_COLORS, getLalinColor } from './dashboard_layer_lalin';
import { renderSummaryMarkers } from './dashboard_helpers';

/**
 * Peta Strong Point — Arsiran Lalu Lintas + Titik Konsentrasi Tugas Lapangan
 *
 * Choropleth per kabupaten/kecamatan/desa berdasarkan jumlah kejadian lalu lintas,
 * dipadukan dengan marker titik-titik strong point yang telah dilakukan.
 * Pimpinan dapat membandingkan kerawanan lalin dengan sebaran strong point.
 */

// ── Legend ───────────────────────────────────────────────────────────────────
function _addStrongLegend(ctx) {
    removeStrongLegend(ctx);
    const StrongLegend = L.Control.extend({
        onAdd() {
            const div = L.DomUtil.create('div', 'petadigi-legend petadigi-legend--strong');
            div.innerHTML = `
                <div class="petadigi-legend-title">
                    <i class="fa fa-car"></i> Arsiran Lalu Lintas
                </div>
                <ul class="petadigi-legend-list">
                    ${LALIN_COLORS.map(t => `
                        <li>
                            <span class="petadigi-legend-swatch" style="background:${t.color};"></span>
                            <span class="petadigi-legend-label">${t.label}</span>
                        </li>
                    `).join('')}
                </ul>
                <div class="petadigi-legend-title" style="margin-top:8px;">
                    <i class="fa fa-map-pin"></i> Strong Point
                </div>
                <ul class="petadigi-legend-list">
                    <li>
                        <span class="petadigi-legend-swatch" style="background:#e67e22;border-radius:50%;"></span>
                        <span class="petadigi-legend-label">Proses</span>
                    </li>
                    <li>
                        <span class="petadigi-legend-swatch" style="background:#27ae60;border-radius:50%;"></span>
                        <span class="petadigi-legend-label">Selesai</span>
                    </li>
                </ul>`;
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
        polresId:    ctx._polresFilterId,
        kabupatenId: ctx.filterKabupaten?.el?.value ? parseInt(ctx.filterKabupaten.el.value) : null,
        stateValue:  ctx.filterState?.el?.value || '',
        dateFrom:    ctx.activeDateFrom || '',
        dateTo:      ctx.activeDateTo   || '',
    };
}

function _buildStrongDomain(filters, extraDomain = []) {
    const domain = [...extraDomain];
    if (filters.polresId)   domain.push(['polres_id',     '=',  filters.polresId]);
    if (filters.stateValue) domain.push(['state',         '=',  filters.stateValue]);
    if (filters.dateFrom)   domain.push(['tanggal_mulai', '>=', filters.dateFrom + ' 00:00:00']);
    if (filters.dateTo)     domain.push(['tanggal_mulai', '<=', filters.dateTo   + ' 23:59:59']);
    return domain;
}

function _buildLalinDomain(filters, extraDomain = []) {
    const domain = [...extraDomain];
    if (filters.polresId) domain.push(['kabupaten_id.polres_id', '=', filters.polresId]);
    if (filters.dateFrom) domain.push(['tanggal_kejadian', '>=', filters.dateFrom + ' 00:00:00']);
    if (filters.dateTo)   domain.push(['tanggal_kejadian', '<=', filters.dateTo   + ' 23:59:59']);
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

function _fmtNum(n) {
    return (n || 0).toLocaleString('id-ID');
}

// ── Markers ───────────────────────────────────────────────────────────────────
function _fetchStrongRecords(ctx, domain, limit) {
    const opts = limit ? { limit, order: 'tanggal_mulai desc' } : { order: 'tanggal_mulai desc' };
    return ctx.orm.searchRead(
        'petadigi.strong_point',
        [['latitude', '!=', 0], ['longitude', '!=', 0], ...domain],
        ['id', 'code', 'polres_id', 'polsek_id', 'kabupaten_id', 'lokasi_id',
         'tanggal_mulai', 'tanggal_selesai', 'personel_count', 'state', 'latitude', 'longitude'],
        opts,
    );
}

function _createStrongMarker(r, ctx) {
    const color = r.state === 'SELESAI' ? '#27ae60' : '#e67e22';
    const icon = L.divIcon({
        className: '',
        html: `<div class="petadigi-bencana-marker" style="border-color:${color};">
                   <i class="fa fa-map-pin" style="color:${color};"></i>
               </div>`,
        iconSize:   [24, 24],
        iconAnchor: [12, 12],
    });
    const marker = L.marker([r.latitude, r.longitude], { icon });

    // Lazy popup: build HTML only when user clicks, not upfront for all markers
    marker.once('click', () => {
        const polres = Array.isArray(r.polres_id)    ? r.polres_id[1]    : '-';
        const polsek = Array.isArray(r.polsek_id)    ? r.polsek_id[1]    : '-';
        const kab    = Array.isArray(r.kabupaten_id) ? r.kabupaten_id[1] : '-';
        const lokasi = Array.isArray(r.lokasi_id)    ? r.lokasi_id[1]    : '-';
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
        marker.openPopup();
    });

    return marker;
}

// Fetch + render markers sebagai background task — choropleth dan ECharts
// selesai dulu selama network request berlangsung, baru marker dirender chunked
async function _fetchAndRenderStrongMarkers(ctx, domain, limit) {
    const ver = ctx._modeVersion;
    const records = await _fetchStrongRecords(ctx, domain, limit);
    if (ctx._modeVersion !== ver) return;

    ctx.markerLayerGroup.clearLayers();
    const CHUNK = 20;
    for (let i = 0; i < records.length; i += CHUNK) {
        if (ctx._modeVersion !== ver) return;
        const markers = records.slice(i, i + CHUNK).map(r => _createStrongMarker(r, ctx));
        ctx.markerLayerGroup.addLayers(markers);
        await new Promise(resolve => setTimeout(resolve, 50));
    }
}


// ════════════════════════════════════════════════════════════════════════════
// LEVEL 1 — KABUPATEN
// ════════════════════════════════════════════════════════════════════════════
export async function loadModeStrong(ctx) {
    const ver = ctx._modeVersion;
    _addStrongLegend(ctx);
    ctx.currentLevel = 'kabupaten';

    const filters  = _getActiveFilters(ctx);
    const geoBase  = filters.kabupatenId ? [['kabupaten_id', '=', filters.kabupatenId]] : [];

    try {
        let spGroups, lalinGroups, records;

        if (filters.polresId && !filters.kabupatenId) {
            // Fetch spGroups first to derive kabupaten IDs from actual data —
            // avoids empty map when kabupaten.polres_id is not populated.
            spGroups = await ctx.orm.call(
                'petadigi.strong_point', 'read_group',
                [_buildStrongDomain(filters, geoBase), ['kabupaten_id'], ['kabupaten_id']],
                { lazy: false }
            );
            if (ctx._modeVersion !== ver) return;

            const spKabIds = spGroups
                .filter(g => Array.isArray(g.kabupaten_id) && g.kabupaten_id[0])
                .map(g => g.kabupaten_id[0]);

            const kabDomain = spKabIds.length
                ? [['id', 'in', spKabIds]]
                : [['polres_id', '=', filters.polresId]];

            [lalinGroups, records] = await Promise.all([
                ctx.orm.call(
                    'petadigi.lalu_lintas', 'read_group',
                    [_buildLalinDomain(filters, geoBase), ['kabupaten_id'], ['kabupaten_id']],
                    { lazy: false }
                ),
                ctx.orm.searchRead(
                    'petadigi.kabupaten', kabDomain,
                    ['id', 'code', 'name', 'type', 'kecamatan_ids', 'geometry'],
                ),
            ]);
        } else {
            const kabDomain = filters.kabupatenId ? [['id', '=', filters.kabupatenId]] : [];
            [lalinGroups, spGroups, records] = await Promise.all([
                ctx.orm.call(
                    'petadigi.lalu_lintas', 'read_group',
                    [_buildLalinDomain(filters, geoBase), ['kabupaten_id'], ['kabupaten_id']],
                    { lazy: false }
                ),
                ctx.orm.call(
                    'petadigi.strong_point', 'read_group',
                    [_buildStrongDomain(filters, geoBase), ['kabupaten_id'], ['kabupaten_id']],
                    { lazy: false }
                ),
                ctx.orm.searchRead(
                    'petadigi.kabupaten', kabDomain,
                    ['id', 'code', 'name', 'type', 'kecamatan_ids', 'geometry'],
                ),
            ]);
        }
        const lalinMap = _buildCountMap(lalinGroups, 'kabupaten_id');
        const spMap    = _buildCountMap(spGroups,    'kabupaten_id');

        const features = records
            .filter(r => r.geometry)
            .map(r => {
                try {
                    const jumlah_lalin  = lalinMap[r.id] || 0;
                    const jumlah_strong = spMap[r.id]    || 0;
                    return {
                        type: 'Feature',
                        geometry: JSON.parse(r.geometry),
                        properties: {
                            id: r.id, code: r.code, name: r.name, type: r.type,
                            jumlah_kecamatan: r.kecamatan_ids ? r.kecamatan_ids.length : 0,
                            jumlah_lalin,
                            jumlah_strong,
                            color: getLalinColor(jumlah_lalin),
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
            style: f => ({ color: '#555', weight: 1.5, opacity: 1, fillColor: f.properties.color, fillOpacity: 0.55 }),
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
                layer.on('mouseout',  () => { layer.setStyle({ weight: 1.5, fillOpacity: 0.55 }); });
                layer.on('click',     e  => _showStrongKabupatenPopup(ctx, e, props, layer, filters));
            }
        });

        if (ctx._modeVersion !== ver) return;
        ctx.kabupatenLayerGroup.addLayer(geoLayer);
        ctx.map.fitBounds(geoLayer.getBounds());
        renderSummaryMarkers(ctx, geoLayer, 'jumlah_strong', (props, polygonLayer) => {
            const tipeLabel = props.type === 'KOTA' ? 'Kota' : 'Kabupaten';
            ctx._updateBreadcrumb(`<i class="fa fa-map-pin"></i> Peta Strong Point`);
            ctx._appendBreadcrumb(`<i class="fa fa-map-pin"></i> ${tipeLabel} ${props.name}`);
            drillDownStrongKecamatan(ctx, props, polygonLayer, filters);
        });
    } catch (error) {
        console.error('Gagal memuat data strong point:', error);
    }
}

// ── Popup Kabupaten ──────────────────────────────────────────────────────────
function _showStrongKabupatenPopup(ctx, e, props, layer, filters) {
    const tipeLabel  = props.type === 'KOTA' ? 'Kota' : 'Kabupaten';
    const lalinColor = props.color === '#abebc6' ? '#27ae60' : props.color;
    const lalinLabel = props.jumlah_lalin > 0
        ? `<strong style="color:${lalinColor};">${_fmtNum(props.jumlah_lalin)} Kejadian</strong>`
        : `<strong style="color:#999;">Tidak Ada Kejadian</strong>`;
    const spLabel = props.jumlah_strong > 0
        ? `<strong style="color:#1a6b9a;">${_fmtNum(props.jumlah_strong)} Strong Point</strong>`
        : `<strong style="color:#999;">Belum Ada Strong Point</strong>`;

    const popup = L.popup({ maxWidth: 280, className: 'petadigi-leaflet-popup' })
        .setLatLng(e.latlng)
        .setContent(`
            <div class="petadigi-popup">
                <div class="petadigi-popup-header" style="background:#2c3e50;">
                    <i class="fa fa-map-pin"></i>
                    <strong>${tipeLabel} ${props.name}</strong>
                </div>
                <div class="petadigi-popup-body">
                    <table>
                        <tr><td><i class="fa fa-barcode"></i> Kode</td><td><strong>${props.code}</strong></td></tr>
                        <tr><td><i class="fa fa-list"></i> Kecamatan</td><td><strong>${props.jumlah_kecamatan} Kecamatan</strong></td></tr>
                        <tr><td><i class="fa fa-car" style="color:#e74c3c;"></i> Lalu Lintas</td><td>${lalinLabel}</td></tr>
                        <tr><td><i class="fa fa-map-pin" style="color:#1a6b9a;"></i> Strong Point</td><td>${spLabel}</td></tr>
                    </table>
                </div>
                <div class="petadigi-popup-footer">
                    <button class="petadigi-btn-detail" style="background:#2c3e50;" id="btn-strong-kec-${props.id}">
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
        const geoKab = [['kabupaten_id', '=', kabProps.id]];

        const [lalinGroups, spGroups, records] = await Promise.all([
            ctx.orm.call(
                'petadigi.lalu_lintas',
                'read_group',
                [_buildLalinDomain(filters, geoKab), ['kecamatan_id'], ['kecamatan_id']],
                { lazy: false }
            ),
            ctx.orm.call(
                'petadigi.strong_point',
                'read_group',
                [_buildStrongDomain(filters, geoKab), ['kecamatan_id'], ['kecamatan_id']],
                { lazy: false }
            ),
            ctx.orm.searchRead(
                'petadigi.kecamatan',
                [['kabupaten_id', '=', kabProps.id]],
                ['id', 'code', 'name', 'desa_ids', 'geometry'],
            ),
        ]);
        const lalinMap = _buildCountMap(lalinGroups, 'kecamatan_id');
        const spMap    = _buildCountMap(spGroups,    'kecamatan_id');

        const features = records
            .filter(r => r.geometry)
            .map(r => {
                try {
                    const jumlah_lalin  = lalinMap[r.id] || 0;
                    const jumlah_strong = spMap[r.id]    || 0;
                    return {
                        type: 'Feature',
                        geometry: JSON.parse(r.geometry),
                        properties: {
                            id: r.id, code: r.code, name: r.name,
                            jumlah_desa: r.desa_ids ? r.desa_ids.length : 0,
                            jumlah_lalin,
                            jumlah_strong,
                            color: getLalinColor(jumlah_lalin),
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
                layer.on('click',     e  => _showStrongKecamatanPopup(ctx, e, props, layer, filters, kabProps, kabLayer));
            }
        });

        ctx.kecamatanLayerGroup.addLayer(geoLayer);
        renderSummaryMarkers(ctx, geoLayer, 'jumlah_strong', (props, polygonLayer) => {
            ctx._appendBreadcrumb(`<i class="fa fa-map"></i> Kec. ${props.name}`);
            drillDownStrongKelurahan(ctx, props, polygonLayer, filters, kabProps, kabLayer);
        });
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
    const lalinColor = props.color === '#abebc6' ? '#27ae60' : props.color;
    const lalinLabel = props.jumlah_lalin > 0
        ? `<strong style="color:${lalinColor};">${_fmtNum(props.jumlah_lalin)} Kejadian</strong>`
        : `<strong style="color:#999;">Tidak Ada Kejadian</strong>`;
    const spLabel = props.jumlah_strong > 0
        ? `<strong style="color:#1a6b9a;">${_fmtNum(props.jumlah_strong)} Strong Point</strong>`
        : `<strong style="color:#999;">Belum Ada Strong Point</strong>`;

    const popup = L.popup({ maxWidth: 280, className: 'petadigi-leaflet-popup' })
        .setLatLng(e.latlng)
        .setContent(`
            <div class="petadigi-popup">
                <div class="petadigi-popup-header" style="background:#2c3e50;">
                    <i class="fa fa-map"></i>
                    <strong>Kec. ${props.name}</strong>
                </div>
                <div class="petadigi-popup-body">
                    <table>
                        <tr><td><i class="fa fa-barcode"></i> Kode</td><td><strong>${props.code}</strong></td></tr>
                        <tr><td><i class="fa fa-home"></i> Desa/Kel.</td><td><strong>${props.jumlah_desa} Desa/Kelurahan</strong></td></tr>
                        <tr><td><i class="fa fa-car" style="color:#e74c3c;"></i> Lalu Lintas</td><td>${lalinLabel}</td></tr>
                        <tr><td><i class="fa fa-map-pin" style="color:#1a6b9a;"></i> Strong Point</td><td>${spLabel}</td></tr>
                    </table>
                </div>
                <div class="petadigi-popup-footer">
                    <button class="petadigi-btn-detail" style="background:#2c3e50;" id="btn-strong-desa-${props.id}">
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
        const geoKec = [['kecamatan_id', '=', kecProps.id]];

        const [lalinGroups, spGroups, records] = await Promise.all([
            ctx.orm.call(
                'petadigi.lalu_lintas',
                'read_group',
                [_buildLalinDomain(filters, geoKec), ['desa_id'], ['desa_id']],
                { lazy: false }
            ),
            ctx.orm.call(
                'petadigi.strong_point',
                'read_group',
                [_buildStrongDomain(filters, geoKec), ['desa_id'], ['desa_id']],
                { lazy: false }
            ),
            ctx.orm.searchRead(
                'petadigi.desa',
                [['kecamatan_id', '=', kecProps.id]],
                ['id', 'code', 'name', 'type', 'geometry'],
            ),
        ]);
        const lalinMap = _buildCountMap(lalinGroups, 'desa_id');
        const spMap    = _buildCountMap(spGroups,    'desa_id');

        const features = records
            .filter(r => r.geometry)
            .map(r => {
                try {
                    const jumlah_lalin  = lalinMap[r.id] || 0;
                    const jumlah_strong = spMap[r.id]    || 0;
                    return {
                        type: 'Feature',
                        geometry: JSON.parse(r.geometry),
                        properties: {
                            id: r.id, code: r.code, name: r.name, type: r.type,
                            jumlah_lalin,
                            jumlah_strong,
                            color: getLalinColor(jumlah_lalin),
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
                layer.on('click',     e  => _showStrongDesaPopup(ctx, e, props));
            }
        });

        ctx.desaLayerGroup.addLayer(geoLayer);
        _fetchAndRenderStrongMarkers(ctx, _buildStrongDomain(filters, geoKec));
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
    const tipeLabel  = props.type === 'KELURAHAN' ? 'Kelurahan' : 'Desa';
    const lalinColor = props.color === '#abebc6' ? '#27ae60' : props.color;
    const lalinLabel = props.jumlah_lalin > 0
        ? `<strong style="color:${lalinColor};">${_fmtNum(props.jumlah_lalin)} Kejadian</strong>`
        : `<strong style="color:#999;">Tidak Ada Kejadian</strong>`;
    const spLabel = props.jumlah_strong > 0
        ? `<strong style="color:#1a6b9a;">${_fmtNum(props.jumlah_strong)} Strong Point</strong>`
        : `<strong style="color:#999;">Belum Ada Strong Point</strong>`;

    L.popup({ maxWidth: 280, className: 'petadigi-leaflet-popup' })
        .setLatLng(e.latlng)
        .setContent(`
            <div class="petadigi-popup">
                <div class="petadigi-popup-header" style="background:#2c3e50;">
                    <i class="fa fa-home"></i>
                    <strong>${tipeLabel} ${props.name}</strong>
                </div>
                <div class="petadigi-popup-body">
                    <table>
                        <tr><td><i class="fa fa-barcode"></i> Kode</td><td><strong>${props.code}</strong></td></tr>
                        <tr><td><i class="fa fa-tag"></i> Tipe</td><td><strong>${tipeLabel}</strong></td></tr>
                        <tr><td><i class="fa fa-car" style="color:#e74c3c;"></i> Lalu Lintas</td><td>${lalinLabel}</td></tr>
                        <tr><td><i class="fa fa-map-pin" style="color:#1a6b9a;"></i> Strong Point</td><td>${spLabel}</td></tr>
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
