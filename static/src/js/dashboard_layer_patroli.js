/** @odoo-module **/

import { KRIMINAL_COLORS, getKriminalColor } from './dashboard_layer_kriminal';
import { renderKabupatenSummaryMarkers, renderSummaryMarkers, fmtTanggalJam, wibDateStartUtc, wibDateEndUtc } from './dashboard_helpers';

/**
 * Peta Patroli — Arsiran Kriminalitas + Titik Lokasi Kegiatan Patroli
 *
 * Choropleth per kabupaten/kecamatan/desa berdasarkan jumlah kriminalitas,
 * dipadukan dengan marker titik-titik lokasi patroli yang telah dilakukan.
 * Pimpinan dapat membandingkan kerawanan kriminal dengan sebaran patroli.
 */

// ── Legend ────────────────────────────────────────────────────────────────────
function _addPatroliLegend(ctx) {
    removePatroliLegend(ctx);
    const PatroliLegend = L.Control.extend({
        onAdd() {
            const div = L.DomUtil.create('div', 'petadigi-legend petadigi-legend--patroli');
            div.innerHTML = `
                <div class="petadigi-legend-title">
                    <i class="fa fa-exclamation-triangle"></i> Arsiran Kriminalitas
                </div>
                <ul class="petadigi-legend-list">
                    ${KRIMINAL_COLORS.map(t => `
                        <li>
                            <span class="petadigi-legend-swatch" style="background:${t.color};"></span>
                            <span class="petadigi-legend-label">${t.label}</span>
                        </li>
                    `).join('')}
                </ul>
                <div class="petadigi-legend-title" style="margin-top:8px;">
                    <i class="fa fa-car" style="color:#27ae60;"></i> Kegiatan Patroli
                </div>
                <ul class="petadigi-legend-list">
                    <li>
                        <span class="petadigi-legend-swatch" style="background:#27ae60;border-radius:50%;"></span>
                        <span class="petadigi-legend-label">Titik Lokasi Patroli</span>
                    </li>
                    <li>
                        <span class="petadigi-legend-swatch" style="background:transparent;border:2px dashed #1e8449;border-radius:0;height:2px;margin-top:6px;"></span>
                        <span class="petadigi-legend-label">Rute Patroli</span>
                    </li>
                </ul>`;
            L.DomEvent.disableClickPropagation(div);
            L.DomEvent.disableScrollPropagation(div);
            return div;
        },
        onRemove() {}
    });
    ctx._patroliLegend = new PatroliLegend({ position: 'bottomright' });
    ctx._patroliLegend.addTo(ctx.map);
}

