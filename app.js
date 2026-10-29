const S={page:'home',wealth:'goals',month:new Date().toISOString().slice(0,7),privacy:false,theme:'light',cache:{}};
const $=q=>document.querySelector(q),$$=q=>[...document.querySelectorAll(q)];
const id=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);

// === FUNGSI PEMBACA ANGKA (Anti-Bug) ===
const n=v=>{
    if (typeof v === 'number') return v;
    if (!v) return 0;
    let str = String(v).trim();
    if (!str) return 0;
    str = str.replace(/[^\d.,-]/g, ''); 
    if (str.includes(',')) {
        str = str.replace(/\./g, '').replace(',', '.');
    } else {
        let dots = str.match(/\./g);
        if (dots) {
            if (dots.length > 1) {
                str = str.replace(/\./g, '');
            } else {
                let parts = str.split('.');
                if (parts[1] && parts[1].length >= 3) {
                    str = str.replace(/\./g, '');
                }
            }
        }
    }
    return Number(str) || 0;
};

const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const dateNow=()=>new Date().toISOString();

function formatDateTime(iso){
    if(!iso) return '—';
    try { return new Date(iso).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'}); }
    catch { return iso; }
}

function formatNum(x) {
    if (x === undefined || x === null || x === '') return '';
    let str = String(x);
    if (str.includes('.') && str.split('.')[1].length !== 3) {
        return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(Number(str));
    }
    let raw = str.replace(/\D/g, '');
    if (!raw) return '';
    return new Intl.NumberFormat('id-ID').format(raw);
}

document.addEventListener('input', e => {
    const t = e.target;
    if (t.matches('input[inputmode="numeric"], input[type="number"]')) {
        if (t.type === 'number') {
            t.type = 'text';
            t.inputMode = 'numeric';
        }
        let raw = t.value.replace(/[^\d,]/g, ''); 
        let parts = raw.split(',');
        let intPart = parts[0];
        let decPart = parts[1] ? ',' + parts[1] : '';
        
        if (intPart) {
            t.value = new Intl.NumberFormat('id-ID').format(intPart) + decPart;
        } else {
            t.value = decPart ? '0' + decPart : '';
        }

        if (typeof window.recalcClosing === 'function' && t.id.startsWith('act_')) {
            window.recalcClosing();
        }
    }
});

function toast(x){$('#toast').textContent=x;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),2300)}
function money(x){return S.privacy?'Rp••••••':new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n(x))}
function monthName(x){return new Intl.DateTimeFormat('id-ID',{month:'long',year:'numeric'}).format(new Date(x+'-01T00:00:00'))}

function f(label,id,type='text',value='',full=''){
    let extra = type === 'number' ? 'type="text" inputmode="numeric"' : `type="${type}"`;
    let fmtValue = type === 'number' ? formatNum(value) : value;
    return `<div class="field ${full}"><label>${label}</label><input class="input" id="${id}" ${extra} value="${esc(fmtValue)}"></div>`
}
function v(id){return $('#'+id)?.value||''}

function modal(title,body,save,opts={}){
    const cancelLabel = opts.cancelLabel || 'Batal';
    const saveLabel = opts.saveLabel || 'Simpan';
    $('#modalTitle').textContent=title;
    $('#modalBody').innerHTML=body;
    
    $('#modalBody').querySelectorAll('input[type="number"]').forEach(inp => {
        let val = inp.value;
        inp.type = 'text';
        inp.inputMode = 'numeric';
        if (val) inp.value = formatNum(val);
    });

    $('#modalFoot').innerHTML=
        `<button type="button" class="btn ghost" data-action="closeModal">${cancelLabel}</button>`+
        (save?`<button class="btn primary" type="submit">${saveLabel}</button>`:'');
    $('#modalForm').onsubmit=async e=>{
        e.preventDefault();
        if(!save) return;
        try { await save(); }
        catch(err){ toast(err?.message || 'Terjadi kesalahan'); }
    };
    $('#modal').showModal();
}
function closeModal(){$('#modal').close()}
function confirmModal(title, body){
    return new Promise(resolve=>{
        let settled=false;
        const finish=v=>{ if(settled) return; settled=true; resolve(v); };
        modal(title, body, async()=>{ finish(true); closeModal(); },
              { cancelLabel:'Batal', saveLabel:'Lanjutkan' });
        const onClose=()=>{
            $('#modal').removeEventListener('close', onClose);
            if(!settled) finish(false);
        };
        $('#modal').addEventListener('close', onClose);
    });
}

async function refresh(){
    for(let s of FWPDB.stores) S.cache[s]=await FWPDB.all(s);
    let set=S.cache.settings.find(x=>x.id==='main');
    if(set){S.theme=set.theme;S.privacy=set.privacy;document.documentElement.dataset.theme=S.theme}
    render();
    if(!set?.onboarded)showOnboarding(1)
}

function setting(){
    const def={id:'main',onboarded:false,budgetMode:'simple',defaultClosing:'used',surplusBehavior:'ask',strictBalance:false,theme:'light',privacy:false,ownerName:'Kamu'};
    return S.cache.settings.find(x=>x.id==='main')||def;
}
function getGoldPrice(asset,purity=24,side='buyback'){
    let price=GoldMarket.priceFor(asset,side);
    // Harga manual perhiasan sudah merupakan harga per gram sesuai kadar.
    // Harga acuan Antam 24K baru dikalikan proporsi kadar.
    if(asset?.priceMode!=='manual'&&purity<24&&purity>0) price*=purity/24;
    return price;
}
function goldAssetLabel(x){return x.providerLabel||x.brandLabel||x.merchantLabel||'Tanpa merek'}
function goldStatusHtml(asset){
    const st=GoldMarket.statusFor(asset), fmt=x=>formatDateTime(x), disclosure=asset?.priceDisclosure?`<br><b>${esc(asset.priceDisclosure)}</b>`:'';
    if(st.kind==='success') return `<div class="info small">🟢 <b>Data Terkini</b><br>Terakhir diperbarui: ${fmt(st.lastSuccess)} WIB${disclosure}</div>`;
    if(st.kind==='failed') return `<div class="warning small">🟡 <b>Data Tidak Terkini</b><br>Percobaan pembaruan terakhir: ${fmt(st.lastAttempt)} WIB<br>Menampilkan data valid dari: ${fmt(st.lastSuccess)} WIB</div>`;
    if(st.kind==='manual') return `<div class="info small">✍️ <b>Harga Manual</b><br>${esc(st.message)}</div>`;
    return `<div class="warning small">⚪ <b>${esc(st.title)}</b><br>${esc(st.message||'Harga belum tersedia.')}${st.lastAttempt?`<br>Percobaan terakhir: ${fmt(st.lastAttempt)} WIB`:''}</div>`;
}
function acct(id){return S.cache.accounts.find(x=>x.id===id)}
function pocket(id){return S.cache.pockets.find(x=>x.id===id)}
function goal(id){return S.cache.goals.find(x=>x.id===id)}
function source(id){return pocket(id)||acct(id)}
function sourceName(id){return source(id)?.name||'Tanpa perubahan saldo'}
function ownerName(oid){return S.cache.owners.find(x=>x.id===oid)?.name||'Tidak diketahui'}

function totalAccountBalance(){return S.cache.accounts.reduce((a,x)=>a+n(x.balance),0)}
function totalGoldDigitalValue(){return S.cache.goldAccounts.reduce((a,x)=> a + (n(x.balanceGrams) * getGoldPrice(x)), 0)}
function totalGoldPhysicalValue(){return S.cache.goldPhysical.filter(x=>x.status==='owned').reduce((a,x)=> a + (n(x.weight) * getGoldPrice(x)), 0)}
function totalGoldJewelryValue(){return S.cache.goldJewelry.filter(x=>x.status==='owned').reduce((a,x)=> a + (n(x.weight) * getGoldPrice(x, n(x.purity))), 0)}
function totalGoldValue(){ return totalGoldDigitalValue() + totalGoldPhysicalValue() + totalGoldJewelryValue()}
function totalAssetValue(){ return S.cache.assets.reduce((a,x)=>a+n(x.value),0) }
function totalPiutang(){ return S.cache.debts.filter(x=>x.type==='piutang'&&x.status==='active').reduce((a,x)=>a+n(x.amount),0) }
function totalUtang(){ return S.cache.debts.filter(x=>x.type==='utang'&&x.status==='active').reduce((a,x)=>a+n(x.amount),0) }
function netWorth(){ return totalAccountBalance() + totalGoldValue() + totalAssetValue() + totalPiutang() - totalUtang() }

function getRunway() {
    let p = plan();
    let it = p ? items(p.id) : [];
    let monthlyExpense = it.filter(x => !['Saving','Sinking Fund'].includes(x.category)).reduce((a, x) => a + n(x.amount), 0);
    if (monthlyExpense === 0) monthlyExpense = 10000000; 
    let liquid = totalAccountBalance() + totalGoldValue();
    return { months: (liquid / monthlyExpense).toFixed(1), monthlyExpense, liquid };
}

function pocketAllocated(aid){return S.cache.pockets.filter(x=>x.accountId===aid).reduce((a,x)=>a+n(x.balance),0)}
function unallocated(a){return n(a.balance)-pocketAllocated(a.id)}
function plan(){return S.cache.plans.find(x=>x.month===S.month)}
function incomes(pid){return S.cache.incomeItems.filter(x=>x.planId===pid)}
function items(pid){return S.cache.planItems.filter(x=>x.planId===pid)}
function pstats(p){
    if(!p)return{income:0,alloc:0,surplus:0,funded:0};
    let ii=incomes(p.id),it=items(p.id),
        income=ii.reduce((a,x)=>a+n(x.amount),0),
        alloc=it.reduce((a,x)=>a+n(x.amount),0);
    return{income,alloc,surplus:income-alloc,funded:it.filter(x=>x.fundingStatus==='funded').reduce((a,x)=>a+n(x.amount),0)}
}

