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
        let doFitBounds = false;
        const geojsonStr = this.props.record.data[this.props.name];
        if (!this.map && this.mapContainer.el) {
            this.map = L.map(this.mapContainer.el, { editable: true }).setView([-2.5, 117.5], 5);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap'
            }).addTo(this.map);
            doFitBounds = true;
        }

        // Remove previous polygon if any
        if (this.polygonLayer) {
            this.map.removeLayer(this.polygonLayer);
        }
        if (!geojsonStr) return;
        let geojson = null;
        try {
            geojson = JSON.parse(geojsonStr);
        } catch (_) { return; }

        // Handle only Polygon/MultiPolygon
        let geomType = geojson.type || (geojson.geometry && geojson.geometry.type);
        let coordinates = geojson.coordinates || (geojson.geometry && geojson.geometry.coordinates);

        // Converts GeoJSON coordinates to LatLng arrays
        function coordsToLatLngArr(coords) {
            return coords.map(function (pt) { return [pt[1], pt[0]]; });
        }

        if (geomType === "Polygon" && Array.isArray(coordinates)) {
            this.polygonLayer = L.polygon(coordsToLatLngArr(coordinates[0]), {
                color: "#3388ff", fillOpacity: 0.4
            }).addTo(this.map);
        } else if (geomType === "MultiPolygon" && Array.isArray(coordinates)) {
            // Only use first polygon for simplicity; adapt if needed
            this.polygonLayer = L.polygon(coordsToLatLngArr(coordinates[0][0]), {
                color: "#3388ff", fillOpacity: 0.4
            }).addTo(this.map);
        }

        
        if (this.polygonLayer && this.polygonLayer.getBounds && this.polygonLayer.getBounds().isValid() && doFitBounds) {
            this.map.fitBounds(this.polygonLayer.getBounds());
        }

        // EDIT MODE
        if (!this.props.readonly && this.polygonLayer) {
            this.polygonLayer.enableEdit();

            this.polygonLayer.on('editable:dragend editable:vertex:dragend editable:vertex:deleted editable:vertex:new', () => {
                // On any edit, save back geometry to model
                const latlngs = this.polygonLayer.getLatLngs()[0]; // only outer ring
                // Convert back to geojson structure: [ [lon, lat], ... ]
                const coords = latlngs.map(pt => [pt.lng, pt.lat]);
                const newGeoJson = {
                    type: "Polygon",
                    coordinates: [coords]
                };
                this.props.record.update({ [this.props.name]: JSON.stringify(newGeoJson) });
            });
        }
    }
}

registry.category("fields").add("geojson_map", {
    component: GeoJsonMapWidget,
    displayName: "GeoJSON Map",
    supportedTypes: ["text"],
});