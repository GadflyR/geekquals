function factorial(n) {
  n = Math.floor(n);
  if (n<0) return NaN;
  let r = 1;
  for (let i=1; i<=n; i++) r*=i;
  return r;
}

// For the puzzle, generate random numbers:
const nums = Array.from({length:4}, () => Math.floor(Math.random()*9)+1);

document.addEventListener('DOMContentLoaded', () => {
  // Create initial structure: slot - num - slot - num - ...
  let html = '';
  for (let i = 0; i < nums.length; i++) {
    html += `<span class="slot" data-slot="slot${i}"></span>`;
    html += `<span class="number" data-index="${i}" data-original-value="${nums[i]}" data-value="${nums[i]}">${nums[i]}</span>`;
  }
  html += `<span class="slot" data-slot="slot${nums.length}"></span>`;

  document.getElementById('numbersRow').innerHTML = html;

  // Place '=' in the middle slot
  const middleSlotIndex = Math.floor(nums.length / 2);
  const allSlots = document.querySelectorAll('[data-slot]');
  const middleSlot = allSlots[middleSlotIndex];
  insertOperatorIntoSlot(middleSlot, '=');

  evaluateInRealTime();
});

let draggedOp = null;
let draggingOpType = null; // 'binary' | 'unary' | 'equal'

document.addEventListener('dragstart', (e) => {
  if (e.target.classList.contains('operator')) {
    draggedOp = e.target;
    e.dataTransfer.effectAllowed = 'move';

    const op = draggedOp.getAttribute('data-op');
    if (op === '=') {
      draggingOpType = 'equal';
    }
    else if (['√','!'].includes(op)) {
      draggingOpType = 'unary';
    }
    else {
      draggingOpType = 'binary';
    }

    // ---- CHANGED HIGHLIGHTING LOGIC FOR '=' ----
    if (draggingOpType === 'unary') {
      // highlight all numbers
      document.querySelectorAll('.number').forEach(num => {
        num.classList.add('highlight-all-valid');
      });
    }
    else if (draggingOpType === 'equal') {
      // Highlight all slots EXCEPT the ones in the same slot-group as '='
      const currentSlotGroup = draggedOp.closest('.slot-group');
      document.querySelectorAll('.slot').forEach(slot => {
        // If the slot is not inside the same slot-group, highlight it
        if (slot.closest('.slot-group') !== currentSlotGroup) {
          slot.classList.add('highlight-all-valid');
        }
      });
    }
    else {
      // highlight all slots (binary operators)
      document.querySelectorAll('.slot').forEach(slot => {
        slot.classList.add('highlight-all-valid');
      });
    }
  }
});

document.addEventListener('dragend', () => {
  // remove highlight from all
  document.querySelectorAll('.highlight-all-valid').forEach(el => {
    el.classList.remove('highlight-all-valid');
  });
  document.querySelectorAll('.highlight-over').forEach(el => {
    el.classList.remove('highlight-over');
  });
  draggedOp = null;
  draggingOpType = null;
});

document.addEventListener('dragover', (e) => {
  if (!draggedOp) return;

  if (draggingOpType === 'unary' && e.target.classList.contains('number')) {
    e.preventDefault();
    e.target.classList.add('highlight-over');
  }
  else if ((draggingOpType === 'binary' || draggingOpType === 'equal') 
           && e.target.classList.contains('slot')) {
    e.preventDefault();
    e.target.classList.add('highlight-over');
  }
});

document.addEventListener('dragleave', (e) => {
  if (draggingOpType === 'unary' && e.target.classList.contains('number')) {
    e.target.classList.remove('highlight-over');
  }
  else if ((draggingOpType === 'binary' || draggingOpType === 'equal') 
            && e.target.classList.contains('slot')) {
    e.target.classList.remove('highlight-over');
  }
});

document.addEventListener('drop', (e) => {
  if (!draggedOp) return;
  document.querySelectorAll('.highlight-over').forEach(el => {
    el.classList.remove('highlight-over');
  });

  const op = draggedOp.getAttribute('data-op');
  if (draggingOpType === 'unary') {
    // Only drop on a number
    if (e.target.classList.contains('number')) {
      e.preventDefault();
      applyUnaryOperatorToNumber(e.target, op);
      evaluateInRealTime();
    }
  }
  else if (draggingOpType === 'equal') {
    // user can move '=' around to a different slot, but not remove
    if (e.target.classList.contains('slot')) {
      e.preventDefault();
      removeOperatorFromCurrentLocation(draggedOp, true);
      insertOperatorIntoSlot(e.target, op);
      evaluateInRealTime();
    }
  }
  else {
    // binary
    if (e.target.classList.contains('slot')) {
      e.preventDefault();
      removeOperatorFromCurrentLocation(draggedOp, false);
      insertOperatorIntoSlot(e.target, op);
      evaluateInRealTime();
    }
  }
});

document.addEventListener('click', (e) => {
  // remove operator if clicked (but never '=')
  if (e.target.classList.contains('operator') 
      && !e.target.parentElement.classList.contains('operators-row')) {
    const op = e.target.getAttribute('data-op');
    if (op === '=') {
      // do not remove '='
      return;
    }
    removeOperator(e.target);
    evaluateInRealTime();
  }

  // revert number if clicked
  if (e.target.classList.contains('number')) {
    if (revertNumberIfNeeded(e.target)) {
      evaluateInRealTime();
    }
  }
});

/* ----- Helper Functions ----- */
function revertNumberIfNeeded(numberEl) {
  const original = numberEl.getAttribute('data-original-value');
  const current = numberEl.getAttribute('data-value');
  if (original !== current) {
    numberEl.setAttribute('data-value', original);
    numberEl.textContent = original;
    return true;
  }
  return false;
}

