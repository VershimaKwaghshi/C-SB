/**
 * C&SB Architecture & Revenue Platform Simulation Engine
 */

const state = {
  // C&SB Revenue Channels
  revenue: {
    serviceCharge: 0, // 1% on purchase
    withdrawFee: 0,   // 15% on withdrawals
    brokerRebate: 0,  // $12 per lot
    sbProtocolFee: 0  // 6% on SB
  },

  ledger: [],
  txCounter: 3001,

  // Active Trader Account State
  account: null,

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
    equity: 7000,
    lien: 0
  }))
};

const elements = {
  revService: document.getElementById('rev-service'),
  revWithdraw: document.getElementById('rev-withdraw'),
  revRebate: document.getElementById('rev-rebate'),
  revSb: document.getElementById('rev-sb'),

  capitalForm: document.getElementById('capital-form'),
  userName: document.getElementById('user-name'),
  accountPrice: document.getElementById('account-price'),
  purchaseType: document.getElementById('purchase-type'),
  capitalStatus: document.getElementById('capital-status'),
  installmentPayAmt: document.getElementById('installment-pay-amt'),
  btnPayInstallment: document.getElementById('btn-pay-installment'),
  withdrawAmt: document.getElementById('withdraw-amt'),
  btnWithdraw: document.getElementById('btn-withdraw'),

  managementStatus: document.getElementById('management-status'),
  lotsTraded: document.getElementById('lots-traded'),
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
  // 1. Account Purchase (1% Service Charge Included)
  elements.capitalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const baseSize = parseFloat(elements.accountPrice.value);
    const serviceFee = baseSize * 0.01; // 1% service charge
    const totalCost = baseSize + serviceFee;
    const method = elements.purchaseType.value;
    const initialPaid = method === 'direct' ? totalCost : totalCost * 0.25;

    state.account = {
      traderName: elements.userName.value,
      baseline: baseSize,
      equity: baseSize,
      totalCost: totalCost,
      totalPaid: initialPaid,
      isFullyPaid: method === 'direct',
      managerAssigned: `Manager_${Math.floor(100 + Math.random() * 900)}`
    };

    state.revenue.serviceCharge += serviceFee;
    recordLedger('TRADER', 'C&SB_TREASURY', initialPaid, `Account Purchase (${method.toUpperCase()}). Includes 1% Service Fee.`);
    recordLedger('SYSTEM', 'PARTNER_BROKER', baseSize, `Enforced Random Manager ${state.account.managerAssigned}`);

    render();
  });

  // 2. Process Installments
  elements.btnPayInstallment.addEventListener('click', () => {
    if (!state.account || state.account.isFullyPaid) return;

    const payment = parseFloat(elements.installmentPayAmt.value);
    state.account.totalPaid += payment;

    recordLedger('TRADER', 'C&SB_TREASURY', payment, 'Installment Payment Received');

    if (state.account.totalPaid >= state.account.totalCost) {
      state.account.isFullyPaid = true;
      recordLedger('C&SB_TREASURY', 'TRADER', 0, 'Purchase Completed. Principal Account Unlocked.');
    }

    render();
  });

  // 3. Withdraw Profits (15% Fee)
  elements.btnWithdraw.addEventListener('click', () => {
    if (!state.account) return;
    const reqAmt = parseFloat(elements.withdrawAmt.value);
    const withdrawable = state.account.isFullyPaid 
      ? state.account.equity 
      : Math.max(0, state.account.equity - state.account.baseline);

    if (reqAmt > withdrawable) return;

    const withdrawFee = reqAmt * 0.15; // 15% withdrawal fee
    const netPayout = reqAmt - withdrawFee;

    state.account.equity -= reqAmt;
    state.revenue.withdrawFee += withdrawFee;

    recordLedger('ACCOUNT_EQUITY', 'C&SB_REVENUE', withdrawFee, '15% Withdrawal Fee Deducted');
    recordLedger('ACCOUNT_EQUITY', 'TRADER_BANK', netPayout, 'Net Profit Withdrawal Dispatched');

    render();
  });

  // 4. Trade Execution & Rebates ($12/lot)
  elements.btnRunTrade.addEventListener('click', () => {
    if (!state.account) return;
    const lots = parseFloat(elements.lotsTraded.value);
    const pct = parseFloat(elements.tradePct.value) / 100;
    
    // Calculate Broker Rebate ($12 per lot)
    const rebate = lots * 12;
    state.revenue.brokerRebate += rebate;
    recordLedger('BROKER_PARTNER', 'C&SB_REVENUE', rebate, `Brokerage Rebate Earned (${lots} lots @ $12/lot)`);

    // Execute Trade Loss/Profit
    const change = state.account.equity * pct;
    state.account.equity += change;
    recordLedger('MARKET', 'ACCOUNT_EQUITY', change, `Trade Execution (${pct * 100}%)`);

    if (state.account.equity <= (state.account.baseline * 0.50)) {
      recordLedger('PARTNER_BROKER', 'SYSTEM', 0, `50% Drawdown Limit Breached! Offending Manager Removed.`);
    }

    render();
  });

  // 5. Trigger Social Bond (SB) Credit (6% Fee to C&SB)
  elements.btnTriggerSb.addEventListener('click', () => {
    if (!state.account || state.sb.active) return;

    const sbAmount = state.account.baseline * 0.50; // $5,000 credit
    const facilitatorReturn = sbAmount * 0.08;      // 8% to Facilitator
    const bonderTotalFee = sbAmount * 0.08;          // 0.8% x 10 = 8% total
    const csbFee = sbAmount * 0.06;                  // 6% to C&SB Protocol

    state.sb.active = true;
    state.sb.facilitatorAdvanced = sbAmount;
    state.sb.lienPerBonder = sbAmount * 0.10;
    state.sb.recoveryTarget = sbAmount;
    state.sb.recoveredAmount = 0;

    state.account.equity += sbAmount; // Account equity restored to 100%
    state.revenue.sbProtocolFee += csbFee;

    const feePerBonder = bonderTotalFee / 10;
    state.bonders.forEach(b => {
      b.lien = state.sb.lienPerBonder;
      b.equity += feePerBonder; // Earn 0.8% return
    });

    recordLedger('FACILITATOR', 'ACCOUNT_EQUITY', sbAmount, 'Social Bond Capital Dispatched');
    recordLedger('ACCOUNT_EQUITY', 'FACILITATOR', facilitatorReturn, 'Facilitator Return (8%)');
    recordLedger('ACCOUNT_EQUITY', 'BONDERS_POOL', bonderTotalFee, 'Bonder Dispersal (0.8% each)');
    recordLedger('ACCOUNT_EQUITY', 'C&SB_REVENUE', csbFee, 'C&SB SB Protocol Fee (6%)');

    render();
  });

  // 6. Expire 30-Day Window
  elements.btnExpireSb.addEventListener('click', () => {
    if (!state.sb.active) return;

    const unrecovered = state.sb.recoveryTarget - state.sb.recoveredAmount;

    if (unrecovered > 0) {
      const liquidCollateral = Math.min(state.account.equity, unrecovered);
      state.account.equity -= liquidCollateral;
      
      const unrecoveredBalance = unrecovered - liquidCollateral;
      if (unrecoveredBalance > 0) {
        const bonderLiq = unrecoveredBalance / 10;
        state.bonders.forEach(b => {
          b.equity -= bonderLiq;
          b.lien = 0;
        });
        recordLedger('BONDERS_POOL', 'FACILITATOR', unrecoveredBalance, '30-Day Contract Expired: Executed Bonder Liens');
      }
      recordLedger('ACCOUNT_COLLATERAL', 'FACILITATOR', liquidCollateral, '30-Day Contract Expired: Liquidated Account Collateral');
    } else {
      state.bonders.forEach(b => b.lien = 0);
      recordLedger('SYSTEM', 'BONDERS_POOL', 0, '30-Day Contract Settled. Liens Released.');
    }

    state.sb.active = false;
    render();
  });

  // 7. Process Multi-Channel Intercept
  elements.btnProcessIntercept.addEventListener('click', () => {
    if (!state.sb.active) return;

    const amt = parseFloat(elements.interceptAmount.value);
    const channel = elements.interceptSource.value;

    state.sb.recoveredAmount += amt;

    recordLedger(`OFFENDING_MANAGER:${channel}`, 'ACCOUNT_OWNER', amt, '100% Intercepted Revenue Dispatched to Trader');

    if (state.sb.recoveredAmount >= state.sb.recoveryTarget) {
      state.sb.active = false;
      state.bonders.forEach(b => b.lien = 0);
      recordLedger('INTERCEPT_ENGINE', 'SYSTEM', 0, 'Full Recovery Achieved. SB Event Completed.');
    }

    render();
  });
}

