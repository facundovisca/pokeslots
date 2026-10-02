const SYMBOLS = [
  'masterball',    // Scatter de escalera
  'wild',          // Comodín
  'seven',         // 7 de Pikachu
  'bar',           // Lingote
  'fire_stone',    // Piedra Fuego
  'thunder_stone', // Piedra Trueno
  'berry'          // Bayas
];

// Tabla de pagos según la apuesta por línea (apuesta total / 20)
const PAYTABLE = {
  wild:          { 3: 50,  4: 200, 5: 2500 },
  seven:         { 3: 30,  4: 100, 5: 750 },
  bar:           { 3: 15,  4: 50,  5: 250 },
  fire_stone:    { 3: 10,  4: 25,  5: 150 },
  thunder_stone: { 3: 10,  4: 25,  5: 150 },
  berry:         { 3: 5,   4: 15,  5: 75 }
};

// Multiplicadores de la escalera para la apuesta total
const LADDER_MULTIPLIERS = {
  9: 2000,
  8: 500,
  7: 100,
  6: 40,
  5: 15,
  4: 5,
  3: 1
};

// Las 20 líneas de pago estándar para tragamonedas 5x3
const PAYLINES = [
  [1, 1, 1, 1, 1], // Línea 1: Horizontal central
  [0, 0, 0, 0, 0], // Línea 2: Horizontal superior
  [2, 2, 2, 2, 2], // Línea 3: Horizontal inferior
  [0, 1, 2, 1, 0], // Línea 4: En V
  [2, 1, 0, 1, 2], // Línea 5: V invertida
  [0, 0, 1, 2, 2], // Línea 6
  [2, 2, 1, 0, 0], // Línea 7
  [1, 2, 2, 2, 1], // Línea 8
  [1, 0, 0, 0, 1], // Línea 9
  [1, 0, 1, 2, 1], // Línea 10
  [1, 2, 1, 0, 1], // Línea 11
  [0, 1, 1, 1, 0], // Línea 12
  [2, 1, 1, 1, 2], // Línea 13
  [0, 1, 0, 1, 0], // Línea 14
  [2, 1, 2, 1, 2], // Línea 15
  [1, 1, 0, 1, 1], // Línea 16
  [1, 1, 2, 1, 1], // Línea 17
  [0, 0, 2, 0, 0], // Línea 18
  [2, 2, 0, 2, 2], // Línea 19
  [0, 2, 2, 2, 0]  // Línea 20
];

const ROW_COUNT = 3;
const STOP_INDEX = 26;

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
const svgCanvas = document.getElementById('paylines-svg');

// Ponderación de probabilidades para símbolos
function getRandomSymbol() {
  const rand = Math.random();
  if (rand < 0.14) return 'masterball'; // 14% Scatter
  if (rand < 0.18) return 'wild';       // 4% Wild
  if (rand < 0.28) return 'seven';      // 10% 7 Pikachu
  if (rand < 0.44) return 'bar';        // 16% Bar
  if (rand < 0.62) return 'fire_stone'; // 18% Fuego
  if (rand < 0.80) return 'thunder_stone'; // 18% Trueno
  return 'berry';                       // 20% Cerezas
}

// Crea la tira con los símbolos
function buildReelStrip(reelElement) {
  reelElement.innerHTML = '';
  for (let i = 0; i < 35; i++) {
    const sym = document.createElement('div');
    sym.className = `symbol ${getRandomSymbol()}`;
    reelElement.appendChild(sym);
  }
}

// Inicialización
reels.forEach(buildReelStrip);

