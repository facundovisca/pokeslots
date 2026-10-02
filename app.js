const SYMBOLS = [
  'masterball', // Scatter de la escalera
  'fire_stone',
  'thunder_stone',
  'seven',
  'berry',
  'bar',
  'wild'
];

const ROW_COUNT = 3;
const STOP_INDEX = 25; // Cantidad de vueltas antes de frenar

let credits = 2000.0;
let bet = 1.0;
let isSpinning = false;

const reels = [
  document.getElementById('reel-0'),
  document.getElementById('reel-1'),
  document.getElementById('reel-2'),
  document.getElementById('reel-3'),
  document.getElementById('reel-4')
];

const spinBtn = document.getElementById('spin-btn');
const creditsEl = document.getElementById('credits');
const winDisplayEl = document.getElementById('win-display');
const betEl = document.getElementById('bet-amount');
const ladderItems = document.querySelectorAll('.ladder-layer li');

// Generador de tira con buffer
function buildReelStrip(reelElement) {
  reelElement.innerHTML = '';
  for (let i = 0; i < 35; i++) {
    const sym = document.createElement('div');
    sym.className = 'symbol';
    // 16% de probabilidad para la Master Ball
    const isScatter = Math.random() < 0.16;
    const symName = isScatter ? 'masterball' : SYMBOLS[Math.floor(Math.random() * (SYMBOLS.length - 1)) + 1];
    sym.classList.add(symName);
    reelElement.appendChild(sym);
  }
}

// Iniciar rodillos
reels.forEach(buildReelStrip);

// Control de apuesta
document.getElementById('btn-plus').addEventListener('click', () => {
  if (bet < 50 && !isSpinning) {
    bet += 1.0;
    betEl.textContent = bet.toFixed(2);
  }
});

document.getElementById('btn-minus').addEventListener('click', () => {
  if (bet > 1 && !isSpinning) {
    bet -= 1.0;
    betEl.textContent = bet.toFixed(2);
  }
});

async function spin() {
  if (isSpinning || credits < bet) return;

  isSpinning = true;
  credits -= bet;
  creditsEl.textContent = credits.toFixed(2);
  winDisplayEl.textContent = '0.00';
  spinBtn.disabled = true;

  ladderItems.forEach(item => item.classList.remove('active-prize'));

  const gridResults = [[], [], []];

  // Altura exacta de cada celda en pixeles para la animación
  const cellHeight = reels[0].offsetHeight / ROW_COUNT;

  const spinPromises = reels.map((reel, rIndex) => {
    return new Promise((resolve) => {
      buildReelStrip(reel);

      // Guardar símbolos que caen visibles en las 3 filas
      for (let row = 0; row < ROW_COUNT; row++) {
        const item = reel.children[STOP_INDEX + row];
        const symName = SYMBOLS.find(s => item.classList.contains(s)) || 'wild';
        gridResults[row][rIndex] = symName;
      }

      const targetOffset = -(STOP_INDEX * cellHeight);

      reel.style.transition = 'none';
      reel.style.transform = 'translateY(0px)';
      reel.offsetHeight; // Forzar reflow

      // Desaceleración escalonada rodillo por rodillo con curva de rebote
      const duration = 1.4 + rIndex * 0.3;
      reel.style.transition = `transform ${duration}s cubic-bezier(0.12, 0.85, 0.2, 1.14)`;
      reel.style.transform = `translateY(${targetOffset}px)`;

      setTimeout(resolve, duration * 1000);
    });
  });

  await Promise.all(spinPromises);

  checkPayouts(gridResults);

  isSpinning = false;
  spinBtn.disabled = false;
}

function checkPayouts(grid) {
  let totalWin = 0;

  // 1. Premios de Master Balls (Escalera Scatter)
  let scatterCount = 0;
  for (let r = 0; r < ROW_COUNT; r++) {
    for (let c = 0; c < reels.length; c++) {
      if (grid[r][c] === 'masterball') scatterCount++;
    }
  }

  const ladderMultipliers = {
    3: 1,
    4: 5,
    5: 15,
    6: 40,
    7: 100,
    8: 500,
    9: 2000
  };

  if (scatterCount >= 3) {
    const effectiveCount = Math.min(scatterCount, 9);
    const ladderWin = bet * ladderMultipliers[effectiveCount];
    totalWin += ladderWin;

    const targetRow = document.querySelector(`.ladder-layer li[data-count="${effectiveCount}"]`);
    if (targetRow) targetRow.classList.add('active-prize');
  }

  // 2. Línea horizontal central (Fila 1)
  const mid = grid[1];
  if (mid[0] === mid[1] && mid[1] === mid[2]) {
    totalWin += bet * 5;
  }

  if (totalWin > 0) {
    credits += totalWin;
    creditsEl.textContent = credits.toFixed(2);
    winDisplayEl.textContent = totalWin.toFixed(2);
  }
}

spinBtn.addEventListener('click', spin);