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
    let def = {
        id:'main', onboarded:false, budgetMode:'simple', defaultClosing:'used',
        surplusBehavior:'ask', strictBalance:false, theme:'light', privacy:false,
        ownerName:'Kamu', goldPrice:2000000,
        goldPrices:{pegadaian:0,lastSync:null,lastSuccess:null,lastAttempt:null,lastError:null,priceSource:'auto',manualAt:null},
        palacePrices:{'24K':0,'18K':0,'9K':0,lastSync:null,lastSuccess:null,lastAttempt:null,lastError:null,priceSource:'auto',manualAt:null}
    };
    let s = S.cache.settings.find(x=>x.id==='main') || def;
    if(!s.goldPrices) s.goldPrices = {...def.goldPrices};
    if(!s.palacePrices) s.palacePrices = {...def.palacePrices};
    if(!s.goldPrices.priceSource) s.goldPrices.priceSource='auto';
    if(!s.goldPrices.lastSuccess && s.goldPrices.lastSync) s.goldPrices.lastSuccess=s.goldPrices.lastSync;
    if(!s.palacePrices.priceSource) s.palacePrices.priceSource='auto';
    if(!s.palacePrices.lastSuccess && s.palacePrices.lastSync) s.palacePrices.lastSuccess=s.palacePrices.lastSync;
    return s;
}

function getSourceStatus(src){
    const s=setting();
    if(src==='pegadaian'){
        const g=s.goldPrices||{};
        return {
            price: n(g.pegadaian),
            prices: null,
            priceSource: g.priceSource||'auto',
            lastSuccess: g.lastSuccess||null,
            lastAttempt: g.lastAttempt||null,
            lastError: g.lastError||null,
            manualAt: g.manualAt||null
        };
    }
    const p=s.palacePrices||{};
    return {
        price: n(p['24K']),
        prices: {'24K':n(p['24K']),'18K':n(p['18K']),'9K':n(p['9K'])},
        priceSource: p.priceSource||'auto',
        lastSuccess: p.lastSuccess||null,
        lastAttempt: p.lastAttempt||null,
        lastError: p.lastError||null,
        manualAt: p.manualAt||null
    };
}

function acct(id){return S.cache.accounts.find(x=>x.id===id)}
function pocket(id){return S.cache.pockets.find(x=>x.id===id)}
function goal(id){return S.cache.goals.find(x=>x.id===id)}
function source(id){return pocket(id)||acct(id)}
function sourceName(id){return source(id)?.name||'Tanpa perubahan saldo'}

function totalAccountBalance(){return S.cache.accounts.reduce((a,x)=>a+n(x.balance),0)}

function getGoldPrice(goldItem){
    const brand=String(goldItem.brand||'').toLowerCase();
    const karat=String(goldItem.karat||'').toUpperCase();
    const gp=setting().goldPrices||{};
    const pp=setting().palacePrices||{};
    if(brand.includes('palace')){
        if(karat==='24K'&&n(pp['24K'])>0) return n(pp['24K']);
        if(karat==='18K'&&n(pp['18K'])>0) return n(pp['18K']);
        if(karat==='9K' &&n(pp['9K']) >0) return n(pp['9K']);
        if(n(pp['24K'])>0) return n(pp['24K']);
    }
    if(n(gp.pegadaian)>0) return n(gp.pegadaian);
    return n(setting().goldPrice);
}

function totalGoldValue(){ 
    return S.cache.goldItems.filter(x=>x.status!=='sold').reduce((a,x)=>{
        let price = getGoldPrice(x);
        return a + (n(x.weight) * price);
    },0) 
}

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
    let months = liquid / monthlyExpense;
    return { months: months.toFixed(1), monthlyExpense, liquid };
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
function goalValue(gid){return S.cache.goalAllocations.filter(x=>x.goalId===gid&&x.status==='active').reduce((a,x)=>a+n(x.amount),0)}

function render(){renderNav();let fn={home:home,plan:planView,wealth:wealth,more:more}[S.page];$('#view').innerHTML=fn()}
function renderNav(){$$('#nav [data-page]').forEach(x=>x.classList.toggle('active',x.dataset.page===S.page))}

function home(){
    let p=plan(),ps=pstats(p),g=S.cache.goals.filter(x=>!['archived','cancelled'].includes(x.status)).sort((a,b)=>a.priority-b.priority).slice(0,3);
    let runway = getRunway();
    
    // Tampilkan realisasi jika bulan sudah closed
    let displaySurplus = ps.surplus;
    if(p && p.status==='closed' && p.closing) {
        displaySurplus = p.closing.finalAmount;
    }

    return `<div class="hero" style="background:linear-gradient(135deg,#172019,#2a3d1c)">
        <div class="eyebrow">Total Kekayaan Bersih</div>
        <h1>${money(netWorth())}</h1>
        <div style="background:rgba(255,255,255,0.1);padding:10px;border-radius:12px;margin:15px 0;display:flex;align-items:center;gap:10px">
            <span style="font-size:24px">🚀</span>
            <div>
                <small style="color:#c0c9c1;display:block">Setara Pengeluaran</small>
                <b>${runway.months} Bulan</b> <small style="color:#c0c9c1">dari aset likuid</small>
            </div>
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
        <div><div class="section"><div><h2>Tujuan Prioritas</h2><span class="muted">Nilai berasal dari alokasi saldo nyata.</span></div></div><div class="card">${g.length?g.map(goalRow).join(''):'<div class="empty">Belum ada tujuan.</div>'}</div></div>
    </div>`
}

function goalRow(g){let x=goalValue(g.id),pc=Math.min(100,x/Math.max(1,n(g.target))*100);return `<div class="row"><span style="font-size:24px">${g.icon||'🎯'}</span><div class="grow"><b>${esc(g.name)}</b><div class="progress" style="margin:6px 0"><i style="width:${pc}%"></i></div><small class="muted">${money(x)} · ${pc.toFixed(1)}%</small></div></div>`}

