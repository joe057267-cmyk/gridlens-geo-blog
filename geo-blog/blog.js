// GridLens blog client script: dark mode, search, Giscus lazy-load, TOC highlight.
// Defensive: every feature is isolated in try/catch so one failure can't break the page.
(function () {
  'use strict'
  var doc = document, root = doc.documentElement

  // ---- Dark mode ----
  try {
    var saved = null
    try { saved = localStorage.getItem('gl-theme') } catch (e) {}
    if (saved === 'dark' || (saved === null && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark')
    }
    var dt = doc.querySelector('.dark-toggle')
    if (dt) {
      dt.addEventListener('click', function () {
        root.classList.toggle('dark')
        try { localStorage.setItem('gl-theme', root.classList.contains('dark') ? 'dark' : 'light') } catch (e) {}
      })
    }
  } catch (e) { /* no-op */ }

  // ---- Search ----
  try {
    var toggle = doc.querySelector('.search-toggle')
    var overlay = doc.getElementById('search-overlay')
    var input = doc.getElementById('search-input')
    var results = doc.getElementById('search-results')
    var INDEX = null
    if (toggle && overlay && input && results) {
      function openSearch() {
        overlay.hidden = false
        setTimeout(function () { input.focus() }, 30)
        if (!INDEX) {
          fetch('/search.json').then(function (r) { return r.json() }).then(function (d) { INDEX = d }).catch(function () {})
        }
      }
      function closeSearch() { overlay.hidden = true }
      toggle.addEventListener('click', function () { overlay.hidden ? openSearch() : closeSearch() })
      overlay.addEventListener('click', function (e) { if (e.target === overlay) closeSearch() })
      doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !overlay.hidden) closeSearch() })
      input.addEventListener('input', function () {
        var q = input.value.trim().toLowerCase()
        if (!q || !INDEX) { results.innerHTML = '<div class="empty">输入关键词搜索…</div>'; return }
        var hits = INDEX.filter(function (a) {
          return (a.title + ' ' + a.desc + ' ' + (a.text || '') + ' ' + (a.tags || []).join(' ')).toLowerCase().indexOf(q) >= 0
        }).slice(0, 12)
        if (!hits.length) { results.innerHTML = '<div class="empty">无匹配结果</div>'; return }
        results.innerHTML = hits.map(function (h) {
          return '<a href="' + h.url + '">' + escapeHtml(h.title) + '<span class="lang">' + (h.lang === 'zh' ? '中文' : 'EN') + '</span></a>'
        }).join('')
      })
    }
  } catch (e) { /* no-op */ }

  // ---- TOC active highlight ----
  try {
    var tocLinks = Array.prototype.slice.call(doc.querySelectorAll('.toc a[href^="#"]'))
    if (tocLinks.length && 'IntersectionObserver' in window) {
      var map = {}
      tocLinks.forEach(function (l) { var id = l.getAttribute('href').slice(1); var t = doc.getElementById(id); if (t) map[id] = l })
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            tocLinks.forEach(function (l) { l.style.fontWeight = '400' })
            if (map[en.target.id]) map[en.target.id].style.fontWeight = '700'
          }
        })
      }, { rootMargin: '-10% 0px -75% 0px' })
      Object.keys(map).forEach(function (id) { io.observe(doc.getElementById(id)) })
    }
  } catch (e) { /* no-op */ }

  // ---- Giscus lazy-load ----
  try {
    var box = doc.getElementById('comments')
    if (box) {
      var btn = box.querySelector('.load-comments')
      var repo = box.getAttribute('data-repo') || ''
      var ready = repo && !/YOUR_|example/i.test(repo)
      if (ready && btn) {
        var loaded = false
        function loadGiscus() {
          if (loaded) return; loaded = true
          var s = doc.createElement('script')
          s.src = 'https://giscus.app/client.js'
          s.async = true; s.crossOrigin = 'anonymous'
          s.dataset.repo = box.getAttribute('data-repo')
          s.dataset.repoId = box.getAttribute('data-repo-id')
          s.dataset.category = box.getAttribute('data-category')
          s.dataset.categoryId = box.getAttribute('data-category-id')
          s.dataset.mapping = box.getAttribute('data-mapping') || 'pathname'
          s.dataset.reactionsEnabled = box.getAttribute('data-reactions-enabled') || '1'
          s.dataset.emitMetadata = box.getAttribute('data-emit-metadata') || '0'
          s.dataset.inputPosition = 'bottom'
          s.dataset.lang = box.getAttribute('data-lang') || 'zh-CN'
          s.dataset.theme = box.getAttribute('data-theme') || 'prefers_color_scheme'
          box.appendChild(s)
          if (btn) btn.remove()
        }
        btn.addEventListener('click', loadGiscus)
        if ('IntersectionObserver' in window) {
          var co = new IntersectionObserver(function (es) {
            es.forEach(function (e) { if (e.isIntersecting) { loadGiscus(); co.disconnect() } })
          }, { rootMargin: '200px' })
          co.observe(box)
        }
      }
    }
  } catch (e) { /* no-op */ }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }
})()
