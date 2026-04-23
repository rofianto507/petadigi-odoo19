/** @odoo-module **/

import { Component, onMounted, useRef } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

 

class DashboardMap extends Component {
    static template = "petadigi.DashboardMap";

    setup() {
        this.mapRef = useRef("mapContainer");
        this.orm = useService("orm");  // Gunakan orm, bukan rpc

        onMounted(async () => {
            await this._initMap();
        });
    }

    async _initMap() {
        const el = this.mapRef.el;
        if (!el) return;

        // Init Leaflet map
        const map = L.map(el).setView([-3.31987, 104.91459], 8);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        // Fetch data kabupaten langsung via ORM
        try {
            const records = await this.orm.searchRead(
                'petadigi.kabupaten',  // nama model
                [],                    // domain (kosong = semua)
                ['name', 'geometry'],  // fields yang diambil
            );

            const features = records
                .filter(r => r.geometry)
                .map(r => {
                    try {
                        return {
                            type: "Feature",
                            geometry: JSON.parse(r.geometry),
                            properties: { name: r.name }
                        };
                    } catch (e) {
                        return null;
                    }
                })
                .filter(f => f !== null);

            const geojsonData = { type: "FeatureCollection", features };

            let colorIndex = 0;
            L.geoJSON(geojsonData, {
                style: () => {
                    
                    return {
                        color: "#3388ff",
                        weight: 2,
                        opacity: 0.7,
                        fillOpacity: 0.80,
                        fillColor: '#e5e1e1'
                    };
                },
                onEachFeature: (feature, layer) => {
                    if (feature.properties?.name) {
                        layer.bindTooltip(feature.properties.name, {
                            permanent: false,
                            direction: 'center',
                            className: 'kabupaten-tooltip'
                        });
                        layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.65 }));
                        layer.on('mouseout', () => layer.setStyle({ fillOpacity: 0.35 }));
                    }
                }
            }).addTo(map);

        } catch (error) {
            console.error("Gagal memuat data GeoJSON kabupaten:", error);
        }
    }
}

registry.category("actions").add("petadigi_dashboard_map", DashboardMap);