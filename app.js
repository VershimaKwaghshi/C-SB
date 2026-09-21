/**
 * C&SB Platform Architecture Engine
 */

const state = {
  companyRevenue: 0,
  interceptPool: 0,
  ledger: [],
  txCounter: 2001,

  // User Purchased Account State
  account: null,

  // Managed Expansion Accounts (Up to 5)
  expansionAccounts: [],

  // Active Social Bond State
  sb: {
    active: false,
    facilitatorAdvanced: 0,
    lienPerBonder: 0,
    recoveryTarget: 0,
    recoveredAmount: 0
  },

  // 10 Network Bonders
  bonders: Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    name: `Bonder ${i + 1}`,
    equity: 6000, // Qualified (> $5,000)
    lien: 0
  }))
};

const elements = {
  sysRevenue: document.getElementById('sys-revenue'),
  sysEquity: document.getElementById('sys-equity'),
  sysLiens: document.getElementById('sys-liens'),
  sysIntercept: document.getElementById('sys-intercept'),

  capitalForm: document.getElementById('capital-form'),
  userName: document.getElementById('user-name'),
  accountPrice: document.getElementById('account-price'),
  purchaseType: document.getElementById('purchase-type'),
  capitalStatus: document.getElementById('capital-status'),
  installmentPayAmt: document.getElementById('installment-pay-amt'),
  btnPayInstallment: document.getElementById('btn-pay-installment'),

  managementStatus: document.getElementById('management-status'),
  btnAssignSubmanager: document.getElementById('btn-assign-submanager'),
  tradePct: document.getElementById('trade-pct'),
  btnRunTrade: document.getElementById('btn-run-trade'),

  sbStatus: document.getElementById('sb-status'),
  btnTriggerSb: document.getElementById('btn-trigger-sb'),
  btnExpireSb: document.getElementById('btn-expire-sb'),

  interceptSource: document.getElementById('intercept-source'),
  interceptAmount: document.getElementById('intercept-amount'),
  btnProcessIntercept: document.getElementById('btn-process-intercept'),
  interceptStatus: document.getElementById('intercept-status'),

  bondersList: document.getElementById('bonders-list'),
  ledgerRows: document.getElementById('ledger-rows')
};

function init() {
  setupEventListeners();
  render();
}

function recordLedger(src, dst, amt, desc) {
  const entry = {
    txId: `TX-${state.txCounter++}`,
    timestamp: new Date().toLocaleTimeString(),
    src,
    dst,
    amt: parseFloat(amt).toFixed(2),
    desc
  };
  state.ledger.unshift(entry);
}

