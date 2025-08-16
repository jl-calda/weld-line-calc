import React from 'react';
import type { CalculationResults } from '../types';

interface ResultsDisplayProps {
  results: CalculationResults | null;
}

const ResultItem: React.FC<{ label: string; value: string; unit: string }> = ({ label, value, unit }) => (
  <div className="flex justify-between items-baseline p-3 bg-gray-100/50 rounded">
    <span className="text-gray-600">{label}</span>
    <span className="font-mono text-lg text-orange-600">
      {value} <span className="text-sm text-gray-500">{unit}</span>
    </span>
  </div>
);

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results }) => {
  if (!results) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center border border-gray-200">
        <h2 className="text-2xl font-bold text-blue-600 mb-2">Results</h2>
        <p className="text-gray-500">Draw at least one line to see calculations.</p>
      </div>
    );
  }

  const { centroid, inertia, totalLength, extremeDistances } = results;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <h2 className="text-2xl font-bold text-blue-600 mb-4">Results</h2>
      <div className="space-y-4">
        <ResultItem label="Total Weld Length" value={totalLength.toFixed(2)} unit="mm" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-700 text-center border-b border-gray-200 pb-2">Centroid</h3>
            <ResultItem label="X̄" value={centroid.x.toFixed(3)} unit="mm" />
            <ResultItem label="Ȳ" value={centroid.y.toFixed(3)} unit="mm" />
          </div>
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-700 text-center border-b border-gray-200 pb-2">Moment of Inertia</h3>
            <ResultItem label="Ixx" value={inertia.ixx.toFixed(3)} unit="cm³" />
            <ResultItem label="Iyy" value={inertia.iyy.toFixed(3)} unit="cm³" />
            <ResultItem label="Ixy" value={inertia.ixy.toFixed(3)} unit="cm³" />
          </div>
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-700 text-center border-b border-gray-200 pb-2">Extreme Distances</h3>
            <ResultItem label="c (top)" value={extremeDistances.cTop.toFixed(3)} unit="mm" />
            <ResultItem label="c (bottom)" value={extremeDistances.cBottom.toFixed(3)} unit="mm" />
            <ResultItem label="c (left)" value={extremeDistances.cLeft.toFixed(3)} unit="mm" />
            <ResultItem label="c (right)" value={extremeDistances.cRight.toFixed(3)} unit="mm" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay;