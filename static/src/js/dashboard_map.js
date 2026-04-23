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
            const records = await this.orm.searchRead(
                'petadigi.kabupaten',
                [],
                ['name', 'geometry'],
            );

            const features = records
                .filter(r => r.geometry)
                .map((r) => {
                    try {
                        return {
                            type: "Feature",
                            geometry: JSON.parse(r.geometry),
                            properties: { name: r.name }
                        };
                    } catch (e) {
                        console.warn(`Gagal parse geometry kabupaten: ${r.name}`, e);
                        return null;
                    }
                })
                .filter(f => f !== null);

            if (features.length === 0) return;

            const geojsonData = { type: "FeatureCollection", features };

            const geoLayer = L.geoJSON(geojsonData, {
                style: () => ({
                    color: "#3388ff",
                    weight: 2,
                    opacity: 0.7,
                    fillOpacity: 0.80,
                    fillColor: '#e5e1e1',
                }),
                onEachFeature: (feature, layer) => {
                    // Setelah layer ditambahkan ke map, taruh label di tengah area
                    layer.on('add', () => {
                        if (!feature.properties?.name) return;

                        // Ambil titik tengah dari bounds polygon
                        const center = layer.getBounds().getCenter();

                        // Buat label dengan divIcon
                        const label = L.marker(center, {
                            icon: L.divIcon({
                                className: 'kabupaten-label',
                                html: `<span>${feature.properties.name}</span>`,
                                iconSize: null,
                            }),
                            interactive: false, // label tidak bisa diklik
                            zIndexOffset: 100,
                        });

                        label.addTo(map);
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