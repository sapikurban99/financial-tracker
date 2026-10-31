# Financial Tracker

Aplikasi pencatat keuangan pribadi yang statis, tanpa backend, dan tanpa
build step. Buka `index.html` di browser, tidak perlu instalasi.

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

- **Beranda:** total masuk, total keluar, selisih, total saldo dompet,
  transaksi terbaru, dan tren masuk vs keluar 12 bulan terakhir (grafik
  SVG, tanpa library eksternal). Bisa difilter per bulan.
- **Transaksi:** tambah, ubah, dan hapus transaksi. Setiap transaksi punya
  tanggal dan waktu, judul/deskripsi, kategori, dompet, jumlah (Rp), dan
  arah (masuk, keluar, atau transfer).
- **Transfer yang benar:** transfer punya dompet asal dan dompet tujuan,
  memindahkan uang di antara keduanya, mengubah saldo kedua dompet, dan
  tidak dihitung sebagai pemasukan atau pengeluaran.
- **Filter, urutan, dan halaman:** jenis, kategori, dompet, pencarian
  judul, bulan, rentang tanggal, urutan tanggal/jumlah/judul, dan
  pagination 20 transaksi per halaman.
- **Laporan:** pengeluaran per kategori dengan persentase, grafik donat
  SVG, serta saldo per dompet. Bisa difilter per bulan.
- **Anggaran:** total anggaran, total terpakai, sisa anggaran, dan uang
  harian (sisa anggaran dibagi jumlah hari dalam bulan yang dipilih).
  Formulir anggaran otomatis mengisi anggaran yang sudah tersimpan saat
  kategori diubah.
- **Dompet:** daftar dompet, saldo awal, dan saldo terhitung. Dompet baru
  bisa ditambahkan. Dompet yang dipakai transaksi tidak bisa dihapus.
- **Kategori:** daftar kategori, tambah kategori baru, dan hapus kategori
  yang belum dipakai di transaksi mana pun.
- **Tampilan:** mode gelap dan terang (tombol di atas, tersimpan di
  browser), tata letak responsif untuk ponsel, empty state, loading state
  untuk Supabase, notifikasi toast, dan dialog konfirmasi untuk tindakan
  yang menghapus data.
- **Penyimpanan:** semua data tersimpan di browser lewat `localStorage`
  dengan kunci `financial-tracker-v1`. Tidak ada data yang dikirim ke
  server, kecuali saat Anda sengaja memuat data dari Supabase Anda sendiri.
- **Supabase (opsional, hanya baca):** tab Supabase menampilkan total
  bulanan dan kategori dari Supabase, tanpa mengubah fitur lokal di atas.

Catatan perhitungan:

- Saldo dompet = saldo awal + total masuk − total keluar untuk dompet itu
  − transfer keluar dari dompet itu + transfer masuk ke dompet itu.
- Transfer tidak dihitung sebagai pemasukan atau pengeluaran.

## Data contoh

Saat pertama dibuka, aplikasi memuat satu set data contoh yang jelas
berlabel **"Data contoh (ilustrasi saja)"** dan setiap judulnya diawali
`Contoh:`. Angka-angka itu hanya ilustrasi umum, bukan data asli siapa pun.

Untuk menghapusnya, klik **Hapus Data Contoh** di banner atas. Untuk
memuatnya kembali, klik **Muat Data Contoh** di Beranda.

## Format CSV

### Ekspor

Klik **Ekspor CSV** di Beranda untuk mengunduh semua transaksi yang
tersimpan saat ini sebagai `financial-tracker.csv`. Kolomnya:

```csv
date,title,category,wallet,amount,direction,toWallet
```

Kolom `toWallet` hanya diisi untuk transfer.

### Impor

Klik **Impor CSV** di Beranda, lalu pilih file CSV dengan header di atas.
Aplikasi akan menampilkan pratinjau: baris valid, baris yang dilewati
beserta alasannya, dan tombol konfirmasi sebelum impor benar-benar
dilakukan.

Ketentuan kolom:

- `date`: `YYYY-MM-DD` atau `YYYY-MM-DD HH:MM`. Contoh: `2026-01-05`
  atau `2026-01-05 08:00`.
- `title`: judul atau deskripsi transaksi.
- `category`: nama kategori. Kategori baru akan ditambahkan otomatis.
- `wallet`: nama dompet asal. Dompet baru akan ditambahkan otomatis
  dengan saldo awal 0.
- `toWallet`: nama dompet tujuan, wajib untuk transfer, dan harus
  berbeda dari dompet asal.
- `amount`: angka dalam Rupiah, tanpa simbol Rp. Contoh: `250000`.
- `direction`: salah satu dari `in` (masuk), `out` (keluar), atau
  `transfer`. Nilai lain membuat baris dilewati, dengan alasan yang
  ditampilkan di pratinjau.

## Cadangan JSON

Klik **Ekspor JSON** di Beranda untuk mengunduh cadangan lengkap
(transaksi, dompet, kategori, anggaran) sebagai
`financial-tracker-backup.json`. Klik **Impor JSON** untuk memulihkannya;
data yang ada tetap dipertahankan dan data cadangan ditambahkan.

Pengaturan Supabase sengaja tidak ikut diekspor dalam cadangan JSON,
supaya file cadangan tidak pernah membawa kredensial.

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

## File

- `index.html` — kerangka halaman dan semua tampilan.
- `styles.css` — sistem desain (variabel warna, mode gelap, kartu,
  formulir, toast, dan modal).
- `js/utils.js` — format Rupiah/tanggal, helper bulan, dan unduhan file.
- `js/state.js` — data lokal, data contoh, saldo dompet, dan
  penyimpanan localStorage.
- `js/charts.js` — grafik SVG: tren 12 bulan dan donat kategori.
- `js/ui.js` — tema, navigasi, toast, dan dialog konfirmasi.
- `js/transactions.js` — formulir, filter, urutan, dan pagination
  transaksi, termasuk transfer dengan dompet tujuan.
- `js/finance.js` — Beranda, Laporan, Anggaran, Dompet, dan Kategori.
- `js/import-export.js` — pratinjau dan impor CSV, ekspor CSV, dan
  cadangan JSON.
- `js/supabase.js` — pengaturan, uji koneksi, dan tampilan data Supabase
  hanya baca.
- `js/main.js` — pengkabelan awal aplikasi saja.
- `.env.example` — placeholder saja untuk variabel Supabase, bukan nilai
  asli.
- `README.md` — dokumen ini.
