/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { doubleToFraction } from "../utils";
import { Info, HelpCircle, Layers, CheckCircle2 } from "lucide-react";

interface MatrixEquationProps {
  combinationMatrix: number[][];
  uniqueGenotypes: string[];
  progenyLabelsFlat: string[];
  vecP: number[];
  finalGenotypeVector: number[];
  selectedGenotype: string | null;
  setSelectedGenotype: (genotype: string | null) => void;
}

export default function MatrixEquationView({
  combinationMatrix,
  uniqueGenotypes,
  progenyLabelsFlat,
  vecP,
  finalGenotypeVector,
  selectedGenotype,
  setSelectedGenotype,
}: MatrixEquationProps) {
  const [showFractions, setShowFractions] = useState(true);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [filterContributingOnly, setFilterContributingOnly] = useState(true);

  const numRows = uniqueGenotypes.length;
  const numCols = progenyLabelsFlat.length;

  // Pagination for rows
  const [page, setPage] = useState(0);
  const itemsPerPage = 8;
  const totalPages = Math.ceil(numRows / itemsPerPage);

  // Pagination for columns
  const [colPage, setColPage] = useState(0);
  const colsPerPage = 8;

  const selectedRowIdx = useMemo(() => {
    return selectedGenotype ? uniqueGenotypes.indexOf(selectedGenotype) : -1;
  }, [selectedGenotype, uniqueGenotypes]);

  // Find all column indices that contribute to the selected genotype (value is 1)
  const contributingColIndices = useMemo(() => {
    if (selectedRowIdx === -1) return [];
    const indices: number[] = [];
    const row = combinationMatrix[selectedRowIdx];
    if (row) {
      for (let c = 0; c < row.length; c++) {
        if (row[c] === 1) {
          indices.push(c);
        }
      }
    }
    return indices;
  }, [selectedRowIdx, combinationMatrix]);

  // Sliced display indices for columns based on whether filter is enabled
  const displayColIndices = useMemo(() => {
    if (selectedGenotype && filterContributingOnly && contributingColIndices.length > 0) {
      return contributingColIndices;
    }
    return Array.from({ length: numCols }, (_, i) => i);
  }, [selectedGenotype, filterContributingOnly, contributingColIndices, numCols]);

  const totalColPages = Math.ceil(displayColIndices.length / colsPerPage);

  // Auto-scroll row page when selected genotype changes
  useEffect(() => {
    if (selectedGenotype) {
      const idx = uniqueGenotypes.indexOf(selectedGenotype);
      if (idx !== -1) {
        setPage(Math.floor(idx / itemsPerPage));
      }
    }
  }, [selectedGenotype, uniqueGenotypes]);

  // Clamp column page if index lists change
  useEffect(() => {
    if (colPage >= totalColPages) {
      setColPage(0);
    }
  }, [totalColPages, colPage]);

  // Reset pages if basic inputs change
  useEffect(() => {
    setPage(0);
    setColPage(0);
  }, [uniqueGenotypes, progenyLabelsFlat]);

  const formatValue = (val: number) => {
    if (val === 0) return "0";
    if (showFractions) {
      return doubleToFraction(val).label;
    }
    return val.toFixed(4).replace(/\.?0+$/, "");
  };

  const slicedColIndices = useMemo(() => {
    return displayColIndices.slice(colPage * colsPerPage, (colPage + 1) * colsPerPage);
  }, [displayColIndices, colPage, colsPerPage]);

  return (
    <div id="matrix-equation-panel" className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
      
      {/* Header and Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div>
          <h3 className="text-sm font-sans font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-md bg-indigo-500/10 text-indigo-500 text-3xs font-mono">EQ</span>
            Linear Algebra Equation View
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Visualizing the mathematical system: <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">C × vec(P) = F</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Active Filtering Info */}
          {selectedGenotype && contributingColIndices.length > 0 && (
            <label className="flex items-center gap-1.5 text-2xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none bg-indigo-50/55 dark:bg-indigo-950/25 border border-indigo-100/50 dark:border-indigo-900/30 px-2.5 py-1.5 rounded-lg">
              <input
                type="checkbox"
                checked={filterContributingOnly}
                onChange={(e) => {
                  setFilterContributingOnly(e.target.checked);
                  setColPage(0);
                }}
                className="rounded border-slate-300 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
              />
              <span>Only show contributing crosses ({contributingColIndices.length})</span>
            </label>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider">Format:</span>
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-100 dark:bg-slate-950">
              <button
                onClick={() => setShowFractions(true)}
                className={`px-2 py-1 rounded-md text-3xs font-bold transition-all cursor-pointer ${
                  showFractions
                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
                }`}
              >
                Fractions
              </button>
              <button
                onClick={() => setShowFractions(false)}
                className={`px-2 py-1 rounded-md text-3xs font-bold transition-all cursor-pointer ${
                  !showFractions
                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
                }`}
              >
                Decimals
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Multiplication Explainer Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-slate-950/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/60 text-center">
        <div className="space-y-1">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block" />
            C (Combination Matrix)
          </div>
          <p className="text-3xs text-slate-400 leading-normal">
            Contains 1s and 0s indicating which crosses yield each unique genotype outcome.
          </p>
        </div>
        <div className="space-y-1 border-y md:border-y-0 md:border-x border-slate-100 dark:border-slate-850 py-3 md:py-0">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
            vec(P) (Progeny Probabilities)
          </div>
          <p className="text-3xs text-slate-400 leading-normal">
            Vector of independent probabilities for all possible crosses from the Punnett Square.
          </p>
        </div>
        <div className="space-y-1">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
            F (Offspring Distribution)
          </div>
          <p className="text-3xs text-slate-400 leading-normal">
            The resulting unique genotype frequencies ($C \times vec(P)$).
          </p>
        </div>
      </div>

      {/* Interactive Helper Hint */}
      {selectedGenotype ? (
        <div className="bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-900/40 p-3 rounded-xl flex items-center gap-2.5 text-xs text-indigo-800 dark:text-indigo-300">
          <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
          <div className="flex-1">
            Selected Genotype: <span className="font-mono font-bold bg-indigo-100 dark:bg-indigo-950 px-1.5 py-0.5 rounded-md text-indigo-700 dark:text-indigo-400">{selectedGenotype}</span>.
            {filterContributingOnly && contributingColIndices.length > 0 ? (
              <span> Showing the <strong className="font-bold">{contributingColIndices.length}</strong> matching gamete crossings that produce it.</span>
            ) : (
              <span> Scroll horizontally to find the matching crosses (indicated with 1s).</span>
            )}
          </div>
          <button
            onClick={() => setSelectedGenotype(null)}
            className="text-3xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            Clear Selected
          </button>
        </div>
      ) : (
        <div className="bg-slate-100/50 dark:bg-slate-900/25 border border-slate-200/40 dark:border-slate-800/40 p-3 rounded-xl flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
          <Info className="w-4 h-4 text-slate-400 shrink-0" />
          <div>
            Click a unique genotype in <strong>Step 3</strong> to auto-scroll the equation and filter columns to its matching crosses!
          </div>
        </div>
      )}

      {/* Pagination controls if rows or columns exceed limits */}
      {(totalPages > 1 || totalColPages > 1) && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-100/50 dark:bg-slate-950/40 px-4 py-3 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
          {totalPages > 1 && (
            <div className="flex items-center justify-between md:justify-start gap-4 flex-1">
              <span className="text-3xs font-mono text-slate-400 uppercase font-semibold">
                Rows {page * itemsPerPage + 1} - {Math.min((page + 1) * itemsPerPage, numRows)} of {numRows}
              </span>
              <div className="flex gap-1.5">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="px-2 py-1 text-4xs font-bold uppercase rounded-md bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 disabled:opacity-30 cursor-pointer hover:bg-slate-50 text-slate-700 dark:text-slate-300 shadow-3xs"
                >
                  Prev Rows
                </button>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  className="px-2 py-1 text-4xs font-bold uppercase rounded-md bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 disabled:opacity-30 cursor-pointer hover:bg-slate-50 text-slate-700 dark:text-slate-300 shadow-3xs"
                >
                  Next Rows
                </button>
              </div>
            </div>
          )}
          
          {totalColPages > 1 && (
            <div className="flex items-center justify-between md:justify-end gap-4 flex-1 border-t md:border-t-0 pt-2.5 md:pt-0 border-slate-200/40 dark:border-slate-850">
              <span className="text-3xs font-mono text-slate-400 uppercase font-semibold">
                Columns {colPage * colsPerPage + 1} - {Math.min((colPage + 1) * colsPerPage, displayColIndices.length)} of {displayColIndices.length}
              </span>
              <div className="flex gap-1.5">
                <button
                  disabled={colPage === 0}
                  onClick={() => setColPage((p) => Math.max(0, p - 1))}
                  className="px-2 py-1 text-4xs font-bold uppercase rounded-md bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 disabled:opacity-30 cursor-pointer hover:bg-slate-50 text-slate-700 dark:text-slate-300 shadow-3xs"
                >
                  Prev Cols
                </button>
                <button
                  disabled={colPage >= totalColPages - 1}
                  onClick={() => setColPage((p) => Math.min(totalColPages - 1, p + 1))}
                  className="px-2 py-1 text-4xs font-bold uppercase rounded-md bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-750 disabled:opacity-30 cursor-pointer hover:bg-slate-50 text-slate-700 dark:text-slate-300 shadow-3xs"
                >
                  Next Cols
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Equation Container */}
      <div className="w-full overflow-x-auto py-4 px-2 select-none matrix-scroll">
        <div className="flex items-start justify-center gap-6 min-w-max">
          
          {/* 1. Combination Matrix (C) */}
          <div className="flex flex-col items-center gap-1">
            <div className="text-3xs font-bold text-slate-400 uppercase tracking-widest mb-1">
              Matrix C <span className="text-slate-350 dark:text-slate-650 font-normal">({numRows} × {numCols})</span>
            </div>
            
            <div className="flex items-start gap-1">
              {/* Row Names (Outside Left Bracket) */}
              <div
                className="flex flex-col gap-1 select-none pr-1.5 text-right"
                style={{ paddingTop: "44px" }} // Align with the cell height of 36px plus header height of 40px plus gap
              >
                {uniqueGenotypes.slice(page * itemsPerPage, (page + 1) * itemsPerPage).map((geno, i) => {
                  const absoluteIdx = page * itemsPerPage + i;
                  const isHovered = hoveredRow === absoluteIdx;
                  const isSelected = selectedGenotype === geno;
                  return (
                    <button
                      key={`eq-rl-${geno}`}
                      onClick={() => setSelectedGenotype(selectedGenotype === geno ? null : geno)}
                      className={`font-mono text-2xs px-1.5 rounded-md transition-all flex items-center justify-end h-9 cursor-pointer w-full text-right ${
                        isSelected
                          ? "bg-amber-500 text-white font-bold"
                          : isHovered
                          ? "bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold"
                          : "text-slate-400 dark:text-slate-500 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {geno}
                    </button>
                  );
                })}
              </div>

              {/* Matrix C plus its Column Header wrapper */}
              <div className="flex flex-col">
                {/* Column Headers (Stacked Genes) */}
                <div
                  className="flex items-center gap-3.5 h-10 select-none pb-1"
                  style={{ paddingLeft: "16px" }} // Bracket width (12px) + grid padding (4px)
                >
                  {slicedColIndices.map((absoluteColIdx) => {
                    const label = progenyLabelsFlat[absoluteColIdx];
                    const parts = label.split(" × ");
                    const part0 = parts[0] || label;
                    const part1 = parts[1] || "";
                    const isColHovered = hoveredCol === absoluteColIdx;
                    return (
                      <div
                        key={`hdr-c-${absoluteColIdx}`}
                        className={`flex flex-col items-center justify-end leading-none text-[8.5px] font-mono h-10 w-12 transition-all ${
                          isColHovered
                            ? "text-indigo-600 dark:text-indigo-400 font-bold scale-105"
                            : "text-slate-400 dark:text-slate-500"
                        }`}
                      >
                        <span className="tracking-tight">{part0}</span>
                        {part1 && <span className="text-[7px] text-slate-300 dark:text-slate-700 my-0.5">×</span>}
                        {part1 && <span className="tracking-tight">{part1}</span>}
                      </div>
                    );
                  })}
                </div>

                {/* Bracketed Grid */}
                <div className="flex items-stretch">
                  {/* Left Bracket */}
                  <div className="w-3 border-l-4 border-t-4 border-b-4 border-slate-800 dark:border-slate-300 rounded-l-[4px] self-stretch transition-colors" />

                  {/* Cells Grid */}
                  <div className="flex flex-col justify-around gap-1 py-1 px-1">
                    {combinationMatrix.slice(page * itemsPerPage, (page + 1) * itemsPerPage).map((row, rIdx) => {
                      const absoluteRowIdx = page * itemsPerPage + rIdx;
                      const currentRowGenotype = uniqueGenotypes[absoluteRowIdx];
                      const isCurrentRowSelected = selectedGenotype === currentRowGenotype;
                      
                      return (
                        <div key={`eq-row-${rIdx}`} className="flex items-center gap-3.5 h-9">
                          {slicedColIndices.map((absoluteColIdx) => {
                            const val = row[absoluteColIdx];
                            const isRowHovered = hoveredRow === absoluteRowIdx;
                            const isColHovered = hoveredCol === absoluteColIdx;
                            const isDirectHovered = isRowHovered && isColHovered;
                            
                            return (
                              <div
                                key={`eq-cell-${absoluteRowIdx}-${absoluteColIdx}`}
                                onMouseEnter={() => {
                                  setHoveredRow(absoluteRowIdx);
                                  setHoveredCol(absoluteColIdx);
                                }}
                                onMouseLeave={() => {
                                  setHoveredRow(null);
                                  setHoveredCol(null);
                                }}
                                className={`font-mono text-2xs text-center w-12 py-1 rounded-md transition-all cursor-crosshair ${
                                  isDirectHovered
                                    ? "bg-indigo-500 text-white font-bold shadow-xs scale-105"
                                    : isCurrentRowSelected && val === 1
                                    ? "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-bold ring-2 ring-indigo-500"
                                    : isRowHovered
                                    ? "bg-indigo-100/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-450 font-medium"
                                    : isColHovered
                                    ? "bg-slate-200/50 dark:bg-slate-800/30 text-slate-700 dark:text-slate-300"
                                    : val === 0
                                    ? "text-slate-300 dark:text-slate-700"
                                    : "text-slate-700 dark:text-slate-300 font-semibold"
                                }`}
                              >
                                {val}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Bracket */}
                  <div className="w-3 border-r-4 border-t-4 border-b-4 border-slate-800 dark:border-slate-300 rounded-r-[4px] self-stretch transition-colors" />
                </div>
              </div>

            </div>
          </div>

          {/* Huge Multiplication Symbol */}
          <div
            className="text-slate-300 dark:text-slate-750 font-sans font-light text-2xl px-1 transition-colors flex items-center justify-center h-full self-center"
            style={{ paddingTop: "40px" }} // Align horizontally with row elements
          >
            ×
          </div>

          {/* 2. Flat Progeny Vector vec(P) */}
          <div className="flex flex-col items-center gap-1">
            <div className="text-3xs font-bold text-slate-400 uppercase tracking-widest mb-1">
              Vector vec(P) <span className="text-slate-350 dark:text-slate-650 font-normal">({numCols} × 1)</span>
            </div>

            <div className="flex items-start gap-1">
              
              <div className="flex flex-col">
                {/* Column Header */}
                <div
                  className="flex items-center justify-center h-10 select-none pb-1"
                  style={{ paddingLeft: "16px" }}
                >
                  <div className="font-mono text-3xs text-center w-18 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
                    Prob.
                  </div>
                </div>

                {/* Bracketed Grid */}
                <div className="flex items-stretch">
                  {/* Left Bracket */}
                  <div className="w-3 border-l-4 border-t-4 border-b-4 border-slate-800 dark:border-slate-300 rounded-l-[4px] self-stretch transition-colors" />

                  {/* Column Elements */}
                  <div className="flex flex-col justify-around gap-1 py-1 px-1">
                    {slicedColIndices.map((absoluteColIdx) => {
                      const val = vecP[absoluteColIdx];
                      const isHovered = hoveredCol === absoluteColIdx;
                      return (
                        <div
                          key={`eq-vecp-${absoluteColIdx}`}
                          onMouseEnter={() => setHoveredCol(absoluteColIdx)}
                          onMouseLeave={() => setHoveredCol(null)}
                          className={`font-mono text-2xs text-center w-18 h-9 flex items-center justify-center rounded-md transition-all cursor-crosshair ${
                            isHovered
                              ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-bold scale-[1.03] shadow-xs"
                              : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {formatValue(val)}
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Bracket */}
                  <div className="w-3 border-r-4 border-t-4 border-b-4 border-slate-800 dark:border-slate-300 rounded-r-[4px] self-stretch transition-colors" />
                </div>
              </div>

              {/* Row Names (Outside Right Bracket) */}
              <div
                className="flex flex-col gap-1 select-none pl-1.5"
                style={{ paddingTop: "44px" }}
              >
                {slicedColIndices.map((absoluteColIdx) => {
                  const label = progenyLabelsFlat[absoluteColIdx];
                  const isHovered = hoveredCol === absoluteColIdx;
                  return (
                    <div
                      key={`eq-cl-${absoluteColIdx}`}
                      className={`font-mono text-3xs px-1.5 transition-all truncate max-w-[100px] flex items-center h-9 ${
                        isHovered
                          ? "text-amber-500 font-bold bg-amber-50/40 dark:bg-amber-950/20 rounded-md"
                          : "text-slate-400 dark:text-slate-650"
                      }`}
                      title={label}
                    >
                      {label}
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

          {/* Huge Equals Sign */}
          <div
            className="text-slate-300 dark:text-slate-750 font-sans font-light text-2xl px-1 transition-colors flex items-center justify-center h-full self-center"
            style={{ paddingTop: "40px" }}
          >
            =
          </div>

          {/* 3. Final Vector (F) */}
          <div className="flex flex-col items-center gap-1">
            <div className="text-3xs font-bold text-slate-400 uppercase tracking-widest mb-1">
              Vector F <span className="text-slate-350 dark:text-slate-650 font-normal">({numRows} × 1)</span>
            </div>

            <div className="flex items-start gap-1">
              {/* Row Names on left */}
              <div className="flex flex-col">
                {/* Column Header */}
                <div
                  className="flex items-center justify-center h-10 select-none pb-1"
                  style={{ paddingLeft: "16px" }}
                >
                  <div className="font-mono text-3xs text-center w-18 text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
                    F_freq
                  </div>
                </div>

                {/* Bracketed Grid */}
                <div className="flex items-stretch">
                  {/* Left Bracket */}
                  <div className="w-3 border-l-4 border-t-4 border-b-4 border-slate-800 dark:border-slate-300 rounded-l-[4px] self-stretch transition-colors" />

                  {/* Column Elements */}
                  <div className="flex flex-col justify-around gap-1 py-1 px-1">
                    {finalGenotypeVector.slice(page * itemsPerPage, (page + 1) * itemsPerPage).map((val, rIdx) => {
                      const absoluteRowIdx = page * itemsPerPage + rIdx;
                      const isHovered = hoveredRow === absoluteRowIdx;
                      const isSelected = selectedGenotype === uniqueGenotypes[absoluteRowIdx];
                      return (
                        <div
                          key={`eq-f-${rIdx}`}
                          onMouseEnter={() => setHoveredRow(absoluteRowIdx)}
                          onMouseLeave={() => setHoveredRow(null)}
                          className={`font-mono text-2xs text-center w-18 h-9 flex items-center justify-center rounded-md transition-all cursor-crosshair ${
                            isSelected
                              ? "bg-amber-500 text-white font-bold"
                              : isHovered
                              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold scale-[1.03]"
                              : val === 0
                              ? "text-slate-300 dark:text-slate-700"
                              : "text-emerald-600 dark:text-emerald-450 font-semibold"
                          }`}
                        >
                          {formatValue(val)}
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Bracket */}
                  <div className="w-3 border-r-4 border-t-4 border-b-4 border-slate-800 dark:border-slate-300 rounded-r-[4px] self-stretch transition-colors" />
                </div>
              </div>

              {/* Row Names on right of vector F */}
              <div
                className="flex flex-col gap-1 select-none pl-1.5"
                style={{ paddingTop: "44px" }}
              >
                {uniqueGenotypes.slice(page * itemsPerPage, (page + 1) * itemsPerPage).map((geno, i) => {
                  const absoluteIdx = page * itemsPerPage + i;
                  const isHovered = hoveredRow === absoluteIdx;
                  const isSelected = selectedGenotype === geno;
                  return (
                    <button
                      key={`eq-rl-f-${geno}`}
                      onClick={() => setSelectedGenotype(selectedGenotype === geno ? null : geno)}
                      className={`font-mono text-2xs px-1.5 rounded-md transition-all flex items-center h-9 cursor-pointer text-left ${
                        isSelected
                          ? "bg-amber-500 text-white font-bold"
                          : isHovered
                          ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 font-bold"
                          : "text-slate-400 dark:text-slate-500 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                    >
                      {geno}
                    </button>
                  );
                })}
              </div>

            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
