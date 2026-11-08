// Purple Mines — vanilla JS, client-side only
// Sections: state, UI building, game logic, persistence, message modal

// Persistent keys
const LS = {
  introDismissed: 'purplemines_introDismissed',
  lastWager: 'purplemines_lastWager',
  lastBombs: 'purplemines_lastBombs',
  balance: 'purplemines_balance'
};

const STATE = {
  rows: 5,
  cols: 5,
  tiles: 25,
  bombs: 3,
  wager: 1.00,
  bombPositions: new Set(),
  revealed: new Set(),
  started: false,
  gameOver: false,
  safeCount: 0,
  multiplier: 1.0,
  balance: 0
};

// DOM
const boardEl = document.getElementById('board');
const bombSelect = document.getElementById('bombCount');
const wagerInput = document.getElementById('wager');
const startBtn = document.getElementById('startBtn');
const cashoutBtn = document.getElementById('cashoutBtn');
const displayWager = document.getElementById('displayWager');
const displayMultiplier = document.getElementById('displayMultiplier');
const displayWinnings = document.getElementById('displayWinnings');
const displayBalance = document.getElementById('displayBalanceLarge');
const introModal = document.getElementById('introModal');
const closeIntro = document.getElementById('closeIntro');
const dontShow = document.getElementById('dontShow');
const msgModal = document.getElementById('msgModal');
const msgText = document.getElementById('msgText');
const msgClose = document.getElementById('msgClose');
const creatorForm = document.getElementById('creatorCodeForm');
const creatorInput = document.getElementById('creatorCode');
const creatorSubmit = document.getElementById('creatorCodeSubmit');

// --- Initialization ---
function init(){
  // bomb options
  for(let i=1;i<=24;i++){ const opt = document.createElement('option'); opt.value=i; opt.textContent = i; bombSelect.appendChild(opt); }

  // load or seed balance
  const savedBal = parseFloat(localStorage.getItem(LS.balance));
  STATE.balance = isFinite(savedBal) ? Math.round(savedBal*100)/100 : 3.00;
  displayBalance.textContent = `$${STATE.balance.toFixed(2)}`;

  // if already at/above $10 on load, treat as already notified
  if(STATE.balance >= 10) STATE.wonNotified = true;

  // load last choices
  const lastW = localStorage.getItem(LS.lastWager);
  const lastB = localStorage.getItem(LS.lastBombs);
  if(lastW) wagerInput.value = lastW; else wagerInput.value = '1.00';
  if(lastB) bombSelect.value = lastB; else bombSelect.value = '3';

  // bind events
  startBtn.addEventListener('click', onStart);
  cashoutBtn.addEventListener('click', onCashout);
  // ensure cashout starts without success styling
  cashoutBtn.classList.remove('success');
  closeIntro.addEventListener('click', () => { if(dontShow.checked) localStorage.setItem(LS.introDismissed,'1'); introModal.classList.add('hidden'); });
  msgClose.addEventListener('click', () => hideMessage());
  // creator code events
  if(creatorForm){
    creatorForm.addEventListener('submit', (ev)=>{
      ev.preventDefault();
      handleCreatorCode(creatorInput.value || '');
      creatorInput.value = '';
    });
  }

  // show intro if needed
  if(!localStorage.getItem(LS.introDismissed)) introModal.classList.remove('hidden');

  buildBoard();
  updateUI();
}

function buildBoard(){
  boardEl.innerHTML = '';
  for(let i=0;i<STATE.tiles;i++){
    const t = document.createElement('button');
    t.className = 'tile';
    t.dataset.idx = i;
    t.setAttribute('aria-label', 'Hidden tile');
    t.addEventListener('click', onTileClick);
    boardEl.appendChild(t);
  }
}

// --- Messaging modal ---
let _msgCallback = null;
function showMessage(text, callback){
  _msgCallback = callback || null;
  msgText.textContent = text;
  msgModal.classList.remove('hidden');
}

