const FWPDB={
    name:'family_wealth_planner',
    version:3, // UPGRADE: Naik ke versi 3 (Reset data emas lama, pertahankan data lain)
    stores:['settings','institutions','accounts','pockets','plans','planItems','incomeItems','goals','goalAllocations','ledger','events',
            'assets','debts',
            'owners','goldAccounts','goldPhysical','goldJewelry','goldTransactions'], // BARU
    db:null,
    async open(){
        return new Promise((ok,no)=>{
            let r=indexedDB.open(this.name,this.version);
            r.onupgradeneeded=e=>{
                let d=e.target.result;
                // Hapus tabel emas lama
                if(d.objectStoreNames.contains('goldItems')) {
                    d.deleteObjectStore('goldItems');
                }
                this.stores.forEach(s=>{
                    if(!d.objectStoreNames.contains(s)) d.createObjectStore(s,{keyPath:'id'})
                })
            };
            r.onsuccess=e=>{this.db=e.target.result;ok(this.db)};
            r.onerror=()=>no(r.error)
        })
    },
    store(s,m='readonly'){return this.db.transaction(s,m).objectStore(s)},
    async all(s){return new Promise((ok,no)=>{let r=this.store(s).getAll();r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})},
    async get(s,id){return new Promise((ok,no)=>{let r=this.store(s).get(id);r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})},
    async put(s,x){return new Promise((ok,no)=>{let r=this.store(s,'readwrite').put(x);r.onsuccess=()=>ok(x);r.onerror=()=>no(r.error)})},
    async del(s,id){return new Promise((ok,no)=>{let r=this.store(s,'readwrite').delete(id);r.onsuccess=()=>ok();r.onerror=()=>no(r.error)})},
    async clear(s){return new Promise((ok,no)=>{let r=this.store(s,'readwrite').clear();r.onsuccess=()=>ok();r.onerror=()=>no(r.error)})},
    async dump(){
        let x={schemaVersion:this.version,exportedAt:new Date().toISOString(),data:{}};
        for(let s of this.stores)x.data[s]=await this.all(s);
        return x;
    },
    async restore(x){
        if(!x?.data||!x.schemaVersion)throw Error('invalid');
        for(let s of this.stores){
            await this.clear(s);
            for(let row of(x.data[s]||[])) await this.put(s,row)
        }
    }
};