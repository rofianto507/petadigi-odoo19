import re
import io
from datetime import datetime, timezone, timedelta


# ── HELPERS ─────────────────────────────────────────────────────────────────

def clean_pipe(text: str) -> str:
    """Hapus karakter pipe (|) dari teks."""
    text = re.sub(r'^\|\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'\s*\|\s*$', '', text, flags=re.MULTILINE)
    text = re.sub(r'\s*\|\s*', ' ', text)
    text = re.sub(r'  +', ' ', text)
    return text.strip()


def clean_value(text: str) -> str:
    """Hapus prefix titik dua dan nomor urut."""
    text = text.strip()
    text = re.sub(r'^[\s:]+', '', text)
    text = re.sub(r'^\d+\.\s*', '', text)
    return text.strip()


STOP_KEYWORDS = [
    'Pelapor atau Pengadu',
    'TINDAKAN YANG TELAH DILAKUKAN',
    'TINDAKAN YANG DILAKUKAN',
    'MENGETAHUI',
    'KA SPKT',
    'Yang menerima laporan',
]

def clean_stop_keywords(text: str) -> str:
    """Potong teks saat menemui keyword stop."""
    for kw in STOP_KEYWORDS:
        pos = text.lower().find(kw.lower())
        if pos != -1:
            text = text[:pos]
    return text.strip()


BULAN_MAP = {
    'januari': '01', 'februari': '02', 'maret': '03', 'april': '04',
    'mei': '05', 'juni': '06', 'juli': '07', 'agustus': '08',
    'september': '09', 'oktober': '10', 'november': '11', 'desember': '12',
}

# WIB = UTC+7
WIB = timezone(timedelta(hours=7))

def parse_tanggal(teks: str):
    """
    Parse teks tanggal Bahasa Indonesia ke datetime UTC (naive).
    Waktu di dokumen LP dianggap WIB (UTC+7), dikonversi ke UTC
    agar Odoo menampilkan jam yang benar.

    Support format:
      - 'senin tanggal 16 Februari 2026 Pukul 02.19 WIB'
      - 'Pada Hari Senin Tanggal 16 Februari 2026 Pukul 09.35 WIB'
      - '19-02-2026'
    """
    if not teks:
        return None

    teks_lower = teks.lower()

    # Format dd-mm-yyyy (tanpa jam)
    m = re.search(r'(\d{2})-(\d{2})-(\d{4})', teks_lower)
    if m:
        try:
            dt_wib = datetime(int(m.group(3)), int(m.group(2)), int(m.group(1)),
                              tzinfo=WIB)
            return dt_wib.astimezone(timezone.utc).replace(tzinfo=None)
        except ValueError:
            pass

    # Ekstrak jam jika ada (pukul HH.MM atau HH:MM)
    jam, menit = 0, 0
    m_jam = re.search(r'(?:pukul|jam)\s+(\d{1,2})[.:\-](\d{2})', teks_lower)
    if m_jam:
        jam = int(m_jam.group(1))
        menit = int(m_jam.group(2))

    # Format: dd BulanIndo yyyy
    pattern = r'(\d{1,2})\s+(' + '|'.join(BULAN_MAP.keys()) + r')\s+(\d{4})'
    m = re.search(pattern, teks_lower)
    if m:
        try:
            dt_wib = datetime(
                int(m.group(3)),
                int(BULAN_MAP[m.group(2)]),
                int(m.group(1)),
                jam, menit,
                tzinfo=WIB
            )
            return dt_wib.astimezone(timezone.utc).replace(tzinfo=None)
        except ValueError:
            pass

    return None


# ── DOCX HELPERS ─────────────────────────────────────────────────────────────

def get_cell_text_parts(cell) -> list:
    """Ambil teks tiap paragraf dalam sel tabel."""
    parts = []
    for para in cell.paragraphs:
        t = para.text.strip()
        if t:
            parts.append(t)
    return parts


def get_cell_text(cell) -> str:
    return ' '.join(get_cell_text_parts(cell))


# ── MAIN PARSER ───────────────────────────────────────────────────────────────

def parse(file_bytes: bytes) -> dict:
    """
    Parse dokumen LP A (.docx) dan kembalikan dict berisi field-field
    yang berhasil diekstrak.
    """
    try:
        from docx import Document
    except ImportError:
        raise ImportError(
            "Library python-docx tidak ditemukan. "
            "Silakan install dengan: pip install python-docx"
        )

    doc = Document(io.BytesIO(file_bytes))

    # ── Bangun all_text dan table_data ────────────────────────────────────────
    all_text = ''
    table_data = []

    for element in doc.element.body:
        tag = element.tag.split('}')[-1] if '}' in element.tag else element.tag

        if tag == 'tbl':
            from docx.table import Table
            table = Table(element, doc)
            current_table = []
            for row in table.rows:
                row_data = []
                line_texts = []
                for cell in row.cells:
                    text = get_cell_text(cell)
                    parts = get_cell_text_parts(cell)
                    row_data.append({'text': text, 'parts': parts})
                    if text:
                        line_texts.append(text)
                current_table.append(row_data)
                if line_texts:
                    all_text += ' | '.join(line_texts) + '\n'
            table_data.append(current_table)

        elif tag == 'p':
            from docx.text.paragraph import Paragraph
            para = Paragraph(element, doc)
            t = para.text.strip()
            if t:
                all_text += t + '\n'

    # ── Inisialisasi data ─────────────────────────────────────────────────────
    data = {
        'no_lp': '',
        'pelapor': '',
        'waktu_kejadian': '',
        'tempat_kejadian': '',
        'apa_yang_terjadi': '',
        'terlapor': '',
        'korban': '',
        'bagaimana_terjadi': '',
        'kapan_dilaporkan': '',
        'latitude': None,
        'longitude': None,
        'tindak_pidana': '',
        'saksi': '',
        'barang_bukti': '',
        'uraian': '',
    }

    # ── 1. NOMOR LP ───────────────────────────────────────────────────────────
    m = re.search(r'Nomor\s*:?\s*(LP[^\n]+)', all_text, re.IGNORECASE)
    if m:
        data['no_lp'] = clean_pipe(m.group(1).strip())

    # ── 2. PERISTIWA YANG TERJADI ─────────────────────────────────────────────
    m = re.search(
        r'PERISTIWA YANG TERJADI(.+?)(?=TINDAK PIDANA APA|$)',
        all_text, re.IGNORECASE | re.DOTALL
    )
    if m:
        bagian = m.group(1)

        mappings = {
            'Waktu Kejadian':    'waktu_kejadian',
            'Tempat Kejadian':   'tempat_kejadian',
            'Apa Yang Terjadi':  'apa_yang_terjadi',
            'Bagaimana Terjadi': 'bagaimana_terjadi',
            'Dilaporkan Pada':   'kapan_dilaporkan',
        }

        lines = bagian.split('\n')
        current_field = ''
        in_siapa = False
        siapa_sub = ''

        for line in lines:
            line = line.strip().strip('| ')
            line = re.sub(r'^\d+\.\s*', '', line)
            line = clean_pipe(line)
            if not line:
                continue

            matched = False

            # Cek header "Siapa"
            if re.match(r'^Siapa\s*:?\s*$', line, re.IGNORECASE):
                in_siapa = True
                siapa_sub = ''
                current_field = ''
                matched = True

            # Sub-field dalam "Siapa"
            if in_siapa and not matched:
                if line.lower().startswith('terlapor'):
                    siapa_sub = 'terlapor'
                    m2 = re.match(r'^Terlapor\s*:?\s*(.+)', line, re.IGNORECASE)
                    if m2:
                        data['terlapor'] = clean_pipe(m2.group(1).strip())
                    matched = True
                elif line.lower().startswith('korban'):
                    siapa_sub = 'korban'
                    m2 = re.match(r'^Korban\s*:?\s*(.+)', line, re.IGNORECASE)
                    if m2:
                        data['korban'] = clean_pipe(m2.group(1).strip())
                    matched = True
                elif siapa_sub:
                    is_other = any(kw.lower() in line.lower() for kw in mappings)
                    if not is_other:
                        data[siapa_sub] += ' ' + line
                        matched = True
                    else:
                        in_siapa = False
                        siapa_sub = ''

            # Cek mapping field biasa
            if not matched:
                for keyword, field in mappings.items():
                    if keyword.lower() in line.lower() and ':' in line:
                        parts = line.split(':', 1)
                        if len(parts) > 1:
                            data[field] = clean_pipe(parts[1].strip())
                        current_field = field
                        in_siapa = False
                        siapa_sub = ''
                        matched = True
                        break

            # Data lanjutan multi-line
            if not matched and current_field and not in_siapa:
                data[current_field] += ' ' + line

    # ── 3. KOORDINAT ──────────────────────────────────────────────────────────
    coord_source = data['tempat_kejadian'] or all_text
    m = re.search(
        r'TITIK KOORDINAT\s*(-?[\d\.]+)\s*[,\s]\s*(-?[\d\.]+)',
        coord_source, re.IGNORECASE
    )
    if not m:
        m = re.search(
            r'TITIK KOORDINAT\s*(-?[\d\.]+)\s*[,\s]\s*(-?[\d\.]+)',
            all_text, re.IGNORECASE
        )
    if m:
        try:
            data['latitude'] = float(m.group(1))
            data['longitude'] = float(m.group(2))
        except ValueError:
            pass

    # ── 4. TABEL: Tindak Pidana, Saksi, Barang Bukti, Uraian ─────────────────
    tindak_parts = []
    saksi_parts = []
    bukti_parts = []
    uraian_parts = []

    STOP_UPPER = [kw.upper() for kw in STOP_KEYWORDS]

    for table in table_data:
        mode = ''
        for row in table:
            col0 = row[0] if len(row) > 0 else {'text': '', 'parts': []}
            col1 = row[1] if len(row) > 1 else {'text': '', 'parts': []}
            col0_text = col0['text']
            col1_text = col1['text']
            col0_upper = col0_text.upper()
            row_upper = (col0_text + ' ' + col1_text).upper()

            # Stop keywords
            if any(kw in row_upper for kw in STOP_UPPER):
                mode = ''
                continue

            # Header TINDAK PIDANA
            if 'TINDAK PIDANA' in col0_upper:
                mode = 'TINDAK_SAKSI'
                found = False
                for p in col0['parts'][1:]:
                    v = clean_value(p)
                    if v:
                        tindak_parts.append(v)
                        found = True
                for p in col1['parts'][1:]:
                    v = clean_value(p)
                    if v:
                        saksi_parts.append(v)
                        found = True
                if not found:
                    m2 = re.search(r'TINDAK PIDANA APA\s*:?\s*(.+)', col0_text, re.IGNORECASE | re.DOTALL)
                    if m2:
                        v = clean_value(m2.group(1))
                        if v:
                            tindak_parts.append(v)
                    m2 = re.search(r'NAMA DAN ALAMAT SAKSI[^:]*:?\s*(.+)', col1_text, re.IGNORECASE | re.DOTALL)
                    if m2:
                        v = clean_value(m2.group(1))
                        if v:
                            saksi_parts.append(v)
                continue

            # Header BARANG BUKTI
            if 'BARANG BUKTI' in col0_upper:
                mode = 'BUKTI_URAIAN'
                found = False
                for p in col0['parts'][1:]:
                    v = clean_value(p)
                    if v:
                        bukti_parts.append(v)
                        found = True
                for p in col1['parts'][1:]:
                    v = clean_value(p)
                    if v:
                        uraian_parts.append(v)
                        found = True
                if not found:
                    m2 = re.search(r'BARANG BUKTI\s*:?\s*(.+)', col0_text, re.IGNORECASE | re.DOTALL)
                    if m2:
                        v = clean_value(m2.group(1))
                        if v:
                            bukti_parts.append(v)
                    m2 = re.search(r'URAIAN SINGKAT[^:]*:?\s*(.+)', col1_text, re.IGNORECASE | re.DOTALL)
                    if m2:
                        v = clean_value(m2.group(1))
                        if v:
                            uraian_parts.append(v)
                continue

            # Data baris
            if mode == 'TINDAK_SAKSI':
                v0 = clean_value(col0_text)
                v1 = clean_value(col1_text)
                if v0:
                    tindak_parts.append(v0)
                if v1:
                    saksi_parts.append(v1)
            elif mode == 'BUKTI_URAIAN':
                v0 = clean_value(col0_text)
                v1 = clean_value(col1_text)
                if v0:
                    bukti_parts.append(v0)
                if v1:
                    uraian_parts.append(v1)

    data['tindak_pidana'] = clean_stop_keywords(' '.join(tindak_parts))
    data['saksi']         = clean_stop_keywords(' '.join(saksi_parts))
    data['barang_bukti']  = clean_stop_keywords(' '.join(bukti_parts))
    data['uraian']        = clean_stop_keywords(' '.join(uraian_parts))
    # Cari setelah MENGETAHUI
    m = re.search(r'MENGETAHUI(.+?)$', all_text, re.IGNORECASE | re.DOTALL)

    SKIP_KEYWORDS = ['KA SPKT', 'SEKTOR', 'POLRES', 'POLSEK', 'RESOR']
    RANK_KEYWORDS = ['NRP', 'INSPEKTUR', 'KOMISARIS', 'BRIGADIR', 'AIPDA',
                    'AIPTU', 'BRIPDA', 'BRIPTU', 'IPTU', 'IPDA', 'AKP',
                    'KOMPOL', 'AJUN']

    for line in lines:
        if any(kw in line.upper() for kw in SKIP_KEYWORDS): continue  # lewati
        if any(kw in line.upper() for kw in RANK_KEYWORDS): break     # berhenti
        if re.match(r'^[A-Z\s\.]+$', line) and len(line) > 2:
            data['penanggung_jawab'] = line  # ✅ nama ditemukan
            break
    # ── 5. PARSE TANGGAL (WIB → UTC) ─────────────────────────────────────────
    tanggal_kejadian = parse_tanggal(data['waktu_kejadian'])
    tanggal_laporan  = parse_tanggal(data['kapan_dilaporkan'])

    # ── 6. BERSIHKAN SEMUA DATA ───────────────────────────────────────────────
    multiline_fields = {'pelapor', 'korban', 'saksi', 'terlapor', 'bagaimana_terjadi'}
    for key, value in data.items():
        if not isinstance(value, str):
            continue
        value = clean_pipe(value)
        if key in multiline_fields:
            data[key] = re.sub(r'[^\S\n]+', ' ', value).strip()
        else:
            data[key] = re.sub(r'\s+', ' ', value).strip()

    # ── 7. MAPPING KE FIELD ODOO ──────────────────────────────────────────────
    result = {
        'no_lp':            data['no_lp'],
        'tanggal_kejadian': tanggal_kejadian,
        'tempat_kejadian':  data['tempat_kejadian'],
        'latitude':         data['latitude'],
        'longitude':        data['longitude'],
        'apa_yang_terjadi': data['apa_yang_terjadi'],
        'terlapor':         data['terlapor'],
        'korban':           data['korban'],
        'uraian_singkat':   data['bagaimana_terjadi'] or data['uraian'],
        'tanggal_laporan':  tanggal_laporan,
        'tindak_pidana':    data['tindak_pidana'],
        'saksi':            data['saksi'],
        'barang_bukti':     data['barang_bukti'],
        'pelapor':          data['pelapor'],
        'penanggung_jawab': data['penanggung_jawab'],
    }

    # Hapus nilai kosong/None agar tidak overwrite field yang sudah ada
    result = {k: v for k, v in result.items() if v not in (None, '', 0.0)}

    return result