function getGoalAllocations(gid) { return S.cache.goalAllocations.filter(x=>x.goalId===gid && x.status==='active'); }
function getSourceAllocated(sourceId) { return S.cache.goalAllocations.filter(x=>x.sourceId===sourceId && x.status==='active').reduce((a,x)=>a+n(x.amount), 0); }
function goalValue(gid){
    return getGoalAllocations(gid).reduce((a,x)=>{
        if(x.type==='gram'||x.type==='gold_digital'){
            const asset=S.cache.goldAccounts.find(g=>g.id===x.sourceId);
            return a+(n(x.amount)*getGoldPrice(asset));
        }
        if(x.type==='gold_physical'){
            const asset=S.cache.goldPhysical.find(g=>g.id===x.sourceId);
            // Alokasi fisik lama dapat berupa nominal; gunakan apa adanya bila bukan gram.
            return a+n(x.amount);
        }
        return a+n(x.amount);
    },0);
}

function render(){renderNav();let fn={home:home,plan:planView,wealth:wealth,more:more}[S.page];$('#view').innerHTML=fn()}
function renderNav(){$$('#nav [data-page]').forEach(x=>x.classList.toggle('active',x.dataset.page===S.page))}

function home(){
    let p=plan(),ps=pstats(p),g=S.cache.goals.filter(x=>!['archived','cancelled'].includes(x.status)).sort((a,b)=>a.priority-b.priority).slice(0,3);
    let runway = getRunway(), displaySurplus = ps.surplus;
    if(p && p.status==='closed' && p.closing) displaySurplus = p.closing.finalAmount;

    return `<div class="hero" style="background:linear-gradient(135deg,#172019,#2a3d1c)">
        <div class="eyebrow">Total Kekayaan Bersih</div>
        <h1>${money(netWorth())}</h1>
        <div style="background:rgba(255,255,255,0.1);padding:10px;border-radius:12px;margin:15px 0;display:flex;align-items:center;gap:10px">
            <span style="font-size:24px">🚀</span>
            <div><small style="color:#c0c9c1;display:block">Setara Pengeluaran</small><b>${runway.months} Bulan</b> <small style="color:#c0c9c1">dari aset likuid</small></div>
        </div>
        <p style="display:flex;gap:10px;flex-wrap:wrap;font-size:12px">
            <span>💵 Uang: ${money(totalAccountBalance())}</span>
            <span>🧈 Emas: ${money(totalGoldValue())}</span>
            <span>🏠 Aset: ${money(totalAssetValue())}</span>
            <span>📉 Utang: ${money(totalUtang())}</span>
        </p>
    </div>
    <div class="grid two" style="margin-top:15px">
        <div class="card kpi"><span class="muted small">Pendapatan Rencana</span><b>${money(ps.income)}</b></div>
        <div class="card kpi"><span class="muted small">Sisa/Minus ${p?.status==='closed'?'(Final)':''}</span><b class="${displaySurplus<0?'negative':'positive'}">${money(displaySurplus)}</b></div>
    </div>
    <div class="grid two">
        <div><div class="section"><div><h2>Rencana ${monthName(S.month)}</h2><span class="muted">Tidak wajib catat harian.</span></div></div>${p?`<div class="card"><div class="row"><div class="grow"><b>Total alokasi</b><small class="muted">${items(p.id).length} pos</small></div><b>${money(ps.alloc)}</b></div><div class="row"><div class="grow"><b>Dana disiapkan</b><small class="muted">Penanda atau transfer nyata</small></div><b>${money(ps.funded)}</b></div></div>`:`<div class="card empty">Belum ada rencana.<br><button class="btn primary" data-action="newPlan">Buat sekarang</button></div>`}</div>
        <div><div class="section"><div><h2>Tujuan Prioritas</h2><span class="muted">Gabungkan aset Anda untuk wujudkan setiap tujuan.</span></div></div><div class="card">${g.length?g.map(goalRow).join(''):'<div class="empty">Belum ada tujuan.</div>'}</div></div>
    </div>`
}

function goalRow(g){
    let x=goalValue(g.id),pc=Math.min(100,x/Math.max(1,n(g.target))*100);
    return `<div class="row"><span style="font-size:24px">${g.icon||'🎯'}</span><div class="grow"><b>${esc(g.name)}</b><div class="progress" style="margin:6px 0"><i style="width:${pc}%"></i></div><small class="muted">${money(x)} · ${pc.toFixed(1)}%</small></div></div>`
}

function planView(){
    let p=plan(),ps=pstats(p),isClosed = p && p.status === 'closed', displaySurplus = ps.surplus;
    if(isClosed && p.closing) displaySurplus = p.closing.finalAmount;

    return `<div class="section"><div><h2>Rencana Bulanan</h2><span class="muted">Rencana tidak otomatis mengubah saldo rekening.</span></div><button class="btn primary" data-action="${p?'addPlanItem':'newPlan'}">＋ ${p?'Tambah pos':'Buat rencana'}</button></div>
    <div class="monthbar"><button class="icon" data-action="prevMonth">‹</button><b>${monthName(S.month)}</b><button class="icon" data-action="nextMonth">›</button></div>
    ${p?`
        <div class="grid four" style="margin-top:15px">
            <div class="card kpi"><span class="muted small">Pendapatan</span><b>${money(ps.income)}</b><button class="btn ghost" data-action="addIncome">＋ Income</button></div>
            <div class="card kpi"><span class="muted small">Alokasi</span><b>${money(ps.alloc)}</b></div>
            <div class="card kpi"><span class="muted small">Dana Disiapkan</span><b>${money(ps.funded)}</b></div>
            <div class="card kpi"><span class="muted small">Sisa/Minus ${isClosed?'(Final)':''}</span><b class="${displaySurplus<0?'negative':'positive'}">${money(displaySurplus)}</b></div>
        </div>
        <div class="section">
            <div><h2>Daftar alokasi</h2><span class="muted">Status funded dapat hanya penanda atau transfer.</span></div>
            <div><button class="btn ghost" data-action="copyPlan">Salin bulan lalu</button> ${isClosed ? `<span class="badge green" style="padding:10px 14px; font-size:14px;">✅ Bulan Ditutup</span>` : `<button class="btn dark" data-action="closing">Tutup Bulan</button>`}</div>
        </div>
        <div class="card">${items(p.id).length?items(p.id).map(x=>`<div class="split"><div><b>${esc(x.name)}</b><small class="muted">${esc(x.category)} · ${x.fundingMode==='transfer'?'Transfer saldo':'Penanda saja'}</small></div><div style="text-align:right"><b>${money(x.amount)}</b><br><button class="fund ${x.fundingStatus}" data-fund="${x.id}">${x.fundingStatus==='funded'?'Dana Disiapkan':'Direncanakan'}</button> ${!isClosed?`<button class="icon" data-remove-item="${x.id}">×</button>`:''}</div></div>`).join(''):'<div class="empty">Belum ada pos.</div>'}</div>
    `:`<div class="card empty" style="margin-top:15px">Belum ada rencana ${monthName(S.month)}.<br><button class="btn primary" data-action="newPlan">Buat rencana</button> <button class="btn ghost" data-action="copyPlan">Salin bulan lalu</button></div>`}`
}

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

function goalsView(){
    return `<div class="section">
        <div><h2>Tujuan Keuangan</h2><span class="muted">Gabungkan aset Anda untuk wujudkan setiap tujuan.</span></div>
        <button class="btn primary" data-action="addGoal">＋ Tujuan</button>
    </div>
    <div class="grid two">${S.cache.goals.map(g=>{
        let x=goalValue(g.id), pc=Math.min(100,x/Math.max(1,n(g.target))*100), allocs = getGoalAllocations(g.id);
        let sourcesHtml = allocs.map(a => {
            let srcName = 'Aset Terhapus';
            if(a.type === 'bank' || a.type === 'pocket') srcName = sourceName(a.sourceId);
            else if(a.type === 'gold_digital') srcName = S.cache.goldAccounts.find(ga=>ga.id===a.sourceId)?.name;
            else if(a.type === 'gold_physical') srcName = S.cache.goldPhysical.find(gp=>gp.id===a.sourceId)?.name;
            let amtStr = a.type === 'gram' || a.type.includes('gold') ? `${n(a.amount)} gr` : money(a.amount);
            return `<div class="small muted">↳ ${esc(srcName)}: <b>${amtStr}</b></div>`;
        }).join('');

        return `<div class="card">
            <div style="display:flex;justify-content:space-between"><span style="font-size:26px">${g.icon}</span><span class="badge ${g.status==='used'?'purple':g.status==='achieved'?'green':'blue'}">${g.status}</span></div>
            <h3>${esc(g.name)}</h3>
            <small class="muted">Target ${money(g.target)} · Prioritas ${g.priority}</small>
            <div class="progress" style="margin:14px 0 7px"><i style="width:${pc}%"></i></div>
            <b>${money(x)}</b><small class="muted"> · ${pc.toFixed(1)}%</small>
            <div style="margin-top:10px; border-top:1px dashed var(--border); padding-top:10px">${sourcesHtml || '<div class="small muted" style="font-style:italic">Belum ada sumber dana terhubung.</div>'}</div>
            <div style="margin-top:14px; display:flex; gap:6px; flex-wrap:wrap;"><button class="btn ghost" data-allocate="${g.id}">+ Alokasi</button><button class="btn ghost" data-goal-status="${g.id}">Status</button></div>
        </div>`;
    }).join('')||'<div class="card empty">Belum ada tujuan.</div>'}</div>`;
}

