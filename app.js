const S={page:'home',wealth:'goals',month:new Date().toISOString().slice(0,7),privacy:false,theme:'light',cache:{}};
const $=q=>document.querySelector(q),$$=q=>[...document.querySelectorAll(q)];
const id=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const n=v=>Number(String(v||0).replace(/[^0-9.-]/g,''))||0;
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const dateNow=()=>new Date().toISOString();

function toast(x){$('#toast').textContent=x;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),2300)}
function money(x){return S.privacy?'Rp••••••':new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n(x))}
function monthName(x){return new Intl.DateTimeFormat('id-ID',{month:'long',year:'numeric'}).format(new Date(x+'-01T00:00:00'))}
function f(label,id,type='text',value='',full=''){return `<div class="field ${full}"><label>${label}</label><input class="input" id="${id}" type="${type}" value="${esc(value)}"></div>`}
function v(id){return $('#'+id)?.value||''}
function modal(title,body,save){$('#modalTitle').textContent=title;$('#modalBody').innerHTML=body;$('#modalFoot').innerHTML=`<button type="button" class="btn ghost" data-action="closeModal">Batal</button>${save?`<button class="btn primary" type="submit">Simpan</button>`:''}`;$('#modalForm').onsubmit=async e=>{e.preventDefault();if(save)await save()};$('#modal').showModal()}
function closeModal(){$('#modal').close()}

async function refresh(){
    for(let s of FWPDB.stores) S.cache[s]=await FWPDB.all(s);
    let set=S.cache.settings.find(x=>x.id==='main');
    if(set){S.theme=set.theme;S.privacy=set.privacy;document.documentElement.dataset.theme=S.theme}
    render();
    if(!set?.onboarded)showOnboarding(1)
}

function setting(){return S.cache.settings.find(x=>x.id==='main')||{id:'main',onboarded:false,budgetMode:'simple',defaultClosing:'used',surplusBehavior:'ask',strictBalance:false,theme:'light',privacy:false,ownerName:'Kamu',goldPrice:2000000}}
function acct(id){return S.cache.accounts.find(x=>x.id===id)}
function pocket(id){return S.cache.pockets.find(x=>x.id===id)}
function goal(id){return S.cache.goals.find(x=>x.id===id)}
function source(id){return pocket(id)||acct(id)}
function sourceName(id){return source(id)?.name||'Tanpa perubahan saldo'}

// --- KALKULASI NET WORTH ---
function totalAccountBalance(){return S.cache.accounts.reduce((a,x)=>a+n(x.balance),0)}
function totalGoldValue(){ return S.cache.goldItems.reduce((a,x)=>a+(n(x.weight)*n(setting().goldPrice)),0) }
function totalAssetValue(){ return S.cache.assets.reduce((a,x)=>a+n(x.value),0) }
function totalPiutang(){ return S.cache.debts.filter(x=>x.type==='piutang'&&x.status==='active').reduce((a,x)=>a+n(x.amount),0) }
function totalUtang(){ return S.cache.debts.filter(x=>x.type==='utang'&&x.status==='active').reduce((a,x)=>a+n(x.amount),0) }
function netWorth(){ return totalAccountBalance() + totalGoldValue() + totalAssetValue() + totalPiutang() - totalUtang() }

function pocketAllocated(aid){return S.cache.pockets.filter(x=>x.accountId===aid).reduce((a,x)=>a+n(x.balance),0)}
function unallocated(a){return n(a.balance)-pocketAllocated(a.id)}
function plan(){return S.cache.plans.find(x=>x.month===S.month)}
function incomes(pid){return S.cache.incomeItems.filter(x=>x.planId===pid)}
function items(pid){return S.cache.planItems.filter(x=>x.planId===pid)}
function pstats(p){if(!p)return{income:0,alloc:0,surplus:0,funded:0};let ii=incomes(p.id),it=items(p.id),income=ii.reduce((a,x)=>a+n(x.amount),0),alloc=it.reduce((a,x)=>a+n(x.amount),0);return{income,alloc,surplus:income-alloc,funded:it.filter(x=>x.fundingStatus==='funded').reduce((a,x)=>a+n(x.amount),0)}}
function goalValue(gid){return S.cache.goalAllocations.filter(x=>x.goalId===gid&&x.status==='active').reduce((a,x)=>a+n(x.amount),0)}

function render(){renderNav();let fn={home:home,plan:planView,wealth:wealth,more:more}[S.page];$('#view').innerHTML=fn()}
function renderNav(){$$('#nav [data-page]').forEach(x=>x.classList.toggle('active',x.dataset.page===S.page))}

// --- HALAMAN BERANDA ---
function home(){
    let p=plan(),ps=pstats(p),g=S.cache.goals.filter(x=>!['archived','cancelled'].includes(x.status)).sort((a,b)=>a.priority-b.priority).slice(0,3);
    return `<div class="hero" style="background:linear-gradient(135deg,#172019,#2a3d1c)">
        <div class="eyebrow">Total Kekayaan Bersih Banget</div>
        <h1>${money(netWorth())}</h1>
        <p style="display:flex;gap:10px;flex-wrap:wrap;font-size:12px">
            <span>💵 Kas: ${money(totalAccountBalance())}</span>
            <span>🧈 Emas: ${money(totalGoldValue())}</span>
            <span>🏠 Aset: ${money(totalAssetValue())}</span>
            <span>📉 Utang: ${money(totalUtang())}</span>
        </p>
    </div>
    <div class="grid two" style="margin-top:15px">
        <div class="card kpi"><span class="muted small">Pendapatan Rencana</span><b>${money(ps.income)}</b></div>
        <div class="card kpi"><span class="muted small">Sisa Rencana</span><b class="${ps.surplus<0?'negative':'positive'}">${money(ps.surplus)}</b></div>
    </div>
    <div class="grid two">
        <div><div class="section"><div><h2>Rencana ${monthName(S.month)}</h2><span class="muted">Tidak wajib catat harian.</span></div></div>${p?`<div class="card"><div class="row"><div class="grow"><b>Total alokasi</b><small class="muted">${items(p.id).length} pos</small></div><b>${money(ps.alloc)}</b></div><div class="row"><div class="grow"><b>Dana disiapkan</b><small class="muted">Penanda atau transfer nyata</small></div><b>${money(ps.funded)}</b></div></div>`:`<div class="card empty">Belum ada rencana.<br><button class="btn primary" data-action="newPlan">Buat sekarang</button></div>`}</div>
        <div><div class="section"><div><h2>Tujuan Prioritas</h2><span class="muted">Nilai berasal dari alokasi saldo nyata.</span></div></div><div class="card">${g.length?g.map(goalRow).join(''):'<div class="empty">Belum ada tujuan.</div>'}</div></div>
    </div>`
}