function setupEventListeners() {
  // 1. Purchase Account & Assign Random Manager
  elements.capitalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const targetSize = parseFloat(elements.accountPrice.value);
    const method = elements.purchaseType.value;
    const initialPaid = method === 'direct' ? targetSize : targetSize * 0.25;

    state.account = {
      traderName: elements.userName.value,
      baseline: targetSize,
      equity: targetSize,
      totalPaid: initialPaid,
      isFullyPaid: method === 'direct',
      managerAssigned: `Manager_${Math.floor(100 + Math.random() * 900)}`,
      subManagerAssigned: null,
      method: method
    };

    // Auto-assign reciprocal account for management
    state.expansionAccounts = [{
      id: "RECIPROCAL-1",
      baseline: targetSize,
      equity: targetSize,
      subManager: null
    }];

    state.companyRevenue += initialPaid;
    recordLedger('TRADER', 'C&SB_TREASURY', initialPaid, `Account Purchase (${method.toUpperCase()})`);
    recordLedger('SYSTEM', 'PARTNER_BROKER', targetSize, `Random Manager ${state.account.managerAssigned} Enforced`);

    render();
  });

  // 2. Installment Payments
  elements.btnPayInstallment.addEventListener('click', () => {
    if (!state.account || state.account.isFullyPaid) return;

    const payment = parseFloat(elements.installmentPayAmt.value);
    state.account.totalPaid += payment;
    state.companyRevenue += payment;

    recordLedger('TRADER', 'C&SB_TREASURY', payment, 'Installment Payment Received');

    if (state.account.totalPaid >= state.account.baseline) {
      state.account.isFullyPaid = true;
      recordLedger('C&SB_TREASURY', 'TRADER', 0, '90-Day Contract Fully Paid. Principal Lock Lifted.');
    }

    render();
  });

  // 3. Delegate to Sub-Manager
  elements.btnAssignSubmanager.addEventListener('click', () => {
    if (!state.account) return;
    state.account.subManagerAssigned = `SubManager_${Math.floor(1000 + Math.random() * 9000)}`;
    recordLedger('MANAGER', state.account.subManagerAssigned, 0, 'Delegated Account to Sub-Manager (25/25/50 Split)');
    render();
  });

  // 4. Simulate Market Execution & 50% Drawdown Trigger
  elements.btnRunTrade.addEventListener('click', () => {
    if (!state.account) return;
    const pct = parseFloat(elements.tradePct.value) / 100;
    const change = state.account.equity * pct;
    state.account.equity += change;

    recordLedger('MARKET', 'ACCOUNT_EQUITY', change, `Trading Results Execution (${pct * 100}%)`);

    if (state.account.equity <= (state.account.baseline * 0.50)) {
      recordLedger('PARTNER_BROKER', 'SYSTEM', 0, `50% Drawdown Triggered! ${state.account.managerAssigned} Removed.`);
    }

    render();
  });

  // 5. Activate Social Bond (SB) Credit Facility
  elements.btnTriggerSb.addEventListener('click', () => {
    if (!state.account || state.sb.active) return;

    const sbAmount = state.account.baseline * 0.50; // $5,000 on $10,000
    const facilitatorReturn = sbAmount * 0.08; // 8% = $400
    const bonderTotalFee = sbAmount * 0.08;      // 8% total = $400 ($40 per bonder)
    const companyFee = sbAmount * 0.04;          // 4% = $200

    state.sb.active = true;
    state.sb.facilitatorAdvanced = sbAmount;
    state.sb.lienPerBonder = sbAmount * 0.10; // 10% lien = $500
    state.sb.recoveryTarget = sbAmount;
    state.sb.recoveredAmount = 0;

    state.account.equity += sbAmount; // Restore account to 100% equity
    state.companyRevenue += companyFee;

    const feePerBonder = bonderTotalFee / 10;
    state.bonders.forEach(b => {
      b.lien = state.sb.lienPerBonder;
      b.equity += feePerBonder; // Earn 0.8% return
    });

    recordLedger('FACILITATOR', 'ACCOUNT_EQUITY', sbAmount, 'Social Bond Credit Advanced (50% Restored)');
    recordLedger('ACCOUNT_EQUITY', 'FACILITATOR', facilitatorReturn, 'Facilitator Return (8%)');
    recordLedger('ACCOUNT_EQUITY', 'BONDERS_POOL', bonderTotalFee, 'Bonder Earnings Dispersal (0.8% each)');
    recordLedger('ACCOUNT_EQUITY', 'C&SB_REVENUE', companyFee, 'Protocol Facilitation Fee (4%)');

    render();
  });

  // 6. Expire 30-Day SB Window
  elements.btnExpireSb.addEventListener('click', () => {
    if (!state.sb.active) return;

    const unrecovered = state.sb.recoveryTarget - state.sb.recoveredAmount;

    if (unrecovered > 0) {
      // Settle using account collateral first, then bonder liens as fallback
      const liquidFromCollateral = Math.min(state.account.equity, unrecovered);
      state.account.equity -= liquidFromCollateral;
      
      const remainingUncovered = unrecovered - liquidFromCollateral;
      if (remainingUncovered > 0) {
        const liquidationPerBonder = remainingUncovered / 10;
        state.bonders.forEach(b => {
          b.equity -= liquidationPerBonder;
          b.lien = 0;
        });
        recordLedger('BONDERS_POOL', 'FACILITATOR', remainingUncovered, '30-Day Window Expired: Liquidated Bonder Liens');
      }
      recordLedger('ACCOUNT_COLLATERAL', 'FACILITATOR', liquidFromCollateral, '30-Day Window Expired: Liquidated Account Collateral');
    } else {
      state.bonders.forEach(b => b.lien = 0);
      recordLedger('SYSTEM', 'BONDERS_POOL', 0, 'Social Bond Settled. Bonder Liens Fully Released.');
    }

    state.sb.active = false;
    render();
  });

  // 7. Multi-Channel Revenue Intercept
  elements.btnProcessIntercept.addEventListener('click', () => {
    if (!state.sb.active) return;

    const amt = parseFloat(elements.interceptAmount.value);
    const source = elements.interceptSource.value;

    state.sb.recoveredAmount += amt;
    state.interceptPool += amt;

    recordLedger(`OFFENDING_MANAGER:${source}`, 'INTERCEPT_POOL', amt, '100% Revenue Stream Intercepted');

    if (state.sb.recoveredAmount >= state.sb.recoveryTarget) {
      state.sb.active = false;
      state.bonders.forEach(b => b.lien = 0);
      recordLedger('INTERCEPT_POOL', 'ACCOUNT_OWNER', state.sb.recoveryTarget, 'Account 100% Restored via Intercept. SB Event Closed.');
    }

    render();
  });
}