function planView(){
    let p=plan(),ps=pstats(p);
    let isClosed = p && p.status === 'closed';
    
    let displaySurplus = ps.surplus;
    if(isClosed && p.closing) {
        displaySurplus = p.closing.finalAmount;
    }

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
            <div>
                <button class="btn ghost" data-action="copyPlan">Salin bulan lalu</button> 
                ${isClosed 
                    ? `<span class="badge green" style="padding:10px 14px; font-size:14px;">✅ Bulan Ditutup</span>` 
                    : `<button class="btn dark" data-action="closing">Tutup Bulan</button>`}
            </div>
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

function goalsView(){return `<div class="section"><div><h2>Tujuan Keuangan</h2><span class="muted">Satu saldo dapat dialokasikan ke beberapa tujuan.</span></div><button class="btn primary" data-action="addGoal">＋ Tujuan</button></div><div class="grid three">${S.cache.goals.map(g=>{let x=goalValue(g.id),pc=Math.min(100,x/Math.max(1,n(g.target))*100);return `<div class="card"><div style="display:flex;justify-content:space-between"><span style="font-size:26px">${g.icon}</span><span class="badge ${g.status==='used'?'purple':g.status==='achieved'?'green':'blue'}">${g.status}</span></div><h3>${esc(g.name)}</h3><small class="muted">Target ${money(g.target)} · Prioritas ${g.priority}</small><div class="progress" style="margin:14px 0 7px"><i style="width:${pc}%"></i></div><b>${money(x)}</b><small class="muted"> · ${pc.toFixed(1)}%</small><div style="margin-top:14px"><button class="btn ghost" data-allocate="${g.id}">Alokasikan saldo</button> <button class="btn ghost" data-goal-status="${g.id}">Status</button></div></div>`}).join('')||'<div class="card empty">Belum ada tujuan.</div>'}</div>`}

function accountsView(){
    return `<div class="section">
        <div><h2>Rekening & Kantong</h2><span class="muted">Saldo rekening induk tidak dijumlahkan lagi dengan kantong.</span></div>
        <button class="btn primary" data-action="addInstitution">＋ Institusi</button>
    </div>
    <div class="grid two">
        ${S.cache.institutions.map(i=>`
            <div class="card">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
                    <div style="min-width:0;">
                        <b style="font-size:16px;">${esc(i.name)}</b> <span class="muted small" style="margin-left:4px;">${esc(i.type)}</span>
                    </div>
                    <div style="display:flex; gap:4px;">
                        <button class="btn ghost small" style="padding:4px 8px;" data-add-account="${i.id}">＋ Rek</button>
                        <button class="icon" style="width:28px; height:28px; font-size:14px;" data-edit-inst="${i.id}" title="Edit Institusi">✎</button>
                        <button class="icon" style="width:28px; height:28px; font-size:14px; color:var(--red);" data-del-inst="${i.id}" title="Hapus Institusi">×</button>
                    </div>
                </div>
                ${S.cache.accounts.filter(a=>a.institutionId===i.id).map(a=>{
                    let pa=S.cache.pockets.filter(p=>p.accountId===a.id),
                        alloc=pocketAllocated(a.id),
                        ua=unallocated(a);
                    return `
                        <div style="margin-top:12px; background:var(--surface-2); padding:10px; border-radius:var(--r-sm);">
                            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
                                <div style="flex:1; min-width:140px;">
                                    <b style="font-size:14px;">${esc(a.name)}</b>${a.isMain?'<span class="badge green" style="margin-left:4px; font-size:10px;">Utama</span>':''}
                                    <small class="muted" style="display:block; margin-top:2px;">Saldo: <b>${money(a.balance)}</b> · Bebas: ${money(ua)}</small>
                                </div>
                                <div style="display:flex; gap:4px;">
                                    <button class="icon" style="width:28px; height:28px; font-size:14px;" data-add-pocket="${a.id}" title="Tambah Kantong">＋</button>
                                    <button class="icon" style="width:28px; height:28px; font-size:14px;" data-edit-account="${a.id}" title="Edit Rekening">✎</button>
                                    <button class="icon" style="width:28px; height:28px; font-size:14px; color:var(--red);" data-del-account="${a.id}" title="Hapus Rekening">×</button>
                                </div>
                            </div>
                            ${ua<0?'<div class="warning small" style="margin-top:8px; padding:6px 10px;">Total kantong melebihi saldo rekening.</div>':''}
                            ${pa.map(p=>`
                                <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-top:1px solid var(--border); margin-top:8px;">
                                    <div style="flex:1; min-width:0; padding-left:10px;">
                                        <b style="font-size:13px;">↳ ${esc(p.name)}</b>
                                    </div>
                                    <div style="display:flex; align-items:center; gap:6px;">
                                        <b style="font-size:13px; margin-right:4px;">${money(p.balance)}</b>
                                        <button class="icon" style="width:24px; height:24px; font-size:12px;" data-edit-pocket="${p.id}" title="Edit Kantong">✎</button>
                                        <button class="icon" style="width:24px; height:24px; font-size:12px; color:var(--red);" data-del-pocket="${p.id}" title="Hapus Kantong">×</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }).join('') || '<div class="empty small">Belum ada rekening.</div>'}
            </div>
        `).join('')}
    </div>`;
}

function sourceCard(src, status){
    const sourceBadge = status.priceSource==='manual'
        ? `<span class="badge purple">Manual</span>`
        : status.lastSuccess ? `<span class="badge green">Auto</span>` : `<span class="badge">—</span>`;
    const info = status.lastSuccess
        ? `Terakhir: ${formatDateTime(status.lastSuccess)}`
        : 'Belum pernah diperbarui';
    const errBlock = status.lastError
        ? `<div class="warning small" style="margin-top:8px">⚠ ${esc(status.lastError.message||'Gagal')}<br><span class="muted">${formatDateTime(status.lastError.at)}</span></div>`
        : '';
    if(src==='pegadaian'){
        return `<div class="card">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
                <b>Pegadaian</b>${sourceBadge}
            </div>
            <small class="muted" style="display:block;margin-top:4px">${info}</small>
            <div style="margin-top:10px">
                <b style="font-size:clamp(16px,4vw,20px)">${status.price>0?money(status.price)+' / gr':'<span class="muted">— Belum diatur</span>'}</b>
            </div>
            ${errBlock}
        </div>`;
    }
    const p = status.prices||{'24K':0,'18K':0,'9K':0};
    const row = (k,val)=>`<div style="display:flex;justify-content:space-between;gap:8px;margin-top:4px">
        <span class="small muted">${k}</span>
        <b class="small">${val>0?money(val):'—'}</b></div>`;
    return `<div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
            <b>The Palace</b>${sourceBadge}
        </div>
        <small class="muted" style="display:block;margin-top:4px">${info}</small>
        <div style="margin-top:8px">${row('24K',p['24K'])}${row('18K',p['18K'])}${row('9K',p['9K'])}</div>
        ${errBlock}
    </div>`;
}

function goldView(){
    const peg=getSourceStatus('pegadaian');
    const pal=getSourceStatus('palace');
    return `<div class="section">
        <div><h2>Aset Emas</h2><span class="muted small">Harga acuan per gram</span></div>
        <div class="row-actions">
            <button class="btn ghost" data-action="syncGold">🔄 Sync</button>
            <button class="btn ghost" data-action="setGoldPrice">✎ Manual</button>
            <button class="btn primary" data-action="addGold">＋ Emas</button>
        </div>
    </div>
    <div class="grid two">${sourceCard('pegadaian', peg)}${sourceCard('palace', pal)}</div>
    <div class="grid three" style="margin-top:15px">
        ${S.cache.goldItems.filter(g=>g.status!=='sold').map(g=>{
            const currentPrice=getGoldPrice(g);
            const val=n(g.weight)*currentPrice;
            const profit=val-n(g.buyPrice);
            const profitPct=n(g.buyPrice)>0?(profit/n(g.buyPrice))*100:0;
            const profitColor=profit>=0?'positive':'negative';
            const brandLabel=g.brand+(g.brand==='The Palace'&&g.karat?` (${g.karat})`:'');
            return `<div class="card">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap">
                    <span class="badge orange">${esc(brandLabel)}</span>
                    <span class="badge blue" style="font-size:10px">${esc(g.owner||'Milik Sendiri')}</span>
                </div>
                <h3 style="margin:10px 0">${esc(g.name)}</h3>
                <div style="display:flex;justify-content:space-between;gap:8px">
                    <small class="muted">Beli: ${money(g.buyPrice)}</small>
                    <b>${n(g.weight)} gr</b>
                </div>
                <div style="margin-top:10px;border-top:1px solid var(--border);padding-top:10px">
                    <div style="display:flex;justify-content:space-between;gap:8px">
                        <small class="muted">Nilai Pasar</small><b>${money(val)}</b>
                    </div>
                    <div style="display:flex;justify-content:space-between;gap:8px;margin-top:4px">
                        <small class="muted">P/L</small>
                        <b class="${profitColor}">${profit>=0?'+':''}${money(profit)} <small>(${profitPct.toFixed(1)}%)</small></b>
                    </div>
                </div>
                <button class="btn dark" style="margin-top:10px;width:100%" data-sell-gold="${g.id}">Jual Emas</button>
            </div>`;
        }).join('')||'<div class="card empty" style="grid-column:1/-1">Belum ada emas tercatat.</div>'}
    </div>`;
}

function assetsView() {
    return `<div class="section">
        <div><h2>Aset Tetap</h2><span class="muted">Kendaraan, Properti, Elektronik.</span></div>
        <button class="btn primary" data-action="addAsset">＋ Aset</button>
    </div>
    <div class="grid three">
        ${S.cache.assets.map(a=>`
            <div class="card">
                <div style="display:flex;justify-content:space-between">
                    <span class="badge blue">${esc(a.category)}</span>
                    <span class="badge" style="font-size:10px">${a.owner || 'Bersama'}</span>
                </div>
                <h3 style="margin:10px 0">${esc(a.name)}</h3>
                <small class="muted">Beli: ${money(a.buyPrice)}</small>
                <div style="margin-top:10px;border-top:1px solid var(--border);padding-top:10px">
                    <small class="muted">Nilai Saat Ini</small>
                    <b style="display:block;font-size:18px">${money(a.value)}</b>
                </div>
                <button class="btn red" style="margin-top:10px;width:100%" data-del-asset="${a.id}">Hapus</button>
            </div>
        `).join('')||'<div class="card empty">Belum ada aset tetap.</div>'}
    </div>`
}

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
            <div class="row"><div class="grow"><b>Harga Emas Acuan</b><small class="muted">Manual (Fallback)</small></div><button class="btn ghost" data-action="setGoldPrice">${money(setting().goldPrice)}</button></div>
            <div class="row"><div class="grow"><b>Mode budgeting</b><small class="muted">${esc(setting().budgetMode)}</small></div><button class="btn ghost" data-action="preferences">Ubah</button></div>
        </div>
        <div class="card"><h3>Data</h3><p class="muted">Backup seluruh object store dan versi skema.</p><button class="btn dark" data-action="backup">Backup JSON</button> <button class="btn ghost" data-action="restore">Restore</button></div>
        <div class="card" style="grid-column:1/-1"><h3>Aktivitas terbaru</h3><div class="ledger">${led.length?led.map(l=>`<div class="row"><div class="grow"><b>${esc(l.label)}</b><small class="muted">${new Date(l.createdAt).toLocaleString('id-ID')} · ${esc(l.status)}</small></div><span class="amount ${n(l.amount)<0?'negative':'positive'}">${money(l.amount)}</span></div>`).join(''):'<div class="empty">Belum ada aktivitas.</div>'}</div></div>
    </div>`
}

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
    await FWPDB.put('settings',{id:'main',onboarded:false,ownerName:'Kamu',budgetMode:'simple',defaultClosing:'used',surplusBehavior:'ask',strictBalance:false,theme:'light',privacy:false,goldPrice:2000000,goldPrices:{pegadaian:0,lastSync:null},palacePrices:{'24K':0,'18K':0,'9K':0,lastSync:null}});
    for(let x of[{id:'i1',name:'Bank Jago',type:'Bank'},{id:'i2',name:'BCA',type:'Bank'},{id:'i3',name:'Tunai',type:'Dompet'}])await FWPDB.put('institutions',x)
}

async function newPlan(){modal('Buat Rencana Bulanan',f('Nama rencana','x_name','text','Rencana '+monthName(S.month)),async()=>{await FWPDB.put('plans',{id:id('pl'),month:S.month,name:v('x_name'),status:'open',createdAt:dateNow()});closeModal();await refresh();toast('Rencana dibuat')})}
async function addIncome(){let p=plan();modal('Tambah Pendapatan',`<div class="formgrid">${f('Sumber','x_name','text','Gaji')}${f('Nominal','x_amount','number','')}</div>`,async()=>{if(!v('x_name')||!n(v('x_amount')))return toast('Lengkapi data');await FWPDB.put('incomeItems',{id:id('in'),planId:p.id,name:v('x_name'),amount:n(v('x_amount'))});await ledger('plan','Tambah pendapatan rencana',n(v('x_amount')),{planId:p.id},false);closeModal();await refresh()})}
async function addPlanItem(){let p=plan();modal('Tambah Alokasi',`<div class="formgrid">${f('Nama pos','x_name')}${f('Nominal','x_amount','number')}<div class="field"><label>Kategori</label><select id="x_cat" class="input"><option>Pengeluaran Wajib</option><option>Living</option><option>Playing</option><option>Saving</option><option>Cicilan</option><option>Sosial / Zakat</option><option>Kebutuhan Anak</option><option>Sinking Fund</option><option>Lainnya</option></select></div><div class="field"><label>Rekening sumber opsional</label><select id="x_source" class="input"><option value="">Belum dipilih</option>${sourceOpts()}</select></div></div>`,async()=>{if(!v('x_name')||!n(v('x_amount')))return toast('Lengkapi data');await FWPDB.put('planItems',{id:id('pi'),planId:p.id,name:v('x_name'),amount:n(v('x_amount')),category:v('x_cat'),sourceId:v('x_source'),fundingStatus:'planned',fundingMode:'marker',createdAt:dateNow()});closeModal();await refresh()})}

async function fundItem(iid){
    let x=await FWPDB.get('planItems', iid);
    if(x.fundingStatus==='funded') return toast('Pos sudah didanai.');
    modal('Siapkan Dana',
        `<p class="muted">${esc(x.name)} · ${money(x.amount)}</p>
         <div class="field"><label>Metode</label>
           <select id="x_mode" class="input">
             <option value="marker">Hanya penanda, jangan ubah saldo</option>
             <option value="transfer">Kurangi sumber dan pindahkan ke tujuan</option>
           </select></div>
         <div class="formgrid" style="margin-top:12px">
           <div class="field"><label>Sumber</label>
             <select id="x_from" class="input"><option value="">Pilih</option>${sourceOpts(x.sourceId)}</select></div>
           <div class="field"><label>Tujuan</label>
             <select id="x_to" class="input"><option value="">Pilih</option>${sourceOpts()}</select></div>
         </div>`,
        async ()=>{
            const mode=v('x_mode'), from=v('x_from'), to=v('x_to');
            try {
                if(mode==='transfer'){
                    if(!from||!to||from===to) return toast('Pilih sumber dan tujuan berbeda');
                    let firstDone=false;
                    try {
                        await alterSource(from, -n(x.amount), 'Pendanaan pos: '+x.name,
                            {itemId:x.id, counterpart:to});
                        firstDone=true;
                        await alterSource(to, n(x.amount), 'Dana masuk pos: '+x.name,
                            {itemId:x.id, counterpart:from});
                    } catch(innerErr){
                        if(firstDone){
                            try {
                                await alterSource(from, n(x.amount),
                                    'Rollback: '+x.name, {itemId:x.id, rollback:true});
                            } catch(rbErr){ console.error('Rollback failed', rbErr); }
                        }
                        throw innerErr;
                    }
                }
                x.fundingStatus='funded'; x.fundingMode=mode; x.fundedAt=dateNow();
                await FWPDB.put('planItems', x);
                await ledger('funding','Tandai funded: '+x.name,0,{itemId:x.id,mode},false);
                closeModal(); await refresh(); toast('Pos ditandai Dana Disiapkan');
            } catch(e){ toast(e.message||'Gagal'); }
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
    modal('Alokasikan Saldo ke Tujuan',`<div class="formgrid"><div class="field"><label>Sumber saldo</label><select id="x_source" class="input">${sourceOpts()}</select></div>${f('Nominal alokasi','x_amount','number')}</div><div class="info small" style="margin-top:12px">Ini virtual earmark. Saldo tidak berpindah dan kekayaan tidak bertambah.</div>`,async()=>{
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
async function editInstitution(id) {
    let inst = S.cache.institutions.find(x=>x.id===id);
    modal('Edit Institusi', `<div class="formgrid">${f('Nama Institusi','x_name','text',inst.name)}${f('Jenis','x_type','text',inst.type)}</div>`, async()=>{
        inst.name = v('x_name'); inst.type = v('x_type');
        await FWPDB.put('institutions', inst); closeModal(); await refresh(); toast('Institusi diubah');
    });
}
async function delInstitution(id) {
    let inst = S.cache.institutions.find(x=>x.id===id);
    let accts = S.cache.accounts.filter(x=>x.institutionId===id);
    if (accts.length > 0) {
        if (!confirm(`Institusi "${inst.name}" memiliki ${accts.length} rekening. Menghapus institusi ini akan menghapus semua rekening dan kantong di dalamnya. Lanjutkan?`)) return;
        for (let a of accts) {
            let pockets = S.cache.pockets.filter(p=>p.accountId===a.id);
            for (let p of pockets) await FWPDB.del('pockets', p.id);
            await FWPDB.del('accounts', a.id);
        }
    } else {
        if (!confirm(`Hapus institusi "${inst.name}"?`)) return;
    }
    await FWPDB.del('institutions', id); await refresh(); toast('Institusi dihapus');
}

async function addAccount(iid){modal('Tambah Rekening',`<div class="formgrid">${f('Nama rekening','x_name')}${f('Saldo aktual','x_balance','number','0')}<div class="field"><label><input id="x_main" type="checkbox"> Rekening utama</label></div></div>`,async()=>{if($('#x_main').checked)for(let a of S.cache.accounts){a.isMain=false;await FWPDB.put('accounts',a)}await FWPDB.put('accounts',{id:id('a'),institutionId:iid,name:v('x_name'),balance:n(v('x_balance')),isMain:$('#x_main').checked,createdAt:dateNow()});closeModal();await refresh()})}
async function editAccount(id) {
    let acct = S.cache.accounts.find(x=>x.id===id);
    modal('Edit Rekening', `<div class="formgrid">${f('Nama Rekening','x_name','text',acct.name)}${f('Saldo Aktual','x_balance','number',acct.balance)}<div class="field full"><label><input id="x_main" type="checkbox" ${acct.isMain?'checked':''}> Jadikan Rekening Utama</label></div></div>`, async()=>{
        if($('#x_main').checked) for(let a of S.cache.accounts){ a.isMain=false; await FWPDB.put('accounts',a); }
        acct.name = v('x_name'); acct.balance = n(v('x_balance')); acct.isMain = $('#x_main').checked;
        await FWPDB.put('accounts', acct); closeModal(); await refresh(); toast('Rekening diubah');
    });
}
async function delAccount(id) {
    let acct = S.cache.accounts.find(x=>x.id===id);
    let pockets = S.cache.pockets.filter(p=>p.accountId===id);
    if (pockets.length > 0) {
        if (!confirm(`Rekening "${acct.name}" memiliki ${pockets.length} kantong. Menghapus rekening ini akan menghapus semua kantong di dalamnya. Lanjutkan?`)) return;
        for (let p of pockets) await FWPDB.del('pockets', p.id);
    } else {
        if (!confirm(`Hapus rekening "${acct.name}"?`)) return;
    }
    await FWPDB.del('accounts', id); await refresh(); toast('Rekening dihapus');
}

async function addPocket(aid){modal('Tambah Kantong',`<div class="formgrid">${f('Nama kantong','x_name')}${f('Alokasi saldo','x_balance','number','0')}</div><div class="info small">Kantong adalah bagian dari saldo rekening induk, bukan saldo tambahan.</div>`,async()=>{let a=acct(aid),amount=n(v('x_balance'));if(pocketAllocated(aid)+amount>n(a.balance))return toast('Total kantong melebihi saldo rekening');await FWPDB.put('pockets',{id:id('p'),accountId:aid,name:v('x_name'),balance:amount,createdAt:dateNow()});closeModal();await refresh()})}
async function reconcileAccount(aid){let a=acct(aid);modal('Rekonsiliasi Rekening',`${f('Saldo aktual','x_balance','number',a.balance)}<div class="warning small">Jika saldo aktual lebih kecil daripada total kantong, sistem akan memberi peringatan tetapi tidak menghapus alokasi.</div>`,async()=>{let old=n(a.balance),neu=n(v('x_balance'));a.balance=neu;await FWPDB.put('accounts',a);await ledger('reconcile','Rekonsiliasi '+a.name,neu-old,{accountId:aid,old,new:neu});closeModal();await refresh()})}

async function editPocket(pid) {
    let p = pocket(pid), a = acct(p.accountId);
    modal('Edit Kantong', `
        <div class="formgrid">
            ${f('Nama kantong','x_name','text',p.name)}
            ${f('Alokasi saldo','x_balance','number',p.balance)}
        </div>
        <div class="info small" style="margin-top:12px">Saldo kantong adalah bagian dari saldo rekening induk (${esc(a.name)}).</div>
    `, async () => {
        let newName = v('x_name');
        let neu = n(v('x_balance'));
        let other = S.cache.pockets.filter(x => x.accountId === a.id && x.id !== pid).reduce((s, x) => s + n(x.balance), 0);
        
        if (other + neu > n(a.balance)) return toast('Total alokasi kantong melebihi saldo rekening induk');
        
        let oldBalance = n(p.balance);
        p.name = newName;
        p.balance = neu;
        
        await FWPDB.put('pockets', p);
        if (oldBalance !== neu) {
            await ledger('reconcile', 'Rekonsiliasi kantong ' + p.name, 0, {pocketId: pid, old: oldBalance, new: neu}, true);
        }
        closeModal(); await refresh(); toast('Kantong diperbarui');
    });
}

async function delPocket(pid) {
    let p = pocket(pid);
    if (!confirm(`Hapus kantong "${p.name}"? Saldo ${money(p.balance)} akan kembali menjadi saldo bebas di rekening induk.`)) return;
    await FWPDB.del('pockets', pid);
    await refresh();
    toast('Kantong dihapus');
}

async function addGold(){
    modal('Tambah Emas', `<div class="formgrid">
        ${f('Nama / Keterangan','x_name','text','Cincin Emas')}
        <div class="field">
            <label>Merek</label>
            <select id="x_brand" class="input" onchange="toggleKarat()">
                <option value="Pegadaian">Pegadaian</option>
                <option value="Antam">Antam</option>
                <option value="UBS">UBS</option>
                <option value="The Palace">The Palace</option>
                <option value="Lainnya">Lainnya</option>
            </select>
        </div>
        <div class="field" id="karatField" style="display:none">
            <label>Kadar Emas</label>
            <select id="x_karat" class="input">
                <option value="24K">24K (99,9%)</option>
                <option value="18K">18K (75%)</option>
                <option value="9K">9K (37,5%)</option>
            </select>
        </div>
        ${f('Berat (Gram)','x_weight','number','1')}
        ${f('Harga Beli (Rp)','x_price','number','0')}
        <div class="field"><label>Pemilik</label><select id="x_owner" class="input"><option>Milik Sendiri</option><option>Istri</option><option>Suami</option><option>Bersama</option></select></div>
    </div>`, async()=>{
        if(!v('x_name')||!n(v('x_weight')))return toast('Lengkapi data');
        let brand = v('x_brand');
        let karat = brand === 'The Palace' ? v('x_karat') : '';
        await FWPDB.put('goldItems',{id:id('gd'),name:v('x_name'),brand:brand,karat:karat,weight:n(v('x_weight')),buyPrice:n(v('x_price')),owner:v('x_owner'),status:'active',createdAt:dateNow()});
        closeModal();await refresh();toast('Emas ditambahkan');
    });
}

window.toggleKarat = function() {
    let brand = $('#x_brand')?.value;
    let field = $('#karatField');
    if (field) {
        field.style.display = (brand === 'The Palace') ? 'grid' : 'none';
    }
};

async function fetchWithTimeout(url, opts={}, ms=12000){
    const ctrl=new AbortController();
    const timer=setTimeout(()=>ctrl.abort(), ms);
    try {
        const res=await fetch(url, {...opts, signal:ctrl.signal});
        return res;
    } finally { clearTimeout(timer); }
}
function normalizeError(e){
    if(e?.name==='AbortError') return {code:'timeout', message:'Koneksi timeout'};
    if(e?.code) return e;
    if(e instanceof TypeError) return {code:'network', message:'Tidak dapat menghubungi server'};
    return {code:'unknown', message:e?.message||'Kesalahan tidak diketahui'};
}
async function fetchPegadaian(){
    const t0=Date.now();
    try {
        const res=await fetchWithTimeout('/api/gold-price');
        if(!res.ok) throw {code:'http', message:`Server merespons HTTP ${res.status}`};
        let data;
        try { data=await res.json(); }
        catch { throw {code:'parse', message:'Respons bukan JSON valid'} }
        if(!data.success) throw {code:'source', message:data.error||'Sumber melaporkan kegagalan'};
        if(!data.pegadaian || typeof data.pegadaian!=='object')
            throw {code:'invalid', message:'Respons tidak sesuai format Pegadaian. Periksa endpoint /api/gold-price.'};
        const price=Number(data.pegadaian.jualPerGram);
        if(!Number.isFinite(price)||price<=0)
            throw {code:'invalid', message:'Data harga Pegadaian tidak ditemukan atau tidak valid'};
        return {ok:true, source:'pegadaian', label:'Pegadaian', price, durationMs:Date.now()-t0};
    } catch(e){
        return {ok:false, source:'pegadaian', label:'Pegadaian',
                error:normalizeError(e), durationMs:Date.now()-t0};
    }
}
async function fetchPalace(){
    const t0=Date.now();
    try {
        const res=await fetchWithTimeout('/api/palace-gold-price');
        if(!res.ok) throw {code:'http', message:`Server merespons HTTP ${res.status}`};
        let data;
        try { data=await res.json(); }
        catch { throw {code:'parse', message:'Respons bukan JSON valid'} }
        if(!data.success) throw {code:'source', message:data.error||'Sumber melaporkan kegagalan'};
        const p=data.palace||{};
        const prices={
            '24K':Number(p['24K'])||0,
            '18K':Number(p['18K'])||0,
            '9K' :Number(p['9K']) ||0
        };
        if(prices['24K']<=0 && prices['18K']<=0 && prices['9K']<=0)
            throw {code:'invalid', message:'Data harga The Palace kosong atau tidak valid'};
        return {ok:true, source:'palace', label:'The Palace', prices, durationMs:Date.now()-t0};
    } catch(e){
        return {ok:false, source:'palace', label:'The Palace',
                error:normalizeError(e), durationMs:Date.now()-t0};
    }
}
function applyGoldSyncResults(results){
    const s=setting();
    const now=new Date().toISOString();
    for(const r of results){
        if(r.source==='pegadaian'){
            const prev=s.goldPrices||{};
            if(r.ok){
                s.goldPrices={
                    ...prev,
                    pegadaian:r.price,
                    lastSync:now, lastSuccess:now, lastAttempt:now,
                    lastError:null,
                    priceSource:'auto',
                    manualAt:null
                };
                s.goldPrice=r.price;
            } else {
                s.goldPrices={...prev, lastAttempt:now, lastError:{...r.error, at:now}};
            }
        } else if(r.source==='palace'){
            const prev=s.palacePrices||{};
            if(r.ok){
                s.palacePrices={
                    ...prev,
                    '24K':r.prices['24K'], '18K':r.prices['18K'], '9K':r.prices['9K'],
                    lastSync:now, lastSuccess:now, lastAttempt:now,
                    lastError:null,
                    priceSource:'auto',
                    manualAt:null
                };
            } else {
                s.palacePrices={...prev, lastAttempt:now, lastError:{...r.error, at:now}};
            }
        }
    }
    return FWPDB.put('settings', s);
}
function showGoldSyncResultModal(results, beforeStatus){
    const allOk=results.every(r=>r.ok);
    const anyOk=results.some(r=>r.ok);
    const title = allOk ? '✅ Semua sumber berhasil'
                : anyOk ? '⚠️ Berhasil sebagian'
                : '❌ Semua sumber gagal';
    const rows = results.map(r=>{
        const before = beforeStatus[r.source];
        const detail = r.ok
            ? (r.source==='pegadaian'
                ? `Harga baru: <b>${money(r.price)}</b> / gram`
                : `24K <b>${money(r.prices['24K'])}</b> · 18K <b>${money(r.prices['18K'])}</b> · 9K <b>${money(r.prices['9K'])}</b>`)
            : `<span class="muted">Alasan: ${esc(r.error.message)}</span>`
              + (before?.lastSuccess
                  ? `<br><span class="small muted">Harga terakhir valid tetap digunakan (${formatDateTime(before.lastSuccess)}).</span>`
                  : `<br><span class="small muted">Belum ada harga valid tersimpan.</span>`);
        return `<div class="sync-row">
            <div class="sync-row-head">
                <span class="badge ${r.ok?'green':'red'}">${r.ok?'✅':'⚠️'} ${esc(r.label)}</span>
                <span class="small ${r.ok?'positive':'negative'}">${r.ok?'Berhasil diperbarui':'Gagal diperbarui'}</span>
            </div>
            <div class="sync-row-body">${detail}</div>
        </div>`;
    }).join('');
    modal('Hasil Update Harga Emas', `
        <div style="margin-bottom:10px"><b>${title}</b></div>
        <div>${rows}</div>
        ${!allOk ? `<div class="info small" style="margin-top:12px">💡 Coba lagi nanti, atau isi harga manual melalui tombol <b>Manual</b>.</div>` : ''}
        <div class="small muted" style="margin-top:10px">Dijalankan: ${new Date().toLocaleString('id-ID')}</div>
    `, null, {cancelLabel:'Tutup'});
}
async function syncGoldPrices(){
    const s=setting();
    const manualSources=[];
    if(s.goldPrices?.priceSource==='manual' && n(s.goldPrices?.pegadaian)>0) manualSources.push('Pegadaian');
    if(s.palacePrices?.priceSource==='manual' && n(s.palacePrices?.['24K'])>0) manualSources.push('The Palace');

    if(manualSources.length>0){
        const ok=await confirmModal('Harga Manual Akan Ditimpa',
            `<p>Harga berikut saat ini diatur manual:</p>
             <p style="margin:10px 0"><b>${manualSources.join(', ')}</b></p>
             <p class="small muted">Melanjutkan sync akan menggantinya dengan harga pasar terbaru. Harga manual sebelumnya tidak dapat dikembalikan.</p>`);
        if(!ok) return;
    }

    const beforeStatus={
        pegadaian:getSourceStatus('pegadaian'),
        palace:getSourceStatus('palace')
    };

    modal('Sinkronisasi Harga Emas',
        `<div style="text-align:center;padding:24px 10px">
            <div class="spinner"></div>
            <p style="margin-top:16px">Menghubungi sumber harga…</p>
            <p class="small muted">Pegadaian dan The Palace</p>
        </div>`, null, {cancelLabel:'Tutup'});

    const results=await Promise.all([fetchPegadaian(), fetchPalace()]);
    await applyGoldSyncResults(results);
    await refresh();
    closeModal();
    showGoldSyncResultModal(results, beforeStatus);
}

async function setGoldPrice(preselected='pegadaian'){
    const s=setting();
    const gp=s.goldPrices||{};
    const pp=s.palacePrices||{};

    const buildFields=src=>src==='pegadaian'
        ? `<div id="goldPriceFields">
             <div class="field">
                 <label>Harga per Gram (Rp)</label>
                 <input class="input" id="x_pegadaian" type="text" inputmode="numeric"
                        placeholder="1.850.000" value="${esc(formatNum(gp.pegadaian||''))}">
                 <div class="small muted">Contoh: 1.850.000 atau 1850000</div>
             </div>
           </div>`
        : `<div id="goldPriceFields">
             <div class="field" style="margin-bottom:8px">
                 <label>Harga 24K / gram (Rp)</label>
                 <input class="input" id="x_palace24" type="text" inputmode="numeric"
                        placeholder="2.269.000" value="${esc(formatNum(pp['24K']||''))}">
             </div>
             <div class="field" style="margin-bottom:8px">
                 <label>Harga 18K / gram (Rp)</label>
                 <input class="input" id="x_palace18" type="text" inputmode="numeric"
                        placeholder="1.700.000" value="${esc(formatNum(pp['18K']||''))}">
             </div>
             <div class="field">
                 <label>Harga 9K / gram (Rp)</label>
                 <input class="input" id="x_palace9" type="text" inputmode="numeric"
                        placeholder="850.000" value="${esc(formatNum(pp['9K']||''))}">
             </div>
             <div class="small muted" style="margin-top:6px">Isi minimal satu kadar. Kosongkan kadar yang tidak dipakai.</div>
           </div>`;

    modal('Input Harga Manual', `
        <div class="info small" style="margin-bottom:12px">
            Harga akan ditandai <b>manual</b> dan tidak akan tertimpa sync otomatis tanpa konfirmasi.
        </div>
        <div class="field" style="margin-bottom:12px">
            <label>Sumber Harga</label>
            <div class="choice" id="goldSourceChoice" style="grid-template-columns:1fr 1fr;display:grid">
                <button type="button" data-gold-src="pegadaian" class="${preselected==='pegadaian'?'selected':''}">
                    <b>Pegadaian</b><br><span class="muted small">Harga per gram</span>
                </button>
                <button type="button" data-gold-src="palace" class="${preselected==='palace'?'selected':''}">
                    <b>The Palace</b><br><span class="muted small">Harga per kadar</span>
                </button>
            </div>
        </div>
        <div id="goldPriceFieldsContainer">${buildFields(preselected)}</div>
    `, async () => {
        const src=document.querySelector('#goldSourceChoice button.selected')?.dataset.goldSrc;
        if(!src) return toast('Pilih sumber harga');
        const now=new Date().toISOString();
        if(src==='pegadaian'){
            const price=n(v('x_pegadaian'));
            if(!price||price<=0) return toast('Harga Pegadaian harus angka > 0');
            s.goldPrices={...(s.goldPrices||{}), pegadaian:price,
                priceSource:'manual', manualAt:now,
                lastSuccess:now, lastAttempt:now, lastSync:now, lastError:null};
            s.goldPrice=price;
        } else {
            const p24=n(v('x_palace24'));
            const p18=n(v('x_palace18'));
            const p9 =n(v('x_palace9'));
            const valid24=p24>0, valid18=p18>0, valid9=p9>0;
            if(!valid24&&!valid18&&!valid9) return toast('Isi minimal satu kadar dengan harga > 0');
            s.palacePrices={...(s.palacePrices||{}),
                '24K':valid24?p24:0,
                '18K':valid18?p18:0,
                '9K' :valid9 ?p9 :0,
                priceSource:'manual', manualAt:now,
                lastSuccess:now, lastAttempt:now, lastSync:now, lastError:null};
        }
        try {
            await FWPDB.put('settings', s);
            closeModal();
            await refresh();
            toast('Harga manual tersimpan');
        } catch(e){
            toast('Gagal menyimpan: '+(e?.message||'unknown'));
        }
    });

    setTimeout(()=>{
        document.querySelectorAll('#goldSourceChoice [data-gold-src]').forEach(btn=>{
            btn.addEventListener('click', e=>{
                e.preventDefault();
                document.querySelectorAll('#goldSourceChoice button')
                    .forEach(b=>b.classList.remove('selected'));
                btn.classList.add('selected');
                const c=document.querySelector('#goldPriceFieldsContainer');
                if(c) c.innerHTML=buildFields(btn.dataset.goldSrc);
            });
        });
    }, 0);
}

async function sellGold(id) {
    let g = await FWPDB.get('goldItems', id);
    if(!g || g.status === 'sold') return;
    
    let currentPrice = getGoldPrice(g);
    
    modal('Jual Emas', `<div class="info small" style="margin-bottom:12px">Anda akan menjual <b>${esc(g.name)}</b> (${g.brand}${g.karat ? ' '+g.karat : ''}) seberat ${n(g.weight)} gram.</div>
        <div class="formgrid">
            ${f('Harga Jual Total (Rp)','x_sell_price','number', String(n(g.weight)*currentPrice))}
            <div class="field"><label>Masuk ke Rekening</label><select id="x_account" class="input">${S.cache.accounts.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></div>
        </div>`, async()=>{
            let sellPrice = n(v('x_sell_price'));
            let accId = v('x_account');
            if(!sellPrice || !accId) return toast('Lengkapi data');
            
            let profit = sellPrice - n(g.buyPrice);
            
            try {
                await alterSource(accId, sellPrice, 'Hasil Jual Emas: ' + g.name, {goldId: g.id, profit: profit});
                
                g.status = 'sold';
                g.soldPrice = sellPrice;
                g.soldProfit = profit;
                g.soldAt = dateNow();
                await FWPDB.put('goldItems', g);
                
                closeModal();
                await refresh();
                toast(`Emas terjual. ${profit >= 0 ? 'Untung' : 'Rugi'} ${money(Math.abs(profit))}`);
            } catch (e) {
                toast(e.message);
            }
        });
}

async function addAsset(){
    modal('Tambah Aset Tetap', `<div class="formgrid">
        ${f('Nama Aset','x_name','text','Motor Honda')}
        <div class="field"><label>Kategori</label><select id="x_cat" class="input"><option>Kendaraan</option><option>Properti</option><option>Elektronik</option><option>Lainnya</option></select></div>
        ${f('Harga Beli (Rp)','x_buy','number','0')}
        ${f('Nilai Saat Ini (Rp)','x_val','number','0')}
        <div class="field"><label>Pemilik</label><select id="x_owner" class="input"><option>Bersama</option><option>Suami</option><option>Istri</option></select></div>
    </div>`, async()=>{
        if(!v('x_name')||!n(v('x_val')))return toast('Lengkapi data');
        await FWPDB.put('assets',{id:id('as'),name:v('x_name'),category:v('x_cat'),buyPrice:n(v('x_buy')),value:n(v('x_val')),owner:v('x_owner'),createdAt:dateNow()});
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

async function transfer(){
    modal('Transfer Saldo',
        `<div class="formgrid">
            <div class="field"><label>Dari</label><select id="x_from" class="input">${sourceOpts()}</select></div>
            <div class="field"><label>Ke</label><select id="x_to" class="input">${sourceOpts()}</select></div>
            ${f('Nominal','x_amount','number')}
        </div>`,
        async ()=>{
            const from=v('x_from'), to=v('x_to'), a=n(v('x_amount'));
            if(!from||!to||from===to||!a) return toast('Lengkapi transfer');
            try {
                let firstDone=false;
                try {
                    await alterSource(from,-a,'Transfer keluar',{counterpart:to});
                    firstDone=true;
                    await alterSource(to,a,'Transfer masuk',{counterpart:from});
                } catch(innerErr){
                    if(firstDone){
                        try {
                            await alterSource(from,a,'Rollback transfer',
                                {counterpart:to, rollback:true});
                        } catch(rbErr){ console.error('Rollback failed', rbErr); }
                    }
                    throw innerErr;
                }
                closeModal(); await refresh(); toast('Transfer tercatat');
            } catch(e){ toast(e.message); }
        });
}

// === REVISI UX TUTUP BULAN & UPDATE TARGET DINAMIS ===
window.recalcClosing = function() {
    let p=plan(); if(!p) return;
    let ps=pstats(p), it=items(p.id);
    let totalActual = 0;
    
    it.forEach(x => {
        let act = n(v('act_' + x.id));
        totalActual += act;
        
        let diff = x.amount - act;
        let statusEl = document.getElementById('status_' + x.id);
        if (statusEl) {
            if (diff > 0) statusEl.innerHTML = `<span class="positive">Sisa ${money(diff)}</span>`;
            else if (diff < 0) statusEl.innerHTML = `<span class="negative">Boncos ${money(Math.abs(diff))}</span>`;
            else statusEl.innerHTML = `<span class="muted">Pas</span>`;
        }
    });
    
    let netCash = ps.income - totalActual;
    
    let sumActualEl = document.getElementById('sum_actual');
    if (sumActualEl) sumActualEl.textContent = money(totalActual);
    
    let sumNetEl = document.getElementById('sum_net');
    if (sumNetEl) {
        sumNetEl.textContent = money(netCash);
        sumNetEl.className = netCash < 0 ? 'negative' : 'positive';
    }
    
    let actionSelect = document.getElementById('x_action');
    if (actionSelect) {
        let currentVal = actionSelect.value;
        let isCurrentlyDeficit = currentVal && currentVal.startsWith('deficit');
        let shouldBeDeficit = netCash < 0;
        
        if (isCurrentlyDeficit !== shouldBeDeficit) {
            let optionsHtml = shouldBeDeficit 
                ? '<option value="">-- Pilih Tindakan --</option><option value="deficit_carry">Bawa minus ke bulan berikutnya</option><option value="deficit_source">Tutup minus dari Rekening</option><option value="record_only">Catat tanpa ubah saldo</option>'
                : '<option value="">-- Pilih Tindakan --</option><option value="goal">Alokasikan ke Tujuan</option><option value="carry">Bawa sebagai Saldo Awal (Bulan Depan)</option><option value="main">Masukkan ke Rekening</option><option value="stay">Tetap tanpa perubahan saldo</option>';
            actionSelect.innerHTML = optionsHtml;
            // Jika tadi sudah pilih, pilihan akan reset ke kosong saat berubah tipe surplus/defisit
        }
    }
};

window.updateClosingTarget = function() {
    let action = v('x_action');
    let wrap = document.getElementById('target_wrap');
    let sel = document.getElementById('x_target');
    if (!wrap || !sel) return;

    if (action === 'goal') {
        wrap.style.display = 'block';
        sel.innerHTML = '<option value="">-- Pilih Tujuan --</option>' + S.cache.goals.map(g=>`<option value="g:${g.id}">${esc(g.name)}</option>`).join('');
    } else if (action === 'main' || action === 'deficit_source') {
        wrap.style.display = 'block';
        sel.innerHTML = '<option value="">-- Pilih Rekening --</option>' + [...S.cache.accounts,...S.cache.pockets].map(x=>`<option value="s:${x.id}">${esc(x.name)}</option>`).join('');
    } else {
        wrap.style.display = 'none';
        sel.innerHTML = '';
    }
};

async function closing(){
    let p=plan(),ps=pstats(p),set=setting(),it=items(p.id);
    
    // Generate Rows
    let rows = set.budgetMode==='simple' 
        ? '<div class="info">Mode Ringkas: seluruh alokasi dianggap terpakai. Kamu hanya perlu menangani Sisa Rencana atau Minus.</div>' 
        : `
          <div class="sticky-summary">
              <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                  <span class="muted small">Total Rencana</span>
                  <b id="sum_plan" class="small">${money(ps.alloc)}</b>
              </div>
              <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                  <span class="muted small">Total Aktual</span>
                  <b id="sum_actual" class="small">${money(ps.alloc)}</b>
              </div>
              <div style="display:flex; justify-content:space-between; border-top:1px dashed var(--border); padding-top:8px;">
                  <span style="font-weight:800; font-size:14px;">Kas Bersih (Sisa)</span>
                  <b id="sum_net" style="font-size:14px;" class="${ps.surplus<0?'negative':'positive'}">${money(ps.surplus)}</b>
              </div>
          </div>
          <div class="info small" style="margin-bottom:12px">Masukkan uang yang <b>aktual terpakai</b>. Kolom sudah otomatis terisi sesuai Rencana.</div>
          ` + it.map(x=>`
            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:12px 0; border-bottom:1px solid var(--border);">
                <div style="flex:1; min-width:0;">
                    <b style="display:block; font-size:14px; line-height:1.3; word-break:break-word;">${esc(x.name)}</b>
                    <small class="muted">Plan: ${money(x.amount)}</small>
                    <div id="status_${x.id}" class="small" style="margin-top:4px;"></div>
                </div>
                <div style="width:140px; flex-shrink:0;">
                    <input class="input" id="act_${x.id}" type="text" inputmode="numeric" value="${formatNum(x.amount)}" placeholder="Aktual" style="padding:8px 10px; min-height:36px; font-size:14px; text-align:right;">
                </div>
            </div>
          `).join('');
    
    let isInitialDeficit = ps.surplus < 0;
    let optionsHtml = isInitialDeficit 
        ? '<option value="">-- Pilih Tindakan --</option><option value="deficit_carry">Bawa minus ke bulan berikutnya</option><option value="deficit_source">Tutup minus dari Rekening</option><option value="record_only">Catat tanpa ubah saldo</option>'
        : '<option value="">-- Pilih Tindakan --</option><option value="goal">Alokasikan ke Tujuan</option><option value="carry">Bawa sebagai Saldo Awal (Bulan Depan)</option><option value="main">Masukkan ke Rekening</option><option value="stay">Tetap tanpa perubahan saldo</option>';

    modal('Tutup Bulan', `
        ${rows}
        <div class="formgrid" style="margin-top:13px">
            <div class="field full">
                <label>Tindakan</label>
                <select id="x_action" class="input" onchange="updateClosingTarget()">${optionsHtml}</select>
            </div>
            <div class="field full" id="target_wrap" style="display:none;">
                <label>Tujuan/Rekening</label>
                <select id="x_target" class="input"></select>
            </div>
        </div>
    `, async()=>{
        let totalActual=0;
        if(set.budgetMode!=='simple') {
            it.forEach(x => totalActual += n(v('act_'+x.id)));
        } else {
            totalActual = ps.alloc;
        }
        
        let closeAmount = ps.income - totalActual;
        let action = v('x_action'), target = v('x_target');
        
        if(!action) return toast('Pilih tindakan terlebih dahulu');
        if(action==='goal' && !target.startsWith('g:')) return toast('Pilih tujuan terlebih dahulu');
        if((action==='main' || action==='deficit_source') && !target.startsWith('s:')) return toast('Pilih rekening terlebih dahulu');
        
        p.status='closed'; p.closedAt=dateNow(); 
        p.closing={
            plannedIncome: ps.income,
            plannedAlloc: ps.alloc,
            totalActual: totalActual,
            finalAmount: closeAmount,
            action, target
        };
        await FWPDB.put('plans',p);
        
        let next=new Date(S.month+'-01'); next.setMonth(next.getMonth()+1); let nextMonth=next.toISOString().slice(0,7);
        
        if(action==='carry'||action==='deficit_carry'){
            let np=S.cache.plans.find(x=>x.month===nextMonth);
            if(!np){np={id:id('pl'),month:nextMonth,name:'Rencana '+monthName(nextMonth),status:'open',createdAt:dateNow()};await FWPDB.put('plans',np)}
            
            // Simpan dengan nama yang lebih jelas
            let nextIncomeName = closeAmount >= 0 ? 'Sisa Bulan Lalu (Carry Forward)' : 'Defisit Bulan Lalu';
            await FWPDB.put('incomeItems',{id:id('in'),planId:np.id,name:nextIncomeName,amount:closeAmount})
        }else if(action==='goal'&&target.startsWith('g:')){
            let gid=target.slice(2),main=S.cache.accounts.find(x=>x.isMain);
            if(main&&closeAmount>0)await FWPDB.put('goalAllocations',{id:id('ga'),goalId:gid,sourceType:'account',sourceId:main.id,amount:closeAmount,status:'active',createdAt:dateNow()})
        }else if((action==='main'||action==='deficit_source')&&target.startsWith('s:')){
            await alterSource(target.slice(2),closeAmount,action==='main'?'Sisa tutup bulan':'Penutup defisit',{planId:p.id})
        }
        await ledger('closing','Tutup bulan '+monthName(S.month),closeAmount,{planId:p.id,action,target},false);
        closeModal();await refresh();toast('Bulan ditutup')
    });

    setTimeout(() => {
        if(set.budgetMode !== 'simple') recalcClosing();
        updateClosingTarget();
    }, 10);
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
    closeModal, quickAdd, newPlan, addIncome, addPlanItem, addGoal, addInstitution,
    transfer, closing, copyPlan, preferences, backup,
    addGold, addAsset, addDebt,
    setGoldPrice: ()=>setGoldPrice('pegadaian'),
    syncGold: syncGoldPrices,
    restore:()=>$('#restoreFile').click(),
    prevMonth:()=>shift(-1), nextMonth:()=>shift(1),
    theme: async()=>{ const s=setting(); s.theme=s.theme==='dark'?'light':'dark';
        await FWPDB.put('settings',s); await refresh(); },
    privacy: async()=>{ const s=setting(); s.privacy=!s.privacy;
        await FWPDB.put('settings',s); await refresh(); },
    finishOnboarding: async()=>{
        let s=setting();
        s={...s, onboarded:true, ownerName:v('onName')||'Kamu',
           budgetMode:ON.budgetMode, defaultClosing:ON.defaultClosing,
           surplusBehavior:v('onSurplus'), strictBalance:$('#onStrict').checked};
        await FWPDB.put('settings',s);
        $('#onboarding').classList.add('hidden');
        await refresh();
    }
};

document.addEventListener('click',async e=>{
    let t=e.target.closest('button');if(!t)return;
    if(t.dataset.page){S.page=t.dataset.page;render();return}
    if(t.dataset.action){
        if($('#modal').open&&t.dataset.action!=='closeModal'&&!['theme','privacy','syncGold','setGoldPrice'].includes(t.dataset.action))closeModal();
        await actions[t.dataset.action]?.();return
    }
    if(t.dataset.wealth){S.wealth=t.dataset.wealth;render();return}
    
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
    
    if(t.dataset.sellGold) return sellGold(t.dataset.sellGold);
    
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
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    document.body.classList.add('keyboard-open');
  }
});

document.addEventListener('focusout', (e) => {
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    setTimeout(() => {
      const active = document.activeElement;
      if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA' && active.tagName !== 'SELECT')) {
        document.body.classList.remove('keyboard-open');
      }
    }, 50);
  }
});

(async()=>{await FWPDB.open();await seed();await refresh();if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{})})();