function goalRow(g){let x=goalValue(g.id),pc=Math.min(100,x/Math.max(1,n(g.target))*100);return `<div class="row"><span style="font-size:24px">${g.icon||'🎯'}</span><div class="grow"><b>${esc(g.name)}</b><div class="progress" style="margin:6px 0"><i style="width:${pc}%"></i></div><small class="muted">${money(x)} · ${pc.toFixed(1)}%</small></div></div>`}
function planView(){let p=plan(),ps=pstats(p);return `<div class="section"><div><h2>Rencana Bulanan</h2><span class="muted">Rencana tidak otomatis mengubah saldo rekening.</span></div><button class="btn primary" data-action="${p?'addPlanItem':'newPlan'}">＋ ${p?'Tambah pos':'Buat rencana'}</button></div><div class="monthbar"><button class="icon" data-action="prevMonth">‹</button><b>${monthName(S.month)}</b><button class="icon" data-action="nextMonth">›</button></div>${p?`<div class="grid four" style="margin-top:15px"><div class="card kpi"><span class="muted small">Pendapatan</span><b>${money(ps.income)}</b><button class="btn ghost" data-action="addIncome">＋ Income</button></div><div class="card kpi"><span class="muted small">Alokasi</span><b>${money(ps.alloc)}</b></div><div class="card kpi"><span class="muted small">Dana Disiapkan</span><b>${money(ps.funded)}</b></div><div class="card kpi"><span class="muted small">Sisa/Minus</span><b class="${ps.surplus<0?'negative':'positive'}">${money(ps.surplus)}</b></div></div><div class="section"><div><h2>Daftar alokasi</h2><span class="muted">Status funded dapat hanya penanda atau transfer.</span></div><div><button class="btn ghost" data-action="copyPlan">Salin bulan lalu</button> <button class="btn dark" data-action="closing">Tutup Bulan</button></div></div><div class="card">${items(p.id).length?items(p.id).map(x=>`<div class="split"><div><b>${esc(x.name)}</b><small class="muted">${esc(x.category)} · ${x.fundingMode==='transfer'?'Transfer saldo':'Penanda saja'}</small></div><div style="text-align:right"><b>${money(x.amount)}</b><br><button class="fund ${x.fundingStatus}" data-fund="${x.id}">${x.fundingStatus==='funded'?'Dana Disiapkan':'Direncanakan'}</button> <button class="icon" data-remove-item="${x.id}">×</button></div></div>`).join(''):'<div class="empty">Belum ada pos.</div>'}</div>`:`<div class="card empty" style="margin-top:15px">Belum ada rencana ${monthName(S.month)}.<br><button class="btn primary" data-action="newPlan">Buat rencana</button> <button class="btn ghost" data-action="copyPlan">Salin bulan lalu</button></div>`}`}

// --- HALAMAN KEKAYAAN (UPGRADE) ---
function wealth(){
    return `<div class="section"><div><h2>Fondasi Kekayaan</h2><span class="muted">Tujuan hanyalah alokasi, bukan saldo virtual.</span></div></div>
    <div class="tabs">
        <button class="tab ${S.wealth==='goals'?'active':''}" data-wealth="goals">Tujuan</button>
        <button class="tab ${S.wealth==='accounts'?'active':''}" data-wealth="accounts">Rekening</button>
        <button class="tab ${S.wealth==='gold'?'active':''}" data-wealth="gold">Emas</button>
        <button class="tab ${S.wealth==='assets'?'active':''}" data-wealth="assets">Aset Tetap</button>
        <button class="tab ${S.wealth==='debts'?'active':''}" data-wealth="debts">Utang/Piutang</button>
    </div>
    ${S.wealth==='goals'?goalsView():S.wealth==='accounts'?accountsView():S.wealth==='gold'?goldView():S.wealth==='assets'?assetsView():debtsView()}`
}

function goalsView(){return `<div class="section"><div><h2>Tujuan Keuangan</h2><span class="muted">Satu saldo dapat dialokasikan ke beberapa tujuan.</span></div><button class="btn primary" data-action="addGoal">＋ Tujuan</button></div><div class="grid three">${S.cache.goals.map(g=>{let x=goalValue(g.id),pc=Math.min(100,x/Math.max(1,n(g.target))*100);return `<div class="card"><div style="display:flex;justify-content:space-between"><span style="font-size:26px">${g.icon}</span><span class="badge ${g.status==='used'?'purple':g.status==='achieved'?'green':'blue'}">${g.status}</span></div><h3>${esc(g.name)}</h3><small class="muted">Target ${money(g.target)} · Prioritas ${g.priority}</small><div class="progress" style="margin:14px 0 7px"><i style="width:${pc}%"></i></div><b>${money(x)}</b><small class="muted"> · ${pc.toFixed(1)}%</small><div style="margin-top:14px"><button class="btn ghost" data-allocate="${g.id}">Alokasikan saldo</button> <button class="btn ghost" data-goal-status="${g.id}">Status</button></div></div>`}).join('')||'<div class="card empty">Belum ada tujuan.</div>'}</div>`}

