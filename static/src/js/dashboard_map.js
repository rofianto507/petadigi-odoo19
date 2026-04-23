/** @odoo-module **/

import { Component, onMounted, useRef } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

class DashboardMap extends Component {
    static template = "petadigi.DashboardMap";

    setup() {
        this.mapRef         = useRef("mapContainer");
        this.sidebarRef     = useRef("sidebar");
        this.breadcrumbRef  = useRef("breadcrumb");
        this.collapseIcon   = useRef("collapseIcon");
        this.collapseText   = useRef("collapseText");
        this.filterTahun    = useRef("filterTahun");
        this.filterKabupaten = useRef("filterKabupaten");

        this.orm = useService("orm");

        this.sidebarOpen = true;
        this.currentMode = 'umum';     // umum | kriminal | lalin | bencana | lokasi
        this.currentLevel = 'kabupaten';
        this.backButton = null;

        onMounted(async () => {
            await this._initFilters();
            await this._initMap();
        });
    }

    // ─────────────────────────────────────────────
    // SIDEBAR & TOOLBAR
    // ─────────────────────────────────────────────
    onToggleSidebar() {
        this.sidebarOpen = !this.sidebarOpen;
        const sidebar = this.sidebarRef.el;
        const icon    = this.collapseIcon.el;
        const text    = this.collapseText.el;

        if (this.sidebarOpen) {
            sidebar.classList.remove('collapsed');
            icon.classList.replace('fa-chevron-right', 'fa-chevron-left');
            if (text) text.textContent = 'Sembunyikan';
        } else {
            sidebar.classList.add('collapsed');
            icon.classList.replace('fa-chevron-left', 'fa-chevron-right');
            if (text) text.textContent = '';
        }

        // Paksa Leaflet re-render map setelah sidebar animasi selesai
        setTimeout(() => { if (this.map) this.map.invalidateSize(); }, 320);
    }

    onNavClick(ev) {
        const item = ev.currentTarget;
        const mode = item.dataset.mode;
        if (!mode || mode === this.currentMode) return;

        // Update active state
        this.sidebarRef.el.querySelectorAll('.petadigi-nav-item').forEach(el => {
            el.classList.remove('active');
        });
        item.classList.add('active');

        this.currentMode = mode;
        this._switchMode(mode);
    }

    onFilterChange() {
        // Re-render layer aktif saat filter berubah
        this._switchMode(this.currentMode);
    }

    _switchMode(mode) {
        this._clearAllLayers();
        if (this.backButton) { this.backButton.remove(); this.backButton = null; }
        this.currentLevel = 'kabupaten';

        const modeLabels = {
            umum:     { icon: 'fa-map',                 label: 'Peta Umum' },
            kriminal: { icon: 'fa-exclamation-triangle', label: 'Peta Kriminal' },
            lalin:    { icon: 'fa-car',                 label: 'Peta Lalu Lintas' },
            bencana:  { icon: 'fa-bolt',                label: 'Peta Bencana' },
            lokasi:   { icon: 'fa-map-marker',          label: 'Lokasi Penting' },
        };
        const meta = modeLabels[mode] || modeLabels['umum'];
        this._updateBreadcrumb(`<i class="fa ${meta.icon}"></i> ${meta.label}`);

        switch (mode) {
            case 'umum':     this._loadKabupatenLayer(); break;
            case 'kriminal': this._loadModeComingSoon('Peta Kriminal', '#e74c3c'); break;
            case 'lalin':    this._loadModeComingSoon('Peta Lalu Lintas', '#e67e22'); break;
            case 'bencana':  this._loadModeComingSoon('Peta Bencana', '#2980b9'); break;
            case 'lokasi':   this._loadModeComingSoon('Lokasi Penting', '#27ae60'); break;
        }
    }

    _updateBreadcrumb(html) {
        if (this.breadcrumbRef.el) {
            this.breadcrumbRef.el.innerHTML = `<span class="petadigi-breadcrumb-item active">${html}</span>`;
        }
    }

