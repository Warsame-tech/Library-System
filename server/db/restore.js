// استعادة نسخة احتياطية أنشأها backup.js — تستبدل كل بيانات قاعدة البيانات الهدف
// الاستخدام:
//   npm run restore -- library-backup.sql                     إلى قاعدة البيانات المحلية (server/.env)
//   npm run restore -- library-backup.sql --url=mysql://...   إلى Railway أو أي خادم آخر
// أضف --yes للتنفيذ؛ بدونها يُعرض فقط ما سيحدث
const fs = require('fs');
const readline = require('readline');
const { connect } = require('./connect');
const { schemaStatements } = require('./init');

async function main() {
  const argv = process.argv.slice(2);
  const file = argv.find((a) => !a.startsWith('--'));
  if (!file || !fs.existsSync(file)) throw new Error('حدد مسار ملف النسخة الاحتياطية');

  const lines = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
  const iterator = lines[Symbol.asyncIterator]();
  const header = (await iterator.next()).value || '';
  const tablesLine = (await iterator.next()).value || '';
  if (!header.startsWith('-- library-backup v1') || !tablesLine.startsWith('-- tables: ')) {
    throw new Error('الملف ليس نسخة احتياطية صالحة من backup.js');
  }
  const tables = tablesLine.slice('-- tables: '.length).split(',').filter(Boolean);

  const { conn, promise } = connect(argv);
  const [[{ db, host }]] = await promise.query('SELECT DATABASE() AS db, @@hostname AS host');
  console.log(`المصدر:  ${header.slice(3)}`);
  console.log(`الهدف:   قاعدة البيانات "${db}" على ${host}`);
  console.log(`الجداول: ${tables.join(', ')}`);

  if (!argv.includes('--yes')) {
    console.log('\n⚠️  سيتم حذف كل البيانات الحالية في الهدف واستبدالها. أعد التشغيل مع --yes للتنفيذ.');
    lines.close();
    conn.end();
    return;
  }

  // إنشاء أي جداول ناقصة، ثم تفريغ الجداول وإدراج البيانات داخل معاملة واحدة
  for (const stmt of schemaStatements()) await promise.query(stmt);

  await promise.query('SET FOREIGN_KEY_CHECKS = 0');
  await promise.beginTransaction();
  try {
    for (const table of tables) await promise.query(`DELETE FROM \`${table}\``);
    let count = 0;
    for await (const line of iterator) {
      if (!line.startsWith('INSERT INTO ')) continue;
      await promise.query(line.replace(/;\s*$/, ''));
      if (++count % 50 === 0) process.stdout.write('.');
    }
    await promise.commit();
    console.log(`\n✅ تمت الاستعادة (${count} أمر إدراج)`);
  } catch (err) {
    await promise.rollback();
    throw err;
  } finally {
    await promise.query('SET FOREIGN_KEY_CHECKS = 1');
    conn.end();
  }
}

main().catch((err) => {
  console.error('❌ فشلت الاستعادة:', err.message);
  process.exit(1);
});