function accountsView(){return `<div class="section"><div><h2>Rekening & Kantong</h2><span class="muted">Saldo rekening induk tidak dijumlahkan lagi dengan kantong.</span></div><button class="btn primary" data-action="addInstitution">＋ Institusi</button></div><div class="grid two">${S.cache.institutions.map(i=>`<div class="card"><div style="display:flex;justify-content:space-between"><div><b>${esc(i.name)}</b><small class="muted">${esc(i.type)}</small></div><button class="btn ghost" data-add-account="${i.id}">＋ Rekening</button></div>${S.cache.accounts.filter(a=>a.institutionId===i.id).map(a=>{let pa=S.cache.pockets.filter(p=>p.accountId===a.id),alloc=pocketAllocated(a.id),ua=unallocated(a);return `<div style="margin-top:15px"><div class="row"><div class="grow"><b>${esc(a.name)}</b>${a.isMain?'<span class="badge green">Utama</span>':''}<small class="muted">Saldo aktual · Kantong ${money(alloc)} · Bebas ${money(ua)}</small></div><b>${money(a.balance)}</b><button class="icon" data-reconcile-account="${a.id}">✎</button><button class="icon" data-add-pocket="${a.id}">＋</button></div>${ua<0?'<div class="warning small">Total kantong melebihi saldo rekening. Lakukan rekonsiliasi.</div>':''}${pa.map(p=>`<div class="row" style="margin-left:17px"><div class="grow"><b>↳ ${esc(p.name)}</b><small class="muted">Alokasi dalam rekening</small></div><b>${money(p.balance)}</b><button class="icon" data-reconcile-pocket="${p.id}">✎</button></div>`).join('')}</div>`}).join('')||'<div class="empty">Belum ada rekening.</div>'}</div>`).join('')}</div>`}

// --- MODUL EMAS ---
function goldView() {
    let gp = setting().goldPrice;
    return `<div class="section">
        <div><h2>Aset Emas</h2><span class="muted">Harga acuan saat ini: ${money(gp)}/gram</span></div>
        <button class="btn primary" data-action="addGold">＋ Emas</button>
    </div>
    <div class="grid three">
        ${S.cache.goldItems.map(g=>{
            let val = n(g.weight) * gp;
            return `<div class="card">
                <div style="display:flex;justify-content:space-between">
                    <span class="badge orange">${esc(g.brand)}</span>
                    <b>${n(g.weight)} gr</b>
                </div>
                <h3 style="margin:10px 0">${esc(g.name)}</h3>
                <small class="muted">Beli: ${money(g.buyPrice)}</small>
                <div style="margin-top:10px;border-top:1px solid var(--line);padding-top:10px">
                    <small class="muted">Estimasi Nilai</small>
                    <b style="display:block;font-size:18px;color:var(--green)">${money(val)}</b>
                </div>
                <button class="btn red" style="margin-top:10px;width:100%" data-del-gold="${g.id}">Jual/Hapus</button>
            </div>`
        }).join('')||'<div class="card empty">Belum ada emas tercatat.</div>'}
    </div>`
}

// --- MODUL ASET TETAP ---
function assetsView() {
    return `<div class="section">
        <div><h2>Aset Tetap</h2><span class="muted">Kendaraan, Properti, Elektronik.</span></div>
        <button class="btn primary" data-action="addAsset">＋ Aset</button>
    </div>
    <div class="grid three">
        ${S.cache.assets.map(a=>`
            <div class="card">
                <span class="badge blue">${esc(a.category)}</span>
                <h3 style="margin:10px 0">${esc(a.name)}</h3>
                <small class="muted">Beli: ${money(a.buyPrice)}</small>
                <div style="margin-top:10px;border-top:1px solid var(--line);padding-top:10px">
                    <small class="muted">Nilai Saat Ini</small>
                    <b style="display:block;font-size:18px">${money(a.value)}</b>
                </div>
                <button class="btn red" style="margin-top:10px;width:100%" data-del-asset="${a.id}">Hapus</button>
            </div>
        `).join('')||'<div class="card empty">Belum ada aset tetap.</div>'}
    </div>`
}

// --- MODUL UTANG & PIUTANG ---
function debtsView() {
    let utang = S.cache.debts.filter(x=>x.type==='utang'&&x.status==='active');
    let piutang = S.cache.debts.filter(x=>x.type==='piutang'&&x.status==='active');
    
    return `<div class="section">
        <div><h2>Utang & Piutang</h2><span class="muted">Catat kewajiban dan hak Anda.</span></div>
        <button class="btn primary" data-action="addDebt">＋ Catat</button>
    </div>
    <div class="grid two">
        <div class="card" style="border-top:4px solid var(--red)">
            <h3>📉 Utang (Kewajiban)</h3>
            ${utang.map(d=>`<div class="split"><div><b>${esc(d.name)}</b><small class="muted">Jatuh tempo: ${d.dueDate||'-'}</small></div><div style="text-align:right"><b class="negative">${money(d.amount)}</b><br><button class="btn ghost small" data-settle-debt="${d.id}">Lunas</button></div></div>`).join('')||'<div class="empty small">Tidak ada utang aktif.</div>'}
        </div>
        <div class="card" style="border-top:4px solid var(--green)">
            <h3>🤝 Piutang (Dapat Diterima)</h3>
            ${piutang.map(d=>`<div class="split"><div><b>${esc(d.name)}</b><small class="muted">Jatuh tempo: ${d.dueDate||'-'}</small></div><div style="text-align:right"><b class="positive">${money(d.amount)}</b><br><button class="btn ghost small" data-settle-debt="${d.id}">Terima</button></div></div>`).join('')||'<div class="empty small">Tidak ada piutang aktif.</div>'}
        </div>
    </div>`
}

