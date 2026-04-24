/** @odoo-module **/

import { registry } from "@web/core/registry";
import { standardFieldProps } from "@web/views/fields/standard_field_props";
import { Component, useRef, useEffect, onWillUnmount } from "@odoo/owl";

export class GeoJsonMapWidget extends Component {
    static template = "petadigi.GeoJsonMapWidget";
    static props = { ...standardFieldProps };

    setup() {
        this.mapContainer = useRef("mapContainer");
        this.map = null;
        this.polygonLayer = null;

        useEffect(
            () => this.renderOrUpdateMap(),
            () => [this.props.record.data[this.props.name], this.props.readonly]
        );

        onWillUnmount(() => {
            if (this.map) {
                this.map.remove();
                this.map = null;
            }
        });
    }

    renderOrUpdateMap() {
        const geojsonStr = this.props.record.data[this.props.name];

        // Init map dengan editable: true agar Leaflet.Editable aktif
        if (!this.map && this.mapContainer.el) {
            this.map = L.map(this.mapContainer.el, {
                editable: true,  // wajib untuk enableEdit()
            }).setView([-2.5, 117.5], 5);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            }).addTo(this.map);
        }

        // Hapus layer lama
        if (this.polygonLayer) {
            this.map.removeLayer(this.polygonLayer);
            this.polygonLayer = null;
        }

        if (!geojsonStr) return;

        let geojson = null;
        try {
            geojson = JSON.parse(geojsonStr);
        } catch (_) {
            console.warn("GeoJSON tidak valid:", this.props.name);
            return;
        }

        // Render semua polygon/multipolygon via L.geoJSON
        this.polygonLayer = L.geoJSON(geojson, {
            style: {
                color: '#3388ff',
                weight: 2,
                opacity: 1,
                fillColor: '#3388ff',
                fillOpacity: 0.35,
            }
        }).addTo(this.map);

        // Auto fit bounds
        const bounds = this.polygonLayer.getBounds();
        if (bounds.isValid()) {
            this.map.fitBounds(bounds);
        }

        // EDIT MODE
        if (!this.props.readonly) {
            this.polygonLayer.eachLayer((layer) => {
                // Cek dulu apakah enableEdit tersedia (Leaflet.Editable loaded)
                if (typeof layer.enableEdit === 'function') {
                    layer.enableEdit();

                    layer.on('editable:dragend editable:vertex:dragend editable:vertex:deleted editable:vertex:new', () => {
                        const allCoords = [];
                        this.polygonLayer.eachLayer((l) => {
                            const latlngs = l.getLatLngs();
                            const rings = Array.isArray(latlngs[0]) ? latlngs : [latlngs];
                            rings.forEach((ring) => {
                                const flat = ring.flat ? ring.flat() : ring;
                                allCoords.push(flat.map(pt => [pt.lng, pt.lat]));
                            });
                        });

                        const newGeoJson = allCoords.length === 1
                            ? { type: "Polygon", coordinates: allCoords }
                            : { type: "MultiPolygon", coordinates: allCoords.map(c => [c]) };

                        this.props.record.update({
                            [this.props.name]: JSON.stringify(newGeoJson)
                        });
                    });
                } else {
                    // Leaflet.Editable tidak tersedia, tampilkan warning sekali
                    console.warn("Leaflet.Editable tidak tersedia. Edit polygon dinonaktifkan.");
                }
            });
        }
    }
}

registry.category("fields").add("geojson_map", {
    component: GeoJsonMapWidget,
    displayName: "GeoJSON Map",
    supportedTypes: ["text"],
});