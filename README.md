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
- `app.js` — logika aplikasi, filter, anggaran, impor/ekspor CSV, dan
  penyimpanan localStorage.
- `README.md` — dokumen ini.
