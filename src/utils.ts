/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Gamete, UniqueOffspringGenotype } from "./types";

// Greatest common divisor helper
export function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

// Format double probability to exact fraction (or percentage)
export function doubleToFraction(val: number): { numerator: number; denominator: number; label: string } {
  if (val < 1e-9) return { numerator: 0, denominator: 1, label: "0" };
  if (Math.abs(val - 1.0) < 1e-9) return { numerator: 1, denominator: 1, label: "1" };
  
  // Test powers of 2 denominator up to 1024 as genetics problems always use powers of 2
  let denom = 1;
  while (denom <= 4096) {
    const num = Math.round(val * denom);
    if (Math.abs(num / denom - val) < 1e-9) {
      const g = gcd(num, denom);
      return {
        numerator: num / g,
        denominator: denom / g,
        label: `${num / g}/${denom / g}`
      };
    }
    denom *= 2;
  }
  
  // General approximation for arbitrary fractions if not power of 2
  const tolerance = 1.0e-6;
  let h1 = 1, h2 = 0, k1 = 0, k2 = 1;
  let b = val;
  do {
    const a = Math.floor(b);
    const aux = h1; h1 = a * h1 + h2; h2 = aux;
    const aux2 = k1; k1 = a * k1 + k2; k2 = aux2;
    b = 1 / (b - a);
  } while (Math.abs(val - h1 / k1) > val * tolerance);

  return {
    numerator: h1,
    denominator: k1,
    label: `${h1}/${k1}`
  };
}

// Compute standard Mendelian gamete probability vector using Kronecker Product representation
export function computeKroneckerProduct(
  parentGenes: { symbol: string; allele1: string; allele2: string }[]
): Gamete[] {
  // Start with empty gamete of probability 1.0
  let current: Gamete[] = [{ genotype: "", probability: 1.0 }];

  for (const gene of parentGenes) {
    const sym = gene.symbol;
    const domSym = sym.toUpperCase();
    const recSym = sym.toLowerCase();

    let p_dom = 0;
    let p_rec = 0;

    if (gene.allele1 === domSym) p_dom += 0.5;
    if (gene.allele1 === recSym) p_rec += 0.5;
    if (gene.allele2 === domSym) p_dom += 0.5;
    if (gene.allele2 === recSym) p_rec += 0.5;

    // We strictly model single gene meiosis as a vector of [P(Dominant), P(Recessive)]
    // This maintains constant-size 2^N gamete vectors with clean labels and no duplicates.
    const geneOptions = [
      { allele: domSym, prob: p_dom },
      { allele: recSym, prob: p_rec }
    ];

    const next: Gamete[] = [];
    for (const g of current) {
      for (const opt of geneOptions) {
        next.push({
          genotype: g.genotype + opt.allele,
          probability: g.probability * opt.prob
        });
      }
    }
    current = next;
  }

  return current;
}

// Merge Mom gamete and Dad gamete to get offspring genotype, sorted dominant-first for each gene
export function mergeGametes(momGamete: string, dadGamete: string, geneSymbols: string[]): string {
  let offspring = "";
  for (let i = 0; i < geneSymbols.length; i++) {
    const m = momGamete[i];
    const d = dadGamete[i];
    
    // Sort so dominant (uppercase) comes first
    // Since 'A' < 'a' in ASCII, sorting alphabetically naturally does this!
    if (m <= d) {
      offspring += m + d;
    } else {
      offspring += d + m;
    }
  }
  return offspring;
}

// Generate the 3^N unique offspring genotypes using Cartesian multiplication
export function generateUniqueGenotypes(geneSymbols: string[]): string[] {
  let current: string[] = [""];
  for (const symbol of geneSymbols) {
    const options = [
      symbol.toUpperCase() + symbol.toUpperCase(), // AA
      symbol.toUpperCase() + symbol.toLowerCase(), // Aa
      symbol.toLowerCase() + symbol.toLowerCase()  // aa
    ];
    
    const next: string[] = [];
    for (const prev of current) {
      for (const opt of options) {
        next.push(prev + opt);
      }
    }
    current = next;
  }
  return current;
}

// Create the 3^N x 2^(2N) combination matrix C to map gamete crosses to unique genotypes
export function generateCombinationMatrix(
  uniqueGenotypes: string[],
  momGametes: Gamete[],
  dadGametes: Gamete[],
  geneSymbols: string[]
): number[][] {
  const rows = uniqueGenotypes.length; // 3^N
  const cols = momGametes.length * dadGametes.length; // 2^N * 2^N = 2^(2N)
  
  const C: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = 0; i < momGametes.length; i++) {
    for (let j = 0; j < dadGametes.length; j++) {
      const colIdx = i * dadGametes.length + j;
      const offspringGenotype = mergeGametes(momGametes[i].genotype, dadGametes[j].genotype, geneSymbols);
      
      const uniqueIdx = uniqueGenotypes.indexOf(offspringGenotype);
      if (uniqueIdx !== -1) {
        C[uniqueIdx][colIdx] = 1;
      }
    }
  }

  return C;
}

// Multiply the combination matrix C (3^N x 2^2N) by the flattened joint progeny vector vec(P) (2^2N x 1)
export function multiplyMatrix(C: number[][], vecP: number[]): number[] {
  const F: number[] = Array(C.length).fill(0);
  for (let r = 0; r < C.length; r++) {
    let sum = 0;
    for (let c = 0; c < C[r].length; c++) {
      sum += C[r][c] * vecP[c];
    }
    F[r] = sum;
  }
  return F;
}

// Randomly generate genotypes for Mom and Dad
export function generateRandomGenotypes(geneSymbols: string[]): { mom: string; dad: string } {
  const options = ["AA", "Aa", "aa"];
  let mom = "";
  let dad = "";
  
  for (const symbol of geneSymbols) {
    const symUpper = symbol.toUpperCase();
    const symLower = symbol.toLowerCase();
    
    // Choose randomly for Mom
    const choiceMom = options[Math.floor(Math.random() * options.length)];
    mom += choiceMom.replace(/A/g, symUpper).replace(/a/g, symLower);
    
    // Choose randomly for Dad
    const choiceDad = options[Math.floor(Math.random() * options.length)];
    dad += choiceDad.replace(/A/g, symUpper).replace(/a/g, symLower);
  }
  
  return { mom, dad };
}

// Parse input string like "AaBb" into list of alleles
export function parseGenotypeString(input: string, geneSymbols: string[]): { symbol: string; allele1: string; allele2: string }[] {
  const result: { symbol: string; allele1: string; allele2: string }[] = [];
  
  for (const sym of geneSymbols) {
    // Find all occurrences of sym in input (case-insensitive)
    const regex = new RegExp(sym, "gi");
    const matches = input.match(regex) || [];
    
    let allele1 = sym.toUpperCase();
    let allele2 = sym.toLowerCase();
    
    if (matches.length >= 2) {
      allele1 = matches[0];
      allele2 = matches[1];
    } else if (matches.length === 1) {
      // If user typed only 1 letter, we can assume homozygous or default
      allele1 = matches[0];
      allele2 = matches[0];
    }
    
    result.push({ symbol: sym, allele1, allele2 });
  }
  
  return result;
}