function applyUnaryOperatorToNumber(numberEl, op) {
  let valStr = numberEl.getAttribute('data-value');
  const original = numberEl.getAttribute('data-original-value');
  if (valStr !== original) {
    // already transformed, skip
    return;
  }

  if (op === '√') {
    numberEl.setAttribute('data-value', `(Math.sqrt(${valStr}))`);
    numberEl.textContent = `√${valStr}`;
  } 
  else if (op === '!') {
    let n = parseFloat(valStr);
    if (n<0 || n>20) {
      showResult("Invalid expression!", false);
      return;
    }
    numberEl.setAttribute('data-value', `(factorial(${valStr}))`);
    numberEl.textContent = `${valStr}!`;
  }
}

function removeOperator(opEl) {
  const parent = opEl.parentElement; 
  if (parent.classList.contains('slot-group')) {
    opEl.remove();
    const ops = parent.querySelectorAll('.operator');

    if (ops.length === 0) {
      // revert to single empty slot
      const newSlot = document.createElement('span');
      newSlot.classList.add('slot');
      if (parent.hasAttribute('data-slot')) {
        newSlot.setAttribute('data-slot', parent.getAttribute('data-slot'));
      }
      parent.replaceWith(newSlot);
    }
  } else {
    opEl.remove();
  }
}

function removeOperatorFromCurrentLocation(opEl, allowRemoveEqual=false) {
  // If dragged from puzzle line, remove from old position if it's not '=' or if allowRemoveEqual==true
  if (opEl.parentElement && !opEl.parentElement.classList.contains('operators-row')) {
    const op = opEl.getAttribute('data-op');
    if (op==='=' && !allowRemoveEqual) {
      // don't remove '='
      return;
    }
    removeOperator(opEl);
  }
}

function insertOperatorIntoSlot(slotEl, op) {
  const slotGroup = document.createElement('span');
  slotGroup.classList.add('slot-group');

  const leftSlot = document.createElement('span');
  leftSlot.classList.add('slot');

  const operatorEl = document.createElement('span');
  operatorEl.classList.add('operator');
  operatorEl.textContent = op;
  operatorEl.setAttribute('data-op', op);
  operatorEl.setAttribute('draggable', 'true');

  const rightSlot = document.createElement('span');
  rightSlot.classList.add('slot');

  slotGroup.append(leftSlot, operatorEl, rightSlot);

  if (slotEl.hasAttribute('data-slot')) {
    slotGroup.setAttribute('data-slot', slotEl.getAttribute('data-slot'));
  }
  slotEl.replaceWith(slotGroup);
}

function evaluateInRealTime() {
  const numberEls = document.querySelectorAll('.number');
  const slots = document.querySelectorAll('[data-slot]');

  let tokens = [];
  if (slots.length !== numberEls.length+1) {
    showResult("Invalid expression!", false);
    return;
  }

  // Build tokens: slot0, num0, slot1, num1, ...
  for (let i = 0; i < 2*numberEls.length+1; i++) {
    let slotElement = slots[Math.floor(i/2)];
    if (i % 2 === 0) {
      tokens.push(...extractOpsFromSlotArea(slotElement));
    } else {
      let numIndex = (i-1)/2;
      let numEl = numberEls[numIndex];
      tokens.push(numEl.getAttribute('data-value'));
    }
  }

  // Check existence of '='
  let eqCount = tokens.filter(t=>t==='=').length;
  if (eqCount === 0) {
    showResult("", false, true);
    return;
  }
  if (eqCount > 1) {
    showResult("Invalid expression!", false);
    return;
  }

  let eqIndex = tokens.indexOf('=');
  let leftTokens = tokens.slice(0, eqIndex);
  let rightTokens = tokens.slice(eqIndex+1);

  let leftVal = evaluateExpression(leftTokens);
  let rightVal = evaluateExpression(rightTokens);

  if (isNaN(leftVal) || isNaN(rightVal)) {
    showResult("Invalid expression!", false);
    return;
  }

  if (Math.abs(leftVal - rightVal) < 1e-9) {
    showResult("Success!", true);
  } else {
    showResult("", false, true);
  }
}

function extractOpsFromSlotArea(slotElement) {
  let ops = [];
  function traverse(el) {
    if (!el) return;
    for (let child of el.childNodes) {
      if (child.classList && child.classList.contains('operator')) {
        ops.push(child.getAttribute('data-op'));
      } else if (child.classList && (child.classList.contains('slot') || child.classList.contains('slot-group'))) {
        traverse(child);
      }
    }
  }
  traverse(slotElement);
  return ops;
}

function evaluateExpression(parts) {
  if (parts.length === 0) return NaN;

  let openCount = 0;
  for (let p of parts) {
    if (p === '(') openCount++;
    if (p === ')') openCount--;
    if (openCount < 0) return NaN;
  }
  if (openCount!==0) return NaN;

  let expr = parts.map(x => {
    if (x==='×') return '*';
    if (x==='÷') return '/';
    if (x==='^') return '**';
    return x;
  }).join('');

  try {
    return Function('"use strict";return (' + expr + ')')();
  } catch(e) {
    return NaN;
  }
}

function showResult(msg, success, hideIfEmpty=false) {
  const resultDiv = document.getElementById('resultMessage');
  if (hideIfEmpty && msg === "") {
    resultDiv.textContent = "";
    resultDiv.classList.remove('failure','success');
    return;
  }
  resultDiv.textContent = msg;
  resultDiv.classList.remove('failure','success');
  if (msg !== "") {
    if (success) {
      resultDiv.classList.add('success');
    } else {
      resultDiv.classList.add('failure');
    }
  }
}