    _appendBreadcrumb(html) {
        if (this.breadcrumbRef.el) {
            this.breadcrumbRef.el.innerHTML += `
                <i class="fa fa-chevron-right petadigi-breadcrumb-sep"></i>
                <span class="petadigi-breadcrumb-item active">${html}</span>
            `;
        }
    }

    // ─────────────────────────────────────────────
    // PLACEHOLDER MODE BELUM TERSEDIA
    // ─────────────────────────────────────────────
    _loadModeComingSoon(label, color) {
        // Tetap tampilkan layer kabupaten sebagai background
        this._loadKabupatenLayerBackground(color);

        // Tampilkan pesan coming soon di atas peta
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
        this.comingSoonControl = new ComingSoonControl({ position: 'topright' });
        this.comingSoonControl.addTo(this.map);
    }

    async _loadKabupatenLayerBackground(borderColor) {
        // Layer kabupaten tanpa interaksi, hanya sebagai background
        if (this.comingSoonControl) {
            this.comingSoonControl.remove();
            this.comingSoonControl = null;
        }
        try {
            const records = await this.orm.searchRead(
                'petadigi.kabupaten', [], ['name', 'geometry']
            );
            const features = records.filter(r => r.geometry).map(r => {
                try {
                    return { type: "Feature", geometry: JSON.parse(r.geometry), properties: { name: r.name } };
                } catch (_) { return null; }
            }).filter(Boolean);

            const geoLayer = L.geoJSON({ type: "FeatureCollection", features }, {
                style: () => ({
                    color: borderColor || '#888888',
                    weight: 1.5,
                    opacity: 0.6,
                    fillColor: '#cccccc',
                    fillOpacity: 0.2,
                }),
                onEachFeature: (feature, layer) => {
                    layer.on('add', () => {
                        const center = layer.getBounds().getCenter();
                        const label = L.marker(center, {
                            icon: L.divIcon({ className: 'kabupaten-label', html: `<span>${feature.properties.name}</span>`, iconSize: null }),
                            interactive: false, zIndexOffset: 100,
                        });
                        this.kabupatenLabelGroup.addLayer(label);
                    });
                }
            });
            this.kabupatenLayerGroup.addLayer(geoLayer);
            this.map.fitBounds(geoLayer.getBounds());
        } catch (e) {
            console.error(e);
        }
    }

    // ─────────────────────────────────────────────
    // INIT MAP & FILTERS
    // ─────────────────────────────────────────────
    async _initFilters() {
        // Isi dropdown tahun
        const tahunEl = this.filterTahun.el;
        if (tahunEl) {
            const currentYear = new Date().getFullYear();
            for (let y = currentYear; y >= 2020; y--) {
                const opt = document.createElement('option');
                opt.value = y;
                opt.textContent = y;
                tahunEl.appendChild(opt);
            }
        }

        // Isi dropdown kabupaten
        const kabEl = this.filterKabupaten.el;
        if (kabEl) {
            try {
                const kabs = await this.orm.searchRead('petadigi.kabupaten', [], ['id', 'name']);
                kabs.forEach(k => {
                    const opt = document.createElement('option');
                    opt.value = k.id;
                    opt.textContent = k.name;
                    kabEl.appendChild(opt);
                });
            } catch (_) {}
        }
    }

    async _initMap() {
        const el = this.mapRef.el;
        if (!el) return;

        this.map = L.map(el).setView([-3.31987, 104.91459], 8);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(this.map);

        // Layer groups
        this.kabupatenLayerGroup = L.layerGroup().addTo(this.map);
        this.kabupatenLabelGroup = L.layerGroup().addTo(this.map);
        this.kecamatanLayerGroup = L.layerGroup().addTo(this.map);
        this.kecamatanLabelGroup = L.layerGroup().addTo(this.map);
        this.desaLayerGroup      = L.layerGroup().addTo(this.map);
        this.desaLabelGroup      = L.layerGroup().addTo(this.map);

        await this._loadKabupatenLayer();
    }

