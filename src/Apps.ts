/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import {
  Dna,
  Shuffle,
  Calculator,
  Grid3X3,
  List,
  Binary,
  Layers,
  ChevronRight,
  RefreshCw,
  HelpCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import {
  computeKroneckerProduct,
  mergeGametes,
  generateUniqueGenotypes,
  generateCombinationMatrix,
  multiplyMatrix,
  generateRandomGenotypes,
  parseGenotypeString,
  doubleToFraction,
  gcd
} from "./utils";
import { Gamete, SingleGeneState } from "./types";
import MatrixView from "./components/MatrixView";
import PunnettGrid from "./components/PunnettGrid";
import MatrixEquationView from "./components/MatrixEquationView";

// A list of all 26 available genes from A to Z
const ALL_ALPHABET_GENES = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

// Helper to format single-gene meiosis probabilities
const getSingleGeneVectorText = (g: { symbol: string; allele1: string; allele2: string }) => {
  const sym = g.symbol;
  const domSym = sym.toUpperCase();
  const recSym = sym.toLowerCase();
  
  let p_dom = 0;
  let p_rec = 0;
  
  if (g.allele1 === domSym) p_dom += 0.5;
  if (g.allele1 === recSym) p_rec += 0.5;
  if (g.allele2 === domSym) p_dom += 0.5;
  if (g.allele2 === recSym) p_rec += 0.5;
  
  const domFrac = doubleToFraction(p_dom).label;
  const recFrac = doubleToFraction(p_rec).label;
  
  return `[${domSym}: ${domFrac}, ${recSym}: ${recFrac}]`;
};

export default function App() {
  // 1. Core Config States
  const [activeGenes, setActiveGenes] = useState<string[]>(["A", "B"]);
  const [momInput, setMomInput] = useState<string>("AaBb");
  const [dadInput, setDadInput] = useState<string>("AaBb");

  // View state: 'stepper' or 'notebook' (vertical scroll)
  const [viewMode, setViewMode] = useState<"stepper" | "notebook">("stepper");
  const [currentStep, setCurrentStep] = useState<number>(0);

  // Interaction State: highlights
  const [selectedGenotype, setSelectedGenotype] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  // Sync inputs when active genes change to provide a smooth default experience
  useEffect(() => {
    let newMom = "";
    let newDad = "";
    activeGenes.forEach((sym) => {
      // Keep existing alleles if present, otherwise default to heterozygous 'Aa', 'Bb'...
      const regex = new RegExp(sym, "gi");
      const existingMomMatches = momInput.match(regex);
      const existingDadMatches = dadInput.match(regex);

      if (existingMomMatches && existingMomMatches.length >= 2) {
        newMom += existingMomMatches[0] + existingMomMatches[1];
      } else {
        newMom += sym.toUpperCase() + sym.toLowerCase();
      }

      if (existingDadMatches && existingDadMatches.length >= 2) {
        newDad += existingDadMatches[0] + existingDadMatches[1];
      } else {
        newDad += sym.toUpperCase() + sym.toLowerCase();
      }
    });

    setMomInput(newMom);
    setDadInput(newDad);
    setSelectedGenotype(null);
  }, [activeGenes]);

  // 2. Perform Mathematical Parsing & Matrix Pre-computations
  const parsedMomGenes = useMemo(() => {
    return parseGenotypeString(momInput, activeGenes);
  }, [momInput, activeGenes]);

  const parsedDadGenes = useMemo(() => {
    return parseGenotypeString(dadInput, activeGenes);
  }, [dadInput, activeGenes]);

  // Step 1: Mom and Dad Kronecker gamete vectors
  const momGametes = useMemo(() => {
    return computeKroneckerProduct(parsedMomGenes);
  }, [parsedMomGenes]);

  const dadGametes = useMemo(() => {
    return computeKroneckerProduct(parsedDadGenes);
  }, [parsedDadGenes]);

  // Convert Gametes into 2^N x 1 vectors
  const momGametesVector = useMemo(() => momGametes.map((g) => [g.probability]), [momGametes]);
  const dadGametesVector = useMemo(() => dadGametes.map((g) => [g.probability]), [dadGametes]);

  const momGameteLabels = useMemo(() => momGametes.map((g) => g.genotype), [momGametes]);
  const dadGameteLabels = useMemo(() => dadGametes.map((g) => g.genotype), [dadGametes]);

  // Step 2: Progeny Joint Probability Matrix P = M * D^T (size 2^N x 2^N)
  const progenyMatrix = useMemo(() => {
    const matrix: number[][] = [];
    for (let i = 0; i < momGametes.length; i++) {
      const row: number[] = [];
      for (let j = 0; j < dadGametes.length; j++) {
        row.push(momGametes[i].probability * dadGametes[j].probability);
      }
      matrix.push(row);
    }
    return matrix;
  }, [momGametes, dadGametes]);

  // Flattened progeny vector vec(P) (size 2^(2N) x 1)
  const vecP = useMemo(() => progenyMatrix.flat(), [progenyMatrix]);

  const progenyLabelsFlat = useMemo(() => {
    const labels: string[] = [];
    for (let i = 0; i < momGametes.length; i++) {
      for (let j = 0; j < dadGametes.length; j++) {
        labels.push(`${momGametes[i].genotype}♂ × ${dadGametes[j].genotype}♀`);
      }
    }
    return labels;
  }, [momGametes, dadGametes]);

  // Step 3: Unique Genotypes using Cartesian product (size 3^N)
  const uniqueGenotypes = useMemo(() => {
    return generateUniqueGenotypes(activeGenes);
  }, [activeGenes]);

  // Step 4: Combination Matrix C of size 3^N x 2^(2N)
  const combinationMatrix = useMemo(() => {
    return generateCombinationMatrix(uniqueGenotypes, momGametes, dadGametes, activeGenes);
  }, [uniqueGenotypes, momGametes, dadGametes, activeGenes]);

  // Step 5: Final Progeny Genotype Vector F = C * vec(P)
  const finalGenotypeVector = useMemo(() => {
    return multiplyMatrix(combinationMatrix, vecP);
  }, [combinationMatrix, vecP]);

  // Find Mendelian Ratio representation (e.g. 9:3:3:1)
  const mendelianRatio = useMemo(() => {
    // Filter out probabilities close to 0 to find the minimum positive probability
    const nonZeroProbs = finalGenotypeVector.filter((p) => p > 1e-9);
    if (nonZeroProbs.length === 0) return "";

    const minProb = Math.min(...nonZeroProbs);
    
    // Find a multiplier that turns all probabilities into integers
    // Since everything is based on powers of 0.5, we can just find the max denominator
    let maxDenom = 1;
    finalGenotypeVector.forEach((p) => {
      if (p > 1e-9) {
        const f = doubleToFraction(p);
        if (f.denominator > maxDenom) maxDenom = f.denominator;
      }
    });

    const ratioParts = finalGenotypeVector.map((p) => {
      const val = Math.round(p * maxDenom);
      return val > 0 ? val : 0;
    });

    // Simplify the ratios by their greatest common divisor
    let commonGCD = ratioParts.reduce((acc, val) => (val > 0 ? gcd(acc, val) : acc), ratioParts.find((v) => v > 0) || 1);
    const simplifiedParts = ratioParts.map((val) => val / commonGCD);

    // Group parts for display, only showing non-zero ratios
    const displayParts: { genotype: string; ratio: number }[] = [];
    uniqueGenotypes.forEach((geno, idx) => {
      if (simplifiedParts[idx] > 0) {
        displayParts.push({ genotype: geno, ratio: simplifiedParts[idx] });
      }
    });

    // Sort descending by ratio to look like standard ratios (e.g. 9:3:3:1)
    displayParts.sort((a, b) => b.ratio - a.ratio);

    return {
      ratioString: displayParts.map((p) => p.ratio).join(" : "),
      fullRatios: displayParts
    };
  }, [finalGenotypeVector, uniqueGenotypes]);

  // Active presets for classical genetics crosses
  const applyPreset = (presetType: "monohybrid" | "dihybrid" | "trihybrid" | "testcross" | "homozygous") => {
    setSelectedGenotype(null);
    switch (presetType) {
      case "monohybrid":
        setActiveGenes(["A"]);
        setMomInput("Aa");
        setDadInput("Aa");
        break;
      case "dihybrid":
        setActiveGenes(["A", "B"]);
        setMomInput("AaBb");
        setDadInput("AaBb");
        break;
      case "trihybrid":
        setActiveGenes(["A", "B", "C"]);
        setMomInput("AaBbCc");
        setDadInput("AaBbCc");
        break;
      case "testcross":
        setActiveGenes(["A", "B"]);
        setMomInput("AaBb");
        setDadInput("aabb");
        break;
      case "homozygous":
        setActiveGenes(["A", "B"]);
        setMomInput("AABB");
        setDadInput("aabb");
        break;
    }
  };

  const handleRandomize = () => {
    const { mom, dad } = generateRandomGenotypes(activeGenes);
    setMomInput(mom);
    setDadInput(dad);
    setSelectedGenotype(null);
  };

  const toggleGeneSymbol = (sym: string) => {
    setSelectedGenotype(null);
    if (activeGenes.includes(sym)) {
      if (activeGenes.length === 1) return; // Must have at least 1 gene
      setActiveGenes(activeGenes.filter((g) => g !== sym));
    } else {
      if (activeGenes.length >= 5) {
        // Safe lock at 5 active genes for visual layouts
        alert("For optimal visualization and to prevent performance issues, we limit the simulation to 5 active genes. You can swap existing letters!");
        return;
      }
      setActiveGenes([...activeGenes, sym].sort());
    }
  };

  const stepsInfo = [
    {
      title: "1. Kronecker Product (Parent Gametes)",
      description: "Computes the possibility of each parent passing on specific gametes (e.g. AB, Ab, aB, ab). During meiosis, genes segregate independently. We model this as the Kronecker product (tensor product) of separate single-gene probability vectors.",
      icon: <Binary className="w-4 h-4 text-indigo-500" />
    },
    {
      title: "2. Transpose Multiplication (Progeny Grid)",
      description: "Creates the complete unreduced offspring probability matrix. We multiply Mom's gamete column vector (M) by the transpose of Dad's gamete column vector (D^T). This is the matrix equivalent of the classic Punnett Square grid.",
      icon: <Grid3X3 className="w-4 h-4 text-emerald-500" />
    },
    {
      title: "3. Cartesian Product (Unique Genotypes)",
      description: "Computes the exact set of possible unique offspring genotypes. Since each gene can result in AA, Aa, or aa, there are strictly 3^N possible unique genotypes. We find these systematically using Cartesian multiplication.",
      icon: <List className="w-4 h-4 text-amber-500" />
    },
    {
      title: "4. Genotype Reduction (C × vec(P))",
      description: "Combines repeating genotypes in the Punnett grid (e.g. Ab × aB and aB × Ab both produce AaBb). We build a sparse Combination Matrix (C) of size 3^N × 2^2N and multiply it by the flattened progeny vector to merge duplicates.",
      icon: <Layers className="w-4 h-4 text-sky-500" />
    },
    {
      title: "5. Final Progeny Genotype Distribution",
      description: "The resulting final matrix vector showing the simplified probability distribution and Mendelian ratio of all offspring genotypes.",
      icon: <Calculator className="w-4 h-4 text-pink-500" />
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      
      {/* 1. Header Navigation */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-indigo-500 to-pink-500 p-2.5 rounded-xl shadow-md text-white">
              <Dna className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white flex items-center gap-2">
                Punnett Matrix Simulator
                <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 font-mono">
                  LINEAR ALGEBRA EDITION
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Solve any genetic cross of any scale using Kronecker products and transpose reduction matrices.
              </p>
            </div>
          </div>

          {/* Toggle View Style */}
          <div className="flex items-center gap-2 self-start md:self-center">
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-1 bg-slate-100/50 dark:bg-slate-900/50">
              <button
                onClick={() => setViewMode("stepper")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === "stepper"
                    ? "bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700/50"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Step-by-Step
              </button>
              <button
                onClick={() => setViewMode("notebook")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === "notebook"
                    ? "bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700/50"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Full Pipeline
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Main Body Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Setup, Config, and Presets (4 cols) */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
          
          {/* A. Preset Crosses */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <h3 className="font-sans font-bold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Classical presets
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => applyPreset("monohybrid")}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50 dark:bg-slate-900/50 text-left transition-all hover:shadow-xs group"
              >
                <div className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-500 dark:group-hover:text-indigo-450">Monohybrid</div>
                <div className="text-4xs text-slate-400 font-mono mt-0.5">Aa × Aa (1 Gene)</div>
              </button>
              <button
                onClick={() => applyPreset("dihybrid")}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50 dark:bg-slate-900/50 text-left transition-all hover:shadow-xs group"
              >
                <div className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-500 dark:group-hover:text-indigo-450">Dihybrid</div>
                <div className="text-4xs text-slate-400 font-mono mt-0.5">AaBb × AaBb (2 Genes)</div>
              </button>
              <button
                onClick={() => applyPreset("trihybrid")}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50 dark:bg-slate-900/50 text-left transition-all hover:shadow-xs group"
              >
                <div className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-500 dark:group-hover:text-indigo-450">Trihybrid</div>
                <div className="text-4xs text-slate-400 font-mono mt-0.5">AaBbCc × AaBbCc (3 Genes)</div>
              </button>
              <button
                onClick={() => applyPreset("testcross")}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-400 bg-slate-50 dark:bg-slate-900/50 text-left transition-all hover:shadow-xs group"
              >
                <div className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-500 dark:group-hover:text-indigo-450">Test Cross</div>
                <div className="text-4xs text-slate-400 font-mono mt-0.5">AaBb × aabb</div>
              </button>
            </div>
          </div>

          {/* B. Gene Selection Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-sans font-bold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Dna className="w-4 h-4 text-indigo-500" />
                Select Genes ({activeGenes.length})
              </h3>
              <span className="text-4xs text-slate-400 font-mono uppercase">Max 5 Selected</span>
            </div>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Toggle any of the 26 Mendel genes (A to Z). The simulator calculates crossings dynamically based on selected genes.
            </p>

            <div className="grid grid-cols-7 gap-1.5 p-1 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/80 mb-4">
              {ALL_ALPHABET_GENES.map((sym) => {
                const isSelected = activeGenes.includes(sym);
                return (
                  <button
                    key={sym}
                    onClick={() => toggleGeneSymbol(sym)}
                    className={`aspect-square rounded-lg flex items-center justify-center font-mono text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-indigo-500 text-white shadow-xs"
                        : "hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    {sym}
                  </button>
                );
              })}
            </div>

            {/* Scale Info Notice */}
            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-950/60 rounded-xl p-3 text-xs text-indigo-800 dark:text-indigo-300 flex gap-2.5 leading-relaxed">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Exponential Dimensions</span>
                With <span className="font-semibold font-mono">{activeGenes.length}</span> genes active, there are <span className="font-semibold font-mono">{Math.pow(2, activeGenes.length)}</span> parent gametes, <span className="font-semibold font-mono">{Math.pow(2, activeGenes.length * 2)}</span> progeny combinations, and <span className="font-semibold font-mono">{Math.pow(3, activeGenes.length)}</span> unique genotypes!
              </div>
            </div>
          </div>

          {/* C. Genotypes Input Form */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-sans font-bold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Shuffle className="w-4 h-4 text-indigo-500" />
                Genotypes setup
              </h3>
              <button
                onClick={handleRandomize}
                className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-450 hover:text-indigo-800 font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Randomize
              </button>
            </div>

            {/* Mom's input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-pink-600 dark:text-pink-400 flex items-center justify-between">
                <span>Mom ♀ Genotype</span>
                <span className="text-3xs font-mono text-slate-400 uppercase">Dominant Capital, Recessive Lower</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={momInput}
                  onChange={(e) => setMomInput(e.target.value)}
                  placeholder="e.g. AaBb"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-pink-500 dark:focus:ring-pink-400 focus:bg-white text-slate-800 dark:text-white"
                />
                <span className="absolute right-3.5 top-3.5 flex h-2 w-2 rounded-full bg-pink-500" />
              </div>
            </div>

            {/* Dad's input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center justify-between">
                <span>Dad ♂ Genotype</span>
                <span className="text-3xs font-mono text-slate-400 uppercase">Dominant Capital, Recessive Lower</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={dadInput}
                  onChange={(e) => setDadInput(e.target.value)}
                  placeholder="e.g. AABb"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:bg-white text-slate-800 dark:text-white"
                />
                <span className="absolute right-3.5 top-3.5 flex h-2 w-2 rounded-full bg-indigo-500" />
              </div>
            </div>

            {/* Parsed Genotypes Live Preview */}
            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 space-y-2">
              <span className="text-3xs font-bold text-slate-400 uppercase tracking-widest block">Mendel Allele Mapping</span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Mom list */}
                <div className="space-y-1 bg-pink-50/20 dark:bg-pink-950/10 p-2.5 rounded-xl border border-pink-100/50 dark:border-pink-950/30">
                  <span className="font-semibold text-pink-700 dark:text-pink-300 block mb-1">Mom Parsed:</span>
                  {parsedMomGenes.map((g) => (
                    <div key={`pm-${g.symbol}`} className="font-mono text-2xs flex justify-between">
                      <span className="text-slate-400">Gene {g.symbol}:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{g.allele1}{g.allele2}</span>
                    </div>
                  ))}
                </div>

                {/* Dad list */}
                <div className="space-y-1 bg-indigo-50/20 dark:bg-indigo-950/10 p-2.5 rounded-xl border border-indigo-100/50 dark:border-indigo-950/30">
                  <span className="font-semibold text-indigo-700 dark:text-indigo-300 block mb-1">Dad Parsed:</span>
                  {parsedDadGenes.map((g) => (
                    <div key={`pd-${g.symbol}`} className="font-mono text-2xs flex justify-between">
                      <span className="text-slate-400">Gene {g.symbol}:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{g.allele1}{g.allele2}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: The Interactive Calculations Dashboard (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* View Mode 1: Stepper Navigation Menu */}
          {viewMode === "stepper" && (
            <div className="grid grid-cols-5 gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs">
              {stepsInfo.map((st, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentStep(idx);
                    setSelectedGenotype(null);
                  }}
                  className={`flex flex-col items-center py-2.5 px-1.5 rounded-lg text-center transition-all ${
                    currentStep === idx
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-950 dark:text-white font-semibold"
                      : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  <div className="mb-1">{st.icon}</div>
                  <span className="text-3xs font-sans tracking-tight hidden sm:block">Step {idx + 1}</span>
                </button>
              ))}
            </div>
          )}

          {/* Output Dashboard content */}
          <div className="space-y-8">
            
            {/* Step 1 Content */}
            {(viewMode === "notebook" || currentStep === 0) && (
              <motion.section
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5"
              >
                <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-500 font-semibold font-mono text-xs">1</span>
                    <h2 className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">
                      Kronecker Product (Parent Gametes)
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    How likely is each parent to pass on a specific combination of alleles? By modeling meiosis as an independent tensor product, the gamete distribution is the Kronecker product (V_G1 ⊗ V_G2 ⊗ ...) of the individual gene distributions.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Mom Kronecker */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-pink-600 dark:text-pink-400 uppercase tracking-widest flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full bg-pink-500" />
                        Mom’s Kronecker Gametes (M)
                      </h3>
                      <span className="text-3xs font-mono text-slate-400 uppercase">Size: {momGametesVector.length} × 1</span>
                    </div>

                    <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 p-3 rounded-xl text-xs space-y-2 leading-relaxed">
                      <div className="font-semibold text-slate-700 dark:text-slate-300">Mathematical Formula:</div>
                      <div className="font-mono text-indigo-600 dark:text-indigo-400 text-center py-1">
                        M = {parsedMomGenes.map((g) => `V_${g.symbol}`).join(" ⊗ ")}
                      </div>
                      <div className="text-slate-500">
                        Where each individual vector represents the independent probabilities of chromosome segregation:
                      </div>
                      <div className="grid grid-cols-2 gap-2 font-mono text-3xs text-slate-400 bg-slate-100 dark:bg-slate-950 p-2 rounded-md">
                        {parsedMomGenes.map((g) => (
                          <div key={`m-k-g-${g.symbol}`} className="flex justify-between px-1">
                            <span>V_{g.symbol}:</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {getSingleGeneVectorText(g)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <MatrixView
                      title="Mom’s Gamete Probability Vector (M)"
                      subtitle="Result of Kronecker product of single-gene probabilities"
                      data={momGametesVector}
                      rowLabels={momGameteLabels}
                      colLabels={["Probability"]}
                    />
                  </div>

                  {/* Dad Kronecker */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full bg-indigo-500" />
                        Dad’s Kronecker Gametes (D)
                      </h3>
                      <span className="text-3xs font-mono text-slate-400 uppercase">Size: {dadGametesVector.length} × 1</span>
                    </div>

                    <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 p-3 rounded-xl text-xs space-y-2 leading-relaxed">
                      <div className="font-semibold text-slate-700 dark:text-slate-300">Mathematical Formula:</div>
                      <div className="font-mono text-indigo-600 dark:text-indigo-400 text-center py-1">
                        D = {parsedDadGenes.map((g) => `W_${g.symbol}`).join(" ⊗ ")}
                      </div>
                      <div className="text-slate-500">
                        Where each individual vector represents the independent probabilities of chromosome segregation:
                      </div>
                      <div className="grid grid-cols-2 gap-2 font-mono text-3xs text-slate-400 bg-slate-100 dark:bg-slate-950 p-2 rounded-md">
                        {parsedDadGenes.map((g) => (
                          <div key={`d-k-g-${g.symbol}`} className="flex justify-between px-1">
                            <span>W_{g.symbol}:</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {getSingleGeneVectorText(g)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <MatrixView
                      title="Dad’s Gamete Probability Vector (D)"
                      subtitle="Result of Kronecker product of single-gene probabilities"
                      data={dadGametesVector}
                      rowLabels={dadGameteLabels}
                      colLabels={["Probability"]}
                    />
                  </div>
                </div>
              </motion.section>
            )}

            {/* Step 2 Content */}
            {(viewMode === "notebook" || currentStep === 1) && (
              <motion.section
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 font-semibold font-mono text-xs">2</span>
                      <h2 className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">
                        Transpose Multiplication ($M \times D^T$)
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Now, we cross Mom&apos;s gamete combinations with Dad&apos;s. In linear algebra, this is modeled by multiplying Mom&apos;s column vector ($M$ size $2^N \times 1$) by the transpose of Dad&apos;s column vector ($D^T$ size $1 \times 2^N$) to yield the joint progeny probability matrix ($P$) of size $2^N \times 2^N$.
                    </p>
                  </div>

                  {/* Math Visualization */}
                  <div className="flex flex-col md:flex-row items-center justify-center gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 font-mono text-xs">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-pink-600 dark:text-pink-400">M</span>
                      <span className="text-slate-400">({momGametes.length}×1)</span>
                    </div>
                    <span className="text-slate-400 font-sans">×</span>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">Dᵀ</span>
                      <span className="text-slate-400">(1×{dadGametes.length})</span>
                    </div>
                    <span className="text-slate-400 font-sans">=</span>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-emerald-500">P</span>
                      <span className="text-slate-400">({momGametes.length}×{dadGametes.length})</span>
                    </div>
                  </div>
                </div>

                {/* The Interactive Punnett Grid */}
                <PunnettGrid
                  momGametes={momGametes}
                  dadGametes={dadGametes}
                  geneSymbols={activeGenes}
                  hoveredCell={hoveredCell}
                  setHoveredCell={setHoveredCell}
                  selectedGenotype={selectedGenotype}
                />
              </motion.section>
            )}

            {/* Step 3 Content */}
            {(viewMode === "notebook" || currentStep === 2) && (
              <motion.section
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5"
              >
                <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 font-semibold font-mono text-xs">3</span>
                    <h2 className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">
                      Cartesian Product (Unique Genotypes List)
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Mendelian crossings have repeated cells in the Punnett square. To find the exact list of potential unique offspring genotypes, we use Cartesian multiplication of the possible allele pairs {"{AA, Aa, aa}"} for each crossed gene.
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-3 text-xs leading-relaxed">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-2xs">Cartesian Formula</span>
                    <span className="font-mono text-amber-500 font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/40">
                      Total Genotypes = 3^N = 3^{"{"}{activeGenes.length}{"}"} = {uniqueGenotypes.length}
                    </span>
                  </div>
                  <div className="font-mono text-slate-600 dark:text-slate-400 flex flex-wrap gap-2 items-center justify-center py-1">
                    {activeGenes.map((sym, i) => (
                      <React.Fragment key={sym}>
                        {i > 0 && <span className="font-sans text-slate-400 mx-1">×</span>}
                        <span className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-md text-slate-800 dark:text-slate-200 font-bold">
                          {"{"}{sym.toUpperCase()}{sym.toUpperCase()}, {sym.toUpperCase()}{sym.toLowerCase()}, {sym.toLowerCase()}{sym.toLowerCase()}{"}"}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Unique Genotypes Badge Grid */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                    Unique offspring genotypes ({uniqueGenotypes.length})
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    {uniqueGenotypes.map((geno) => {
                      const isSelected = selectedGenotype === geno;
                      const idx = uniqueGenotypes.indexOf(geno);
                      const prob = finalGenotypeVector[idx];
                      
                      return (
                        <button
                          key={geno}
                          onClick={() => setSelectedGenotype(selectedGenotype === geno ? null : geno)}
                          className={`py-2.5 px-3 rounded-xl border text-center font-mono text-xs sm:text-sm tracking-wider font-bold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-amber-500 text-white border-amber-600 shadow-md scale-[1.03]"
                              : prob === 0
                              ? "bg-slate-50/50 dark:bg-slate-900/10 text-slate-350 dark:text-slate-650 border-slate-150 dark:border-slate-900 opacity-60"
                              : "bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800/80 hover:border-amber-400 hover:bg-amber-50/20 dark:hover:bg-amber-950/20"
                          }`}
                          title={prob === 0 ? `Genotype ${geno} (0% probability)` : `Genotype ${geno} - Click to highlight`}
                        >
                          {geno}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.section>
            )}

            {/* Step 4 Content */}
            {(viewMode === "notebook" || currentStep === 3) && (
              <motion.section
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6"
              >
                <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-500/10 text-sky-500 font-semibold font-mono text-xs">4</span>
                    <h2 className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">
                      Genotype Reduction ($C \times vec(P)$)
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    To mathematically simplify repeating Punnett crossings, we create a **Combination Matrix** (C) of size 3^N × 2^2N. The row indexes represent the unique genotypes, while columns represent the flat gamete pairs in the Punnett Square. Multiplying C by the flattened progeny vector vec(P) gives the exact genotype outcome probability.
                  </p>
                </div>

                {/* Math layout details */}
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 text-xs space-y-2 leading-relaxed">
                  <div className="font-semibold text-slate-700 dark:text-slate-300">Linear Algebra Reduction:</div>
                  <div className="font-mono text-indigo-600 dark:text-indigo-400 text-center py-1">
                    F = C × vec(P)
                  </div>
                  <div className="text-slate-500">
                    - **Combination Matrix (C)**: size <span className="font-mono font-bold">{uniqueGenotypes.length} × {vecP.length}</span> (contains 1s where a gamete pairing matches a unique genotype, 0s elsewhere).
                    <br />
                    - **Flattened Progeny Vector (vec(P))**: size <span className="font-mono font-bold">{vecP.length} × 1</span>.
                    <br />
                    - **Final Vector (F)**: size <span className="font-mono font-bold">{uniqueGenotypes.length} × 1</span>.
                  </div>
                </div>

                {/* Main Matrix Equation View showing full C x vec(P) = F */}
                <MatrixEquationView
                  combinationMatrix={combinationMatrix}
                  uniqueGenotypes={uniqueGenotypes}
                  progenyLabelsFlat={progenyLabelsFlat}
                  vecP={vecP}
                  finalGenotypeVector={finalGenotypeVector}
                  selectedGenotype={selectedGenotype}
                  setSelectedGenotype={setSelectedGenotype}
                />
              </motion.section>
            )}

            {/* Step 5 Content */}
            {(viewMode === "notebook" || currentStep === 4) && (
              <motion.section
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6"
              >
                <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-pink-500/10 text-pink-500 font-semibold font-mono text-xs">5</span>
                      <h2 className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">
                        Final Progeny Genotype Distribution (F)
                      </h2>
                    </div>
                    {mendelianRatio && (
                      <span className="font-mono text-2xs font-semibold px-2.5 py-1 rounded-full bg-pink-50 dark:bg-pink-950 border border-pink-200 dark:border-pink-850 text-pink-600 dark:text-pink-400">
                        Ratio: {mendelianRatio.ratioString}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    The completed final distribution vector ($F = C \times vec(P)$). This shows the exact probability, ratio, and phenotypic properties of the progeny.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  
                  {/* Matrix representation of final result */}
                  <div className="md:col-span-5 space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                      Final Matrix Vector (F)
                    </h3>
                    <MatrixView
                      title="Offspring Probability Vector (F)"
                      subtitle="Resulting genotype distribution"
                      data={finalGenotypeVector.map((v) => [v])}
                      rowLabels={uniqueGenotypes}
                      colLabels={["Probability"]}
                    />
                  </div>

                  {/* High quality summary results table */}
                  <div className="md:col-span-7 space-y-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                      Genotype Outcomes Summary Table
                    </h3>

                    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/30 dark:bg-slate-900/10">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                            <th className="p-3 font-semibold">Genotype</th>
                            <th className="p-3 font-semibold">Fraction</th>
                            <th className="p-3 font-semibold">Percentage</th>
                            <th className="p-3 font-semibold text-right">Mendel Ratio</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                          {uniqueGenotypes.map((geno, idx) => {
                            const prob = finalGenotypeVector[idx];
                            if (prob === 0) return null; // Only show non-zero probabilities for clean readability
                            
                            const ratioPart = mendelianRatio ? mendelianRatio.fullRatios.find((r) => r.genotype === geno)?.ratio : 0;
                            
                            return (
                              <tr
                                key={`row-summary-${geno}`}
                                className="hover:bg-slate-50 dark:hover:bg-slate-950 transition-all"
                              >
                                <td className="p-3 font-mono font-bold text-slate-800 dark:text-slate-200 tracking-wider">
                                  {geno}
                                </td>
                                <td className="p-3 font-mono text-slate-500">
                                  {doubleToFraction(prob).label}
                                </td>
                                <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                                  {(prob * 100).toFixed(2)}%
                                </td>
                                <td className="p-3 font-mono text-right font-semibold text-pink-600 dark:text-pink-400">
                                  {ratioPart || 0}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Chart preview using direct tailwind elements */}
                    <div className="bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                      <h4 className="text-3xs font-bold text-slate-400 uppercase tracking-widest block">Probability Distribution Visualizer</h4>
                      <div className="space-y-2">
                        {uniqueGenotypes.map((geno, idx) => {
                          const prob = finalGenotypeVector[idx];
                          if (prob === 0) return null;
                          return (
                            <div key={`chart-row-${geno}`} className="space-y-1">
                              <div className="flex justify-between text-4xs font-mono text-slate-400">
                                <span className="font-bold text-slate-600 dark:text-slate-300">{geno}</span>
                                <span>{(prob * 100).toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-slate-250 dark:bg-slate-850 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-indigo-500 to-pink-500 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${prob * 100}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </div>
              </motion.section>
            )}

          </div>

        </div>

      </main>

      {/* 3. Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 py-6 px-6 text-center text-xs text-slate-400 dark:text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Punnett Square Matrix Simulator. Built for high-dimensional genetics calculations using modern linear algebra.</p>
          <div className="flex gap-4 font-mono text-3xs">
            <span>V_KRONECKER = 2^N</span>
            <span>V_COMBINATION = 3^N × 2^2N</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
