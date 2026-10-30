// In-browser SQL runner. Turns every .sqlrun block into an editor with Run / Reset / Tables.
// SQLite (via sql.js, WebAssembly) is downloaded only when you first press Run.
(function () {
  const here = document.currentScript.src.replace(/runner\.js.*$/, '');
  let ready = null;
  function load() {
    if (ready) return ready;
    ready = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = here + 'sql-wasm.js';
      s.onload = () => window.initSqlJs({ locateFile: (f) => here + f }).then(res, rej);
      s.onerror = () => rej(new Error('Could not download the SQL engine. Check your connection and try again.'));
      document.head.appendChild(s);
    });
    ready.catch(() => { ready = null; });
    return ready;
  }
  const esc = (v) => String(v).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const cell = (v) => (v === null ? '<span class="null">NULL</span>' : typeof v === 'number' && !Number.isInteger(v) ? esc(+v.toFixed(4)) : esc(v));
  function table(r, max = 60) {
    const rows = r.values.slice(0, max);
    return `<div class="tbl"><table><tr>${r.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>${rows.map((row) => `<tr>${row.map((v) => `<td${typeof v === 'number' ? ' class="num"' : ''}>${cell(v)}</td>`).join('')}</tr>`).join('')}</table></div>` +
      `<p class="sqlmeta">${r.values.length} row${r.values.length === 1 ? '' : 's'}${r.values.length > max ? ` (showing ${max})` : ''}</p>`;
  }
  function hint(msg) {
    if (/no such column/i.test(msg)) return 'Check the column name, or whether you used an alias in WHERE (aliases from SELECT are not visible there).';
    if (/misuse of window function/i.test(msg)) return 'Window functions cannot go in WHERE, GROUP BY or HAVING. Compute them in a CTE or subquery, then filter outside.';
    if (/misuse of aggregate/i.test(msg)) return 'Aggregates (SUM, COUNT…) cannot go in WHERE. Use HAVING, or aggregate in a CTE first.';
    if (/no such function/i.test(msg)) return 'This runner uses SQLite. Dates: date(), strftime(), julianday(). No DATEDIFF / DATE_TRUNC here.';
    if (/no such table/i.test(msg)) return 'Press "Tables" to see which tables this database has.';
    return '';
  }
  async function exec(db, sql) {
    const SQL = await load();
    const d = new SQL.Database();
    try { d.exec(window.SQLDATA[db].sql); return d.exec(sql); } finally { d.close(); }
  }
  function mount(box) {
    const ta = box.querySelector('textarea');
    const db = box.dataset.db, original = ta.value;
    const size = () => { ta.rows = Math.max(3, ta.value.split('\n').length); };
    size(); ta.addEventListener('input', size);
    ta.setAttribute('spellcheck', 'false'); ta.setAttribute('autocapitalize', 'off'); ta.setAttribute('autocomplete', 'off');
    const bar = document.createElement('div'); bar.className = 'sqlbar';
    bar.innerHTML = `<span class="sqltag">SQL · try it · <b>${esc(db)}</b> database</span><span class="sqlbtns"><button type="button" class="btn solid" data-a="run">▶ Run</button><button type="button" class="btn" data-a="tables">Tables</button><button type="button" class="btn" data-a="reset">Reset</button></span>`;
    box.insertBefore(bar, ta);
    const out = document.createElement('div'); out.className = 'sqlout'; out.setAttribute('aria-live', 'polite'); box.appendChild(out);
    const run = async () => {
      out.innerHTML = '<p class="sqlmeta">Running…</p>';
      try {
        const res = await exec(db, ta.value);
        out.innerHTML = res.length ? res.map((r) => table(r)).join('') : '<p class="sqlmeta">Done. The query returned no rows.</p>';
      } catch (e) {
        const h = hint(e.message || '');
        out.innerHTML = `<p class="sqlerr">${esc(e.message || e)}</p>${h ? `<p class="sqlmeta">Tip: ${esc(h)}</p>` : ''}`;
      }
    };
    bar.addEventListener('click', async (e) => {
      const a = e.target.closest('button') && e.target.closest('button').dataset.a;
      if (a === 'run') run();
      if (a === 'reset') { ta.value = original; size(); out.innerHTML = ''; }
      if (a === 'tables') {
        out.innerHTML = '<p class="sqlmeta">Loading tables…</p>';
        try {
          const names = (await exec(db, "SELECT name FROM sqlite_master WHERE type='table' ORDER BY rowid"))[0].values.map((v) => v[0]);
          const all = await exec(db, names.map((n) => `SELECT * FROM ${n};`).join('\n'));
          out.innerHTML = `<p class="sqlmeta">${esc(window.SQLDATA[db].about)}</p>` + all.map((r, i) => `<p class="sqltname">${esc(names[i])}</p>${table(r, 100)}`).join('');
        } catch (err) { out.innerHTML = `<p class="sqlerr">${esc(err.message || err)}</p>`; }
      }
    });
    ta.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); } });
  }
  function boot() { document.querySelectorAll('.sqlrun[data-db]').forEach(mount); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
