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
        if (tabId === 'home')   _renderHomeOnce();
        if (tabId === 'strong') _renderStrongOnce();
        if (tabId === 'profil') _renderProfilOnce();
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
            +   '<div class="sp-coming-soon">'
            +     '<i class="fa fa-clock-o"></i>'
            +     '<div class="sp-coming-soon-title">Fitur Patroli</div>'
            +     '<div class="sp-coming-soon-sub">Segera hadir. Sistem pencatatan patroli wilayah hukum.</div>'
            +   '</div>'
            + '</div>';

        rpc('/petadigi/api/kpi', {}).then(function (data) {
            var sp = data.strong_point || {};
            var el = document.getElementById('kpi-sp');
            if (!el) return;
            el.innerHTML =
                kpiCard2(sp.today || 0,  sp.personel_today || 0, 'SP Hari Ini',    'fa-calendar-o', '#71639e', 'today')
              + kpiCard2(sp.total || 0,  sp.personel || 0,       'SP Keseluruhan', 'fa-map-pin',    '#2980b9', 'all');
            el.querySelectorAll('.sp-kpi2-card').forEach(function (card) {
                card.addEventListener('click', function () {
                    _navigateToStrongWithFilter(card.dataset.filter);
                });
            });
        }).catch(function () {
            var el = document.getElementById('kpi-sp');
            if (el) el.innerHTML = '<div style="text-align:center;color:#b3261e;font-size:13px;padding:12px;"><i class="fa fa-exclamation-triangle"></i> Gagal memuat data</div>';
        });

        // ── Weekly bar chart ─────────────────────────────────────────────────
        rpc('/petadigi/api/weekly', {}).then(function (data) {
            var days   = (data && data.days) || [];
            var el     = document.getElementById('sp-weekly-chart');
            if (!el || typeof echarts === 'undefined' || !days.length) return;

            var labels = days.map(function (d) { return d.label; });
            var counts = days.map(function (d) { return d.count; });
            // @ts-ignore — echarts loaded as global from script tag
            var chart = echarts.init(el, null, { renderer: 'canvas' });
            chart.setOption({
                grid: { left: 6, right: 6, top: 14, bottom: 0, containLabel: true },
                xAxis: {
                    type: 'category',
                    data: labels,
                    axisLabel: { fontSize: 11, color: '#9e97b8' },
                    axisTick:  { show: false },
                    axisLine:  { show: false },
                },
                yAxis: {
                    type: 'value',
                    minInterval: 1,
                    max: function (v) { return Math.ceil(v.max * 1.25) || 5; },
                    splitLine: { lineStyle: { color: '#f0eef8', type: 'dashed' } },
                    axisLabel: { fontSize: 10, color: '#b3acc8' },
                },
                series: [{
                    type: 'bar',
                    data: counts.map(function (v, i) {
                        var isToday = (i === 6);
                        return {
                            value: v,
                            itemStyle: {
                                color: isToday ? '#71639e' : '#c4bedd',
                                borderRadius: [4, 4, 0, 0],
                            },
                        };
                    }),
                    barMaxWidth: 36,
                    label: {
                        show: true,
                        position: 'top',
                        fontSize: 10,
                        color: '#71639e',
                        formatter: function (p) { return p.value > 0 ? p.value : ''; },
                    },
                }],
                tooltip: {
                    trigger: 'axis',
                    backgroundColor: '#3d3461',
                    borderWidth: 0,
                    textStyle: { color: '#fff', fontSize: 12 },
                    formatter: function (p) {
                        return '<b>' + p[0].name + '</b>: ' + p[0].value + ' SP';
                    },
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
        rpc('/petadigi/api/list', { offset: _sp.listOffset, limit: _sp.listPerPage, filter: _sp.listFilter || null })
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

    function _buildRecordList(rv, records) {
        var filterBadge = _sp.listFilter === 'today'
            ? ' <button class="sp-filter-badge" id="sp-filter-clear">'
              + '<i class="fa fa-calendar-o"></i> Hari Ini'
              + '<i class="fa fa-times sp-filter-badge-x"></i>'
              + '</button>'
            : '';
        if (!records.length) {
            rv.innerHTML = '<div class="sp-records-header">'
                + '<span class="sp-records-title"><i class="fa fa-map-pin"></i> Strong Point' + filterBadge + '</span>'
                + '</div>'
                + '<div class="sp-records-empty" style="margin-top:24px">'
                + '<i class="fa fa-map-pin"></i>'
                + '<div class="sp-records-empty-title">' + (_sp.listFilter === 'today' ? 'Tidak ada SP hari ini' : 'Belum ada Strong Point') + '</div>'
                + '<div class="sp-records-empty-sub">' + (_sp.listFilter === 'today' ? 'Belum ada data strong point untuk hari ini' : 'Tap tombol <b>+</b> untuk menambah data baru') + '</div>'
                + '</div>';
            var cb = rv.querySelector('#sp-filter-clear');
            if (cb) cb.addEventListener('click', function () { _sp.listFilter = null; _showRecordList(); });
            return;
        }
        var html = '<div class="sp-records-header">'
            + '<span class="sp-records-title"><i class="fa fa-map-pin"></i> Strong Point' + filterBadge + '</span>'
            + '<span class="sp-records-count" id="sp-records-count">' + _sp.listOffset + (_sp.listDone ? '' : '+') + '</span>'
            + '</div>'
            + '<div class="sp-record-list">';
        records.forEach(function (r) { html += _recordItemHtml(r); });
        html += '</div>';
        rv.innerHTML = html;
        var clearBtn = rv.querySelector('#sp-filter-clear');
        if (clearBtn) clearBtn.addEventListener('click', function () { _sp.listFilter = null; _showRecordList(); });
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
        document.getElementById('sp-list-view').style.display = 'none';
        var fv = document.getElementById('sp-form-view');
        fv.style.display = '';
        _buildForm(fv);
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

        // Polsek row
        var polsekRow = '';
        if (ctx.is_polsek) {
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
            +   '<div class="sp-field">'
            +     '<label class="sp-label">Polres</label>'
            +     '<div class="sp-input-wrap"><i class="fa fa-shield sp-input-icon"></i>'
            +     '<input type="text" class="sp-input" value="' + _esc(ctx.polres_name || '') + '" readonly/></div>'
            +   '</div>'
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
            +       '<label class="sp-label">Desa / Kelurahan</label>'
            +       '<div class="sp-input-wrap"><i class="fa fa-home sp-input-icon"></i>'
            +       '<select class="sp-select" id="sp-desa" disabled><option value="">— Pilih Kecamatan —</option></select></div>'
            +     '</div>'
            +   '</div>'
            + '</div>'

            // Card 2: Waktu — hanya tanggal mulai; selesai diisi saat klik "Set Selesai"
            + '<div class="sp-card">'
            +   '<div class="sp-card-title"><i class="fa fa-clock-o"></i> Waktu Mulai</div>'
            +   '<div class="sp-field">'
            +     '<label class="sp-label">Tgl &amp; Jam Mulai <span class="sp-req">*</span></label>'
            +     '<input type="datetime-local" class="sp-input sp-input--bare" id="sp-tgl-mulai"/>'
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
        var kabId  = document.getElementById('sp-kabupaten')?.value;
        var kecId  = document.getElementById('sp-kecamatan')?.value;
        var tglMul = document.getElementById('sp-tgl-mulai')?.value;

        if (!kabId)  { showToast('Pilih Kabupaten terlebih dahulu', 'error'); return; }
        if (!kecId)  { showToast('Pilih Kecamatan terlebih dahulu', 'error'); return; }
        if (!tglMul) { showToast('Isi Tanggal & Jam Mulai', 'error'); return; }

        var btn   = document.getElementById('sp-submit-btn');
        var label = document.getElementById('sp-submit-label');
        btn.disabled = true;
        label.innerHTML = '<span class="sp-spinner"></span> Menyimpan...';

        var ctx    = window._SP_CTX || {};
        var params = {
            lokasi_id:       _sp.selected ? _sp.selected.id : null,
            kabupaten_id:    parseInt(kabId),
            kecamatan_id:    parseInt(kecId),
            desa_id:         parseInt(document.getElementById('sp-desa')?.value) || null,
            tanggal_mulai:   _fmtDatetimeLocal(tglMul),
            tanggal_selesai: _fmtDatetimeLocal(document.getElementById('sp-tgl-selesai')?.value),
            latitude:        parseFloat(document.getElementById('sp-lat')?.value) || 0,
            longitude:       parseFloat(document.getElementById('sp-lng')?.value) || 0,
            keterangan:      document.getElementById('sp-keterangan')?.value || '',
        };

        if (!ctx.is_polsek) {
            var polsekVal = document.getElementById('sp-polsek')?.value;
            if (polsekVal) params.polsek_id = parseInt(polsekVal);
        }

        rpc('/petadigi/api/submit', params).then(function (res) {
            if (res && res.success) {
                showToast(res.code + ' berhasil disimpan!', 'success');
                // Destroy map before leaving form view
                if (_sp.map) { _sp.map.remove(); _sp.map = null; _sp.marker = null; }
                document.getElementById('sp-form-view').style.display = 'none';
                _openDetail(res.record_id, res.code);
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
            +   '<div class="sp-info-row"><span class="sp-info-label">Kecamatan</span><span class="sp-info-value">' + _esc(data.kecamatan_nama || '—') + '</span></div>'
            +   '<div class="sp-info-row"><span class="sp-info-label">Desa</span><span class="sp-info-value">' + _esc(data.desa_nama || '—') + '</span></div>'
            +   '<div class="sp-info-row"><span class="sp-info-label">Tgl Mulai</span><span class="sp-info-value">' + _fmtDtDisplay(data.tanggal_mulai) + '</span></div>'
            +   (data.tanggal_selesai ? '<div class="sp-info-row"><span class="sp-info-label">Tgl Selesai</span><span class="sp-info-value">' + _fmtDtDisplay(data.tanggal_selesai) + '</span></div>' : '')
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
            +   '<input type="file" id="sp-foto-input" accept="image/*" capture="environment" style="display:none"/>'
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
            btn.addEventListener('click', function () { _removePersonel(parseInt(this.dataset.pid)); });
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
            _removePersonel(parseInt(this.dataset.pid));
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

        var photoHtml = ctx.user_id
            ? '<img src="/web/image/res.users/' + ctx.user_id + '/image_128" alt="foto" onerror="this.style.display=\'none\'">'
            : '';
        var roleLabel = ctx.is_polsek ? 'Polsek' : 'Polres';
        var roleIcon  = ctx.is_polsek ? 'fa-building' : 'fa-shield';

        el.innerHTML = ''
            + '<div class="sp-profile-card">'
            +   '<div class="sp-profile-photo">' + (photoHtml || getInitials(ctx.user_name)) + '</div>'
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
            + '<a href="/petadigi/logout" class="sp-btn-primary" style="text-decoration:none;margin-top:8px;">'
            +   '<i class="fa fa-sign-out"></i> Keluar dari Akun'
            + '</a>';
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
