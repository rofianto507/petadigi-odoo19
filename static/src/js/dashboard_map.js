/** @odoo-module **/

import { Component, onMounted, useRef } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

class DashboardMap extends Component {
    static template = "petadigi.DashboardMap";

    setup() {
        this.mapRef = useRef("mapContainer");
        this.orm = useService("orm");

        onMounted(async () => {
            await this._initMap();
        });
    }

    async _initMap() {
        const el = this.mapRef.el;
        if (!el) return;

        this.map = L.map(el).setView([-3.31987, 104.91459], 8);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(this.map);

        // Layer groups untuk masing-masing tingkatan
        this.kabupatenLayerGroup = L.layerGroup().addTo(this.map);
        this.kabupatenLabelGroup = L.layerGroup().addTo(this.map);
        this.kecamatanLayerGroup = L.layerGroup().addTo(this.map);
        this.kecamatanLabelGroup = L.layerGroup().addTo(this.map);
        this.desaLayerGroup       = L.layerGroup().addTo(this.map);
        this.desaLabelGroup       = L.layerGroup().addTo(this.map);

        this.backButton = null;
        this.currentLevel = 'kabupaten'; // kabupaten | kecamatan | desa

        await this._loadKabupatenLayer();
    }

    // ─────────────────────────────────────────────
    // LEVEL 1 — KABUPATEN
    // ─────────────────────────────────────────────
    async _loadKabupatenLayer() {
        this.currentLevel = 'kabupaten';
        this.kabupatenLayerGroup.clearLayers();
        this.kabupatenLabelGroup.clearLayers();

        try {
            const records = await this.orm.searchRead(
                'petadigi.kabupaten',
                [],
                ['id', 'code', 'name', 'type', 'kecamatan_ids', 'geometry'],
            );

            const features = records
                .filter(r => r.geometry)
                .map((r) => {
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
                .filter(f => f !== null);

            if (features.length === 0) return;

            const geoLayer = L.geoJSON({ type: "FeatureCollection", features }, {
                style: () => ({
                    color: '#888888',
                    weight: 1.5,
                    opacity: 1,
                    fillColor: '#aaaaaa',
                    fillOpacity: 0.35,
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
                        this.kabupatenLabelGroup.addLayer(label);
                    });

                    layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.55, fillColor: '#666666' }));
                    layer.on('mouseout',  () => layer.setStyle({ fillOpacity: 0.35, fillColor: '#aaaaaa' }));
                    layer.on('click', (e) => this._showKabupatenPopup(e, props, layer));
                }
            });

