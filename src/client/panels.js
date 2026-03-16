// panels.js
// UI panels: Trade, Cargo Hold, Trade Ledger

import { CARGO_TYPES } from './economy.js';

// ── Panel state ──
let activePanel = null; // null | 'trade' | 'cargo' | 'ledger'
let tradeScroll = 0;
let ledgerSort = 'name'; // 'name' | 'buyPrice' | 'sellPrice' | 'profit'
let ledgerSortDir = 1;
let ledgerFilter = ''; // cargo category filter
let tradeMessage = null; // { text, color, timer }

export function getActivePanel() { return activePanel; }

export function togglePanel(name) {
  activePanel = activePanel === name ? null : name;
  tradeScroll = 0;
}

export function closePanel() { activePanel = null; }

export function cycleLedgerSort() {
  const sorts = ['name', 'buyPrice', 'sellPrice', 'profit'];
  const idx = sorts.indexOf(ledgerSort);
  ledgerSort = sorts[(idx + 1) % sorts.length];
}

export function toggleLedgerDirection() {
  ledgerSortDir *= -1;
}

export function cycleLedgerFilter() {
  const cats = ['', 'consumables', 'materials', 'tech', 'contraband'];
  const idx = cats.indexOf(ledgerFilter);
  ledgerFilter = cats[(idx + 1) % cats.length];
}

function showTradeMessage(text, color = '#000') {
  tradeMessage = { text, color, timer: 2.5 };
}

// ── Trade actions ──
export function buyFromStation(ship, item, qty = 1) {
  if (!ship.docked || !ship.dockedAt) return;
  const market = ship.dockedAt.market;
  const entry = market.find(m => m.cargoId === item.cargoId);
  if (!entry || entry.stock < qty) { showTradeMessage('Out of stock!', '#e33'); return; }
  const cost = entry.buyPrice * qty;
  if (ship.credits < cost) { showTradeMessage('Not enough credits!', '#e33'); return; }
  if (ship.cargoFree() < qty) { showTradeMessage('Cargo hold full!', '#e33'); return; }
  ship.credits -= cost;
  ship.addCargo(item.cargoId, qty);
  entry.stock -= qty;
  showTradeMessage(`Bought ${qty}x ${item.name} for ${cost} SU`, '#2a2');
}

export function sellToStation(ship, cargoId, qty = 1) {
  if (!ship.docked || !ship.dockedAt) return;
  const market = ship.dockedAt.market;
  const entry = market.find(m => m.cargoId === cargoId);
  if (!entry) { showTradeMessage('Station doesn\'t trade this!', '#e33'); return; }
  if ((ship.cargo[cargoId] || 0) < qty) { showTradeMessage('Not enough cargo!', '#e33'); return; }
  const revenue = entry.sellPrice * qty;
  ship.credits += revenue;
  ship.removeCargo(cargoId, qty);
  entry.demand = Math.max(0, entry.demand - qty);
  showTradeMessage(`Sold ${qty}x ${entry.name} for ${revenue} SU`, '#2a2');
}

// ── Draw panels ──
export function drawPanels(ctx, ship, pois) {
  if (tradeMessage) {
    tradeMessage.timer -= 1 / 60;
    if (tradeMessage.timer <= 0) tradeMessage = null;
  }

  if (activePanel === 'trade') drawTradePanel(ctx, ship);
  else if (activePanel === 'cargo') drawCargoPanel(ctx, ship);
  else if (activePanel === 'ledger') drawLedgerPanel(ctx, ship, pois);
}

// ── Shared panel frame ──
function drawPanelFrame(ctx, title, w, h) {
  const x = (ctx.canvas.width - w) / 2;
  const y = (ctx.canvas.height - h) / 2;
  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = '#f8f8f8';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  // Title bar
  ctx.fillStyle = '#333';
  ctx.fillRect(x, y, w, 30);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(title, x + 10, y + 20);
  // Close hint
  ctx.fillStyle = '#aaa';
  ctx.font = '11px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('[ESC] close', x + w - 10, y + 20);
  ctx.textAlign = 'left';
  ctx.restore();
  return { x, y: y + 35 }; // content origin
}

