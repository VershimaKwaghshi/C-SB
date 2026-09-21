/**
 * C&SB Capital and Social Bond Master Simulation Engine
 */

const state = {
  companyRevenue: 0,
  recoveryPool: 0,
  ledger: [],
  txCounter: 1001,
  
  // Current Account Purchase State
  purchase: null,
  
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
    equity: 2000,
    lien: 0
  }))
};

const elements = {
  sysRevenue: document.getElementById('sys-revenue'),
  sysEquity: document.getElementById('sys-equity'),
  sysLiens: document.getElementById('sys-liens'),
  sysRecovery: document.getElementById('sys-recovery'),
  
  capitalForm: document.getElementById('capital-form'),
  userName: document.getElementById('user-name'),
  accountPrice: document.getElementById('account-price'),
  purchaseType: document.getElementById('purchase-type'),
  capitalStatus: document.getElementById('capital-status'),
  installmentPayAmt: document.getElementById('installment-pay-amt'),
  btnPayInstallment: document.getElementById('btn-pay-installment'),
  
  tradeLoss: document.getElementById('trade-loss'),
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
  elements.capitalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const targetSize = parseFloat(elements.accountPrice.value);
    const method = elements.purchaseType.value;
    
    state.purchase = {
      traderName: elements.userName.value,
      targetSize: targetSize,
      totalPaid: method === 'direct' ? targetSize : targetSize * 0.25, // 25% initial payment for installment
      isFullyPaid: method === 'direct',
      isIssued: true,
      fundedBaseline: targetSize,
      currentEquity: targetSize,
      method: method
    };

    if (method === 'direct') {
      state.companyRevenue += targetSize;
      recordLedger('TRADER', 'C&SB_COMPANY', targetSize, 'Direct One-Time Account Purchase Complete');
      recordLedger('C&SB_TREASURY', 'USER_EQUITY', targetSize, 'Real Funded Account Unlocked (No Principal Lock)');
    } else {
      const initialPayment = targetSize * 0.25;
      state.companyRevenue += initialPayment;
      recordLedger('TRADER', 'C&SB_COMPANY', initialPayment, 'Initial Installment Payment (Early Account Issuance)');
      recordLedger('C&SB_TREASURY', 'USER_EQUITY', targetSize, 'Real Funded Account Issued (Principal Locked until 90-day completion)');
    }

    render();
  });

  elements.btnPayInstallment.addEventListener('click', () => {
    if (!state.purchase || state.purchase.isFullyPaid) return;

    const payment = parseFloat(elements.installmentPayAmt.value);
    state.purchase.totalPaid += payment;
    state.companyRevenue += payment;

    recordLedger('TRADER', 'C&SB_COMPANY', payment, 'Installment Payment Received');

    if (state.purchase.totalPaid >= state.purchase.targetSize) {
      state.purchase.isFullyPaid = true;
      recordLedger('C&SB_COMPANY', 'USER_EQUITY', 0, 'Account Purchase Fully Completed! Principal Lock Lifted.');
    }

    render();
  });

  elements.btnRunTrade.addEventListener('click', () => {
    if (!state.purchase || !state.purchase.isIssued) return;
    const pct = parseFloat(elements.tradeLoss.value) / 100;
    const change = state.purchase.currentEquity * pct;
    state.purchase.currentEquity += change;

    recordLedger('MARKET', 'USER_EQUITY', change, `Market Position Execution (${pct * 100}%)`);
    render();
  });

  elements.btnTriggerSb.addEventListener('click', () => {
    if (!state.purchase || state.sb.active) return;

    const drawdownAmt = state.purchase.fundedBaseline - state.purchase.currentEquity;
    const sbAmount = drawdownAmt;
    const activationFee = sbAmount * 0.20;

    const facilitatorFee = activationFee * 0.40;
    const bonderFeeTotal = activationFee * 0.40;
    const companyFee = activationFee * 0.20;

    state.sb.active = true;
    state.sb.facilitatorAdvanced = sbAmount;
    state.sb.lienPerBonder = sbAmount * 0.10;
    state.sb.recoveryTarget = sbAmount;
    state.sb.recoveredAmount = 0;

    state.purchase.currentEquity += sbAmount;
    state.companyRevenue += companyFee;
    
    const feePerBonder = bonderFeeTotal / 10;

    state.bonders.forEach(b => {
      b.lien = state.sb.lienPerBonder;
      b.equity += feePerBonder;
    });

    recordLedger('FACILITATOR', 'USER_EQUITY', sbAmount, 'Social Bond Advanced Capital');
    recordLedger('USER_EQUITY', 'FACILITATOR', facilitatorFee, 'SB Activation Fee to Facilitator (40%)');
    recordLedger('USER_EQUITY', 'BONDERS_POOL', bonderFeeTotal, 'SB Activation Fee to Bonders (40%)');
    recordLedger('USER_EQUITY', 'COMPANY_REVENUE', companyFee, 'SB Activation Fee to C&SB (20%)');

    render();
  });

  elements.btnExpireSb.addEventListener('click', () => {
    if (!state.sb.active) return;

    const unrecovered = state.sb.recoveryTarget - state.sb.recoveredAmount;
    
    if (unrecovered > 0) {
      const liquidationPerBonder = unrecovered / 10;
      state.bonders.forEach(b => {
        b.equity -= liquidationPerBonder;
        b.lien = 0;
      });
      recordLedger('BONDERS_POOL', 'FACILITATOR', unrecovered, '30-Day Contract Expired: Executed Liens to Liquidate Facilitator Exposure');
    } else {
      state.bonders.forEach(b => b.lien = 0);
      recordLedger('SYSTEM', 'BONDERS_POOL', 0, '30-Day Contract Expired: Fully Recovered, Liens Released');
    }

    state.sb.active = false;
    render();
  });

  elements.btnProcessIntercept.addEventListener('click', () => {
    if (!state.sb.active) return;

    const amt = parseFloat(elements.interceptAmount.value);
    const source = elements.interceptSource.value;

    state.sb.recoveredAmount += amt;
    state.recoveryPool += amt;

    recordLedger(`MANAGER_EARNINGS:${source}`, 'RECOVERY_POOL', amt, 'Intercepted Manager Income Route');

    const replenishPerBonder = amt / 10;
    state.bonders.forEach(b => {
      b.equity += replenishPerBonder;
      if (b.lien > 0) {
        b.lien = Math.max(0, b.lien - replenishPerBonder);
      }
    });

    recordLedger('RECOVERY_POOL', 'BONDERS_POOL', amt, 'Replenished Bonder Capital Accounts');
    
    if (state.sb.recoveredAmount >= state.sb.recoveryTarget) {
      state.sb.active = false;
      state.bonders.forEach(b => b.lien = 0);
      recordLedger('RECOVERY_POOL', 'SYSTEM', 0, 'Full Recovery Achieved. SB Event Closed.');
    }

    render();
  });
}

