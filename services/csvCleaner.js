const MISSING_SENTINELS = new Set(['', 'na', 'n/a', 'null', 'none', 'nan', 'undefined', '-']);

function isMissing(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'number') return Number.isNaN(value);
    const trimmed = String(value).trim();
    return MISSING_SENTINELS.has(trimmed.toLowerCase());
}

function coerceNumeric(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value !== 'string') return null;
    const cleaned = value.trim().replace(/^[£$€]/, '').replace(/,/g, '');
    if (!cleaned || !/^[-+]?\d*(\.\d+)?$/.test(cleaned) || cleaned === '-' || cleaned === '+' || cleaned === '.') {
        return null;
    }
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
}

function computeMedian(values) {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 1
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
}

function computeMode(values) {
    if (!values.length) return null;
    const counts = new Map();
    let bestVal = values[0];
    let bestCount = 0;
    for (const v of values) {
        const next = (counts.get(v) || 0) + 1;
        counts.set(v, next);
        if (next > bestCount) {
            bestCount = next;
            bestVal = v;
        }
    }
    return bestVal;
}

/**
 * Clean a tabular dataset (array of row objects):
 * 1. Normalizes headers and trims string cells
 * 2. Deduplicates identical rows (or by keyColumns if provided)
 * 3. Infers numeric vs categorical columns and imputes missing values (median for numeric, mode for categorical)
 * 4.Optionally clips numeric z-score outliers beyond zThreshold
 */
function cleanTabularRows(rows, options = {}) {
    const {
        keyColumns = null,
        zThreshold = 3.0,
        clipOutliers = true,
    } = options;

    if (!Array.isArray(rows) || rows.length === 0) {
        return { rows: [], stats: { inputRows: 0, outputRows: 0, duplicatesRemoved: 0, imputedCells: 0, outliersClipped: 0 } };
    }

    const columns = Array.from(
        rows.reduce((acc, r) => {
            Object.keys(r || {}).forEach((k) => acc.add(k.trim()));
            return acc;
        }, new Set())
    );

    // Normalize keys and trim values
    const normalized = rows.map((row) => {
        const out = {};
        for (const col of columns) {
            const rawVal = row[col] !== undefined ? row[col] : row[` ${col}`] ?? row[`${col} `];
            out[col] = typeof rawVal === 'string' ? rawVal.trim() : rawVal;
        }
        return out;
    });

    // Deduplicate rows
    const seenKeys = new Set();
    const deduped = [];
    let duplicatesRemoved = 0;
    for (const row of normalized) {
        const sigCols = Array.isArray(keyColumns) && keyColumns.length > 0 ? keyColumns : columns;
        const signature = JSON.stringify(sigCols.map((c) => (isMissing(row[c]) ? null : row[c])));
        if (seenKeys.has(signature)) {
            duplicatesRemoved += 1;
            continue;
        }
        seenKeys.add(signature);
        deduped.push({ ...row });
    }

    // Column type inference & statistics
    const colMeta = {};
    for (const col of columns) {
        const nonMissing = deduped.map((r) => r[col]).filter((v) => !isMissing(v));
        const numericVals = nonMissing.map(coerceNumeric).filter((v) => v !== null);
        const isNumericCol = nonMissing.length > 0 && numericVals.length / nonMissing.length >= 0.7;

        if (isNumericCol) {
            const median = computeMedian(numericVals);
            const absDevs = numericVals.map((v) => Math.abs(v - median));
            const mad = computeMedian(absDevs) * 1.4826;
            const mean = numericVals.reduce((a, b) => a + b, 0) / numericVals.length;
            const variance = numericVals.reduce((acc, v) => acc + (v - mean) ** 2, 0) / numericVals.length;
            const std = Math.sqrt(variance);
            const scale = mad > 1e-9 ? mad : std;
            const center = mad > 1e-9 ? median : mean;
            colMeta[col] = { type: 'numeric', imputeValue: median, center, scale };
        } else {
            const strVals = nonMissing.map((v) => String(v).trim());
            colMeta[col] = { type: 'categorical', imputeValue: computeMode(strVals) ?? '' };
        }
    }

    let imputedCells = 0;
    let outliersClipped = 0;

    for (const row of deduped) {
        for (const col of columns) {
            const meta = colMeta[col];
            const val = row[col];
            if (meta.type === 'numeric') {
                let num = isMissing(val) ? null : coerceNumeric(val);
                if (num === null) {
                    num = meta.imputeValue;
                    imputedCells += 1;
                } else if (clipOutliers && meta.scale > 1e-9 && zThreshold > 0) {
                    const z = Math.abs((num - meta.center) / meta.scale);
                    if (z > zThreshold) {
                        const bound = meta.center + Math.sign(num - meta.center) * zThreshold * meta.scale;
                        num = Number(bound.toFixed(4));
                        outliersClipped += 1;
                    }
                }
                row[col] = num;
            } else if (isMissing(val)) {
                row[col] = meta.imputeValue;
                imputedCells += 1;
            }
        }
    }

    return {
        rows: deduped,
        stats: {
            inputRows: rows.length,
            outputRows: deduped.length,
            duplicatesRemoved,
            imputedCells,
            outliersClipped,
        },
    };
}

module.exports = {
    isMissing,
    coerceNumeric,
    computeMedian,
    computeMode,
    cleanTabularRows,
};