function render() {
  elements.sysRevenue.textContent = `$${state.companyRevenue.toFixed(2)}`;
  elements.sysEquity.textContent = state.account ? `$${state.account.equity.toFixed(2)}` : '$0.00';
  
  const totalLiens = state.bonders.reduce((acc, b) => acc + b.lien, 0);
  elements.sysLiens.textContent = `$${totalLiens.toFixed(2)}`;
  elements.sysIntercept.textContent = `$${state.interceptPool.toFixed(2)}`;

  if (!state.account) {
    elements.capitalStatus.textContent = "No active purchase.";
    elements.managementStatus.textContent = "No reciprocal assigned accounts.";
    elements.btnPayInstallment.disabled = true;
    elements.btnAssignSubmanager.disabled = true;
    elements.btnRunTrade.disabled = true;
  } else {
    elements.btnPayInstallment.disabled = state.account.isFullyPaid;
    elements.btnAssignSubmanager.disabled = state.account.subManagerAssigned !== null;
    elements.btnRunTrade.disabled = false;

    let withdrawable = state.account.isFullyPaid 
      ? state.account.equity 
      : Math.max(0, state.account.equity - state.account.baseline);

    elements.capitalStatus.innerHTML = `
      <strong>Trader Name:</strong> ${state.account.traderName}<br>
      <strong>Account Size:</strong> $${state.account.baseline.toFixed(2)}<br>
      <strong>Payment Progress:</strong> $${state.account.totalPaid.toFixed(2)} / $${state.account.baseline.toFixed(2)}<br>
      <strong>Status:</strong> ${state.account.isFullyPaid ? '<span style="color:#16a34a">PURCHASE COMPLETE (Full Access)</span>' : '<span style="color:#d97706">INSTALLMENT (Profits Withdrawable)</span>'}<br>
      <strong>Current Equity:</strong> $${state.account.equity.toFixed(2)}<br>
      <strong>Withdrawable Funds:</strong> $${withdrawable.toFixed(2)}
    `;

    elements.managementStatus.innerHTML = `
      <strong>Assigned Manager:</strong> ${state.account.managerAssigned} (Randomized)<br>
      <strong>Sub-Manager Status:</strong> ${state.account.subManagerAssigned || 'None (Direct Management)'}<br>
      <strong>Reciprocal Account Assigned:</strong> Yes ($${state.account.baseline.toFixed(2)})
    `;
  }

  if (!state.account) {
    elements.sbStatus.textContent = "Funded account required.";
    elements.btnTriggerSb.disabled = true;
    elements.btnExpireSb.disabled = true;
  } else {
    const isFiftyPctDrawdown = state.account.equity <= (state.account.baseline * 0.50);
    elements.btnTriggerSb.disabled = !isFiftyPctDrawdown || state.sb.active;
    elements.btnExpireSb.disabled = !state.sb.active;

    if (state.sb.active) {
      elements.sbStatus.innerHTML = `
        <strong style="color:#d97706">ACTIVE SOCIAL BOND (30-DAY WINDOW)</strong><br>
        <strong>Facilitator Liquidity:</strong> $${state.sb.facilitatorAdvanced.toFixed(2)}<br>
        <strong>Lien per Bonder (10):</strong> $${state.sb.lienPerBonder.toFixed(2)}<br>
        <strong>Intercept Recovery Progress:</strong> $${state.sb.recoveredAmount.toFixed(2)} / $${state.sb.recoveryTarget.toFixed(2)}
      `;
    } else if (isFiftyPctDrawdown) {
      elements.sbStatus.innerHTML = `<strong style="color:#dc2626">50% Drawdown Breach! Manager Removed. SB Activation Ready.</strong>`;
    } else {
      elements.sbStatus.textContent = "Account equity operational. SB trigger inactive.";
    }
  }

  elements.btnProcessIntercept.disabled = !state.sb.active;
  if (state.sb.active) {
    elements.interceptStatus.innerHTML = `Intercepting offending manager earnings channels. Unrecovered: $${(state.sb.recoveryTarget - state.sb.recoveredAmount).toFixed(2)}`;
  } else {
    elements.interceptStatus.textContent = "Intercept engine idle.";
  }

  elements.bondersList.innerHTML = state.bonders.map(b => `
    <div class="bonder-card ${b.lien > 0 ? 'lien-active' : ''}">
      <strong>${b.name}</strong><br>
      Account Equity: $${b.equity.toFixed(2)}<br>
      Active Lien: <span style="color:${b.lien > 0 ? '#d97706' : '#94a3b8'}">$${b.lien.toFixed(2)}</span>
    </div>
  `).join('');

  elements.ledgerRows.innerHTML = state.ledger.map(row => `
    <tr>
      <td>${row.txId}</td>
      <td>${row.timestamp}</td>
      <td>${row.src}</td>
      <td>${row.dst}</td>
      <td>$${row.amt}</td>
      <td>${row.desc}</td>
    </tr>
  `).join('');
}

document.addEventListener('DOMContentLoaded', init);
