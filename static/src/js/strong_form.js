/* PetaDigi Mobile — Strong Point App */
(function () {
    'use strict';

    // ── JSON-RPC helper ──────────────────────────────────────────────────────
    async function rpc(url, params) {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'call', id: 1, params: params || {} }),
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error.data?.message || json.error.message);
        return json.result;
    }

    // ── Toast ────────────────────────────────────────────────────────────────
    function showToast(msg, type) {
        var t = document.getElementById('sp-toast');
        if (!t) return;
        t.innerHTML = '<i class="fa fa-' + (type === 'success' ? 'check' : type === 'error' ? 'times' : 'info-circle') + '"></i> ' + msg;
        t.className = 'sp-toast sp-toast--' + (type || 'info') + ' sp-toast--show';
        clearTimeout(t._timer);
        t._timer = setTimeout(function () { t.classList.remove('sp-toast--show'); }, 3500);
    }

    // ── Confirm Dialog ───────────────────────────────────────────────────────
    function _confirmDialog(msg, onConfirm) {
        var existing = document.getElementById('sp-confirm-overlay');
        if (existing) existing.remove();
        var overlay = document.createElement('div');
        overlay.id = 'sp-confirm-overlay';
        overlay.className = 'sp-confirm-overlay';
        overlay.innerHTML = ''
            + '<div class="sp-confirm-box">'
            +   '<div class="sp-confirm-icon"><i class="fa fa-exclamation-triangle"></i></div>'
            +   '<div class="sp-confirm-msg">' + msg + '</div>'
            +   '<div class="sp-confirm-actions">'
            +     '<button class="sp-btn-secondary sp-confirm-cancel">Batal</button>'
            +     '<button class="sp-btn-hapus sp-confirm-ok"><i class="fa fa-trash"></i> Hapus</button>'
            +   '</div>'
            + '</div>';
        document.body.appendChild(overlay);
        overlay.querySelector('.sp-confirm-cancel').addEventListener('click', function () { overlay.remove(); });
        overlay.querySelector('.sp-confirm-ok').addEventListener('click', function () { overlay.remove(); onConfirm(); });
        overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
    }

    // ── Tab switching ────────────────────────────────────────────────────────
    // ── App bar visibility ───────────────────────────────────────────────────
    function _hideAppbar() {
        var app = document.getElementById('sp-app');
        if (app) app.classList.add('sp-subpage');
    }
    function _showAppbar() {
        var app = document.getElementById('sp-app');
        if (app) app.classList.remove('sp-subpage');
    }

    function switchTab(tabId) {
        _showAppbar(); // always restore appbar on tab switch
        document.querySelectorAll('.sp-tab').forEach(function (el) {
            el.classList.toggle('active', el.id === 'tab-' + tabId);
        });
        document.querySelectorAll('.sp-nav-item').forEach(function (el) {
            el.classList.toggle('active', el.dataset.tab === tabId);
        });
        if (tabId === 'home')    { _renderHomeOnce(); _loadHomeData(); }
        if (tabId === 'strong')  _renderStrongOnce();
        if (tabId === 'patroli') _renderPatroliOnce();
        if (tabId === 'profil')  _renderProfilOnce();
    }

    // ── Escape HTML ──────────────────────────────────────────────────────────
    function _esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // ── Initials avatar ──────────────────────────────────────────────────────
    function getInitials(name) {
        if (!name) return '?';
        return name.trim().split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase();
    }

    // ── Number formatter (thousand separator) ───────────────────────────────
    function _fmtNum(n) {
        return String(n || 0).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    }

    // ── Navigate to Strong tab with filter ──────────────────────────────────
    function _navigateToStrongWithFilter(filter) {
        var alreadyRendered = _sp.rendered;
        _sp.listFilter = filter;
        switchTab('strong');
        if (alreadyRendered) _showRecordList();
    }

    // ── Navigate to Patroli tab with filter ──────────────────────────────────
    function _navigateToPatroliWithFilter(filter) {
        var alreadyRendered = _pt.rendered;
        _pt.listFilter = filter;
        switchTab('patroli');
        if (alreadyRendered) _showPatroliList();
    }

    // ── Navigate to detail directly from home ────────────────────────────────
    function _navigateToSpDetail(id) {
        switchTab('strong');
        setTimeout(function () { _openDetail(id); }, 0);
    }
    function _navigateToPtDetail(id) {
        switchTab('patroli');
        setTimeout(function () { _openPatroliDetail(id); }, 0);
    }

    // ── Recent Activities ─────────────────────────────────────────────────────
    function _renderRecentActivities(items) {
        var el = document.getElementById('home-recent'); if (!el) return;
        if (!items.length) { el.innerHTML = '<div class="sp-recent-empty">Belum ada aktivitas</div>'; return; }
        var html = '';
        items.forEach(function (a) {
            var isPt    = a.type === 'patroli';
            var isProses = a.state === 'PROSES';
            html += '<button class="sp-recent-item" data-type="' + a.type + '" data-id="' + a.id + '">'
                + '<div class="sp-recent-icon ' + (isPt ? 'sp-recent-icon--pt' : 'sp-recent-icon--sp') + '">'
                +   '<i class="fa ' + (isPt ? 'fa-car' : 'fa-map-pin') + '"></i>'
                + '</div>'
                + '<div class="sp-recent-body">'
                +   '<div class="sp-recent-head">'
                +     '<span class="sp-recent-code">' + _esc(a.code) + '</span>'
                +     '<span class="sp-badge ' + (isProses ? 'sp-badge--proses-lw' : 'sp-badge--selesai-lw') + '">' + (isProses ? 'PROSES' : 'SELESAI') + '</span>'
                +   '</div>'
                +   '<div class="sp-recent-meta">'
                +     (a.lokasi ? '<span><i class="fa fa-map-marker"></i> ' + _esc(a.lokasi) + '</span>' : '')
                +     (a.tanggal ? '<span><i class="fa fa-clock-o"></i> ' + _fmtDtDisplay(a.tanggal) + '</span>' : '')
                +   '</div>'
                + '</div>'
                + '<i class="fa fa-chevron-right sp-recent-arrow"></i>'
                + '</button>';
        });
        el.innerHTML = html;
        el.querySelectorAll('.sp-recent-item').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var id = parseInt(this.dataset.id);
                if (this.dataset.type === 'patroli') { _navigateToPtDetail(id); }
                else { _navigateToSpDetail(id); }
            });
        });
    }

    // ── KPI Card Patroli (second metric = Titik Lokasi) ──────────────────────
    function kpiCardPt(count, titik, title, icon, color, filter) {
        return '<div class="sp-kpi2-card" data-filter="' + (filter || '') + '" style="--kpi2-color:' + color + '">'
            + '<div class="sp-kpi2-header">'
            +   '<i class="fa ' + icon + '"></i>' + title
            +   '<i class="fa fa-chevron-right sp-kpi2-arrow"></i>'
            + '</div>'
            + '<div class="sp-kpi2-val">' + _fmtNum(count) + '</div>'
            + '<div class="sp-kpi2-lbl"><i class="fa fa-map-marker"></i> ' + _fmtNum(titik) + ' Titik Lokasi</div>'
            + '</div>';
    }

    // ── KPI Card HTML (side-by-side, vertical layout) ────────────────────────
    function kpiCard2(spCount, personelCount, title, icon, color, filter) {
        return '<div class="sp-kpi2-card" data-filter="' + (filter || '') + '" style="--kpi2-color:' + color + '">'
            + '<div class="sp-kpi2-header">'
            +   '<i class="fa ' + icon + '"></i>' + title
            +   '<i class="fa fa-chevron-right sp-kpi2-arrow"></i>'
            + '</div>'
            + '<div class="sp-kpi2-val">' + _fmtNum(spCount) + '</div>'
            + '<div class="sp-kpi2-lbl"><i class="fa fa-users"></i> ' + _fmtNum(personelCount) + ' Personel</div>'
            + '</div>';
    }

    function kpiSkeleton2() {
        return '<div class="sp-kpi2-card sp-kpi2-skeleton">'
            + '<div class="sp-kpi2-header sp-kpi2-skel-line" style="width:75%;height:12px;"></div>'
            + '<div class="sp-kpi2-val sp-kpi2-skel-line" style="width:55px;margin-top:12px;"></div>'
            + '<div class="sp-kpi2-lbl sp-kpi2-skel-line" style="width:80px;margin-top:8px;height:12px;"></div>'
            + '</div>';
    }

    // ── Render Home Tab ──────────────────────────────────────────────────────
    var _homeRendered = false;
    function _renderHomeOnce() {
        if (_homeRendered) return;
        _homeRendered = true;

        var ctx = window._SP_CTX || {};
        var homeEl = document.getElementById('home-content');
        if (!homeEl) return;

        var hour = new Date().getHours();
        var greet = hour < 11 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam';
        var greetIcon = hour < 11 ? 'fa-sun-o' : hour < 18 ? 'fa-sun-o' : 'fa-moon-o';

        var initials  = getInitials(ctx.user_name || '?');
        var avatarHtml = '<div class="sp-greeting-avatar">'
            + '<span class="sp-greeting-av-initials">' + initials + '</span>'
            + (ctx.user_id
                ? '<img class="sp-greeting-av-img" src="/web/image/res.users/' + ctx.user_id + '/image_128" alt="">'
                : '')
            + '</div>';

        homeEl.innerHTML = ''
            + '<div class="sp-greeting">'
            +   '<i class="fa ' + greetIcon + ' sp-greeting-icon"></i>'
            +   '<div class="sp-greeting-text-wrap">'
            +     '<div class="sp-greeting-text">' + greet + '!</div>'
            +     '<div class="sp-greeting-name">' + _esc(ctx.user_name || '') + '</div>'
            +   '</div>'
            +   avatarHtml
            + '</div>'
            + '<div class="sp-kpi-section">'
            +   '<div class="sp-kpi-section-title"><i class="fa fa-map-pin"></i> Strong Point</div>'
            +   '<div class="sp-kpi2-grid" id="kpi-sp">'
            +     kpiSkeleton2() + kpiSkeleton2()
            +   '</div>'
            +   '<div class="sp-chart-card">'
            +     '<div class="sp-chart-header">'
            +       '<i class="fa fa-bar-chart"></i>Aktivitas 7 Hari Terakhir'
            +       '<i class="fa fa-chevron-right sp-kpi2-arrow"></i>'
            +     '</div>'
            +     '<div id="sp-weekly-chart" class="sp-chart-canvas"></div>'
            +   '</div>'
            + '</div>'
            + '<div class="sp-kpi-section">'
            +   '<div class="sp-kpi-section-title"><i class="fa fa-car"></i> Patroli</div>'
            +   '<div class="sp-kpi2-grid" id="kpi-pt">'
            +     kpiSkeleton2() + kpiSkeleton2()
            +   '</div>'
            + '</div>'
            + '<div class="sp-kpi-section">'
            +   '<div class="sp-kpi-section-title"><i class="fa fa-history"></i> Aktivitas Terakhir</div>'
            +   '<div id="home-recent">'
            +     '<div class="sp-recent-skeleton"></div><div class="sp-recent-skeleton"></div><div class="sp-recent-skeleton"></div>'
            +   '</div>'
            + '</div>';

    }

    function _loadHomeData() {
        // ── KPI (SP + Patroli + Recent) — satu request ───────────────────────
        rpc('/petadigi/api/kpi', {}).then(function (data) {
            var sp = data.strong_point || {};
            var pt = data.patroli || {};

            var elSp = document.getElementById('kpi-sp');
            if (elSp) {
                elSp.innerHTML =
                    kpiCard2(sp.today || 0, sp.personel_today || 0, 'SP Hari Ini',    'fa-calendar-o', '#71639e', 'today')
                  + kpiCard2(sp.total || 0, sp.personel || 0,       'SP Keseluruhan', 'fa-map-pin',    '#2980b9', 'all');
                elSp.querySelectorAll('.sp-kpi2-card').forEach(function (card) {
                    card.addEventListener('click', function () { _navigateToStrongWithFilter(card.dataset.filter); });
                });
            }

            var elPt = document.getElementById('kpi-pt');
            if (elPt) {
                elPt.innerHTML =
                    kpiCardPt(pt.today || 0, pt.titik_today || 0, 'Patroli Hari Ini', 'fa-calendar-o', '#71639e', 'today')
                  + kpiCardPt(pt.total || 0, pt.titik_total || 0, 'Total Patroli',    'fa-car',        '#5a4f7f', 'all');
                elPt.querySelectorAll('.sp-kpi2-card').forEach(function (card) {
                    card.addEventListener('click', function () { _navigateToPatroliWithFilter(card.dataset.filter); });
                });
            }

            _renderRecentActivities(data.recent || []);
        }).catch(function () {
            var elSp = document.getElementById('kpi-sp');
            var elPt = document.getElementById('kpi-pt');
            var errHtml = '<div style="text-align:center;color:#b3261e;font-size:13px;padding:12px;"><i class="fa fa-exclamation-triangle"></i> Gagal memuat data</div>';
            if (elSp) elSp.innerHTML = errHtml;
            if (elPt) elPt.innerHTML = errHtml;
            var rel = document.getElementById('home-recent'); if (rel) rel.innerHTML = '';
        });

        // ── Weekly bar chart ─────────────────────────────────────────────────
        rpc('/petadigi/api/weekly', {}).then(function (data) {
            var days = (data && data.days) || [];
            var el   = document.getElementById('sp-weekly-chart');
            if (!el || typeof echarts === 'undefined' || !days.length) return;

            var labels = days.map(function (d) { return d.label; });
            var counts = days.map(function (d) { return d.count; });

            // @ts-ignore — echarts loaded as global from script tag
            var chart = echarts.getInstanceByDom(el) || echarts.init(el, null, { renderer: 'canvas' });
            chart.setOption({
                grid: { left: 6, right: 6, top: 14, bottom: 0, containLabel: true },
                xAxis: {
                    type: 'category', data: labels,
                    axisLabel: { fontSize: 11, color: '#9e97b8' },
                    axisTick: { show: false }, axisLine: { show: false },
                },
                yAxis: {
                    type: 'value', minInterval: 1,
                    max: function (v) { return Math.ceil(v.max * 1.25) || 5; },
                    splitLine: { lineStyle: { color: '#f0eef8', type: 'dashed' } },
                    axisLabel: { fontSize: 10, color: '#b3acc8' },
                },
                series: [{
                    type: 'bar',
                    data: counts.map(function (v, i) {
                        return { value: v, itemStyle: { color: i === 6 ? '#71639e' : '#c4bedd', borderRadius: [4, 4, 0, 0] } };
                    }),
                    barMaxWidth: 36,
                    label: { show: true, position: 'top', fontSize: 10, color: '#71639e', formatter: function (p) { return p.value > 0 ? p.value : ''; } },
                }],
                tooltip: {
                    trigger: 'axis', backgroundColor: '#3d3461', borderWidth: 0,
                    textStyle: { color: '#fff', fontSize: 12 },
                    formatter: function (p) { return '<b>' + p[0].name + '</b>: ' + p[0].value + ' SP'; },
                },
            });
        }).catch(function () {});
    }

    // ════════════════════════════════════════════════════════════════════════
    //  STRONG POINT TAB  —  list → form flow
    // ════════════════════════════════════════════════════════════════════════

    var _sp = {
        rendered:   false,
        userPos:    null,   // {lat, lng, accuracy} — cached after first GPS request
        lokasiList: [],     // full list from API (with _dist attached)
        selected:   null,   // lokasi object terpilih saat di form view
        map:        null,   // Leaflet map instance
        marker:     null,   // Leaflet draggable marker
        listOffset:   0,    // pagination: records already loaded
        listPerPage:  20,   // pagination: items per page
        listLoading:  false,
        listDone:     false,
        listObserver: null, // IntersectionObserver for infinite scroll
        listFilter:   null, // 'today' | 'all' | null
        filterOpen:     false,
        filterKabupaten: null,
        filterState:    null,
        personelLocal: [],  // personel dikumpulkan sebelum submit, batch-save setelah create
    };

    // ── Distance helpers ─────────────────────────────────────────────────────
    function _haversineKm(lat1, lng1, lat2, lng2) {
        var R = 6371;
        var dLat = (lat2 - lat1) * Math.PI / 180;
        var dLng = (lng2 - lng1) * Math.PI / 180;
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
              + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
              * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function _fmtDist(km) {
        if (km < 1) return Math.round(km * 1000) + ' m';
        return km.toFixed(1) + ' km';
    }

    function _distCls(km) {
        if (km < 1) return 'sp-dist--near';
        if (km < 5) return 'sp-dist--mid';
        return 'sp-dist--far';
    }

    // ── GPS promise (max 12 s, resolves null on failure) ─────────────────────
    function _requestGPS() {
        return new Promise(function (resolve) {
            if (!navigator.geolocation) { resolve(null); return; }
            navigator.geolocation.getCurrentPosition(
                function (pos) {
                    resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
                },
                function () { resolve(null); },
                { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
            );
        });
    }

    // ── Main entry ───────────────────────────────────────────────────────────
    function _renderStrongOnce() {
        if (_sp.rendered) return;
        _sp.rendered = true;

        var el = document.getElementById('strong-content');
        if (!el) return;

        el.innerHTML = '<div id="sp-records-view"></div>'
            + '<div id="sp-list-view"   style="display:none"></div>'
            + '<div id="sp-form-view"   style="display:none"></div>'
            + '<div id="sp-detail-view" style="display:none"></div>';

        // FAB — append to tab element so it hides with the tab
        var tabEl = document.getElementById('tab-strong');
        if (tabEl && !document.getElementById('sp-fab-add')) {
            var fab = document.createElement('button');
            fab.className = 'sp-fab';
            fab.id        = 'sp-fab-add';
            fab.title     = 'Tambah Strong Point';
            fab.innerHTML = '<i class="fa fa-plus"></i>';
            fab.addEventListener('click', _openLokasiPicker);
            tabEl.appendChild(fab);
        }

        _showRecordList();
    }

    // ── FAB helper ───────────────────────────────────────────────────────────
    function _showFab() {
        var f = document.getElementById('sp-fab-add');
        if (f) f.classList.add('sp-fab--show');
    }
    function _hideFab() {
        var f = document.getElementById('sp-fab-add');
        if (f) f.classList.remove('sp-fab--show');
    }

    // ── Record list ──────────────────────────────────────────────────────────
    function _showRecordList() {
        var rv = document.getElementById('sp-records-view');
        if (!rv) return;
        _showAppbar();
        document.getElementById('sp-list-view').style.display   = 'none';
        document.getElementById('sp-form-view').style.display   = 'none';
        document.getElementById('sp-detail-view').style.display = 'none';
        rv.style.display = '';
        _showFab();

        // Reset pagination
        _sp.listOffset  = 0;
        _sp.listLoading = false;
        _sp.listDone    = false;
        if (_sp.listObserver) { _sp.listObserver.disconnect(); _sp.listObserver = null; }

        rv.innerHTML = '<div class="sp-records-loading"><i class="fa fa-spinner fa-spin"></i><span>Memuat data...</span></div>';
        _loadRecordPage(rv, true);
    }

    function _loadRecordPage(rv, initial) {
        if (_sp.listLoading || _sp.listDone) return;
        _sp.listLoading = true;
        rpc('/petadigi/api/list', { offset: _sp.listOffset, limit: _sp.listPerPage, filter: _sp.listFilter || null, kabupaten_id: _sp.filterKabupaten || null, state: _sp.filterState || null })
            .then(function (records) {
                _sp.listLoading = false;
                records = records || [];
                _sp.listOffset += records.length;
                if (records.length < _sp.listPerPage) _sp.listDone = true;
                if (initial) {
                    _buildRecordList(rv, records);
                } else {
                    _appendRecordItems(rv, records);
                }
            })
            .catch(function () {
                _sp.listLoading = false;
                if (initial) {
                    rv.innerHTML = '<div class="sp-records-loading" style="color:var(--sp-error)"><i class="fa fa-exclamation-circle"></i><span>Gagal memuat data</span></div>';
                }
            });
    }

    function _recordItemHtml(r) {
        var isProses = r.state === 'PROSES';
        var badgeCls = isProses ? 'sp-badge--proses-lw' : 'sp-badge--selesai-lw';
        var badgeTxt = isProses ? 'PROSES' : 'SELESAI';
        var indCls   = isProses ? 'sp-record-ind--proses' : 'sp-record-ind--selesai';
        return '<button class="sp-record-item" data-id="' + r.id + '">'
            + '<div class="sp-record-ind ' + indCls + '"></div>'
            + '<div class="sp-record-body">'
            +   '<div class="sp-record-head">'
            +     '<span class="sp-record-code">' + _esc(r.code) + '</span>'
            +     '<span class="sp-badge ' + badgeCls + '">' + badgeTxt + '</span>'
            +   '</div>'
            +   '<div class="sp-record-lokasi">' + _esc(r.lokasi_nama || '—') + '</div>'
            +   '<div class="sp-record-meta" style="color:var(--sp-text-muted,#888);font-size:11px;margin-bottom:2px;">'
            +     '<i class="fa fa-shield"></i> ' + _esc((r.polres_id && r.polres_id[1]) || '—')
            +     (r.kabupaten_id ? '<span class="sp-record-sep">·</span><i class="fa fa-map"></i> ' + _esc(r.kabupaten_id[1]) : '')
            +   '</div>'
            +   '<div class="sp-record-meta">'
            +     '<i class="fa fa-clock-o"></i> ' + _fmtDtDisplay(r.tanggal_mulai)
            +     '<span class="sp-record-sep">·</span>'
            +     '<i class="fa fa-users"></i> ' + (r.personel_count || 0) + ' personel'
            +   '</div>'
            + '</div>'
            + '<i class="fa fa-chevron-right sp-record-arrow"></i>'
            + '</button>';
    }

    function _wireRecordClick(btn, rv) {
        btn.addEventListener('click', function () {
            rv.style.display = 'none';
            _hideFab();
            _openDetail(parseInt(btn.dataset.id));
        });
    }

    function _setupListSentinel(rv) {
        if (_sp.listObserver) { _sp.listObserver.disconnect(); _sp.listObserver = null; }
        var list = rv.querySelector('.sp-record-list');
        if (!list || _sp.listDone) return;
        var sentinel = document.createElement('div');
        sentinel.className = 'sp-list-sentinel';
        sentinel.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Memuat...';
        list.appendChild(sentinel);
        _sp.listObserver = new IntersectionObserver(function (entries) {
            if (entries[0].isIntersecting && !_sp.listLoading && !_sp.listDone) {
                _loadRecordPage(rv, false);
            }
        }, { threshold: 0.1 });
        _sp.listObserver.observe(sentinel);
    }

    function _filterPanelHtml(ns) {
        var st  = ns === 'sp' ? _sp : _pt;
        var ctx = window._SP_CTX || {};
        var hasKabupaten = ctx.kabupaten_list && ctx.kabupaten_list.length > 0;
        var kabupatenField = '';
        if (hasKabupaten) {
            var kOpts = '<option value="">Semua Kabupaten</option>';
            ctx.kabupaten_list.forEach(function (k) {
                kOpts += '<option value="' + k.id + '"' + (st.filterKabupaten == k.id ? ' selected' : '') + '>' + _esc(k.name) + '</option>';
            });
            kabupatenField = '<select class="sp-filter-select" id="' + ns + '-fl-kabupaten">' + kOpts + '</select>';
        }
        var sOpts = '<option value=""' + (!st.filterState ? ' selected' : '') + '>Semua Status</option>'
            + '<option value="PROSES"' + (st.filterState === 'PROSES' ? ' selected' : '') + '>PROSES</option>'
            + '<option value="SELESAI"' + (st.filterState === 'SELESAI' ? ' selected' : '') + '>SELESAI</option>';
        var hasActive = st.filterKabupaten || st.filterState;
        return '<div class="sp-filter-panel" id="' + ns + '-filter-panel"' + (st.filterOpen ? '' : ' style="display:none"') + '>'
            + '<div class="sp-filter-row">'
            + kabupatenField
            + '<select class="sp-filter-select" id="' + ns + '-fl-state">' + sOpts + '</select>'
            + '</div>'
            + (hasActive ? '<button class="sp-filter-reset" id="' + ns + '-fl-reset"><i class="fa fa-times"></i> Hapus Filter</button>' : '')
            + '</div>';
    }

    function _wireFilterEvents(rv, ns) {
        var st = ns === 'sp' ? _sp : _pt;
        var reload = ns === 'sp' ? _showRecordList : _showPatroliList;
        var filterBtn = rv.querySelector('#' + ns + '-filter-btn');
        if (filterBtn) filterBtn.addEventListener('click', function () {
            st.filterOpen = !st.filterOpen;
            var panel = document.getElementById(ns + '-filter-panel');
            if (panel) panel.style.display = st.filterOpen ? '' : 'none';
            this.classList.toggle('sp-filter-btn--active', st.filterOpen);
        });
        var kabupatenEl = rv.querySelector('#' + ns + '-fl-kabupaten');
        if (kabupatenEl) kabupatenEl.addEventListener('change', function () {
            st.filterKabupaten = this.value ? parseInt(this.value) : null;
            reload();
        });
        var stateEl = rv.querySelector('#' + ns + '-fl-state');
        if (stateEl) stateEl.addEventListener('change', function () {
            st.filterState = this.value || null;
            reload();
        });
        var resetEl = rv.querySelector('#' + ns + '-fl-reset');
        if (resetEl) resetEl.addEventListener('click', function () {
            st.filterKabupaten = null;
            st.filterState  = null;
            reload();
        });
    }

    function _buildRecordList(rv, records) {
        var filterBadge = _sp.listFilter === 'today'
            ? ' <button class="sp-filter-badge" id="sp-filter-clear">'
              + '<i class="fa fa-calendar-o"></i> Hari Ini'
              + '<i class="fa fa-times sp-filter-badge-x"></i>'
              + '</button>'
            : '';
        var hasActive = _sp.filterKabupaten || _sp.filterState;
        var filterBtnHtml = '<button class="sp-filter-btn' + (_sp.filterOpen ? ' sp-filter-btn--active' : '') + '" id="sp-filter-btn">'
            + '<i class="fa fa-filter"></i>'
            + (hasActive ? '<span class="sp-filter-dot"></span>' : '')
            + '</button>';
        var headerRight = '<div class="sp-header-right">'
            + '<span class="sp-records-count" id="sp-records-count">' + _sp.listOffset + (_sp.listDone ? '' : '+') + '</span>'
            + filterBtnHtml
            + '</div>';
        if (!records.length) {
            rv.innerHTML = '<div class="sp-records-header">'
                + '<span class="sp-records-title"><i class="fa fa-map-pin"></i> Strong Point' + filterBadge + '</span>'
                + headerRight
                + '</div>'
                + _filterPanelHtml('sp')
                + '<div class="sp-records-empty" style="margin-top:24px">'
                + '<i class="fa fa-map-pin"></i>'
                + '<div class="sp-records-empty-title">' + (_sp.listFilter === 'today' ? 'Tidak ada SP hari ini' : (hasActive ? 'Tidak ada data sesuai filter' : 'Belum ada Strong Point')) + '</div>'
                + '<div class="sp-records-empty-sub">' + (_sp.listFilter === 'today' ? 'Belum ada data strong point untuk hari ini' : (hasActive ? 'Coba ubah atau hapus filter' : 'Tap tombol <b>+</b> untuk menambah data baru')) + '</div>'
                + '</div>';
            var cb = rv.querySelector('#sp-filter-clear');
            if (cb) cb.addEventListener('click', function () { _sp.listFilter = null; _showRecordList(); });
            _wireFilterEvents(rv, 'sp');
            return;
        }
        var html = '<div class="sp-records-header">'
            + '<span class="sp-records-title"><i class="fa fa-map-pin"></i> Strong Point' + filterBadge + '</span>'
            + headerRight
            + '</div>'
            + _filterPanelHtml('sp')
            + '<div class="sp-record-list">';
        records.forEach(function (r) { html += _recordItemHtml(r); });
        html += '</div>';
        rv.innerHTML = html;
        var clearBtn = rv.querySelector('#sp-filter-clear');
        if (clearBtn) clearBtn.addEventListener('click', function () { _sp.listFilter = null; _showRecordList(); });
        _wireFilterEvents(rv, 'sp');
        rv.querySelectorAll('.sp-record-item').forEach(function (btn) { _wireRecordClick(btn, rv); });
        if (!_sp.listDone) _setupListSentinel(rv);
    }

    function _appendRecordItems(rv, records) {
        var list = rv.querySelector('.sp-record-list');
        if (!list) return;
        // Remove sentinel before appending
        var sentinel = list.querySelector('.sp-list-sentinel');
        if (sentinel) sentinel.remove();
        records.forEach(function (r) {
            var tmp = document.createElement('template');
            tmp.innerHTML = _recordItemHtml(r);
            var btn = tmp.content.firstElementChild;
            _wireRecordClick(btn, rv);
            list.appendChild(btn);
        });
        // Update count badge
        var countEl = document.getElementById('sp-records-count');
        if (countEl) countEl.textContent = _sp.listOffset + (_sp.listDone ? '' : '+');
        if (!_sp.listDone) _setupListSentinel(rv);
    }

    // ── Lokasi picker (triggered by FAB) ─────────────────────────────────────
    function _openLokasiPicker() {
        _hideAppbar();
        _hideFab();
        document.getElementById('sp-records-view').style.display = 'none';
        var lv = document.getElementById('sp-list-view');
        lv.style.display = '';
        _showListSkeleton();
        // Always re-request GPS for fresh distance sort
        Promise.all([
            _requestGPS(),
            _sp.lokasiList.length
                ? Promise.resolve(_sp.lokasiList)
                : rpc('/petadigi/api/lokasi', {}).catch(function () { return []; }),
        ]).then(function (results) {
            _sp.userPos    = results[0];
            _sp.lokasiList = results[1] || [];
            _computeDistances();
            _showLokasiList();
        }).catch(function () {
            _showLokasiList();
        });
    }

    // ── Back to records ──────────────────────────────────────────────────────
    function _backToRecords() {
        if (_sp.map) { _sp.map.remove(); _sp.map = null; _sp.marker = null; }
        document.getElementById('sp-detail-view').style.display = 'none';
        document.getElementById('sp-list-view').style.display   = 'none';
        document.getElementById('sp-form-view').style.display   = 'none';
        _sp.detailId = null;
        _sp.selected = null;
        _showRecordList();
    }

    function _computeDistances() {
        var pos = _sp.userPos;
        _sp.lokasiList.forEach(function (l) {
            if (pos && l.lat && l.lng) {
                l._dist = _haversineKm(pos.lat, pos.lng, l.lat, l.lng);
            } else {
                l._dist = Infinity;
            }
        });
        _sp.lokasiList.sort(function (a, b) { return a._dist - b._dist; });
    }

    // ── Lokasi picker skeleton ───────────────────────────────────────────────
    function _showListSkeleton() {
        var v = document.getElementById('sp-list-view');
        if (!v) return;
        v.innerHTML = ''
            + '<div class="sp-form-topbar">'
            +   '<button class="sp-back-btn" id="sp-picker-back"><i class="fa fa-arrow-left"></i></button>'
            +   '<div class="sp-form-topbar-info">'
            +     '<div class="sp-form-topbar-name"><i class="fa fa-map-pin"></i> Pilih Lokasi</div>'
            +   '</div>'
            + '</div>'
            + '<div class="sp-lokasi-loading">'
            +   '<i class="fa fa-spinner fa-spin"></i>'
            +   '<span>Mengambil GPS &amp; memuat lokasi...</span>'
            + '</div>';
        document.getElementById('sp-picker-back').addEventListener('click', _backToRecords);
    }

    // ── Render lokasi list ───────────────────────────────────────────────────
    function _showLokasiList() {
        var v = document.getElementById('sp-list-view');
        if (!v) return;
        v.style.display = '';

        var pos  = _sp.userPos;
        var list = _sp.lokasiList;

        var gpsPill = pos
            ? '<span class="sp-gps-pill sp-gps-pill--ok"><i class="fa fa-crosshairs"></i> GPS ±' + Math.round(pos.accuracy) + ' m</span>'
            : '<span class="sp-gps-pill sp-gps-pill--off"><i class="fa fa-exclamation-circle"></i> GPS tidak tersedia</span>';

        var html = '<div class="sp-form-topbar">'
            + '<button class="sp-back-btn" id="sp-picker-back"><i class="fa fa-arrow-left"></i></button>'
            + '<div class="sp-form-topbar-info">'
            +   '<div class="sp-form-topbar-name"><i class="fa fa-map-pin"></i> Pilih Lokasi</div>'
            + '</div>'
            + '</div>'
            + '<div class="sp-picker-gps">' + gpsPill + '</div>';

        if (!list.length) {
            html += '<div class="sp-lokasi-empty">'
                + '<i class="fa fa-map-o"></i>'
                + '<div style="font-weight:600;margin-bottom:4px;">Tidak ada lokasi aktif</div>'
                + '<div style="font-size:12px;opacity:.7;">Hubungi administrator untuk menambahkan lokasi</div>'
                + '</div>';
        } else {
            html += '<div class="sp-lokasi-list">';
            list.forEach(function (l) {
                var distHtml = l._dist === Infinity
                    ? '<span class="sp-dist sp-dist--none">—</span>'
                    : '<span class="sp-dist ' + _distCls(l._dist) + '">' + _fmtDist(l._dist) + '</span>';
                html += '<button class="sp-lokasi-item" data-id="' + l.id + '">'
                    +   '<div class="sp-lokasi-pin"><i class="fa fa-map-marker"></i></div>'
                    +   '<div class="sp-lokasi-item-body">'
                    +     '<div class="sp-lokasi-name">' + _esc(l.nama) + '</div>'
                    +     '<div class="sp-lokasi-code">' + _esc(l.code) + '</div>'
                    +   '</div>'
                    +   distHtml
                    +   '<i class="fa fa-chevron-right sp-lokasi-arrow"></i>'
                    + '</button>';
            });
            html += '</div>';
        }

        v.innerHTML = html;

        document.getElementById('sp-picker-back').addEventListener('click', _backToRecords);
        v.querySelectorAll('.sp-lokasi-item').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var id  = parseInt(this.dataset.id);
                var lok = list.find(function (l) { return l.id === id; });
                if (lok) _openForm(lok);
            });
        });
    }

    // ── Open form for a selected lokasi ─────────────────────────────────────
    function _openForm(lokasi) {
        _sp.selected = lokasi;
        _sp.personelLocal = [];
        document.getElementById('sp-list-view').style.display = 'none';
        var fv = document.getElementById('sp-form-view');
        fv.style.display = '';
        _buildForm(fv, lokasi);
    }

    // ── Local personel helpers (form, before submit) ─────────────────────────
    function _renderPersonelLocalList() {
        var listEl  = document.getElementById('sp-fp-list');
        var countEl = document.getElementById('sp-fp-count');
        if (!listEl) return;
        if (!_sp.personelLocal.length) {
            listEl.innerHTML = '<div class="sp-personel-empty">Belum ada personel</div>';
        } else {
            listEl.innerHTML = _sp.personelLocal.map(function (p) {
                return '<div class="sp-personel-row" data-tid="' + p.tempId + '">'
                    + '<div class="sp-personel-avatar"><i class="fa fa-user"></i></div>'
                    + '<div class="sp-personel-name">' + _esc(p.nama_lengkap) + '</div>'
                    + '<button class="sp-personel-del sp-fp-del" data-tid="' + p.tempId + '" title="Hapus"><i class="fa fa-times"></i></button>'
                    + '</div>';
            }).join('');
            listEl.querySelectorAll('.sp-fp-del').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    var tid = parseFloat(this.dataset.tid);
                    _sp.personelLocal = _sp.personelLocal.filter(function (p) { return p.tempId !== tid; });
                    _renderPersonelLocalList();
                });
            });
        }
        if (countEl) countEl.textContent = _sp.personelLocal.length;
    }

    function _addPersonelLocal() {
        var namaEl    = document.getElementById('sp-fp-nama');
        var pangkatEl = document.getElementById('sp-fp-pangkat');
        var nama      = (namaEl ? namaEl.value : '').trim().toUpperCase();
        if (!nama) { showToast('Isi nama personel', 'error'); return; }
        var pangkat     = (pangkatEl ? pangkatEl.value : '').trim().toUpperCase();
        var nama_lengkap = pangkat ? (pangkat + ' ' + nama) : nama;
        _sp.personelLocal.push({ tempId: Date.now() + Math.random(), nama: nama, pangkat: pangkat, nama_lengkap: nama_lengkap });
        if (namaEl)    namaEl.value    = '';
        if (pangkatEl) pangkatEl.value = '';
        _renderPersonelLocalList();
    }

    function _backToList() {
        if (_sp.map) { _sp.map.remove(); _sp.map = null; _sp.marker = null; }
        document.getElementById('sp-form-view').style.display = 'none';
        document.getElementById('sp-list-view').style.display = '';
        _sp.selected = null;
    }

    // ── Build form HTML ──────────────────────────────────────────────────────
    function _buildForm(fv) {
        var ctx = window._SP_CTX || {};
        var lok = _sp.selected;
        var pos = _sp.userPos;

        var now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        var nowStr = now.toISOString().slice(0, 16);

        // Polsek row — disembunyikan untuk subdit SP (selalu Polda, tidak punya polsek)
        var polsekRow = '';
        if (ctx.is_subdit_sp) {
            polsekRow = '';
        } else if (ctx.is_polsek) {
            polsekRow = '<div class="sp-field">'
                + '<label class="sp-label">Polsek</label>'
                + '<div class="sp-input-wrap"><i class="fa fa-building sp-input-icon"></i>'
                + '<input type="text" class="sp-input" value="' + _esc(ctx.polsek_name || '') + '" readonly/></div>'
                + '</div>';
        } else {
            var polsekOpts = '<option value="">— Pilih Polsek (opsional) —</option>';
            (ctx.polsek_list || []).forEach(function (p) {
                polsekOpts += '<option value="' + p.id + '">' + _esc(p.name) + '</option>';
            });
            polsekRow = '<div class="sp-field">'
                + '<label class="sp-label">Polsek</label>'
                + '<div class="sp-input-wrap"><i class="fa fa-building sp-input-icon"></i>'
                + '<select class="sp-select" id="sp-polsek">' + polsekOpts + '</select></div>'
                + '</div>';
        }

        // Polres field — disembunyikan untuk subdit SP (auto-assign ke Polda di backend)
        var polresRow = ctx.is_subdit_sp ? '' : (
            '<div class="sp-field">'
            + '<label class="sp-label">Polres</label>'
            + '<div class="sp-input-wrap"><i class="fa fa-shield sp-input-icon"></i>'
            + '<input type="text" class="sp-input" value="' + _esc(ctx.polres_name || '') + '" readonly/></div>'
            + '</div>'
        );

        // Kabupaten options
        var kabOpts = '<option value="">— Pilih Kabupaten —</option>';
        (ctx.kabupaten_list || []).forEach(function (k) {
            kabOpts += '<option value="' + k.id + '">' + _esc(k.name) + '</option>';
        });

        // GPS pre-fill values
        var latVal = pos ? pos.lat.toFixed(6) : '';
        var lngVal = pos ? pos.lng.toFixed(6) : '';
        var gpsStatusHtml = pos
            ? '<i class="fa fa-check-circle" style="color:var(--sp-success);margin-right:5px;"></i>'
              + latVal + ', ' + lngVal
              + ' <span style="opacity:.6;font-size:11px;">(±' + Math.round(pos.accuracy) + 'm)</span>'
            : '<i class="fa fa-circle-o" style="margin-right:5px;opacity:.4;"></i>Belum diambil';

        fv.innerHTML = ''
            // Back button + lokasi header
            + '<div class="sp-form-topbar">'
            +   '<button type="button" class="sp-back-btn" id="sp-back-btn">'
            +     '<i class="fa fa-arrow-left"></i>'
            +   '</button>'
            +   '<div class="sp-form-topbar-info">'
            +     '<div class="sp-form-topbar-name">' + _esc(lok.nama) + '</div>'
            +     '<div class="sp-form-topbar-code">' + _esc(lok.code)
            +       (lok._dist !== Infinity ? ' · ' + _fmtDist(lok._dist) : '')
            +     '</div>'
            +   '</div>'
            + '</div>'

            // Card 1: Wilayah
            + '<div class="sp-card">'
            +   '<div class="sp-card-title"><i class="fa fa-map-marker"></i> Wilayah</div>'
            +   polresRow
            +   polsekRow
            +   '<div class="sp-field">'
            +     '<label class="sp-label">Kabupaten <span class="sp-req">*</span></label>'
            +     '<div class="sp-input-wrap"><i class="fa fa-map sp-input-icon"></i>'
            +     '<select class="sp-select" id="sp-kabupaten">' + kabOpts + '</select></div>'
            +   '</div>'
            +   '<div class="sp-row-2">'
            +     '<div class="sp-field">'
            +       '<label class="sp-label">Kecamatan <span class="sp-req">*</span></label>'
            +       '<div class="sp-input-wrap"><i class="fa fa-map-o sp-input-icon"></i>'
            +       '<select class="sp-select" id="sp-kecamatan" disabled><option value="">— Pilih Kabupaten —</option></select></div>'
            +     '</div>'
            +     '<div class="sp-field">'
            +       '<label class="sp-label">Desa / Kelurahan <span class="sp-req">*</span></label>'
            +       '<div class="sp-input-wrap"><i class="fa fa-home sp-input-icon"></i>'
            +       '<select class="sp-select" id="sp-desa" disabled><option value="">— Pilih Kecamatan —</option></select></div>'
            +     '</div>'
            +   '</div>'
            +   '<div class="sp-field">'
            +     '<label class="sp-label">Keterangan Lokasi <span class="sp-req">*</span></label>'
            +     '<div class="sp-input-wrap"><i class="fa fa-map-marker sp-input-icon"></i>'
            +     '<input type="text" class="sp-input" id="sp-keterangan-lokasi" value="' + _esc(lok.nama) + '" placeholder="Keterangan lokasi..."/></div>'
            +   '</div>'
            + '</div>'

            // Card 2: Waktu — hanya tanggal mulai; selesai diisi saat klik "Set Selesai"
            + '<div class="sp-card">'
            +   '<div class="sp-card-title"><i class="fa fa-clock-o"></i> Waktu Mulai</div>'
            +   '<div class="sp-field">'
            +     '<label class="sp-label">Tgl &amp; Jam Mulai <span class="sp-req">*</span></label>'
            +     '<input type="datetime-local" class="sp-input sp-input--bare" id="sp-tgl-mulai" value="' + nowStr + '"/>'
            +   '</div>'
            + '</div>'

            // Card 3: GPS + Map
            + '<div class="sp-card">'
            +   '<div class="sp-card-title"><i class="fa fa-crosshairs"></i> Koordinat GPS</div>'
            +   '<div class="sp-gps-row">'
            +     '<div style="flex:1">'
            +       '<label class="sp-label">Posisi</label>'
            +       '<div id="sp-gps-status" class="sp-gps-status">' + gpsStatusHtml + '</div>'
            +     '</div>'
            +     '<button type="button" class="sp-gps-btn" id="sp-gps-btn" style="margin-top:20px;">'
            +       '<i class="fa fa-crosshairs"></i> ' + (pos ? 'Perbarui' : 'Ambil GPS')
            +     '</button>'
            +   '</div>'
            +   '<div class="sp-gps-map" id="sp-gps-map">'
            +     '<div class="sp-gps-map-hint">Geser marker untuk menyesuaikan titik</div>'
            +   '</div>'
            +   '<div class="sp-row-2" style="margin-top:12px;">'
            +     '<div class="sp-field">'
            +       '<label class="sp-label">Latitude</label>'
            +       '<input type="text" class="sp-input sp-input--bare" id="sp-lat" value="' + latVal + '" placeholder="0.000000" readonly/>'
            +     '</div>'
            +     '<div class="sp-field">'
            +       '<label class="sp-label">Longitude</label>'
            +       '<input type="text" class="sp-input sp-input--bare" id="sp-lng" value="' + lngVal + '" placeholder="0.000000" readonly/>'
            +     '</div>'
            +   '</div>'
            + '</div>'

            // Card 4: Keterangan
            + '<div class="sp-card">'
            +   '<div class="sp-card-title"><i class="fa fa-pencil"></i> Keterangan</div>'
            +   '<textarea class="sp-textarea" id="sp-keterangan" rows="3" placeholder="Catatan tambahan (opsional)..."></textarea>'
            + '</div>'

            // Card 5: Personel (lokal, batch-save setelah submit)
            + '<div class="sp-card">'
            +   '<div class="sp-card-title"><i class="fa fa-users"></i> Personel <span class="sp-req">*</span>'
            +     '<span class="sp-personel-count" id="sp-fp-count" style="margin-left:6px;">0</span>'
            +   '</div>'
            +   '<div id="sp-fp-list"><div class="sp-personel-empty">Belum ada personel</div></div>'
            +   '<div class="sp-personel-add-form" style="margin-top:10px;">'
            +     '<input type="text" class="sp-input sp-input--bare sp-input--upper" id="sp-fp-nama"'
            +       ' placeholder="Nama lengkap *" autocapitalize="characters" style="width:100%;margin-bottom:8px;"/>'
            +     '<div style="display:flex;gap:8px;align-items:center;">'
            +       '<input type="text" class="sp-input sp-input--bare sp-input--upper" id="sp-fp-pangkat"'
            +         ' placeholder="Pangkat (opsional)" autocapitalize="characters" style="flex:1;"/>'
            +       '<button type="button" class="sp-btn-add-personel" id="sp-fp-add"><i class="fa fa-plus"></i></button>'
            +     '</div>'
            +   '</div>'
            + '</div>'

            // Sticky submit bar
            + '<div class="sp-submit-bar">'
            +   '<button type="button" class="sp-btn-primary" id="sp-submit-btn">'
            +     '<i class="fa fa-paper-plane"></i>'
            +     '<span id="sp-submit-label">Simpan Strong Point</span>'
            +   '</button>'
            + '</div>';

        // ── Wire up events ───────────────────────────────────────────────────
        document.getElementById('sp-back-btn').addEventListener('click', _backToList);

        // Kabupaten → Kecamatan cascade
        document.getElementById('sp-kabupaten').addEventListener('change', function () {
            var val    = this.value;
            var kecEl  = document.getElementById('sp-kecamatan');
            var desaEl = document.getElementById('sp-desa');
            kecEl.innerHTML = '<option value="">— Memuat... —</option>';
            kecEl.disabled  = true;
            desaEl.innerHTML = '<option value="">— Pilih Kecamatan —</option>';
            desaEl.disabled  = true;
            if (val) _loadKecamatan(val);
        });

        // Kecamatan → Desa cascade
        document.getElementById('sp-kecamatan').addEventListener('change', function () {
            var val    = this.value;
            var desaEl = document.getElementById('sp-desa');
            desaEl.innerHTML = '<option value="">— Memuat... —</option>';
            desaEl.disabled  = true;
            if (val) _loadDesa(val);
        });

        // Auto-fill kabupaten untuk polsek user
        if (ctx.is_polsek && ctx.kabupaten_list && ctx.kabupaten_list.length === 1) {
            var kabEl = document.getElementById('sp-kabupaten');
            if (kabEl) {
                kabEl.value = ctx.kabupaten_list[0].id;
                _loadKecamatan(ctx.kabupaten_list[0].id, ctx.kecamatan_list || []);
            }
        }

        // GPS button
        document.getElementById('sp-gps-btn').addEventListener('click', function () {
            var btn      = this;
            var statusEl = document.getElementById('sp-gps-status');
            btn.disabled = true;
            btn.innerHTML = '<span class="sp-spinner" style="border-color:rgba(113,99,158,.3);border-top-color:var(--sp-primary);width:13px;height:13px;"></span> Mengambil...';

            if (!navigator.geolocation) {
                statusEl.innerHTML = '<i class="fa fa-times" style="color:var(--sp-error);margin-right:5px;"></i>GPS tidak tersedia';
                btn.disabled = false;
                btn.innerHTML = '<i class="fa fa-crosshairs"></i> Ambil GPS';
                return;
            }
            navigator.geolocation.getCurrentPosition(function (p) {
                var lat = p.coords.latitude.toFixed(6);
                var lng = p.coords.longitude.toFixed(6);
                _sp.userPos = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy };
                document.getElementById('sp-lat').value = lat;
                document.getElementById('sp-lng').value = lng;
                statusEl.innerHTML = '<i class="fa fa-check-circle" style="color:var(--sp-success);margin-right:5px;"></i>'
                    + lat + ', ' + lng
                    + ' <span style="opacity:.6;font-size:11px;">(±' + Math.round(p.coords.accuracy) + 'm)</span>';
                btn.disabled = false;
                btn.classList.add('sp-gps-active');
                btn.innerHTML = '<i class="fa fa-check"></i> Perbarui';
                // Update map
                if (_sp.map && _sp.marker) {
                    var ll = [p.coords.latitude, p.coords.longitude];
                    _sp.marker.setLatLng(ll);
                    _sp.map.flyTo(ll, 16, { duration: 0.8 });
                }
            }, function (err) {
                statusEl.innerHTML = '<i class="fa fa-times" style="color:var(--sp-error);margin-right:5px;"></i>'
                    + (err.code === 1 ? 'Akses GPS ditolak' : err.code === 2 ? 'Posisi tidak tersedia' : 'Waktu habis');
                btn.disabled = false;
                btn.innerHTML = '<i class="fa fa-crosshairs"></i> Coba Lagi';
            }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
        });

        // Personel local
        document.getElementById('sp-fp-add').addEventListener('click', _addPersonelLocal);
        document.getElementById('sp-fp-nama').addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); _addPersonelLocal(); }
        });

        // Submit
        document.getElementById('sp-submit-btn').addEventListener('click', _submitStrong);

        // Init map after DOM paint
        setTimeout(_initGpsMap, 80);
    }

    // ── Init Leaflet map in GPS card ─────────────────────────────────────────
    function _initGpsMap() {
        if (typeof L === 'undefined') return;
        var container = document.getElementById('sp-gps-map');
        if (!container) return;

        var pos = _sp.userPos;
        var lok = _sp.selected;

        // Determine initial center: user GPS > lokasi coords > Palembang fallback
        var center;
        if (pos && pos.lat && pos.lng) {
            center = [pos.lat, pos.lng];
        } else if (lok && lok.lat && lok.lng) {
            center = [lok.lat, lok.lng];
        } else {
            center = [-2.9761, 104.7754]; // Palembang
        }

        var _IMG = '/petadigi/static/lib/leaflet/images/';
        var pinIcon = L.icon({
            iconUrl:      _IMG + 'marker-icon-purple.png',
            shadowUrl:    _IMG + 'marker-shadow.png',
            iconSize:     [25, 41], iconAnchor:   [12, 41],
            popupAnchor:  [1, -34], shadowSize:   [41, 41], shadowAnchor: [12, 41],
        });

        _sp.map = L.map(container, { zoomControl: false, attributionControl: false });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
        }).addTo(_sp.map);
        L.control.zoom({ position: 'bottomright' }).addTo(_sp.map);
        L.control.attribution({ position: 'bottomleft', prefix: '© OSM' }).addTo(_sp.map);

        _sp.map.setView(center, 16);

        // Draggable marker
        _sp.marker = L.marker(center, { draggable: true, icon: pinIcon }).addTo(_sp.map);
        _sp.marker.on('dragend', function () {
            var ll = _sp.marker.getLatLng();
            var lat = ll.lat.toFixed(6);
            var lng = ll.lng.toFixed(6);
            document.getElementById('sp-lat').value = lat;
            document.getElementById('sp-lng').value = lng;
            var statusEl = document.getElementById('sp-gps-status');
            if (statusEl) {
                statusEl.innerHTML = '<i class="fa fa-map-marker" style="color:var(--sp-primary);margin-right:5px;"></i>'
                    + lat + ', ' + lng
                    + ' <span style="opacity:.6;font-size:11px;">(digeser manual)</span>';
            }
        });

        _sp.map.invalidateSize();
    }

    // ── Cascade helpers ───────────────────────────────────────────────────────
    function _loadKecamatan(kabId, preloaded) {
        if (preloaded && preloaded.length) {
            var filtered = preloaded.filter(function (k) { return k.kabupaten_id && k.kabupaten_id[0] == kabId; });
            if (filtered.length) { _fillSelect('sp-kecamatan', filtered, 'name', '— Pilih Kecamatan —'); return; }
        }
        rpc('/petadigi/api/kecamatan', { kabupaten_id: kabId }).then(function (list) {
            _fillSelect('sp-kecamatan', list, 'name', '— Pilih Kecamatan —');
        }).catch(function () {
            var el = document.getElementById('sp-kecamatan');
            if (el) { el.innerHTML = '<option value="">— Gagal memuat —</option>'; el.disabled = false; }
        });
    }

    function _loadDesa(kecId) {
        rpc('/petadigi/api/desa', { kecamatan_id: kecId }).then(function (list) {
            _fillSelect('sp-desa', list, 'name', '— Pilih Desa —');
        }).catch(function () {
            var el = document.getElementById('sp-desa');
            if (el) { el.innerHTML = '<option value="">— Gagal memuat —</option>'; el.disabled = false; }
        });
    }

    function _fillSelect(id, list, labelKey, placeholder) {
        var el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = '<option value="">' + placeholder + '</option>';
        (list || []).forEach(function (item) {
            el.innerHTML += '<option value="' + item.id + '">' + _esc(item[labelKey] || '') + '</option>';
        });
        el.disabled = false;
    }

    // ── Submit ───────────────────────────────────────────────────────────────
    function _fmtDatetimeLocal(val) {
        if (!val) return false;
        return val.replace('T', ' ') + ':00';
    }

    function _submitStrong() {
        var kabId        = document.getElementById('sp-kabupaten')?.value;
        var kecId        = document.getElementById('sp-kecamatan')?.value;
        var desaId       = document.getElementById('sp-desa')?.value;
        var tglMul       = document.getElementById('sp-tgl-mulai')?.value;
        var ketLokasi    = (document.getElementById('sp-keterangan-lokasi')?.value || '').trim();
        var lat          = parseFloat(document.getElementById('sp-lat')?.value) || 0;
        var lng          = parseFloat(document.getElementById('sp-lng')?.value) || 0;

        var ctx    = window._SP_CTX || {};
        if (!kabId)     { showToast('Pilih Kabupaten terlebih dahulu', 'error'); return; }
        if (!kecId)     { showToast('Pilih Kecamatan terlebih dahulu', 'error'); return; }
        if (!desaId)    { showToast('Pilih Desa / Kelurahan terlebih dahulu', 'error'); return; }
        if (!ketLokasi) { showToast('Isi Keterangan Lokasi terlebih dahulu', 'error'); return; }
        if (!lat && !lng) { showToast('Ambil GPS terlebih dahulu', 'error'); return; }
        if (!tglMul)    { showToast('Isi Tanggal & Jam Mulai', 'error'); return; }
        if (!_sp.personelLocal.length) { showToast('Tambahkan minimal 1 personel terlebih dahulu', 'error'); return; }

        var btn   = document.getElementById('sp-submit-btn');
        var label = document.getElementById('sp-submit-label');
        btn.disabled = true;
        label.innerHTML = '<span class="sp-spinner"></span> Menyimpan...';

        var params = {
            lokasi_id:          _sp.selected ? _sp.selected.id : null,
            kabupaten_id:       parseInt(kabId),
            kecamatan_id:       parseInt(kecId),
            desa_id:            parseInt(desaId) || null,
            keterangan_lokasi:  ketLokasi,
            tanggal_mulai:      _fmtDatetimeLocal(tglMul),
            tanggal_selesai:    _fmtDatetimeLocal(document.getElementById('sp-tgl-selesai')?.value),
            latitude:           lat,
            longitude:          lng,
            keterangan:         document.getElementById('sp-keterangan')?.value || '',
        };

        if (!ctx.is_polsek && !ctx.is_subdit_sp) {
            var polsekVal = document.getElementById('sp-polsek')?.value;
            if (polsekVal) params.polsek_id = parseInt(polsekVal);
        }

        rpc('/petadigi/api/submit', params).then(function (res) {
            if (res && res.success) {
                // Batch-save personel lokal
                var personelToSave = _sp.personelLocal.slice();
                _sp.personelLocal = [];
                var chain = Promise.resolve();
                personelToSave.forEach(function (p) {
                    chain = chain.then(function () {
                        return rpc('/petadigi/api/personel_add', {
                            record_id: res.record_id,
                            nama:      p.nama,
                            pangkat:   p.pangkat,
                        }).catch(function () {});
                    });
                });
                chain.then(function () {
                    showToast(res.code + ' berhasil disimpan!', 'success');
                    if (_sp.map) { _sp.map.remove(); _sp.map = null; _sp.marker = null; }
                    document.getElementById('sp-form-view').style.display = 'none';
                    _openDetail(res.record_id);
                });
            } else {
                showToast(res.error || 'Gagal menyimpan data', 'error');
                btn.disabled = false;
                label.textContent = 'Simpan Strong Point';
            }
        }).catch(function () {
            showToast('Gagal terhubung ke server', 'error');
            btn.disabled = false;
            label.textContent = 'Simpan Strong Point';
        });
    }

    // ════════════════════════════════════════════════════════════════════════
    //  DETAIL VIEW — after submit
    // ════════════════════════════════════════════════════════════════════════

    function _openDetail(recordId) {
        _sp.detailId = recordId;
        _hideAppbar();
        _hideFab();
        document.getElementById('sp-records-view').style.display = 'none';
        document.getElementById('sp-list-view').style.display   = 'none';
        document.getElementById('sp-form-view').style.display   = 'none';
        var dv = document.getElementById('sp-detail-view');
        dv.style.display = '';
        dv.innerHTML = '<div class="sp-detail-loading"><i class="fa fa-spinner fa-spin"></i><span>Memuat data...</span></div>';
        rpc('/petadigi/api/record', { record_id: recordId }).then(function (data) {
            _buildDetail(dv, data);
        }).catch(function () {
            dv.innerHTML = '<div class="sp-detail-loading" style="color:var(--sp-error);"><i class="fa fa-exclamation-circle"></i><span>Gagal memuat data</span></div>';
        });
    }

    function _backFromDetail() {
        _backToRecords();
    }

    function _fmtDtDisplay(s) {
        if (!s) return '—';
        var d = new Date(s.replace(' ', 'T') + 'Z');
        if (isNaN(d)) return s;
        var bln = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
        var hh  = String(d.getHours()).padStart(2, '0');
        var mm  = String(d.getMinutes()).padStart(2, '0');
        return d.getDate() + ' ' + bln[d.getMonth()] + ' ' + d.getFullYear() + ' ' + hh + ':' + mm;
    }

    function _buildDetail(dv, data) {
        var isProses = data.state === 'PROSES';
        var badgeCls = isProses ? 'sp-badge--proses' : 'sp-badge--selesai';
        var badgeTxt = isProses ? 'PROSES' : 'SELESAI';

        var personelRows = '';
        (data.personel || []).forEach(function (p) {
            personelRows += '<div class="sp-personel-row" id="pr-' + p.id + '">'
                + '<div class="sp-personel-avatar"><i class="fa fa-user"></i></div>'
                + '<div class="sp-personel-name">' + _esc(p.nama_lengkap) + '</div>'
                + '<button class="sp-personel-del" data-pid="' + p.id + '" title="Hapus"><i class="fa fa-times"></i></button>'
                + '</div>';
        });

        var fotoSection = data.has_foto
            ? '<div class="sp-foto-preview" id="sp-foto-wrap">'
              +   '<button class="sp-btn-secondary" id="sp-foto-ganti" style="margin-top:8px;width:100%;">'
              +     '<i class="fa fa-camera"></i> Ganti Foto'
              +   '</button>'
              + '</div>'
            : '<div class="sp-foto-zone" id="sp-foto-zone">'
              +   '<i class="fa fa-camera"></i>'
              +   '<div class="sp-foto-zone-text">Tambah Foto Dokumentasi</div>'
              +   '<div class="sp-foto-zone-sub">JPG / PNG · Tap untuk mengambil foto</div>'
              + '</div>';

        dv.innerHTML = ''
            // Top bar
            + '<div class="sp-form-topbar">'
            +   '<button class="sp-back-btn" id="sp-detail-back"><i class="fa fa-arrow-left"></i></button>'
            +   '<div class="sp-form-topbar-info">'
            +     '<div class="sp-form-topbar-name">' + _esc(data.code) + '</div>'
            +     '<div class="sp-form-topbar-code">' + _esc(data.lokasi_nama || '—') + '</div>'
            +   '</div>'
            +   '<span class="sp-badge ' + badgeCls + '">' + badgeTxt + '</span>'
            + '</div>'

            // Info card
            + '<div class="sp-card">'
            +   '<div class="sp-card-title"><i class="fa fa-info-circle"></i> Info</div>'
            +   (data.keterangan_lokasi ? '<div class="sp-info-row sp-info-row--full"><span class="sp-info-label">Lokasi</span><span class="sp-info-value">' + _esc(data.keterangan_lokasi) + '</span></div>' : '')
            +   '<div class="sp-info-row"><span class="sp-info-label">Kecamatan</span><span class="sp-info-value">' + _esc(data.kecamatan_nama || '—') + '</span></div>'
            +   '<div class="sp-info-row"><span class="sp-info-label">Desa</span><span class="sp-info-value">' + _esc(data.desa_nama || '—') + '</span></div>'
            +   '<div class="sp-info-row"><span class="sp-info-label">Tgl Mulai</span><span class="sp-info-value">' + _fmtDtDisplay(data.tanggal_mulai) + '</span></div>'
            +   (data.tanggal_selesai ? '<div class="sp-info-row"><span class="sp-info-label">Tgl Selesai</span><span class="sp-info-value">' + _fmtDtDisplay(data.tanggal_selesai) + '</span></div>' : '')
            +   (data.keterangan ? '<div class="sp-info-row sp-info-row--full"><span class="sp-info-label">Keterangan</span><span class="sp-info-value">' + _esc(data.keterangan) + '</span></div>' : '')
            + '</div>'

            // Personel card
            + '<div class="sp-card">'
            +   '<div class="sp-card-title"><i class="fa fa-users"></i> Personel'
            +   '  <span class="sp-personel-count" id="sp-personel-count">' + (data.personel || []).length + '</span>'
            +   '</div>'
            +   '<div class="sp-personel-list" id="sp-personel-list">' + (personelRows || '<div class="sp-personel-empty">Belum ada personel</div>') + '</div>'
            +   '<div class="sp-personel-add-form" id="sp-personel-add-form">'
            +     '<input type="text" class="sp-input sp-input--bare sp-input--upper" id="sp-p-nama" placeholder="Nama lengkap *" autocapitalize="characters" style="width:100%;margin-bottom:8px;"/>'
            +     '<div style="display:flex;gap:8px;align-items:center;">'
            +       '<input type="text" class="sp-input sp-input--bare sp-input--upper" id="sp-p-pangkat" placeholder="Pangkat (opsional)" autocapitalize="characters" style="flex:1;"/>'
            +       '<button class="sp-btn-add-personel" id="sp-p-add"><i class="fa fa-plus"></i></button>'
            +     '</div>'
            +   '</div>'
            + '</div>'

            // Foto card
            + '<div class="sp-card">'
            +   '<div class="sp-card-title"><i class="fa fa-camera"></i> Dokumentasi</div>'
            +   fotoSection
            +   '<input type="file" id="sp-foto-input" accept="image/*" style="display:none"/>'
            + '</div>'

            // Set Selesai card (only if PROSES)
            + (isProses
                ? '<div class="sp-card sp-selesai-card" id="sp-selesai-card">'
                +   '<div class="sp-card-title"><i class="fa fa-check-circle"></i> Selesaikan Strong Point</div>'
                +   '<div id="sp-selesai-info" style="font-size:13px;color:var(--sp-on-surf-var);margin-bottom:14px;">Tandai strong point ini sebagai selesai dan catat waktu selesainya.</div>'
                +   '<div id="sp-selesai-form" style="display:none;">'
                +     '<div class="sp-field">'
                +       '<label class="sp-label">Tgl &amp; Jam Selesai <span class="sp-req">*</span></label>'
                +       '<input type="datetime-local" class="sp-input sp-input--bare" id="sp-tgl-selesai"/>'
                +     '</div>'
                +     '<div style="display:flex;gap:10px;margin-top:4px;">'
                +       '<button class="sp-btn-secondary" id="sp-selesai-cancel" style="flex:1;">Batal</button>'
                +       '<button class="sp-btn-selesai" id="sp-selesai-confirm" style="flex:2;">'
                +         '<i class="fa fa-check"></i> <span id="sp-selesai-label">Konfirmasi Selesai</span>'
                +       '</button>'
                +     '</div>'
                +   '</div>'
                +   '<button class="sp-btn-selesai" id="sp-selesai-trigger" style="width:100%;">'
                +     '<i class="fa fa-check-circle"></i> Set Selesai'
                +   '</button>'
                + '</div>'
                : '');

        // ── Wire events ──────────────────────────────────────────────────────
        document.getElementById('sp-detail-back').addEventListener('click', _backFromDetail);

        // Personel delete
        dv.querySelectorAll('.sp-personel-del').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var pid = parseInt(this.dataset.pid);
                _confirmDialog('Hapus personel ini dari daftar strong point?', function () { _removePersonel(pid); });
            });
        });

        // Personel add
        document.getElementById('sp-p-add').addEventListener('click', function () {
            var nama    = (document.getElementById('sp-p-nama').value || '').trim().toUpperCase();
            var pangkat = (document.getElementById('sp-p-pangkat').value || '').trim().toUpperCase();
            if (!nama) { showToast('Isi nama personel', 'error'); return; }
            var btn = this;
            btn.disabled = true;
            rpc('/petadigi/api/personel_add', { record_id: _sp.detailId, nama: nama, pangkat: pangkat })
                .then(function (res) {
                    if (res.success) {
                        _appendPersonelRow(res.id, res.nama_lengkap);
                        document.getElementById('sp-p-nama').value    = '';
                        document.getElementById('sp-p-pangkat').value = '';
                        showToast('Personel ditambahkan', 'success');
                    } else {
                        showToast(res.error || 'Gagal', 'error');
                    }
                }).catch(function () { showToast('Gagal', 'error'); })
                .finally(function () { btn.disabled = false; });
        });

        // Foto — insert <img> via createElement agar base64 tidak corrupt via innerHTML
        if (data.has_foto && data.foto_src) {
            var wrap = document.getElementById('sp-foto-wrap');
            if (wrap) {
                var img = document.createElement('img');
                img.className = 'sp-foto-img';
                img.alt = 'Foto Dokumentasi';
                img.src = data.foto_src;
                wrap.insertBefore(img, wrap.firstChild);
            }
        }
        document.getElementById('sp-foto-input').addEventListener('change', function () {
            if (!this.files || !this.files[0]) return;
            _uploadFoto(this.files[0]);
        });
        var fotoZone = document.getElementById('sp-foto-zone');
        if (fotoZone) fotoZone.addEventListener('click', function () { document.getElementById('sp-foto-input').click(); });
        var fotoGanti = document.getElementById('sp-foto-ganti');
        if (fotoGanti) fotoGanti.addEventListener('click', function () { document.getElementById('sp-foto-input').click(); });

        // Set Selesai
        if (isProses) {
            document.getElementById('sp-selesai-trigger').addEventListener('click', function () {
                if (!data.has_foto) {
                    showToast('Upload foto dokumentasi terlebih dahulu sebelum menyelesaikan', 'error');
                    return;
                }
                this.style.display = 'none';
                document.getElementById('sp-selesai-info').style.display   = 'none';
                document.getElementById('sp-selesai-form').style.display   = '';
                // Pre-fill dengan waktu sekarang
                var now = new Date();
                now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                document.getElementById('sp-tgl-selesai').value = now.toISOString().slice(0, 16);
            });
            document.getElementById('sp-selesai-cancel').addEventListener('click', function () {
                document.getElementById('sp-selesai-form').style.display    = 'none';
                document.getElementById('sp-selesai-info').style.display    = '';
                document.getElementById('sp-selesai-trigger').style.display = '';
            });
            document.getElementById('sp-selesai-confirm').addEventListener('click', function () {
                var tgl = document.getElementById('sp-tgl-selesai').value;
                if (!tgl) { showToast('Isi tanggal selesai', 'error'); return; }
                var btn   = document.getElementById('sp-selesai-confirm');
                var label = document.getElementById('sp-selesai-label');
                btn.disabled = true;
                label.innerHTML = '<span class="sp-spinner"></span> Menyimpan...';
                rpc('/petadigi/api/set_selesai', {
                    record_id:      _sp.detailId,
                    tanggal_selesai: tgl.replace('T', ' ') + ':00',
                }).then(function (res) {
                    if (res.success) {
                        showToast('Strong Point berhasil diselesaikan!', 'success');
                        // Reload detail
                        rpc('/petadigi/api/record', { record_id: _sp.detailId }).then(function (d) {
                            _buildDetail(dv, d);
                        });
                    } else {
                        showToast(res.error || 'Gagal', 'error');
                        btn.disabled = false;
                        label.textContent = 'Konfirmasi Selesai';
                    }
                }).catch(function () {
                    showToast('Gagal', 'error');
                    btn.disabled = false;
                    label.textContent = 'Konfirmasi Selesai';
                });
            });
        }
    }

    function _appendPersonelRow(pid, namaLengkap) {
        var list = document.getElementById('sp-personel-list');
        if (!list) return;
        var empty = list.querySelector('.sp-personel-empty');
        if (empty) empty.remove();
        var div = document.createElement('div');
        div.className = 'sp-personel-row';
        div.id = 'pr-' + pid;
        div.innerHTML = '<div class="sp-personel-avatar"><i class="fa fa-user"></i></div>'
            + '<div class="sp-personel-name">' + _esc(namaLengkap) + '</div>'
            + '<button class="sp-personel-del" data-pid="' + pid + '" title="Hapus"><i class="fa fa-times"></i></button>';
        div.querySelector('.sp-personel-del').addEventListener('click', function () {
            var pid = parseInt(this.dataset.pid);
            _confirmDialog('Hapus personel ini dari daftar strong point?', function () { _removePersonel(pid); });
        });
        list.appendChild(div);
        var cnt = document.getElementById('sp-personel-count');
        if (cnt) cnt.textContent = list.querySelectorAll('.sp-personel-row').length;
    }

    function _removePersonel(pid) {
        rpc('/petadigi/api/personel_remove', { personel_id: pid }).then(function (res) {
            if (res.success) {
                var row = document.getElementById('pr-' + pid);
                if (row) row.remove();
                var list = document.getElementById('sp-personel-list');
                if (list && !list.querySelector('.sp-personel-row')) {
                    list.innerHTML = '<div class="sp-personel-empty">Belum ada personel</div>';
                }
                var cnt = document.getElementById('sp-personel-count');
                if (cnt && list) cnt.textContent = list.querySelectorAll('.sp-personel-row').length;
                showToast('Personel dihapus', 'info');
            } else {
                showToast(res.error || 'Gagal menghapus', 'error');
            }
        }).catch(function () { showToast('Gagal', 'error'); });
    }

    function _uploadFoto(file) {
        var reader = new FileReader();
        reader.onload = function (e) {
            var data = e.target.result;
            showToast('Mengupload foto...', 'info');
            rpc('/petadigi/api/upload_foto', {
                record_id:     _sp.detailId,
                foto_data:     data,
                foto_filename: file.name,
            }).then(function (res) {
                if (res.success) {
                    showToast('Foto berhasil disimpan', 'success');
                    var dv = document.getElementById('sp-detail-view');
                    rpc('/petadigi/api/record', { record_id: _sp.detailId }).then(function (d) {
                        _buildDetail(dv, d);
                    });
                } else {
                    showToast(res.error || 'Gagal upload', 'error');
                }
            }).catch(function () { showToast('Gagal upload', 'error'); });
        };
        reader.readAsDataURL(file);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  PROFIL TAB
    // ════════════════════════════════════════════════════════════════════════

    var _profilRendered = false;
    function _renderProfilOnce() {
        if (_profilRendered) return;
        _profilRendered = true;

        var ctx = window._SP_CTX || {};
        var el  = document.getElementById('profil-content');
        if (!el) return;

        var photoSrc = ctx.user_id ? '/web/image/res.users/' + ctx.user_id + '/image_128' : '';
        var roleLabel = ctx.is_subdit_sp ? 'Subdit' : (ctx.is_polsek ? 'Polsek' : 'Polres');
        var roleIcon  = ctx.is_subdit_sp ? 'fa-star' : (ctx.is_polsek ? 'fa-building' : 'fa-shield');

        el.innerHTML = ''
            + '<div class="sp-profile-card">'
            +   '<div class="sp-profile-photo-wrap">'
            +     '<div class="sp-profile-photo" id="sp-profile-photo-el">'
            +       (photoSrc ? '<img id="sp-profile-img" src="' + photoSrc + '" alt="foto" onerror="this.style.display=\'none\'">' : getInitials(ctx.user_name))
            +     '</div>'
            +     '<button class="sp-profile-photo-edit" id="sp-photo-edit-btn" title="Ganti foto profil">'
            +       '<i class="fa fa-camera"></i>'
            +     '</button>'
            +     '<input type="file" id="sp-photo-input" accept="image/*" style="display:none"/>'
            +   '</div>'
            +   '<div class="sp-profile-info">'
            +     '<div class="sp-profile-name">' + _esc(ctx.user_name || '-') + '</div>'
            +     '<div class="sp-profile-login"><i class="fa fa-user" style="margin-right:4px;opacity:.7;"></i>' + _esc(ctx.user_login || '') + '</div>'
            +     '<div class="sp-profile-badges">'
            +       '<span class="sp-profile-badge"><i class="fa ' + roleIcon + '"></i> ' + roleLabel + '</span>'
            +       (ctx.polres_name ? '<span class="sp-profile-badge"><i class="fa fa-map-marker"></i> ' + _esc(ctx.polres_name) + '</span>' : '')
            +       (ctx.is_polsek && ctx.polsek_name ? '<span class="sp-profile-badge"><i class="fa fa-building"></i> ' + _esc(ctx.polsek_name) + '</span>' : '')
            +     '</div>'
            +   '</div>'
            + '</div>'
            + '<div class="sp-card">'
            +   '<div class="sp-card-title"><i class="fa fa-map-marker"></i> Wilayah Hukum</div>'
            +   '<div class="sp-info-row"><span class="sp-info-label">Polres</span><span class="sp-info-value">' + _esc(ctx.polres_name || '-') + '</span></div>'
            +   (ctx.is_polsek ? '<div class="sp-info-row"><span class="sp-info-label">Polsek</span><span class="sp-info-value">' + _esc(ctx.polsek_name || '-') + '</span></div>' : '')
            +   '<div class="sp-info-row"><span class="sp-info-label">Level Akses</span><span class="sp-info-value"><span class="sp-role-chip"><i class="fa ' + roleIcon + '"></i> ' + roleLabel + '</span></span></div>'
            + '</div>'
            + '<button class="sp-btn-primary" id="sp-logout-btn" style="margin-top:8px;">'
            +   '<i class="fa fa-sign-out"></i> Keluar dari Akun'
            + '</button>';

        // Edit foto profil
        document.getElementById('sp-photo-edit-btn').addEventListener('click', function () {
            document.getElementById('sp-photo-input').click();
        });
        document.getElementById('sp-photo-input').addEventListener('change', function () {
            if (!this.files || !this.files[0]) return;
            var file = this.files[0];
            var editBtn = document.getElementById('sp-photo-edit-btn');
            editBtn.innerHTML = '<i class="fa fa-circle-o-notch fa-spin"></i>';
            editBtn.disabled  = true;
            var reader = new FileReader();
            reader.onload = function (e) {
                rpc('/petadigi/api/update_photo', { foto_data: e.target.result })
                    .then(function (res) {
                        if (res && res.success) {
                            var img = document.getElementById('sp-profile-img');
                            if (!img) {
                                var photoEl = document.getElementById('sp-profile-photo-el');
                                photoEl.innerHTML = '';
                                img = document.createElement('img');
                                img.id = 'sp-profile-img';
                                img.alt = 'foto';
                                img.style.width = '100%'; img.style.height = '100%'; img.style.objectFit = 'cover'; img.style.borderRadius = '50%';
                                photoEl.appendChild(img);
                            }
                            img.src = e.target.result;
                            showToast('Foto profil diperbarui', 'success');
                        } else { showToast(res && res.error || 'Gagal memperbarui foto', 'error'); }
                    })
                    .catch(function () { showToast('Gagal terhubung ke server', 'error'); })
                    .finally(function () { editBtn.innerHTML = '<i class="fa fa-camera"></i>'; editBtn.disabled = false; });
            };
            reader.readAsDataURL(file);
        });

        // Logout dengan konfirmasi
        document.getElementById('sp-logout-btn').addEventListener('click', function () {
            _confirmLogout();
        });
    }

    function _confirmLogout() {
        var existing = document.getElementById('sp-logout-overlay');
        if (existing) existing.remove();
        var overlay = document.createElement('div');
        overlay.id = 'sp-logout-overlay';
        overlay.className = 'sp-confirm-overlay';
        overlay.innerHTML = ''
            + '<div class="sp-confirm-box">'
            +   '<div class="sp-confirm-icon" style="color:var(--sp-primary);"><i class="fa fa-sign-out"></i></div>'
            +   '<div class="sp-confirm-msg">Yakin ingin keluar dari akun?</div>'
            +   '<div class="sp-confirm-actions">'
            +     '<button class="sp-btn-secondary sp-confirm-cancel">Batal</button>'
            +     '<button class="sp-btn-primary sp-confirm-ok" style="flex:1.4;"><i class="fa fa-sign-out"></i> Keluar</button>'
            +   '</div>'
            + '</div>';
        document.body.appendChild(overlay);
        overlay.querySelector('.sp-confirm-cancel').addEventListener('click', function () { overlay.remove(); });
        overlay.querySelector('.sp-confirm-ok').addEventListener('click', function () { window.location.href = '/petadigi/logout'; });
        overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
    }

    // ════════════════════════════════════════════════════════════════════════
    //  PATROLI TAB  —  list → create → detail → titik flow
    // ════════════════════════════════════════════════════════════════════════

    var _pt = {
        rendered:     false,
        listOffset:   0,
        listPerPage:  20,
        listLoading:  false,
        listDone:     false,
        listObserver: null,
        listFilter:   null,
        filterOpen:     false,
        filterKabupaten: null,
        filterState:    null,
        detailId:     null,
        userPos:      null,
        map:          null,
        marker:       null,
        titikFile:    null,
    };

    // ── Main entry ───────────────────────────────────────────────────────────
    function _renderPatroliOnce() {
        if (_pt.rendered) return;
        _pt.rendered = true;

        var el = document.getElementById('patroli-content');
        if (!el) return;

        el.innerHTML = '<div id="pt-records-view"></div>'
            + '<div id="pt-create-view" style="display:none"></div>'
            + '<div id="pt-detail-view" style="display:none"></div>'
            + '<div id="pt-titik-view"  style="display:none"></div>';

        var tabEl = document.getElementById('tab-patroli');
        if (tabEl && !document.getElementById('pt-fab-add')) {
            var fab = document.createElement('button');
            fab.className = 'sp-fab';
            fab.id        = 'pt-fab-add';
            fab.title     = 'Tambah Patroli';
            fab.innerHTML = '<i class="fa fa-plus"></i>';
            fab.style.background = 'var(--sp-primary)';
            fab.addEventListener('click', _openPatroliCreate);
            tabEl.appendChild(fab);
        }
        _showPatroliList();
    }

    function _showPtFab() { var f = document.getElementById('pt-fab-add'); if (f) f.classList.add('sp-fab--show'); }
    function _hidePtFab() { var f = document.getElementById('pt-fab-add'); if (f) f.classList.remove('sp-fab--show'); }

    // ── Record List ──────────────────────────────────────────────────────────
    function _showPatroliList() {
        _showAppbar();
        ['pt-create-view', 'pt-detail-view', 'pt-titik-view'].forEach(function (id) {
            var el = document.getElementById(id); if (el) el.style.display = 'none';
        });
        var rv = document.getElementById('pt-records-view');
        if (!rv) return;
        rv.style.display = '';
        _showPtFab();
        _pt.listOffset  = 0;
        _pt.listLoading = false;
        _pt.listDone    = false;
        if (_pt.listObserver) { _pt.listObserver.disconnect(); _pt.listObserver = null; }
        rv.innerHTML = '<div class="sp-records-loading"><i class="fa fa-spinner fa-spin"></i><span>Memuat data...</span></div>';
        _ptLoadPage(rv, true);
    }

    function _ptLoadPage(rv, initial) {
        if (_pt.listLoading || _pt.listDone) return;
        _pt.listLoading = true;
        rpc('/petadigi/api/patroli/list', { offset: _pt.listOffset, limit: _pt.listPerPage, filter: _pt.listFilter || null, kabupaten_id: _pt.filterKabupaten || null, state: _pt.filterState || null })
            .then(function (records) {
                _pt.listLoading = false;
                records = records || [];
                _pt.listOffset += records.length;
                if (records.length < _pt.listPerPage) _pt.listDone = true;
                if (initial) { _ptBuildList(rv, records); } else { _ptAppendItems(rv, records); }
            })
            .catch(function () {
                _pt.listLoading = false;
                if (initial) rv.innerHTML = '<div class="sp-records-loading" style="color:var(--sp-error)"><i class="fa fa-exclamation-circle"></i><span>Gagal memuat data</span></div>';
            });
    }

    function _ptRecordHtml(r) {
        var isProses = r.state === 'PROSES';
        return '<button class="sp-record-item" data-id="' + r.id + '">'
            + '<div class="sp-record-ind ' + (isProses ? 'sp-record-ind--proses' : 'sp-record-ind--selesai') + '" style="background:var(--sp-primary);"></div>'
            + '<div class="sp-record-body">'
            +   '<div class="sp-record-head">'
            +     '<span class="sp-record-code">' + _esc(r.code) + '</span>'
            +     '<span class="sp-badge ' + (isProses ? 'sp-badge--proses-lw' : 'sp-badge--selesai-lw') + '">' + (isProses ? 'PROSES' : 'SELESAI') + '</span>'
            +   '</div>'
            +   '<div class="sp-record-meta" style="color:var(--sp-text-muted,#888);font-size:11px;margin-bottom:2px;">'
            +     '<i class="fa fa-shield"></i> ' + _esc((r.polres_id && r.polres_id[1]) || '—')
            +     (r.kabupaten_id ? '<span class="sp-record-sep">·</span><i class="fa fa-map"></i> ' + _esc(r.kabupaten_id[1]) : '')
            +   '</div>'
            +   '<div class="sp-record-lokasi" style="color:var(--sp-primary);font-size:12px;">'
            +     '<i class="fa fa-map-marker"></i> ' + (r.lokasi_count || 0) + ' titik'
            +     '  <i class="fa fa-users" style="margin-left:8px;"></i> ' + (r.personel_count || 0) + ' personel'
            +   '</div>'
            +   '<div class="sp-record-meta"><i class="fa fa-clock-o"></i> ' + _fmtDtDisplay(r.tanggal_mulai) + '</div>'
            + '</div>'
            + '<i class="fa fa-chevron-right sp-record-arrow"></i>'
            + '</button>';
    }

    function _ptWireClick(btn, rv) {
        btn.addEventListener('click', function () {
            rv.style.display = 'none'; _hidePtFab();
            _openPatroliDetail(parseInt(btn.dataset.id));
        });
    }

    function _ptSetupSentinel(rv) {
        if (_pt.listObserver) { _pt.listObserver.disconnect(); _pt.listObserver = null; }
        var list = rv.querySelector('.sp-record-list');
        if (!list || _pt.listDone) return;
        var s = document.createElement('div');
        s.className = 'sp-list-sentinel';
        s.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Memuat...';
        list.appendChild(s);
        _pt.listObserver = new IntersectionObserver(function (entries) {
            if (entries[0].isIntersecting && !_pt.listLoading && !_pt.listDone) _ptLoadPage(rv, false);
        }, { threshold: 0.1 });
        _pt.listObserver.observe(s);
    }

    function _ptBuildList(rv, records) {
        var hasActive = _pt.filterKabupaten || _pt.filterState;
        var filterBtnHtml = '<button class="sp-filter-btn' + (_pt.filterOpen ? ' sp-filter-btn--active' : '') + '" id="pt-filter-btn">'
            + '<i class="fa fa-filter"></i>'
            + (hasActive ? '<span class="sp-filter-dot"></span>' : '')
            + '</button>';
        var headerRight = '<div class="sp-header-right">'
            + '<span class="sp-records-count" id="pt-records-count">' + _pt.listOffset + (_pt.listDone ? '' : '+') + '</span>'
            + filterBtnHtml
            + '</div>';
        if (!records.length) {
            rv.innerHTML = '<div class="sp-records-header">'
                + '<span class="sp-records-title"><i class="fa fa-car" style="color:var(--sp-primary)"></i> Patroli</span>'
                + headerRight
                + '</div>'
                + _filterPanelHtml('pt')
                + '<div class="sp-records-empty" style="margin-top:24px;">'
                + '<i class="fa fa-car" style="color:var(--sp-primary);font-size:32px;"></i>'
                + '<div class="sp-records-empty-title">' + (hasActive ? 'Tidak ada data sesuai filter' : 'Belum ada Patroli') + '</div>'
                + '<div class="sp-records-empty-sub">' + (hasActive ? 'Coba ubah atau hapus filter' : 'Tap tombol <b>+</b> untuk membuat patroli baru') + '</div>'
                + '</div>';
            _wireFilterEvents(rv, 'pt');
            return;
        }
        var html = '<div class="sp-records-header">'
            + '<span class="sp-records-title"><i class="fa fa-car" style="color:var(--sp-primary)"></i> Patroli</span>'
            + headerRight
            + '</div>'
            + _filterPanelHtml('pt')
            + '<div class="sp-record-list">';
        records.forEach(function (r) { html += _ptRecordHtml(r); });
        html += '</div>';
        rv.innerHTML = html;
        _wireFilterEvents(rv, 'pt');
        rv.querySelectorAll('.sp-record-item').forEach(function (btn) { _ptWireClick(btn, rv); });
        if (!_pt.listDone) _ptSetupSentinel(rv);
    }

    function _ptAppendItems(rv, records) {
        var list = rv.querySelector('.sp-record-list'); if (!list) return;
        var s = list.querySelector('.sp-list-sentinel'); if (s) s.remove();
        records.forEach(function (r) {
            var tmp = document.createElement('template');
            tmp.innerHTML = _ptRecordHtml(r);
            var btn = tmp.content.firstElementChild;
            _ptWireClick(btn, rv);
            list.appendChild(btn);
        });
        var cnt = document.getElementById('pt-records-count');
        if (cnt) cnt.textContent = _pt.listOffset + (_pt.listDone ? '' : '+');
        if (!_pt.listDone) _ptSetupSentinel(rv);
    }

    // ── Create Form ──────────────────────────────────────────────────────────
    function _openPatroliCreate() {
        _hideAppbar(); _hidePtFab();
        document.getElementById('pt-records-view').style.display = 'none';
        var fv = document.getElementById('pt-create-view');
        fv.style.display = '';
        _buildPatroliCreate(fv);
    }

    function _backFromCreate() {
        document.getElementById('pt-create-view').style.display = 'none';
        _showPatroliList();
    }

    function _buildPatroliCreate(fv) {
        var ctx = window._SP_CTX || {};

        // Polres — disembunyikan untuk subdit SP (auto-assign ke Polda di backend)
        var ptPolresRow = ctx.is_subdit_sp ? '' : (
            '<div class="sp-field"><label class="sp-label">Polres</label>'
            + '<div class="sp-input-wrap"><i class="fa fa-shield sp-input-icon"></i>'
            + '<input type="text" class="sp-input" value="' + _esc(ctx.polres_name || '') + '" readonly/></div></div>'
        );

        // Polsek — disembunyikan untuk subdit SP (selalu Polda, tidak punya polsek)
        var polsekRow = ctx.is_subdit_sp ? '' : (ctx.is_polsek
            ? '<div class="sp-field"><label class="sp-label">Polsek</label>'
              + '<div class="sp-input-wrap"><i class="fa fa-building sp-input-icon"></i>'
              + '<input type="text" class="sp-input" value="' + _esc(ctx.polsek_name || '') + '" readonly/></div></div>'
            : (function () {
                var opts = '<option value="">— Pilih Polsek (opsional) —</option>';
                (ctx.polsek_list || []).forEach(function (p) { opts += '<option value="' + p.id + '">' + _esc(p.name) + '</option>'; });
                return '<div class="sp-field"><label class="sp-label">Polsek</label>'
                    + '<div class="sp-input-wrap"><i class="fa fa-building sp-input-icon"></i>'
                    + '<select class="sp-select" id="pt-polsek">' + opts + '</select></div></div>';
            })());

        var kabOpts = '<option value="">— Pilih Kabupaten —</option>';
        (ctx.kabupaten_list || []).forEach(function (k) { kabOpts += '<option value="' + k.id + '">' + _esc(k.name) + '</option>'; });

        var now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        var nowStr = now.toISOString().slice(0, 16);

        fv.innerHTML = ''
            + '<div class="sp-form-topbar" style="background:var(--sp-primary);">'
            +   '<button type="button" class="sp-back-btn" id="pt-create-back"><i class="fa fa-arrow-left"></i></button>'
            +   '<div class="sp-form-topbar-info"><div class="sp-form-topbar-name"><i class="fa fa-plus"></i> Buat Patroli Baru</div></div>'
            + '</div>'
            + '<div class="sp-card">'
            +   '<div class="sp-card-title" style="color:var(--sp-primary);"><i class="fa fa-map-marker"></i> Wilayah</div>'
            +   ptPolresRow
            +   polsekRow
            +   '<div class="sp-field"><label class="sp-label">Kabupaten <span class="sp-req">*</span></label>'
            +     '<div class="sp-input-wrap"><i class="fa fa-map sp-input-icon"></i>'
            +     '<select class="sp-select" id="pt-kabupaten">' + kabOpts + '</select></div></div>'
            +   '<div class="sp-row-2">'
            +     '<div class="sp-field"><label class="sp-label">Kecamatan <span class="sp-req">*</span></label>'
            +       '<div class="sp-input-wrap"><i class="fa fa-map-o sp-input-icon"></i>'
            +       '<select class="sp-select" id="pt-kecamatan" disabled><option value="">— Pilih Kabupaten —</option></select></div></div>'
            +     '<div class="sp-field"><label class="sp-label">Desa / Kelurahan <span class="sp-req">*</span></label>'
            +       '<div class="sp-input-wrap"><i class="fa fa-home sp-input-icon"></i>'
            +       '<select class="sp-select" id="pt-desa" disabled><option value="">— Pilih Kecamatan —</option></select></div></div>'
            +   '</div>'
            + '</div>'
            + '<div class="sp-card">'
            +   '<div class="sp-card-title" style="color:var(--sp-primary);"><i class="fa fa-clock-o"></i> Waktu Mulai</div>'
            +   '<div class="sp-field"><label class="sp-label">Tgl &amp; Jam Mulai <span class="sp-req">*</span></label>'
            +     '<input type="datetime-local" class="sp-input sp-input--bare" id="pt-tgl-mulai" value="' + nowStr + '"/></div>'
            + '</div>'
            + '<div class="sp-card">'
            +   '<div class="sp-card-title" style="color:var(--sp-primary);"><i class="fa fa-pencil"></i> Keterangan</div>'
            +   '<textarea class="sp-textarea" id="pt-keterangan" rows="3" placeholder="Keterangan tambahan (opsional)..."></textarea>'
            + '</div>'
            + '<div class="sp-submit-bar">'
            +   '<button type="button" class="sp-btn-primary" id="pt-create-submit" style="background:var(--sp-primary);">'
            +     '<i class="fa fa-paper-plane"></i><span id="pt-create-label">Buat Patroli</span>'
            +   '</button>'
            + '</div>';

        document.getElementById('pt-create-back').addEventListener('click', _backFromCreate);

        document.getElementById('pt-kabupaten').addEventListener('change', function () {
            var val = this.value;
            var kecEl = document.getElementById('pt-kecamatan'), desaEl = document.getElementById('pt-desa');
            kecEl.innerHTML = '<option value="">— Memuat... —</option>'; kecEl.disabled = true;
            desaEl.innerHTML = '<option value="">— Pilih Kecamatan —</option>'; desaEl.disabled = true;
            if (val) {
                rpc('/petadigi/api/kecamatan', { kabupaten_id: val }).then(function (l) { _fillSelect('pt-kecamatan', l, 'name', '— Pilih Kecamatan —'); });
            }
        });
        document.getElementById('pt-kecamatan').addEventListener('change', function () {
            var val = this.value;
            var desaEl = document.getElementById('pt-desa');
            desaEl.innerHTML = '<option value="">— Memuat... —</option>'; desaEl.disabled = true;
            if (val) {
                rpc('/petadigi/api/desa', { kecamatan_id: val }).then(function (l) { _fillSelect('pt-desa', l, 'name', '— Pilih Desa —'); });
            }
        });

        if (ctx.is_polsek && ctx.kabupaten_list && ctx.kabupaten_list.length === 1) {
            var kabEl = document.getElementById('pt-kabupaten');
            if (kabEl) {
                kabEl.value = ctx.kabupaten_list[0].id;
                _loadKecamatan(ctx.kabupaten_list[0].id, ctx.kecamatan_list || []);
            }
        }

        document.getElementById('pt-create-submit').addEventListener('click', function () {
            var kabId  = document.getElementById('pt-kabupaten').value;
            var kecId  = document.getElementById('pt-kecamatan').value;
            var tglMul = document.getElementById('pt-tgl-mulai').value;
            if (!kabId)  { showToast('Pilih Kabupaten terlebih dahulu', 'error'); return; }
            if (!kecId)  { showToast('Pilih Kecamatan terlebih dahulu', 'error'); return; }
            var desaId = document.getElementById('pt-desa').value;
            if (!desaId) { showToast('Pilih Desa/Kelurahan terlebih dahulu', 'error'); return; }
            if (!tglMul) { showToast('Isi Tanggal & Jam Mulai', 'error'); return; }
            var btn = document.getElementById('pt-create-submit');
            var lbl = document.getElementById('pt-create-label');
            btn.disabled = true;
            lbl.innerHTML = '<span class="sp-spinner"></span> Menyimpan...';
            var params = {
                kabupaten_id:  parseInt(kabId),
                kecamatan_id:  parseInt(kecId),
                desa_id:       parseInt(document.getElementById('pt-desa').value) || null,
                tanggal_mulai: _fmtDatetimeLocal(tglMul),
                keterangan:    document.getElementById('pt-keterangan').value || '',
            };
            if (!ctx.is_polsek && !ctx.is_subdit_sp) {
                var psVal = document.getElementById('pt-polsek') && document.getElementById('pt-polsek').value;
                if (psVal) params.polsek_id = parseInt(psVal);
            }
            rpc('/petadigi/api/patroli/create', params).then(function (res) {
                if (res && res.success) {
                    showToast(res.code + ' berhasil dibuat!', 'success');
                    document.getElementById('pt-create-view').style.display = 'none';
                    _openPatroliDetail(res.record_id);
                } else {
                    showToast(res.error || 'Gagal menyimpan', 'error');
                    btn.disabled = false; lbl.textContent = 'Buat Patroli';
                }
            }).catch(function () {
                showToast('Gagal terhubung ke server', 'error');
                btn.disabled = false; lbl.textContent = 'Buat Patroli';
            });
        });
    }

    // ── Detail Patroli ───────────────────────────────────────────────────────
    function _openPatroliDetail(recordId) {
        _pt.detailId = recordId;
        _hideAppbar(); _hidePtFab();
        ['pt-records-view', 'pt-create-view', 'pt-titik-view'].forEach(function (id) {
            var el = document.getElementById(id); if (el) el.style.display = 'none';
        });
        var dv = document.getElementById('pt-detail-view');
        dv.style.display = '';
        dv.innerHTML = '<div class="sp-detail-loading"><i class="fa fa-spinner fa-spin"></i><span>Memuat data...</span></div>';
        rpc('/petadigi/api/patroli/record', { record_id: recordId }).then(function (data) {
            _buildPatroliDetail(dv, data);
        }).catch(function () {
            dv.innerHTML = '<div class="sp-detail-loading" style="color:var(--sp-error);"><i class="fa fa-exclamation-circle"></i><span>Gagal memuat data</span></div>';
        });
    }

    function _backFromPatroliDetail() {
        if (_pt.map) { _pt.map.remove(); _pt.map = null; _pt.marker = null; }
        document.getElementById('pt-detail-view').style.display = 'none';
        _pt.detailId = null;
        _showPatroliList();
    }

    function _buildPatroliDetail(dv, data) {
        var isProses = data.state === 'PROSES';
        var badgeCls = isProses ? 'sp-badge--proses' : 'sp-badge--selesai';

        var personelRows = '';
        (data.personel || []).forEach(function (p) {
            personelRows += '<div class="sp-personel-row" id="pt-pr-' + p.id + '">'
                + '<div class="sp-personel-avatar" style="background:#e8f8f5;color:var(--sp-primary);"><i class="fa fa-user"></i></div>'
                + '<div class="sp-personel-name">' + _esc(p.nama_lengkap) + '</div>'
                + '<button class="sp-personel-del" data-pid="' + p.id + '"><i class="fa fa-times"></i></button>'
                + '</div>';
        });

        var lokasiRows = '';
        (data.lokasi || []).forEach(function (l, idx) {
            lokasiRows += '<div class="sp-titik-item" id="pt-lok-' + l.id + '">'
                + '<div class="sp-titik-num">' + (idx + 1) + '</div>'
                + '<button class="sp-titik-body sp-titik-body--btn"'
                +   ' data-lid="' + l.id + '"'
                +   ' data-lat="' + (l.latitude || 0) + '"'
                +   ' data-lng="' + (l.longitude || 0) + '"'
                +   ' data-tanggal="' + _esc(l.tanggal || '') + '"'
                +   ' data-catatan="' + _esc(l.catatan || '') + '"'
                +   ' data-has-foto="' + (l.has_foto ? '1' : '0') + '">'
                +   '<div class="sp-titik-time"><i class="fa fa-clock-o"></i> ' + _fmtDtDisplay(l.tanggal)
                +     (l.has_foto ? ' <i class="fa fa-camera" style="color:var(--sp-primary);margin-left:6px;"></i>' : '')
                +   '</div>'
                +   '<div class="sp-titik-coords"><i class="fa fa-crosshairs"></i> '
                +     (l.latitude ? l.latitude.toFixed(5) + ', ' + l.longitude.toFixed(5) : '—')
                +   '</div>'
                +   (l.catatan ? '<div class="sp-titik-catatan">' + _esc(l.catatan) + '</div>' : '')
                + '</button>'
                + '<button class="sp-personel-del" data-lid="' + l.id + '"><i class="fa fa-times"></i></button>'
                + '</div>';
        });

        dv.innerHTML = ''
            + '<div class="sp-form-topbar" style="background:var(--sp-primary);">'
            +   '<button class="sp-back-btn" id="pt-detail-back"><i class="fa fa-arrow-left"></i></button>'
            +   '<div class="sp-form-topbar-info">'
            +     '<div class="sp-form-topbar-name">' + _esc(data.code) + '</div>'
            +     '<div class="sp-form-topbar-code">' + _esc(data.kecamatan_nama || '—') + (data.kabupaten_nama ? ' · ' + _esc(data.kabupaten_nama) : '') + '</div>'
            +   '</div>'
            +   '<span class="sp-badge ' + badgeCls + '">' + (isProses ? 'PROSES' : 'SELESAI') + '</span>'
            + '</div>'

            + '<div class="sp-card">'
            +   '<div class="sp-card-title" style="color:var(--sp-primary);"><i class="fa fa-info-circle"></i> Info Patroli</div>'
            +   (data.polsek_nama ? '<div class="sp-info-row"><span class="sp-info-label">Polsek</span><span class="sp-info-value">' + _esc(data.polsek_nama) + '</span></div>' : '')
            +   '<div class="sp-info-row"><span class="sp-info-label">Kabupaten</span><span class="sp-info-value">' + _esc(data.kabupaten_nama || '—') + '</span></div>'
            +   '<div class="sp-info-row"><span class="sp-info-label">Kecamatan</span><span class="sp-info-value">' + _esc(data.kecamatan_nama || '—') + '</span></div>'
            +   (data.desa_nama ? '<div class="sp-info-row"><span class="sp-info-label">Desa</span><span class="sp-info-value">' + _esc(data.desa_nama) + '</span></div>' : '')
            +   '<div class="sp-info-row"><span class="sp-info-label">Tgl Mulai</span><span class="sp-info-value">' + _fmtDtDisplay(data.tanggal_mulai) + '</span></div>'
            +   (data.tanggal_selesai ? '<div class="sp-info-row"><span class="sp-info-label">Tgl Selesai</span><span class="sp-info-value">' + _fmtDtDisplay(data.tanggal_selesai) + '</span></div>' : '')
            +   (data.keterangan ? '<div class="sp-info-row sp-info-row--full"><span class="sp-info-label">Keterangan</span><span class="sp-info-value">' + _esc(data.keterangan) + '</span></div>' : '')
            + '</div>'

            + '<div class="sp-card">'
            +   '<div class="sp-card-title" style="color:var(--sp-primary);display:flex;align-items:center;justify-content:space-between;">'
            +     '<span><i class="fa fa-map-marker"></i> Titik Lokasi'
            +       '  <span class="sp-personel-count" id="pt-lokasi-count">' + (data.lokasi || []).length + '</span>'
            +     '</span>'
            +     '<button class="sp-btn-add-titik" id="pt-titik-add-btn" style="background:var(--sp-primary);">'
            +       '<i class="fa fa-plus"></i> Tambah'
            +     '</button>'
            +   '</div>'
            +   '<div id="pt-lokasi-list">' + (lokasiRows || '<div class="sp-personel-empty">Belum ada titik lokasi</div>') + '</div>'
            + '</div>'

            + '<div class="sp-card">'
            +   '<div class="sp-card-title" style="color:var(--sp-primary);"><i class="fa fa-users"></i> Personel'
            +     '  <span class="sp-personel-count" id="pt-personel-count">' + (data.personel || []).length + '</span>'
            +   '</div>'
            +   '<div class="sp-personel-list" id="pt-personel-list">' + (personelRows || '<div class="sp-personel-empty">Belum ada personel</div>') + '</div>'
            +   '<div class="sp-personel-add-form">'
            +     '<input type="text" class="sp-input sp-input--bare sp-input--upper" id="pt-p-nama" placeholder="Nama lengkap *" autocapitalize="characters" style="width:100%;margin-bottom:8px;"/>'
            +     '<div style="display:flex;gap:8px;align-items:center;">'
            +       '<input type="text" class="sp-input sp-input--bare sp-input--upper" id="pt-p-pangkat" placeholder="Pangkat (opsional)" autocapitalize="characters" style="flex:1;"/>'
            +       '<button class="sp-btn-add-personel" id="pt-p-add" style="background:var(--sp-primary);"><i class="fa fa-plus"></i></button>'
            +     '</div>'
            +   '</div>'
            + '</div>'

            + (isProses
                ? '<div class="sp-card sp-selesai-card">'
                +   '<div class="sp-card-title" style="color:var(--sp-success);"><i class="fa fa-check-circle"></i> Selesaikan Patroli</div>'
                +   '<div id="pt-selesai-info" style="font-size:13px;color:var(--sp-on-surf-var);margin-bottom:14px;">Tandai patroli ini sebagai selesai dan catat waktu selesainya.</div>'
                +   '<div id="pt-selesai-form" style="display:none;">'
                +     '<div class="sp-field"><label class="sp-label">Tgl &amp; Jam Selesai <span class="sp-req">*</span></label>'
                +       '<input type="datetime-local" class="sp-input sp-input--bare" id="pt-tgl-selesai"/></div>'
                +     '<div style="display:flex;gap:10px;margin-top:4px;">'
                +       '<button class="sp-btn-secondary" id="pt-selesai-cancel" style="flex:1;">Batal</button>'
                +       '<button class="sp-btn-selesai" id="pt-selesai-confirm" style="flex:2;">'
                +         '<i class="fa fa-check"></i> <span id="pt-selesai-label">Konfirmasi Selesai</span>'
                +       '</button>'
                +     '</div>'
                +   '</div>'
                +   '<button class="sp-btn-selesai" id="pt-selesai-trigger" style="width:100%;">'
                +     '<i class="fa fa-check-circle"></i> Set Selesai'
                +   '</button>'
                + '</div>'
                : '');

        document.getElementById('pt-detail-back').addEventListener('click', _backFromPatroliDetail);
        document.getElementById('pt-titik-add-btn').addEventListener('click', _openTambahTitik);

        dv.querySelectorAll('[data-pid]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var pid = parseInt(this.dataset.pid);
                _confirmDialog('Hapus personel ini dari daftar patroli?', function () { _ptRemovePersonel(pid); });
            });
        });

        dv.querySelectorAll('.sp-titik-body--btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                _showLokasiDetail({
                    id:       parseInt(this.dataset.lid),
                    lat:      parseFloat(this.dataset.lat),
                    lng:      parseFloat(this.dataset.lng),
                    tanggal:  this.dataset.tanggal,
                    catatan:  this.dataset.catatan,
                    has_foto: this.dataset.hasFoto === '1',
                });
            });
        });

        dv.querySelectorAll('[data-lid]').forEach(function (btn) {
            if (btn.classList.contains('sp-titik-body--btn')) return;
            btn.addEventListener('click', function () {
                var lid = parseInt(this.dataset.lid);
                _confirmDialog('Hapus titik lokasi ini dari daftar patroli?', function () { _ptRemoveLokasi(lid); });
            });
        });

        document.getElementById('pt-p-add').addEventListener('click', function () {
            var nama    = (document.getElementById('pt-p-nama').value || '').trim().toUpperCase();
            var pangkat = (document.getElementById('pt-p-pangkat').value || '').trim().toUpperCase();
            if (!nama) { showToast('Isi nama personel', 'error'); return; }
            var btn = this; btn.disabled = true;
            rpc('/petadigi/api/patroli/personel_add', { record_id: _pt.detailId, nama: nama, pangkat: pangkat })
                .then(function (res) {
                    if (res.success) {
                        _ptAppendPersonelRow(res.id, res.nama_lengkap);
                        document.getElementById('pt-p-nama').value    = '';
                        document.getElementById('pt-p-pangkat').value = '';
                        showToast('Personel ditambahkan', 'success');
                    } else { showToast(res.error || 'Gagal', 'error'); }
                }).catch(function () { showToast('Gagal', 'error'); })
                .finally(function () { btn.disabled = false; });
        });

        if (isProses) {
            document.getElementById('pt-selesai-trigger').addEventListener('click', function () {
                var personelCnt = parseInt(document.getElementById('pt-personel-count').textContent) || 0;
                var lokasiCnt   = parseInt(document.getElementById('pt-lokasi-count').textContent) || 0;
                if (personelCnt === 0) { showToast('Minimal 1 personel wajib ditambahkan sebelum menyelesaikan patroli', 'error'); return; }
                if (lokasiCnt === 0)   { showToast('Minimal 1 titik lokasi wajib ditambahkan sebelum menyelesaikan patroli', 'error'); return; }
                this.style.display = 'none';
                document.getElementById('pt-selesai-info').style.display = 'none';
                document.getElementById('pt-selesai-form').style.display = '';
                var n = new Date(); n.setMinutes(n.getMinutes() - n.getTimezoneOffset());
                document.getElementById('pt-tgl-selesai').value = n.toISOString().slice(0, 16);
            });
            document.getElementById('pt-selesai-cancel').addEventListener('click', function () {
                document.getElementById('pt-selesai-form').style.display    = 'none';
                document.getElementById('pt-selesai-info').style.display    = '';
                document.getElementById('pt-selesai-trigger').style.display = '';
            });
            document.getElementById('pt-selesai-confirm').addEventListener('click', function () {
                var tgl = document.getElementById('pt-tgl-selesai').value;
                if (!tgl) { showToast('Isi tanggal selesai', 'error'); return; }
                var btn = this, lbl = document.getElementById('pt-selesai-label');
                btn.disabled = true; lbl.innerHTML = '<span class="sp-spinner"></span> Menyimpan...';
                rpc('/petadigi/api/patroli/set_selesai', {
                    record_id: _pt.detailId, tanggal_selesai: tgl.replace('T', ' ') + ':00',
                }).then(function (res) {
                    if (res.success) {
                        showToast('Patroli berhasil diselesaikan!', 'success');
                        rpc('/petadigi/api/patroli/record', { record_id: _pt.detailId }).then(function (d) { _buildPatroliDetail(dv, d); });
                    } else {
                        showToast(res.error || 'Gagal', 'error');
                        btn.disabled = false; lbl.textContent = 'Konfirmasi Selesai';
                    }
                }).catch(function () { showToast('Gagal', 'error'); btn.disabled = false; lbl.textContent = 'Konfirmasi Selesai'; });
            });
        }
    }

    function _ptAppendPersonelRow(pid, namaLengkap) {
        var list = document.getElementById('pt-personel-list'); if (!list) return;
        var empty = list.querySelector('.sp-personel-empty'); if (empty) empty.remove();
        var div = document.createElement('div');
        div.className = 'sp-personel-row'; div.id = 'pt-pr-' + pid;
        div.innerHTML = '<div class="sp-personel-avatar" style="background:#e8f8f5;color:var(--sp-primary);"><i class="fa fa-user"></i></div>'
            + '<div class="sp-personel-name">' + _esc(namaLengkap) + '</div>'
            + '<button class="sp-personel-del" data-pid="' + pid + '"><i class="fa fa-times"></i></button>';
        div.querySelector('.sp-personel-del').addEventListener('click', function () {
            var pid2 = parseInt(this.dataset.pid);
            _confirmDialog('Hapus personel ini dari daftar patroli?', function () { _ptRemovePersonel(pid2); });
        });
        list.appendChild(div);
        var cnt = document.getElementById('pt-personel-count');
        if (cnt) cnt.textContent = list.querySelectorAll('.sp-personel-row').length;
    }

    function _ptRemovePersonel(pid) {
        rpc('/petadigi/api/patroli/personel_remove', { personel_id: pid }).then(function (res) {
            if (res.success) {
                var row = document.getElementById('pt-pr-' + pid); if (row) row.remove();
                var list = document.getElementById('pt-personel-list');
                if (list && !list.querySelector('.sp-personel-row')) list.innerHTML = '<div class="sp-personel-empty">Belum ada personel</div>';
                var cnt = document.getElementById('pt-personel-count');
                if (cnt && list) cnt.textContent = list.querySelectorAll('.sp-personel-row').length;
                showToast('Personel dihapus', 'info');
            } else { showToast(res.error || 'Gagal', 'error'); }
        }).catch(function () { showToast('Gagal', 'error'); });
    }

    function _ptRemoveLokasi(lid) {
        rpc('/petadigi/api/patroli/lokasi_remove', { lokasi_id: lid }).then(function (res) {
            if (res.success) {
                var row = document.getElementById('pt-lok-' + lid); if (row) row.remove();
                var list = document.getElementById('pt-lokasi-list');
                if (list && !list.querySelector('.sp-titik-item')) list.innerHTML = '<div class="sp-personel-empty">Belum ada titik lokasi</div>';
                var cnt = document.getElementById('pt-lokasi-count');
                if (cnt && list) cnt.textContent = list.querySelectorAll('.sp-titik-item').length;
                showToast('Titik lokasi dihapus', 'info');
            } else { showToast(res.error || 'Gagal', 'error'); }
        }).catch(function () { showToast('Gagal', 'error'); });
    }

    // ── Lokasi Detail Popup ──────────────────────────────────────────────────
    function _showLokasiDetail(l) {
        var existing = document.getElementById('sp-lokasi-popup-overlay');
        if (existing) existing.remove();

        var hasFoto = l.has_foto;
        var hasCoords = l.lat && l.lng;

        var overlay = document.createElement('div');
        overlay.id = 'sp-lokasi-popup-overlay';
        overlay.className = 'sp-lokasi-popup-overlay';
        overlay.innerHTML = ''
            + '<div class="sp-lokasi-popup">'
            +   '<div class="sp-lokasi-popup-header">'
            +     '<div class="sp-lokasi-popup-title"><i class="fa fa-map-marker" style="color:var(--sp-primary);"></i> Detail Titik Lokasi</div>'
            +     '<button class="sp-lokasi-popup-close" id="sp-lok-close"><i class="fa fa-times"></i></button>'
            +   '</div>'
            +   (hasCoords ? '<div class="sp-lokasi-popup-map" id="sp-lok-map"></div>' : '')
            +   '<div class="sp-lokasi-popup-body">'
            +     '<div class="sp-lokasi-popup-meta">'
            +       '<div><i class="fa fa-clock-o"></i> ' + _fmtDtDisplay(l.tanggal) + '</div>'
            +       (hasCoords ? '<div><i class="fa fa-crosshairs"></i> ' + l.lat.toFixed(6) + ', ' + l.lng.toFixed(6) + '</div>' : '')
            +     '</div>'
            +     (l.catatan ? '<div class="sp-lokasi-popup-catatan"><i class="fa fa-pencil"></i> ' + _esc(l.catatan) + '</div>' : '')
            +     (hasFoto
                    ? '<div class="sp-lokasi-popup-foto-wrap" id="sp-lok-foto-wrap">'
                    +   '<div class="sp-lokasi-popup-foto-spinner"><i class="fa fa-circle-o-notch fa-spin"></i></div>'
                    + '</div>'
                    : '')
            +   '</div>'
            + '</div>';

        document.body.appendChild(overlay);

        var _lokMap = null;
        function _closePopup() {
            if (_lokMap) { _lokMap.remove(); _lokMap = null; }
            overlay.remove();
        }
        document.getElementById('sp-lok-close').addEventListener('click', _closePopup);
        overlay.addEventListener('click', function (e) { if (e.target === overlay) _closePopup(); });

        // Init map
        if (hasCoords) {
            setTimeout(function () {
                var container = document.getElementById('sp-lok-map');
                if (!container || typeof L === 'undefined') return;
                var _IMG = '/petadigi/static/lib/leaflet/images/';
                var icon = L.icon({ iconUrl: _IMG + 'marker-icon-purple.png', shadowUrl: _IMG + 'marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41], shadowAnchor: [12, 41] });
                _lokMap = L.map(container, { zoomControl: true, attributionControl: false, dragging: true, scrollWheelZoom: false });
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(_lokMap);
                _lokMap.setView([l.lat, l.lng], 17);
                L.marker([l.lat, l.lng], { icon: icon }).addTo(_lokMap);
                _lokMap.invalidateSize();
            }, 80);
        }

        // Load foto dynamically
        if (hasFoto) {
            setTimeout(function () {
                var wrap = document.getElementById('sp-lok-foto-wrap');
                if (!wrap) return;
                var img = document.createElement('img');
                img.className = 'sp-lokasi-popup-foto-img';
                img.alt = 'Foto Dokumentasi';
                img.onload = function () {
                    if (img.naturalWidth > 1) {
                        wrap.innerHTML = '';
                        wrap.appendChild(img);
                    } else { wrap.style.display = 'none'; }
                };
                img.onerror = function () { wrap.style.display = 'none'; };
                img.src = '/web/image/petadigi.lokasi_patroli/' + l.id + '/foto';
            }, 100);
        }
    }

    // ── Tambah Titik Lokasi ──────────────────────────────────────────────────
    function _openTambahTitik() {
        document.getElementById('pt-detail-view').style.display = 'none';
        var sv = document.getElementById('pt-titik-view');
        sv.style.display = '';
        _buildTambahTitik(sv);
    }

    function _backFromTitik() {
        if (_pt.map) { _pt.map.remove(); _pt.map = null; _pt.marker = null; }
        _pt.titikFile = null;
        document.getElementById('pt-titik-view').style.display = 'none';
        var dv = document.getElementById('pt-detail-view');
        dv.style.display = '';
        dv.innerHTML = '<div class="sp-detail-loading"><i class="fa fa-spinner fa-spin"></i><span>Memuat data...</span></div>';
        rpc('/petadigi/api/patroli/record', { record_id: _pt.detailId }).then(function (data) {
            _buildPatroliDetail(dv, data);
        }).catch(function () {
            dv.innerHTML = '<div class="sp-detail-loading" style="color:var(--sp-error);"><i class="fa fa-exclamation-circle"></i><span>Gagal memuat data</span></div>';
        });
    }

    function _buildTambahTitik(sv) {
        _pt.titikFile = null;
        var pos = _pt.userPos;
        var latVal = pos ? pos.lat.toFixed(6) : '';
        var lngVal = pos ? pos.lng.toFixed(6) : '';
        var gpsHtml = pos
            ? '<i class="fa fa-check-circle" style="color:var(--sp-success);margin-right:5px;"></i>' + latVal + ', ' + lngVal + ' <span style="opacity:.6;font-size:11px;">(±' + Math.round(pos.accuracy || 0) + 'm)</span>'
            : '<i class="fa fa-circle-o" style="margin-right:5px;opacity:.4;"></i>Belum diambil';
        var now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        var nowStr = now.toISOString().slice(0, 16);

        sv.innerHTML = ''
            + '<div class="sp-form-topbar" style="background:var(--sp-primary);">'
            +   '<button type="button" class="sp-back-btn" id="pt-titik-back"><i class="fa fa-arrow-left"></i></button>'
            +   '<div class="sp-form-topbar-info"><div class="sp-form-topbar-name"><i class="fa fa-map-marker"></i> Tambah Titik Lokasi</div></div>'
            + '</div>'
            + '<div class="sp-card">'
            +   '<div class="sp-card-title" style="color:var(--sp-primary);"><i class="fa fa-crosshairs"></i> Koordinat GPS</div>'
            +   '<div class="sp-gps-row">'
            +     '<div style="flex:1"><label class="sp-label">Posisi</label>'
            +       '<div id="pt-gps-status" class="sp-gps-status">' + gpsHtml + '</div></div>'
            +     '<button type="button" class="sp-gps-btn" id="pt-gps-btn" style="margin-top:20px;">'
            +       '<i class="fa fa-crosshairs"></i> ' + (pos ? 'Perbarui' : 'Ambil GPS') + '</button>'
            +   '</div>'
            +   '<div class="sp-gps-map" id="pt-gps-map"><div class="sp-gps-map-hint">Geser marker untuk menyesuaikan titik</div></div>'
            +   '<div class="sp-row-2" style="margin-top:12px;">'
            +     '<div class="sp-field"><label class="sp-label">Latitude</label>'
            +       '<input type="text" class="sp-input sp-input--bare" id="pt-lat" value="' + latVal + '" placeholder="0.000000" readonly/></div>'
            +     '<div class="sp-field"><label class="sp-label">Longitude</label>'
            +       '<input type="text" class="sp-input sp-input--bare" id="pt-lng" value="' + lngVal + '" placeholder="0.000000" readonly/></div>'
            +   '</div>'
            + '</div>'
            + '<div class="sp-card">'
            +   '<div class="sp-card-title" style="color:var(--sp-primary);"><i class="fa fa-clock-o"></i> Waktu</div>'
            +   '<div class="sp-field"><label class="sp-label">Tgl &amp; Jam <span class="sp-req">*</span></label>'
            +     '<input type="datetime-local" class="sp-input sp-input--bare" id="pt-titik-tgl" value="' + nowStr + '"/></div>'
            + '</div>'
            + '<div class="sp-card">'
            +   '<div class="sp-card-title" style="color:var(--sp-primary);"><i class="fa fa-camera"></i> Foto Dokumentasi <span class="sp-req">*</span></div>'
            +   '<div class="sp-foto-zone" id="pt-foto-zone"><i class="fa fa-camera" style="color:var(--sp-primary);"></i>'
            +     '<div class="sp-foto-zone-text">Tambah Foto Dokumentasi</div>'
            +     '<div class="sp-foto-zone-sub">Tap untuk mengambil foto</div></div>'
            +   '<div id="pt-foto-preview" style="display:none;">'
            +     '<button class="sp-btn-secondary" id="pt-foto-ganti" style="width:100%;margin-top:8px;"><i class="fa fa-camera"></i> Ganti Foto</button>'
            +   '</div>'
            +   '<input type="file" id="pt-foto-input" accept="image/*" style="display:none"/>'
            + '</div>'
            + '<div class="sp-card">'
            +   '<div class="sp-card-title" style="color:var(--sp-primary);"><i class="fa fa-pencil"></i> Catatan</div>'
            +   '<textarea class="sp-textarea" id="pt-titik-catatan" rows="2" placeholder="Catatan lokasi (opsional)..."></textarea>'
            + '</div>'
            + '<div class="sp-submit-bar">'
            +   '<button type="button" class="sp-btn-primary" id="pt-titik-submit" style="background:var(--sp-primary);">'
            +     '<i class="fa fa-paper-plane"></i><span id="pt-titik-label">Simpan Titik</span>'
            +   '</button>'
            + '</div>';

        document.getElementById('pt-titik-back').addEventListener('click', _backFromTitik);

        document.getElementById('pt-gps-btn').addEventListener('click', function () {
            var btn = this, statusEl = document.getElementById('pt-gps-status');
            btn.disabled = true;
            btn.innerHTML = '<span class="sp-spinner" style="border-color:rgba(113,99,158,.25);border-top-color:var(--sp-primary);width:13px;height:13px;"></span>';
            if (!navigator.geolocation) {
                statusEl.innerHTML = '<i class="fa fa-times" style="color:var(--sp-error);margin-right:5px;"></i>GPS tidak tersedia';
                btn.disabled = false; btn.innerHTML = '<i class="fa fa-crosshairs"></i> Ambil GPS'; return;
            }
            navigator.geolocation.getCurrentPosition(function (p) {
                var lat = p.coords.latitude.toFixed(6), lng = p.coords.longitude.toFixed(6);
                _pt.userPos = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy };
                document.getElementById('pt-lat').value = lat;
                document.getElementById('pt-lng').value = lng;
                statusEl.innerHTML = '<i class="fa fa-check-circle" style="color:var(--sp-success);margin-right:5px;"></i>' + lat + ', ' + lng + ' <span style="opacity:.6;font-size:11px;">(±' + Math.round(p.coords.accuracy) + 'm)</span>';
                btn.disabled = false; btn.innerHTML = '<i class="fa fa-crosshairs"></i> Perbarui';
                if (_pt.map && _pt.marker) { var ll = [p.coords.latitude, p.coords.longitude]; _pt.marker.setLatLng(ll); _pt.map.flyTo(ll, 16, { duration: 0.8 }); }
            }, function (err) {
                statusEl.innerHTML = '<i class="fa fa-times" style="color:var(--sp-error);margin-right:5px;"></i>' + (err.code === 1 ? 'Akses GPS ditolak' : err.code === 2 ? 'Posisi tidak tersedia' : 'Waktu habis');
                btn.disabled = false; btn.innerHTML = '<i class="fa fa-crosshairs"></i> Coba Lagi';
            }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
        });

        document.getElementById('pt-foto-input').addEventListener('change', function () {
            if (!this.files || !this.files[0]) return;
            _pt.titikFile = this.files[0];
            var zone = document.getElementById('pt-foto-zone'), preview = document.getElementById('pt-foto-preview');
            if (zone) zone.style.display = 'none';
            if (preview) {
                var img = preview.querySelector('img');
                if (!img) { img = document.createElement('img'); img.className = 'sp-foto-img'; img.alt = 'Foto'; preview.insertBefore(img, preview.firstChild); }
                img.src = URL.createObjectURL(_pt.titikFile);
                preview.style.display = '';
            }
        });
        var fz = document.getElementById('pt-foto-zone'); if (fz) fz.addEventListener('click', function () { document.getElementById('pt-foto-input').click(); });
        var fg = document.getElementById('pt-foto-ganti'); if (fg) fg.addEventListener('click', function () { document.getElementById('pt-foto-input').click(); });

        document.getElementById('pt-titik-submit').addEventListener('click', function () {
            var lat = parseFloat(document.getElementById('pt-lat').value) || 0;
            var lng = parseFloat(document.getElementById('pt-lng').value) || 0;
            var tglTitik = document.getElementById('pt-titik-tgl').value;
            if (!lat || !lng) { showToast('Ambil koordinat GPS terlebih dahulu', 'error'); return; }
            if (!tglTitik) { showToast('Isi tanggal dan jam titik lokasi', 'error'); return; }
            if (!_pt.titikFile) { showToast('Foto dokumentasi wajib diisi', 'error'); return; }
            var btn = this, lbl = document.getElementById('pt-titik-label');
            btn.disabled = true; lbl.innerHTML = '<span class="sp-spinner"></span> Menyimpan...';
            rpc('/petadigi/api/patroli/lokasi_add', {
                record_id: _pt.detailId,
                latitude:  lat,
                longitude: lng,
                tanggal:   _fmtDatetimeLocal(document.getElementById('pt-titik-tgl').value),
                catatan:   document.getElementById('pt-titik-catatan').value || '',
            }).then(function (res) {
                if (!res || !res.success) {
                    showToast(res && res.error || 'Gagal menyimpan', 'error');
                    btn.disabled = false; lbl.textContent = 'Simpan Titik'; return;
                }
                if (_pt.titikFile) {
                    var reader = new FileReader();
                    reader.onload = function (e) {
                        rpc('/petadigi/api/patroli/lokasi_foto', { lokasi_id: res.id, foto_data: e.target.result, foto_filename: _pt.titikFile.name })
                            .catch(function () {})
                            .finally(function () { showToast('Titik lokasi disimpan!', 'success'); _backFromTitik(); });
                    };
                    reader.readAsDataURL(_pt.titikFile);
                } else {
                    showToast('Titik lokasi disimpan!', 'success');
                    _backFromTitik();
                }
            }).catch(function () {
                showToast('Gagal terhubung ke server', 'error');
                btn.disabled = false; lbl.textContent = 'Simpan Titik';
            });
        });

        setTimeout(function () {
            if (typeof L === 'undefined') return;
            var container = document.getElementById('pt-gps-map'); if (!container) return;
            var pos = _pt.userPos;
            var center = (pos && pos.lat) ? [pos.lat, pos.lng] : [-2.9761, 104.7754];
            var _IMG = '/petadigi/static/lib/leaflet/images/';
            var icon = L.icon({ iconUrl: _IMG + 'marker-icon-purple.png', shadowUrl: _IMG + 'marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41], shadowAnchor: [12, 41] });
            _pt.map = L.map(container, { zoomControl: false, attributionControl: false });
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(_pt.map);
            L.control.zoom({ position: 'bottomright' }).addTo(_pt.map);
            _pt.map.setView(center, 16);
            _pt.marker = L.marker(center, { draggable: true, icon: icon }).addTo(_pt.map);
            _pt.marker.on('dragend', function () {
                var ll = _pt.marker.getLatLng();
                var lat = ll.lat.toFixed(6), lng = ll.lng.toFixed(6);
                document.getElementById('pt-lat').value = lat;
                document.getElementById('pt-lng').value = lng;
                var statusEl = document.getElementById('pt-gps-status');
                if (statusEl) statusEl.innerHTML = '<i class="fa fa-map-marker" style="color:var(--sp-primary);margin-right:5px;"></i>' + lat + ', ' + lng + ' <span style="opacity:.6;font-size:11px;">(digeser manual)</span>';
            });
            _pt.map.invalidateSize();
        }, 80);

        // Auto-request GPS on open
        setTimeout(function () {
            var btn = document.getElementById('pt-gps-btn');
            if (btn && navigator.geolocation) btn.click();
        }, 250);
    }

    // ── Init App ─────────────────────────────────────────────────────────────
    function init() {
        var appEl = document.getElementById('sp-app');
        if (!appEl) return;
        try { window._SP_CTX = JSON.parse(appEl.dataset.init); } catch (e) { window._SP_CTX = {}; }

        document.querySelectorAll('.sp-nav-item').forEach(function (btn) {
            btn.addEventListener('click', function () { switchTab(btn.dataset.tab); });
        });

        switchTab('home');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
