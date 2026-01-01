/**
 * Conflict Statistics Module
 * 
 * Provides instrumentation for the schedule generator to track and analyze
 * why no valid combinations were found. Records conflict events during
 * backtracking and generates aggregated diagnostics.
 * 
 * Key Concepts:
 * - "Conflict Event": When a candidate section is discarded because it
 *   conflicts with an already-selected section in the partial schedule.
 * - "pairKey": Alphabetically sorted pair of siglas, e.g., "EYP1113|IIC1001"
 * - "slotKey": Day and module, e.g., "2|3" (Wednesday module 3)
 * - Percentage = countByPair[pairKey] / totalConflictEvents * 100
 */

import { Dia, Modulo, NOMBRES_DIA } from '../types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Information about a single conflict event
 */
export interface ConflictHit {
    /** Sigla of the candidate section being tested */
    siglaCandidate: string;
    /** Normalized section ID of the candidate (e.g., "EYP1113-S2") */
    sectionCandidateNorm: string;
    /** Sigla of the existing section that caused the conflict */
    siglaExisting: string;
    /** Normalized section ID of the existing section */
    sectionExistingNorm: string;
    /** Day where the conflict occurs (first conflicting slot) */
    day: Dia;
    /** Module where the conflict occurs (first conflicting slot) */
    module: Modulo;
}

/**
 * Example of a conflict for UI display
 */
export interface ConflictExample {
    sectionA: string;  // Normalized section ID
    sectionB: string;  // Normalized section ID
    day: Dia;
    module: Modulo;
}

/**
 * Aggregated conflict statistics collected during generation
 */
export interface ConflictStats {
    /** Total number of conflict events recorded */
    totalConflictEvents: number;
    /** Count of conflicts by pair of siglas (pairKey -> count) */
    countByPair: Map<string, number>;
    /** Count of conflicts by pair+slot (pairSlotKey -> count) */
    countByPairSlot: Map<string, number>;
    /** First example of conflict per pair (pairKey -> example) */
    exampleByPair: Map<string, ConflictExample>;
}

/**
 * Processed result for a single pair, ready for UI display
 */
