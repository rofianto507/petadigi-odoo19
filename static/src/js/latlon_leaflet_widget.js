/** @odoo-module **/

import { registry } from "@web/core/registry";
import { standardFieldProps } from "@web/views/fields/standard_field_props";
import { Component, onWillUnmount, useRef, useEffect } from "@odoo/owl";

export class LatLongMapPicker extends Component {
    static template = "petadigi.LatLongMapPicker";
    static props = { ...standardFieldProps };

    setup() {
        this.mapContainer = useRef("mapDiv");
        this.map = null;
        this.marker = null;

        // Fix icon Leaflet agar tidak broken saat di-bundle Odoo
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconUrl: '/petadigi/static/lib/leaflet/images/marker-icon.png',
            shadowUrl: '/petadigi/static/lib/leaflet/images/marker-shadow.png',
            iconRetinaUrl: '/petadigi/static/lib/leaflet/images/marker-icon.png',
        });

        useEffect(
            () => this.renderOrUpdateMap(),
            () => [
                this.props.record.data.latitude,
                this.props.record.data.longitude,
                this.props.readonly,
            ]
        );

        onWillUnmount(() => {
            if (this.map) {
                this.map.remove();
                this.map = null;
            }
        });
    }

    renderOrUpdateMap() {
        if (!this.mapContainer.el || !window.L) return;

        const hasCoords = this.props.record.data.latitude && this.props.record.data.longitude;
        const lat = hasCoords ? this.props.record.data.latitude : -2.2;
        const lng = hasCoords ? this.props.record.data.longitude : 104.5;
        const zoom = hasCoords ? 13 : 6;

        if (!this.map) {
            // Inisialisasi pertama kali
            this.map = L.map(this.mapContainer.el).setView([lat, lng], zoom);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap',
            }).addTo(this.map);

            this.marker = L.marker([lat, lng], { draggable: !this.props.readonly }).addTo(this.map);

            if (!this.props.readonly) {
                this.marker.on('dragend', () => {
                    this.updateCoordinates(this.marker.getLatLng());
                });
                this.map.on('click', (ev) => {
                    this.marker.setLatLng(ev.latlng);
                    this.updateCoordinates(ev.latlng);
                });
            }

            setTimeout(() => this.map && this.map.invalidateSize(), 150);
        } else {
            // Update posisi tanpa rebuild map
            this.map.setView([lat, lng], zoom);
            this.marker.setLatLng([lat, lng]);
            this.marker.dragging[this.props.readonly ? 'disable' : 'enable']();
        }
    }

    updateCoordinates(pos) {
        this.props.record.update({
            latitude: pos.lat,
            longitude: pos.lng,
        });
    }
}

registry.category("fields").add("latlong_map_picker", {
    component: LatLongMapPicker,
    displayName: "Map Picker",
    supportedTypes: ["float"],
});
