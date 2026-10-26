// ⚠️ TEMPEL API KEY JINA AI KAMU DI BAWAH INI
const JINA_API_KEY = "jina_8031995113c14e0b8255c19db0e174ffABMAKO5dH2ak8-vhhJi1nu8WwjX7"; 

export default async function handler(req, res) {
  const headers = {
    'Authorization': `Bearer ${JINA_API_KEY}`,
    'Accept': 'text/plain'
  };

  const fetchScrape = async (url) => {
    try {
      const res = await fetch(`https://r.jina.ai/${url}`, { headers, timeout: 15000 });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      console.error(`Gagal scrape ${url}:`, e.message);
      return null;
    }
  };

  try {
    // Jalankan ke-4 scraper secara paralel agar cepat
    const [antamTxt, pegadaianTxt, ubsTxt, galeriTxt] = await Promise.all([
      fetchScrape("https://hargaemas.com"),
      fetchScrape("https://digital.pegadaian.co.id/"),
      fetchScrape("https://ubslifestyle.com/harga-buyback-hari-ini/"),
      fetchScrape("https://galeri24.co.id/harga-emas")
    ]);

    let results = { antam: null, pegadaian: null, ubs: null, galeri24: null };

    // 1. ANTAM (hargaemas.com)
    if (antamTxt) {
      const matchJual = antamTxt.match(/Jual\s*Rp\s*([\d\.]+)/i);
      const matchBeli = antamTxt.match(/Beli\s*Rp\s*([\d\.]+)/i);
      if (matchJual || matchBeli) {
        results.antam = {
          sell: matchJual ? parseInt(matchJual[1].replace(/\./g, '')) : 0,
          buyback: matchBeli ? parseInt(matchBeli[1].replace(/\./g, '')) : 0
        };
      }
    }

    // 2. PEGADAIAN (Harga per 0.01 gram, dikali 100)
    if (pegadaianTxt) {
      const matchPeg = pegadaianTxt.match(/Rp\s?([0-9]{1,3}(?:\.[0-9]{3})+)\s*\/\s*(?:0\s*0?1|0,01)\s*gr\s*\[Jual Emas\]/i);
      if (matchPeg) {
        const pricePer001 = parseInt(matchPeg[1].replace(/\./g, ''));
        results.pegadaian = { buyback: pricePer001 * 100 };
      }
    }

    // 3. UBS (Cari baris yang ada "1 Gram")
    if (ubsTxt) {
      // Regex mencari "1 Gram" diikuti angka besar
      const matchUbs = ubsTxt.match(/1\s*Gram[\s\S]*?Rp\s*([\d\.]+)/i);
      if (matchUbs) {
        results.ubs = { buyback: parseInt(matchUbs[1].replace(/\./g, '')) };
      }
    }

    // 4. GALERI 24
    if (galeriTxt) {
      // Cari kata "ANTAM" lalu ambil angka Rupiah pertama setelahnya
      const matchGal = galeriTxt.match(/ANTAM[\s\S]*?Rp\s*([\d\.]+)/i);
      if (matchGal) {
        results.galeri24 = { buyback: parseInt(matchGal[1].replace(/\./g, '')) };
      }
    }

    return res.status(200).json({ success: true, data: results });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}