// Actualiza los valores de la escalera lateral según la apuesta
function updateLadderValues() {
  ladderItems.forEach(item => {
    const count = parseInt(item.dataset.count);
    const mult = LADDER_MULTIPLIERS[count];
    const valEl = item.querySelector('.val');
    if (valEl) {
      valEl.textContent = (bet * mult).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
  });
}
updateLadderValues();

// Controles de apuesta
document.getElementById('btn-plus').addEventListener('click', () => {
  if (bet < 100 && !isSpinning) {
    bet += 1.0;
    betEl.textContent = bet.toFixed(2);
    updateLadderValues();
  }
});

document.getElementById('btn-minus').addEventListener('click', () => {
  if (bet > 1 && !isSpinning) {
    bet -= 1.0;
    betEl.textContent = bet.toFixed(2);
    updateLadderValues();
  }
});

function clearWinners() {
  document.querySelectorAll('.symbol.winner').forEach(el => el.classList.remove('winner'));
  ladderItems.forEach(item => item.classList.remove('active-prize'));
  svgCanvas.innerHTML = '';
}

async function spin() {
  if (isSpinning || credits < bet) return;

  isSpinning = true;
  credits -= bet;
  creditsEl.textContent = credits.toFixed(2);
  winDisplayEl.textContent = '0.00';
  spinBtn.disabled = true;

  clearWinners();

  const gridElements = [[], [], []];
  const gridSymbols = [[], [], []];

  const cellHeight = reels[0].offsetHeight / ROW_COUNT;

  const spinPromises = reels.map((reel, rIndex) => {
    return new Promise((resolve) => {
      buildReelStrip(reel);

      for (let row = 0; row < ROW_COUNT; row++) {
        const domItem = reel.children[STOP_INDEX + row];
        const sym = SYMBOLS.find(s => domItem.classList.contains(s)) || 'berry';
        gridElements[row][rIndex] = domItem;
        gridSymbols[row][rIndex] = sym;
      }

      const targetOffset = -(STOP_INDEX * cellHeight);

      reel.style.transition = 'none';
      reel.style.transform = 'translateY(0px)';
      reel.offsetHeight;

      const duration = 1.3 + rIndex * 0.25;
      reel.style.transition = `transform ${duration}s cubic-bezier(0.12, 0.85, 0.2, 1.14)`;
      reel.style.transform = `translateY(${targetOffset}px)`;

      setTimeout(resolve, duration * 1000);
    });
  });

  await Promise.all(spinPromises);

  // Evaluación de pagos y líneas
  evaluateWins(gridSymbols, gridElements);

  isSpinning = false;
  spinBtn.disabled = false;
}

function evaluateWins(gridSymbols, gridElements) {
  let totalWin = 0;
  const lineBet = bet / 20;
  const winningLines = [];

  // 1. EVALUAR LAS 20 LÍNEAS DE PAGO
  PAYLINES.forEach((line, lineIndex) => {
    const firstSymbol = gridSymbols[line[0]][0];
    if (firstSymbol === 'masterball') return;

    let matchCount = 1;
    let matchType = firstSymbol;

    for (let col = 1; col < 5; col++) {
      const sym = gridSymbols[line[col]][col];

      if (sym === 'masterball') break;

      if (matchType === 'wild' && sym !== 'wild') {
        matchType = sym;
      }

      if (sym === matchType || sym === 'wild') {
        matchCount++;
      } else {
        break;
      }
    }

    if (matchCount >= 3 && PAYTABLE[matchType] && PAYTABLE[matchType][matchCount]) {
      const lineWin = lineBet * PAYTABLE[matchType][matchCount];
      totalWin += lineWin;
      winningLines.push({ lineIndex, matchCount, lineCoords: line });

      for (let c = 0; c < matchCount; c++) {
        const row = line[c];
        gridElements[row][c].classList.add('winner');
      }
    }
  });

  if (winningLines.length > 0) {
    drawWinningLines(winningLines);
  }

  // 2. EVALUAR SCATTERS MASTER BALLS (Escalera)
  let scatterCount = 0;
  const scatterElements = [];
  for (let r = 0; r < ROW_COUNT; r++) {
    for (let c = 0; c < 5; c++) {
      if (gridSymbols[r][c] === 'masterball') {
        scatterCount++;
        scatterElements.push(gridElements[r][c]);
      }
    }
  }

  if (scatterCount >= 3) {
    const effectiveCount = Math.min(scatterCount, 9);
    const ladderWin = bet * LADDER_MULTIPLIERS[effectiveCount];
    totalWin += ladderWin;

    scatterElements.forEach(el => el.classList.add('winner'));

    const targetRow = document.querySelector(`.ladder-layer li[data-count="${effectiveCount}"]`);
    if (targetRow) targetRow.classList.add('active-prize');
  }

  // 3. ANIMAR GANANCIA EN PANTALLA
  if (totalWin > 0) {
    animateCreditRoll(totalWin);
  }
}

// Dibuja las líneas doradas en el canvas SVG conectando los símbolos
function drawWinningLines(winningLines) {
  svgCanvas.innerHTML = '';
  const w = svgCanvas.clientWidth;
  const h = svgCanvas.clientHeight;
  const colW = w / 5;
  const rowH = h / 3;

  winningLines.forEach(item => {
    let d = '';
    for (let c = 0; c < item.matchCount; c++) {
      const r = item.lineCoords[c];
      const x = (c * colW) + (colW / 2);
      const y = (r * rowH) + (rowH / 2);
      d += (c === 0 ? `M ${x} ${y} ` : `L ${x} ${y} `);
    }

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    path.setAttribute('class', 'payline-path');
    path.style.strokeDasharray = '1000';
    svgCanvas.appendChild(path);
  });
}

// Contador progresivo de créditos
function animateCreditRoll(winAmount) {
  const startCredits = credits;
  const endCredits = credits + winAmount;
  const startTime = performance.now();
  const duration = 1200;

  function update(time) {
    const progress = Math.min((time - startTime) / duration, 1);
    const currentWin = winAmount * progress;
    winDisplayEl.textContent = currentWin.toFixed(2);
    creditsEl.textContent = (startCredits + currentWin).toFixed(2);

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      credits = endCredits;
      creditsEl.textContent = credits.toFixed(2);
      winDisplayEl.textContent = winAmount.toFixed(2);
    }
  }
  requestAnimationFrame(update);
}

spinBtn.addEventListener('click', spin);