function more(){
    let led=S.cache.ledger.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,12);
    return `<div class="section"><div><h2>Pengaturan & Riwayat</h2></div></div>
    <div class="grid two">
        <div class="card">
            <h3>Preferensi</h3>
            <div class="row"><div class="grow"><b>Harga Emas Acuan</b><small class="muted">Per gram</small></div><button class="btn ghost" data-action="setGoldPrice">${money(setting().goldPrice)}</button></div>
            <div class="row"><div class="grow"><b>Mode budgeting</b><small class="muted">${esc(setting().budgetMode)}</small></div><button class="btn ghost" data-action="preferences">Ubah</button></div>
        </div>
        <div class="card"><h3>Data</h3><p class="muted">Backup seluruh object store dan versi skema.</p><button class="btn dark" data-action="backup">Backup JSON</button> <button class="btn ghost" data-action="restore">Restore</button></div>
        <div class="card" style="grid-column:1/-1"><h3>Aktivitas terbaru</h3><div class="ledger">${led.length?led.map(l=>`<div class="row"><div class="grow"><b>${esc(l.label)}</b><small class="muted">${new Date(l.createdAt).toLocaleString('id-ID')} · ${esc(l.status)}</small></div><span class="amount ${n(l.amount)<0?'negative':'positive'}">${money(l.amount)}</span></div>`).join(''):'<div class="empty">Belum ada aktivitas.</div>'}</div></div>
    </div>`
}

// --- HELPER CRUD ---
async function ledger(type,label,amount,meta={},reversible=true){await FWPDB.put('ledger',{id:id('l'),type,label,amount:n(amount),meta,status:'posted',reversible,createdAt:dateNow()})}
async function alterSource(sid,delta,label,meta={}){
    if(!sid)return;
    let p=await FWPDB.get('pockets',sid);
    if(p){
        let a=await FWPDB.get('accounts',p.accountId);
        if(n(p.balance)+delta<0&&setting().strictBalance)throw Error('Saldo kantong tidak cukup');
        if(n(a.balance)+delta<0&&setting().strictBalance)throw Error('Saldo rekening tidak cukup');
        p.balance=n(p.balance)+delta;a.balance=n(a.balance)+delta;
        await FWPDB.put('pockets',p);await FWPDB.put('accounts',a);
        await ledger('balance',label,delta,{sourceId:sid,...meta});return
    }
    let a=await FWPDB.get('accounts',sid);
    if(a){
        if(n(a.balance)+delta<0&&setting().strictBalance)throw Error('Saldo rekening tidak cukup');
        a.balance=n(a.balance)+delta;
        await FWPDB.put('accounts',a);
        await ledger('balance',label,delta,{sourceId:sid,...meta})
    }
}

function sourceOpts(selected=''){return [...S.cache.accounts,...S.cache.pockets].map(x=>`<option value="${x.id}" ${selected===x.id?'selected':''}>${esc(x.name)}</option>`).join('')}

// --- ONBOARDING & SETUP ---
function showOnboarding(step){
    $('#onboarding').classList.remove('hidden');
    let q=step===1?`<div class="onboard-main"><div class="eyebrow">Langkah 1/3</div><h1>Cara mengelola anggaran?</h1><div class="choice" id="onChoice"><button data-v="simple" class="selected"><b>Ringkas</b><br><span class="muted">Rencana tanpa transaksi harian.</span></button><button data-v="closing"><b>Closing ringan</b><br><span class="muted">Isi sisa saat akhir bulan.</span></button><button data-v="detailed"><b>Lebih rinci</b><br><span class="muted">Status funded dan realisasi opsional.</span></button></div><button class="btn primary" data-on-next="2">Lanjut</button></div>`:
    step===2?`<div class="onboard-main"><div class="eyebrow">Langkah 2/3</div><h1>Jika tidak ada catatan sisa?</h1><div class="choice" id="onChoice"><button data-v="used" class="selected"><b>Anggap seluruh alokasi terpakai</b></button><button data-v="ask"><b>Selalu tanyakan</b></button><button data-v="remain"><b>Anggap masih tersisa</b></button></div><button class="btn ghost" data-on-next="1">Kembali</button> <button class="btn primary" data-on-next="3">Lanjut</button></div>`:
    `<div class="onboard-main"><div class="eyebrow">Langkah 3/3</div><h1>Pengaturan awal</h1><div class="formgrid">${f('Nama panggilan','onName','text','Anggi')}<div class="field"><label>Perilaku sisa</label><select id="onSurplus" class="input"><option value="ask">Tanyakan saat closing</option><option value="goal">Tujuan prioritas</option><option value="carry">Bawa bulan berikutnya</option><option value="main">Rekening utama</option></select></div><div class="field full"><label><input id="onStrict" type="checkbox"> Gunakan mode saldo ketat</label></div></div><button class="btn ghost" data-on-next="2">Kembali</button> <button class="btn primary" data-action="finishOnboarding">Mulai</button></div>`;
    $('#onStep').innerHTML=q
}
let ON={budgetMode:'simple',defaultClosing:'used'};

async function seed(){
    let set=await FWPDB.get('settings','main');if(set)return;
    await FWPDB.put('settings',{id:'main',onboarded:false,ownerName:'Kamu',budgetMode:'simple',defaultClosing:'used',surplusBehavior:'ask',strictBalance:false,theme:'light',privacy:false,goldPrice:2000000});
    for(let x of[{id:'i1',name:'Bank Jago',type:'Bank'},{id:'i2',name:'BCA',type:'Bank'},{id:'i3',name:'Tunai',type:'Kas'}])await FWPDB.put('institutions',x)
}

