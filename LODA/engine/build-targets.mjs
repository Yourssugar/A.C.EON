/* Сборка бандла целей с OEIS. Запускать локально, нужен интернет.
   В песочнице ассистента доступа к oeis.org нет, поэтому скрипт не проверялся
   там на живой сети: прогони у себя и глянь первые строки результата.

   Что делает: берёт список A-номеров (файл ids.txt, по одному в строке),
   тянет по каждому JSON с OEIS, вынимает offset и термы, пишет бандл
   в формате "Axxxxxx offset t0,t1,...", который читает targets.js.

   Запуск:
     node build-targets.mjs ids.txt oeis-targets.txt

   Про вежливость к серверу: между запросами стоит пауза. Не убирай её,
   OEIS отдаёт данные бесплатно, заваливать его частыми запросами нельзя.
   Для больших списков лучше один раз скачать общий файл stripped с oeis.org
   и парсить его локально через LodaTargets.parseStripped, а offset брать
   из b-файлов. Этот скрипт удобен для аккуратного среднего списка. */

import { readFile, writeFile } from 'node:fs/promises';

const PAUSE_MS = 1500; // пауза между запросами к OEIS
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchSequence(id){
  const url = `https://oeis.org/search?q=id:${id}&fmt=json`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if(!res.ok) throw new Error(`${id}: HTTP ${res.status}`);
  const json = await res.json();
  const rec = json && json.results && json.results[0];
  if(!rec) throw new Error(`${id}: не найдено`);
  // offset в OEIS это пара чисел "a,b"; нужен первый: индекс первого терма
  const offset = Number(String(rec.offset).split(',')[0]);
  const terms = String(rec.data).split(',').filter(x => x !== '');
  return { id: rec.number ? ('A' + String(rec.number).padStart(6, '0')) : id, offset, terms };
}

async function main(){
  const idsFile = process.argv[2] || 'ids.txt';
  const outFile = process.argv[3] || 'oeis-targets.txt';
  const raw = await readFile(idsFile, 'utf8');
  const ids = raw.split('\n').map(s => s.trim()).filter(s => /^A\d+$/.test(s));
  if(!ids.length){ console.error('В ' + idsFile + ' нет A-номеров'); process.exit(1); }

  const lines = ['# Собрано build-targets.mjs с oeis.org', '# Формат: Axxxxxx offset t0,t1,...'];
  let ok = 0, fail = 0;
  for(const id of ids){
    try {
      const s = await fetchSequence(id);
      if(s.terms.length){
        lines.push(`${s.id} ${s.offset} ${s.terms.join(',')}`);
        ok++;
        console.log('OK  ' + s.id + '  термов: ' + s.terms.length + '  offset: ' + s.offset);
      } else {
        fail++; console.log('пусто ' + id);
      }
    } catch(e){
      fail++; console.log('сбой ' + id + '  ' + e.message);
    }
    await sleep(PAUSE_MS);
  }
  await writeFile(outFile, lines.join('\n') + '\n', 'utf8');
  console.log(`\nГотово: ${ok} собрано, ${fail} мимо. Записано в ${outFile}`);
}

main().catch(e => { console.error(e); process.exit(1); });
