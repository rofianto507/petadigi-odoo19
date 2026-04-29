/** @odoo-module **/

import { addBackButton } from "./dashboard_helpers";

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 1 — KABUPATEN
// ─────────────────────────────────────────────────────────────────────────────

export async function loadKabupatenLayer(ctx) {
    ctx.currentLevel = 'kabupaten';
    ctx.kabupatenLayerGroup.clearLayers();
    ctx.kabupatenLabelGroup.clearLayers();

    try {
        const records = await ctx.orm.searchRead(
            'petadigi.kabupaten',
            [],
            ['id', 'code', 'name', 'type', 'kecamatan_ids', 'geometry'],
        );

        const features = records
            .filter(r => r.geometry)
            .map(r => {
                try {
                    return {
                        type: "Feature",
                        geometry: JSON.parse(r.geometry),
                        properties: {
                            id: r.id,
                            code: r.code,
                            name: r.name,
                            type: r.type,
                            jumlah_kecamatan: r.kecamatan_ids ? r.kecamatan_ids.length : 0,
                        }
                    };
                } catch (e) {
                    console.warn(`Gagal parse geometry kabupaten: ${r.name}`, e);
                    return null;
                }
            })
            .filter(Boolean);

        if (features.length === 0) return;

        const geoLayer = L.geoJSON({ type: "FeatureCollection", features }, {
            style: () => ({
                color: '#888888', weight: 1.5, opacity: 1,
                fillColor: '#aaaaaa', fillOpacity: 0.35,
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

                layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.55, fillColor: '#666666' }));
                layer.on('mouseout',  () => layer.setStyle({ fillOpacity: 0.35, fillColor: '#aaaaaa' }));
                layer.on('click', (e) => _showKabupatenPopup(ctx, e, props, layer));
            }
        });

        ctx.kabupatenLayerGroup.addLayer(geoLayer);
        ctx.map.fitBounds(geoLayer.getBounds());

    } catch (error) {
        console.error("Gagal memuat data kabupaten:", error);
    }
}

function _showKabupatenPopup(ctx, e, props, layer) {
    const tipeLabel = props.type === 'KOTA' ? 'Kota' : 'Kabupaten';
    const popupContent = `
        <div class="petadigi-popup">
            <div class="petadigi-popup-header">
                <i class="fa fa-map-marker"></i>
                <strong>${tipeLabel} ${props.name}</strong>
            </div>
            <div class="petadigi-popup-body">
                <table>
                    <tr>
                        <td><i class="fa fa-barcode"></i> Kode</td>
                        <td><strong>${props.code}</strong></td>
                    </tr>
                    <tr>
                        <td><i class="fa fa-tag"></i> Tipe</td>
                        <td><strong>${tipeLabel}</strong></td>
                    </tr>
                    <tr>
                        <td><i class="fa fa-list"></i> Kecamatan</td>
                        <td><strong>${props.jumlah_kecamatan} Kecamatan</strong></td>
                    </tr>
                </table>
            </div>
            <div class="petadigi-popup-footer">
                <button class="petadigi-btn-detail" id="btn-detail-kab-${props.id}">
                    <i class="fa fa-search-plus"></i> Lihat Detail Kecamatan
                </button>
            </div>
        </div>
    `;

    const popup = L.popup({ maxWidth: 260, className: 'petadigi-leaflet-popup' })
        .setLatLng(e.latlng)
        .setContent(popupContent);

    popup.once('add', () => {
        setTimeout(() => {
            const btn = document.getElementById(`btn-detail-kab-${props.id}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    ctx.map.closePopup();
                    ctx._updateBreadcrumb(`<i class="fa fa-map"></i> Peta Umum`);
                    ctx._appendBreadcrumb(`<i class="fa fa-map-marker"></i> ${tipeLabel} ${props.name}`);
                    drillDownKecamatan(ctx, props, layer);
                });
            }
        }, 0);
    });

    popup.openOn(ctx.map);
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 2 — KECAMATAN
// ─────────────────────────────────────────────────────────────────────────────

export async function drillDownKecamatan(ctx, kabProps, kabLayer) {
    ctx.currentLevel = 'kecamatan';
    ctx.kabupatenLayerGroup.clearLayers();
    ctx.kabupatenLabelGroup.clearLayers();
    ctx.kecamatanLayerGroup.clearLayers();
    ctx.kecamatanLabelGroup.clearLayers();

    ctx.map.fitBounds(kabLayer.getBounds(), { padding: [40, 40] });

    try {
        const records = await ctx.orm.searchRead(
            'petadigi.kecamatan',
            [['kabupaten_id', '=', kabProps.id]],
            ['id', 'code', 'name', 'desa_ids', 'geometry'],
        );

        const features = records
            .filter(r => r.geometry)
            .map(r => {
                try {
                    return {
                        type: "Feature",
                        geometry: JSON.parse(r.geometry),
                        properties: {
                            id: r.id,
                            code: r.code,
                            name: r.name,
                            jumlah_desa: r.desa_ids ? r.desa_ids.length : 0,
                        }
                    };
                } catch (e) {
                    console.warn(`Gagal parse geometry kecamatan: ${r.name}`, e);
                    return null;
                }
            })
            .filter(Boolean);

        if (features.length === 0) {
            console.warn('Tidak ada kecamatan dengan geometry.');
            await loadKabupatenLayer(ctx);
            return;
        }

        const geoLayer = L.geoJSON({ type: "FeatureCollection", features }, {
            style: () => ({
                color: '#888888', weight: 1.5, opacity: 1,
                fillColor: '#aaaaaa', fillOpacity: 0.35,
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

                layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.55, fillColor: '#666666' }));
                layer.on('mouseout',  () => layer.setStyle({ fillOpacity: 0.35, fillColor: '#aaaaaa' }));
                layer.on('click', (e) => _showKecamatanPopup(ctx, e, props, layer, kabProps));
            }
        });

        ctx.kecamatanLayerGroup.addLayer(geoLayer);
        addBackButton(ctx, 'kabupaten', null);

    } catch (error) {
        console.error("Gagal memuat data kecamatan:", error);
    }
}

function _showKecamatanPopup(ctx, e, props, layer, kabProps) {
    const popupContent = `
        <div class="petadigi-popup">
            <div class="petadigi-popup-header petadigi-popup-header--kecamatan">
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
                        <td><i class="fa fa-home"></i> Desa/Kel.</td>
                        <td><strong>${props.jumlah_desa} Desa/Kelurahan</strong></td>
                    </tr>
                </table>
            </div>
            <div class="petadigi-popup-footer">
                <button class="petadigi-btn-detail petadigi-btn-detail--kecamatan" id="btn-detail-kec-${props.id}">
                    <i class="fa fa-search-plus"></i> Lihat Detail Desa/Kelurahan
                </button>
            </div>
        </div>
    `;

    const popup = L.popup({ maxWidth: 260, className: 'petadigi-leaflet-popup' })
        .setLatLng(e.latlng)
        .setContent(popupContent);

    popup.once('add', () => {
        setTimeout(() => {
            const btn = document.getElementById(`btn-detail-kec-${props.id}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    ctx.map.closePopup();
                    ctx._appendBreadcrumb(`<i class="fa fa-map"></i> Kec. ${props.name}`);
                    drillDownDesa(ctx, props, layer, kabProps);
                });
            }
        }, 0);
    });

    popup.openOn(ctx.map);
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 3 — DESA
// ─────────────────────────────────────────────────────────────────────────────

