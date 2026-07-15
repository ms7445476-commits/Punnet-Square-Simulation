/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GeneConfig {
  symbol: string;      // A, B, C... Z
  dominantTrait: string; // e.g. "Tall"
  recessiveTrait: string; // e.g. "Short"
}

export interface ParentGenotype {
  allele1: string; // e.g. "A" or "a"
  allele2: string; // e.g. "A" or "a"
}

// Single gene parent status
export interface SingleGeneState {
  symbol: string;
  mom: ParentGenotype;
  dad: ParentGenotype;
}

// Gamete representation
export interface Gamete {
  genotype: string; // e.g. "AB"
  probability: number; // e.g. 0.25
}

// Offspring genotype combination
export interface ProgenyCell {
  momGameteIdx: number;
  dadGameteIdx: number;
  momGameteGenotype: string;
  dadGameteGenotype: string;
  offspringGenotype: string; // e.g. "AaBb"
  probability: number; // e.g. 0.0625
}

// Reduced unique offspring genotype
export interface UniqueOffspringGenotype {
  genotype: string; // e.g. "AaBb"
  probability: number; // e.g. 0.25
  numerator: number;
  denominator: number;
}