function accountsView(){
    return `<div class="section"><div><h2>Rekening & Kantong</h2><span class="muted">Saldo rekening induk tidak dijumlahkan lagi dengan kantong.</span></div><button class="btn primary" data-action="addInstitution">＋ Institusi</button></div>
    <div class="grid two">
        ${S.cache.institutions.map(i=>`
            <div class="card">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                    <div style="min-width:0;"><b style="font-size:16px;">${esc(i.name)}</b> <span class="muted small" style="margin-left:4px;">${esc(i.type)}</span></div>
                    <div style="display:flex; gap:4px;">
                        <button class="btn ghost small" style="padding:4px 8px;" data-add-account="${i.id}">＋ Rek</button>
                        <button class="icon" style="width:28px; height:28px; font-size:14px;" data-edit-inst="${i.id}" title="Edit Institusi">✎</button>
                        <button class="icon" style="width:28px; height:28px; font-size:14px; color:var(--red);" data-del-inst="${i.id}" title="Hapus Institusi">×</button>
                    </div>
                </div>
                ${S.cache.accounts.filter(a=>a.institutionId===i.id).map(a=>{
                    let pa=S.cache.pockets.filter(p=>p.accountId===a.id), ua=unallocated(a);
                    return `<div style="margin-top:12px; background:var(--surface-2); padding:10px; border-radius:var(--r-sm);">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
                            <div style="flex:1; min-width:140px;"><b style="font-size:14px;">${esc(a.name)}</b>${a.isMain?'<span class="badge green" style="margin-left:4px; font-size:10px;">Utama</span>':''}<small class="muted" style="display:block; margin-top:2px;">Saldo: <b>${money(a.balance)}</b> · Bebas: ${money(ua)}</small></div>
                            <div style="display:flex; gap:4px;">
                                <button class="icon" style="width:28px; height:28px; font-size:14px;" data-add-pocket="${a.id}" title="Tambah Kantong">＋</button>
                                <button class="icon" style="width:28px; height:28px; font-size:14px;" data-edit-account="${a.id}" title="Edit Rekening">✎</button>
                                <button class="icon" style="width:28px; height:28px; font-size:14px; color:var(--red);" data-del-account="${a.id}" title="Hapus Rekening">×</button>
                            </div>
                        </div>
                        ${ua<0?'<div class="warning small" style="margin-top:8px; padding:6px 10px;">Total kantong melebihi saldo rekening.</div>':''}
                        ${pa.map(p=>`<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-top:1px solid var(--border); margin-top:8px;"><div style="flex:1; min-width:0; padding-left:10px;"><b style="font-size:13px;">↳ ${esc(p.name)}</b></div><div style="display:flex; align-items:center; gap:6px;"><b style="font-size:13px; margin-right:4px;">${money(p.balance)}</b><button class="icon" style="width:24px; height:24px; font-size:12px;" data-edit-pocket="${p.id}" title="Edit Kantong">✎</button><button class="icon" style="width:24px; height:24px; font-size:12px; color:var(--red);" data-del-pocket="${p.id}" title="Hapus Kantong">×</button></div></div>`).join('')}
                    </div>`;
                }).join('') || '<div class="empty small">Belum ada rekening.</div>'}
            </div>
        `).join('')}
    </div>`;
}

// === UI EMAS ===
function goldView(){
    if(!S.goldTab) S.goldTab='digital';
    const title=S.goldTab==='digital'?'＋ Tambah Akun Digital':S.goldTab==='physical'?'＋ Tambah Kepingan Fisik':'＋ Tambah Perhiasan';
    const map={digital:S.cache.goldAccounts,physical:S.cache.goldPhysical.filter(x=>x.status==='owned'),jewelry:S.cache.goldJewelry.filter(x=>x.status==='owned')};
    const rows=map[S.goldTab]||[];
    const cards=rows.map(x=>{
      const purity=S.goldTab==='jewelry'?n(x.purity):24;
      const price=getGoldPrice(x,purity), weight=n(x.balanceGrams||x.weight), value=weight*price;
      return `<div class="card"><div style="display:flex;justify-content:space-between"><span class="badge blue">${esc(goldAssetLabel(x))}</span><span class="badge">${esc(ownerName(x.ownerId))}</span></div>
        <h3>${esc(x.name)}</h3><small class="muted">${weight} gram${S.goldTab==='jewelry'?` · ${purity}K`:''}</small>
        <div style="margin-top:10px;border-top:1px dashed var(--border);padding-top:10px"><div class="split"><span class="muted small">Harga Buyback</span><b>${price?money(price)+'/gr':'Belum dinilai'}</b></div><div class="split"><span class="muted small">Nilai Aset</span><b>${money(value)}</b></div></div>
        <div style="margin-top:10px">${goldStatusHtml(x)}</div>
        ${S.goldTab==='digital'?`<div style="display:flex;gap:6px;margin-top:12px"><button class="btn primary" style="flex:1" data-buy-gold="${x.id}">Beli</button><button class="btn ghost" style="flex:1" data-sell-gold-digital="${x.id}">Jual</button></div>`:S.goldTab==='physical'?`<button class="btn dark" style="margin-top:10px;width:100%" data-sell-gold-physical="${x.id}">Jual Kepingan</button>`:`<button class="btn dark" style="margin-top:10px;width:100%" data-sell-gold-jewelry="${x.id}">Jual Perhiasan</button>`}
      </div>`;
    }).join('')||'<div class="empty" style="grid-column:1/-1">Belum ada aset pada kategori ini.</div>';
    const meta=GoldMarket.meta();
    const connection=meta?.lastFetchError?`🔴 Tidak dapat memeriksa harga terbaru. Cache terakhir tetap digunakan.<br><small>${esc(meta.lastFetchError)}</small>`:meta?.lastFetchSuccess?`Data harga diterima aplikasi: ${formatDateTime(meta.lastFetchSuccess)} WIB`:'Endpoint harga belum dihubungkan.';
    return `<div class="section"><div><h2>Aset Emas</h2><span class="muted small">${connection}</span></div><div class="row-actions"><button class="btn ghost" data-action="simulateGoldPurchase">🧮 Simulasi Beli</button> <button class="btn ghost" data-action="syncGoldMarket">🔄 Sinkronkan Harga</button></div></div>
      <div class="tabs"><button class="tab ${S.goldTab==='digital'?'active':''}" data-goldtab="digital">Digital</button><button class="tab ${S.goldTab==='physical'?'active':''}" data-goldtab="physical">Fisik (LM)</button><button class="tab ${S.goldTab==='jewelry'?'active':''}" data-goldtab="jewelry">Perhiasan</button></div>
      <button class="btn primary" style="width:100%;margin-top:15px" data-action="addGold">${title}</button><div class="grid ${S.goldTab==='physical'?'three':'two'}" style="margin-top:15px">${cards}</div>`;
}
function simulateGoldPurchase(){
  const all=GOLD_PROVIDER_CATALOG.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');
  modal('Simulasi Pembelian Emas',`<div class="formgrid"><div class="field"><label>Provider / Merek</label><select id="sim_provider" class="input" onchange="updateGoldPurchaseSimulation()">${all}</select></div>${f('Anggaran (Rp)','sim_budget','number','1000000')}</div><div id="sim_result" class="info" style="margin-top:12px"></div><div class="warning small" style="margin-top:10px">Simulasi memakai <b>Harga Beli</b> provider. Hasil belum memperhitungkan biaya, pajak, ongkir, minimum transaksi, atau pembulatan platform.</div>`,null,{cancelLabel:'Tutup'});
  const input=$('#sim_budget'); if(input) input.addEventListener('input',updateGoldPurchaseSimulation); updateGoldPurchaseSimulation();
}
function updateGoldPurchaseSimulation(){
  const provider=GoldMarket.provider(v('sim_provider')), budget=n(v('sim_budget')), box=$('#sim_result'); if(!box)return;
  if(!provider||!provider.purchasePrice){box.innerHTML='<b>Harga beli belum tersedia.</b><br>Sinkronkan Gold Market setelah endpoint terhubung.';return;}
  const grams=budget/provider.purchasePrice, stale=provider.status!=='success';
  box.innerHTML=`<b>${esc(provider.name)}</b><br>Harga beli: <b>${money(provider.purchasePrice)}/gram</b><br>Estimasi diperoleh: <b>${grams.toLocaleString('id-ID',{maximumFractionDigits:6})} gram</b><br><small>${stale?'🟡 Menggunakan data valid terakhir dari ':'🟢 Harga diperbarui '}${formatDateTime(provider.lastSuccess)} WIB</small>`;
}
async function syncGoldMarket(){
  try{toast('Memeriksa harga terbaru…');await GoldMarket.sync({manual:true});await refresh();toast('Harga emas berhasil diperbarui');}
  catch(e){await refresh();toast('Gagal sync. Data terakhir tetap digunakan: '+e.message);}
}

// === FUNGSI UI LAINNYA ===// === FUNGSI UI LAINNYA ===
function assetsView() {
    return `<div class="section"><div><h2>Aset Tetap</h2><span class="muted">Kendaraan, Properti, Elektronik.</span></div><button class="btn primary" data-action="addAsset">＋ Aset</button></div>
    <div class="grid three">${S.cache.assets.map(a=>`<div class="card"><div style="display:flex;justify-content:space-between"><span class="badge blue">${esc(a.category)}</span><span class="badge" style="font-size:10px">${esc(ownerName(a.ownerId) || 'Bersama')}</span></div><h3 style="margin:10px 0">${esc(a.name)}</h3><small class="muted">Beli: ${money(a.buyPrice)}</small><div style="margin-top:10px;border-top:1px solid var(--border);padding-top:10px"><small class="muted">Nilai Saat Ini</small><b style="display:block;font-size:18px">${money(a.value)}</b></div><button class="btn red" style="margin-top:10px;width:100%" data-del-asset="${a.id}">Hapus</button></div>`).join('')||'<div class="card empty">Belum ada aset tetap.</div>'}</div>`
}

function debtsView() {
    let utang = S.cache.debts.filter(x=>x.type==='utang'&&x.status==='active'), piutang = S.cache.debts.filter(x=>x.type==='piutang'&&x.status==='active');
    return `<div class="section"><div><h2>Utang & Piutang</h2><span class="muted">Catat kewajiban dan hak Anda.</span></div><button class="btn primary" data-action="addDebt">＋ Catat</button></div>
    <div class="grid two">
        <div class="card" style="border-top:4px solid var(--red)"><h3>📉 Utang (Kewajiban)</h3>${utang.map(d=>`<div class="split"><div><b>${esc(d.name)}</b><small class="muted">Jatuh tempo: ${d.dueDate||'-'}</small></div><div style="text-align:right"><b class="negative">${money(d.amount)}</b><br><button class="btn ghost small" data-settle-debt="${d.id}">Lunas</button></div></div>`).join('')||'<div class="empty small">Tidak ada utang aktif.</div>'}</div>
        <div class="card" style="border-top:4px solid var(--green)"><h3>🤝 Piutang (Dapat Diterima)</h3>${piutang.map(d=>`<div class="split"><div><b>${esc(d.name)}</b><small class="muted">Jatuh tempo: ${d.dueDate||'-'}</small></div><div style="text-align:right"><b class="positive">${money(d.amount)}</b><br><button class="btn ghost small" data-settle-debt="${d.id}">Terima</button></div></div>`).join('')||'<div class="empty small">Tidak ada piutang aktif.</div>'}</div>
    </div>`
}

function more(){
    let led=S.cache.ledger.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,12);
    return `<div class="section"><div><h2>Pengaturan & Riwayat</h2></div></div>
    <div class="grid two">
        <div class="card"><h3>Preferensi</h3><div class="row"><div class="grow"><b>Mode budgeting</b><small class="muted">${esc(setting().budgetMode)}</small></div><button class="btn ghost" data-action="preferences">Ubah</button></div><div class="row"><div class="grow"><b>Data Kepemilikan</b><small class="muted">Pemilik aset & rekening</small></div><button class="btn ghost" data-action="manageOwners">Kelola</button></div></div>
        <div class="card"><h3>Data</h3><p class="muted">Backup seluruh object store dan versi skema.</p><button class="btn dark" data-action="backup">Backup JSON</button> <button class="btn ghost" data-action="restore">Restore</button></div>
        <div class="card" style="grid-column:1/-1"><h3>Aktivitas terbaru</h3><div class="ledger">${led.length?led.map(l=>`<div class="row"><div class="grow"><b>${esc(l.label)}</b><small class="muted">${new Date(l.createdAt).toLocaleString('id-ID')} · ${esc(l.status)}</small></div><span class="amount ${n(l.amount)<0?'negative':'positive'}">${money(l.amount)}</span></div>`).join(''):'<div class="empty">Belum ada aktivitas.</div>'}</div></div>
    </div>`
}

// === CORE TRANSACTIONS ===
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

async function manageOwners() {
    let rows = S.cache.owners.map(o => `<div class="row"><div class="grow"><b>${esc(o.name)}</b> <small class="muted">(${esc(o.type)})</small></div><button class="icon" data-edit-owner="${o.id}">✎</button><button class="icon" data-del-owner="${o.id}" style="color:var(--red)">×</button></div>`).join('') || '<div class="empty">Belum ada data kepemilikan.</div>';
    modal('Kelola Kepemilikan', `<div style="margin-bottom:16px">${rows}</div><h3>Tambah Baru</h3><div class="formgrid" style="margin-top:10px">${f('Nama (Cth: Anak 1)','x_owner_name')}<div class="field"><label>Tipe</label><select id="x_owner_type" class="input"><option value="individual">Individu</option><option value="joint">Bersama</option></select></div></div><button class="btn primary" style="margin-top:16px; width:100%" data-action="addOwner">Tambah Pemilik</button>`, null, {cancelLabel:'Tutup'});
}
async function addOwner() { if(!v('x_owner_name')) return toast('Nama wajib diisi'); await FWPDB.put('owners', {id: id('ow'), name: v('x_owner_name'), type: v('x_owner_type')}); await refresh(); manageOwners(); }
async function editOwner(oid) {
    let o = S.cache.owners.find(x=>x.id===oid);
    modal('Edit Pemilik', `<div class="formgrid">${f('Nama','x_owner_name','text',o.name)}<div class="field"><label>Tipe</label><select id="x_owner_type" class="input"><option value="individual" ${o.type==='individual'?'selected':''}>Individu</option><option value="joint" ${o.type==='joint'?'selected':''}>Bersama</option></select></div></div>`, async()=>{
        o.name = v('x_owner_name'); o.type = v('x_owner_type'); await FWPDB.put('owners', o); await refresh(); manageOwners();
    });
}
async function delOwner(oid) {
    let used = S.cache.accounts.some(x=>x.ownerId===oid) || S.cache.goldAccounts.some(x=>x.ownerId===oid) || S.cache.goldPhysical.some(x=>x.ownerId===oid) || S.cache.goldJewelry.some(x=>x.ownerId===oid) || S.cache.assets.some(x=>x.ownerId===oid);
    if (used) return toast('Kepemilikan tidak dapat dihapus karena masih digunakan.');
    if(!confirm('Hapus kepemilikan ini?')) return; await FWPDB.del('owners', oid); await refresh(); manageOwners();
}

async function seed(){
    let set=await FWPDB.get('settings','main');
    if(!set) await FWPDB.put('settings',{id:'main',onboarded:false,ownerName:'Kamu',budgetMode:'simple',defaultClosing:'used',surplusBehavior:'ask',strictBalance:false,theme:'light',privacy:false});
    let owners=await FWPDB.all('owners');
    if(owners.length===0){ for(let o of [{id:'ow_self',name:'Milik Sendiri',type:'individual'},{id:'ow_wife',name:'Istri',type:'individual'},{id:'ow_husband',name:'Suami',type:'individual'},{id:'ow_joint',name:'Bersama',type:'joint'}]) await FWPDB.put('owners',o); }
    let insts = await FWPDB.all('institutions');
    if(insts.length===0){ for(let x of[{id:'i1',name:'Bank Jago',type:'Bank'},{id:'i2',name:'BCA',type:'Bank'},{id:'i3',name:'Tunai',type:'Dompet'}])await FWPDB.put('institutions',x) }
}

function ownerOpts(selected=''){return S.cache.owners.map(o=>`<option value="${o.id}" ${selected===o.id?'selected':''}>${esc(o.name)}</option>`).join('')}

function providerOptions(list){return list.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}
function toggleOtherProvider(){const other=$('#x_provider')?.value==='other';if($('#x_other_wrap'))$('#x_other_wrap').style.display=other?'block':'none';if($('#x_lm_mode_wrap'))$('#x_lm_mode_wrap').style.display=other?'block':'none';}
function toggleLmMode(){const mode=v('x_price_mode');if($('#x_manual_price_wrap'))$('#x_manual_price_wrap').style.display=mode==='manual'?'block':'none';}
async function addGold(){
  if(!S.goldTab)S.goldTab='digital';
  if(S.goldTab==='digital'){
    modal('Tambah Akun Emas Digital',`<div class="formgrid">${f('Nama Akun','x_name')}<div class="field"><label>Platform</label><select id="x_provider" class="input" onchange="toggleOtherProvider()">${providerOptions(GOLD_DIGITAL_OPTIONS)}<option value="other">Lainnya</option></select></div><div class="field" id="x_other_wrap" style="display:none"><label>Nama Platform</label><input id="x_other_label" class="input" placeholder="Nama platform"></div><div class="field"><label>Pemilik</label><select id="x_owner" class="input">${ownerOpts()}</select></div>${f('Saldo Awal (Gram)','x_weight','number','0')}${f('Total Modal Beli (Rp)','x_price','number','0')}</div><div class="info small">Platform di luar daftar otomatis memakai harga acuan <b>Pegadaian</b> dan akan ditandai jelas sebagai harga acuan Pegadaian.</div>`,async()=>{
      const chosen=v('x_provider'),manual=chosen==='other',label=manual?v('x_other_label'):(GoldMarket.catalog(chosen)?.name||'');
      if(!v('x_name')||!label)return toast('Lengkapi nama akun dan platform'); const w=n(v('x_weight')),p=n(v('x_price')),accountId=id('gacc');
      await FWPDB.put('goldAccounts',{id:accountId,name:v('x_name'),providerId:manual?null:chosen,providerLabel:label,priceProviderId:manual?'pegadaian':chosen,priceMode:manual?'pegadaian':'provider',priceDisclosure:manual?'Harga acuan Pegadaian':null,ownerId:v('x_owner'),balanceGrams:w,avgCost:w>0?p/w:0,createdAt:dateNow()});
      if(w>0&&p>0)await FWPDB.put('goldTransactions',{id:id('gtx'),accountId,type:'buy',grams:w,pricePerGram:p/w,totalPrice:p,date:dateNow()});closeModal();await refresh();toast('Akun emas digital dibuat');
    });
  }else if(S.goldTab==='physical'){
    modal('Tambah Emas Fisik (LM)',`<div class="formgrid">${f('Nama','x_name')}<div class="field"><label>Merek</label><select id="x_provider" class="input" onchange="toggleOtherProvider()">${providerOptions(GOLD_PHYSICAL_OPTIONS)}<option value="other">Lainnya</option></select></div><div class="field" id="x_other_wrap" style="display:none"><label>Nama Merek</label><input id="x_other_label" class="input" placeholder="Nama merek"></div><div class="field" id="x_lm_mode_wrap" style="display:none"><label>Metode Valuasi</label><select id="x_price_mode" class="input" onchange="toggleLmMode()"><option value="unvalued">Belum dinilai</option><option value="antam">Ikuti harga acuan Antam</option><option value="manual">Harga manual</option></select></div><div class="field" id="x_manual_price_wrap" style="display:none"><label>Harga buyback manual / gram</label><input id="x_manual_buyback" class="input" inputmode="numeric"></div>${f('Berat (Gram)','x_weight','number','1')}${f('Total Harga Beli (Rp)','x_price','number','0')}<div class="field"><label>Pemilik</label><select id="x_owner" class="input">${ownerOpts()}</select></div></div><div class="info small">Merek di luar daftar tidak dinilai sampai Anda memilih harga manual atau harga acuan <b>Antam</b>. Jika memakai acuan, aplikasi akan menginformasikan bahwa harga tersebut adalah harga Antam.</div>`,async()=>{
      const chosen=v('x_provider'),manual=chosen==='other',label=manual?v('x_other_label'):(GoldMarket.catalog(chosen)?.name||''),mode=manual?v('x_price_mode'):'provider',w=n(v('x_weight'));
      if(!v('x_name')||!label||!w)return toast('Lengkapi data');
      await FWPDB.put('goldPhysical',{id:id('gphys'),name:v('x_name'),brandId:manual?null:chosen,brandLabel:label,priceProviderId:mode==='antam'?'antam':manual?null:chosen,priceMode:mode,priceDisclosure:mode==='antam'?'Harga acuan Antam':null,manualBuybackPrice:mode==='manual'?n(v('x_manual_buyback')):0,ownerId:v('x_owner'),weight:w,buyPrice:n(v('x_price')),status:'owned',createdAt:dateNow()});closeModal();await refresh();toast('Emas fisik ditambahkan');
    });
  }else{
    const merchants=GOLD_JEWELRY_MERCHANTS.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('');
    modal('Tambah Perhiasan',`<div class="formgrid">${f('Nama Perhiasan','x_name')}<div class="field"><label>Toko / Merek</label><select id="x_provider" class="input" onchange="toggleOtherProvider()">${merchants}<option value="other">Toko lainnya</option><option value="unbranded">Tidak bermerek</option></select></div><div class="field" id="x_other_wrap" style="display:none"><label>Nama Toko / Merek</label><input id="x_other_label" class="input"></div>${f('Berat (Gram)','x_weight','number','1')}${f('Kadar (Karat)','x_purity','number','18')}${f('Total Harga Beli (Rp)','x_price','number','0')}<div class="field"><label>Metode Valuasi</label><select id="x_price_mode" class="input" onchange="toggleLmMode()"><option value="unvalued">Belum dinilai</option><option value="antam">Estimasi harga Antam × kadar</option><option value="manual">Harga buyback toko / gram</option></select></div><div class="field" id="x_manual_price_wrap" style="display:none"><label>Harga buyback toko / gram sesuai kadar</label><input id="x_manual_buyback" class="input" inputmode="numeric"></div><div class="field"><label>Pemilik</label><select id="x_owner" class="input">${ownerOpts()}</select></div></div><div class="warning small">Estimasi Antam hanyalah acuan berdasarkan kadar, bukan harga buyback resmi toko.</div>`,async()=>{
      const chosen=v('x_provider'),label=chosen==='other'?v('x_other_label'):chosen==='unbranded'?'Tidak bermerek':(GOLD_JEWELRY_MERCHANTS.find(x=>x.id===chosen)?.name||''),mode=v('x_price_mode'),w=n(v('x_weight'));
      if(!v('x_name')||!label||!w)return toast('Lengkapi data');await FWPDB.put('goldJewelry',{id:id('gjew'),name:v('x_name'),merchantId:['other','unbranded'].includes(chosen)?null:chosen,merchantLabel:label,priceProviderId:mode==='antam'?'antam':null,priceMode:mode,priceDisclosure:mode==='antam'?'Estimasi berdasarkan harga Antam dan kadar':mode==='manual'?'Harga buyback toko manual':null,manualBuybackPrice:mode==='manual'?n(v('x_manual_buyback')):0,ownerId:v('x_owner'),weight:w,purity:n(v('x_purity')),buyPrice:n(v('x_price')),status:'owned',createdAt:dateNow()});closeModal();await refresh();toast('Perhiasan ditambahkan');
    }); setTimeout(toggleLmMode,0);
  }
}
async function buyGold(accId) {
    let acc = S.cache.goldAccounts.find(x=>x.id===accId);
    modal('Beli Emas Digital', `<div class="formgrid">${f('Jumlah (Gram)','x_weight','number','1')}${f('Total Harga Beli (Rp)','x_price','number','0')}</div>`, async()=>{
        let w = n(v('x_weight')), p = n(v('x_price'));
        if(!w || !p) return toast('Lengkapi data');
        let newBalance = n(acc.balanceGrams) + w;
        let newAvg = ((n(acc.balanceGrams) * n(acc.avgCost)) + p) / newBalance;
        acc.balanceGrams = newBalance; acc.avgCost = newAvg;
        await FWPDB.put('goldAccounts', acc);
        await FWPDB.put('goldTransactions', {id:id('gtx'), accountId:acc.id, type:'buy', grams:w, totalPrice:p, pricePerGram:(p/w), date:dateNow()});
        closeModal(); await refresh(); toast('Pembelian berhasil');
    });
}

async function sellGoldDigital(accId) {
    let acc = S.cache.goldAccounts.find(x=>x.id===accId);
    if(n(acc.balanceGrams) <= 0) return toast('Saldo emas kosong');
    let allocGram = getSourceAllocated(accId) / getGoldPrice(acc);
    modal('Jual Emas Digital', `<div class="formgrid">${f('Jumlah Jual (Gram)','x_weight','number','1')}<div class="field"><label>Masuk ke Rekening</label><select id="x_account" class="input">${sourceOpts()}</select></div>${f('Harga Jual / Gram (Rp)','x_price','number', String(Math.round(getGoldPrice(acc))))}</div><div class="info small">Saldo saat ini: ${n(acc.balanceGrams)} gr. (Teralokasi: ${allocGram.toFixed(2)} gr).</div>`, async()=>{
        let w = n(v('x_weight')), sid = v('x_account'), p = n(v('x_price'));
        if(!w || !sid || !p) return toast('Lengkapi data');
        if(w > n(acc.balanceGrams)) return toast('Melebihi saldo emas');
        let totalRp = w * p, modalRp = w * n(acc.avgCost), pl = totalRp - modalRp;
        acc.balanceGrams = n(acc.balanceGrams) - w; await FWPDB.put('goldAccounts', acc);
        await alterSource(sid, totalRp, 'Jual Emas Digital: '+acc.name, {goldAccId:accId, pl});
        await FWPDB.put('goldTransactions', {id:id('gtx'), accountId:acc.id, type:'sell', grams:w, totalPrice:totalRp, pricePerGram:p, realizedPL:pl, date:dateNow()});
        closeModal(); await refresh(); toast(`Terjual. ${pl>=0?'Untung':'Rugi'} ${money(Math.abs(pl))}`);
    });
}

async function sellGoldPhysical(gid) {
    let g = S.cache.goldPhysical.find(x=>x.id===gid);
    modal('Jual Emas Fisik', `<div class="formgrid">${f('Total Harga Jual (Rp)','x_price','number', String(Math.round(n(g.weight) * getGoldPrice(g))))}<div class="field"><label>Masuk ke Rekening</label><select id="x_account" class="input">${sourceOpts()}</select></div></div><div class="info small">Anda menjual ${esc(g.name)} (${n(g.weight)} gr) secara utuh.</div>`, async()=>{
        let p = n(v('x_price')), sid = v('x_account');
        if(!p || !sid) return toast('Lengkapi data');
        g.status = 'sold'; g.soldPrice = p; g.soldAt = dateNow(); await FWPDB.put('goldPhysical', g);
        await alterSource(sid, p, 'Jual Emas Fisik: '+g.name, {goldPhysId:g.id});
        closeModal(); await refresh(); toast('Emas terjual');
    });
}

async function sellGoldJewelry(gid) {
    let g = S.cache.goldJewelry.find(x=>x.id===gid);
    modal('Jual Perhiasan', `<div class="formgrid">${f('Total Harga Jual (Rp)','x_price','number','0')}<div class="field"><label>Masuk ke Rekening</label><select id="x_account" class="input">${sourceOpts()}</select></div></div>`, async()=>{
        let p = n(v('x_price')), sid = v('x_account');
        if(!p || !sid) return toast('Lengkapi data');
        g.status = 'sold'; g.soldPrice = p; g.soldAt = dateNow(); await FWPDB.put('goldJewelry', g);
        await alterSource(sid, p, 'Jual Perhiasan: '+g.name, {goldJewId:g.id});
        closeModal(); await refresh(); toast('Perhiasan terjual');
    });
}

async function addGoal(){
    modal('Buat Tujuan',`<div class="formgrid">${f('Nama','x_name')}${f('Ikon','x_icon','text','🎯')}${f('Target','x_target','number')}${f('Target tanggal','x_date','date')}${f('Prioritas','x_priority','number',String(S.cache.goals.length+1))}</div>`,async()=>{
        if(!v('x_name')||!n(v('x_target')))return toast('Nama dan target wajib');
        await FWPDB.put('goals',{id:id('g'),name:v('x_name'),icon:v('x_icon')||'🎯',target:n(v('x_target')),targetDate:v('x_date'),priority:n(v('x_priority'))||99,status:'active',createdAt:dateNow()});
        closeModal();await refresh()
    })
}

async function allocateGoal(gid){
    let accs = S.cache.accounts.map(a=>({id:a.id, type:'bank', name:a.name, avail:a.balance}));
    let pocks = S.cache.pockets.map(p=>({id:p.id, type:'pocket', name:p.name, avail:p.balance}));
    let goldAcc = S.cache.goldAccounts.map(g=>({id:g.id, type:'gold_digital', name:g.name, avail:g.balanceGrams * getGoldPrice(g), unit:'gram'}));
    let goldPhys = S.cache.goldPhysical.filter(g=>g.status==='owned').map(g=>({id:g.id, type:'gold_physical', name:g.name, avail:g.weight * getGoldPrice(g), unit:'keping'}));

    let opts = [...accs, ...pocks].map(x=>`<option value="${x.id}" data-type="${x.type}" data-unit="rp">${esc(x.name)} (Rp ${formatNum(x.avail)})</option>`).join('');
    opts += goldAcc.map(x=>`<option value="${x.id}" data-type="gold_digital" data-unit="gram">${esc(x.name)} (${x.avail/getGoldPrice(S.cache.goldAccounts.find(a=>a.id===x.id))} gr)</option>`).join('');
    opts += goldPhys.map(x=>`<option value="${x.id}" data-type="gold_physical" data-unit="keping">${esc(x.name)} (1 Keping)</option>`).join('');

    modal('Alokasikan Aset', `<div class="formgrid"><div class="field full"><label>Sumber Kekayaan</label><select id="x_source" class="input">${opts}</select></div>${f('Nominal Alokasi (Rp atau Gram)','x_amount','number')}</div><div class="info small">Masukkan angka nominal Rp jika memilih Bank/Pocket. Masukkan angka gram jika memilih Emas Digital.</div>`, async()=>{
        let sel = $('#x_source'), sid = sel.value, type = sel.options[sel.selectedIndex].dataset.type, unit = sel.options[sel.selectedIndex].dataset.unit, amount = n(v('x_amount'));
        if(!sid || !amount) return toast('Lengkapi data');
        let totalAllocated = getSourceAllocated(sid), maxAvail = 0;
        if(type === 'bank') maxAvail = acct(sid).balance;
        else if(type === 'pocket') maxAvail = pocket(sid).balance;
        else if(type === 'gold_digital') { let ga=S.cache.goldAccounts.find(x=>x.id===sid); maxAvail=ga.balanceGrams*getGoldPrice(ga); }
        else if(type === 'gold_physical') { let gp=S.cache.goldPhysical.find(x=>x.id===sid); maxAvail=gp.weight*getGoldPrice(gp); }
        let currentAllocInRp = (type.includes('gold')) ? totalAllocated : totalAllocated;
        let newAllocInRp=(unit==='gram')?(amount*getGoldPrice(S.cache.goldAccounts.find(x=>x.id===sid))):amount;
        if (currentAllocInRp + newAllocInRp > maxAvail) return toast('Alokasi melebihi ketersediaan saldo aset.');
        await FWPDB.put('goalAllocations', {id: id('ga'), goalId: gid, sourceId: sid, type: type, amount: amount, status: 'active', createdAt: dateNow()});
        closeModal(); await refresh(); toast('Alokasi berhasil');
    });
}

async function newPlan(){modal('Buat Rencana Bulanan',f('Nama rencana','x_name','text','Rencana '+monthName(S.month)),async()=>{await FWPDB.put('plans',{id:id('pl'),month:S.month,name:v('x_name'),status:'open',createdAt:dateNow()});closeModal();await refresh();toast('Rencana dibuat')})}
async function addIncome(){let p=plan();modal('Tambah Pendapatan',`<div class="formgrid">${f('Sumber','x_name','text','Gaji')}${f('Nominal','x_amount','number','')}</div>`,async()=>{if(!v('x_name')||!n(v('x_amount')))return toast('Lengkapi data');await FWPDB.put('incomeItems',{id:id('in'),planId:p.id,name:v('x_name'),amount:n(v('x_amount'))});await ledger('plan','Tambah pendapatan rencana',n(v('x_amount')),{planId:p.id},false);closeModal();await refresh()})}
async function addPlanItem(){let p=plan();modal('Tambah Alokasi',`<div class="formgrid">${f('Nama pos','x_name')}${f('Nominal','x_amount','number')}<div class="field"><label>Kategori</label><select id="x_cat" class="input"><option>Pengeluaran Wajib</option><option>Living</option><option>Playing</option><option>Saving</option><option>Cicilan</option><option>Sosial / Zakat</option><option>Kebutuhan Anak</option><option>Sinking Fund</option><option>Lainnya</option></select></div><div class="field"><label>Rekening sumber opsional</label><select id="x_source" class="input"><option value="">Belum dipilih</option>${sourceOpts()}</select></div></div>`,async()=>{if(!v('x_name')||!n(v('x_amount')))return toast('Lengkapi data');await FWPDB.put('planItems',{id:id('pi'),planId:p.id,name:v('x_name'),amount:n(v('x_amount')),category:v('x_cat'),sourceId:v('x_source'),fundingStatus:'planned',fundingMode:'marker',createdAt:dateNow()});closeModal();await refresh()})}

async function fundItem(iid){
    let x=await FWPDB.get('planItems', iid);
    if(x.fundingStatus==='funded') return toast('Pos sudah didanai.');
    modal('Siapkan Dana', `<p class="muted">${esc(x.name)} · ${money(x.amount)}</p><div class="field"><label>Metode</label><select id="x_mode" class="input"><option value="marker">Hanya penanda, jangan ubah saldo</option><option value="transfer">Kurangi sumber dan pindahkan ke tujuan</option></select></div><div class="formgrid" style="margin-top:12px"><div class="field"><label>Sumber</label><select id="x_from" class="input"><option value="">Pilih</option>${sourceOpts(x.sourceId)}</select></div><div class="field"><label>Tujuan</label><select id="x_to" class="input"><option value="">Pilih</option>${sourceOpts()}</select></div></div>`, async ()=>{
        const mode=v('x_mode'), from=v('x_from'), to=v('x_to');
        try {
            if(mode==='transfer'){
                if(!from||!to||from===to) return toast('Pilih sumber dan tujuan berbeda');
                let firstDone=false;
                try { await alterSource(from, -n(x.amount), 'Pendanaan pos: '+x.name,{itemId:x.id, counterpart:to}); firstDone=true; await alterSource(to, n(x.amount), 'Dana masuk pos: '+x.name,{itemId:x.id, counterpart:from}); } 
                catch(innerErr){ if(firstDone){ try { await alterSource(from, n(x.amount), 'Rollback: '+x.name, {itemId:x.id, rollback:true}); } catch(rbErr){} } throw innerErr; }
            }
            x.fundingStatus='funded'; x.fundingMode=mode; x.fundedAt=dateNow();
            await FWPDB.put('planItems', x); await ledger('funding','Tandai funded: '+x.name,0,{itemId:x.id,mode},false);
            closeModal(); await refresh(); toast('Pos ditandai Dana Disiapkan');
        } catch(e){ toast(e.message||'Gagal'); }
    });
}

async function addInstitution(){modal('Tambah Institusi',`<div class="formgrid">${f('Nama','x_name')}${f('Jenis','x_type','text','Bank')}</div>`,async()=>{await FWPDB.put('institutions',{id:id('i'),name:v('x_name'),type:v('x_type')});closeModal();await refresh()})}
async function editInstitution(id) { let inst = S.cache.institutions.find(x=>x.id===id); modal('Edit Institusi', `<div class="formgrid">${f('Nama Institusi','x_name','text',inst.name)}${f('Jenis','x_type','text',inst.type)}</div>`, async()=>{ inst.name = v('x_name'); inst.type = v('x_type'); await FWPDB.put('institutions', inst); closeModal(); await refresh(); toast('Institusi diubah'); }); }
async function delInstitution(id) {
    let inst = S.cache.institutions.find(x=>x.id===id), accts = S.cache.accounts.filter(x=>x.institutionId===id);
    if (accts.length > 0) { if (!confirm(`Institusi "${inst.name}" memiliki ${accts.length} rekening. Lanjutkan?`)) return; for (let a of accts) { let pockets = S.cache.pockets.filter(p=>p.accountId===a.id); for (let p of pockets) await FWPDB.del('pockets', p.id); await FWPDB.del('accounts', a.id); } } 
    else { if (!confirm(`Hapus institusi "${inst.name}"?`)) return; }
    await FWPDB.del('institutions', id); await refresh(); toast('Institusi dihapus');
}

async function addAccount(iid){modal('Tambah Rekening', `<div class="formgrid">${f('Nama rekening','x_name')}${f('Saldo aktual','x_balance','number','0')}<div class="field"><label>Pemilik</label><select id="x_owner" class="input">${ownerOpts()}</select></div><div class="field full"><label><input id="x_main" type="checkbox"> Rekening utama</label></div></div>`, async()=>{ if($('#x_main').checked) for(let a of S.cache.accounts){a.isMain=false;await FWPDB.put('accounts',a)} await FWPDB.put('accounts',{id:id('a'),institutionId:iid,name:v('x_name'),balance:n(v('x_balance')),ownerId:v('x_owner'),isMain:$('#x_main').checked,createdAt:dateNow()}); closeModal();await refresh() })}
async function editAccount(id) { let acct = S.cache.accounts.find(x=>x.id===id); modal('Edit Rekening', `<div class="formgrid">${f('Nama Rekening','x_name','text',acct.name)}${f('Saldo Aktual','x_balance','number',acct.balance)}<div class="field"><label>Pemilik</label><select id="x_owner" class="input">${ownerOpts(acct.ownerId)}</select></div><div class="field full"><label><input id="x_main" type="checkbox" ${acct.isMain?'checked':''}> Jadikan Rekening Utama</label></div></div>`, async()=>{ if($('#x_main').checked) for(let a of S.cache.accounts){ a.isMain=false; await FWPDB.put('accounts',a); } acct.name = v('x_name'); acct.balance = n(v('x_balance')); acct.ownerId = v('x_owner'); acct.isMain = $('#x_main').checked; await FWPDB.put('accounts', acct); closeModal(); await refresh(); toast('Rekening diubah'); }); }
async function delAccount(id) { let acct = S.cache.accounts.find(x=>x.id===id), pockets = S.cache.pockets.filter(p=>p.accountId===id); if (pockets.length > 0) { if (!confirm(`Rekening "${acct.name}" memiliki ${pockets.length} kantong. Lanjutkan?`)) return; for (let p of pockets) await FWPDB.del('pockets', p.id); } else { if (!confirm(`Hapus rekening "${acct.name}"?`)) return; } await FWPDB.del('accounts', id); await refresh(); toast('Rekening dihapus'); }

async function addPocket(aid){modal('Tambah Kantong',`<div class="formgrid">${f('Nama kantong','x_name')}${f('Alokasi saldo','x_balance','number','0')}</div><div class="info small">Kantong adalah bagian dari saldo rekening induk, bukan saldo tambahan.</div>`,async()=>{let a=acct(aid),amount=n(v('x_balance'));if(pocketAllocated(aid)+amount>n(a.balance))return toast('Total kantong melebihi saldo rekening');await FWPDB.put('pockets',{id:id('p'),accountId:aid,name:v('x_name'),balance:amount,createdAt:dateNow()});closeModal();await refresh()})}
async function reconcileAccount(aid){let a=acct(aid);modal('Rekonsiliasi Rekening',`${f('Saldo aktual','x_balance','number',a.balance)}<div class="warning small">Jika saldo aktual lebih kecil daripada total kantong, sistem akan memberi peringatan tetapi tidak menghapus alokasi.</div>`,async()=>{let old=n(a.balance),neu=n(v('x_balance'));a.balance=neu;await FWPDB.put('accounts',a);await ledger('reconcile','Rekonsiliasi '+a.name,neu-old,{accountId:aid,old,new:neu});closeModal();await refresh()})}
async function editPocket(pid) { let p = pocket(pid), a = acct(p.accountId); modal('Edit Kantong', `<div class="formgrid">${f('Nama kantong','x_name','text',p.name)}${f('Alokasi saldo','x_balance','number',p.balance)}</div>`, async () => { let newName = v('x_name'), neu = n(v('x_balance')), other = S.cache.pockets.filter(x => x.accountId === a.id && x.id !== pid).reduce((s, x) => s + n(x.balance), 0); if (other + neu > n(a.balance)) return toast('Total alokasi melebihi saldo rekening induk'); let oldBalance = n(p.balance); p.name = newName; p.balance = neu; await FWPDB.put('pockets', p); if (oldBalance !== neu) await ledger('reconcile', 'Rekonsiliasi kantong ' + p.name, 0, {pocketId: pid, old: oldBalance, new: neu}, true); closeModal(); await refresh(); toast('Kantong diperbarui'); }); }
async function delPocket(pid) { let p = pocket(pid); if (!confirm(`Hapus kantong "${p.name}"? Saldo ${money(p.balance)} akan kembali menjadi saldo bebas.`)) return; await FWPDB.del('pockets', pid); await refresh(); toast('Kantong dihapus'); }

async function fetchWithTimeout(url, opts={}, ms=12000){ const ctrl=new AbortController(); const timer=setTimeout(()=>ctrl.abort(), ms); try { const res=await fetch(url, {...opts, signal:ctrl.signal}); return res; } finally { clearTimeout(timer); } }

async function addAsset(){ modal('Tambah Aset Tetap', `<div class="formgrid">${f('Nama Aset','x_name','text','Motor Honda')}<div class="field"><label>Kategori</label><select id="x_cat" class="input"><option>Kendaraan</option><option>Properti</option><option>Elektronik</option><option>Lainnya</option></select></div>${f('Harga Beli (Rp)','x_buy','number','0')}${f('Nilai Saat Ini (Rp)','x_val','number','0')}<div class="field"><label>Pemilik</label><select id="x_owner" class="input">${ownerOpts()}</select></div></div>`, async()=>{ if(!v('x_name')||!n(v('x_val')))return toast('Lengkapi data'); await FWPDB.put('assets',{id:id('as'),name:v('x_name'),category:v('x_cat'),buyPrice:n(v('x_buy')),value:n(v('x_val')),ownerId:v('x_owner'),createdAt:dateNow()}); closeModal();await refresh();toast('Aset ditambahkan'); }); }
async function addDebt(){ modal('Catat Utang/Piutang', `<div class="formgrid"><div class="field"><label>Jenis</label><select id="x_type" class="input"><option value="utang">Utang (Saya berhutang)</option><option value="piutang">Piutang (Saya memberi pinjaman)</option></select></div>${f('Nama / Keterangan','x_name','text','Pinjam Bank / Pinjam Teman')}${f('Nominal (Rp)','x_amount','number','0')}${f('Jatuh Tempo (Opsional)','x_due','date','')}</div>`, async()=>{ if(!v('x_name')||!n(v('x_amount')))return toast('Lengkapi data'); await FWPDB.put('debts',{id:id('db'),type:v('x_type'),name:v('x_name'),amount:n(v('x_amount')),dueDate:v('x_due'),status:'active',createdAt:dateNow()}); closeModal();await refresh();toast('Berhasil dicatat'); }); }

async function transfer(){ modal('Transfer Saldo', `<div class="formgrid"><div class="field"><label>Dari</label><select id="x_from" class="input">${sourceOpts()}</select></div><div class="field"><label>Ke</label><select id="x_to" class="input">${sourceOpts()}</select></div>${f('Nominal','x_amount','number')}</div>`, async ()=>{ const from=v('x_from'), to=v('x_to'), a=n(v('x_amount')); if(!from||!to||from===to||!a) return toast('Lengkapi transfer'); try { let firstDone=false; try { await alterSource(from,-a,'Transfer keluar',{counterpart:to}); firstDone=true; await alterSource(to,a,'Transfer masuk',{counterpart:from}); } catch(innerErr){ if(firstDone){ try { await alterSource(from,a,'Rollback transfer',{counterpart:to, rollback:true}); } catch(rbErr){} } throw innerErr; } closeModal(); await refresh(); toast('Transfer tercatat'); } catch(e){ toast(e.message); } }); }

window.recalcClosing = function() { let p=plan(); if(!p) return; let ps=pstats(p), it=items(p.id), totalActual = 0; it.forEach(x => { let act = n(v('act_' + x.id)); totalActual += act; let diff = x.amount - act, statusEl = document.getElementById('status_' + x.id); if (statusEl) { if (diff > 0) statusEl.innerHTML = `<span class="positive">Sisa ${money(diff)}</span>`; else if (diff < 0) statusEl.innerHTML = `<span class="negative">Boncos ${money(Math.abs(diff))}</span>`; else statusEl.innerHTML = `<span class="muted">Pas</span>`; } }); let netCash = ps.income - totalActual, sumActualEl = document.getElementById('sum_actual'); if (sumActualEl) sumActualEl.textContent = money(totalActual); let sumNetEl = document.getElementById('sum_net'); if (sumNetEl) { sumNetEl.textContent = money(netCash); sumNetEl.className = netCash < 0 ? 'negative' : 'positive'; } let actionSelect = document.getElementById('x_action'); if (actionSelect) { let currentVal = actionSelect.value, isCurrentlyDeficit = currentVal && currentVal.startsWith('deficit'), shouldBeDeficit = netCash < 0; if (isCurrentlyDeficit !== shouldBeDeficit) { let optionsHtml = shouldBeDeficit ? '<option value="">-- Pilih Tindakan --</option><option value="deficit_carry">Bawa minus ke bulan berikutnya</option><option value="deficit_source">Tutup minus dari Rekening</option><option value="record_only">Catat tanpa ubah saldo</option>' : '<option value="">-- Pilih Tindakan --</option><option value="goal">Alokasikan ke Tujuan</option><option value="carry">Bawa sebagai Saldo Awal (Bulan Depan)</option><option value="main">Masukkan ke Rekening</option><option value="stay">Tetap tanpa perubahan saldo</option>'; actionSelect.innerHTML = optionsHtml; } } };

window.updateClosingTarget = function() { let action = v('x_action'); let wrap = document.getElementById('target_wrap'); let sel = document.getElementById('x_target'); if (!wrap || !sel) return; if (action === 'goal') { wrap.style.display = 'block'; sel.innerHTML = '<option value="">-- Pilih Tujuan --</option>' + S.cache.goals.map(g=>`<option value="g:${g.id}">${esc(g.name)}</option>`).join(''); } else if (action === 'main' || action === 'deficit_source') { wrap.style.display = 'block'; sel.innerHTML = '<option value="">-- Pilih Rekening --</option>' + [...S.cache.accounts,...S.cache.pockets].map(x=>`<option value="s:${x.id}">${esc(x.name)}</option>`).join(''); } else { wrap.style.display = 'none'; sel.innerHTML = ''; } };

async function closing(){ let p=plan(),ps=pstats(p),set=setting(),it=items(p.id); let rows = set.budgetMode==='simple' ? '<div class="info">Mode Ringkas: seluruh alokasi dianggap terpakai.</div>' : `<div class="sticky-summary"><div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span class="muted small">Total Rencana</span><b id="sum_plan" class="small">${money(ps.alloc)}</b></div><div style="display:flex; justify-content:space-between; margin-bottom:8px;"><span class="muted small">Total Aktual</span><b id="sum_actual" class="small">${money(ps.alloc)}</b></div><div style="display:flex; justify-content:space-between; border-top:1px dashed var(--border); padding-top:8px;"><span style="font-weight:800; font-size:14px;">Kas Bersih (Sisa)</span><b id="sum_net" style="font-size:14px;" class="${ps.surplus<0?'negative':'positive'}">${money(ps.surplus)}</b></div></div><div class="info small" style="margin-bottom:12px">Masukkan uang yang <b>aktual terpakai</b>. Kolom sudah otomatis terisi.</div>` + it.map(x=>`<div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:12px 0; border-bottom:1px solid var(--border);"><div style="flex:1; min-width:0;"><b style="display:block; font-size:14px; line-height:1.3; word-break:break-word;">${esc(x.name)}</b><small class="muted">Plan: ${money(x.amount)}</small><div id="status_${x.id}" class="small" style="margin-top:4px;"></div></div><div style="width:140px; flex-shrink:0;"><input class="input" id="act_${x.id}" type="text" inputmode="numeric" value="${formatNum(x.amount)}" placeholder="Aktual" style="padding:8px 10px; min-height:36px; font-size:14px; text-align:right;"></div></div>`).join(''); let isInitialDeficit = ps.surplus < 0; let optionsHtml = isInitialDeficit ? '<option value="">-- Pilih Tindakan --</option><option value="deficit_carry">Bawa minus ke bulan berikutnya</option><option value="deficit_source">Tutup minus dari Rekening</option><option value="record_only">Catat tanpa ubah saldo</option>' : '<option value="">-- Pilih Tindakan --</option><option value="goal">Alokasikan ke Tujuan</option><option value="carry">Bawa sebagai Saldo Awal (Bulan Depan)</option><option value="main">Masukkan ke Rekening</option><option value="stay">Tetap tanpa perubahan saldo</option>'; modal('Tutup Bulan', `${rows}<div class="formgrid" style="margin-top:13px"><div class="field full"><label>Tindakan</label><select id="x_action" class="input" onchange="updateClosingTarget()">${optionsHtml}</select></div><div class="field full" id="target_wrap" style="display:none;"><label>Tujuan/Rekening</label><select id="x_target" class="input"></select></div></div>`, async()=>{ let totalActual=0; if(set.budgetMode!=='simple') { it.forEach(x => totalActual += n(v('act_'+x.id))); } else { totalActual = ps.alloc; } let closeAmount = ps.income - totalActual; let action = v('x_action'), target = v('x_target'); if(!action) return toast('Pilih tindakan terlebih dahulu'); if(action==='goal' && !target.startsWith('g:')) return toast('Pilih tujuan terlebih dahulu'); if((action==='main' || action==='deficit_source') && !target.startsWith('s:')) return toast('Pilih rekening terlebih dahulu'); p.status='closed'; p.closedAt=dateNow(); p.closing={plannedIncome: ps.income, plannedAlloc: ps.alloc, totalActual: totalActual, finalAmount: closeAmount, action, target}; await FWPDB.put('plans',p); let next=new Date(S.month+'-01'); next.setMonth(next.getMonth()+1); let nextMonth=next.toISOString().slice(0,7); if(action==='carry'||action==='deficit_carry'){ let np=S.cache.plans.find(x=>x.month===nextMonth); if(!np){np={id:id('pl'),month:nextMonth,name:'Rencana '+monthName(nextMonth),status:'open',createdAt:dateNow()};await FWPDB.put('plans',np)} let nextIncomeName = closeAmount >= 0 ? 'Sisa Bulan Lalu (Carry Forward)' : 'Defisit Bulan Lalu'; await FWPDB.put('incomeItems',{id:id('in'),planId:np.id,name:nextIncomeName,amount:closeAmount}) }else if(action==='goal'&&target.startsWith('g:')){ let gid=target.slice(2),main=S.cache.accounts.find(x=>x.isMain); if(main&&closeAmount>0)await FWPDB.put('goalAllocations',{id:id('ga'),goalId:gid,sourceType:'account',sourceId:main.id,amount:closeAmount,status:'active',createdAt:dateNow()}) }else if((action==='main'||action==='deficit_source')&&target.startsWith('s:')){ await alterSource(target.slice(2),closeAmount,action==='main'?'Sisa tutup bulan':'Penutup defisit',{planId:p.id}) } await ledger('closing','Tutup bulan '+monthName(S.month),closeAmount,{planId:p.id,action,target},false); closeModal();await refresh();toast('Bulan ditutup') }); setTimeout(() => { if(set.budgetMode !== 'simple') recalcClosing(); updateClosingTarget(); }, 10); }

async function copyPlan(){ if(plan())return toast('Bulan ini sudah mempunyai rencana'); let d=new Date(S.month+'-01');d.setMonth(d.getMonth()-1);let pm=d.toISOString().slice(0,7),prev=S.cache.plans.find(x=>x.month===pm); if(!prev)return toast('Rencana bulan lalu tidak ada'); let np={id:id('pl'),month:S.month,name:'Rencana '+monthName(S.month),status:'open',createdAt:dateNow()}; await FWPDB.put('plans',np); for(let x of S.cache.incomeItems.filter(x=>x.planId===prev.id))await FWPDB.put('incomeItems',{...x,id:id('in'),planId:np.id}); for(let x of S.cache.planItems.filter(x=>x.planId===prev.id))await FWPDB.put('planItems',{...x,id:id('pi'),planId:np.id,fundingStatus:'planned',fundingMode:'marker'}); await refresh();toast('Rencana disalin') }

async function preferences(){ let s=setting(); modal('Preferensi',`<div class="formgrid"><div class="field"><label>Mode budgeting</label><select id="x_budget" class="input"><option value="simple">Ringkas</option><option value="closing">Closing ringan</option><option value="detailed">Lebih rinci</option></select></div><div class="field"><label>Default closing</label><select id="x_closing" class="input"><option value="used">Anggap terpakai</option><option value="ask">Selalu tanyakan</option><option value="remain">Anggap tersisa</option></select></div><div class="field full"><label><input id="x_strict" type="checkbox" ${s.strictBalance?'checked':''}> Mode saldo ketat</label></div></div>`,async()=>{ s.budgetMode=v('x_budget');s.defaultClosing=v('x_closing');s.strictBalance=$('#x_strict').checked; await FWPDB.put('settings',s);closeModal();await refresh() }); $('#x_budget').value=s.budgetMode;$('#x_closing').value=s.defaultClosing }

function quickAdd(){ modal('Tambah Cepat',`<div class="grid two"><button type="button" class="btn primary" data-action="newPlan">Rencana</button><button type="button" class="btn ghost" data-action="transfer">Transfer</button><button type="button" class="btn ghost" data-action="addGoal">Tujuan</button><button type="button" class="btn ghost" data-action="addGold">Emas</button><button type="button" class="btn ghost" data-action="addDebt">Utang/Piutang</button></div>`,null) }

async function backup(){let x=await FWPDB.dump();download('fwp-backup-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(x,null,2),'application/json')}
function download(name,text,type){let u=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();URL.revokeObjectURL(u)}

function shift(d){let x=new Date(S.month+'-01');x.setMonth(x.getMonth()+d);S.month=x.toISOString().slice(0,7);render()}

const actions={
    closeModal, quickAdd, newPlan, addIncome, addPlanItem, addGoal, addInstitution,
    transfer, closing, copyPlan, preferences, backup,
    addGold, addAsset, addDebt,
    syncGoldMarket, simulateGoldPurchase,
    restore:()=>$('#restoreFile').click(),
    prevMonth:()=>shift(-1), nextMonth:()=>shift(1),
    theme: async()=>{ const s=setting(); s.theme=s.theme==='dark'?'light':'dark'; await FWPDB.put('settings',s); await refresh(); },
    privacy: async()=>{ const s=setting(); s.privacy=!s.privacy; await FWPDB.put('settings',s); await refresh(); },
    finishOnboarding: async()=>{
        let s=setting();
        s={...s, onboarded:true, ownerName:v('onName')||'Kamu', budgetMode:ON.budgetMode, defaultClosing:ON.defaultClosing, surplusBehavior:v('onSurplus'), strictBalance:$('#onStrict').checked};
        await FWPDB.put('settings',s); $('#onboarding').classList.add('hidden'); await refresh();
    },
    manageOwners: manageOwners, addOwner: addOwner, toggleOtherProvider, toggleLmMode
};

document.addEventListener('click',async e=>{
    let t=e.target.closest('button');if(!t)return;
    if(t.dataset.page){S.page=t.dataset.page;render();return}
    
    if(t.dataset.action){
        if($('#modal').open && t.dataset.action !== 'closeModal' && !['theme','privacy','syncGoldMarket','manageOwners','addOwner'].includes(t.dataset.action)) closeModal();
        await actions[t.dataset.action]?.();return
    }
    
    if(t.dataset.wealth){S.wealth=t.dataset.wealth;render();return}
    if(t.dataset.goldtab){S.goldTab=t.dataset.goldtab;render();return}
    
    if(t.dataset.fund)return fundItem(t.dataset.fund);
    if(t.dataset.allocate)return allocateGoal(t.dataset.allocate);
    if(t.dataset.addAccount)return addAccount(t.dataset.addAccount);
    if(t.dataset.editAccount)return editAccount(t.dataset.editAccount);
    if(t.dataset.delAccount)return delAccount(t.dataset.delAccount);
    if(t.dataset.editInst)return editInstitution(t.dataset.editInst);
    if(t.dataset.delInst)return delInstitution(t.dataset.delInst);
    if(t.dataset.addPocket)return addPocket(t.dataset.addPocket);
    if(t.dataset.reconcileAccount)return reconcileAccount(t.dataset.reconcileAccount);
    if(t.dataset.editPocket)return editPocket(t.dataset.editPocket);
    if(t.dataset.delPocket)return delPocket(t.dataset.delPocket);
    if(t.dataset.buyGold) return buyGold(t.dataset.buyGold);
    if(t.dataset.sellGoldDigital) return sellGoldDigital(t.dataset.sellGoldDigital);
    if(t.dataset.sellGoldPhysical) return sellGoldPhysical(t.dataset.sellGoldPhysical);
    if(t.dataset.sellGoldJewelry) return sellGoldJewelry(t.dataset.sellGoldJewelry);
    if(t.dataset.editOwner) return editOwner(t.dataset.editOwner);
    if(t.dataset.delOwner) return delOwner(t.dataset.delOwner);
    
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

document.addEventListener('focusin', (e) => {
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') document.body.classList.add('keyboard-open');
});

document.addEventListener('focusout', (e) => {
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    setTimeout(() => {
      const active = document.activeElement;
      if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA' && active.tagName !== 'SELECT')) document.body.classList.remove('keyboard-open');
    }, 50);
  }
});

// === ONBOARDING ===
function showOnboarding(step){
    $('#onboarding').classList.remove('hidden');
    let q=step===1?`<div class="onboard-main"><div class="eyebrow">Langkah 1/3</div><h1>Cara mengelola anggaran?</h1><div class="choice" id="onChoice"><button data-v="simple" class="selected"><b>Ringkas</b><br><span class="muted">Rencana tanpa transaksi harian.</span></button><button data-v="closing"><b>Closing ringan</b><br><span class="muted">Isi sisa saat akhir bulan.</span></button><button data-v="detailed"><b>Lebih rinci</b><br><span class="muted">Status funded dan realisasi opsional.</span></button></div><button class="btn primary" data-on-next="2">Lanjut</button></div>`:
    step===2?`<div class="onboard-main"><div class="eyebrow">Langkah 2/3</div><h1>Jika tidak ada catatan sisa?</h1><div class="choice" id="onChoice"><button data-v="used" class="selected"><b>Anggap seluruh alokasi terpakai</b></button><button data-v="ask"><b>Selalu tanyakan</b></button><button data-v="remain"><b>Anggap masih tersisa</b></button></div><button class="btn ghost" data-on-next="1">Kembali</button> <button class="btn primary" data-on-next="3">Lanjut</button></div>`:
    `<div class="onboard-main"><div class="eyebrow">Langkah 3/3</div><h1>Pengaturan awal</h1><div class="formgrid">${f('Nama panggilan','onName','text','Anggi')}<div class="field"><label>Perilaku sisa</label><select id="onSurplus" class="input"><option value="ask">Tanyakan saat closing</option><option value="goal">Tujuan prioritas</option><option value="carry">Bawa bulan berikutnya</option><option value="main">Rekening utama</option></select></div><div class="field full"><label><input id="onStrict" type="checkbox"> Gunakan mode saldo ketat</label></div></div><button class="btn ghost" data-on-next="2">Kembali</button> <button class="btn primary" data-action="finishOnboarding">Mulai</button></div>`;
    $('#onStep').innerHTML=q
}
let ON={budgetMode:'simple',defaultClosing:'used'};

(async()=>{await FWPDB.open();await seed();await refresh();GoldMarket.autoSync().then(async r=>{if(r&&!r.skipped){await refresh();}}).catch(()=>{});if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{})})();