// --- FITUR CRUD MODAL BARU ---
async function newPlan(){modal('Buat Rencana Bulanan',f('Nama rencana','x_name','text','Rencana '+monthName(S.month)),async()=>{await FWPDB.put('plans',{id:id('pl'),month:S.month,name:v('x_name'),status:'open',createdAt:dateNow()});closeModal();await refresh();toast('Rencana dibuat')})}
async function addIncome(){let p=plan();modal('Tambah Pendapatan',`<div class="formgrid">${f('Sumber','x_name','text','Gaji')}${f('Nominal','x_amount','number','')}</div>`,async()=>{if(!v('x_name')||!n(v('x_amount')))return toast('Lengkapi data');await FWPDB.put('incomeItems',{id:id('in'),planId:p.id,name:v('x_name'),amount:n(v('x_amount'))});await ledger('plan','Tambah pendapatan rencana',n(v('x_amount')),{planId:p.id},false);closeModal();await refresh()})}
async function addPlanItem(){let p=plan();modal('Tambah Alokasi',`<div class="formgrid">${f('Nama pos','x_name')}${f('Nominal','x_amount','number')}<div class="field"><label>Kategori</label><select id="x_cat" class="input"><option>Pengeluaran Wajib</option><option>Living</option><option>Playing</option><option>Saving</option><option>Cicilan</option><option>Sosial / Zakat</option><option>Kebutuhan Anak</option><option>Sinking Fund</option><option>Lainnya</option></select></div><div class="field"><label>Rekening sumber opsional</label><select id="x_source" class="input"><option value="">Belum dipilih</option>${sourceOpts()}</select></div></div>`,async()=>{if(!v('x_name')||!n(v('x_amount')))return toast('Lengkapi data');await FWPDB.put('planItems',{id:id('pi'),planId:p.id,name:v('x_name'),amount:n(v('x_amount')),category:v('x_cat'),sourceId:v('x_source'),fundingStatus:'planned',fundingMode:'marker',createdAt:dateNow()});closeModal();await refresh()})}
async function fundItem(iid){
    let x=await FWPDB.get('planItems',iid);
    if(x.fundingStatus==='funded')return toast('Pos sudah didanai. Gunakan riwayat bila perlu dibatalkan.');
    modal('Siapkan Dana',`<p class="muted">${esc(x.name)} · ${money(x.amount)}</p><div class="field"><label>Metode</label><select id="x_mode" class="input"><option value="marker">Hanya penanda, jangan ubah saldo</option><option value="transfer">Kurangi sumber dan pindahkan ke tujuan</option></select></div><div class="formgrid" style="margin-top:12px"><div class="field"><label>Sumber</label><select id="x_from" class="input"><option value="">Pilih</option>${sourceOpts(x.sourceId)}</select></div><div class="field"><label>Tujuan rekening/kantong</label><select id="x_to" class="input"><option value="">Pilih</option>${sourceOpts()}</select></div></div>`,async()=>{
        let mode=v('x_mode'),from=v('x_from'),to=v('x_to');
        try{
            if(mode==='transfer'){
                if(!from||!to||from===to)return toast('Pilih sumber dan tujuan berbeda');
                await alterSource(from,-n(x.amount),'Pendanaan pos: '+x.name,{itemId:x.id,counterpart:to});
                await alterSource(to,n(x.amount),'Dana masuk pos: '+x.name,{itemId:x.id,counterpart:from})
            }
            x.fundingStatus='funded';x.fundingMode=mode;x.fundedAt=dateNow();await FWPDB.put('planItems',x);
            await ledger('funding','Tandai funded: '+x.name,0,{itemId:x.id,mode},false);
            closeModal();await refresh();toast('Pos ditandai Dana Disiapkan')
        }catch(e){toast(e.message)}
    })
}

async function addGoal(){
    modal('Buat Tujuan',`<div class="formgrid">${f('Nama','x_name')}${f('Ikon','x_icon','text','🎯')}${f('Target','x_target','number')}${f('Target tanggal','x_date','date')}${f('Prioritas','x_priority','number',String(S.cache.goals.length+1))}</div>`,async()=>{
        if(!v('x_name')||!n(v('x_target')))return toast('Nama dan target wajib');
        await FWPDB.put('goals',{id:id('g'),name:v('x_name'),icon:v('x_icon')||'🎯',target:n(v('x_target')),targetDate:v('x_date'),priority:n(v('x_priority'))||99,status:'active',createdAt:dateNow()});
        closeModal();await refresh()
    })
}

async function allocateGoal(gid){
    modal('Alokasikan Saldo ke Tujuan',`<div class="formgrid"><div class="field"><label>Sumber saldo</label><select id="x_source" class="input">${sourceOpts()}</select></div>${f('Nominal alokasi','x_amount','number')}</div><div class="info small" style="margin-top:12px">Ini virtual earmark. Saldo tidak berpindah dan kekayaan tidak bertambah. Total alokasi pada satu sumber tidak boleh melebihi saldo yang tersedia.</div>`,async()=>{
        let sid=v('x_source'),amount=n(v('x_amount')),src=source(sid);
        if(!src||!amount)return toast('Lengkapi data');
        let used=S.cache.goalAllocations.filter(x=>x.sourceId===sid&&x.status==='active').reduce((a,x)=>a+n(x.amount),0);
        if(used+amount>n(src.balance))return toast('Alokasi melebihi saldo sumber');
        await FWPDB.put('goalAllocations',{id:id('ga'),goalId:gid,sourceType:pocket(sid)?'pocket':'account',sourceId:sid,amount,status:'active',createdAt:dateNow()});
        await ledger('goal_allocation','Alokasi ke tujuan: '+goal(gid).name,0,{goalId:gid,sourceId:sid,allocationAmount:amount},false);
        closeModal();await refresh()
    })
}

