/* JulCraft «Вид»: skin, валюта и язык хранятся только в cookies. */
(function () {
  'use strict';

  var SKIN_COOKIE = 'julcraft-skin';
  var MEMPHIS = 'memphis';
  var HANDMADE = 'handmade';
  var CURRENCY_COOKIE = 'julcraft-currency';
  var LOCALE_COOKIE = 'julcraft-locale';

  var LOCALE_LABELS = {
    ru: { label: 'Вид', aria: 'Переключатель вида' },
    en: { label: 'View', aria: 'View switcher' },
    uk: { label: 'Вигляд', aria: 'Перемикач вигляду' }
  };

  var FALLBACK_CURRENCIES = [
    { code: 'USD', symbol: '$' },
    { code: 'UAH', symbol: '₴' },
    { code: 'EUR', symbol: '€' }
  ];

  function readCookie(name) {
    var prefix = name + '=';
    var parts = document.cookie ? document.cookie.split(';') : [];
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i].trim();
      if (part.indexOf(prefix) === 0) {
        try { return decodeURIComponent(part.slice(prefix.length)); } catch (e) { return ''; }
      }
    }
    return null;
  }

  function writeCookie(name, value) {
    document.cookie = name + '=' + encodeURIComponent(value) +
      ';path=/;max-age=31536000;samesite=lax';
  }

  function savedCurrency() {
    return readCookie(CURRENCY_COOKIE);
  }

  function savedLocale() {
    var val = readCookie(LOCALE_COOKIE);
    if (val !== 'en' && val !== 'uk') return 'ru';
    return val;
  }

  function buildBar() {
    if (document.getElementById('skin-switcher')) return;

    var bar = document.createElement('div');
    bar.id = 'skin-switcher';
    bar.setAttribute('role', 'region');
    var texts = LOCALE_LABELS[savedLocale()] || LOCALE_LABELS.ru;
    bar.setAttribute('aria-label', texts.aria);
    bar.innerHTML =
      '<span class="ss-label">' + texts.label + '</span>' +
      '<button type="button" data-skin="handmade">06 · Тёплый</button>' +
      '<button type="button" data-skin="memphis">12 · Мемфис</button>' +
      '<span class="ss-sep"></span>' +
      '<span class="ss-currencies"></span>' +
      '<span class="ss-sep"></span>' +
      '<span class="ss-locales">' +
      '<button type="button" data-locale="ru">RU</button>' +
      '<button type="button" data-locale="en">EN</button>' +
      '<button type="button" data-locale="uk">UA</button>' +
      '</span>';
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

    function markLocaleButtons() {
      var current = savedLocale();
      var buttons = bar.querySelectorAll('.ss-locales button');
      for (var i = 0; i < buttons.length; i++) {
        if (buttons[i].getAttribute('data-locale') === current) {
          buttons[i].classList.add('is-on');
        } else {
          buttons[i].classList.remove('is-on');
        }
      }
    }

    function mark() {
      var buttons = bar.querySelectorAll('button[data-skin]');
      var link = document.querySelector('link[rel="stylesheet"]');
      var href = link ? link.getAttribute('href') || '' : '';
      var isMemphis = href.indexOf('style-memphis.css') !== -1;
      for (var i = 0; i < buttons.length; i++) {
        var button = buttons[i];
        var isMemphisButton = button.getAttribute('data-skin') === 'memphis';
        if (isMemphisButton === isMemphis) button.classList.add('is-on');
        else button.classList.remove('is-on');
      }
      markCurrencyButtons();
      markLocaleButtons();
    }
    mark();

    bar.addEventListener('click', function (ev) {
      var button = ev.target && ev.target.closest ? ev.target.closest('button') : null;
      if (!button) return;
      var loc = button.getAttribute('data-locale');
      if (loc) {
        if (savedLocale() === loc) return;
        writeCookie(LOCALE_COOKIE, loc);
        markLocaleButtons();
        location.reload();
        return;
      }
      var cur = button.getAttribute('data-currency');
      if (cur) {
        if (savedCurrency() === cur) return;
        writeCookie(CURRENCY_COOKIE, cur);
        markCurrencyButtons();
        location.reload();
        return;
      }
      var wantMemphis = button.getAttribute('data-skin') === 'memphis';
      var link = document.querySelector('link[rel="stylesheet"]');
      if (!link) return;
      var href = link.getAttribute('href') || '';
      var isMemphis = href.indexOf('style-memphis.css') !== -1;
      if (wantMemphis === isMemphis) return;
      link.setAttribute('href', wantMemphis
        ? href.replace('style.css', 'style-memphis.css')
        : href.replace('style-memphis.css', 'style.css'));
      writeCookie(SKIN_COOKIE, wantMemphis ? MEMPHIS : HANDMADE);
      mark();
    });

    loadCurrencies();
  }

  if (document.body) buildBar();
  else document.addEventListener('DOMContentLoaded', buildBar);
})();
