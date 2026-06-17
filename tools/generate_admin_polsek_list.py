"""
Generate daftar username & password admin Polsek untuk dibagikan ke Admin Polda.

Mengambil langsung dari user yang sudah ada di group_polsek (lebih akurat
daripada regenerate username dari nama polsek).

Run di Odoo shell:
  exec(open('/home/rofi/petadigi-migration/generate_admin_polsek_list.py').read())

Output: tabel teks + file TXT di /home/rofi/petadigi-migration/
"""

from datetime import datetime

PASSWORD_DEFAULT = '*#PetaDigi2026'
OUTPUT_PATH = '/home/rofi/petadigi-migration/admin_polsek_accounts.txt'

# ── Ambil semua user di group polsek via SQL (Odoo 19 compatible) ────────────
group_polsek = env.ref('petadigi.group_polsek')
env.cr.execute(
    "SELECT uid FROM res_groups_users_rel WHERE gid = %s",
    [group_polsek.id]
)
user_ids = [r[0] for r in env.cr.fetchall()]
users = env['res.users'].sudo().browse(user_ids).filtered(lambda u: u.active and not u.share)

rows = []
for u in users:
    polres_name = u.polres_id.name if u.polres_id else '-'
    polsek_name = u.polsek_id.name if u.polsek_id else '-'
    rows.append({
        'no':       len(rows) + 1,
        'polres':   polres_name,
        'polsek':   polsek_name,
        'username': u.login,
        'password': PASSWORD_DEFAULT,
    })

# Urutkan: Polres A-Z, lalu Polsek A-Z
rows.sort(key=lambda r: (r['polres'], r['polsek']))
for i, r in enumerate(rows, 1):
    r['no'] = i

# ── Print ke konsol ───────────────────────────────────────────────────────────
col = [4, 30, 30, 20, 20]
header = f"{'No':<{col[0]}}  {'Polres':<{col[1]}}  {'Polsek':<{col[2]}}  {'Username':<{col[3]}}  Password"
sep    = '-' * (sum(col) + 10)

print()
print('=' * len(sep))
print('  DAFTAR AKUN ADMIN POLSEK — PetaDigi')
print(f'  Dibuat: {datetime.now().strftime("%d %B %Y %H:%M")}')
print('=' * len(sep))
print(header)
print(sep)

cur_polres = None
for r in rows:
    # Beri baris pemisah saat polres berganti
    if r['polres'] != cur_polres:
        if cur_polres is not None:
            print()
        cur_polres = r['polres']
    print(f"{r['no']:<{col[0]}}  {r['polres']:<{col[1]}}  {r['polsek']:<{col[2]}}  {r['username']:<{col[3]}}  {r['password']}")

print(sep)
print(f"Total: {len(rows)} Polsek")
print()

# ── Simpan ke file TXT ────────────────────────────────────────────────────────
with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
    f.write('DAFTAR AKUN ADMIN POLSEK — PetaDigi\n')
    f.write(f'Dibuat: {datetime.now().strftime("%d %B %Y %H:%M")}\n')
    f.write('RAHASIA — Hanya untuk Admin Polda\n')
    f.write('=' * len(sep) + '\n')
    f.write(header + '\n')
    f.write(sep + '\n')

    cur_polres = None
    for r in rows:
        if r['polres'] != cur_polres:
            if cur_polres is not None:
                f.write('\n')
            cur_polres = r['polres']
        f.write(f"{r['no']:<{col[0]}}  {r['polres']:<{col[1]}}  {r['polsek']:<{col[2]}}  {r['username']:<{col[3]}}  {r['password']}\n")

    f.write(sep + '\n')
    f.write(f'Total: {len(rows)} Polsek\n')
    f.write('\nCatatan: Harap segera ganti password setelah login pertama.\n')

print(f"✅ File disimpan di: {OUTPUT_PATH}")
