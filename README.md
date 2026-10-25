# Family Wealth Planner — Foundation Audit & Milestone 1.1

## Perbaikan fondasi

- IndexedDB versioned menggantikan satu objek Local Storage.
- Rekening adalah saldo nyata. Kantong adalah alokasi di dalam rekening dan tidak dihitung dua kali.
- Tujuan tidak memiliki saldo virtual. Progress berasal dari goal allocation atas rekening/kantong nyata.
- Status Dana Disiapkan dapat berupa penanda saja atau transfer saldo nyata.
- Transfer antar rekening/kantong masuk ledger.
- Monthly Closing mengikuti mode onboarding dan mendukung carry forward, alokasi tujuan, rekening utama, serta defisit.
- Ledger aktivitas dan reversal untuk perubahan saldo yang didukung.
- Mode saldo fleksibel/ketat.
- UI Bahasa Indonesia.
- Backup/restore seluruh IndexedDB beserta schema version.

## Menjalankan di Windows

1. Ekstrak ZIP.
2. Klik `START_WINDOWS.bat`.
3. Buka `http://localhost:8787`.

## Menjalankan di macOS/Linux

```bash
sh START_MAC_LINUX.sh
```

## iPhone

Untuk uji dari jaringan yang sama, jalankan server di laptop dan buka `http://IP-LAPTOP:8787` melalui Safari. Untuk instalasi PWA/offline penuh di iPhone, deploy folder ini ke hosting HTTPS.

## Batas Milestone 1.1

Belum mencakup emas, perhiasan, aset tetap, net worth, hutang/piutang, attachment, akun cloud, dan sinkronisasi. Modul berikutnya harus menggunakan ledger, account/pocket, goal allocation, dan IndexedDB repository yang sudah tersedia.
