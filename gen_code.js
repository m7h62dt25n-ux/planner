#!/usr/bin/env node
// Генератор кодов активации ONE LIFE
// Использование: node gen_code.js username [username2 ...]
// Пример: node gen_code.js nikita_g maria_k alex

const SECRET = 'ONE_LIFE_2025_7x9kQmRpWzNvBsYj';
const crypto = require('crypto');

async function genCode(username) {
  const u = username.toLowerCase().replace('@', '');
  const key = await crypto.subtle
    ? hmacBrowser(u)
    : hmacNode(u);
  return key;
}

function hmacNode(username) {
  const hmac = crypto.createHmac('sha256', SECRET);
  hmac.update(username);
  const buf = hmac.digest();
  const hex = Array.from(buf)
    .map(b => b.toString(36).toUpperCase().padStart(2, '0'))
    .join('')
    .replace(/[^A-Z0-9]/g, '');
  return 'OL-' + hex.slice(0, 6) + '-' + hex.slice(6, 14);
}

const usernames = process.argv.slice(2);
if (!usernames.length) {
  console.log('Использование: node gen_code.js <username> [username2 ...]');
  process.exit(1);
}

console.log('');
for (const u of usernames) {
  const clean = u.toLowerCase().replace('@', '');
  const code = hmacNode(clean);
  console.log(`@${clean.padEnd(24)} →  ${code}`);
}
console.log('');
