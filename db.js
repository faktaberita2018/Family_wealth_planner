const FWPDB={
    name:'family_wealth_planner',
    version:4,
    stores:['settings','institutions','accounts','pockets','plans','planItems','incomeItems','goals','goalAllocations','ledger','events',
            'assets','debts','owners','goldAccounts','goldPhysical','goldJewelry','goldTransactions',
            'goldPriceProviders','goldPriceMeta'],
    db:null,
    async open(){
        return new Promise((ok,no)=>{
            const r=indexedDB.open(this.name,this.version);
            r.onupgradeneeded=e=>{
                const d=e.target.result;
                // Versi 4 memakai model emas baru. Data emas lama boleh direset sesuai keputusan produk.
                ['goldItems','goldAccounts','goldPhysical','goldJewelry','goldTransactions','goldPriceProviders','goldPriceMeta']
                  .forEach(s=>{ if(d.objectStoreNames.contains(s)) d.deleteObjectStore(s); });
                this.stores.forEach(s=>{
                    if(!d.objectStoreNames.contains(s)) d.createObjectStore(s,{keyPath:'id'});
                });
            };
            r.onsuccess=e=>{this.db=e.target.result;ok(this.db)};
            r.onerror=()=>no(r.error);
        });
    },
    store(s,m='readonly'){return this.db.transaction(s,m).objectStore(s)},
    async all(s){return new Promise((ok,no)=>{const r=this.store(s).getAll();r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})},
    async get(s,id){return new Promise((ok,no)=>{const r=this.store(s).get(id);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})},
    async put(s,x){return new Promise((ok,no)=>{const r=this.store(s,'readwrite').put(x);r.onsuccess=()=>ok(x);r.onerror=()=>no(r.error)})},
    async del(s,id){return new Promise((ok,no)=>{const r=this.store(s,'readwrite').delete(id);r.onsuccess=()=>ok();r.onerror=()=>no(r.error)})},
    async clear(s){return new Promise((ok,no)=>{const r=this.store(s,'readwrite').clear();r.onsuccess=()=>ok();r.onerror=()=>no(r.error)})},
    async dump(){
        const x={schemaVersion:this.version,exportedAt:new Date().toISOString(),data:{}};
        for(const s of this.stores)x.data[s]=await this.all(s);
        return x;
    },
    async restore(x){
        if(!x?.data||!x.schemaVersion)throw Error('Backup tidak valid');
        for(const s of this.stores){
            await this.clear(s);
            for(const row of(x.data[s]||[])) await this.put(s,row);
        }
    }
};