import dns from 'dns';
import https from 'https';

console.log('🧪 Probando resolución DNS para api.github.com...');
dns.lookup('api.github.com', (err, address, family) => {
    if (err) {
        console.error('❌ DNS Falló:', err);
    } else {
        console.log(`✅ DNS Correcto: ${address} (IPV${family})`);

        console.log('🧪 Probando conexión HTTPS...');
        https.get('https://api.github.com', { headers: { 'User-Agent': 'Test' } }, (res) => {
            console.log(`✅ HTTPS Status: ${res.statusCode}`);
            res.resume();
        }).on('error', (e) => {
            console.error('❌ HTTPS Falló:', e.message);
        });
    }
});
