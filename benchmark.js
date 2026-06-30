const { performance } = require('perf_hooks');

const STATE = { boards: {} };
for (let i = 0; i < 100; i++) {
  STATE.boards['board_' + i] = {
    id: 'board_' + i,
    columns: []
  };
  for (let j = 0; j < 10; j++) {
    const col = { cards: [] };
    for (let k = 0; k < 100; k++) {
      col.cards.push({ id: `card_${i}_${j}_${k}` });
    }
    STATE.boards['board_' + i].columns.push(col);
  }
}

const targetCardId = 'card_99_9_99';
const targetBoardId = 'board_99';

function oldFind() {
  for (const b of Object.values(STATE.boards)) {
    for (const col of (b.columns || [])) {
      if (col.cards.find(c => c.id === targetCardId)) {
        return b.id;
      }
    }
  }
}

function newFind(datasetBoardId) {
  return datasetBoardId;
}

const startOld = performance.now();
for (let i = 0; i < 1000; i++) {
  oldFind();
}
const endOld = performance.now();

const startNew = performance.now();
for (let i = 0; i < 1000; i++) {
  newFind(targetBoardId);
}
const endNew = performance.now();

console.log(`Old method (1000 iterations): ${endOld - startOld} ms`);
console.log(`New method (1000 iterations): ${endNew - startNew} ms`);