function hideMessage(){
  msgModal.classList.add('hidden');
  if(typeof _msgCallback === 'function'){
    const cb = _msgCallback; _msgCallback = null; cb();
  }
}

// --- Game control handlers ---
function onStart(){
  if(STATE.started && !STATE.gameOver) return; // already running

  const wagerVal = parseFloat(wagerInput.value);
  const bombs = parseInt(bombSelect.value,10);
  if(!isFinite(wagerVal) || wagerVal <= 0){ showMessage('Enter a valid wager greater than 0.'); return; }
  if(bombs<1 || bombs>=STATE.tiles){ showMessage('Choose a valid bomb count.'); return; }

  if(STATE.balance < wagerVal){ showMessage('Insufficient balance for that wager.'); return; }

  // persist last choices
  localStorage.setItem(LS.lastWager, wagerVal.toString());
  localStorage.setItem(LS.lastBombs, bombs.toString());

  STATE.wager = Math.max(0.01, Math.round(wagerVal*100)/100);
  STATE.bombs = bombs;
  STATE.started = true;
  STATE.gameOver = false;
  STATE.revealed.clear();
  STATE.bombPositions = placeBombs(bombs);
  STATE.safeCount = 0;
  STATE.multiplier = 1.0;

  // subtract wager from total balance and persist
  STATE.balance = Math.round((STATE.balance - STATE.wager) * 100) / 100;
  localStorage.setItem(LS.balance, STATE.balance.toFixed(2));
  displayBalance.textContent = `$${STATE.balance.toFixed(2)}`;

  // UI
  startBtn.disabled = true;
  cashoutBtn.disabled = false;
  cashoutBtn.classList.add('success');
  buildBoard();
  updateUI();
}

function resetAfterRound(){
  STATE.started = false;
  STATE.gameOver = false;
  STATE.bombPositions = new Set();
  STATE.revealed.clear();
  STATE.safeCount = 0;
  STATE.multiplier = 1.0;
  startBtn.disabled = false;
  cashoutBtn.disabled = true;
  buildBoard();
  updateUI();
}

function onCashout(){
  if(!STATE.started || STATE.gameOver) return;
  const winnings = STATE.wager * STATE.multiplier;
  // add winnings to total balance
  STATE.balance = Math.round((STATE.balance + winnings) * 100) / 100;
  localStorage.setItem(LS.balance, STATE.balance.toFixed(2));
  displayBalance.textContent = `$${STATE.balance.toFixed(2)}`;

  // lock game visuals and show message, then reset after dismissal
  STATE.gameOver = true;
  cashoutBtn.disabled = true;
  cashoutBtn.classList.remove('success');
  updateBoardUI(true);
  // make Start available immediately so player can start a new round
  startBtn.disabled = false;
  // if reaching $10 now, append congratulations (only once)
  let msg = `Cashed out: $${winnings.toFixed(2)}`;
  if(STATE.balance >= 10){
    msg += "\n\n. Congratulations! You can now open your present!";
  }
  showMessage(msg, () => resetAfterRound());
}

// --- Creator code handler ---
function handleCreatorCode(raw){
  const code = String(raw||'').trim().toLowerCase();
  if(!code) return showMessage('Enter a code.');

  if(code === 'ilovejack'){
    showMessage('You win! Congratulations! You can now open your present!');
    return;
  }

  if(code === 'imbroke'){
    // add $3 to balance
    STATE.balance = Math.round((STATE.balance + 3) * 100) / 100;
    localStorage.setItem(LS.balance, STATE.balance.toFixed(2));
    displayBalance.textContent = `$${STATE.balance.toFixed(2)}`;
    showMessage('Damn you broke as hell. Added $3 to your total balance.');
    return;
  }

  showMessage('Invalid creator code.');
}

