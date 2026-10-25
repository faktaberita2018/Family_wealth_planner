# Foundation Audit Result

## Accounting model

1. `Account.balance` adalah saldo aktual pada lembaga keuangan.
2. `Pocket.balance` adalah bagian dari `Account.balance`, bukan aset tambahan.
3. Total kekayaan kas Milestone 1.1 hanya menjumlahkan `Account.balance`.
4. `GoalAllocation` adalah earmark virtual atas account/pocket. Membuat allocation tidak mengubah saldo.
5. Planning tidak otomatis mengubah saldo.
6. Funding marker tidak mengubah saldo; funding transfer membuat dua ledger entries.
7. Posted balance events dikoreksi melalui reversal, bukan hard delete.

## Monthly closing

- Ringkas: semua planned allocation dianggap terpakai.
- Closing ringan/rinci: pengguna dapat memasukkan sisa tiap pos.
- Surplus dapat dialokasikan, dibawa, masuk rekening, atau tidak mengubah saldo.
- Defisit dapat dibawa ke bulan berikutnya, ditutup dari rekening, atau dicatat saja.

## Known limitation

Reversal pada Milestone 1.1 otomatis untuk event saldo individual. Reversal transfer menghasilkan pasangan event sehingga pembatalan penuh transfer akan disempurnakan dengan transaction-group reversal pada iterasi berikutnya.
