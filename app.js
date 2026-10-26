const S={page:'home',wealth:'goals',month:new Date().toISOString().slice(0,7),privacy:false,theme:'light',cache:{}};
const $=q=>document.querySelector(q),$$=q=>[...document.querySelectorAll(q)];
const id=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);

// === FUNGSI PEMBACA ANGKA ===
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
                if (parts[1] && parts[1].length >= 3) str = str.replace(/\./g, '');
            }
        }
    }
    return Number(str) || 0;
};

const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const dateNow=()=>new Date().toISOString();

function formatDateTime(iso){
    if(!iso) return '—';
    try { return new Date(iso).toLocaleString('id-ID',{dateStyle:'short',timeStyle:'short'}); }
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
        if (t.type === 'number') { t.type = 'text'; t.inputMode = 'numeric'; }
        let raw = t.value.replace(/[^\d,]/g, ''); 
        let parts = raw.split(',');
        let intPart = parts[0];
        let decPart = parts[1] ? ',' + parts[1] : '';
        if (intPart) t.value = new Intl.NumberFormat('id-ID').format(intPart) + decPart;
        else t.value = decPart ? '0' + decPart : '';
        if (typeof window.recalcClosing === 'function' && t.id.startsWith('act_')) window.recalcClosing();
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
        inp.type = 'text'; inp.inputMode = 'numeric';
        if (val) inp.value = formatNum(val);
    });

    $('#modalFoot').innerHTML=
        `<button type="button" class="btn ghost" data-action="closeModal">${cancelLabel}</button>`+
        (save?`<button class="btn primary" type="submit">${saveLabel}</button>`:'');
    $('#modalForm').onsubmit=async e=>{
        e.preventDefault();
        if(!save) return;
        try { await save(); } catch(err){ toast(err?.message || 'Terjadi kesalahan'); }
    };
    $('#modal').showModal();
}
function closeModal(){$('#modal').close()}

async function refresh(){
    for(let s of FWPDB.stores) S.cache[s]=await FWPDB.all(s);
    let set=S.cache.settings.find(x=>x.id==='main');
    if(set){S.theme=set.theme;S.privacy=set.privacy;document.documentElement.dataset.theme=S.theme}
    render();
    if(!set?.onboarded)showOnboarding(1)
}

function setting(){
    let def = {
        id:'main', onboarded:false, budgetMode:'simple', defaultClosing:'used',
        surplusBehavior:'ask', strictBalance:false, theme:'light', privacy:false,
        ownerName:'Kamu', 
        globalGoldPrice: 1950000,
        globalGoldSync: { source:'default', time:null },
        brandPrices: {},
        brandSync: {}
    };
    let s = S.cache.settings.find(x=>x.id==='main') || def;
    if(!s.globalGoldPrice) s.globalGoldPrice = 1950000;
    if(!s.globalGoldSync) s.globalGoldSync = { source:'default', time:null };
    if(!s.brandPrices) s.brandPrices = {};
    if(!s.brandSync) s.brandSync = {};
    return s;
}

function getGoldPrice(brand, purity = 24) {
    const s = setting();
    let basePrice = s.brandPrices[brand] || s.globalGoldPrice;
    if (purity < 24 && purity > 0) return basePrice * (purity / 24);
    return basePrice;
}

function acct(id){return S.cache.accounts.find(x=>x.id===id)}
function pocket(id){return S.cache.pockets.find(x=>x.id===id)}
function goal(id){return S.cache.goals.find(x=>x.id===id)}
function source(id){return pocket(id)||acct(id)}
function sourceName(id){return source(id)?.name||'Tanpa perubahan saldo'}
function ownerName(oid){return S.cache.owners.find(x=>x.id===oid)?.name||'Tidak diketahui'}

function totalAccountBalance(){return S.cache.accounts.reduce((a,x)=>a+n(x.balance),0)}
function totalGoldDigitalValue(){return S.cache.goldAccounts.reduce((a,x)=> a + (n(x.balanceGrams) * getGoldPrice(x.brand)), 0)}
function totalGoldPhysicalValue(){return S.cache.goldPhysical.filter(x=>x.status==='owned').reduce((a,x)=> a + (n(x.weight) * getGoldPrice(x.brand)), 0)}
function totalGoldJewelryValue(){return S.cache.goldJewelry.filter(x=>x.status==='owned').reduce((a,x)=> a + (n(x.weight) * getGoldPrice(x.brand, n(x.purity))), 0)}
function totalGoldValue(){ return totalGoldDigitalValue() + totalGoldPhysicalValue() + totalGoldJewelryValue()}
function totalAssetValue(){ return S.cache.assets.reduce((a,x)=>a+n(x.value),0) }
function totalPiutang(){ return S.cache.debts.filter(x=>x.type==='piutang'&&x.status==='active').reduce((a,x)=>a+n(x.amount),0) }
function totalUtang(){ return S.cache.debts.filter(x=>x.type==='utang'&&x.status==='active').reduce((a,x)=>a+n(x.amount),0) }
function netWorth(){ return totalAccountBalance() + totalGoldValue() + totalAssetValue() + totalPiutang() - totalUtang() }