// ── Trade Panel (docked at station) ──
function drawTradePanel(ctx, ship) {
  if (!ship.docked || !ship.dockedAt || !ship.dockedAt.market) {
    activePanel = null;
    return;
  }
  const market = ship.dockedAt.market;
  const W = 560, H = Math.min(50 + market.length * 28 + 80, ctx.canvas.height - 40);
  const { x, y } = drawPanelFrame(ctx, `Trade — ${ship.dockedAt.name}`, W, H);

  ctx.save();
  ctx.font = '12px monospace';

  // Credits
  ctx.fillStyle = '#000';
  ctx.fillText(`Credits: ${ship.credits} SU`, x + 10, y + 5);
  ctx.fillText(`Cargo: ${ship.cargoUsed()}/${ship.cargoCapacity} SU`, x + 250, y + 5);

  // Header
  const hY = y + 25;
  ctx.fillStyle = '#666';
  ctx.fillText('Cargo', x + 10, hY);
  ctx.fillText('Buy', x + 200, hY);
  ctx.fillText('Sell', x + 260, hY);
  ctx.fillText('Stock', x + 320, hY);
  ctx.fillText('Demand', x + 380, hY);
  ctx.fillText('Actions', x + 450, hY);

  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(x + 5, hY + 5); ctx.lineTo(x + W - 10, hY + 5); ctx.stroke();

  // Rows
  market.forEach((item, i) => {
    const rY = hY + 20 + i * 26;
    if (rY > y + H - 50) return;

    // Selection highlight
    if (i === tradeSelectedIndex) {
      ctx.fillStyle = 'rgba(0,100,200,0.1)';
      ctx.fillRect(x + 5, rY - 14, W - 10, 22);
      ctx.fillStyle = '#06a';
      ctx.fillText('▶', x - 2, rY);
    }

    ctx.fillStyle = i === tradeSelectedIndex ? '#06a' : '#000';
    ctx.font = '12px monospace';
    ctx.fillText(item.name, x + 10, rY);
    ctx.fillText(`${item.buyPrice}`, x + 200, rY);
    ctx.fillText(`${item.sellPrice}`, x + 260, rY);
    ctx.fillStyle = item.stock > 0 ? '#2a2' : '#e33';
    ctx.fillText(`${item.stock}`, x + 320, rY);
    ctx.fillStyle = item.demand > 0 ? '#28a' : '#999';
    ctx.fillText(`${item.demand}`, x + 380, rY);

    // Buy/Sell tags
    ctx.font = '11px monospace';
    if (item.stock > 0 && ship.credits >= item.buyPrice && ship.cargoFree() > 0) {
      ctx.fillStyle = '#2a2';
      ctx.fillText('[B]uy', x + 450, rY);
    }
    const have = ship.cargo[item.cargoId] || 0;
    if (have > 0) {
      ctx.fillStyle = '#c40';
      ctx.fillText('[S]ell', x + 500, rY);
    }
  });

  // Trade message
  if (tradeMessage) {
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = tradeMessage.color;
    ctx.fillText(tradeMessage.text, x + 10, y + H - 45);
  }

  // Instructions
  ctx.font = '11px monospace';
  ctx.fillStyle = '#888';
  ctx.fillText('[↑↓] select  [B] buy  [S] sell  [ESC] close', x + 10, y + H - 25);

  ctx.restore();
}

// ── Cargo Hold Panel ──
function drawCargoPanel(ctx, ship) {
  const entries = Object.entries(ship.cargo);
  const W = 400, H = Math.max(180, 70 + entries.length * 24 + 50);
  const { x, y } = drawPanelFrame(ctx, 'Cargo Hold', W, H);

  ctx.save();
  ctx.font = '13px monospace';
  ctx.fillStyle = '#000';
  ctx.fillText(`Capacity: ${ship.cargoUsed()} / ${ship.cargoCapacity} SU`, x + 10, y + 5);
  ctx.fillText(`Credits: ${ship.credits} SU`, x + 250, y + 5);

  // Capacity bar
  const barW = W - 30;
  const barH = 10;
  const bx = x + 10, by = y + 20;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx, by, barW, barH);
  const pct = ship.cargoUsed() / ship.cargoCapacity;
  ctx.fillStyle = pct > 0.9 ? '#e33' : pct > 0.7 ? '#da0' : '#2a2';
  ctx.fillRect(bx + 1, by + 1, (barW - 2) * pct, barH - 2);

  if (entries.length === 0) {
    ctx.fillStyle = '#999';
    ctx.font = '12px monospace';
    ctx.fillText('Cargo hold is empty', x + 10, y + 55);
  } else {
    // Header
    ctx.fillStyle = '#666';
    ctx.font = '11px monospace';
    ctx.fillText('Item', x + 10, y + 50);
    ctx.fillText('Qty', x + 250, y + 50);
    ctx.fillText('Base Value', x + 310, y + 50);

    entries.forEach(([id, qty], i) => {
      const info = CARGO_TYPES.find(c => c.id === id);
      const rY = y + 70 + i * 24;
      ctx.fillStyle = '#000';
      ctx.font = '12px monospace';
      ctx.fillText(info ? info.name : id, x + 10, rY);
      ctx.fillText(`${qty}`, x + 250, rY);
      ctx.fillStyle = '#666';
      ctx.fillText(info ? `~${info.basePrice * qty} SU` : '?', x + 310, rY);
    });
  }

  ctx.font = '11px monospace';
  ctx.fillStyle = '#888';
  ctx.fillText('[I] toggle  [ESC] close', x + 10, y + H - 45);
  ctx.restore();
}

