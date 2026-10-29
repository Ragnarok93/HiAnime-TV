(function () {
  'use strict';
  if (window.__hianimeTvNavInstalled) return;
  window.__hianimeTvNavInstalled = true;

  var selector = 'a[href],button,input:not([type="hidden"]),select,textarea,[role="button"],[role="link"],[onclick],[tabindex]:not([tabindex="-1"]),video,[data-tv-focusable]';
  var style = document.createElement('style');
  style.textContent = [
    'html.tv-remote-mode :focus { outline: 3px solid #20e0b0 !important; outline-offset: 3px !important; }',
    'html.tv-remote-mode a:focus, html.tv-remote-mode button:focus, html.tv-remote-mode [role="button"]:focus { box-shadow: 0 0 0 3px #20e0b0 !important; }',
    'html.tv-remote-mode .tv-remote-focused { outline: 4px solid #20e0b0 !important; outline-offset: 3px !important; box-shadow: 0 0 0 5px rgba(0,0,0,.9) !important; scroll-margin: 100px; }',
    'html.tv-remote-mode .tv-remote-focused img { filter: brightness(1.08); }'
  ].join('\\n');
  (document.head || document.documentElement).appendChild(style);
  document.documentElement.classList.add('tv-remote-mode');

  function editable(el) {
    if (!el) return false;
    var tag = (el.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' ||
      el.isContentEditable || !!el.closest('[contenteditable="true"]');
  }
  function rendered(el) {
    if (!el || !el.isConnected || el.disabled || el.getAttribute('aria-hidden') === 'true') return false;
    if (el.closest('[aria-hidden="true"],[inert]')) return false;
    var cs = window.getComputedStyle(el), r = el.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) !== 0 &&
      r.width > 3 && r.height > 3;
  }
  function candidates() {
    var found = Array.prototype.slice.call(document.querySelectorAll(selector));
    return found.filter(function (el) {
      if (!rendered(el) || el.tabIndex < 0) return false;
      if (el.tagName === 'VIDEO' || editable(el)) return true;
      var r = el.getBoundingClientRect();
      // Ignore huge page wrappers accidentally marked clickable; keep actual cards and controls.
      if (r.width > window.innerWidth * 1.15 || r.height > window.innerHeight * 1.5) return false;
      return true;
    });
  }
  function focus(el) {
    if (!el) return false;
    try { el.focus({preventScroll: true}); } catch (_) { try { el.focus(); } catch (__) {} }
    // Some website cards are clickable but not natively focusable.
    if (document.activeElement !== el && el.tabIndex < 0) {
      try { el.setAttribute('tabindex', '0'); el.focus(); } catch (_) {}
    }
    if (document.activeElement !== el) return false;
    Array.prototype.forEach.call(document.querySelectorAll('.tv-remote-focused'), function (old) {
      if (old !== el) old.classList.remove('tv-remote-focused');
    });
    el.classList.add('tv-remote-focused');
    try { el.scrollIntoView({block: 'nearest', inline: 'nearest', behavior: 'auto'}); } catch (_) {}
    return true;
  }
  function currentFocusable() {
    var el = document.activeElement;
    if (el && el !== document.body && el !== document.documentElement && rendered(el)) return el;
    return document.querySelector('.tv-remote-focused') || null;
  }
  function move(direction) {
    var current = currentFocusable();
    if (editable(current)) return false;
    var list = candidates();
    if (!list.length) return false;
    var cr = current && current !== document.body && current !== document.documentElement
      ? current.getBoundingClientRect() : null;
    if (!cr || cr.width < 1 || cr.height < 1) {
      var initial = list.find(function (el) { return el.tagName !== 'VIDEO' && !editable(el); }) || list[0];
      return focus(initial);
    }
    var cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2;
    var best = null, bestScore = Infinity;
    list.forEach(function (el) {
      if (el === current || (current && el.contains(current))) return;
      var r = el.getBoundingClientRect();
      var x = r.left + r.width / 2, y = r.top + r.height / 2;
      var primary, cross;
      if (direction === 'left') { primary = cx - x; cross = Math.abs(cy - y); }
      else if (direction === 'right') { primary = x - cx; cross = Math.abs(cy - y); }
      else if (direction === 'up') { primary = cy - y; cross = Math.abs(cx - x); }
      else { primary = y - cy; cross = Math.abs(cx - x); }
      if (primary <= 2) return;
      var overlap = (direction === 'left' || direction === 'right')
        ? Math.max(0, Math.min(cr.bottom, r.bottom) - Math.max(cr.top, r.top))
        : Math.max(0, Math.min(cr.right, r.right) - Math.max(cr.left, r.left));
      var score = primary + cross * 2.0 - (overlap > 0 ? Math.min(100, overlap) : 0);
      // Prefer nearby items on the same visual row/column; offscreen items remain eligible.
      if (score < bestScore) { bestScore = score; best = el; }
    });
    if (best && focus(best)) return true;

    // Only scroll when there truly is no focusable target in that direction.
    var node = current && current.parentElement;
    while (node && node !== document.body) {
      var cs = window.getComputedStyle(node);
      var canScroll = direction === 'left' || direction === 'right'
        ? node.scrollWidth > node.clientWidth + 4 && /(auto|scroll)/.test(cs.overflowX)
        : node.scrollHeight > node.clientHeight + 4 && /(auto|scroll)/.test(cs.overflowY);
      if (canScroll) {
        if (direction === 'left') node.scrollBy({left: -Math.max(120, node.clientWidth * .65), behavior: 'auto'});
        if (direction === 'right') node.scrollBy({left: Math.max(120, node.clientWidth * .65), behavior: 'auto'});
        if (direction === 'up') node.scrollBy({top: -Math.max(100, node.clientHeight * .6), behavior: 'auto'});
        if (direction === 'down') node.scrollBy({top: Math.max(100, node.clientHeight * .6), behavior: 'auto'});
        return true;
      }
      node = node.parentElement;
    }
    window.scrollBy({left: direction === 'left' ? -window.innerWidth * .5 : direction === 'right' ? window.innerWidth * .5 : 0,
      top: direction === 'up' ? -window.innerHeight * .55 : direction === 'down' ? window.innerHeight * .55 : 0, behavior: 'auto'});
    return true;
  }
  function activate() {
    var el = currentFocusable() || document.querySelector('.tv-remote-focused');
    if (!el) {
      var first = candidates().find(function (item) { return item.tagName !== 'VIDEO'; });
      return first ? focus(first) : false;
    }
    if (editable(el)) {
      try { el.click(); } catch (_) {}
      return true;
    }
    try { el.click(); return true; } catch (_) { return false; }
  }
  function syncEditable(el) {
    try {
      if (window.HiAnimeTvBridge) window.HiAnimeTvBridge.setEditable(!!editable(el));
    } catch (_) {}
  }

  function clickBest(selectors) {
    for (var i = 0; i < selectors.length; i++) {
      var matches = document.querySelectorAll(selectors[i]);
      for (var j = 0; j < matches.length; j++) {
        var el = matches[j];
        if (!rendered(el)) continue;
        var label = ((el.getAttribute('aria-label') || '') + ' ' +
          (el.getAttribute('title') || '') + ' ' + (el.innerText || '') + ' ' +
          (typeof el.className === 'string' ? el.className : '')).toLowerCase();
        if (/close|dismiss|exit/.test(label) && /menu|setting|option/.test(label)) continue;
        try { el.click(); return true; } catch (_) {}
      }
    }
    return false;
  }
  var activeMenuMode = null;
  var activeMenuToggle = null;
  function firstRendered(selectors) {
    for (var i = 0; i < selectors.length; i++) {
      var matches = document.querySelectorAll(selectors[i]);
      for (var j = 0; j < matches.length; j++) {
        if (rendered(matches[j])) return matches[j];
      }
    }
    return null;
  }
  function menuAction(mode) {
    // Re-pressing MENU closes the menu opened by the previous press whenever
    // the site/player exposes the same toggle control.
    if (activeMenuMode === mode && activeMenuToggle && rendered(activeMenuToggle)) {
      try { activeMenuToggle.click(); activeMenuMode = null; activeMenuToggle = null; return true; }
      catch (_) {}
    }
    activeMenuMode = null;
    activeMenuToggle = null;
    if (mode === 'player') {
      // Same-origin player controls only. MainActivity forwards native keys to
      // the fullscreen custom view first for players hosted in cross-origin frames.
      var playerToggle = firstRendered([
        '.jw-icon-settings', '.plyr__control[data-plyr="settings"]',
        '.vjs-settings-button', '.shaka-settings-button',
        'button[aria-label*="setting" i]', '[role="button"][aria-label*="setting" i]',
        'button[title*="setting" i]', '[class*="setting" i][role="button"]',
        'button[aria-label*="option" i]', '[role="button"][aria-label*="option" i]',
        'button[aria-label*="menu" i]', '[role="button"][aria-label*="menu" i]'
      ]);
      if (!playerToggle) return false;
      try { playerToggle.click(); activeMenuMode = mode; activeMenuToggle = playerToggle; return true; }
      catch (_) { return false; }
    }
    // Explicit menu links navigate, while hamburger/drawer controls toggle in place.
    var menuLinks = document.querySelectorAll('a[href*="/menu"], a[href$="#menu"]');
    for (var i = 0; i < menuLinks.length; i++) {
      var link = menuLinks[i];
      if (rendered(link) && !/login|account|profile/i.test((link.innerText || '') + ' ' + (link.getAttribute('aria-label') || ''))) {
        try { link.click(); return true; } catch (_) {}
      }
    }
    var siteToggle = firstRendered([
      'button[aria-label*="navigation" i]', '[role="button"][aria-label*="navigation" i]',
      'button[aria-label*="menu" i]', '[role="button"][aria-label*="menu" i]',
      'a[aria-label*="menu" i]', 'button[title*="menu" i]', '[class*="hamburger" i]',
      '.navbar-toggler', '.menu-toggle', '.toggle-menu',
      'header button', 'nav button'
    ]);
    if (!siteToggle) return false;
    try { siteToggle.click(); activeMenuMode = mode; activeMenuToggle = siteToggle; return true; }
    catch (_) { return false; }
  }
  window.hianimeTvMenu = menuAction;

  window.hianimeTvNavigate = function (direction) { return move(direction); };
  window.hianimeTvActivate = activate;
  document.addEventListener('keydown', function (event) {
    var keyMap = {ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down'};
    var direction = keyMap[event.key];
    if (!direction || editable(document.activeElement)) return;
    if (move(direction)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    syncEditable(document.activeElement);
  }, true);
  document.addEventListener('focusin', function (event) {
    var el = event.target;
    syncEditable(el);
    if (el && el.matches && el.matches(selector)) {
      Array.prototype.forEach.call(document.querySelectorAll('.tv-remote-focused'), function (old) {
        if (old !== el) old.classList.remove('tv-remote-focused');
      });
      el.classList.add('tv-remote-focused');
    }
  }, true);
  document.addEventListener('click', function (event) {
    var el = event.target && event.target.closest ? event.target.closest(selector) : null;
    if (el) focus(el);
  }, true);

  var observer = new MutationObserver(function () {
    if (!document.activeElement || document.activeElement === document.body ||
        document.activeElement === document.documentElement) {
      var first = candidates().find(function (el) { return el.tagName !== 'VIDEO' && !editable(el); });
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