/** @odoo-module **/

import { initLokasiOverlay, updateLokasiOverlayMarkers } from './dashboard_overlay_lokasi';
import { fmtTanggal, renderKabupatenSummaryMarkers, renderSummaryMarkers, wibDateStartUtc, wibDateEndUtc } from './dashboard_helpers';

/**
 * Peta Bencana
 * Choropleth per kabupaten/kecamatan/desa — warna berdasarkan jumlah kejadian bencana.
 */

// ── Skala warna bencana ──────────────────────────────────────────────────────
const BENCANA_COLORS = [
    { min: 51, max: Infinity, color: '#922b21', label: '> 50 Kejadian'    },
    { min: 21, max: 50,       color: '#e74c3c', label: '21 – 50 Kejadian' },
    { min: 11, max: 20,       color: '#e67e22', label: '11 – 20 Kejadian' },
    { min:  1, max: 10,       color: '#f1c40f', label: '1 – 10 Kejadian'  },
    { min:  0, max:  0,       color: '#abebc6', label: 'Tidak Ada Kejadian' },
];

function getBencanaColor(jumlah) {
    for (const tier of BENCANA_COLORS) {
        if (jumlah >= tier.min) return tier.color;
    }
    return '#abebc6';
}

// ── Legend ───────────────────────────────────────────────────────────────────
export function addBencanaLegend(ctx) {
    if (ctx.bencanaLegend) { ctx.bencanaLegend.remove(); ctx.bencanaLegend = null; }
    const BencanaLegend = L.Control.extend({
        onAdd() {
            const div = L.DomUtil.create('div', 'petadigi-legend petadigi-legend--bencana');
            div.innerHTML = `
                <div class="petadigi-legend-title">
                    <i class="fa fa-bolt"></i> Legenda Bencana
                </div>
                <ul class="petadigi-legend-list">
                    ${BENCANA_COLORS.map(t => `
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
    ctx.bencanaLegend = new BencanaLegend({ position: 'bottomright' });
    ctx.bencanaLegend.addTo(ctx.map);
}

export function removeBencanaLegend(ctx) {
    if (ctx.bencanaLegend) { ctx.bencanaLegend.remove(); ctx.bencanaLegend = null; }
}

// ── Helpers filter ───────────────────────────────────────────────────────────
function _getActiveFilters(ctx) {
    return {
        tahun:       ctx.filterTahun?.el?.value       || '',
        kabupatenId: ctx.filterKabupaten?.el?.value   ? parseInt(ctx.filterKabupaten.el.value)  : null,
        dateFrom:    ctx.activeDateFrom                || '',
        dateTo:      ctx.activeDateTo                  || '',
        kategoriId:  ctx.filterKategori?.el?.value    ? parseInt(ctx.filterKategori.el.value)   : null,
        stateValue:  ctx.filterState?.el?.value       || '',
    };
}

function _buildDomain(filters, extraDomain = []) {
    const domain = [...extraDomain];
    if (filters.tahun)      domain.push(['tahun', '=',  filters.tahun]);
    if (filters.dateFrom)   domain.push(['tanggal_kejadian',        '>=', wibDateStartUtc(filters.dateFrom)]);
    if (filters.dateTo)     domain.push(['tanggal_kejadian',        '<=', wibDateEndUtc(filters.dateTo)]);
    if (filters.kategoriId) domain.push(['kategori_id',             '=',  filters.kategoriId]);
    if (filters.stateValue) domain.push(['state',                   '=',  filters.stateValue]);
    return domain;
}

function _periodeLabel(filters) {
    const parts = [];
    if (filters.tahun)    parts.push(`Tahun ${filters.tahun}`);
    if (filters.dateFrom) parts.push(`dari ${filters.dateFrom}`);
    if (filters.dateTo)   parts.push(`s/d ${filters.dateTo}`);
    return parts.length ? parts.join(', ') : 'Semua Periode';
}

function _buildKasusMap(groups, field) {
    const m = {};
    for (const g of groups) {
        if (!g[field]) continue;
        const id = Array.isArray(g[field]) ? g[field][0] : g[field];
        m[id] = g.__count || 0;
    }
    return m;
}

// ── Marker ───────────────────────────────────────────────────────────────────
async function _loadBencanaMarkers(ctx, domain, limit) {
    ctx.markerLayerGroup.clearLayers();

    const searchOpts = limit ? { limit, order: 'tanggal_kejadian desc' } : { order: 'tanggal_kejadian desc' };
    const [categories, records] = await Promise.all([
        ctx.orm.searchRead('petadigi.kategori_bencana', [], ['id', 'icon']),
        ctx.orm.searchRead(
            'petadigi.bencana',
            [['latitude', '!=', 0], ['longitude', '!=', 0], ...domain],
            ['id', 'code', 'nama_bencana', 'latitude', 'longitude',
             'kategori_id', 'penyebab', 'tindak_lanjut', 'state', 'tanggal_kejadian'],
            searchOpts,
        ),
    ]);
    const categoryIconMap = {};
    for (const cat of categories) {
        categoryIconMap[cat.id] = cat.icon || 'fa-exclamation-triangle';
    }

    records.forEach(r => {
        const stateColor  = r.state === 'AKTIF' ? '#e74c3c' : '#27ae60';
        const stateLabel  = r.state === 'AKTIF' ? 'Aktif' : 'Non Aktif';
        const kategori    = Array.isArray(r.kategori_id) ? r.kategori_id[1] : '-';
        const penyebab    = r.penyebab ? r.penyebab.slice(0, 60) + (r.penyebab.length > 60 ? '…' : '') : '-';
        const tglKejadian = fmtTanggal(r.tanggal_kejadian);

        const katId  = Array.isArray(r.kategori_id) ? r.kategori_id[0] : null;
        const faIcon = (katId && categoryIconMap[katId]) ? categoryIconMap[katId] : 'fa-exclamation-triangle';

        const icon = L.divIcon({
            className: '',
            html: `<div class="petadigi-bencana-marker" style="border-color:${stateColor};">
                       <i class="fa ${faIcon}" style="color:${stateColor};"></i>
                   </div>`,
            iconSize:   [24, 24],
            iconAnchor: [12, 12],
        });

        const marker = L.marker([r.latitude, r.longitude], { icon });
        marker.bindPopup(`
            <div class="petadigi-popup">
                <div class="petadigi-popup-header" style="background:#922b21;">
                    <i class="fa ${faIcon}"></i>
                    <strong>${r.code}</strong>
                </div>
                <div id="bencana-foto-wrap-${r.id}" class="petadigi-popup-foto">
                    <div class="petadigi-popup-foto-spinner">
                        <i class="fa fa-circle-o-notch fa-spin"></i>
                    </div>
                </div>
                <div class="petadigi-popup-body">
                    <table>
                        <tr><td><i class="fa fa-tag"></i> Nama</td><td><strong>${r.nama_bencana || '-'}</strong></td></tr>
                        <tr><td><i class="fa fa-calendar"></i> Tanggal</td><td><strong>${tglKejadian}</strong></td></tr>
                        <tr><td><i class="fa fa-list"></i> Kategori</td><td><strong>${kategori}</strong></td></tr>
                        <tr><td><i class="fa fa-info-circle"></i> Penyebab</td><td><strong>${penyebab}</strong></td></tr>
                        <tr><td><i class="fa fa-flag"></i> Status</td><td><strong style="color:${stateColor};">${stateLabel}</strong></td></tr>
                    </table>
                </div>
                <div class="petadigi-popup-footer">
                    <button class="petadigi-btn-detail" style="background:#922b21;" id="btn-detail-bencana-${r.id}">
                        <i class="fa fa-external-link"></i> Lihat Detail
                    </button>
                </div>
            </div>
        `, { maxWidth: 300, className: 'petadigi-leaflet-popup' });

        marker.on('popupopen', () => {
            // Lazy-load foto — hanya fetch saat popup dibuka
            const fotoWrap = document.getElementById(`bencana-foto-wrap-${r.id}`);
            if (fotoWrap) {
                const img = document.createElement('img');
                img.className = 'petadigi-popup-foto-img';
                img.alt = 'Foto Bencana';
                const spinner = fotoWrap.querySelector('.petadigi-popup-foto-spinner');
                img.onload = () => {
                    if (img.naturalWidth > 1) {
                        fotoWrap.appendChild(img);
                        img.style.display = 'block';
                        if (spinner) spinner.style.display = 'none';
                    } else {
                        fotoWrap.style.display = 'none';
                    }
                };
                img.onerror = () => { fotoWrap.style.display = 'none'; };
                img.src = `/web/image/petadigi.bencana/${r.id}/foto`;
            }
            // Bind tombol detail
            setTimeout(() => {
                const btn = document.getElementById(`btn-detail-bencana-${r.id}`);
                if (btn) btn.addEventListener('click', () => ctx.action.doAction({
                    type: 'ir.actions.act_window',
                    res_model: 'petadigi.bencana',
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
export async function loadModeBencana(ctx) {
    const ver = ctx._modeVersion;
    addBencanaLegend(ctx);
    ctx.currentLevel = 'kabupaten';

    const filters    = _getActiveFilters(ctx);
    const baseDomain = filters.kabupatenId ? [['kabupaten_id', '=', filters.kabupatenId]] : [];

    try {
        const kabDomain = filters.kabupatenId ? [['id', '=', filters.kabupatenId]] : [];
        const [groups, records] = await Promise.all([
            ctx.orm.call(
                'petadigi.bencana',
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
        const kasusMap = _buildKasusMap(groups, 'kabupaten_id');

        const features = records
            .filter(r => r.geometry)
            .map(r => {
                try {
                    const jumlah = kasusMap[r.id] || 0;
                    return {
                        type: 'Feature',
                        geometry: JSON.parse(r.geometry),
                        properties: {
                            id: r.id, code: r.code, name: r.name, type: r.type,
                            jumlah_kecamatan: r.kecamatan_ids ? r.kecamatan_ids.length : 0,
                            jumlah_kasus: jumlah,
                            color: getBencanaColor(jumlah),
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
                layer.on('click',     e  => _showBencanaKabupatenPopup(ctx, e, props, layer, filters));
            }
        });

        if (ctx._modeVersion !== ver) return;
        ctx.kabupatenLayerGroup.addLayer(geoLayer);
        ctx._fitBoundsZoomedIn(geoLayer.getBounds());
        renderKabupatenSummaryMarkers(ctx, geoLayer, filters, 'jumlah_kasus',
            `<i class="fa fa-bolt"></i> Peta Bencana`,
            'fa-map-marker', drillDownBencanaKecamatan);
    } catch (error) {
        console.error('Gagal memuat data bencana:', error);
    }
    if (ctx._modeVersion !== ver) return;
    await initLokasiOverlay(ctx);
}

// ── Popup Kabupaten ──────────────────────────────────────────────────────────
function _showBencanaKabupatenPopup(ctx, e, props, layer, filters) {
    const tipeLabel  = props.type === 'KOTA' ? 'Kota' : 'Kabupaten';
    const kasusLabel = props.jumlah_kasus > 0
        ? `<strong style="color:${props.color};">${props.jumlah_kasus.toLocaleString('id-ID')} Kejadian</strong>`
        : `<strong style="color:#27ae60;">Tidak Ada Kejadian</strong>`;

    const popup = L.popup({ maxWidth: 280, className: 'petadigi-leaflet-popup' })
        .setLatLng(e.latlng)
        .setContent(`
            <div class="petadigi-popup">
                <div class="petadigi-popup-header" style="background:#1a5276;">
                    <i class="fa fa-bolt"></i>
                    <strong>${tipeLabel} ${props.name}</strong>
                </div>
                <div class="petadigi-popup-body">
                    <table>
                        <tr><td><i class="fa fa-barcode"></i> Kode</td><td><strong>${props.code}</strong></td></tr>
                        <tr><td><i class="fa fa-calendar"></i> Periode</td><td><strong>${_periodeLabel(filters)}</strong></td></tr>
                        <tr><td><i class="fa fa-list"></i> Kecamatan</td><td><strong>${props.jumlah_kecamatan} Kecamatan</strong></td></tr>
                        <tr><td><i class="fa fa-bolt" style="color:#2980b9;"></i> Kejadian</td><td>${kasusLabel}</td></tr>
                    </table>
                </div>
                <div class="petadigi-popup-footer">
                    <button class="petadigi-btn-detail" style="background:#1a5276;" id="btn-bencana-kec-${props.id}">
                        <i class="fa fa-search-plus"></i> Lihat Detail Kecamatan
                    </button>
                </div>
            </div>
        `);

    popup.once('add', () => {
        setTimeout(() => {
            const btn = document.getElementById(`btn-bencana-kec-${props.id}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    ctx.map.closePopup();
                    ctx._updateBreadcrumb(`<i class="fa fa-bolt"></i> Peta Bencana`);
                    ctx._appendBreadcrumb(`<i class="fa fa-map-marker"></i> ${tipeLabel} ${props.name}`);
                    drillDownBencanaKecamatan(ctx, props, layer, filters);
                });
            }
        }, 0);
    });

    popup.openOn(ctx.map);
}

// ════════════════════════════════════════════════════════════════════════════
// LEVEL 2 — KECAMATAN
// ════════════════════════════════════════════════════════════════════════════
export async function drillDownBencanaKecamatan(ctx, kabProps, kabLayer, filters) {
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
                'petadigi.bencana',
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
        const kasusMap = _buildKasusMap(groups, 'kecamatan_id');

        const features = records
            .filter(r => r.geometry)
            .map(r => {
                try {
                    const jumlah = kasusMap[r.id] || 0;
                    return {
                        type: 'Feature',
                        geometry: JSON.parse(r.geometry),
                        properties: {
                            id: r.id, code: r.code, name: r.name,
                            jumlah_desa: r.desa_ids ? r.desa_ids.length : 0,
                            jumlah_kasus: jumlah,
                            color: getBencanaColor(jumlah),
                        }
                    };
                } catch (e) {
                    console.warn(`Gagal parse geometry kecamatan: ${r.name}`, e);
                    return null;
                }
            })
            .filter(Boolean);

        if (!features.length) {
            await loadModeBencana(ctx);
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
                layer.on('click',     e  => _showBencanaKecamatanPopup(ctx, e, props, layer, filters, kabProps, kabLayer));
            }
        });

        ctx.kecamatanLayerGroup.addLayer(geoLayer);
        renderSummaryMarkers(ctx, geoLayer, 'jumlah_kasus', (props, polygonLayer) => {
            ctx._appendBreadcrumb(`<i class="fa fa-map"></i> Kec. ${props.name}`);
            drillDownBencanaKelurahan(ctx, props, polygonLayer, filters, kabProps, kabLayer);
        });
        _addBencanaBackButton(ctx, 'kabupaten', { kabProps, kabLayer, filters });

        ctx.drillKabupatenId = kabProps.id;
        ctx.drillKecamatanId = null;
        if (ctx.filterKabupaten?.el) ctx.filterKabupaten.el.value = String(kabProps.id);
        ctx._updateFilterSummary(ctx.currentMode);
        ctx._updateKpiCards(ctx.currentMode);
        ctx._updateCharts(ctx.currentMode);
        updateLokasiOverlayMarkers(ctx);
    } catch (error) {
        console.error('Gagal memuat data kecamatan bencana:', error);
    }
}

// ── Popup Kecamatan ──────────────────────────────────────────────────────────
function _showBencanaKecamatanPopup(ctx, e, props, layer, filters, kabProps, kabLayer) {
    const kasusLabel = props.jumlah_kasus > 0
        ? `<strong style="color:${props.color};">${props.jumlah_kasus.toLocaleString('id-ID')} Kejadian</strong>`
        : `<strong style="color:#27ae60;">Tidak Ada Kejadian</strong>`;

    const popup = L.popup({ maxWidth: 280, className: 'petadigi-leaflet-popup' })
        .setLatLng(e.latlng)
        .setContent(`
            <div class="petadigi-popup">
                <div class="petadigi-popup-header" style="background:#2471a3;">
                    <i class="fa fa-map"></i>
                    <strong>Kec. ${props.name}</strong>
                </div>
                <div class="petadigi-popup-body">
                    <table>
                        <tr><td><i class="fa fa-barcode"></i> Kode</td><td><strong>${props.code}</strong></td></tr>
                        <tr><td><i class="fa fa-calendar"></i> Periode</td><td><strong>${_periodeLabel(filters)}</strong></td></tr>
                        <tr><td><i class="fa fa-home"></i> Desa/Kel.</td><td><strong>${props.jumlah_desa} Desa/Kelurahan</strong></td></tr>
                        <tr><td><i class="fa fa-bolt" style="color:#2980b9;"></i> Kejadian</td><td>${kasusLabel}</td></tr>
                    </table>
                </div>
                <div class="petadigi-popup-footer">
                    <button class="petadigi-btn-detail" style="background:#2471a3;" id="btn-bencana-desa-${props.id}">
                        <i class="fa fa-search-plus"></i> Lihat Detail Desa/Kelurahan
                    </button>
                </div>
            </div>
        `);

    popup.once('add', () => {
        setTimeout(() => {
            const btn = document.getElementById(`btn-bencana-desa-${props.id}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    ctx.map.closePopup();
                    ctx._appendBreadcrumb(`<i class="fa fa-map"></i> Kec. ${props.name}`);
                    drillDownBencanaKelurahan(ctx, props, layer, filters, kabProps, kabLayer);
                });
            }
        }, 0);
    });

    popup.openOn(ctx.map);
}

// ════════════════════════════════════════════════════════════════════════════
// LEVEL 3 — DESA/KELURAHAN
// ════════════════════════════════════════════════════════════════════════════
export async function drillDownBencanaKelurahan(ctx, kecProps, kecLayer, filters, kabProps, kabLayer) {
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
                'petadigi.bencana',
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
        const kasusMap = _buildKasusMap(groups, 'desa_id');

        const features = records
            .filter(r => r.geometry)
            .map(r => {
                try {
                    const jumlah = kasusMap[r.id] || 0;
                    return {
                        type: 'Feature',
                        geometry: JSON.parse(r.geometry),
                        properties: {
                            id: r.id, code: r.code, name: r.name, type: r.type,
                            jumlah_kasus: jumlah,
                            color: getBencanaColor(jumlah),
                        }
                    };
                } catch (e) {
                    console.warn(`Gagal parse geometry desa: ${r.name}`, e);
                    return null;
                }
            })
            .filter(Boolean);

        if (!features.length) {
            drillDownBencanaKecamatan(ctx, kabProps, kabLayer, filters);
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
                layer.on('click',     e  => _showBencanaDesaPopup(ctx, e, props, filters));
            }
        });

        ctx.desaLayerGroup.addLayer(geoLayer);
        await _loadBencanaMarkers(ctx, _buildDomain(filters, [['kecamatan_id', '=', kecProps.id]]));
        _addBencanaBackButton(ctx, 'kecamatan', { kecProps, kecLayer, filters, kabProps, kabLayer });

        ctx.drillKecamatanId = kecProps.id;
        ctx._updateKpiCards(ctx.currentMode);
        ctx._updateCharts(ctx.currentMode);
        updateLokasiOverlayMarkers(ctx);
    } catch (error) {
        console.error('Gagal memuat data desa bencana:', error);
    }
}

// ── Popup Desa ───────────────────────────────────────────────────────────────
function _showBencanaDesaPopup(ctx, e, props, filters) {
    const tipeLabel  = props.type === 'KELURAHAN' ? 'Kelurahan' : 'Desa';
    const kasusLabel = props.jumlah_kasus > 0
        ? `<strong style="color:${props.color};">${props.jumlah_kasus.toLocaleString('id-ID')} Kejadian</strong>`
        : `<strong style="color:#27ae60;">Tidak Ada Kejadian</strong>`;

    L.popup({ maxWidth: 280, className: 'petadigi-leaflet-popup' })
        .setLatLng(e.latlng)
        .setContent(`
            <div class="petadigi-popup">
                <div class="petadigi-popup-header" style="background:#1a5276;">
                    <i class="fa fa-home"></i>
                    <strong>${tipeLabel} ${props.name}</strong>
                </div>
                <div class="petadigi-popup-body">
                    <table>
                        <tr><td><i class="fa fa-barcode"></i> Kode</td><td><strong>${props.code}</strong></td></tr>
                        <tr><td><i class="fa fa-tag"></i> Tipe</td><td><strong>${tipeLabel}</strong></td></tr>
                        <tr><td><i class="fa fa-calendar"></i> Periode</td><td><strong>${_periodeLabel(filters)}</strong></td></tr>
                        <tr><td><i class="fa fa-bolt" style="color:#2980b9;"></i> Kejadian</td><td>${kasusLabel}</td></tr>
                    </table>
                </div>
            </div>
        `)
        .openOn(ctx.map);
}

// ── Back Button ──────────────────────────────────────────────────────────────
function _addBencanaBackButton(ctx, targetLevel, backCtx) {
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
                    ctx._updateBreadcrumb(`<i class="fa fa-bolt"></i> Peta Bencana`);
                    ctx._updateFilterSummary(ctx.currentMode);
                    await loadModeBencana(ctx);
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
                    await drillDownBencanaKecamatan(ctx, backCtx.kabProps, backCtx.kabLayer, backCtx.filters);
                }
            });
            return btn;
        },
        onRemove: () => {}
    });

    ctx.backButton = new BackControl({ position: 'topleft' });
    ctx.backButton.addTo(ctx.map);
}
