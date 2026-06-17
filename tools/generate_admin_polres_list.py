"""
Generate daftar username & password admin Polres untuk dibagikan ke Admin Polda.

Run di Odoo shell:
  exec(open('/path/to/generate_admin_polres_list.py').read())

Output: tabel teks + file TXT di direktori yang sama.
"""

import re
import os
from datetime import datetime

PASSWORD_DEFAULT = '*#PetaDigi2026'
OUTPUT_PATH = '/home/rofi/petadigi-migration/admin_polres_accounts.txt'


def _slug(name):
    """Sama dengan logika generate username saat import: lowercase, spasi→underscore, strip non-alphanum."""
    s = name.lower().strip()
    s = re.sub(r'[^a-z0-9\s]', '', s)
    s = re.sub(r'\s+', '_', s)
    return s


# ── Ambil data polres dari database ──────────────────────────────────────────
polres_list = env['petadigi.polres'].sudo().search([], order='name asc')

rows = []
for p in polres_list:
    username = f'madmin_{_slug(p.name)}'
    # Cek apakah user sudah ada di Odoo (untuk validasi)
    user = env['res.users'].sudo().search([('login', '=', username)], limit=1)
    status = '✅ Ada' if user else '⚠️ Belum dibuat'
    rows.append({
        'no': len(rows) + 1,
        'polres': p.name,
        'username': username,
        'password': PASSWORD_DEFAULT,
        'status': status,
    })

# ── Print ke konsol ───────────────────────────────────────────────────────────
col_w = [4, 35, 35, 20, 12]
header = f"{'No':<{col_w[0]}}  {'Polres':<{col_w[1]}}  {'Username':<{col_w[2]}}  {'Password':<{col_w[3]}}  {'Status'}"
sep    = '-' * (sum(col_w) + 8)

print()
print('=' * len(sep))
print('  DAFTAR AKUN ADMIN POLRES — PetaDigi')
print(f'  Dibuat: {datetime.now().strftime("%d %B %Y %H:%M")}')
print('=' * len(sep))
print(header)
print(sep)
for r in rows:
    print(f"{r['no']:<{col_w[0]}}  {r['polres']:<{col_w[1]}}  {r['username']:<{col_w[2]}}  {r['password']:<{col_w[3]}}  {r['status']}")
print(sep)
print(f"Total: {len(rows)} Polres")
print()

# ── Simpan ke file TXT ────────────────────────────────────────────────────────
with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
    f.write('DAFTAR AKUN ADMIN POLRES — PetaDigi\n')
    f.write(f'Dibuat: {datetime.now().strftime("%d %B %Y %H:%M")}\n')
    f.write('RAHASIA — Hanya untuk Admin Polda\n')
    f.write('=' * len(sep) + '\n')
    f.write(header + '\n')
    f.write(sep + '\n')
    for r in rows:
        f.write(f"{r['no']:<{col_w[0]}}  {r['polres']:<{col_w[1]}}  {r['username']:<{col_w[2]}}  {r['password']:<{col_w[3]}}\n")
    f.write(sep + '\n')
    f.write(f'Total: {len(rows)} Polres\n')
    f.write('\nCatatan: Harap segera ganti password setelah login pertama.\n')

print(f"✅ File disimpan di: {OUTPUT_PATH}")
