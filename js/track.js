/*
  Gracher ホームページの細かい計測（2026-11-27）
  ページを「離れる時」ではなく「見ている途中」に記録を送るので、
  インスタの中のブラウザ（×で閉じるとページごと消える）でも届く。

  Googleアナリティクスに送る記録（イベント名。/lp/ は頭に lp_、トップページなどは hp_ が付く。例 lp_time_10s）
    time_10s / time_30s / time_60s / time_120s  … 画面に出ていた時間がその秒数に届いた
    scroll_25 / scroll_50 / scroll_75 / scroll_100 … ページをどこまで下に見たか（%）
    view_<区画>   … その区画（例 view_choose＝メニュー欄）が画面に入った
    jump_click    … ページ内のリンク（「メニューを選んで予約する↓」など）が押された
    inapp_instagram / inapp_facebook … インスタ・Facebookの中のブラウザで開かれた
  Metaピクセルに送る記録（/lp/ のみ。あとで「よく見た人」に絞った広告に使える）
    Stay30s / Scroll50 / ViewMenu
  Microsoft Clarity（画面の動きの記録）は CLARITY_ID を入れると動く。
*/
(function(){
  var CLARITY_ID = '';

  var isLP = location.pathname.indexOf('/lp') === 0;
  var gt = function(name, params){
    if (typeof window.gtag !== 'function') return;
    var p = params || {};
    p.page_kind = isLP ? 'lp' : 'home';
    p.transport_type = 'beacon';
    window.gtag('event', (isLP ? 'lp_' : 'hp_') + name, p);
  };
  var fb = function(name){
    if (isLP && typeof window.fbq === 'function') window.fbq('trackCustom', name);
  };

  // インスタ・Facebookの中のブラウザかどうか
  var ua = navigator.userAgent || '';
  var inapp = /Instagram/i.test(ua) ? 'instagram' : (/FBAN|FBAV|FB_IAB/i.test(ua) ? 'facebook' : '');
  if (inapp) gt('inapp_' + inapp);

  // 1. 画面に出ていた時間（裏に回っている間は数えない）
  var marks = [10, 30, 60, 120], seen = 0, mi = 0;
  var timer = setInterval(function(){
    if (document.visibilityState !== 'visible') return;
    seen++;
    if (seen >= marks[mi]) {
      gt('time_' + marks[mi] + 's', {seconds: marks[mi]});
      if (marks[mi] === 30) fb('Stay30s');
      mi++;
      if (mi >= marks.length) clearInterval(timer);
    }
  }, 1000);

  // 2. どこまで下に見たか
  var depths = [25, 50, 75, 100], di = 0, ticking = false;
  var checkScroll = function(){
    ticking = false;
    var doc = document.documentElement;
    var max = Math.max(doc.scrollHeight - window.innerHeight, 1);
    var pct = Math.min(100, Math.round((window.scrollY || doc.scrollTop) / max * 100));
    while (di < depths.length && pct >= depths[di] - (depths[di] === 100 ? 2 : 0)) {
      gt('scroll_' + depths[di], {percent: depths[di]});
      if (depths[di] === 50) fb('Scroll50');
      di++;
    }
    if (di >= depths.length) window.removeEventListener('scroll', onScroll);
  };
  var onScroll = function(){ if (!ticking) { ticking = true; requestAnimationFrame(checkScroll); } };
  window.addEventListener('scroll', onScroll, {passive: true});

  // 3. どの区画まで見たか（区画の上の端が画面の上から6割の所まで来たら「見た」）
  var keyOf = function(sec){
    if (sec.id) return sec.id;
    var c = (sec.className || '').toString().split(' ')[0] || '';
    return c.replace(/^lp-/, '');
  };
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){
        if (!e.isIntersecting) return;
        var k = keyOf(e.target);
        if (k) {
          gt('view_' + k, {section: k});
          if (k === 'choose') fb('ViewMenu');
        }
        io.unobserve(e.target);
      });
    }, {rootMargin: '0px 0px -40% 0px', threshold: 0});
    document.querySelectorAll('main section').forEach(function(s){
      if (/hero/.test(s.className || '')) return; // 一番上は開いた時点で見えている
      io.observe(s);
    });
  }

  // 4. ページ内リンク（「メニューを選んで予約する↓」など）
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    gt('jump_click', {link_url: a.getAttribute('href'), link_text: (a.textContent || '').trim().slice(0, 40)});
  }, true);

  // 5. Microsoft Clarity（画面の動きの記録）
  if (CLARITY_ID) {
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", CLARITY_ID);
    if (inapp) window.clarity('set', 'inapp', inapp);
    window.clarity('set', 'page_kind', isLP ? 'lp' : 'home');
  }
})();
