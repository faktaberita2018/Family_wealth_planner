export default async function handler(req, res) {
  try {
    // Menggunakan API open-source terpercaya untuk harga Logam Mulia (Antam)
    const response = await fetch('https://logam-mulia-api.iamutaki.workers.dev/api/prices/logammulia');
    if (!response.ok) throw new Error('Gagal menghubungi server harga global');
    
    const data = await response.json();
    let price = 0;

    if (data && data.data && data.data.length > 0) {
      // Cari emas Antam berat 1 gram sebagai acuan standar
      const antam = data.data.find(x => x.material === 'Emas' && x.weight === 1);
      if (antam) {
        price = antam.price;
      } else {
        price = data.data[0].price; // Fallback ke item pertama
      }
    }

    if (price > 0) {
      return res.status(200).json({ success: true, price });
    }
    throw new Error('Format data dari sumber tidak valid');
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}