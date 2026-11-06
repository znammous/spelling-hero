// الخلفية المتحركة: أشعة ضوء، يراعات، فقاعات، حروف تتمايل، وقلم وكتاب يعبران
(() => {
  const rnd = (a, b) => a + Math.random() * (b - a);
  let h = '';
  [[8, 90, 0], [34, 140, -5], [66, 70, -9]].forEach(r => {
    h += `<span class="ray" style="left:${r[0]}%;--w:${r[1]}px;animation-delay:${r[2]}s"></span>`;
  });
  [['أ', 'bottom:7%;right:30%', 54, 0], ['⭐', 'bottom:4%;left:3%', 62, -2], ['A', 'top:6%;left:5%', 46, -4], ['ض', 'top:44%;left:2%', 44, -1], ['b', 'top:3%;right:42%', 38, -3], ['🌟', 'top:60%;right:3%', 40, -2]].forEach(p => {
    h += `<span class="plant" style="${p[1]};font-size:${p[2]}px;animation-delay:${p[3]}s">${p[0]}</span>`;
  });
  for (let i = 0; i < 16; i++) {
    h += `<span class="firefly" style="top:${rnd(5, 95)}%;left:${rnd(0, 100)}%;--s:${rnd(8, 16)}px;--d:${rnd(7, 13)}s;animation-delay:${rnd(-13, 0)}s,${rnd(-3, 0)}s"></span>`;
  }
  for (let j = 0; j < 10; j++) {
    const size = rnd(16, 58);
    h += `<span class="bubble" style="left:${rnd(0, 100)}%;--s:${size}px;animation-duration:${(34 - size * 0.3).toFixed(1)}s;animation-delay:${rnd(-30, 0).toFixed(1)}s"></span>`;
  }
  h += '<span class="flyer" style="top:22%;animation-duration:38s;animation-delay:-6s"><i>✏️</i></span>';
  h += '<span class="flyer" style="top:58%;animation-duration:52s;animation-delay:-30s"><i>📖</i></span>';
  document.getElementById('bg').innerHTML = h;
})();
