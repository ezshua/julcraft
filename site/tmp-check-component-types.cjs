const D = require('better-sqlite3');
const db = new D('julcraft.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(r => r.name);
console.log('tables:', tables.join(', '));
try {
  console.log('componentTypes rows:', JSON.stringify(db.prepare('SELECT * FROM componentTypes').all()));
} catch (e) {
  console.log('componentTypes read failed:', e.message);
}
db.close();
