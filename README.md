# Financial Tracker

Aplikasi pencatat keuangan pribadi yang sederhana, statis, dan tanpa backend.
Buka `index.html` di browser, tidak perlu build, tidak perlu server, dan tidak
perlu instalasi.

Struktur ini terinspirasi dari tata letak umum aplikasi pencatat keuangan
seperti moni.id (Beranda, Transaksi, Laporan, Anggaran, Dompet, Kategori),
tanpa menyalin merek, logo, atau data akun apa pun dari aplikasi tersebut.

## Cara membuka

1. Buka file `index.html` langsung di browser, atau
2. Jalankan server statis apa pun dari folder ini, misalnya:
   ```sh
   python3 -m http.server 8000
   ```
   lalu buka `http://localhost:8000`.

## Fitur

- **Beranda:** total masuk, total keluar, selisih, total saldo dompet, dan
  transaksi terbaru. Bisa difilter per bulan.
- **Transaksi:** tambah, ubah, dan hapus transaksi. Setiap transaksi punya
  tanggal dan waktu, judul/deskripsi, kategori, dompet, jumlah (Rp), dan arah
  (masuk, keluar, atau transfer).
- **Filter:** jenis, kategori, dompet, pencarian judul, bulan, dan rentang
  tanggal khusus.
- **Laporan:** pengeluaran per kategori dengan persentase, serta saldo per
  dompet. Bisa difilter per bulan.
- **Anggaran:** total anggaran, total terpakai, sisa anggaran, dan uang harian
  (sisa anggaran dibagi jumlah hari dalam bulan yang dipilih). Anggaran bisa
  diubah per kategori.
- **Dompet:** daftar dompet, saldo awal, dan saldo terhitung. Dompet baru bisa
  ditambahkan.
- **Kategori:** daftar kategori, tambah kategori baru, dan hapus kategori yang
  belum dipakai di transaksi mana pun.
- **Penyimpanan:** semua data tersimpan di browser lewat `localStorage`
  dengan kunci `financial-tracker-v1`. Tidak ada data yang dikirim ke server.
- **Supabase (opsional, hanya baca):** tab Supabase menampilkan total
  bulanan dan kategori dari Supabase, tanpa mengubah fitur lokal di atas.

Catatan perhitungan:

- Saldo dompet = saldo awal + total masuk − total keluar untuk dompet itu.
- Transfer dicatat sebagai perpindahan saja. Transfer tidak dihitung sebagai
  pemasukan, pengeluaran, atau perubahan saldo dalam model sederhana ini.

## Data contoh

Saat pertama dibuka, aplikasi memuat satu set data contoh yang jelas
berlabel **"Data contoh (ilustrasi saja)"** dan setiap judulnya diawali
`Contoh:`. Angka-angka itu hanya ilustrasi umum, bukan data asli siapa pun.

Untuk menghapusnya, klik **Hapus Data Contoh** di banner atas. Untuk
memuatnya kembali, klik **Muat Data Contoh** di Beranda.

## Supabase (opsional, hanya baca)

1. Jalankan file SQL moni terlebih dahulu di Supabase untuk membuat tabel:
   - `moni_monthly` dengan kolom `month_start`, `masuk`, `keluar`,
     `net_flow`
   - `moni_monthly_categories` dengan kolom `month_start`, `direction`,
     `category`, `amount`
2. Untuk versi statis ini, buka tab **Supabase** di aplikasi, masukkan
   Supabase URL dan publishable key Anda, klik **Simpan Pengaturan
   Supabase**, lalu klik **Uji Koneksi** atau **Muat Data Supabase**.
   Nilai tersebut hanya tersimpan di browser ini (localStorage dengan kunci
   `financial-tracker-supabase-v1`) dan tidak pernah ditulis ke file repo.
   Klik **Hapus Pengaturan Supabase** untuk menghapusnya dari browser.
3. Untuk versi framework/Vercel di masa depan, atur variabel lingkungan
   `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   di pengaturan proyek deployment, bukan di repo. File `.env.example`
   di repo ini hanya berisi nilai placeholder, bukan nilai asli.
4. Data Supabase ditampilkan sebagai: daftar total bulanan, pemilih bulan,
   total masuk/keluar/selisih untuk bulan terpilih, dan kategori untuk
   bulan tersebut. Data ini hanya baca; menambah atau mengubah transaksi
   lokal tidak mengubah data Supabase.
5. Jika tabel belum ada, aplikasi akan menampilkan pesan bahwa Anda perlu
   menjalankan file SQL di Supabase terlebih dahulu.

Endpoint yang dipakai aplikasi ini:

```text
GET {supabase_url}/rest/v1/moni_monthly?select=*&order=month_start
GET {supabase_url}/rest/v1/moni_monthly_categories?select=*&order=month_start
```

dengan header `apikey` dan `Authorization: Bearer <publishable key>`
yang Anda masukkan di tab Supabase.

## Format CSV

### Ekspor

Klik **Ekspor CSV** di Beranda untuk mengunduh semua transaksi yang tersimpan
saat ini sebagai `financial-tracker.csv`.

### Impor

Klik **Impor CSV** di Beranda, lalu pilih file CSV dengan header berikut:

```csv
date,title,category,wallet,amount,direction
```

Ketentuan kolom:

- `date`: `YYYY-MM-DD` atau `YYYY-MM-DD HH:MM`. Contoh: `2026-01-05` atau
  `2026-01-05 08:00`.
- `title`: judul atau deskripsi transaksi.
- `category`: nama kategori. Kategori baru akan ditambahkan otomatis.
- `wallet`: nama dompet. Dompet baru akan ditambahkan otomatis dengan saldo
  awal 0.
- `amount`: angka dalam Rupiah, tanpa simbol Rp. Contoh: `250000`.
- `direction`: salah satu dari `in` (masuk), `out` (keluar), atau
  `transfer`. Nilai lain akan dianggap `out`.

Contoh isi file:

```csv
date,title,category,wallet,amount,direction
2026-01-05,Contoh: Gaji Bulanan,Gaji,Bank Contoh,10000000,in
2026-01-06,Contoh: Belanja Harian,Belanja,Dompet Utama,250000,out
```

Baris tanpa tanggal, judul, atau jumlah yang valid akan dilewati saat impor.

## File

- `index.html` — struktur halaman dan semua tampilan.
- `styles.css` — gaya tampilan.
- `app.js` — logika aplikasi, filter, anggaran, impor/ekspor CSV,
  penyimpanan localStorage, dan koneksi Supabase hanya baca.
- `.env.example` — placeholder saja untuk variabel Supabase, bukan nilai
  asli.
- `README.md` — dokumen ini.
