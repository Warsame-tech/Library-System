// نسخة احتياطية كاملة لبيانات المكتبة (كل الجداول + ملفات PDF) في ملف واحد
// الاستخدام:
//   npm run backup                                   من قاعدة البيانات المحلية (server/.env)
//   npm run backup -- --url=mysql://root:PASS@HOST:PORT/railway   من Railway (الرابط العام)
//   npm run backup -- --out=D:\backups\library.sql   تحديد مكان الملف
// الملف يحتوي البيانات فقط (INSERT)؛ بنية الجداول تُنشأ من schema.sql عند الاستعادة،
// لذلك تعمل الاستعادة على MySQL أو MariaDB بأي إصدار
const fs = require('fs');
const path = require('path');
const { connect } = require('./connect');

const MAX_STATEMENT = 256 * 1024; // حجم أقصى تقريبي لكل أمر INSERT (أقل من max_allowed_packet الافتراضي)

async function main() {
  const argv = process.argv.slice(2);
  const outArg = argv.find((a) => a.startsWith('--out='));
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const outFile = path.resolve(outArg ? outArg.slice(6) : `library-backup-${stamp}.sql`);

  const { conn, promise } = connect(argv);
  const [[{ db }]] = await promise.query('SELECT DATABASE() AS db');
  const [tables] = await promise.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
  const tableNames = tables.map((t) => Object.values(t)[0]);

  const out = fs.createWriteStream(outFile, { encoding: 'utf8' });
  const write = (line) => (out.write(line + '\n') ? null : new Promise((r) => out.once('drain', r)));

  await write(`-- library-backup v1 | database: ${db} | created: ${new Date().toISOString()}`);
  await write(`-- tables: ${tableNames.join(',')}`);

  for (const table of tableNames) {
    let rows = 0;
    let batch = [];
    let batchSize = 0;
    let columns = null;

    const flush = async () => {
      if (!batch.length) return;
      await write(`INSERT INTO \`${table}\` (${columns}) VALUES ${batch.join(',')};`);
      batch = [];
      batchSize = 0;
    };

    // قراءة الصفوف كتيار (stream) كي لا يُحمَّل جدول ملفات PDF كاملاً في الذاكرة
    const stream = conn.query(`SELECT * FROM \`${table}\``).stream();
    for await (const row of stream) {
      if (!columns) columns = Object.keys(row).map((c) => `\`${c}\``).join(',');
      const values = `(${Object.values(row).map((v) => conn.escape(v)).join(',')})`;
      if (batchSize + values.length > MAX_STATEMENT) await flush();
      batch.push(values);
      batchSize += values.length;
      rows++;
    }
    await flush();
    console.log(`  ${table}: ${rows}`);
  }

  await new Promise((r) => out.end(r));
  conn.end();
  const mb = (fs.statSync(outFile).size / 1048576).toFixed(1);
  console.log(`\n✅ تم حفظ النسخة الاحتياطية (${mb} MB):\n${outFile}`);
}

main().catch((err) => {
  console.error('❌ فشل النسخ الاحتياطي:', err.message);
  process.exit(1);
});