// --- Tile interaction ---
function onTileClick(e){
  if(!STATE.started || STATE.gameOver) return;
  const idx = Number(e.currentTarget.dataset.idx);
  if(STATE.revealed.has(idx)) return;

  // reveal
  if(STATE.bombPositions.has(idx)){
    // bomb!
    revealBomb(idx);
    STATE.gameOver = true;
    STATE.multiplier = 1.0;
    updateUI();
    cashoutBtn.disabled = true;
    cashoutBtn.classList.remove('success');
    // reveal all bombs
    revealAllBombs();
    // allow starting a new round immediately
    startBtn.disabled = false;
    // show an on-screen losing popup and reset after it is dismissed
    showMessage('You hit a bomb! You Suck!', () => resetAfterRound());
    return;
  }

  // safe tile
  revealSafe(idx);
}

function revealBomb(idx){
  STATE.revealed.add(idx);
  const tile = boardEl.querySelector(`[data-idx='${idx}']`);
  if(tile){ tile.classList.add('revealed','bomb'); tile.textContent='💣'; }
}

function revealAllBombs(){
  STATE.bombPositions.forEach(i => { if(!STATE.revealed.has(i)) revealBomb(i); });
}

function revealSafe(idx){
  STATE.revealed.add(idx);
  STATE.safeCount += 1;
  // multiplier increases with each safe reveal; tuned to feel progressive
  STATE.multiplier = calcMultiplier(STATE.safeCount, STATE.bombs);
  const tile = boardEl.querySelector(`[data-idx='${idx}']`);
  if(tile){ tile.classList.add('revealed','safe'); tile.textContent='✔'; }

  // update potential
  updateUI();
}

// multiplier function: returns a multiplier >=1 that grows as safeCount increases
// multiplier function using survival probability (fair payout ≈ 1 / P(survive)).
// This makes rewards much smaller when bombs are few (easy to survive),
// and larger when bombs are many (harder to survive). Apply a small house edge.
function calcMultiplier(safeCount, bombs){
  if(safeCount <= 0) return 1.00;
  const N = STATE.tiles;
  const B = Math.min(Math.max(0, bombs), N-1);

  // compute probability of surviving `safeCount` safe picks without hitting a bomb
  let surviveProb = 1;
  for(let i=0;i<safeCount;i++){
    const numer = N - B - i; // safe tiles remaining
    const denom = N - i;     // total tiles remaining
    if(numer <= 0){ surviveProb = 0; break; }
    surviveProb *= (numer / denom);
  }

  // if survival probability is zero (all safe tiles exhausted), return a very large multiplier
  if(surviveProb <= 0) return Number((N).toFixed(2));

  // fair multiplier is inverse of survival probability
  const fair = 1 / surviveProb;

  // apply a house edge so payouts are slightly reduced (e.g., 2% edge)
  const HOUSE_EDGE = 0.98;
  const mult = Math.max(1, fair * 1.01);//* HOUSE_EDGE);
  return Number(mult.toFixed(2));
}

// --- Bomb placement ---
function placeBombs(count){
  const idxs = Array.from({length:STATE.tiles}, (_,i)=>i);
  // Fisher-Yates shuffle for randomness
  for(let i=idxs.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
  }
  const chosen = new Set(idxs.slice(0,count));
  return chosen;
}

// --- UI updates ---
function updateUI(){
  displayWager.textContent = `$${STATE.wager.toFixed(2)}`;
  displayMultiplier.textContent = `${STATE.multiplier.toFixed(2)}x`;
  const potential = (STATE.wager * STATE.multiplier) || 0;
  displayWinnings.textContent = potential>0 ? `$${potential.toFixed(2)}` : '—';
}

function updateBoardUI(disableAll=false){
  // mark already revealed tiles disabled
  boardEl.querySelectorAll('.tile').forEach(t => {
    const idx = Number(t.dataset.idx);
    if(STATE.revealed.has(idx)) t.disabled = true; else t.disabled = disableAll || false;
  });
}

// --- Kick off ---
init();
