const test = require('node:test');
const assert = require('node:assert/strict');
const {
    isMissing,
    coerceNumeric,
    computeMedian,
    cleanTabularRows,
} = require('../services/csvCleaner');

test('isMissing and coerceNumeric handle sentinels and currency formatting', () => {
    assert.equal(isMissing('N/A'), true);
    assert.equal(isMissing('  null '), true);
    assert.equal(isMissing('0'), false);

    assert.equal(coerceNumeric('$1,250.50'), 1250.5);
    assert.equal(coerceNumeric('-$1,250.50'), -1250.5);
    assert.equal(coerceNumeric('($500.00)'), -500);
    assert.equal(coerceNumeric('-42.1'), -42.1);
    assert.equal(coerceNumeric('abc'), null);
    assert.equal(computeMedian([10, 2, 5, 8]), 6.5);
});

test('cleanTabularRows deduplicates, imputes median/mode, and clips extreme outliers without mutating IDs', () => {
    const raw = [
        { '  id  ': '1', city: 'Boston', revenue: '$100.00' },
        { id: '1', city: 'Boston', revenue: '$100.00' }, // exact duplicate
        { id: '2', city: 'Boston', revenue: '$110.00' },
        { id: '3', city: 'N/A', revenue: '$105.00' },
        { id: '4', city: 'Cambridge', revenue: 'null' },
        { id: '5', city: 'Boston', revenue: '$95.00' },
        { id: '99999', city: 'Boston', revenue: '$10,000.00' }, // extreme outlier on revenue, large ID preserved
    ];

    const result = cleanTabularRows(raw, { keyColumns: ['id'], zThreshold: 2.0, clipOutliers: true });
    assert.equal(result.stats.inputRows, 7);
    assert.equal(result.stats.outputRows, 6);
    assert.equal(result.stats.duplicatesRemoved, 1);
    assert.equal(result.stats.imputedCells, 2);
    assert.equal(result.stats.outliersClipped, 1);

    const row3 = result.rows.find((r) => r.id === 3);
    assert.equal(row3.city, 'Boston'); // mode imputed
    const row4 = result.rows.find((r) => r.id === 4);
    assert.equal(row4.revenue, 105); // median of [95, 100, 105, 110, 10000] is 105

    const row6 = result.rows.find((r) => r.id === 99999);
    assert.ok(row6);
    assert.ok(row6.revenue < 10000);
});

