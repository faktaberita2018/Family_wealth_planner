// Gold Market Center UI enhancement. Loaded after app.js to avoid changing existing features.
(() => {
  const originalGoldView = goldView;
  const state = {area:'assets', filter:'all', sort:'purchase'};
  const spread = p => { const a=n(p.purchasePrice),b=n(p.buybackPrice); return a>0&&b>0?{amount:a-b,percent:(a-b)/a*100}:{amount:0,percent:null}; };
  const status = p => {
    const a=n(p.purchasePrice),b=n(p.buybackPrice),age=p.lastSuccess?Date.now()-new Date(p.lastSuccess).getTime():Infinity;
    if(!a&&!b)return ['Unavailable','gray']; if(!a||!b)return ['Partial','purple'];
    return p.status==='success'&&age<=10800000?['Fresh','green']:['Stale','yellow'];
  };
  const allRows = () => GOLD_PROVIDER_CATALOG.map(c=>({...c,...(GoldMarket.provider(c.id)||{}),id:c.id,name:c.name,category:c.category}));
  function rows(){
    let x=allRows().filter(p=>state.filter==='all'||p.category===state.filter);
    return x.sort((a,b)=>state.sort==='buyback'?n(b.buybackPrice)-n(a.buybackPrice):state.sort==='spread'?(spread(a).percent??Infinity)-(spread(b).percent??Infinity):state.sort==='latest'?new Date(b.lastSuccess||0)-new Date(a.lastSuccess||0):state.sort==='name'?a.name.localeCompare(b.name,'id'):(n(a.purchasePrice)||Infinity)-(n(b.purchasePrice)||Infinity));
  }
  function detail(id){
    const c=GoldMarket.catalog(id),p=GoldMarket.provider(id)||c,s=spread(p),st=status(p);
    modal(c.name,`<div class="gm-detail"><div class="split"><span>Kategori</span><b>${c.category==='digital'?'Digital':'Fisik / LM'}</b></div><div class="split"><span>Status</span><span class="badge ${st[1]}">${st[0]}</span></div><div class="split"><span>Harga Beli</span><b>${n(p.purchasePrice)?money(p.purchasePrice)+'/gram':'—'}</b></div><div class="split"><span>Buyback</span><b>${n(p.buybackPrice)?money(p.buybackPrice)+'/gram':'—'}</b></div><div class="split"><span>Spread</span><b>${s.percent===null?'—':money(s.amount)+' · '+s.percent.toFixed(2)+'%'}</b></div><div class="split"><span>Data valid terakhir</span><b>${p.lastSuccess?formatDateTime(p.lastSuccess)+' WIB':'—'}</b></div>${p.lastError?`<div class="warning small">${esc(p.lastError)}</div>`:''}${p.sourceUrl?`<a class="btn ghost gm-source" href="${esc(p.sourceUrl)}" target="_blank" rel="noopener noreferrer">Buka Sumber Harga</a>`:''}</div>`,null,{cancelLabel:'Tutup'});
  }
  function market(){
    const all=allRows(),buys=all.filter(p=>n(p.purchasePrice)>0).sort((a,b)=>n(a.purchasePrice)-n(b.purchasePrice)),backs=all.filter(p=>n(p.buybackPrice)>0).sort((a,b)=>n(b.buybackPrice)-n(a.buybackPrice)),spreads=all.filter(p=>spread(p).percent!==null).sort((a,b)=>spread(a).percent-spread(b).percent),fresh=all.filter(p=>status(p)[0]==='Fresh').length;
    const hi=(label,p,val)=>`<div class="card gm-hi"><small class="muted">${label}</small><b>${p?esc(p.name):'Belum tersedia'}</b><strong>${p?val:'—'}</strong></div>`;
    const cards=rows().map(p=>{const s=spread(p),st=status(p);return `<article class="card gm-card"><div class="gm-head"><div><b>${esc(p.name)}</b><small class="muted">${p.category==='digital'?'Digital':'Fisik / LM'}</small></div><span class="badge ${st[1]}">${st[0]}</span></div><div class="gm-prices"><div><small>Harga Beli</small><b>${n(p.purchasePrice)?money(p.purchasePrice)+'/gr':'—'}</b></div><div><small>Buyback</small><b>${n(p.buybackPrice)?money(p.buybackPrice)+'/gr':'—'}</b></div></div><div class="split"><small class="muted">Spread</small><b>${s.percent===null?'—':money(s.amount)+' · '+s.percent.toFixed(2)+'%'}</b></div><small class="muted">Diperbarui: ${p.lastSuccess?formatDateTime(p.lastSuccess)+' WIB':'Belum tersedia'}</small><button class="btn ghost gm-full" data-gm-detail="${p.id}">Lihat Detail</button></article>`}).join('');
    const meta=GoldMarket.meta();
    return `<div class="section"><div><h2>Gold Market Center</h2><span class="muted small">${meta?.lastFetchError?'Pembaruan gagal. Data valid sebelumnya tetap digunakan.':meta?.lastFetchSuccess?'Data diterima '+formatDateTime(meta.lastFetchSuccess)+' WIB':'Harga belum pernah disinkronkan.'}</span></div><button class="btn primary" data-action="syncGoldMarket">🔄 Perbarui Harga</button></div>${meta?.lastFetchError?`<div class="warning small">${esc(meta.lastFetchError)}<br>Harga valid terakhir tidak dihapus.</div>`:''}<div class="grid four gm-highlights">${hi('Harga Beli Terendah',buys[0],buys[0]?money(buys[0].purchasePrice)+'/gr':'')}${hi('Buyback Tertinggi',backs[0],backs[0]?money(backs[0].buybackPrice)+'/gr':'')}${hi('Spread Terendah',spreads[0],spreads[0]?spread(spreads[0]).percent.toFixed(2)+'%':'')}<div class="card gm-hi"><small class="muted">Ketersediaan</small><b>${all.filter(p=>status(p)[0]!=='Unavailable').length} dari ${all.length} provider</b><strong>${fresh} Fresh</strong></div></div><div class="card gm-controls"><div class="tabs gm-filter-tabs"><button class="tab ${state.filter==='all'?'active':''}" data-gm-filter="all">Semua</button><button class="tab ${state.filter==='digital'?'active':''}" data-gm-filter="digital">Digital</button><button class="tab ${state.filter==='physical'?'active':''}" data-gm-filter="physical">Fisik / LM</button></div><select class="input" data-gm-sort><option value="purchase">Harga beli terendah</option><option value="buyback">Buyback tertinggi</option><option value="spread">Spread terendah</option><option value="latest">Pembaruan terbaru</option><option value="name">Nama provider</option></select></div><div class="grid three">${cards}</div>`;
  }
  goldView = function(){
    const tabs=`<div class="gm-area" role="tablist"><button class="tab ${state.area==='assets'?'active':''}" data-gm-area="assets">Aset Saya</button><button class="tab ${state.area==='market'?'active':''}" data-gm-area="market">Gold Market</button></div>`;
    return tabs+(state.area==='market'?market():originalGoldView());
  };
  document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.gmArea){state.area=b.dataset.gmArea;render()}else if(b.dataset.gmFilter){state.filter=b.dataset.gmFilter;render()}else if(b.dataset.gmDetail)detail(b.dataset.gmDetail)},true);
  document.addEventListener('change',e=>{if(e.target.matches('[data-gm-sort]')){state.sort=e.target.value;render()}},true);
})();
