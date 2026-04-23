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

        const map = L.map(el).setView([-3.31987, 104.91459], 8);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        try {
            // Ambil data lengkap kabupaten termasuk kecamatan_ids
            const records = await this.orm.searchRead(
                'petadigi.kabupaten',
                [],
                ['code', 'name', 'type', 'kecamatan_ids', 'geometry'],
            );

            const features = records
                .filter(r => r.geometry)
                .map((r) => {
                    try {
                        return {
                            type: "Feature",
                            geometry: JSON.parse(r.geometry),
                            properties: {
                                code: r.code,
                                name: r.name,
                                type: r.type,
                                jumlah_kecamatan: r.kecamatan_ids ? r.kecamatan_ids.length : 0,
                            }
                        };
                    } catch (e) {
                        console.warn(`Gagal parse geometry: ${r.name}`, e);
                        return null;
                    }
                })
                .filter(f => f !== null);

            if (features.length === 0) return;

            const geojsonData = { type: "FeatureCollection", features };

            const geoLayer = L.geoJSON(geojsonData, {
                style: () => ({
                    color: '#888888',
                    weight: 1.5,
                    opacity: 1,
                    fillColor: '#aaaaaa',
                    fillOpacity: 0.35,
                }),
                onEachFeature: (feature, layer) => {
                    const props = feature.properties;

                    // Label nama permanen di tengah area
                    layer.on('add', () => {
                        const center = layer.getBounds().getCenter();
                        L.marker(center, {
                            icon: L.divIcon({
                                className: 'kabupaten-label',
                                html: `<span>${props.name}</span>`,
                                iconSize: null,
                            }),
                            interactive: false,
                            zIndexOffset: 100,
                        }).addTo(map);
                    });

                    // Hover effect
                    layer.on('mouseover', () => {
                        layer.setStyle({ fillOpacity: 0.55, fillColor: '#666666' });
                    });
                    layer.on('mouseout', () => {
                        layer.setStyle({ fillOpacity: 0.35, fillColor: '#aaaaaa' });
                    });

                    // Klik → tampilkan popup informasi
                    layer.on('click', (e) => {
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
                            </div>
                        `;
                        L.popup({ maxWidth: 250, className: 'petadigi-leaflet-popup' })
                            .setLatLng(e.latlng)
                            .setContent(popupContent)
                            .openOn(map);
                    });
                }
            }).addTo(map);

            map.fitBounds(geoLayer.getBounds());

        } catch (error) {
            console.error("Gagal memuat data GeoJSON kabupaten:", error);
        }
    }
}

registry.category("actions").add("petadigi_dashboard_map", DashboardMap);