    _clearAllLayers() {
        if (this.kabupatenLayerGroup) this.kabupatenLayerGroup.clearLayers();
        if (this.kabupatenLabelGroup) this.kabupatenLabelGroup.clearLayers();
        if (this.kecamatanLayerGroup) this.kecamatanLayerGroup.clearLayers();
        if (this.kecamatanLabelGroup) this.kecamatanLabelGroup.clearLayers();
        if (this.desaLayerGroup)      this.desaLayerGroup.clearLayers();
        if (this.desaLabelGroup)      this.desaLabelGroup.clearLayers();
        if (this.comingSoonControl)   { this.comingSoonControl.remove(); this.comingSoonControl = null; }
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
            .setContent(popupContent);

        popup.once('add', () => {
            setTimeout(() => {
                const btn = document.getElementById(`btn-detail-kab-${props.id}`);
                if (btn) {
                    btn.addEventListener('click', () => {
                        this.map.closePopup();
                        this._updateBreadcrumb(`<i class="fa fa-map"></i> Peta Umum`);
                        this._appendBreadcrumb(`<i class="fa fa-map-marker"></i> ${tipeLabel} ${props.name}`);
                        this._drillDownKecamatan(props, layer);
                    });
                }
            }, 0);
        });

        popup.openOn(this.map);
    }

    // ─────────────────────────────────────────────
    // LEVEL 2 — KECAMATAN
    // ─────────────────────────────────────────────
    async _drillDownKecamatan(kabProps, kabLayer) {
        this.currentLevel = 'kecamatan';
        this.kabupatenLayerGroup.clearLayers();
        this.kabupatenLabelGroup.clearLayers();
        this.kecamatanLayerGroup.clearLayers();
        this.kecamatanLabelGroup.clearLayers();

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
                console.warn('Tidak ada kecamatan dengan geometry.');
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
            .setContent(popupContent);

        popup.once('add', () => {
            setTimeout(() => {
                const btn = document.getElementById(`btn-detail-kec-${props.id}`);
                if (btn) {
                    btn.addEventListener('click', () => {
                        this.map.closePopup();
                        this._appendBreadcrumb(`<i class="fa fa-map"></i> Kec. ${props.name}`);
                        this._drillDownDesa(props, layer, kabProps);
                    });
                }
            }, 0);
        });

        popup.openOn(this.map);
    }

    // ─────────────────────────────────────────────
    // LEVEL 3 — DESA
    // ─────────────────────────────────────────────
    async _drillDownDesa(kecProps, kecLayer, kabProps) {
        this.currentLevel = 'desa';
        this.kecamatanLayerGroup.clearLayers();
        this.kecamatanLabelGroup.clearLayers();
        this.desaLayerGroup.clearLayers();
        this.desaLabelGroup.clearLayers();

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
                            properties: { id: r.id, code: r.code, name: r.name, type: r.type }
                        };
                    } catch (e) {
                        console.warn(`Gagal parse geometry desa: ${r.name}`, e);
                        return null;
                    }
                })
                .filter(f => f !== null);

            if (features.length === 0) {
                console.warn('Tidak ada desa dengan geometry.');
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
        if (this.backButton) { this.backButton.remove(); this.backButton = null; }

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
                    this.map.closePopup();
                    if (targetLevel === 'kabupaten') {
                        this.kecamatanLayerGroup.clearLayers();
                        this.kecamatanLabelGroup.clearLayers();
                        this.desaLayerGroup.clearLayers();
                        this.desaLabelGroup.clearLayers();
                        this._updateBreadcrumb(`<i class="fa fa-map"></i> Peta Umum`);
                        await this._loadKabupatenLayer();
                    } else if (targetLevel === 'kecamatan' && ctx) {
                        this.desaLayerGroup.clearLayers();
                        this.desaLabelGroup.clearLayers();
                        // Trim breadcrumb kembali ke level kecamatan
                        const items = this.breadcrumbRef.el.querySelectorAll('.petadigi-breadcrumb-item');
                        if (items.length > 2) items[items.length - 1].previousSibling?.remove(), items[items.length - 1].remove();
                        await this._drillDownKecamatan(ctx.kabProps, ctx.kecLayer);
                    }
                    if (this.backButton) { this.backButton.remove(); this.backButton = null; }
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
