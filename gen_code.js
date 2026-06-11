#!/usr/bin/env node
// Генератор кодов активации ONE LIFE
// Использование:
//   node gen_code.js username [username2 ...]
//   node gen_code.js username --firebase https://your-app.firebaseio.com --secret YOUR_DB_SECRET
//
// С флагами --firebase и --secret: хэш кода регистрируется в Firebase.
// После этого приложение проверяет коды через Firebase, а не через HMAC-секрет.
// DATABASE SECRET: Firebase Console → Project Settings → Service Accounts → Database secrets

const crypto = require('crypto');
const https  = require('https');

const SECRET = 'ONE_LIFE_2025_7x9kQmRpWzNvBsYj';

function hmacCode(username) {
  const u = username.toLowerCase().replace('@', '');
  const hmac = crypto.createHmac('sha256', SECRET);
  hmac.update(u);
  const buf = hmac.digest();
  const hex = Array.from(buf)
    .map(b => b.toString(36).toUpperCase().padStart(2, '0'))
    .join('')
    .replace(/[^A-Z0-9]/g, '');
  return { username: u, code: 'OL-' + hex.slice(0, 6) + '-' + hex.slice(6, 14) };
}

function firebaseHash(username, code) {
  return crypto.createHash('sha256')
    .update(username.toLowerCase() + ':' + code)
    .digest('hex');
}

function firebaseWrite(dbUrl, dbSecret, hash) {
  return new Promise((resolve, reject) => {
    const url = new URL(`/codes/${hash}.json?auth=${dbSecret}`, dbUrl);
    const body = 'true';
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Content-Length': body.length },
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => res.statusCode === 200 ? resolve() : reject(new Error(`HTTP ${res.statusCode}: ${data}`)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.log('\nИспользование: node gen_code.js <username> [--firebase <url> --secret <db_secret>]\n');
    process.exit(1);
  }

  const fbIdx  = args.indexOf('--firebase');
  const secIdx = args.indexOf('--secret');
  const fbUrl  = fbIdx  !== -1 ? args[fbIdx  + 1] : null;
  const fbSec  = secIdx !== -1 ? args[secIdx + 1] : null;
  const usernames = args.filter(a => !a.startsWith('--') && a !== fbUrl && a !== fbSec);

  if (!usernames.length) { console.log('Укажи хотя бы один username'); process.exit(1); }

  const useFb = fbUrl && fbSec;
  console.log('');
  if (useFb) console.log('  Firebase: ' + fbUrl + '\n');

  for (const raw of usernames) {
    const { username, code } = hmacCode(raw);
    const hash = firebaseHash(username, code);
    let fbStatus = '';

    if (useFb) {
      try {
        await firebaseWrite(fbUrl, fbSec, hash);
        fbStatus = '  ✅ зарегистрирован в Firebase';
      } catch (e) {
        fbStatus = '  ❌ ошибка Firebase: ' + e.message;
      }
    } else {
      // Печатаем curl-команду как альтернативу
      fbStatus = '';
    }

    console.log(`  @${username.padEnd(24)} →  ${code}${fbStatus}`);

    if (!useFb) {
      console.log(`  ${''.padEnd(24)}    curl -X PUT "YOUR_DB_URL/codes/${hash}.json?auth=DB_SECRET" -d "true"`);
    }
    console.log('');
  }

  if (!useFb) {
    console.log('  💡 Для регистрации в Firebase запусти с флагами:');
    console.log('     node gen_code.js <username> --firebase https://your-app.firebaseio.com --secret YOUR_DB_SECRET\n');
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
