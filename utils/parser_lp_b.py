import re
import io
from datetime import datetime, timezone, timedelta


# ── HELPERS (sama dengan LP A) ────────────────────────────────────────────────

def clean_pipe(text: str) -> str:
    text = re.sub(r'^\|\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'\s*\|\s*$', '', text, flags=re.MULTILINE)
    text = re.sub(r'\s*\|\s*', ' ', text)
    text = re.sub(r'  +', ' ', text)
    return text.strip()


def clean_value(text: str) -> str:
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

WIB = timezone(timedelta(hours=7))


def parse_tanggal(teks: str):
    """
    Parse teks tanggal Bahasa Indonesia ke datetime UTC (naive).
    WIB (UTC+7) → UTC.
    """
    if not teks:
        return None

    teks_lower = teks.lower()

    # Format dd-mm-yyyy
    m = re.search(r'(\d{2})-(\d{2})-(\d{4})', teks_lower)
    if m:
        try:
            dt_wib = datetime(int(m.group(3)), int(m.group(2)), int(m.group(1)), tzinfo=WIB)
            return dt_wib.astimezone(timezone.utc).replace(tzinfo=None)
        except ValueError:
            pass

    # Ekstrak jam (pukul HH.MM atau HH:MM)
    jam, menit = 0, 0
    m_jam = re.search(r'(?:pukul|jam)\s+(\d{1,2})[.:\-](\d{2})', teks_lower)
    if m_jam:
        jam = int(m_jam.group(1))
        menit = int(m_jam.group(2))

    # Format dd BulanIndo yyyy
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
    parts = []
    for para in cell.paragraphs:
        t = para.text.strip()
        if t:
            parts.append(t)
    return parts


def get_cell_text(cell) -> str:
    return ' '.join(get_cell_text_parts(cell))


# ── MAIN PARSER LP B ─────────────────────────────────────────────────────────

def parse(file_bytes: bytes) -> dict:
    """
    Parse dokumen LP B (.docx).

    Perbedaan utama LP B vs LP A:
    - Ada bagian "YANG MELAPORKAN" sebelum "PERISTIWA YANG TERJADI" → field pelapor
    - Keyword: 'Siapa terlapor' dan 'Siapa korban' (inline, bukan sub-blok)
    - Keyword dilaporkan: 'Kapan dilaporkan' (bukan 'Dilaporkan Pada')
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
        'kapan_dilaporkan': '',
        'latitude': None,
        'longitude': None,
        'tindak_pidana': '',
        'saksi': '',
        'barang_bukti': '',
        'uraian': '',
        'penanggung_jawab': '',
    }

    # ── 1. NOMOR LP ───────────────────────────────────────────────────────────
    m = re.search(r'Nomor\s*:?\s*(LP[^\n]+)', all_text, re.IGNORECASE)
    if m:
        data['no_lp'] = clean_pipe(m.group(1).strip())

    # ── 2. YANG MELAPORKAN → pelapor ─────────────────────────────────────────
    m = re.search(
        r'YANG MELAPORKAN(.+?)PERISTIWA YANG TERJADI',
        all_text, re.IGNORECASE | re.DOTALL
    )
    if m:
        bagian_pelapor = m.group(1)
        info_pelapor = []
        for line in bagian_pelapor.split('\n'):
            line = re.sub(r'^\d+\.\s*', '', line.strip())
            line = clean_pipe(line)
            if line and ':' in line:
                info_pelapor.append(line)
        data['pelapor'] = '\n'.join(info_pelapor)

    # ── 3. PERISTIWA YANG TERJADI ─────────────────────────────────────────────
    m = re.search(
        r'PERISTIWA YANG TERJADI(.+?)(?=TINDAK PIDANA APA|$)',
        all_text, re.IGNORECASE | re.DOTALL
    )
    if m:
        bagian = m.group(1)

        # LP B pakai keyword berbeda
        mappings = {
            'Waktu Kejadian':   'waktu_kejadian',
            'Tempat Kejadian':  'tempat_kejadian',
            'Apa Yang Terjadi': 'apa_yang_terjadi',
            'Siapa terlapor':   'terlapor',
            'Siapa korban':     'korban',
            'Kapan dilaporkan': 'kapan_dilaporkan',
        }

        lines = bagian.split('\n')
        current_field = ''

        for line in lines:
            line = line.strip().strip('| ')
            line = re.sub(r'^\d+\.\s*', '', line)
            line = clean_pipe(line)
            if not line:
                continue

            matched = False

            for keyword, field in mappings.items():
                if keyword.lower() in line.lower() and ':' in line:
                    parts = line.split(':', 1)
                    if len(parts) > 1:
                        data[field] = clean_pipe(parts[1].strip())
                    current_field = field
                    matched = True
                    break

            if not matched and current_field:
                data[current_field] += ' ' + line

    # ── 4. KOORDINAT ──────────────────────────────────────────────────────────
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

    # ── 5. TABEL: Tindak Pidana, Saksi, Barang Bukti, Uraian ─────────────────
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

            if any(kw in row_upper for kw in STOP_UPPER):
                mode = ''
                continue

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

    # ── 6. PENANGGUNG JAWAB (setelah MENGETAHUI) ──────────────────────────────
    SKIP_PJ = ['KA SPKT', 'SEKTOR', 'POLRES', 'POLSEK', 'RESOR']
    RANK_PJ = ['NRP', 'INSPEKTUR', 'KOMISARIS', 'BRIGADIR', 'AIPDA',
               'AIPTU', 'BRIPDA', 'BRIPTU', 'IPTU', 'IPDA', 'AKP',
               'KOMPOL', 'AJUN']

    m_pj = re.search(r'MENGETAHUI(.+?)$', all_text, re.IGNORECASE | re.DOTALL)
    if m_pj:
        pj_lines = m_pj.group(1).split('\n')
        for line in pj_lines:
            line = line.strip()
            if not line:
                continue
            line_upper = line.upper()
            if any(kw in line_upper for kw in SKIP_PJ):
                continue
            if any(kw in line_upper for kw in RANK_PJ):
                break
            if re.match(r'^[A-Z][A-Z\s\.]+$', line) and len(line) > 2:
                data['penanggung_jawab'] = line
                break

    # ── 7. PARSE TANGGAL (WIB → UTC) ─────────────────────────────────────────
    tanggal_kejadian = parse_tanggal(data['waktu_kejadian'])
    tanggal_laporan  = parse_tanggal(data['kapan_dilaporkan'])

    # ── 8. BERSIHKAN SEMUA DATA ───────────────────────────────────────────────
    multiline_fields = {'pelapor', 'korban', 'saksi', 'terlapor'}
    for key, value in data.items():
        if not isinstance(value, str):
            continue
        value = clean_pipe(value)
        if key in multiline_fields:
            data[key] = re.sub(r'[^\S\n]+', ' ', value).strip()
        else:
            data[key] = re.sub(r'\s+', ' ', value).strip()

    # ── 9. MAPPING KE FIELD ODOO ──────────────────────────────────────────────
    result = {
        'no_lp':            data['no_lp'],
        'tanggal_kejadian': tanggal_kejadian,
        'tempat_kejadian':  data['tempat_kejadian'],
        'latitude':         data['latitude'],
        'longitude':        data['longitude'],
        'apa_yang_terjadi': data['apa_yang_terjadi'],
        'terlapor':         data['terlapor'],
        'korban':           data['korban'],
        'uraian_singkat':   data['uraian'],
        'tanggal_laporan':  tanggal_laporan,
        'tindak_pidana':    data['tindak_pidana'],
        'saksi':            data['saksi'],
        'barang_bukti':     data['barang_bukti'],
        'pelapor':          data['pelapor'],
        'penanggung_jawab': data['penanggung_jawab'],
    }

    result = {k: v for k, v in result.items() if v not in (None, '', 0.0)}

    return result
