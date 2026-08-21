/* ============================================================
   JulCraft work1206D — переключатель вида
   «06 · Тёплый» (style.css) <-> «12 · Мемфис» (style-memphis.css)
   + валюта отображения (plan-finances.md D-20/D-21: «Скин» → «Вид»,
   кнопки валют из /api/currency).
   Выбор скина запоминается в localStorage; выбор валюты — в localStorage
   + cookie (SSR рендерит цены в выбранной валюте); панель внизу справа.
   ============================================================ */
(function () {
  'use strict';

  var LS_KEY = 'julcraft-skin';
  var MEMPHIS = 'style-memphis.css';
  var HANDMADE = 'style.css';

  var CURRENCY_KEY = 'julcraft-currency';
  var CURRENCY_COOKIE = 'julcraft-currency';

  // Инлайн-фолбэк, если /api/currency недоступен (например, на статичном макете)
  var FALLBACK_CURRENCIES = [
    { code: 'USD', symbol: '$' },
    { code: 'UAH', symbol: '₴' },
    { code: 'RUB', symbol: '₽' },
    { code: 'EUR', symbol: '€' }
  ];

  var link = document.querySelector('link[rel="stylesheet"]');
  if (!link) return;

  var href = link.getAttribute('href') || '';
  var isMemphis = href.indexOf(MEMPHIS) !== -1;

  var memphisPath, handmadePath;
  if (isMemphis) {
    memphisPath = href;
    handmadePath = href.replace(MEMPHIS, HANDMADE);
  } else {
    handmadePath = href;
    memphisPath = href.replace(HANDMADE, MEMPHIS);
  }

  var saved = null;
  try { saved = localStorage.getItem(LS_KEY); } catch (e) {}

  if (saved === HANDMADE && isMemphis) {
    link.setAttribute('href', handmadePath);
    isMemphis = false;
  } else if (saved === MEMPHIS && !isMemphis) {
    link.setAttribute('href', memphisPath);
    isMemphis = true;
  }

  function savedCurrency() {
    var val = null;
    try { val = localStorage.getItem(CURRENCY_KEY); } catch (e) {}
    if (!val) {
      var m = document.cookie.match(new RegExp('(?:^|;\\s*)' + CURRENCY_COOKIE + '=([^;]*)'));
      if (m) val = decodeURIComponent(m[1]);
    }
    return val;
  }

  function buildBar() {
    if (document.getElementById('skin-switcher')) return;

    var bar = document.createElement('div');
    bar.id = 'skin-switcher';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Переключатель вида');
    bar.innerHTML =
      '<span class="ss-label">Вид</span>' +
      '<button type="button" data-skin="handmade">06 · Тёплый</button>' +
      '<button type="button" data-skin="memphis">12 · Мемфис</button>' +
      '<span class="ss-sep"></span>' +
      '<span class="ss-currencies"></span>';
    if (document.querySelector('.calc')) bar.classList.add('ss-above-calc');
    document.body.appendChild(bar);

    var style = document.createElement('style');
    style.textContent =
      '#skin-switcher{position:fixed;right:14px;bottom:14px;z-index:2000;display:flex;' +
      'align-items:center;gap:6px;background:#22242a;color:#faf5ec;border:3px solid #22242a;' +
      'border-radius:999px;padding:7px 12px;box-shadow:8px 8px 0 rgba(34,36,42,.35);' +
      'font-family:Nunito,Arial,sans-serif;font-size:11px;font-weight:800;letter-spacing:.06em;' +
      'text-transform:uppercase;user-select:none;flex-wrap:wrap;max-width:calc(100vw - 24px);' +
      'justify-content:flex-end;}' +
      '#skin-switcher .ss-label{color:#d8dae0;margin-right:2px;}' +
      '#skin-switcher .ss-sep{width:2px;height:18px;background:#faf5ec;opacity:.35;margin:0 2px;}' +
      '#skin-switcher button{border:2px solid #faf5ec;background:transparent;color:#faf5ec;' +
      'border-radius:999px;padding:5px 12px;font:inherit;cursor:pointer;transition:.15s;' +
      'text-transform:uppercase;font-size:10px;font-weight:800;letter-spacing:.05em;}' +
      '#skin-switcher button:hover{background:#faf5ec;color:#22242a;}' +
      '#skin-switcher button.is-on{background:#e8b64c;border-color:#e8b64c;color:#22242a;}' +
      '@media (max-width:820px){#skin-switcher{right:10px;bottom:10px;padding:6px 10px;}' +
      '#skin-switcher button{padding:4px 9px;}' +
      '#skin-switcher.ss-above-calc{bottom:96px;}}';
    document.head.appendChild(style);

    function markCurrencyButtons() {
      var current = savedCurrency();
      var buttons = bar.querySelectorAll('.ss-currencies button');
      for (var i = 0; i < buttons.length; i++) {
        if (buttons[i].getAttribute('data-currency') === current) {
          buttons[i].classList.add('is-on');
        } else {
          buttons[i].classList.remove('is-on');
        }
      }
    }

    function renderCurrencies(list) {
      var wrap = bar.querySelector('.ss-currencies');
      if (!wrap) return;
      var html = '';
      for (var i = 0; i < list.length; i++) {
        html += '<button type="button" data-currency="' + list[i].code + '"' +
          ' title="' + (list[i].symbol || '') + '">' + list[i].code + '</button>';
      }
      wrap.innerHTML = html;
      markCurrencyButtons();
    }

    function loadCurrencies() {
      try {
        fetch('/api/currency')
          .then(function (res) {
            if (!res.ok) throw new Error('bad status');
            return res.json();
          })
          .then(function (data) {
            if (data && Array.isArray(data.currencies) && data.currencies.length) {
              renderCurrencies(data.currencies);
            } else {
              renderCurrencies(FALLBACK_CURRENCIES);
            }
          })
          .catch(function () { renderCurrencies(FALLBACK_CURRENCIES); });
      } catch (e) {
        renderCurrencies(FALLBACK_CURRENCIES);
      }
    }

    function mark() {
      var buttons = bar.querySelectorAll('button[data-skin]');
      for (var i = 0; i < buttons.length; i++) {
        var b = buttons[i];
        var isMemphisBtn = b.getAttribute('data-skin') === 'memphis';
        if (isMemphisBtn === isMemphis) b.classList.add('is-on');
        else b.classList.remove('is-on');
      }
      markCurrencyButtons();
    }
    mark();

    bar.addEventListener('click', function (ev) {
      var b = ev.target && ev.target.closest ? ev.target.closest('button') : null;
      if (!b) return;
      var cur = b.getAttribute('data-currency');
      if (cur) {
        var current = savedCurrency();
        if (current === cur) return;
        try { localStorage.setItem(CURRENCY_KEY, cur); } catch (e) {}
        document.cookie = CURRENCY_COOKIE + '=' + encodeURIComponent(cur) +
          ';path=/;max-age=31536000';
        markCurrencyButtons();
        location.reload();
        return;
      }
      var wantMemphis = b.getAttribute('data-skin') === 'memphis';
      if (wantMemphis === isMemphis) return;
      link.setAttribute('href', wantMemphis ? memphisPath : handmadePath);
      isMemphis = wantMemphis;
      try { localStorage.setItem(LS_KEY, wantMemphis ? MEMPHIS : HANDMADE); } catch (e) {}
      mark();
    });

    loadCurrencies();
  }

  if (document.body) buildBar();
  else document.addEventListener('DOMContentLoaded', buildBar);
})();