// Audience tab switching for the landing page.
(function(){
  const tabs   = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.tab-panel');
  tabs.forEach(t => t.addEventListener('click', () => {
    const id = t.dataset.tab;
    tabs.forEach(x => { x.classList.toggle('active', x === t); x.setAttribute('aria-selected', x === t); });
    panels.forEach(p => p.classList.toggle('active', p.dataset.panel === id));
    history.replaceState(null, '', '#who-' + id);
  }));

  // Deep link: #who-firm / #who-smb
  const hash = location.hash.replace('#who-', '');
  if (hash === 'firm' || hash === 'smb') {
    const t = document.querySelector(`.tab[data-tab="${hash}"]`);
    if (t) t.click();
  }
})();