function getRunway() {
    let p = plan(), it = p ? items(p.id) : [];
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
    let ii=incomes(p.id),it=items(p.id), income=ii.reduce((a,x)=>a+n(x.amount),0), alloc=it.reduce((a,x)=>a+n(x.amount),0);
    return{income,alloc,surplus:income-alloc,funded:it.filter(x=>x.fundingStatus==='funded').reduce((a,x)=>a+n(x.amount),0)}
}

function getGoalAllocations(gid) { return S.cache.goalAllocations.filter(x=>x.goalId===gid && x.status==='active'); }
function getSourceAllocated(sourceId) { return S.cache.goalAllocations.filter(x=>x.sourceId===sourceId && x.status==='active').reduce((a,x)=>a+n(x.amount), 0); }
function goalValue(gid){
    return getGoalAllocations(gid).reduce((a, x) => {
        if (x.type === 'gram') return a + (n(x.amount) * setting().globalGoldPrice);
        return a + n(x.amount);
    }, 0);
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
                        <button class="icon" style="width:28px; height:28px; font-size:14px;" data-edit-inst="${i.id}">✎</button>
                        <button class="icon" style="width:28px; height:28px; font-size:14px; color:var(--red);" data-del-inst="${i.id}">×</button>
                    </div>
                </div>
                ${S.cache.accounts.filter(a=>a.institutionId===i.id).map(a=>{
                    let pa=S.cache.pockets.filter(p=>p.accountId===a.id), ua=unallocated(a);
                    return `<div style="margin-top:12px; background:var(--surface-2); padding:10px; border-radius:var(--r-sm);">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
                            <div style="flex:1; min-width:140px;"><b style="font-size:14px;">${esc(a.name)}</b>${a.isMain?'<span class="badge green" style="margin-left:4px; font-size:10px;">Utama</span>':''}<small class="muted" style="display:block; margin-top:2px;">Saldo: <b>${money(a.balance)}</b> · Bebas: ${money(ua)}</small></div>
                            <div style="display:flex; gap:4px;">
                                <button class="icon" style="width:28px; height:28px; font-size:14px;" data-add-pocket="${a.id}">＋</button>
                                <button class="icon" style="width:28px; height:28px; font-size:14px;" data-edit-account="${a.id}">✎</button>
                                <button class="icon" style="width:28px; height:28px; font-size:14px; color:var(--red);" data-del-account="${a.id}">×</button>
                            </div>
                        </div>
                        ${ua<0?'<div class="warning small" style="margin-top:8px; padding:6px 10px;">Total kantong melebihi saldo rekening.</div>':''}
                        ${pa.map(p=>`<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-top:1px solid var(--border); margin-top:8px;"><div style="flex:1; min-width:0; padding-left:10px;"><b style="font-size:13px;">↳ ${esc(p.name)}</b></div><div style="display:flex; align-items:center; gap:6px;"><b style="font-size:13px; margin-right:4px;">${money(p.balance)}</b><button class="icon" style="width:24px; height:24px; font-size:12px;" data-edit-pocket="${p.id}">✎</button><button class="icon" style="width:24px; height:24px; font-size:12px; color:var(--red);" data-del-pocket="${p.id}">×</button></div></div>`).join('')}
                    </div>`;
                }).join('') || '<div class="empty small">Belum ada rekening.</div>'}
            </div>
        `).join('')}
    </div>`;
}

// === UI EMAS BARU ===
function goldView(){
    if(!S.goldTab) S.goldTab = 'digital';
    let btnText = "＋ Tambah Akun Digital";
    if(S.goldTab === 'physical') btnText = "＋ Tambah Kepingan Fisik";
    if(S.goldTab === 'jewelry') btnText = "＋ Tambah Perhiasan";

    let content = '';
    if(S.goldTab === 'digital') {
        content = `<div class="grid two" style="margin-top:15px">
            ${S.cache.goldAccounts.map(acc => {
                let price = getGoldPrice(acc.brand);
                let val = n(acc.balanceGrams) * price;
                let avg = n(acc.avgCost);
                if (avg === 0 && n(acc.balanceGrams) > 0) avg = price; // Fix bug avgCost 0
                
                let modal = avg * n(acc.balanceGrams);
                let pl = val - modal;
                let avail = n(acc.balanceGrams) - (getSourceAllocated(acc.id) / price);
                let syncInfo = setting().brandSync[acc.brand] || setting().globalGoldSync;

                return `<div class="card" style="border-top:4px solid var(--orange)">
                    <div style="display:flex; justify-content:space-between"><span class="badge orange">${esc(acc.brand)}</span><span class="badge blue" style="font-size:10px">${esc(ownerName(acc.ownerId))}</span></div>
                    <h3 style="margin:10px 0">${esc(acc.name)}</h3>
                    <div style="display:flex; justify-content:space-between; align-items:flex-end">
                        <div><small class="muted" style="display:block">Saldo Emas</small><b style="font-size:20px">${n(acc.balanceGrams)} <small>gr</small></b></div>
                        <div style="text-align:right"><small class="muted" style="display:block">Tersedia</small><b>${Math.max(0, avail).toFixed(2)} gr</b></div>
                    </div>
                    <div style="margin-top:10px; border-top:1px dashed var(--border); padding-top:10px; font-size:13px">
                        <div style="display:flex; justify-content:space-between"><span class="muted">Harga Pasar</span><b>${money(price)}/gr</b></div>
                        <div style="font-size:10px; color:var(--muted); text-align:right; margin-bottom:4px;">Sync: ${formatDateTime(syncInfo.time)} (${syncInfo.source})</div>
                        <div style="display:flex; justify-content:space-between"><span class="muted">Nilai Aset</span><b>${money(val)}</b></div>
                        <div style="display:flex; justify-content:space-between"><span class="muted">Rata-rata Beli</span><b>${money(avg)}/gr</b></div>
                        <div style="display:flex; justify-content:space-between"><span class="muted">P/L</span><b class="${pl>=0?'positive':'negative'}">${pl>=0?'+':''}${money(pl)}</b></div>
                    </div>
                    <div style="display:flex; gap:6px; margin-top:12px"><button class="btn primary" style="flex:1" data-buy-gold="${acc.id}">Beli</button><button class="btn ghost" style="flex:1" data-sell-gold-digital="${acc.id}">Jual</button></div>
                </div>`;
            }).join('') || '<div class="empty" style="grid-column:1/-1">Belum ada akun emas digital.</div>'}
        </div>`;
    } else if (S.goldTab === 'physical') {
        content = `<div class="grid three" style="margin-top:15px">
            ${S.cache.goldPhysical.filter(g=>g.status==='owned').map(g => {
                let price = getGoldPrice(g.brand), val = n(g.weight) * price;
                let avg = n(g.buyPrice) / n(g.weight);
                if (avg === 0) avg = price;
                let pl = val - n(g.buyPrice);
                let syncInfo = setting().brandSync[g.brand] || setting().globalGoldSync;

                return `<div class="card">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px"><span class="badge blue">${esc(g.brand)}</span><span class="badge">${esc(ownerName(g.ownerId))}</span></div>
                    <h3>${esc(g.name)}</h3><small class="muted">${n(g.weight)} gram</small>
                    <div style="margin-top:10px; border-top:1px dashed var(--border); padding-top:10px">
                        <div style="display:flex; justify-content:space-between"><span class="muted small">Harga Pasar</span><b class="small">${money(price)}</b></div>
                        <div style="font-size:10px; color:var(--muted); text-align:right; margin-bottom:4px;">Sync: ${formatDateTime(syncInfo.time)}</div>
                        <div style="display:flex; justify-content:space-between"><span class="muted small">Nilai Aset</span><b class="small">${money(val)}</b></div>
                        <div style="display:flex; justify-content:space-between"><span class="muted small">P/L</span><b class="small ${pl>=0?'positive':'negative'}">${pl>=0?'+':''}${money(pl)}</b></div>
                    </div>
                    <button class="btn dark" style="margin-top:10px; width:100%" data-sell-gold-physical="${g.id}">Jual Kepingan</button>
                </div>`;
            }).join('') || '<div class="empty" style="grid-column:1/-1">Belum ada emas fisik.</div>'}
        </div>`;
    } else {
        content = `<div class="grid two" style="margin-top:15px">
            ${S.cache.goldJewelry.filter(g=>g.status==='owned').map(g => {
                let price = getGoldPrice(g.brand, n(g.purity)), val = n(g.weight) * price;
                let syncInfo = setting().brandSync[g.brand] || setting().globalGoldSync;
                
                return `<div class="card">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px"><span class="badge purple">${esc(g.brand)}</span><span class="badge">${esc(ownerName(g.ownerId))}</span></div>
                    <h3>${esc(g.name)}</h3><small class="muted">${n(g.weight)} gram · ${esc(g.purity||'?')}K</small>
                    <div style="margin-top:10px; border-top:1px dashed var(--border); padding-top:10px">
                        <div style="display:flex; justify-content:space-between"><span class="muted small">Estimasi Pasar</span><b class="small">${money(price)}/gr</b></div>
                        <div style="font-size:10px; color:var(--muted); text-align:right; margin-bottom:4px;">Sync: ${formatDateTime(syncInfo.time)}</div>
                        <div style="display:flex; justify-content:space-between"><span class="muted small">Nilai Aset</span><b class="small">${money(val)}</b></div>
                        <div style="display:flex; justify-content:space-between"><span class="muted small">Beli</span><b class="small">${money(g.buyPrice)}</b></div>
                    </div>
                    <button class="btn dark" style="margin-top:10px; width:100%" data-sell-gold-jewelry="${g.id}">Jual Perhiasan</button>
                </div>`;
            }).join('') || '<div class="empty" style="grid-column:1/-1">Belum ada emas perhiasan.</div>'}
        </div>`;
    }

    return `<div class="section" style="margin-bottom:10px">
        <div><h2>Aset Emas</h2><span class="muted small">Harga Global: <b>${money(setting().globalGoldPrice)}</b>/gr</span></div>
        <div class="row-actions"><button class="btn ghost" data-action="manageGoldPrices">⚙️ Atur Harga</button></div>
    </div>
    <div class="tabs" style="margin-top:15px">
        <button class="tab ${S.goldTab==='digital'?'active':''}" data-goldtab="digital">Digital</button>
        <button class="tab ${S.goldTab==='physical'?'active':''}" data-goldtab="physical">Fisik (LM)</button>
        <button class="tab ${S.goldTab==='jewelry'?'active':''}" data-goldtab="jewelry">Perhiasan</button>
    </div>
    <button class="btn primary" style="width:100%; margin-top:15px;" data-action="addGold">${btnText}</button>
    ${content}`;
}

// === PUSAT HARGA (PRICE HUB) REVISI ===
function manageGoldPrices() {
    const s = setting();
    let bp = s.brandPrices || {};
    let bs = s.brandSync || {};

    // 1. Ambil merek yang BENAR-BENAR DIMILIKI user
    let ownedBrands = {
        digital: [...new Set(S.cache.goldAccounts.map(x=>x.brand))],
        physical: [...new Set(S.cache.goldPhysical.filter(x=>x.status==='owned').map(x=>x.brand))],
        jewelry: [...new Set(S.cache.goldJewelry.filter(x=>x.status==='owned').map(x=>x.brand))]
    };

    const renderRow = (brand, category) => {
        const price = bp[brand] || 0;
        const isApi = ['Pegadaian Digital', 'The Palace'].includes(brand);
        const syncState = bs[brand] || { source:'default', time:null };
        
        let displayPrice = price > 0 ? money(price) : `<span class="muted" style="font-style:italic">Ikut Global (${money(s.globalGoldPrice)})</span>`;
        let syncLabel = syncState.time ? `Sync: ${formatDateTime(syncState.time)} (${syncState.source})` : 'Belum disync';
        let infoText = isApi ? '🟢 API Tersedia' : '🟡 API belum tersedia. Sync mengikuti Harga Global.';

        return `<div style="display:flex; align-items:center; justify-content:space-between; padding:12px 0; border-bottom:1px solid var(--border); flex-wrap:wrap; gap:8px;">
            <div style="flex:1; min-width:130px;">
                <b style="font-size:14px;">${brand}</b>
                <div class="small muted">${infoText}</div>
                <div style="font-size:13px; margin-top:2px;">${displayPrice}</div>
                <div style="font-size:10px; color:var(--muted); margin-top:2px;">${syncLabel}</div>
            </div>
            <div style="display:flex; gap:4px;">
                <button class="btn ghost small" data-action="syncBrand" data-brand="${brand}" data-isapi="${isApi}">
                    🔄 Sync
                </button>
                <button class="btn ghost small" data-action="editBrandPrice" data-brand="${brand}">
                    ✏️ Edit
                </button>
            </div>
        </div>`;
    };

    let html = `
        <div class="card" style="background:var(--surface-2); margin-bottom:15px;">
            <h3>🌟 Harga Acuan Global</h3>
            <p class="small muted" style="margin-bottom:8px">Dipakai jika suatu merek belum diatur harganya.</p>
            <div style="display:flex; align-items:center; justify-content:space-between;">
                <div>
                    <b style="font-size:20px">${money(s.globalGoldPrice)} <small>/gr</small></b>
                    <div style="font-size:10px; color:var(--muted); margin-top:2px;">Sync: ${formatDateTime(s.globalGoldSync.time)} (${s.globalGoldSync.source})</div>
                </div>
                <div style="display:flex; gap:4px;">
                    <button class="btn primary small" data-action="syncGlobal">🔄 Sync API</button>
                    <button class="btn ghost small" data-action="editGlobalPrice">✏️ Edit</button>
                </div>
            </div>
        </div>
    `;

    let hasData = false;
    if (ownedBrands.digital.length) {
        hasData = true;
        html += `<h3 style="margin-bottom:8px;">Emas Digital</h3>` + ownedBrands.digital.map(b => renderRow(b, 'digital')).join('');
    }
    if (ownedBrands.physical.length) {
        hasData = true;
        html += `<h3 style="margin-top:16px; margin-bottom:8px;">Logam Mulia</h3>` + ownedBrands.physical.map(b => renderRow(b, 'physical')).join('');
    }
    if (ownedBrands.jewelry.length) {
        hasData = true;
        html += `<h3 style="margin-top:16px; margin-bottom:8px;">Perhiasan</h3>` + ownedBrands.jewelry.map(b => renderRow(b, 'jewelry')).join('');
    }
    
    if (!hasData) {
        html += `<div class="empty">Anda belum memiliki aset emas. Tambahkan emas terlebih dahulu untuk mengatur harganya.</div>`;
    }

    // Cek apakah modal sudah terbuka, jika ya perbarui isinya saja (agar tidak flicker)
    if ($('#modal').open && $('#modalTitle').textContent === 'Pusat Harga Emas') {
        $('#modalBody').innerHTML = html;
    } else {
        modal('Pusat Harga Emas', html, null, {cancelLabel: 'Tutup', saveLabel: null});
    }
}

async function editGlobalPrice() {
    const s = setting();
    modal('Ubah Harga Global', f('Harga per Gram (Rp)', 'x_gp', 'number', s.globalGoldPrice), async () => {
        s.globalGoldPrice = n(v('x_gp'));
        s.globalGoldSync = { source: 'manual', time: dateNow() };
        await FWPDB.put('settings', s);
        await refresh(); manageGoldPrices(); toast('Harga Global diperbarui');
    });
}

async function editBrandPrice(brand) {
    const s = setting();
    const price = s.brandPrices[brand] || '';
    modal(`Ubah Harga ${brand}`, `
        <div class="formgrid">${f('Harga per Gram (Rp)', 'x_bp', 'number', price)}</div>
        <div class="info small" style="margin-top:10px">Kosongkan jika ingin mengikuti Harga Global.</div>
    `, async () => {
        let newPrice = n(v('x_bp'));
        if (newPrice > 0) s.brandPrices[brand] = newPrice;
        else delete s.brandPrices[brand];
        
        s.brandSync = s.brandSync || {};
        s.brandSync[brand] = { source: 'manual', time: dateNow() };
        
        await FWPDB.put('settings', s);
        await refresh(); manageGoldPrices(); toast('Harga diperbarui');
    });
}

async function syncGlobal() {
    const btn = event.target.closest('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Sync...';
    btn.disabled = true;

    try {
        const res = await fetchWithTimeout('/api/global-gold-price');
        const data = await res.json();
        if (data.success && data.price) {
            const s = setting();
            s.globalGoldPrice = data.price;
            s.globalGoldSync = { source: 'api', time: dateNow() };
            await FWPDB.put('settings', s);
            await refresh(); manageGoldPrices(); toast('Harga Global berhasil ditarik');
        } else {
            throw Error('Gagal mendapatkan data');
        }
    } catch (e) {
        toast('Gagal Sync Global: ' + e.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// GANTI FUNGSI syncGlobal DAN syncBrand DENGAN INI

async function syncGlobal() {
    const btn = event.target.closest('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Sync...'; btn.disabled = true;

    try {
        // Global kita gunakan harga Antam 1 Gram sebagai acuan standar
        const res = await fetchWithTimeout('/api/gold-prices');
        const data = await res.json();
        
        if (data.success && data.data.antam && data.data.antam.sell > 0) {
            const s = setting();
            s.globalGoldPrice = data.data.antam.sell;
            s.globalGoldSync = { source: 'api', time: dateNow() };
            await FWPDB.put('settings', s);
            await refresh(); manageGoldPrices(); toast('Harga Global (Antam) berhasil ditarik');
        } else {
            throw Error('Data Antam tidak ditemukan di API');
        }
    } catch (e) {
        toast('Gagal Sync Global: ' + e.message);
        btn.innerHTML = originalText; btn.disabled = false;
    }
}

async function syncBrand(brand) {
    const btn = event.target.closest('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Sync...'; btn.disabled = true;

    const s = setting();
    s.brandSync = s.brandSync || {};

    try {
        // Tarik data terbaru dari API Scraper kita
        const res = await fetchWithTimeout('/api/gold-prices');
        const data = await res.json();
        if (!data.success) throw Error('Gagal mengambil data dari API');

        const apiData = data.data;
        let newPrice = 0;

        // Petakan berdasarkan nama merek
        if (brand === 'Pegadaian Digital' && apiData.pegadaian?.buyback) {
            newPrice = apiData.pegadaian.buyback;
        } else if (brand === 'Antam' && apiData.antam?.buyback) {
            newPrice = apiData.antam.buyback;
        } else if (brand === 'UBS Gold' && apiData.ubs?.buyback) {
            newPrice = apiData.ubs.buyback;
        } else if (brand === 'Galeri 24' && apiData.galeri24?.buyback) {
            newPrice = apiData.galeri24.buyback;
        } else if (brand === 'The Palace') {
             // Karena The Palace pakai API terpisah di aplikasi lama, kita bisa fallback ke Global
             newPrice = s.globalGoldPrice; 
        } else {
            // Jika merek tidak ada di scraper (misal Sinar Jaya), fallback ke Global
            newPrice = s.globalGoldPrice;
        }

        if (newPrice > 0) {
            s.brandPrices[brand] = newPrice;
            s.brandSync[brand] = { source: 'api', time: dateNow() };
            await FWPDB.put('settings', s);
            await refresh(); manageGoldPrices(); toast(`Harga ${brand} berhasil diperbarui`);
        } else {
            throw Error('Harga tidak tersedia di sumber');
        }

    } catch (e) {
        toast(`Gagal sync ${brand}: ` + e.message);
        btn.innerHTML = originalText; btn.disabled = false;
    }
}

// === FUNGSI UI LAINNYA ===
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

// === CORE ===
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
        a.balance=n(a.balance)+delta; await FWPDB.put('accounts',a); await ledger('balance',label,delta,{sourceId:sid,...meta})
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
    if(!set) await FWPDB.put('settings',{id:'main',onboarded:false,ownerName:'Kamu',budgetMode:'simple',defaultClosing:'used',surplusBehavior:'ask',strictBalance:false,theme:'light',privacy:false,globalGoldPrice:1950000, globalGoldSync: { source:'default', time:null }, brandPrices: {}, brandSync: {}});
    let owners=await FWPDB.all('owners');
    if(owners.length===0){ for(let o of [{id:'ow_self',name:'Milik Sendiri',type:'individual'},{id:'ow_wife',name:'Istri',type:'individual'},{id:'ow_husband',name:'Suami',type:'individual'},{id:'ow_joint',name:'Bersama',type:'joint'}]) await FWPDB.put('owners',o); }
    let insts = await FWPDB.all('institutions');
    if(insts.length===0){ for(let x of[{id:'i1',name:'Bank Jago',type:'Bank'},{id:'i2',name:'BCA',type:'Bank'},{id:'i3',name:'Tunai',type:'Dompet'}])await FWPDB.put('institutions',x) }
}

function ownerOpts(selected=''){return S.cache.owners.map(o=>`<option value="${o.id}" ${selected===o.id?'selected':''}>${esc(o.name)}</option>`).join('')}

async function addGold(){
    if(!S.goldTab) S.goldTab = 'digital';
    if(S.goldTab === 'digital') {
        modal('Tambah Akun Emas Digital', `<div class="formgrid">${f('Nama Akun (Cth: Pegadaian Anggi)','x_name')}<div class="field"><label>Merek / Platform</label><input class="input" id="x_brand" placeholder="Cth: Pegadaian Digital"></div><div class="field"><label>Pemilik</label><select id="x_owner" class="input">${ownerOpts()}</select></div>${f('Saldo Awal (Gram)','x_weight','number','0')}${f('Total Modal Beli (Rp)','x_price','number','0')}</div>`, async()=>{
            if(!v('x_name') || !v('x_brand')) return toast('Lengkapi nama dan merek');
            let w = n(v('x_weight')), p = n(v('x_price')), avg = w > 0 ? (p/w) : 0;
            await FWPDB.put('goldAccounts',{id:id('gacc'), name:v('x_name'), brand:v('x_brand'), ownerId:v('x_owner'), balanceGrams: w, avgCost: avg});
            if(w > 0 && p > 0) await FWPDB.put('goldTransactions', {id:id('gtx'), accountId:id('gacc'), type:'buy', grams:w, pricePerGram:avg, totalPrice:p, date:dateNow()});
            closeModal(); await refresh(); toast('Akun Emas Digital dibuat');
        });
    } else if(S.goldTab === 'physical') {
        modal('Tambah Emas Fisik (LM)', `<div class="formgrid">${f('Nama (Cth: Antam 1g)','x_name')}<div class="field"><label>Merek</label><input class="input" id="x_brand" placeholder="Cth: Antam"></div>${f('Berat (Gram)','x_weight','number','1')}${f('Harga Beli (Rp)','x_price','number','0')}<div class="field"><label>Pemilik</label><select id="x_owner" class="input">${ownerOpts()}</select></div></div>`, async()=>{
            if(!v('x_name') || !v('x_brand') || !n(v('x_weight'))) return toast('Lengkapi data');
            await FWPDB.put('goldPhysical',{id:id('gphys'), name:v('x_name'), brand:v('x_brand'), ownerId:v('x_owner'), weight: n(v('x_weight')), buyPrice: n(v('x_price')), status:'owned', createdAt:dateNow()});
            closeModal(); await refresh(); toast('Emas fisik ditambahkan');
        });
    } else {
        modal('Tambah Perhiasan', `<div class="formgrid">${f('Nama Perhiasan (Cth: Cincin Emas)','x_name')}<div class="field"><label>Merek / Toko</label><input class="input" id="x_brand" placeholder="Cth: The Palace / Sinar Jaya"></div>${f('Berat (Gram)','x_weight','number','1')}${f('Kadar (Cth: 18)','x_purity','number','18')}${f('Harga Beli (Rp)','x_price','number','0')}<div class="field"><label>Pemilik</label><select id="x_owner" class="input">${ownerOpts()}</select></div></div>`, async()=>{
            if(!v('x_name') || !v('x_brand') || !n(v('x_weight'))) return toast('Lengkapi data');
            await FWPDB.put('goldJewelry',{id:id('gjew'), name:v('x_name'), brand:v('x_brand'), ownerId:v('x_owner'), weight: n(v('x_weight')), purity: n(v('x_purity')), buyPrice: n(v('x_price')), status:'owned', createdAt:dateNow()});
            closeModal(); await refresh(); toast('Perhiasan ditambahkan');
        });
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
    let allocGram = getSourceAllocated(accId) / getGoldPrice(acc.brand);
    modal('Jual Emas Digital', `<div class="formgrid">${f('Jumlah Jual (Gram)','x_weight','number','1')}<div class="field"><label>Masuk ke Rekening</label><select id="x_account" class="input">${sourceOpts()}</select></div>${f('Harga Jual / Gram (Rp)','x_price','number', String(Math.round(getGoldPrice(acc.brand))))}</div><div class="info small">Saldo saat ini: ${n(acc.balanceGrams)} gr. (Teralokasi: ${allocGram.toFixed(2)} gr).</div>`, async()=>{
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
    modal('Jual Emas Fisik', `<div class="formgrid">${f('Total Harga Jual (Rp)','x_price','number', String(Math.round(n(g.weight) * getGoldPrice(g.brand))))}<div class="field"><label>Masuk ke Rekening</label><select id="x_account" class="input">${sourceOpts()}</select></div></div><div class="info small">Anda menjual ${esc(g.name)} (${n(g.weight)} gr) secara utuh.</div>`, async()=>{
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
    let goldAcc = S.cache.goldAccounts.map(g=>({id:g.id, type:'gold_digital', name:g.name, avail:g.balanceGrams * getGoldPrice(g.brand), unit:'gram'}));
    let goldPhys = S.cache.goldPhysical.filter(g=>g.status==='owned').map(g=>({id:g.id, type:'gold_physical', name:g.name, avail:g.weight * getGoldPrice(g.brand), unit:'keping'}));

    let opts = [...accs, ...pocks].map(x=>`<option value="${x.id}" data-type="${x.type}" data-unit="rp">${esc(x.name)} (Rp ${formatNum(x.avail)})</option>`).join('');
    opts += goldAcc.map(x=>`<option value="${x.id}" data-type="gold_digital" data-unit="gram">${esc(x.name)} (${x.avail/getGoldPrice(S.cache.goldAccounts.find(a=>a.id===x.id).brand)} gr)</option>`).join('');
    opts += goldPhys.map(x=>`<option value="${x.id}" data-type="gold_physical" data-unit="keping">${esc(x.name)} (1 Keping)</option>`).join('');

    modal('Alokasikan Aset', `<div class="formgrid"><div class="field full"><label>Sumber Kekayaan</label><select id="x_source" class="input">${opts}</select></div>${f('Nominal Alokasi (Rp atau Gram)','x_amount','number')}</div><div class="info small">Masukkan angka nominal Rp jika memilih Bank/Pocket. Masukkan angka gram jika memilih Emas Digital.</div>`, async()=>{
        let sel = $('#x_source'), sid = sel.value, type = sel.options[sel.selectedIndex].dataset.type, unit = sel.options[sel.selectedIndex].dataset.unit, amount = n(v('x_amount'));
        if(!sid || !amount) return toast('Lengkapi data');
        let totalAllocated = getSourceAllocated(sid), maxAvail = 0;
        if(type === 'bank') maxAvail = acct(sid).balance;
        else if(type === 'pocket') maxAvail = pocket(sid).balance;
        else if(type === 'gold_digital') { let b = S.cache.goldAccounts.find(x=>x.id===sid).brand; maxAvail = S.cache.goldAccounts.find(x=>x.id===sid).balanceGrams * getGoldPrice(b); }
        else if(type === 'gold_physical') { let b = S.cache.goldPhysical.find(x=>x.id===sid).brand; maxAvail = S.cache.goldPhysical.find(x=>x.id===sid).weight * getGoldPrice(b); }
        let currentAllocInRp = (type.includes('gold')) ? totalAllocated : totalAllocated;
        let newAllocInRp = (unit === 'gram') ? (amount * setting().globalGoldPrice) : amount;
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
    manageGoldPrices, editGlobalPrice, editBrandPrice, syncBrand, syncGlobal,
    restore:()=>$('#restoreFile').click(),
    prevMonth:()=>shift(-1), nextMonth:()=>shift(1),
    theme: async()=>{ const s=setting(); s.theme=s.theme==='dark'?'light':'dark'; await FWPDB.put('settings',s); await refresh(); },
    privacy: async()=>{ const s=setting(); s.privacy=!s.privacy; await FWPDB.put('settings',s); await refresh(); },
    finishOnboarding: async()=>{
        let s=setting();
        s={...s, onboarded:true, ownerName:v('onName')||'Kamu', budgetMode:ON.budgetMode, defaultClosing:ON.defaultClosing, surplusBehavior:v('onSurplus'), strictBalance:$('#onStrict').checked};
        await FWPDB.put('settings',s); $('#onboarding').classList.add('hidden'); await refresh();
    },
    manageOwners: manageOwners, addOwner: addOwner
};

document.addEventListener('click',async e=>{
    let t=e.target.closest('button');if(!t)return;
    if(t.dataset.page){S.page=t.dataset.page;render();return}
    
    if(t.dataset.action){
        if($('#modal').open && t.dataset.action !== 'closeModal' && !['theme','privacy','manageGoldPrices','editBrandPrice','syncBrand','editGlobalPrice','syncGlobal','manageOwners','addOwner'].includes(t.dataset.action)) closeModal();
        if (t.dataset.action === 'editBrandPrice') { await actions.editBrandPrice(t.dataset.brand); return; }
        if (t.dataset.action === 'syncBrand') { await actions.syncBrand(t.dataset.brand); return; }
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

(async()=>{await FWPDB.open();await seed();await refresh();if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{})})();