export function removePatroliLegend(ctx) {
    if (ctx._patroliLegend) { ctx._patroliLegend.remove(); ctx._patroliLegend = null; }
    if (ctx._patroliPolylineLayer) { ctx._patroliPolylineLayer.clearLayers(); ctx._patroliPolylineLayer.remove(); ctx._patroliPolylineLayer = null; }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function _getActiveFilters(ctx) {
    return {
        polresId:    ctx._polresFilterId,
        kabupatenId: ctx.filterKabupaten?.el?.value ? parseInt(ctx.filterKabupaten.el.value) : null,
        stateValue:  ctx.filterState?.el?.value || '',
        dateFrom:    ctx.activeDateFrom || '',
        dateTo:      ctx.activeDateTo   || '',
    };
}

function _buildPatroliDomain(filters, geoConditions = []) {
    const domain = [...geoConditions];
    if (filters.polresId)   domain.push(['polres_id',     '=',  filters.polresId]);
    if (filters.stateValue) domain.push(['state',         '=',  filters.stateValue]);
    if (filters.dateFrom)   domain.push(['tanggal_mulai', '>=', wibDateStartUtc(filters.dateFrom)]);
    if (filters.dateTo)     domain.push(['tanggal_mulai', '<=', wibDateEndUtc(filters.dateTo)]);
    return domain;
}

function _buildKriminalDomain(filters, geoConditions = []) {
    const domain = [...geoConditions];
    if (filters.polresId) domain.push(['polres_id', '=', filters.polresId]);
    if (filters.dateFrom) domain.push(['tanggal_kejadian', '>=', wibDateStartUtc(filters.dateFrom)]);
    if (filters.dateTo)   domain.push(['tanggal_kejadian', '<=', wibDateEndUtc(filters.dateTo)]);
    return domain;
}

function _buildLokasiDomain(filters, geoConditions = []) {
    const domain = [['latitude', '!=', 0], ['longitude', '!=', 0]];
    if (filters.polresId)   domain.push(['patroli_id.polres_id',     '=',  filters.polresId]);
    if (filters.stateValue) domain.push(['patroli_id.state',         '=',  filters.stateValue]);
    if (filters.dateFrom)   domain.push(['patroli_id.tanggal_mulai', '>=', wibDateStartUtc(filters.dateFrom)]);
    if (filters.dateTo)     domain.push(['patroli_id.tanggal_mulai', '<=', wibDateEndUtc(filters.dateTo)]);
    for (const cond of geoConditions) {
        domain.push([`patroli_id.${cond[0]}`, cond[1], cond[2]]);
    }
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
    return fmtTanggalJam(val);
}

function _fmtNum(n) {
    return (n || 0).toLocaleString('id-ID');
}

// ── Markers + Rute (dari lokasi_patroli) ─────────────────────────────────────
async function _loadPatroliMarkers(ctx, filters, geoConditions = []) {
    ctx.markerLayerGroup.clearLayers();
    if (ctx._patroliPolylineLayer) {
        ctx._patroliPolylineLayer.clearLayers();
    } else {
        // Gunakan custom pane agar rute selalu di atas arsiran choropleth (overlayPane z-index 400)
        if (!ctx.map.getPane('patroliRoutePane')) {
            const pane = ctx.map.createPane('patroliRoutePane');
            pane.style.zIndex = 401;
            pane.style.pointerEvents = 'none';
        }
        ctx._patroliPolylineLayer = L.layerGroup().addTo(ctx.map);
    }

    const domain  = _buildLokasiDomain(filters, geoConditions);
    const records = await ctx.orm.searchRead(
        'petadigi.lokasi_patroli',
        domain,
        ['id', 'patroli_id', 'tanggal', 'latitude', 'longitude', 'catatan'],
        { limit: 1000 }
    );

    records.forEach(r => {
        const patroli   = Array.isArray(r.patroli_id) ? r.patroli_id[1] : '-';
        const patroliId = Array.isArray(r.patroli_id) ? r.patroli_id[0] : null;
        const color     = '#27ae60';

        const icon = L.divIcon({
            className: '',
            html: `<div class="petadigi-bencana-marker" style="border-color:${color};">
                       <i class="fa fa-map-marker" style="color:${color};"></i>
                   </div>`,
            iconSize:   [24, 24],
            iconAnchor: [12, 12],
        });
        const marker = L.marker([r.latitude, r.longitude], { icon });

        marker.bindPopup(`
            <div class="petadigi-popup">
                <div class="petadigi-popup-header" style="background:${color};">
                    <i class="fa fa-map-marker"></i>
                    <strong>Titik Lokasi Patroli</strong>
                </div>
                <div id="patroli-foto-wrap-${r.id}" class="mg-popup-foto">
                    <div class="mg-popup-foto-spinner">
                        <i class="fa fa-circle-o-notch fa-spin"></i>
                    </div>
                </div>
                <div class="petadigi-popup-body">
                    <table>
                        <tr><td><i class="fa fa-car"></i> Patroli</td><td><strong>${patroli}</strong></td></tr>
                        <tr><td><i class="fa fa-calendar"></i> Tanggal</td><td><strong>${_fmtDt(r.tanggal)}</strong></td></tr>
                        <tr><td><i class="fa fa-map-pin"></i> Lat/Lng</td><td><strong>${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)}</strong></td></tr>
                        <tr><td><i class="fa fa-sticky-note-o"></i> Catatan</td><td><strong>${r.catatan || '-'}</strong></td></tr>
                    </table>
                </div>
                ${patroliId ? `
                <div class="petadigi-popup-footer">
                    <button class="petadigi-btn-detail" style="background:${color};" id="btn-detail-patroli-${r.id}">
                        <i class="fa fa-external-link"></i> Lihat Detail Patroli
                    </button>
                </div>` : ''}
            </div>
        `, { maxWidth: 320, className: 'petadigi-leaflet-popup' });

        marker.on('popupopen', () => {
            setTimeout(() => {
                const wrap = document.getElementById(`patroli-foto-wrap-${r.id}`);
                if (wrap) {
                    const img = document.createElement('img');
                    img.className = 'mg-popup-foto-img';
                    img.alt = 'Foto Dokumentasi';
                    const spinner = wrap.querySelector('.mg-popup-foto-spinner');
                    img.onload = () => {
                        if (img.naturalWidth > 1) {
                            wrap.appendChild(img);
                            img.style.display = 'block';
                            if (spinner) spinner.style.display = 'none';
                        } else {
                            wrap.style.display = 'none';
                        }
                    };
                    img.onerror = () => { wrap.style.display = 'none'; };
                    img.src = `/web/image/petadigi.lokasi_patroli/${r.id}/foto`;
                }
                if (patroliId) {
                    const btn = document.getElementById(`btn-detail-patroli-${r.id}`);
                    if (btn) btn.addEventListener('click', () => ctx.action.doAction({
                        type: 'ir.actions.act_window',
                        res_model: 'petadigi.patroli',
                        res_id: patroliId,
                        views: [[false, 'form']],
                        target: 'current',
                    }));
                }
            }, 0);
        });

        ctx.markerLayerGroup.addLayer(marker);
    });

    // ── Rute polyline per patroli_id, urut tanggal ────────────────────────────
    const routeMap = {};
    records.forEach(r => {
        const pid = Array.isArray(r.patroli_id) ? r.patroli_id[0] : null;
        if (!pid) return;
        if (!routeMap[pid]) routeMap[pid] = [];
        routeMap[pid].push(r);
    });

    Object.values(routeMap).forEach(group => {
        if (group.length < 2) return;
        group.sort((a, b) => (a.tanggal || '').localeCompare(b.tanggal || ''));
        const latlngs = group.map(r => [r.latitude, r.longitude]);
        L.polyline(latlngs, {
            color:     '#1e8449',
            weight:    2.5,
            opacity:   0.85,
            dashArray: '8, 5',
            pane:      'patroliRoutePane',
        }).addTo(ctx._patroliPolylineLayer);
    });
}

// ════════════════════════════════════════════════════════════════════════════
// LEVEL 1 — KABUPATEN
// ════════════════════════════════════════════════════════════════════════════
export async function loadModePatroli(ctx) {
    const ver = ctx._modeVersion;
    _addPatroliLegend(ctx);
    ctx.currentLevel = 'kabupaten';

    const filters = _getActiveFilters(ctx);
    const geoBase = filters.kabupatenId ? [['kabupaten_id', '=', filters.kabupatenId]] : [];

    try {
        let krimGroups, ptGroups, records;

        if (filters.polresId && !filters.kabupatenId) {
            // Fetch ptGroups first to derive kabupaten IDs from actual data —
            // avoids empty map when kabupaten.polres_id is not populated.
            ptGroups = await ctx.orm.call(
                'petadigi.patroli', 'read_group',
                [_buildPatroliDomain(filters, geoBase), ['kabupaten_id'], ['kabupaten_id']],
                { lazy: false }
            );
            if (ctx._modeVersion !== ver) return;

            const ptKabIds = ptGroups
                .filter(g => Array.isArray(g.kabupaten_id) && g.kabupaten_id[0])
                .map(g => g.kabupaten_id[0]);

            const kabDomain = ptKabIds.length
                ? [['id', 'in', ptKabIds]]
                : [['polres_id', '=', filters.polresId]];

            [krimGroups, records] = await Promise.all([
                ctx.orm.call(
                    'petadigi.kriminalitas', 'read_group',
                    [_buildKriminalDomain(filters, geoBase), ['kabupaten_id'], ['kabupaten_id']],
                    { lazy: false }
                ),
                ctx.orm.searchRead(
                    'petadigi.kabupaten', kabDomain,
                    ['id', 'code', 'name', 'type', 'kecamatan_ids', 'geometry'],
                ),
            ]);
        } else {
            const kabDomain = filters.kabupatenId ? [['id', '=', filters.kabupatenId]] : [];
            [krimGroups, ptGroups, records] = await Promise.all([
                ctx.orm.call(
                    'petadigi.kriminalitas', 'read_group',
                    [_buildKriminalDomain(filters, geoBase), ['kabupaten_id'], ['kabupaten_id']],
                    { lazy: false }
                ),
                ctx.orm.call(
                    'petadigi.patroli', 'read_group',
                    [_buildPatroliDomain(filters, geoBase), ['kabupaten_id'], ['kabupaten_id']],
                    { lazy: false }
                ),
                ctx.orm.searchRead(
                    'petadigi.kabupaten', kabDomain,
                    ['id', 'code', 'name', 'type', 'kecamatan_ids', 'geometry'],
                ),
            ]);
        }
        const krimMap = _buildCountMap(krimGroups, 'kabupaten_id');
        const ptMap   = _buildCountMap(ptGroups,   'kabupaten_id');

        const features = records
            .filter(r => r.geometry)
            .map(r => {
                try {
                    const jumlah_kriminal = krimMap[r.id] || 0;
                    const jumlah_patroli  = ptMap[r.id]   || 0;
                    return {
                        type: 'Feature',
                        geometry: JSON.parse(r.geometry),
                        properties: {
                            id: r.id, code: r.code, name: r.name, type: r.type,
                            jumlah_kecamatan: r.kecamatan_ids ? r.kecamatan_ids.length : 0,
                            jumlah_kriminal,
                            jumlah_patroli,
                            color: getKriminalColor(jumlah_kriminal),
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
                layer.on('click',     e  => _showPatroliKabupatenPopup(ctx, e, props, layer, filters));
            }
        });

        if (ctx._modeVersion !== ver) return;
        ctx.kabupatenLayerGroup.addLayer(geoLayer);
        ctx._fitBoundsZoomedIn(geoLayer.getBounds());
        if (ctx._patroliPolylineLayer) ctx._patroliPolylineLayer.clearLayers();
        renderKabupatenSummaryMarkers(ctx, geoLayer, filters, 'jumlah_patroli',
            `<i class="fa fa-car"></i> Peta Patroli`,
            'fa-car', drillDownPatroliKecamatan);
    } catch (error) {
        console.error('Gagal memuat data patroli:', error);
    }
}

// ── Popup Kabupaten ───────────────────────────────────────────────────────────
function _showPatroliKabupatenPopup(ctx, e, props, layer, filters) {
    const tipeLabel = props.type === 'KOTA' ? 'Kota' : 'Kabupaten';
    const krimColor = props.color === '#abebc6' ? '#27ae60' : props.color;
    const krimLabel = props.jumlah_kriminal > 0
        ? `<strong style="color:${krimColor};">${_fmtNum(props.jumlah_kriminal)} Kasus</strong>`
        : `<strong style="color:#999;">Tidak Ada Kasus</strong>`;
    const ptLabel = props.jumlah_patroli > 0
        ? `<strong style="color:#1e8449;">${_fmtNum(props.jumlah_patroli)} Kegiatan</strong>`
        : `<strong style="color:#999;">Belum Ada Patroli</strong>`;

    const popup = L.popup({ maxWidth: 280, className: 'petadigi-leaflet-popup' })
        .setLatLng(e.latlng)
        .setContent(`
            <div class="petadigi-popup">
                <div class="petadigi-popup-header" style="background:#2c3e50;">
                    <i class="fa fa-car"></i>
                    <strong>${tipeLabel} ${props.name}</strong>
                </div>
                <div class="petadigi-popup-body">
                    <table>
                        <tr><td><i class="fa fa-barcode"></i> Kode</td><td><strong>${props.code}</strong></td></tr>
                        <tr><td><i class="fa fa-list"></i> Kecamatan</td><td><strong>${props.jumlah_kecamatan} Kecamatan</strong></td></tr>
                        <tr><td><i class="fa fa-exclamation-triangle" style="color:#e74c3c;"></i> Kriminalitas</td><td>${krimLabel}</td></tr>
                        <tr><td><i class="fa fa-car" style="color:#27ae60;"></i> Patroli</td><td>${ptLabel}</td></tr>
                    </table>
                </div>
                <div class="petadigi-popup-footer">
                    <button class="petadigi-btn-detail" style="background:#2c3e50;" id="btn-patroli-kec-${props.id}">
                        <i class="fa fa-search-plus"></i> Lihat Detail Kecamatan
                    </button>
                </div>
            </div>
        `);

    popup.once('add', () => {
        setTimeout(() => {
            const btn = document.getElementById(`btn-patroli-kec-${props.id}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    ctx.map.closePopup();
                    ctx._updateBreadcrumb(`<i class="fa fa-car"></i> Peta Patroli`);
                    ctx._appendBreadcrumb(`<i class="fa fa-car"></i> ${tipeLabel} ${props.name}`);
                    drillDownPatroliKecamatan(ctx, props, layer, filters);
                });
            }
        }, 0);
    });

    popup.openOn(ctx.map);
}

// ════════════════════════════════════════════════════════════════════════════
// LEVEL 2 — KECAMATAN
// ════════════════════════════════════════════════════════════════════════════
export async function drillDownPatroliKecamatan(ctx, kabProps, kabLayer, filters) {
    ctx.currentLevel = 'kecamatan';
    ctx.kabupatenLayerGroup.clearLayers();
    ctx.kabupatenLabelGroup.clearLayers();
    ctx.kecamatanLayerGroup.clearLayers();
    ctx.kecamatanLabelGroup.clearLayers();

    ctx._fitBoundsZoomedIn(kabLayer.getBounds(), { padding: [40, 40] });

    try {
        const geoKab = [['kabupaten_id', '=', kabProps.id]];

        const [krimGroups, ptGroups, records] = await Promise.all([
            ctx.orm.call(
                'petadigi.kriminalitas',
                'read_group',
                [_buildKriminalDomain(filters, geoKab), ['kecamatan_id'], ['kecamatan_id']],
                { lazy: false }
            ),
            ctx.orm.call(
                'petadigi.patroli',
                'read_group',
                [_buildPatroliDomain(filters, geoKab), ['kecamatan_id'], ['kecamatan_id']],
                { lazy: false }
            ),
            ctx.orm.searchRead(
                'petadigi.kecamatan',
                [['kabupaten_id', '=', kabProps.id]],
                ['id', 'code', 'name', 'desa_ids', 'geometry'],
            ),
        ]);
        const krimMap = _buildCountMap(krimGroups, 'kecamatan_id');
        const ptMap   = _buildCountMap(ptGroups,   'kecamatan_id');

        const features = records
            .filter(r => r.geometry)
            .map(r => {
                try {
                    const jumlah_kriminal = krimMap[r.id] || 0;
                    const jumlah_patroli  = ptMap[r.id]   || 0;
                    return {
                        type: 'Feature',
                        geometry: JSON.parse(r.geometry),
                        properties: {
                            id: r.id, code: r.code, name: r.name,
                            jumlah_desa: r.desa_ids ? r.desa_ids.length : 0,
                            jumlah_kriminal,
                            jumlah_patroli,
                            color: getKriminalColor(jumlah_kriminal),
                        }
                    };
                } catch (e) {
                    console.warn(`Gagal parse geometry kecamatan: ${r.name}`, e);
                    return null;
                }
            })
            .filter(Boolean);

        if (!features.length) {
            await loadModePatroli(ctx);
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
                layer.on('click',     e  => _showPatroliKecamatanPopup(ctx, e, props, layer, filters, kabProps, kabLayer));
            }
        });

        ctx.kecamatanLayerGroup.addLayer(geoLayer);
        if (ctx._patroliPolylineLayer) ctx._patroliPolylineLayer.clearLayers();
        renderSummaryMarkers(ctx, geoLayer, 'jumlah_patroli', (props, polygonLayer) => {
            ctx._appendBreadcrumb(`<i class="fa fa-map"></i> Kec. ${props.name}`);
            drillDownPatroliKelurahan(ctx, props, polygonLayer, filters, kabProps, kabLayer);
        });
        _addPatroliBackButton(ctx, 'kabupaten', { kabProps, kabLayer, filters });

        ctx.drillKabupatenId = kabProps.id;
        ctx.drillKecamatanId = null;
        if (ctx.filterKabupaten?.el) ctx.filterKabupaten.el.value = String(kabProps.id);
        ctx._updateFilterSummary(ctx.currentMode);
        ctx._updateKpiCards(ctx.currentMode);
        ctx._updateCharts(ctx.currentMode);
    } catch (error) {
        console.error('Gagal memuat data kecamatan patroli:', error);
    }
}

// ── Popup Kecamatan ───────────────────────────────────────────────────────────
function _showPatroliKecamatanPopup(ctx, e, props, layer, filters, kabProps, kabLayer) {
    const krimColor = props.color === '#abebc6' ? '#27ae60' : props.color;
    const krimLabel = props.jumlah_kriminal > 0
        ? `<strong style="color:${krimColor};">${_fmtNum(props.jumlah_kriminal)} Kasus</strong>`
        : `<strong style="color:#999;">Tidak Ada Kasus</strong>`;
    const ptLabel = props.jumlah_patroli > 0
        ? `<strong style="color:#1e8449;">${_fmtNum(props.jumlah_patroli)} Kegiatan</strong>`
        : `<strong style="color:#999;">Belum Ada Patroli</strong>`;

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
                        <tr><td><i class="fa fa-exclamation-triangle" style="color:#e74c3c;"></i> Kriminalitas</td><td>${krimLabel}</td></tr>
                        <tr><td><i class="fa fa-car" style="color:#27ae60;"></i> Patroli</td><td>${ptLabel}</td></tr>
                    </table>
                </div>
                <div class="petadigi-popup-footer">
                    <button class="petadigi-btn-detail" style="background:#2c3e50;" id="btn-patroli-desa-${props.id}">
                        <i class="fa fa-search-plus"></i> Lihat Detail Desa/Kelurahan
                    </button>
                </div>
            </div>
        `);

    popup.once('add', () => {
        setTimeout(() => {
            const btn = document.getElementById(`btn-patroli-desa-${props.id}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    ctx.map.closePopup();
                    ctx._appendBreadcrumb(`<i class="fa fa-map"></i> Kec. ${props.name}`);
                    drillDownPatroliKelurahan(ctx, props, layer, filters, kabProps, kabLayer);
                });
            }
        }, 0);
    });

    popup.openOn(ctx.map);
}

// ════════════════════════════════════════════════════════════════════════════
// LEVEL 3 — DESA/KELURAHAN
// ════════════════════════════════════════════════════════════════════════════
export async function drillDownPatroliKelurahan(ctx, kecProps, kecLayer, filters, kabProps, kabLayer) {
    ctx.currentLevel = 'desa';
    ctx.kecamatanLayerGroup.clearLayers();
    ctx.kecamatanLabelGroup.clearLayers();
    ctx.desaLayerGroup.clearLayers();
    ctx.desaLabelGroup.clearLayers();

    ctx.map.fitBounds(kecLayer.getBounds(), { padding: [40, 40] });

    try {
        const geoKec = [['kecamatan_id', '=', kecProps.id]];

        const [krimGroups, ptGroups, records] = await Promise.all([
            ctx.orm.call(
                'petadigi.kriminalitas',
                'read_group',
                [_buildKriminalDomain(filters, geoKec), ['desa_id'], ['desa_id']],
                { lazy: false }
            ),
            ctx.orm.call(
                'petadigi.patroli',
                'read_group',
                [_buildPatroliDomain(filters, geoKec), ['desa_id'], ['desa_id']],
                { lazy: false }
            ),
            ctx.orm.searchRead(
                'petadigi.desa',
                [['kecamatan_id', '=', kecProps.id]],
                ['id', 'code', 'name', 'type', 'geometry'],
            ),
        ]);
        const krimMap = _buildCountMap(krimGroups, 'desa_id');
        const ptMap   = _buildCountMap(ptGroups,   'desa_id');

        const features = records
            .filter(r => r.geometry)
            .map(r => {
                try {
                    const jumlah_kriminal = krimMap[r.id] || 0;
                    const jumlah_patroli  = ptMap[r.id]   || 0;
                    return {
                        type: 'Feature',
                        geometry: JSON.parse(r.geometry),
                        properties: {
                            id: r.id, code: r.code, name: r.name, type: r.type,
                            jumlah_kriminal,
                            jumlah_patroli,
                            color: getKriminalColor(jumlah_kriminal),
                        }
                    };
                } catch (e) {
                    console.warn(`Gagal parse geometry desa: ${r.name}`, e);
                    return null;
                }
            })
            .filter(Boolean);

        if (!features.length) {
            drillDownPatroliKecamatan(ctx, kabProps, kabLayer, filters);
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
                layer.on('click',     e  => _showPatroliDesaPopup(ctx, e, props));
            }
        });

        ctx.desaLayerGroup.addLayer(geoLayer);
        await _loadPatroliMarkers(ctx, filters, geoKec);
        _addPatroliBackButton(ctx, 'kecamatan', { kecProps, kecLayer, filters, kabProps, kabLayer });

        ctx.drillKecamatanId = kecProps.id;
        ctx._updateKpiCards(ctx.currentMode);
        ctx._updateCharts(ctx.currentMode);
    } catch (error) {
        console.error('Gagal memuat data desa patroli:', error);
    }
}

// ── Popup Desa ────────────────────────────────────────────────────────────────
function _showPatroliDesaPopup(ctx, e, props) {
    const tipeLabel = props.type === 'KELURAHAN' ? 'Kelurahan' : 'Desa';
    const krimColor = props.color === '#abebc6' ? '#27ae60' : props.color;
    const krimLabel = props.jumlah_kriminal > 0
        ? `<strong style="color:${krimColor};">${_fmtNum(props.jumlah_kriminal)} Kasus</strong>`
        : `<strong style="color:#999;">Tidak Ada Kasus</strong>`;
    const ptLabel = props.jumlah_patroli > 0
        ? `<strong style="color:#1e8449;">${_fmtNum(props.jumlah_patroli)} Kegiatan</strong>`
        : `<strong style="color:#999;">Belum Ada Patroli</strong>`;

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
                        <tr><td><i class="fa fa-exclamation-triangle" style="color:#e74c3c;"></i> Kriminalitas</td><td>${krimLabel}</td></tr>
                        <tr><td><i class="fa fa-car" style="color:#27ae60;"></i> Patroli</td><td>${ptLabel}</td></tr>
                    </table>
                </div>
            </div>
        `)
        .openOn(ctx.map);
}

// ── Back Button ───────────────────────────────────────────────────────────────
function _addPatroliBackButton(ctx, targetLevel, backCtx) {
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
                    ctx._updateBreadcrumb(`<i class="fa fa-car"></i> Peta Patroli`);
                    ctx._updateFilterSummary(ctx.currentMode);
                    await loadModePatroli(ctx);
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
                    await drillDownPatroliKecamatan(ctx, backCtx.kabProps, backCtx.kabLayer, backCtx.filters);
                }
            });
            return btn;
        },
        onRemove: () => {}
    });

    ctx.backButton = new BackControl({ position: 'topleft' });
    ctx.backButton.addTo(ctx.map);
}
