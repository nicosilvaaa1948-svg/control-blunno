(function () {
  const VERSION = '2026.09.25.15';
  window.__BLUNNO_VERSION__ = VERSION;
  window.addEventListener('error', function (event) {
    if (window.__BLUNNO_BOOTED__) return;
    const box = document.getElementById('bootError');
    if (!box) return;
    const message = (event.error && event.error.message) || event.message || 'Error inesperado de JavaScript.';
    box.hidden = false;
    const out = box.querySelector('[data-boot-message]');
    if (out) out.textContent = message;
  });
  window.addEventListener('unhandledrejection', function (event) {
    if (window.__BLUNNO_BOOTED__) return;
    const box = document.getElementById('bootError');
    if (!box) return;
    const reason = event.reason;
    const message = reason && reason.message ? reason.message : String(reason || 'Promesa rechazada sin detalle.');
    box.hidden = false;
    const out = box.querySelector('[data-boot-message]');
    if (out) out.textContent = message;
  });
})();
