/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Gamete } from "../types";
import { doubleToFraction, mergeGametes } from "../utils";

interface PunnettGridProps {
  momGametes: Gamete[];
  dadGametes: Gamete[];
  geneSymbols: string[];
  hoveredCell: { row: number; col: number } | null;
  setHoveredCell: (cell: { row: number; col: number } | null) => void;
  selectedGenotype: string | null;
}

export default function PunnettGrid({
  momGametes,
  dadGametes,
  geneSymbols,
  hoveredCell,
  setHoveredCell,
  selectedGenotype,
}: PunnettGridProps) {
  // Check if a cell's resulting genotype matches the currently selected genotype
  const isMatchingGenotype = (momGamete: string, dadGamete: string) => {
    if (!selectedGenotype) return false;
    const offspring = mergeGametes(momGamete, dadGamete, geneSymbols);
    return offspring === selectedGenotype;
  };

  return (
    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
        <div>
          <h4 className="font-sans font-semibold text-slate-800 dark:text-slate-100 text-sm tracking-tight">
            Punnett Cross Progeny Grid ($P$)
          </h4>
          <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Formed by multiplying Mom&apos;s gamete column vector by Dad&apos;s gamete row vector transpose ($M \times D^T$).
          </p>
        </div>
      </div>

      {/* Scrollable Container */}
      <div className="flex-1 overflow-auto matrix-scroll pb-2">
        <div className="min-w-[450px] p-2">
          <table className="border-collapse mx-auto">
            <thead>
              <tr>
                {/* Top-left empty cell representing cross direction */}
                <th className="p-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 relative min-w-[90px] h-[90px]">
                  <div className="absolute top-2 right-2 text-3xs font-mono text-indigo-500 font-bold uppercase tracking-wider">Dad ♂</div>
                  <div className="absolute bottom-2 left-2 text-3xs font-mono text-pink-500 font-bold uppercase tracking-wider">Mom ♀</div>
                  <div className="absolute top-0 bottom-0 left-0 right-0 border-t border-r border-slate-200 dark:border-slate-800 pointer-events-none" 
                       style={{ background: "linear-gradient(to bottom right, transparent 49%, var(--color-slate-200) 49.5%, var(--color-slate-200) 50.5%, transparent 51%)" }} />
                </th>
                
                {/* Column Headers: Dad's gametes */}
                {dadGametes.map((gamete, j) => {
                  const isColHovered = hoveredCell?.col === j;
                  return (
                    <th
                      key={`dad-gamete-${j}`}
                      className={`p-3 border border-slate-200 dark:border-slate-800 text-center transition-all ${
                        isColHovered
                          ? "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold"
                          : "bg-slate-50 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300 font-semibold"
                      }`}
                    >
                      <div className="font-mono text-xs tracking-wider">{gamete.genotype}</div>
                      <div className="font-mono text-4xs text-slate-400 mt-0.5 font-normal">
                        {doubleToFraction(gamete.probability).label}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* Rows: Mom's gamete */}
              {momGametes.map((momGamete, i) => {
                const isRowHovered = hoveredCell?.row === i;
                return (
                  <tr key={`mom-row-${i}`}>
                    {/* Row Header: Mom's gametes */}
                    <td
                      className={`p-3 border border-slate-200 dark:border-slate-800 text-left transition-all ${
                        isRowHovered
                          ? "bg-pink-100 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 font-bold"
                          : "bg-slate-50 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300 font-semibold"
                      }`}
                    >
                      <div className="font-mono text-xs tracking-wider">{momGamete.genotype}</div>
                      <div className="font-mono text-4xs text-slate-400 mt-0.5 font-normal">
                        {doubleToFraction(momGamete.probability).label}
                      </div>
                    </td>

                    {/* Progeny Cells */}
                    {dadGametes.map((dadGamete, j) => {
                      const offspring = mergeGametes(momGamete.genotype, dadGamete.genotype, geneSymbols);
                      const prob = momGamete.probability * dadGamete.probability;
                      const isHovered = hoveredCell?.row === i && hoveredCell?.col === j;
                      const isMatch = isMatchingGenotype(momGamete.genotype, dadGamete.genotype);
                      
                      return (
                        <td
                          key={`cell-${i}-${j}`}
                          onMouseEnter={() => setHoveredCell({ row: i, col: j })}
                          onMouseLeave={() => setHoveredCell(null)}
                          className={`p-4 border border-slate-200 dark:border-slate-800 text-center transition-all cursor-pointer relative font-mono text-sm ${
                            isHovered
                              ? "bg-indigo-100/50 dark:bg-indigo-950/30 scale-[1.02] z-10 shadow-md ring-2 ring-indigo-400"
                              : isMatch
                              ? "bg-amber-100 dark:bg-amber-950/50 ring-2 ring-amber-400/60 font-bold text-amber-700 dark:text-amber-300"
                              : prob === 0
                              ? "bg-slate-50/50 dark:bg-slate-900/10 text-slate-300 dark:text-slate-700"
                              : "hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300"
                          }`}
                          title={`Mom: ${momGamete.genotype} × Dad: ${dadGamete.genotype} → Offspring: ${offspring} (prob: ${doubleToFraction(prob).label})`}
                        >
                          {prob > 0 ? doubleToFraction(prob).label : "0"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid Legend */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-4 justify-between items-center text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm inline-block" />
            <span>Offspring Outcomes</span>
          </div>
          {selectedGenotype && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-amber-100 dark:bg-amber-950 border border-amber-400 rounded-sm inline-block" />
              <span>Matching <span className="font-mono font-semibold">{selectedGenotype}</span></span>
            </div>
          )}
        </div>
        {hoveredCell && (
          <div className="font-mono text-2xs bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-md text-slate-600 dark:text-slate-300">
            Mom: {momGametes[hoveredCell.row].genotype} × Dad: {dadGametes[hoveredCell.col].genotype} →{" "}
            <span className="font-bold text-indigo-500">
              {mergeGametes(momGametes[hoveredCell.row].genotype, dadGametes[hoveredCell.col].genotype, geneSymbols)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
