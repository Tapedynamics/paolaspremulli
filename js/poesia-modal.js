/* Modal poesia: tocchi la card → immagine lenta, testo, voce di Hope.
   Il markup delle card non cambia (lo legge la dash): si aggancia al link .read-more.
   Senza JS il link «Leggi» porta alla pagina come prima. */
(function () {
  if (!window.HTMLDialogElement || !window.fetch) return;

  var dlg = document.createElement('dialog');
  dlg.className = 'pm';
  dlg.setAttribute('aria-labelledby', 'pm-title');
  dlg.innerHTML =
    '<button class="pm-close" type="button" aria-label="Chiudi">&times;</button>' +
    '<div class="pm-visual"><img alt=""></div>' +
    '<div class="pm-body">' +
      '<div class="pm-scroll">' +
        '<span class="pm-cat"></span>' +
        '<h2 class="pm-title" id="pm-title"></h2>' +
        '<div class="pm-award-slot"></div>' +
        '<div class="pm-text"></div>' +
      '</div>' +
      '<div class="pm-bar">' +
        '<audio controls preload="none"></audio>' +
        '<div class="pm-bar-foot"><p class="pm-ai">Voce generata con intelligenza artificiale</p><a class="pm-page" href="#">Apri la pagina</a></div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(dlg);

  var img = dlg.querySelector('.pm-visual img');
  var cat = dlg.querySelector('.pm-cat');
  var title = dlg.querySelector('.pm-title');
  var awardSlot = dlg.querySelector('.pm-award-slot');
  var text = dlg.querySelector('.pm-text');
  var audio = dlg.querySelector('audio');
  var bar = dlg.querySelector('.pm-bar');
  var pageLink = dlg.querySelector('.pm-page');
  var scroller = dlg.querySelector('.pm-scroll');
  var current = 0;
  var leaving = false;

  audio.addEventListener('error', function () {
    // poesia ancora senza voce: resta il testo e il link alla pagina
    bar.classList.add('pm-novoice');
  });

  function open(card, href) {
    var slug = href.replace(/^.*\//, '').replace(/\.html$/, '');
    var run = ++current;
    leaving = false;
    var cardImg = card.querySelector('.card-image img');
    var cardCat = card.querySelector('.category');

    img.src = cardImg ? cardImg.getAttribute('src') : '';
    cat.textContent = cardCat ? cardCat.textContent : '';
    title.textContent = card.querySelector('h3') ? card.querySelector('h3').textContent : '';
    awardSlot.innerHTML = '';
    text.innerHTML = '<p class="pm-loading">…</p>';
    pageLink.href = href;
    scroller.scrollTop = 0;

    bar.classList.remove('pm-novoice');
    audio.src = 'audio/' + slug + '.mp3';
    dlg.showModal();
    history.pushState({ pm: slug }, '', '#' + slug);
    // dentro il tocco: il browser lascia partire l'audio
    var p = audio.play();
    if (p && p.catch) p.catch(function () {});

    fetch(href).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    }).then(function (html) {
      if (run !== current) return;
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var h1 = doc.querySelector('.poem-full h1');
      if (h1) {
        var sub = h1.querySelector('.subtitle');
        if (sub) sub.remove();
        title.textContent = h1.textContent.trim();
      }
      var award = doc.querySelector('.poem-full .award-badge');
      if (award) {
        var b = document.createElement('p');
        b.className = 'pm-award';
        b.textContent = award.textContent.trim();
        awardSlot.appendChild(b);
      }
      // bilingue: solo la colonna italiana, quella che la voce legge
      var scope = doc.querySelector('.poem-full .poem-column') || doc.querySelector('.poem-full');
      var stanzas = scope ? scope.querySelectorAll('.stanza') : [];
      text.innerHTML = '';
      Array.prototype.forEach.call(stanzas, function (s, i) {
        var d = document.importNode(s, true);
        d.style.animationDelay = (0.25 + i * 0.35) + 's';
        text.appendChild(d);
      });
      if (!stanzas.length) window.location.href = href;
    }).catch(function () {
      if (run === current) window.location.href = href;
    });
  }

  function close() {
    current++; // una risposta ancora in volo non deve più navigare
    leaving = false;
    audio.pause();
    if (dlg.open) dlg.close();
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var card = e.target.closest('.poem-card');
    if (!card || dlg.contains(card)) return;
    var link = card.querySelector('a.read-more');
    if (!link) return;
    e.preventDefault();
    open(card, link.getAttribute('href'));
  });

  // un solo back per chiusura: due tocchi rapidi non escono dalla pagina
  function back() {
    if (leaving || !dlg.open) return;
    leaving = true;
    history.back();
  }

  dlg.querySelector('.pm-close').addEventListener('click', back);
  dlg.addEventListener('click', function (e) { if (e.target === dlg) back(); });
  dlg.addEventListener('cancel', function (e) { e.preventDefault(); back(); });
  // tasto indietro del telefono = chiudi, non lasciare la pagina
  window.addEventListener('popstate', close);
  dlg.addEventListener('close', function () { audio.pause(); });
})();
