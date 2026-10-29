(function () {
  'use strict';
  if (window.__hianimeTvNavInstalled) return;
  window.__hianimeTvNavInstalled = true;

  var selector = 'a[href],button,input:not([type="hidden"]),select,textarea,[role="button"],[role="link"],[tabindex]:not([tabindex="-1"]),video,[data-tv-focusable]';
  var style = document.createElement('style');
  style.textContent = [
    'html.tv-remote-mode :focus { outline: 3px solid #20e0b0 !important; outline-offset: 3px !important; }',
    'html.tv-remote-mode a:focus, html.tv-remote-mode button:focus, html.tv-remote-mode [role="button"]:focus { box-shadow: 0 0 0 3px #20e0b0 !important; }',
    'html.tv-remote-mode .tv-remote-focused { outline: 3px solid #20e0b0 !important; outline-offset: 3px !important; scroll-margin: 96px; }'
  ].join('\n');
  (document.head || document.documentElement).appendChild(style);
  document.documentElement.classList.add('tv-remote-mode');

  function visible(el) {
    if (!el || !el.isConnected || el.disabled || el.getAttribute('aria-hidden') === 'true') return false;
    var cs = window.getComputedStyle(el), r = el.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) !== 0 &&
      r.width > 2 && r.height > 2 && r.bottom > 0 && r.right > 0 &&
      r.top < window.innerHeight && r.left < window.innerWidth;
  }
  function candidates() {
    return Array.prototype.slice.call(document.querySelectorAll(selector)).filter(function (el) {
      return visible(el) && el.tabIndex >= 0;
    });
  }
  function editable(el) {
    if (!el) return false;
    var tag = (el.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' ||
      el.isContentEditable || tag === 'video' || el.closest('[contenteditable="true"]');
  }
  function focus(el) {
    if (!el) return false;
    try { el.focus({preventScroll: true}); } catch (_) { try { el.focus(); } catch (__) {} }
    if (document.activeElement !== el) return false;
    Array.prototype.forEach.call(document.querySelectorAll('.tv-remote-focused'), function (old) {
      old.classList.remove('tv-remote-focused');
    });
    el.classList.add('tv-remote-focused');
    try { el.scrollIntoView({block: 'nearest', inline: 'nearest', behavior: 'auto'}); } catch (_) {}
    return true;
  }
  function move(direction) {
    var current = document.activeElement;
    if (editable(current)) return false;
    var list = candidates();
    if (!list.length) return false;
    var cr = current && current !== document.body && current !== document.documentElement
      ? current.getBoundingClientRect() : null;
    if (!cr || cr.width < 1 || cr.height < 1) {
      var first = list.find(function (el) { return el.tagName !== 'VIDEO'; }) || list[0];
      return focus(first);
    }
    var cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2;
    var best = null, bestScore = Infinity;
    list.forEach(function (el) {
      if (el === current || el.contains(current)) return;
      var r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      var primary, cross;
      if (direction === 'left') { primary = cx - x; cross = Math.abs(cy - y); }
      else if (direction === 'right') { primary = x - cx; cross = Math.abs(cy - y); }
      else if (direction === 'up') { primary = cy - y; cross = Math.abs(cx - x); }
      else { primary = y - cy; cross = Math.abs(cx - x); }
      if (primary <= 1) return;
      var overlap = (direction === 'left' || direction === 'right')
        ? Math.max(0, Math.min(cr.bottom, r.bottom) - Math.max(cr.top, r.top))
        : Math.max(0, Math.min(cr.right, r.right) - Math.max(cr.left, r.left));
      var score = primary + cross * 2.25 - (overlap > 0 ? 80 : 0);
      if (score < bestScore) { bestScore = score; best = el; }
    });
    if (best) return focus(best);
    var node = current.parentElement;
    while (node && node !== document.body) {
      var cs = window.getComputedStyle(node);
      var canScroll = direction === 'left' || direction === 'right'
        ? node.scrollWidth > node.clientWidth + 4 && /(auto|scroll)/.test(cs.overflowX)
        : node.scrollHeight > node.clientHeight + 4 && /(auto|scroll)/.test(cs.overflowY);
      if (canScroll) {
        if (direction === 'left') node.scrollBy({left: -Math.max(120, node.clientWidth * 0.7), behavior: 'auto'});
        if (direction === 'right') node.scrollBy({left: Math.max(120, node.clientWidth * 0.7), behavior: 'auto'});
        if (direction === 'up') node.scrollBy({top: -Math.max(100, node.clientHeight * 0.65), behavior: 'auto'});
        if (direction === 'down') node.scrollBy({top: Math.max(100, node.clientHeight * 0.65), behavior: 'auto'});
        return true;
      }
      node = node.parentElement;
    }
    if (direction === 'left') window.scrollBy({left: -Math.max(100, window.innerWidth * 0.6), behavior: 'auto'});
    if (direction === 'right') window.scrollBy({left: Math.max(100, window.innerWidth * 0.6), behavior: 'auto'});
    if (direction === 'up') window.scrollBy({top: -Math.max(100, window.innerHeight * 0.6), behavior: 'auto'});
    if (direction === 'down') window.scrollBy({top: Math.max(100, window.innerHeight * 0.6), behavior: 'auto'});
    return true;
  }

  document.addEventListener('keydown', function (event) {
    var keyMap = {ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down'};
    var direction = keyMap[event.key];
    if (!direction || editable(document.activeElement)) return;
    if (move(direction)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  document.addEventListener('focusin', function (event) {
    var el = event.target;
    if (el && el.matches && el.matches(selector)) {
      Array.prototype.forEach.call(document.querySelectorAll('.tv-remote-focused'), function (old) {
        if (old !== el) old.classList.remove('tv-remote-focused');
      });
      el.classList.add('tv-remote-focused');
    }
  }, true);

  var observer = new MutationObserver(function () {
    if (!document.activeElement || document.activeElement === document.body ||
        document.activeElement === document.documentElement) {
      var first = candidates().find(function (el) { return el.tagName !== 'VIDEO'; });
      if (first) focus(first);
    }
  });
  observer.observe(document.documentElement, {childList: true, subtree: true});
  window.setTimeout(function () {
    var active = document.activeElement;
    if (!active || active === document.body || active === document.documentElement) {
      var first = candidates().find(function (el) { return el.tagName !== 'VIDEO'; });
      if (first) focus(first);
    }
  }, 450);
})();