            this.kabupatenLayerGroup.addLayer(geoLayer);
            this.map.fitBounds(geoLayer.getBounds());

        } catch (error) {
            console.error("Gagal memuat data kabupaten:", error);
        }
    }

    _showKabupatenPopup(e, props, layer) {
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
            .setContent(popupContent)
            .openOn(this.map);

        // Bind tombol detail setelah popup terbuka
        this.map.once('popupopen', () => {
            const btn = document.getElementById(`btn-detail-kab-${props.id}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    this.map.closePopup();
                    this._drillDownKecamatan(props, layer);
                });
            }
        });
    }

    // ─────────────────────────────────────────────
    // LEVEL 2 — KECAMATAN
    // ─────────────────────────────────────────────
    async _drillDownKecamatan(kabProps, kabLayer) {
        this.currentLevel = 'kecamatan';

        // Sembunyikan layer kabupaten
        this.kabupatenLayerGroup.clearLayers();
        this.kabupatenLabelGroup.clearLayers();
        this.kecamatanLayerGroup.clearLayers();
        this.kecamatanLabelGroup.clearLayers();

        // Zoom ke area kabupaten
        const bounds = kabLayer.getBounds();
        this.map.fitBounds(bounds, { padding: [40, 40] });

        try {
            const records = await this.orm.searchRead(
                'petadigi.kecamatan',
                [['kabupaten_id', '=', kabProps.id]],
                ['id', 'code', 'name', 'desa_ids', 'geometry'],
            );

            const features = records
                .filter(r => r.geometry)
                .map((r) => {
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
                .filter(f => f !== null);

            if (features.length === 0) {
                console.warn('Tidak ada kecamatan dengan geometry di kabupaten ini.');
                await this._loadKabupatenLayer();
                return;
            }

            const geoLayer = L.geoJSON({ type: "FeatureCollection", features }, {
                style: () => ({
                    color: '#888888',
                    weight: 1.5,
                    opacity: 1,
                    fillColor: '#aaaaaa',
                    fillOpacity: 0.35,
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
                        this.kecamatanLabelGroup.addLayer(label);
                    });

                    layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.55, fillColor: '#666666' }));
                    layer.on('mouseout',  () => layer.setStyle({ fillOpacity: 0.35, fillColor: '#aaaaaa' }));
                    layer.on('click', (e) => this._showKecamatanPopup(e, props, layer, kabProps));
                }
            });

            this.kecamatanLayerGroup.addLayer(geoLayer);
            this._addBackButton('kabupaten', null);

        } catch (error) {
            console.error("Gagal memuat data kecamatan:", error);
        }
    }

    _showKecamatanPopup(e, props, layer, kabProps) {
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
            .setContent(popupContent)
            .openOn(this.map);

        this.map.once('popupopen', () => {
            const btn = document.getElementById(`btn-detail-kec-${props.id}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    this.map.closePopup();
                    this._drillDownDesa(props, layer, kabProps);
                });
            }
        });
    }

    // ─────────────────────────────────────────────
    // LEVEL 3 — DESA
    // ─────────────────────────────────────────────
    async _drillDownDesa(kecProps, kecLayer, kabProps) {
        this.currentLevel = 'desa';

        // Sembunyikan layer kecamatan
        this.kecamatanLayerGroup.clearLayers();
        this.kecamatanLabelGroup.clearLayers();
        this.desaLayerGroup.clearLayers();
        this.desaLabelGroup.clearLayers();

        // Zoom ke area kecamatan
        const bounds = kecLayer.getBounds();
        this.map.fitBounds(bounds, { padding: [40, 40] });

        try {
            const records = await this.orm.searchRead(
                'petadigi.desa',
                [['kecamatan_id', '=', kecProps.id]],
                ['id', 'code', 'name', 'type', 'geometry'],
            );

            const features = records
                .filter(r => r.geometry)
                .map((r) => {
                    try {
                        return {
                            type: "Feature",
                            geometry: JSON.parse(r.geometry),
                            properties: {
                                id: r.id,
                                code: r.code,
                                name: r.name,
                                type: r.type,
                            }
                        };
                    } catch (e) {
                        console.warn(`Gagal parse geometry desa: ${r.name}`, e);
                        return null;
                    }
                })
                .filter(f => f !== null);

            if (features.length === 0) {
                console.warn('Tidak ada desa dengan geometry di kecamatan ini.');
                await this._drillDownKecamatan(kabProps, kecLayer);
                return;
            }

            const geoLayer = L.geoJSON({ type: "FeatureCollection", features }, {
                style: () => ({
                    color: '#888888',
                    weight: 1.5,
                    opacity: 1,
                    fillColor: '#aaaaaa',
                    fillOpacity: 0.35,
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
                        this.desaLabelGroup.addLayer(label);
                    });

                    layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.55, fillColor: '#666666' }));
                    layer.on('mouseout',  () => layer.setStyle({ fillOpacity: 0.35, fillColor: '#aaaaaa' }));
                    layer.on('click', (e) => this._showDesaPopup(e, props));
                }
            });

            this.desaLayerGroup.addLayer(geoLayer);
            this._addBackButton('kecamatan', { kecProps, kecLayer, kabProps });

        } catch (error) {
            console.error("Gagal memuat data desa:", error);
        }
    }

    _showDesaPopup(e, props) {
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
            .openOn(this.map);
    }

    // ─────────────────────────────────────────────
    // TOMBOL KEMBALI
    // ─────────────────────────────────────────────
    _addBackButton(targetLevel, ctx) {
        // Hapus tombol kembali lama
        if (this.backButton) {
            this.backButton.remove();
            this.backButton = null;
        }

        const labelMap = {
            kabupaten: '← Kembali ke Peta Kabupaten',
            kecamatan: '← Kembali ke Peta Kecamatan',
        };

        const BackControl = L.Control.extend({
            onAdd: () => {
                const btn = L.DomUtil.create('button', 'petadigi-btn-back');
                btn.innerHTML = `<i class="fa fa-arrow-left"></i> ${labelMap[targetLevel]}`;
                L.DomEvent.on(btn, 'click', async (ev) => {
                    L.DomEvent.stopPropagation(ev);
                    this.map.closePopup();
                    if (targetLevel === 'kabupaten') {
                        this.kecamatanLayerGroup.clearLayers();
                        this.kecamatanLabelGroup.clearLayers();
                        this.desaLayerGroup.clearLayers();
                        this.desaLabelGroup.clearLayers();
                        await this._loadKabupatenLayer();
                    } else if (targetLevel === 'kecamatan' && ctx) {
                        this.desaLayerGroup.clearLayers();
                        this.desaLabelGroup.clearLayers();
                        await this._drillDownKecamatan(ctx.kabProps, ctx.kecLayer);
                    }
                    if (this.backButton) {
                        this.backButton.remove();
                        this.backButton = null;
                    }
                });
                return btn;
            },
            onRemove: () => {}
        });

        this.backButton = new BackControl({ position: 'topleft' });
        this.backButton.addTo(this.map);
    }
}

registry.category("actions").add("petadigi_dashboard_map", DashboardMap);