export async function drillDownDesa(ctx, kecProps, kecLayer, kabProps) {
    ctx.currentLevel = 'desa';
    ctx.kecamatanLayerGroup.clearLayers();
    ctx.kecamatanLabelGroup.clearLayers();
    ctx.desaLayerGroup.clearLayers();
    ctx.desaLabelGroup.clearLayers();

    ctx.map.fitBounds(kecLayer.getBounds(), { padding: [40, 40] });

    try {
        const records = await ctx.orm.searchRead(
            'petadigi.desa',
            [['kecamatan_id', '=', kecProps.id]],
            ['id', 'code', 'name', 'type', 'geometry'],
        );

        const features = records
            .filter(r => r.geometry)
            .map(r => {
                try {
                    return {
                        type: "Feature",
                        geometry: JSON.parse(r.geometry),
                        properties: { id: r.id, code: r.code, name: r.name, type: r.type }
                    };
                } catch (e) {
                    console.warn(`Gagal parse geometry desa: ${r.name}`, e);
                    return null;
                }
            })
            .filter(Boolean);

        if (features.length === 0) {
            console.warn('Tidak ada desa dengan geometry.');
            await drillDownKecamatan(ctx, kabProps, kecLayer);
            return;
        }

        const geoLayer = L.geoJSON({ type: "FeatureCollection", features }, {
            style: () => ({
                color: '#888888', weight: 1.5, opacity: 1,
                fillColor: '#aaaaaa', fillOpacity: 0.35,
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
                    ctx.desaLabelGroup.addLayer(label);
                });

                layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.55, fillColor: '#666666' }));
                layer.on('mouseout',  () => layer.setStyle({ fillOpacity: 0.35, fillColor: '#aaaaaa' }));
                layer.on('click', (e) => _showDesaPopup(ctx, e, props));
            }
        });

        ctx.desaLayerGroup.addLayer(geoLayer);
        addBackButton(ctx, 'kecamatan', { kecProps, kecLayer, kabProps });

    } catch (error) {
        console.error("Gagal memuat data desa:", error);
    }
}

function _showDesaPopup(ctx, e, props) {
    const tipeLabel = props.type === 'KELURAHAN' ? 'Kelurahan' : 'Desa';
    const popupContent = `
        <div class="petadigi-popup">
            <div class="petadigi-popup-header petadigi-popup-header--desa">
                <i class="fa fa-home"></i>
                <strong>${tipeLabel} ${props.name}</strong>
            </div>
            <div class="petadigi-popup-body">
                <table>
                    <tr>
                        <td><i class="fa fa-barcode"></i> Kode</td>
                        <td><strong>${props.code}</strong></td>
                    </tr>
                    <tr>
                        <td><i class="fa fa-tag"></i> Tipe</td>
                        <td><strong>${tipeLabel}</strong></td>
                    </tr>
                </table>
            </div>
        </div>
    `;

    L.popup({ maxWidth: 260, className: 'petadigi-leaflet-popup' })
        .setLatLng(e.latlng)
        .setContent(popupContent)
        .openOn(ctx.map);
}