async function addInstitution(){modal('Tambah Institusi',`<div class="formgrid">${f('Nama','x_name')}${f('Jenis','x_type','text','Bank')}</div>`,async()=>{await FWPDB.put('institutions',{id:id('i'),name:v('x_name'),type:v('x_type')});closeModal();await refresh()})}
async function addAccount(iid){modal('Tambah Rekening',`<div class="formgrid">${f('Nama rekening','x_name')}${f('Saldo aktual','x_balance','number','0')}<div class="field"><label><input id="x_main" type="checkbox"> Rekening utama</label></div></div>`,async()=>{if($('#x_main').checked)for(let a of S.cache.accounts){a.isMain=false;await FWPDB.put('accounts',a)}await FWPDB.put('accounts',{id:id('a'),institutionId:iid,name:v('x_name'),balance:n(v('x_balance')),isMain:$('#x_main').checked,createdAt:dateNow()});closeModal();await refresh()})}
async function addPocket(aid){modal('Tambah Kantong',`<div class="formgrid">${f('Nama kantong','x_name')}${f('Alokasi saldo','x_balance','number','0')}</div><div class="info small">Kantong adalah bagian dari saldo rekening induk, bukan saldo tambahan.</div>`,async()=>{let a=acct(aid),amount=n(v('x_balance'));if(pocketAllocated(aid)+amount>n(a.balance))return toast('Total kantong melebihi saldo rekening');await FWPDB.put('pockets',{id:id('p'),accountId:aid,name:v('x_name'),balance:amount,createdAt:dateNow()});closeModal();await refresh()})}
async function reconcileAccount(aid){let a=acct(aid);modal('Rekonsiliasi Rekening',`${f('Saldo aktual','x_balance','number',a.balance)}<div class="warning small">Jika saldo aktual lebih kecil daripada total kantong, sistem akan memberi peringatan tetapi tidak menghapus alokasi.</div>`,async()=>{let old=n(a.balance),neu=n(v('x_balance'));a.balance=neu;await FWPDB.put('accounts',a);await ledger('reconcile','Rekonsiliasi '+a.name,neu-old,{accountId:aid,old,new:neu});closeModal();await refresh()})}
async function reconcilePocket(pid){let p=pocket(pid),a=acct(p.accountId);modal('Rekonsiliasi Kantong',f('Alokasi kantong','x_balance','number',p.balance),async()=>{let neu=n(v('x_balance')),other=S.cache.pockets.filter(x=>x.accountId===a.id&&x.id!==pid).reduce((s,x)=>s+n(x.balance),0);if(other+neu>n(a.balance))return toast('Kantong melebihi saldo rekening');let old=n(p.balance);p.balance=neu;await FWPDB.put('pockets',p);await ledger('reconcile','Rekonsiliasi kantong '+p.name,0,{pocketId:pid,old,new:neu},true);closeModal();await refresh()})}

// --- CRUD EMAS, ASET, UTANG BARU ---
async function addGold(){
    modal('Tambah Emas', `<div class="formgrid">
        ${f('Nama / Keterangan','x_name','text','Cincin Antam')}
        ${f('Merek','x_brand','text','Antam')}
        ${f('Berat (Gram)','x_weight','number','1')}
        ${f('Harga Beli (Rp)','x_price','number','0')}
    </div>`, async()=>{
        if(!v('x_name')||!n(v('x_weight')))return toast('Lengkapi data');
        await FWPDB.put('goldItems',{id:id('gd'),name:v('x_name'),brand:v('x_brand'),weight:n(v('x_weight')),buyPrice:n(v('x_price')),createdAt:dateNow()});
        closeModal();await refresh();toast('Emas ditambahkan');
    });
}

async function addAsset(){
    modal('Tambah Aset Tetap', `<div class="formgrid">
        ${f('Nama Aset','x_name','text','Motor Honda')}
        <div class="field"><label>Kategori</label><select id="x_cat" class="input"><option>Kendaraan</option><option>Properti</option><option>Elektronik</option><option>Lainnya</option></select></div>
        ${f('Harga Beli (Rp)','x_buy','number','0')}
        ${f('Nilai Saat Ini (Rp)','x_val','number','0')}
    </div>`, async()=>{
        if(!v('x_name')||!n(v('x_val')))return toast('Lengkapi data');
        await FWPDB.put('assets',{id:id('as'),name:v('x_name'),category:v('x_cat'),buyPrice:n(v('x_buy')),value:n(v('x_val')),createdAt:dateNow()});
        closeModal();await refresh();toast('Aset ditambahkan');
    });
}

async function addDebt(){
    modal('Catat Utang/Piutang', `<div class="formgrid">
        <div class="field"><label>Jenis</label><select id="x_type" class="input"><option value="utang">Utang (Saya berhutang)</option><option value="piutang">Piutang (Saya memberi pinjaman)</option></select></div>
        ${f('Nama / Keterangan','x_name','text','Pinjam Bank / Pinjam Teman')}
        ${f('Nominal (Rp)','x_amount','number','0')}
        ${f('Jatuh Tempo (Opsional)','x_due','date','')}
    </div>`, async()=>{
        if(!v('x_name')||!n(v('x_amount')))return toast('Lengkapi data');
        await FWPDB.put('debts',{id:id('db'),type:v('x_type'),name:v('x_name'),amount:n(v('x_amount')),dueDate:v('x_due'),status:'active',createdAt:dateNow()});
        closeModal();await refresh();toast('Berhasil dicatat');
    });
}

async function setGoldPrice(){
    let s = setting();
    modal('Harga Emas Acuan', `${f('Harga per Gram (Rp)','x_price','number',s.goldPrice)}`, async()=>{
        s.goldPrice = n(v('x_price'));
        await FWPDB.put('settings', s);
        closeModal(); await refresh(); toast('Harga emas diperbarui');
    });
}

