// Gold Market Service — cache-first, Apps Script Web App JSON, auto-sync 90 menit.
// Isi URL ini setelah Apps Script dipublikasikan sebagai Web App.
const GOLD_MARKET_API_URL = 'PASTE_APPS_SCRIPT_WEB_APP_URL_HERE';
const GOLD_MARKET_CACHE_MS = 90 * 60 * 1000;
const GOLD_MARKET_TIMEOUT_MS = 15000;

const GOLD_PROVIDER_CATALOG = Object.freeze([
  {id:'antam', name:'Antam', category:'physical'},
  {id:'ubs', name:'UBS', category:'physical'},
  {id:'galeri24', name:'Galeri24', category:'physical'},
  {id:'pegadaian', name:'Pegadaian', category:'digital'},
  {id:'hartadinata-emasku', name:'Hartadinata (Emasku)', category:'physical'},
  {id:'lotus-archi', name:'Lotus Archi', category:'physical'},
  {id:'king-halim', name:'King Halim Gold', category:'physical'},
  {id:'waris-sampoerna', name:'Waris Sampoerna', category:'physical'},
  {id:'semar-nusantara', name:'Semar Nusantara', category:'physical'},
  {id:'treasury', name:'Treasury', category:'digital'},
  {id:'pluang', name:'Pluang', category:'digital'},
  {id:'indogold', name:'IndoGold', category:'digital'},
  {id:'lakuemas', name:'Lakuemas', category:'digital'}
]);

const GOLD_DIGITAL_OPTIONS = GOLD_PROVIDER_CATALOG.filter(x=>x.category==='digital');
const GOLD_PHYSICAL_OPTIONS = GOLD_PROVIDER_CATALOG.filter(x=>x.category==='physical');
const GOLD_JEWELRY_MERCHANTS = Object.freeze([
  {id:'hartadinata', name:'Hartadinata'}, {id:'the-palace', name:'The Palace'},
  {id:'frank-co', name:'Frank & Co.'}, {id:'mondial', name:'Mondial'}
]);