function render() {
  elements.sysRevenue.textContent = `$${state.companyRevenue.toFixed(2)}`;
  elements.sysEquity.textContent = state.purchase ? `$${state.purchase.currentEquity.toFixed(2)}` : '$0.00';
  
  const totalLiens = state.bonders.reduce((acc, b) => acc + b.lien, 0);
  elements.sysLiens.textContent = `$${totalLiens.toFixed(2)}`;
  elements.sysRecovery.textContent = `$${state.recoveryPool.toFixed(2)}`;

  if (!state.purchase) {
    elements.capitalStatus.textContent = "No active account purchase.";
    elements.btnPayInstallment.disabled = true;
    elements.btnRunTrade.disabled = true;
  } else {
    elements.btnPayInstallment.disabled = state.purchase.isFullyPaid;
    elements.btnRunTrade.disabled = !state.purchase.isIssued;

    let withdrawable = 0;
    if (state.purchase.isFullyPaid) {
      withdrawable = state.purchase.currentEquity;
    } else {
      withdrawable = Math.max(0, state.purchase.currentEquity - state.purchase.fundedBaseline);
    }

    elements.capitalStatus.innerHTML = `
      <strong>Trader:</strong> ${state.purchase.traderName}<br>
      <strong>Account Size:</strong> $${state.purchase.targetSize.toFixed(2)}<br>
      <strong>Payment Progress:</strong> $${state.purchase.totalPaid.toFixed(2)} / $${state.purchase.targetSize.toFixed(2)}<br>
      <strong>Purchase Status:</strong> ${state.purchase.isFullyPaid ? '<span style="color:#16a34a">FULL PURCHASE COMPLETE (UNLOCKED)</span>' : '<span style="color:#d97706">INSTALLMENT (PRINCIPAL LOCKED)</span>'}<br>
      <strong>Current Equity:</strong> $${state.purchase.currentEquity.toFixed(2)}<br>
      <strong>Withdrawable Amount:</strong> $${withdrawable.toFixed(2)} ${state.purchase.isFullyPaid ? '(Entire Balance)' : '(Profits Above Baseline)'}
    `;
  }

  if (!state.purchase || !state.purchase.isIssued) {
    elements.sbStatus.textContent = "Funded account required for Social Bond simulation.";
    elements.btnTriggerSb.disabled = true;
    elements.btnExpireSb.disabled = true;
  } else {
    const isFiftyPctDrawdown = state.purchase.currentEquity <= (state.purchase.fundedBaseline * 0.50);
    elements.btnTriggerSb.disabled = !isFiftyPctDrawdown || state.sb.active;
    elements.btnExpireSb.disabled = !state.sb.active;

    if (state.sb.active) {
      elements.sbStatus.innerHTML = `
        <strong style="color:#d97706">ACTIVE SOCIAL BOND EVENT</strong><br>
        <strong>Facilitator Advanced:</strong> $${state.sb.facilitatorAdvanced.toFixed(2)}<br>
        <strong>Lien per Bonder (10):</strong> $${state.sb.lienPerBonder.toFixed(2)}<br>
        <strong>Recovery Progress:</strong> $${state.sb.recoveredAmount.toFixed(2)} / $${state.sb.recoveryTarget.toFixed(2)}
      `;
    } else if (isFiftyPctDrawdown) {
      elements.sbStatus.innerHTML = `<strong style="color:#dc2626">CRITICAL: 50% Drawdown Detected! SB Activation Eligible.</strong>`;
    } else {
      elements.sbStatus.textContent = "Account operating normally. SB trigger inactive.";
    }
  }

  elements.btnProcessIntercept.disabled = !state.sb.active;
  if (state.sb.active) {
    elements.interceptStatus.innerHTML = `Active intercept targeting manager. Remaining: $${(state.sb.recoveryTarget - state.sb.recoveredAmount).toFixed(2)}`;
  } else {
    elements.interceptStatus.textContent = "Recovery engine idle. No active SB events.";
  }

  elements.bondersList.innerHTML = state.bonders.map(b => `
    <div class="bonder-card ${b.lien > 0 ? 'lien-active' : ''}">
      <strong>${b.name}</strong><br>
      Equity: $${b.equity.toFixed(2)}<br>
      Lien: <span style="color:${b.lien > 0 ? '#d97706' : '#94a3b8'}">$${b.lien.toFixed(2)}</span>
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