export interface TopPairResult {
    /** Pair key (e.g., "EYP1113|IIC1001") */
    pairKey: string;
    /** First sigla (alphabetically) */
    siglaA: string;
    /** Second sigla (alphabetically) */
    siglaB: string;
    /** Percentage of total conflicts (0-100) */
    pct: number;
    /** Day with most conflicts for this pair */
    peakDay: Dia;
    /** Module with most conflicts for this pair */
    peakModule: Modulo;
    /** Example conflict (if available) */
    example?: ConflictExample;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Normalizes a section ID to the format "SIGLA-S<n>"
 * 
 * Examples:
 * - "EYP1113-2" -> "EYP1113-S2"
 * - "EYP1113 S2" -> "EYP1113-S2"
 * - "MAT1620-S1" -> "MAT1620-S1" (already normalized)
 * - "ICS2523-10" -> "ICS2523-S10"
 * 
 * @param input Raw section identifier
 * @returns Normalized section ID in "SIGLA-S<n>" format
 */
export function normalizeSectionId(input: string): string {
    if (!input || typeof input !== 'string') {
        return input;
    }

    const trimmed = input.trim().toUpperCase();

    // Pattern 1: "SIGLA-S<n>" (already normalized)
    if (/^[A-Z]{2,4}\d{3,4}-S\d+$/.test(trimmed)) {
        return trimmed;
    }

    // Pattern 2: "SIGLA-<n>" (missing S)
    const dashMatch = trimmed.match(/^([A-Z]{2,4}\d{3,4})-(\d+)$/);
    if (dashMatch) {
        return `${dashMatch[1]}-S${dashMatch[2]}`;
    }

    // Pattern 3: "SIGLA S<n>" (space instead of dash)
    const spaceMatch = trimmed.match(/^([A-Z]{2,4}\d{3,4})\s+S(\d+)$/);
    if (spaceMatch) {
        return `${spaceMatch[1]}-S${spaceMatch[2]}`;
    }

    // Pattern 4: "SIGLA <n>" (space, no S)
    const spaceNumMatch = trimmed.match(/^([A-Z]{2,4}\d{3,4})\s+(\d+)$/);
    if (spaceNumMatch) {
        return `${spaceNumMatch[1]}-S${spaceNumMatch[2]}`;
    }

    // Fallback: return as-is if no pattern matches
    return trimmed;
}

/**
 * Creates a fresh ConflictStats object for a new generation run
 */
export function createConflictStats(): ConflictStats {
    return {
        totalConflictEvents: 0,
        countByPair: new Map(),
        countByPairSlot: new Map(),
        exampleByPair: new Map(),
    };
}

/**
 * Generates a pairKey from two siglas (alphabetically sorted)
 */
export function makePairKey(siglaA: string, siglaB: string): string {
    const sorted = [siglaA, siglaB].sort();
    return sorted.join('|');
}

/**
 * Generates a slotKey from day and module
 * Day is converted to index: L=0, M=1, W=2, J=3, V=4, S=5
 */
export function makeSlotKey(day: Dia, module: Modulo): string {
    const dayIndex: Record<Dia, number> = { 'L': 0, 'M': 1, 'W': 2, 'J': 3, 'V': 4, 'S': 5 };
    return `${dayIndex[day]}|${module}`;
}

/**
 * Parses a slotKey back to day and module
 */
export function parseSlotKey(slotKey: string): { day: Dia; module: Modulo } {
    const [dayIndex, moduleStr] = slotKey.split('|');
    const dias: Dia[] = ['L', 'M', 'W', 'J', 'V', 'S'];
    return {
        day: dias[parseInt(dayIndex, 10)],
        module: parseInt(moduleStr, 10) as Modulo,
    };
}

/**
 * Records a conflict event in the statistics
 * 
 * @param stats The ConflictStats object to update
 * @param hit The conflict hit information
 */
export function recordConflict(stats: ConflictStats, hit: ConflictHit): void {
    stats.totalConflictEvents++;

    const pairKey = makePairKey(hit.siglaCandidate, hit.siglaExisting);
    const slotKey = makeSlotKey(hit.day, hit.module);
    const pairSlotKey = `${pairKey}|${slotKey}`;

    // Increment pair count
    const currentPairCount = stats.countByPair.get(pairKey) ?? 0;
    stats.countByPair.set(pairKey, currentPairCount + 1);

    // Increment pair+slot count
    const currentPairSlotCount = stats.countByPairSlot.get(pairSlotKey) ?? 0;
    stats.countByPairSlot.set(pairSlotKey, currentPairSlotCount + 1);

    // Store first example only
    if (!stats.exampleByPair.has(pairKey)) {
        stats.exampleByPair.set(pairKey, {
            sectionA: hit.sectionCandidateNorm,
            sectionB: hit.sectionExistingNorm,
            day: hit.day,
            module: hit.module,
        });
    }
}

/**
 * Finds the peak slot (day + module) for a given pair
 * 
 * @param stats The ConflictStats object
 * @param pairKey The pair key to find peak for
 * @returns The day and module with most conflicts for this pair
 */
function findPeakSlot(stats: ConflictStats, pairKey: string): { day: Dia; module: Modulo } {
    let maxCount = 0;
    let peakSlotKey = '0|1'; // Default: Monday module 1

    for (const [key, count] of stats.countByPairSlot) {
        if (key.startsWith(`${pairKey}|`) && count > maxCount) {
            maxCount = count;
            // Extract slotKey from pairSlotKey
            peakSlotKey = key.substring(pairKey.length + 1);
        }
    }

    return parseSlotKey(peakSlotKey);
}

/**
 * Builds the Top 3 conflict pairs from collected statistics
 * 
 * @param stats The ConflictStats collected during generation
 * @returns Array of up to 3 TopPairResult objects, sorted by frequency
 */
export function buildTopPairs(stats: ConflictStats): TopPairResult[] {
    if (stats.totalConflictEvents === 0) {
        return [];
    }

    // Sort pairs by count (descending)
    const sortedPairs = Array.from(stats.countByPair.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    return sortedPairs.map(([pairKey, count]) => {
        const [siglaA, siglaB] = pairKey.split('|');
        const pct = (count / stats.totalConflictEvents) * 100;
        const { day, module } = findPeakSlot(stats, pairKey);
        const example = stats.exampleByPair.get(pairKey);

        return {
            pairKey,
            siglaA,
            siglaB,
            pct: Math.round(pct * 10) / 10, // Round to 1 decimal
            peakDay: day,
            peakModule: module,
            example,
        };
    });
}

/**
 * Gets a human-readable day name
 */
export function getDayName(day: Dia): string {
    return NOMBRES_DIA[day];
}
