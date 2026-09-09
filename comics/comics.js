/* Locale routing for static comic editions. Locale values follow BCP 47. */
(function () {
  const supported = ['zh-CN', 'en', 'ja', 'ko'];
  const rtl = ['ar', 'fa', 'he', 'ur'];
  if (rtl.includes((navigator.language || '').split('-')[0])) document.documentElement.dir = 'rtl';
  const params = new URLSearchParams(location.search);
  const requested = params.get('lang');
  if (!requested || supported.includes(requested)) return;
  const fallback = supported.includes('en') ? 'en' : 'zh-CN';
  const banner = document.createElement('div');
  banner.textContent = `当前语言暂未提供，已显示 ${fallback} 版本`;
  banner.setAttribute('role', 'status');
  banner.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:30;background:#141414;color:#fff;padding:8px 14px;font:14px system-ui,sans-serif';
  document.body.appendChild(banner);
})();