// ── Trade Ledger Panel (nearby stations) ──
function drawLedgerPanel(ctx, ship, pois) {
  const W = 620, H = 440;
  const { x, y } = drawPanelFrame(ctx, 'Trade Ledger — Nearby Stations', W, H);

  const stations = pois
    .filter(p => p.type === 'station' && p.market)
    .map(st => ({ ...st, dist: ship.distanceTo(st) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 6);

  ctx.save();
  ctx.font = '11px monospace';

  // Sort/filter controls
  ctx.fillStyle = '#666';
  ctx.fillText(`Sort: ${ledgerSort} ${ledgerSortDir > 0 ? '▲' : '▼'}  [L] cycle sort  [K] direction  [;] filter: ${ledgerFilter || 'all'}`, x + 10, y + 5);

  let rowY = y + 25;

  stations.forEach(st => {
    const distAU = (st.dist / 1e6).toFixed(2);
    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`${st.name}  (${distAU} AU)`, x + 10, rowY);
    rowY += 16;

    // Column headers
    ctx.fillStyle = '#888';
    ctx.font = '10px monospace';
    ctx.fillText('Cargo', x + 20, rowY);
    ctx.fillText('Buy', x + 220, rowY);
    ctx.fillText('Sell', x + 280, rowY);
    ctx.fillText('Stock', x + 340, rowY);
    ctx.fillText('Demand', x + 400, rowY);
    ctx.fillText('Profit/u', x + 470, rowY);
    rowY += 4;

    let items = [...st.market];

    // Filter
    if (ledgerFilter) {
      items = items.filter(m => {
        const info = CARGO_TYPES.find(c => c.id === m.cargoId);
        return info && info.category === ledgerFilter;
      });
    }

    // Sort
    items.sort((a, b) => {
      if (ledgerSort === 'name') return a.name.localeCompare(b.name) * ledgerSortDir;
      if (ledgerSort === 'buyPrice') return (a.buyPrice - b.buyPrice) * ledgerSortDir;
      if (ledgerSort === 'sellPrice') return (a.sellPrice - b.sellPrice) * ledgerSortDir;
      if (ledgerSort === 'profit') return ((a.sellPrice - a.buyPrice) - (b.sellPrice - b.buyPrice)) * ledgerSortDir;
      return 0;
    });

    items.forEach(item => {
      if (rowY > y + H - 30) return;
      rowY += 14;
      ctx.fillStyle = '#000';
      ctx.font = '11px monospace';
      ctx.fillText(item.name, x + 20, rowY);
      ctx.fillText(`${item.buyPrice}`, x + 220, rowY);
      ctx.fillText(`${item.sellPrice}`, x + 280, rowY);
      ctx.fillText(`${item.stock}`, x + 340, rowY);
      ctx.fillText(`${item.demand}`, x + 400, rowY);

      const profit = item.sellPrice - item.buyPrice;
      ctx.fillStyle = profit > 0 ? '#2a2' : profit < 0 ? '#e33' : '#999';
      ctx.fillText(`${profit > 0 ? '+' : ''}${profit}`, x + 470, rowY);
    });

    rowY += 12;
  });

  if (stations.length === 0) {
    ctx.fillStyle = '#999';
    ctx.font = '12px monospace';
    ctx.fillText('No stations with markets found nearby', x + 10, y + 50);
  }

  ctx.font = '11px monospace';
  ctx.fillStyle = '#888';
  ctx.fillText('[L] sort  [K] direction  [;] filter  [ESC] close', x + 10, y + H - 40);
  ctx.restore();
}

// ── Trade panel interaction (keyboard) ──
let tradeSelectedIndex = 0;

export function handleTradeKey(code, ship) {
  if (activePanel !== 'trade' || !ship.docked || !ship.dockedAt) return false;
  const market = ship.dockedAt.market;
  if (!market || market.length === 0) return false;

  if (code === 'ArrowUp') {
    tradeSelectedIndex = Math.max(0, tradeSelectedIndex - 1);
    return true;
  }
  if (code === 'ArrowDown') {
    tradeSelectedIndex = Math.min(market.length - 1, tradeSelectedIndex + 1);
    return true;
  }
  if (code === 'KeyB') {
    buyFromStation(ship, market[tradeSelectedIndex], 1);
    return true;
  }
  if (code === 'KeyS') {
    const item = market[tradeSelectedIndex];
    sellToStation(ship, item.cargoId, 1);
    return true;
  }
  return false;
}

export function getTradeSelectedIndex() { return tradeSelectedIndex; }