const GoldMarket={
  provider(id){ return (S.cache.goldPriceProviders||[]).find(x=>x.id===id)||null; },
  catalog(id){ return GOLD_PROVIDER_CATALOG.find(x=>x.id===id)||null; },
  meta(){ return (S.cache.goldPriceMeta||[]).find(x=>x.id==='market-sync')||null; },
  configured(){ return GOLD_MARKET_API_URL && !GOLD_MARKET_API_URL.includes('PASTE_'); },
  async fetchJson(){
    if(!this.configured()) throw new Error('URL Apps Script Web App belum dikonfigurasi');
    const ctrl=new AbortController();
    const timer=setTimeout(()=>ctrl.abort(),GOLD_MARKET_TIMEOUT_MS);
    try{
      const sep=GOLD_MARKET_API_URL.includes('?')?'&':'?';
      const res=await fetch(GOLD_MARKET_API_URL+sep+'t='+Date.now(),{cache:'no-store',signal:ctrl.signal});
      if(!res.ok) throw new Error('Gold API HTTP '+res.status);
      const body=await res.json();
      if(!body||body.success!==true||!Array.isArray(body.providers)) throw new Error('Format Gold API tidak valid');
      return body;
    }finally{ clearTimeout(timer); }
  },
  normalizeProvider(x){
    const cat=this.catalog(String(x.id||''));
    if(!cat) return null;
    const purchasePrice=Number(x.purchasePrice);
    const buybackPrice=Number(x.buybackPrice);
    const status=x.status==='success'?'success':'failed';
    if(status==='success'&&(!(purchasePrice>0)||!(buybackPrice>0))) throw new Error('Harga '+cat.name+' tidak valid');
    return {id:cat.id,name:cat.name,category:x.category||cat.category,unit:x.unit||'1 Gram',
      purchasePrice:purchasePrice||0,buybackPrice:buybackPrice||0,status,
      lastSuccess:x.lastSuccess||null,lastAttempt:x.lastAttempt||null,lastError:x.lastError||'',
      sourceUrl:x.sourceUrl||'',fetchedAt:new Date().toISOString()};
  },
  async sync({manual=false}={}){
    const attempt=new Date().toISOString();
    await FWPDB.put('goldPriceMeta',{id:'market-sync',lastFetchAttempt:attempt,
      lastFetchSuccess:this.meta()?.lastFetchSuccess||null,lastFetchError:'',apiVersion:this.meta()?.apiVersion||null});
    try{
      const body=await this.fetchJson();
      let count=0;
      for(const raw of body.providers){ const row=this.normalizeProvider(raw); if(row){await FWPDB.put('goldPriceProviders',row);count++;} }
      if(!count) throw new Error('Tidak ada provider valid pada respons');
      await FWPDB.put('goldPriceMeta',{id:'market-sync',lastFetchAttempt:attempt,lastFetchSuccess:new Date().toISOString(),
        lastFetchError:'',apiVersion:body.apiVersion||'1'});
      return {ok:true,count};
    }catch(err){
      const old=await FWPDB.get('goldPriceMeta','market-sync');
      await FWPDB.put('goldPriceMeta',{id:'market-sync',lastFetchAttempt:attempt,lastFetchSuccess:old?.lastFetchSuccess||null,
        lastFetchError:err?.message||String(err),apiVersion:old?.apiVersion||null});
      throw err;
    }
  },
  async autoSync(){
    if(!this.configured()) return {ok:false,skipped:'not-configured'};
    const m=await FWPDB.get('goldPriceMeta','market-sync');
    const age=m?.lastFetchSuccess?Date.now()-new Date(m.lastFetchSuccess).getTime():Infinity;
    if(age<GOLD_MARKET_CACHE_MS) return {ok:true,skipped:'fresh-cache'};
    try{ return await this.sync(); }catch(e){ return {ok:false,error:e.message}; }
  },
  priceFor(asset,side='buyback'){
    if(!asset) return 0;
    let providerId=asset.priceProviderId||asset.providerId||asset.brandId||null;
    if(asset.priceMode==='pegadaian') providerId='pegadaian';
    if(asset.priceMode==='antam') providerId='antam';
    if(asset.priceMode==='manual') return Number(side==='purchase'?asset.manualPurchasePrice:asset.manualBuybackPrice)||0;
    if(asset.priceMode==='unvalued') return 0;
    const p=this.provider(providerId);
    if(!p) return 0;
    return Number(side==='purchase'?p.purchasePrice:p.buybackPrice)||0;
  },
  statusFor(asset){
    let providerId=asset?.priceProviderId||asset?.providerId||asset?.brandId||null;
    if(asset?.priceMode==='pegadaian') providerId='pegadaian';
    if(asset?.priceMode==='antam') providerId='antam';
    if(asset?.priceMode==='manual') return {kind:'manual',title:'Harga Manual',message:'Valuasi menggunakan harga yang Anda masukkan.'};
    if(asset?.priceMode==='unvalued') return {kind:'none',title:'Belum Dinilai',message:'Pilih harga manual atau harga acuan terlebih dahulu.'};
    const p=this.provider(providerId);
    if(!p) return {kind:'none',title:'Data Belum Tersedia',message:'Harga otomatis untuk penyedia ini belum tersedia.'};
    if(p.status==='success') return {kind:'success',title:'Data Terkini',lastSuccess:p.lastSuccess};
    if(p.lastSuccess) return {kind:'failed',title:'Data Tidak Terkini',lastAttempt:p.lastAttempt,lastSuccess:p.lastSuccess,error:p.lastError};
    return {kind:'none',title:'Data Belum Tersedia',lastAttempt:p.lastAttempt,error:p.lastError};
  }
};