function render() {
  elements.revService.textContent = `$${state.revenue.serviceCharge.toFixed(2)}`;
  elements.revWithdraw.textContent = `$${state.revenue.withdrawFee.toFixed(2)}`;
  elements.revRebate.textContent = `$${state.revenue.brokerRebate.toFixed(2)}`;
  elements.revSb.textContent = `$${state.revenue.sbProtocolFee.toFixed(2)}`;

  if (!state.account) {
    elements.capitalStatus.textContent = "No active purchase.";
    elements.managementStatus.textContent = "No accounts active.";
    elements.btnPayInstallment.disabled = true;
    elements.btnWithdraw.disabled = true;
    elements.btnRunTrade.disabled = true;
  } else {
    elements.btnPayInstallment.disabled = state.account.isFullyPaid;
    
    const withdrawable = state.account.isFullyPaid 
      ? state.account.equity 
      : Math.max(0, state.account.equity - state.account.baseline);
    
    elements.btnWithdraw.disabled = withdrawable <= 0;
    elements.btnRunTrade.disabled = false;

    elements.capitalStatus.innerHTML = `
      <strong>Trader Name:</strong> ${state.account.traderName}<br>
      <strong>Account Base Capital:</strong> $${state.account.baseline.toFixed(2)}<br>
      <strong>Total Price (Incl. 1% Fee):</strong> $${state.account.totalCost.toFixed(2)}<br>
      <strong>Amount Paid:</strong> $${state.account.totalPaid.toFixed(2)} / $${state.account.totalCost.toFixed(2)}<br>
      <strong>Status:</strong> ${state.account.isFullyPaid ? '<span style="color:#16a34a">PURCHASE COMPLETE (Full Access)</span>' : '<span style="color:#d97706">INSTALLMENT PLAN (Principal Locked)</span>'}<br>
      <strong>Current Equity:</strong> $${state.account.equity.toFixed(2)}<br>
      <strong>Withdrawable Profits:</strong> $${withdrawable.toFixed(2)}
    `;

    elements.managementStatus.innerHTML = `
      <strong>Assigned Manager:</strong> ${state.account.managerAssigned} (Randomized)<br>
      <strong>Expansion Accounts (Channels 2-5):</strong> 4 Sub-Accounts Active<br>
      <strong>Referral Channel (Channel 6):</strong> 15% Active Share
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
        <strong>Facilitator Advanced:</strong> $${state.sb.facilitatorAdvanced.toFixed(2)}<br>
        <strong>Lien per Bonder (10):</strong> $${state.sb.lienPerBonder.toFixed(2)}<br>
        <strong>Intercept Progress:</strong> $${state.sb.recoveredAmount.toFixed(2)} / $${state.sb.recoveryTarget.toFixed(2)}
      `;
    } else if (isFiftyPctDrawdown) {
      elements.sbStatus.innerHTML = `<strong style="color:#dc2626">50% Drawdown Breach! Manager Isolated. SB Ready.</strong>`;
    } else {
      elements.sbStatus.textContent = "Account operating normally. SB trigger inactive.";
    }
  }

  elements.btnProcessIntercept.disabled = !state.sb.active;
  if (state.sb.active) {
    elements.interceptStatus.innerHTML = `Intercepting offending manager channels. Unrecovered: $${(state.sb.recoveryTarget - state.sb.recoveredAmount).toFixed(2)}`;
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