async function transfer(){modal('Transfer Saldo',`<div class="formgrid"><div class="field"><label>Dari</label><select id="x_from" class="input">${sourceOpts()}</select></div><div class="field"><label>Ke</label><select id="x_to" class="input">${sourceOpts()}</select></div>${f('Nominal','x_amount','number')}</div>`,async()=>{let from=v('x_from'),to=v('x_to'),a=n(v('x_amount'));if(!from||!to||from===to||!a)return toast('Lengkapi transfer');try{await alterSource(from,-a,'Transfer keluar',{counterpart:to});await alterSource(to,a,'Transfer masuk',{counterpart:from});closeModal();await refresh();toast('Transfer tercatat')}catch(e){toast(e.message)}})}

async function closing(){
    let p=plan(),ps=pstats(p),set=setting(),it=items(p.id);
    let rows=set.budgetMode==='simple'?'<div class="info">Mode Ringkas: seluruh alokasi dianggap terpakai. Kamu hanya perlu menangani Sisa Rencana atau Minus.</div>':it.map(x=>`<div class="split"><div><b>${esc(x.name)}</b><small class="muted">Plan ${money(x.amount)}</small></div><input class="input" id="rem_${x.id}" type="number" value="0" placeholder="Sisa"></div>`).join('');
    
    modal('Tutup Bulan',`${rows}<div class="card" style="margin-top:13px"><b>Sisa Rencana: <span class="${ps.surplus<0?'negative':'positive'}">${money(ps.surplus)}</span></b></div><div class="formgrid" style="margin-top:13px"><div class="field"><label>Tindakan</label><select id="x_action" class="input">${ps.surplus<0?'<option value="deficit_carry">Bawa minus ke bulan berikutnya</option><option value="deficit_source">Tutup minus dari rekening</option><option value="record_only">Catat tanpa ubah saldo</option>':'<option value="goal">Alokasikan ke tujuan</option><option value="carry">Bawa ke bulan berikutnya</option><option value="main">Masuk rekening utama</option><option value="stay">Tetap tanpa perubahan saldo</option>'}</select></div><div class="field"><label>Tujuan/Rekening opsional</label><select id="x_target" class="input"><option value="">Pilih</option>${S.cache.goals.map(g=>`<option value="g:${g.id}">${esc(g.name)}</option>`).join('')}${[...S.cache.accounts,...S.cache.pockets].map(x=>`<option value="s:${x.id}">${esc(x.name)}</option>`).join('')}</select></div></div>`,async()=>{
        let remain=0;if(set.budgetMode!=='simple')it.forEach(x=>remain+=n(v('rem_'+x.id)));
        let closeAmount=ps.surplus+remain,action=v('x_action'),target=v('x_target');
        p.status='closed';p.closedAt=dateNow();p.closing={plannedSurplus:ps.surplus,reportedRemain:remain,finalAmount:closeAmount,action,target};
        await FWPDB.put('plans',p);
        let next=new Date(S.month+'-01');next.setMonth(next.getMonth()+1);let nextMonth=next.toISOString().slice(0,7);
        if(action==='carry'||action==='deficit_carry'){
            let np=S.cache.plans.find(x=>x.month===nextMonth);
            if(!np){np={id:id('pl'),month:nextMonth,name:'Rencana '+monthName(nextMonth),status:'open',createdAt:dateNow()};await FWPDB.put('plans',np)}
            await FWPDB.put('incomeItems',{id:id('in'),planId:np.id,name:closeAmount>=0?'Carry Forward':'Defisit Bulan Sebelumnya',amount:closeAmount})
        }else if(action==='goal'&&target.startsWith('g:')){
            let gid=target.slice(2),main=S.cache.accounts.find(x=>x.isMain);
            if(main&&closeAmount>0)await FWPDB.put('goalAllocations',{id:id('ga'),goalId:gid,sourceType:'account',sourceId:main.id,amount:closeAmount,status:'active',createdAt:dateNow()})
        }else if((action==='main'||action==='deficit_source')&&target.startsWith('s:')){
            await alterSource(target.slice(2),closeAmount,action==='main'?'Sisa tutup bulan':'Penutup defisit',{planId:p.id})
        }
        await ledger('closing','Tutup bulan '+monthName(S.month),closeAmount,{planId:p.id,action,target},false);
        closeModal();await refresh();toast('Bulan ditutup')
    })
}

async function copyPlan(){
    if(plan())return toast('Bulan ini sudah mempunyai rencana');
    let d=new Date(S.month+'-01');d.setMonth(d.getMonth()-1);let pm=d.toISOString().slice(0,7),prev=S.cache.plans.find(x=>x.month===pm);
    if(!prev)return toast('Rencana bulan lalu tidak ada');
    let np={id:id('pl'),month:S.month,name:'Rencana '+monthName(S.month),status:'open',createdAt:dateNow()};
    await FWPDB.put('plans',np);
    for(let x of S.cache.incomeItems.filter(x=>x.planId===prev.id))await FWPDB.put('incomeItems',{...x,id:id('in'),planId:np.id});
    for(let x of S.cache.planItems.filter(x=>x.planId===prev.id))await FWPDB.put('planItems',{...x,id:id('pi'),planId:np.id,fundingStatus:'planned',fundingMode:'marker'});
    await refresh();toast('Rencana disalin')
}

async function preferences(){
    let s=setting();
    modal('Preferensi',`<div class="formgrid"><div class="field"><label>Mode budgeting</label><select id="x_budget" class="input"><option value="simple">Ringkas</option><option value="closing">Closing ringan</option><option value="detailed">Lebih rinci</option></select></div><div class="field"><label>Default closing</label><select id="x_closing" class="input"><option value="used">Anggap terpakai</option><option value="ask">Selalu tanyakan</option><option value="remain">Anggap tersisa</option></select></div><div class="field full"><label><input id="x_strict" type="checkbox" ${s.strictBalance?'checked':''}> Mode saldo ketat</label></div></div>`,async()=>{
        s.budgetMode=v('x_budget');s.defaultClosing=v('x_closing');s.strictBalance=$('#x_strict').checked;
        await FWPDB.put('settings',s);closeModal();await refresh()
    });
    $('#x_budget').value=s.budgetMode;$('#x_closing').value=s.defaultClosing
}

