(function () {
  const VERSION = '2026.09.25.8';
  window.__BLUNNO_VERSION__ = VERSION;
  window.addEventListener('error', function (event) {
    const box = document.getElementById('bootError');
    if (!box) return;
    box.hidden = false;
    box.querySelector('[data-boot-message]').textContent = (event.error && event.error.message) || event.message || 'Error inesperado de JavaScript.';
  });
  window.addEventListener('unhandledrejection', function (event) {
    const box = document.getElementById('bootError');
    if (!box) return;
    box.hidden = false;
    const reason = event.reason;
    box.querySelector('[data-boot-message]').textContent = reason && reason.message ? reason.message : String(reason || 'Promesa rechazada sin detalle.');
  });
  import('./app-v8.js?v=' + VERSION).catch(function (err) {
    const box = document.getElementById('bootError');
    if (!box) return;
    box.hidden = false;
    box.querySelector('[data-boot-message]').textContent = err && err.message ? err.message : String(err);
  });
})();
