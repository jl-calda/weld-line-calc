import React from 'react';
import type { PrintViewProps } from '../types';

const VerificationResultRow: React.FC<{label: string, app: number, manual: number}> = ({label, app, manual}) => {
    const isMatch = Math.abs(app - manual) < 1e-9;
    return (
        <div className="grid grid-cols-4 gap-x-4 py-1 text-black">
            <div className="font-semibold">{label}</div>
            <div className="font-mono text-right">{app.toFixed(3)}</div>
            <div className="font-mono text-right">{manual.toFixed(3)}</div>
            <div className={`text-center font-bold ${isMatch ? 'text-green-600' : 'text-red-600'}`}>
                {isMatch ? '✔ Match' : '✘ Mismatch'}
            </div>
        </div>
    );
};

const PrintView: React.FC<PrintViewProps> = ({ nodes, linesWithCoords, results, settings }) => {
  if (nodes.length === 0 || !results) {
    return (
      <div className="p-8 font-serif text-xs">
        <h1 className="text-xl font-bold mb-4 text-center">Weld Line Analysis Report</h1>
        <p className="text-center">No data available to generate a report. Please draw a weld line in the editor.</p>
      </div>
    );
  }

  const { 
      projectName, 
      description, 
      diagramSize, 
      includeNodesTable, 
      includeLinesTable, 
      includeResults, 
      includeExtremeDistances,
      titleAlignment, 
      descriptionAlignment,
      includeAdditionalInfo,
      additionalInfo,
      verificationData
  } = settings;

  // 1. Find bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodes.forEach(node => {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x);
    maxY = Math.max(maxY, node.y);
  });

  const padding = 20;
  const contentWidth = Math.max(1, maxX - minX); // Avoid division by zero
  const contentHeight = Math.max(1, maxY - minY);

  const viewBoxWidth = 1000;
  const viewBoxHeight = 1000; // Use a square viewbox for simplicity
  
  const scaleX = (viewBoxWidth - padding * 2) / contentWidth;
  const scaleY = (viewBoxHeight - padding * 2) / contentHeight;
  const scale = Math.min(scaleX, scaleY);

  const translateX = -minX * scale + (viewBoxWidth - contentWidth * scale) / 2;
  const translateY = -minY * scale + (viewBoxHeight - contentHeight * scale) / 2;
  
  const baseFontSize = 24; // Increased base font size for better legibility
  const labelFontSize = baseFontSize / scale;

  const { centroid, inertia, totalLength, extremeDistances } = results;
  const nodeIndexMap = new Map(nodes.map((node, index) => [node.id, index + 1]));

  const diagramSizeClass = {
    small: 'w-1/2',
    medium: 'w-3/4',
    large: 'w-full'
  }[diagramSize];

  const titleAlignClass = `text-${titleAlignment}`;
  const descAlignClass = `text-${descriptionAlignment}`;
  const EPSILON = 0.01;

  return (
    <div className="p-8 font-serif text-xs text-black bg-white flex flex-col justify-between h-full" style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '12px' }}>
      <div>
        <header className="mb-8 border-b-2 pb-4 border-black">
          <h1 className={`text-2xl font-bold ${titleAlignClass}`}>{projectName || 'Weld Line Analysis Report'}</h1>
          {description && <p className={`text-black mt-2 max-w-3xl ${titleAlignment === 'center' ? 'mx-auto' : ''} ${descAlignClass}`}>{description}</p>}
        </header>

        {includeAdditionalInfo && additionalInfo.length > 0 && (
            <section className="mb-8 break-inside-avoid">
                 <h2 className="text-xl font-bold mb-4">Additional Information</h2>
                 <div className="max-w-4xl mx-auto bg-gray-50 p-6 rounded-lg border border-gray-400 space-y-2 text-black">
                    {additionalInfo.map(item => (
                        <div key={item.id} className="grid grid-cols-[1fr_3fr] gap-x-8">
                            <div className="font-semibold">{item.title}:</div>
                            <div className="text-left">{item.description}</div>
                        </div>
                    ))}
                </div>
            </section>
        )}

        <section className="mb-8 break-inside-avoid">
          <h2 className="text-xl font-bold mb-4">Diagram</h2>
          <div className={`mx-auto border-2 border-gray-300 rounded-lg p-2 ${diagramSizeClass}`}>
              <svg viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} className="w-full h-auto">
                  <g transform={`translate(${translateX}, ${translateY}) scale(${scale})`}>
                      {linesWithCoords.map(line => {
                      const length = Math.hypot(line.end.x - line.start.x, line.end.y - line.start.y);
                      return (
                          <g key={line.id}>
                          <line
                              x1={line.start.x} y1={line.start.y}
                              x2={line.end.x} y2={line.end.y}
                              stroke="#0ea5e9" strokeWidth={2 / scale}
                          />
                          <text
                              x={(line.start.x + line.end.x) / 2}
                              y={(line.start.y + line.end.y) / 2}
                              fontSize={labelFontSize} fill="#0369a1" textAnchor="middle" dy={-6 / scale}
                          >
                              {length.toFixed(1)}mm
                          </text>
                          </g>
                      );
                      })}
                      {nodes.map((node, index) => (
                      <g key={node.id}>
                          <circle
                          cx={node.x} cy={node.y} r={4 / scale}
                          fill="#f97316" stroke="#ffffff" strokeWidth={1.5 / scale}
                          />
                          <text
                          x={node.x} y={node.y}
                          fontSize={labelFontSize} fill="#c2410c" textAnchor="middle" dy={-10 / scale}
                          >
                          N{index + 1}
                          </text>
                      </g>
                      ))}
                      {centroid && (
                      <g>
                          <line x1={centroid.x - 10/scale} y1={centroid.y} x2={centroid.x + 10/scale} y2={centroid.y} stroke="#e11d48" strokeWidth={2/scale} />
                          <line x1={centroid.x} y1={centroid.y - 10/scale} x2={centroid.x} y2={centroid.y + 10/scale} stroke="#e11d48" strokeWidth={2/scale} />
                          <circle cx={centroid.x} cy={centroid.y} r={5/scale} fill="none" stroke="#e11d48" strokeWidth={2/scale} />
                          <text x={centroid.x} y={centroid.y} fontSize={labelFontSize} fill="#e11d48" textAnchor="start" dx={14/scale} dy={4/scale}>COG</text>
                      </g>
                      )}
                      {includeExtremeDistances && centroid && extremeDistances && (
                         <g className="dimension-lines" stroke="#3b82f6" strokeWidth={1 / scale} fill="#3b82f6">
                            {extremeDistances.cTop > EPSILON && <>
                                <line x1={centroid.x} y1={centroid.y} x2={centroid.x} y2={maxY} strokeDasharray={`${4/scale} ${2/scale}`} />
                                <text x={centroid.x + 6/scale} y={(centroid.y + maxY)/2} fontSize={labelFontSize} >c-top: {extremeDistances.cTop.toFixed(1)}</text>
                            </>}
                            {extremeDistances.cBottom > EPSILON && <>
                                <line x1={centroid.x} y1={centroid.y} x2={centroid.x} y2={minY} strokeDasharray={`${4/scale} ${2/scale}`} />
                                <text x={centroid.x + 6/scale} y={(centroid.y + minY)/2} fontSize={labelFontSize} >c-bot: {extremeDistances.cBottom.toFixed(1)}</text>
                            </>}
                            {extremeDistances.cRight > EPSILON && <>
                                <line x1={centroid.x} y1={centroid.y} x2={maxX} y2={centroid.y} strokeDasharray={`${4/scale} ${2/scale}`} />
                                <text x={(centroid.x + maxX)/2} y={centroid.y - 6/scale} fontSize={labelFontSize} textAnchor="middle">c-right: {extremeDistances.cRight.toFixed(1)}</text>
                            </>}
                            {extremeDistances.cLeft > EPSILON && <>
                                <line x1={centroid.x} y1={centroid.y} x2={minX} y2={centroid.y} strokeDasharray={`${4/scale} ${2/scale}`} />
                                <text x={(centroid.x + minX)/2} y={centroid.y - 6/scale} fontSize={labelFontSize} textAnchor="middle">c-left: {extremeDistances.cLeft.toFixed(1)}</text>
                            </>}
                        </g>
                      )}
                  </g>
              </svg>
          </div>
        </section>
        
        {(includeNodesTable || includeLinesTable) && linesWithCoords.length > 0 && (
            <section className="mb-8 break-inside-avoid">
                <div className={`grid ${includeNodesTable && includeLinesTable ? 'grid-cols-2' : 'grid-cols-1'} gap-8 break-inside-avoid`}>
                    {includeNodesTable && (
                        <div>
                            <h3 className="text-lg font-bold mb-3">Nodes (mm)</h3>
                             <div className="bg-gray-50 p-4 rounded-lg border border-gray-400 text-black">
                                <div className="grid grid-cols-3 gap-x-4 pb-2 mb-2 border-b font-bold">
                                    <div>ID</div>
                                    <div className="text-right">X</div>
                                    <div className="text-right">Y</div>
                                </div>
                                <div className="space-y-1">
                                    {nodes.map((node, index) => (
                                        <div key={node.id} className="grid grid-cols-3 gap-x-4">
                                            <div>N{index + 1}</div>
                                            <div className="text-right font-mono">{node.x.toFixed(2)}</div>
                                            <div className="text-right font-mono">{node.y.toFixed(2)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    {includeLinesTable && (
                        <div>
                            <h3 className="text-lg font-bold mb-3">Lines</h3>
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-400 text-black">
                                <div className="grid grid-cols-4 gap-x-4 pb-2 mb-2 border-b font-bold">
                                    <div>ID</div>
                                    <div className="text-right">Length</div>
                                    <div className="text-right">Start</div>
                                    <div className="text-right">End</div>
                                </div>
                                <div className="space-y-1">
                                    {linesWithCoords.map((line, index) => {
                                        const length = Math.hypot(line.end.x - line.start.x, line.end.y - line.start.y);
                                        return (
                                        <div key={line.id} className="grid grid-cols-4 gap-x-4">
                                            <div>L{index + 1}</div>
                                            <div className="text-right font-mono">{length.toFixed(1)}</div>
                                            <div className="text-right font-mono">N{nodeIndexMap.get(line.startNodeId) ?? '?'}</div>
                                            <div className="text-right font-mono">N{nodeIndexMap.get(line.endNodeId) ?? '?'}</div>
                                        </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        )}

        {includeResults && !verificationData && (
          <section className="mt-8 break-inside-avoid">
            <h2 className="text-xl font-bold text-black mb-4">Calculation Results</h2>
            <div className="max-w-4xl mx-auto bg-gray-50 p-6 rounded-lg border border-gray-400">
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-4">
                  <div className="font-semibold text-black">Total Weld Length:</div>
                  <div className="text-right text-black">{totalLength.toFixed(2)} mm</div>
              </div>
              <div className="grid grid-cols-3 gap-x-8 gap-y-2 pt-4 border-t">
                  <div>
                      <h3 className="font-bold text-center mb-2">Centroid</h3>
                      <div className="font-semibold text-black">X̄: <span className="float-right font-normal">{centroid.x.toFixed(3)} mm</span></div>
                      <div className="font-semibold text-black">Ȳ: <span className="float-right font-normal">{centroid.y.toFixed(3)} mm</span></div>
                  </div>
                  <div>
                      <h3 className="font-bold text-center mb-2">Moment of Inertia</h3>
                      <div className="font-semibold text-black">Ixx: <span className="float-right font-normal">{inertia.ixx.toFixed(3)} cm³</span></div>
                      <div className="font-semibold text-black">Iyy: <span className="float-right font-normal">{inertia.iyy.toFixed(3)} cm³</span></div>
                      <div className="font-semibold text-black">Ixy: <span className="float-right font-normal">{inertia.ixy.toFixed(3)} cm³</span></div>
                  </div>
                  <div>
                      <h3 className="font-bold text-center mb-2">Extreme Distances</h3>
                      <div className="font-semibold text-black">c (top): <span className="float-right font-normal">{extremeDistances.cTop.toFixed(3)} mm</span></div>
                      <div className="font-semibold text-black">c (bottom): <span className="float-right font-normal">{extremeDistances.cBottom.toFixed(3)} mm</span></div>
                      <div className="font-semibold text-black">c (left): <span className="float-right font-normal">{extremeDistances.cLeft.toFixed(3)} mm</span></div>
                      <div className="font-semibold text-black">c (right): <span className="float-right font-normal">{extremeDistances.cRight.toFixed(3)} mm</span></div>
                  </div>
              </div>
            </div>
          </section>
        )}
        
        {verificationData && (
          <>
            <section className="mt-8 break-inside-avoid">
                <h2 className="text-xl font-bold text-black mb-4 border-b-2 border-black pb-2">Application Calculation Results</h2>
                <div className="max-w-4xl mx-auto bg-gray-50 p-6 rounded-lg border border-gray-400">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-black">
                        <div className="font-semibold">Total Weld Length:</div>
                        <div className="text-right">{totalLength.toFixed(2)} mm</div>
                        <div className="font-semibold">Centroid X (X̄):</div>
                        <div className="text-right">{centroid.x.toFixed(3)} mm</div>
                        <div className="font-semibold">Centroid Y (Ȳ):</div>
                        <div className="text-right">{centroid.y.toFixed(3)} mm</div>
                        <div className="font-semibold">Inertia Ixx:</div>
                        <div className="text-right">{inertia.ixx.toFixed(3)} cm³</div>
                        <div className="font-semibold">Inertia Iyy:</div>
                        <div className="text-right">{inertia.iyy.toFixed(3)} cm³</div>
                        <div className="font-semibold">Inertia Ixy:</div>
                        <div className="text-right">{inertia.ixy.toFixed(3)} cm³</div>
                    </div>
                </div>
            </section>
            <section className="mt-8 break-inside-avoid">
                <h2 className="text-xl font-bold text-black mb-4 border-b-2 border-black pb-2">Manual Verification from First Principles</h2>
                <p className="text-xs mb-4 text-gray-600">Calculations based on formulas for weld lines from roymech.org.</p>
                <div className="space-y-4 max-w-3xl mx-auto text-xs">
                    {Object.entries(verificationData.manualCalcs).map(([key, calc]) => (
                        <div key={key} className="bg-gray-50 p-3 rounded-lg border border-gray-300 break-inside-avoid">
                           <p className="font-bold text-sm mb-2 text-gray-800">{calc.label}</p>
                           <div className="mb-2 p-2 border-l-4 border-blue-500 bg-blue-50">
                             <span className="font-semibold">Formula:</span> 
                             <div className="mt-1 font-mono text-center text-sm p-2 bg-gray-200 rounded">{calc.formula}</div>
                           </div>
                           <div>
                             <span className="font-semibold">Substitution:</span>
                             <code className="block mt-1 bg-gray-200 p-2 rounded text-gray-800 text-[11px] whitespace-normal break-words">{calc.substitution}</code>
                           </div>
                           <p className="mt-2 text-right"><span className="font-semibold">Result = </span> <span className="font-mono font-bold text-blue-700">{calc.result.toFixed(3)}</span></p>
                        </div>
                    ))}
                </div>
                <h3 className="text-lg font-bold mt-8 mb-3">Results Comparison</h3>
                <div className="max-w-4xl mx-auto bg-gray-50 p-6 rounded-lg border border-gray-400">
                    <div className="grid grid-cols-4 gap-x-4 pb-2 mb-2 border-b font-bold text-black">
                        <div>Property</div>
                        <div className="text-right">App Result</div>
                        <div className="text-right">Manual Result</div>
                        <div className="text-center">Status</div>
                    </div>
                    <div className="space-y-1">
                        <VerificationResultRow label="Centroid X (mm)" app={results.centroid.x} manual={verificationData.manualCalcs.centroidX.result} />
                        <VerificationResultRow label="Centroid Y (mm)" app={results.centroid.y} manual={verificationData.manualCalcs.centroidY.result} />
                        <VerificationResultRow label="Ixx (cm³)" app={results.inertia.ixx} manual={verificationData.manualCalcs.Ixx.result / 1000} />
                        <VerificationResultRow label="Iyy (cm³)" app={results.inertia.iyy} manual={verificationData.manualCalcs.Iyy.result / 1000} />
                        <VerificationResultRow label="Ixy (cm³)" app={results.inertia.ixy} manual={verificationData.manualCalcs.Ixy.result / 1000} />
                    </div>
                </div>
            </section>
        </>
        )}
      </div>

      <footer className="mt-auto pt-4 border-t-2 border-black text-left">
          <p className="text-xs text-gray-700">Generated on: {new Date().toLocaleDateString()}</p>
      </footer>
    </div>
  );
};

export default PrintView;