function quickAdd(){
    modal('Tambah Cepat',`<div class="grid two">
        <button type="button" class="btn primary" data-action="newPlan">Rencana</button>
        <button type="button" class="btn ghost" data-action="transfer">Transfer</button>
        <button type="button" class="btn ghost" data-action="addGoal">Tujuan</button>
        <button type="button" class="btn ghost" data-action="addGold">Emas</button>
        <button type="button" class="btn ghost" data-action="addDebt">Utang/Piutang</button>
    </div>`,null)
}

async function backup(){let x=await FWPDB.dump();download('fwp-backup-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(x,null,2),'application/json')}
function download(name,text,type){let u=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();URL.revokeObjectURL(u)}

function shift(d){let x=new Date(S.month+'-01');x.setMonth(x.getMonth()+d);S.month=x.toISOString().slice(0,7);render()}

const actions={
    closeModal, quickAdd, newPlan, addIncome, addPlanItem, addGoal, addInstitution, transfer, closing, copyPlan, preferences, backup,
    addGold, addAsset, addDebt, setGoldPrice,
    restore:()=>$('#restoreFile').click(),
    prevMonth:()=>shift(-1), nextMonth:()=>shift(1),
    theme:async()=>{let s=setting();s.theme=s.theme==='dark'?'light':'dark';await FWPDB.put('settings',s);await refresh()},
    privacy:async()=>{let s=setting();s.privacy=!s.privacy;await FWPDB.put('settings',s);await refresh()},
    finishOnboarding:async()=>{
        let s=setting();s={...s,onboarded:true,ownerName:v('onName')||'Kamu',budgetMode:ON.budgetMode,defaultClosing:ON.defaultClosing,surplusBehavior:v('onSurplus'),strictBalance:$('#onStrict').checked};
        await FWPDB.put('settings',s);$('#onboarding').classList.add('hidden');await refresh()
    }
};

document.addEventListener('click',async e=>{
    let t=e.target.closest('button');if(!t)return;
    if(t.dataset.page){S.page=t.dataset.page;render();return}
    if(t.dataset.action){
        if($('#modal').open&&t.dataset.action!=='closeModal'&&!['theme','privacy'].includes(t.dataset.action))closeModal();
        await actions[t.dataset.action]?.();return
    }
    if(t.dataset.wealth){S.wealth=t.dataset.wealth;render();return}
    
    // Aksi Spesifik Item
    if(t.dataset.fund)return fundItem(t.dataset.fund);
    if(t.dataset.allocate)return allocateGoal(t.dataset.allocate);
    if(t.dataset.addAccount)return addAccount(t.dataset.addAccount);
    if(t.dataset.addPocket)return addPocket(t.dataset.addPocket);
    if(t.dataset.reconcileAccount)return reconcileAccount(t.dataset.reconcileAccount);
    if(t.dataset.reconcilePocket)return reconcilePocket(t.dataset.reconcilePocket);
    
    // Aksi Hapus/Lunas
    if(t.dataset.delGold){
        if(confirm('Hapus catatan emas ini? (Pastikan Anda sudah mencatat uang penjualannya ke rekening)')) {
            await FWPDB.del('goldItems', t.dataset.delGold); await refresh();
        }
    }
    if(t.dataset.delAsset){
        if(confirm('Hapus aset ini?')) { await FWPDB.del('assets', t.dataset.delAsset); await refresh(); }
    }
    if(t.dataset.settleDebt){
        if(confirm('Tandai sudah lunas / diterima?')) {
            let d = await FWPDB.get('debts', t.dataset.settleDebt);
            d.status = 'settled'; await FWPDB.put('debts', d); await refresh(); toast('Status diperbarui');
        }
    }
    if(t.dataset.removeItem){
        let x=await FWPDB.get('planItems',t.dataset.removeItem);
        if(x?.fundingStatus==='funded')return toast('Item funded tidak dihapus. Batalkan transaksi terkait lebih dulu.');
        await FWPDB.del('planItems',t.dataset.removeItem);await refresh()
    }
    if(t.dataset.goalStatus){
        let g=goal(t.dataset.goalStatus);
        modal('Status Tujuan',`<div class="field"><label>Status</label><select id="x_status" class="input">${['active','paused','achieved','used','cancelled','archived'].map(x=>`<option ${g.status===x?'selected':''}>${x}</option>`).join('')}</select></div>`,async()=>{
            g.status=v('x_status');await FWPDB.put('goals',g);closeModal();await refresh()
        })
    }
    
    if(t.dataset.onNext){
        if($('#onChoice')){let sel=$('#onChoice .selected')?.dataset.v;if(t.dataset.onNext==='2')ON.budgetMode=sel;if(t.dataset.onNext==='3')ON.defaultClosing=sel}
        showOnboarding(n(t.dataset.onNext))
    }
    if(t.closest('#onChoice')){$$('#onChoice button').forEach(x=>x.classList.remove('selected'));t.classList.add('selected')}
});

$('#restoreFile').addEventListener('change',e=>{
    let file=e.target.files[0];if(!file)return;let r=new FileReader();
    r.onload=async()=>{
        try{await FWPDB.restore(JSON.parse(r.result));await refresh();toast('Backup dipulihkan')}catch{toast('Backup tidak valid')}
    };
    r.readAsText(file);e.target.value=''
});

(async()=>{await FWPDB.open();await seed();await refresh();if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{})})();