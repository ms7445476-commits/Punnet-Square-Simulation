/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { doubleToFraction } from "../utils";

interface MatrixViewProps {
  title?: string;
  subtitle?: string;
  data: number[][];
  rowLabels?: string[];
  colLabels?: string[];
  highlightedRow?: number | null;
  highlightedCol?: number | null;
  onCellHover?: (row: number, col: number | null) => void;
  rowHeader?: string;
  colHeader?: string;
}

export default function MatrixView({
  title,
  subtitle,
  data,
  rowLabels,
  colLabels,
  highlightedRow = null,
  highlightedCol = null,
  onCellHover,
  rowHeader,
  colHeader,
}: MatrixViewProps) {
  const [showFractions, setShowFractions] = useState(true);

  const numRows = data.length;
  const numCols = data[0]?.length || 0;

  const formatValue = (val: number) => {
    if (val === 0) return "0";
    if (showFractions) {
      return doubleToFraction(val).label;
    }
    return val.toFixed(4).replace(/\.?0+$/, "");
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col h-full">
      {/* Matrix Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
        <div>
          {title && <h4 className="font-sans font-semibold text-slate-800 dark:text-slate-100 text-sm tracking-tight">{title}</h4>}
          {subtitle && <p className="font-sans text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1.5 self-start sm:self-center">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">View:</span>
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-100 dark:bg-slate-950">
            <button
              onClick={() => setShowFractions(true)}
              className={`px-2 py-0.5 rounded-md text-xs font-medium transition-all ${
                showFractions
                  ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
              }`}
            >
              Fraction
            </button>
            <button
              onClick={() => setShowFractions(false)}
              className={`px-2 py-0.5 rounded-md text-xs font-medium transition-all ${
                !showFractions
                  ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
              }`}
            >
              Decimal
            </button>
          </div>
        </div>
      </div>

      {/* Dimensions & Controls Info */}
      <div className="flex items-center justify-between mb-3 text-2xs font-mono text-slate-400 uppercase tracking-wider">
        <span>Dimensions: {numRows} × {numCols}</span>
        {onCellHover && <span>Hover cells to inspect</span>}
      </div>
      {/* Matrix Bracket Container */}
      <div className="flex-1 flex items-center justify-center overflow-auto matrix-scroll py-2">
        <div className="flex items-start gap-1.5 min-w-max">
          {/* Row Labels (Outside left bracket, if provided) */}
          {rowLabels && (
            <div
              className="flex flex-col gap-1.5 select-none pr-2 text-right"
              style={{ paddingTop: colLabels ? "38px" : "6px" }}
            >
              {rowLabels.map((label, idx) => (
                <div
                  key={`rl-${idx}`}
                  className={`font-mono text-2xs px-1.5 rounded-sm transition-all flex items-center justify-end h-8 ${
                    highlightedRow === idx
                      ? "bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {label}
                </div>
              ))}
            </div>
          )}

          {/* Column labels on top and Bracketed Matrix */}
          <div className="flex flex-col">
            {/* Column Labels (on top of columns) */}
            {colLabels && (
              <div
                className="flex items-center gap-4 h-8 select-none"
                style={{ paddingLeft: "20px" }} // 12px left bracket + 8px grid padding
              >
                {colLabels.map((label, idx) => (
                  <div
                    key={`col-hdr-${idx}`}
                    className={`font-mono text-3xs text-center w-16 transition-all truncate ${
                      highlightedCol === idx ? "text-indigo-500 font-bold" : "text-slate-400 dark:text-slate-500"
                    }`}
                    title={label}
                  >
                    {label}
                  </div>
                ))}
              </div>
            )}

            {/* Bracketed Grid */}
            <div className="flex items-stretch">
              {/* Left Bracket */}
              <div className="w-3 border-l-4 border-t-4 border-b-4 border-slate-800 dark:border-slate-300 rounded-l-[4px] self-stretch" />

              {/* Grid Content */}
              <div className="flex flex-col justify-around gap-1.5 py-1.5 px-2">
                {data.map((row, rIdx) => (
                  <div key={`row-${rIdx}`} className="flex items-center gap-4 h-8">
                    {row.map((val, cIdx) => {
                      const isHighlighted = highlightedRow === rIdx || highlightedCol === cIdx;
                      const isDirectCellMatch = highlightedRow === rIdx && highlightedCol === cIdx;
                      return (
                        <div
                          key={`cell-${rIdx}-${cIdx}`}
                          onMouseEnter={() => onCellHover && onCellHover(rIdx, cIdx)}
                          onMouseLeave={() => onCellHover && onCellHover(-1, null)}
                          className={`font-mono text-xs text-center w-16 px-1 py-1 rounded-md transition-all cursor-pointer ${
                            isDirectCellMatch
                              ? "bg-indigo-500 text-white font-semibold shadow-xs"
                              : isHighlighted
                              ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400"
                              : val === 0
                              ? "text-slate-300 dark:text-slate-700"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`}
                          title={`${rowLabels ? rowLabels[rIdx] : `Row ${rIdx}`} × ${colLabels ? colLabels[cIdx] : `Col ${cIdx}`}: ${val}`}
                        >
                          {formatValue(val)}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Right Bracket */}
              <div className="w-3 border-r-4 border-t-4 border-b-4 border-slate-800 dark:border-slate-300 rounded-r-[4px] self-stretch" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
