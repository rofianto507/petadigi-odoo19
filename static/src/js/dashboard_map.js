/** @odoo-module **/

import { Component, onMounted, useRef } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

import { initFilters } from "./dashboard_helpers";
import { loadKabupatenLayer } from "./dashboard_layer_umum";
import { loadModeKriminal, removeKriminalLegend } from "./dashboard_layer_kriminal";
import { loadModeLayLin } from "./dashboard_layer_lalin";
import { loadModeBencana } from "./dashboard_layer_bencana";
import { loadModeLokasi } from "./dashboard_layer_lokasi";

export class DashboardMap extends Component {
    static template = "petadigi.DashboardMap";

    setup() {
        this.mapRef          = useRef("mapContainer");
        this.sidebarRef      = useRef("sidebar");
        this.breadcrumbRef   = useRef("breadcrumb");
        this.collapseIcon    = useRef("collapseIcon");
        this.collapseText    = useRef("collapseText");
        this.filterTahun     = useRef("filterTahun");
        this.filterKabupaten = useRef("filterKabupaten");

        this.orm = useService("orm");

        this.sidebarOpen  = true;
        this.currentMode  = 'umum';
        this.currentLevel = 'kabupaten';
        this.backButton   = null;
        this.comingSoonControl = null;

        onMounted(async () => {
            await initFilters(this);
            await this._initMap();
        });
    }

    // ─────────────────────────────────────────────
    // SIDEBAR TOGGLE
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
        setTimeout(() => { if (this.map) this.map.invalidateSize(); }, 320);
    }

    // ─────────────────────────────────────────────
    // NAV & FILTER
    // ─────────────────────────────────────────────
    onNavClick(ev) {
        const item = ev.currentTarget;
        const mode = item.dataset.mode;
        if (!mode || mode === this.currentMode) return;

        this.sidebarRef.el.querySelectorAll('.petadigi-nav-item').forEach(el => {
            el.classList.remove('active');
        });
        item.classList.add('active');

        this.currentMode = mode;
        this._switchMode(mode);
    }

    onFilterChange() {
        this._switchMode(this.currentMode);
    }

    // ─────────────────────────────────────────────
    // MODE ROUTER
    // ─────────────────────────────────────────────
    _switchMode(mode) {
        this._clearAllLayers();
        if (this.backButton) { this.backButton.remove(); this.backButton = null; }
        this.currentLevel = 'kabupaten';

        const modeLabels = {
            umum:     { icon: 'fa-map',                  label: 'Peta Umum' },
            kriminal: { icon: 'fa-exclamation-triangle', label: 'Peta Kriminal' },
            lalin:    { icon: 'fa-car',                  label: 'Peta Lalu Lintas' },
            bencana:  { icon: 'fa-bolt',                 label: 'Peta Bencana' },
            lokasi:   { icon: 'fa-map-marker',           label: 'Lokasi Penting' },
        };
        const meta = modeLabels[mode] || modeLabels['umum'];
        this._updateBreadcrumb(`<i class="fa ${meta.icon}"></i> ${meta.label}`);

        switch (mode) {
            case 'umum':     loadKabupatenLayer(this); break;
            case 'kriminal': loadModeKriminal(this); break;
            case 'lalin':    loadModeLayLin(this); break;
            case 'bencana':  loadModeBencana(this); break;
            case 'lokasi':   loadModeLokasi(this); break;
        }
    }

    // ─────────────────────────────────────────────
    // BREADCRUMB
    // ─────────────────────────────────────────────
    _updateBreadcrumb(html) {
        if (this.breadcrumbRef.el) {
            this.breadcrumbRef.el.innerHTML =
                `<span class="petadigi-breadcrumb-item active">${html}</span>`;
        }
    }

    _appendBreadcrumb(html) {
        if (this.breadcrumbRef.el) {
            this.breadcrumbRef.el.innerHTML +=
                `<i class="fa fa-chevron-right petadigi-breadcrumb-sep"></i>
                 <span class="petadigi-breadcrumb-item active">${html}</span>`;
        }
    }

    // ─────────────────────────────────────────────
    // MAP INIT & LAYER GROUPS
    // ─────────────────────────────────────────────
    async _initMap() {
        const el = this.mapRef.el;
        if (!el) return;

        this.map = L.map(el).setView([-3.31987, 104.91459], 8);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(this.map);

        // Layer groups — tersedia untuk semua mode
        this.kabupatenLayerGroup = L.layerGroup().addTo(this.map);
        this.kabupatenLabelGroup = L.layerGroup().addTo(this.map);
        this.kecamatanLayerGroup = L.layerGroup().addTo(this.map);
        this.kecamatanLabelGroup = L.layerGroup().addTo(this.map);
        this.desaLayerGroup      = L.layerGroup().addTo(this.map);
        this.desaLabelGroup      = L.layerGroup().addTo(this.map);
        this.markerLayerGroup    = L.layerGroup().addTo(this.map); // untuk pin/marker mode lain

        await loadKabupatenLayer(this);
    }

    _clearAllLayers() {
        if (this.kabupatenLayerGroup) this.kabupatenLayerGroup.clearLayers();
        if (this.kabupatenLabelGroup) this.kabupatenLabelGroup.clearLayers();
        if (this.kecamatanLayerGroup) this.kecamatanLayerGroup.clearLayers();
        if (this.kecamatanLabelGroup) this.kecamatanLabelGroup.clearLayers();
        if (this.desaLayerGroup)      this.desaLayerGroup.clearLayers();
        if (this.desaLabelGroup)      this.desaLabelGroup.clearLayers();
        if (this.markerLayerGroup)    this.markerLayerGroup.clearLayers();
        if (this.comingSoonControl)   { this.comingSoonControl.remove(); this.comingSoonControl = null; }
        removeKriminalLegend(this);
    }
}

registry.category("actions").add("petadigi_dashboard_map", DashboardMap);
