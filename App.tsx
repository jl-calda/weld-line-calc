import React, { useState, useMemo, useCallback } from 'react';
import type { Node, Line, CalculationResults, LineWithCoords, SelectedElement, DrawingMode, ReportSettings, AdditionalInfoItem } from './types';
import DrawingCanvas from './components/DrawingCanvas';
import NodesTable from './components/NodesTable';
import LinesTable from './components/LinesTable';
import ResultsDisplay from './components/ResultsDisplay';
import { calculateWeldProperties } from './services/calculationService';
import PrintView from './components/PrintView';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import VerificationPage from './components/VerificationPage';

// Helper for line splitting logic
function distToSegment(p: {x:number, y:number}, v: Node, w: Node) {
    const l2 = (v.x - w.x)**2 + (v.y - w.y)**2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}


export default function App(): React.ReactNode {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [showOrigin, setShowOrigin] = useState(true);
  const [showExtremeDistances, setShowExtremeDistances] = useState(true);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(5);
  const [isDownloading, setIsDownloading] = useState(false);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('node');
  const [lineStartNodeId, setLineStartNodeId] = useState<number | null>(null);
  const [centerViewTrigger, setCenterViewTrigger] = useState(0);
  const [view, setView] = useState<'editor' | 'report' | 'verification'>('editor');
  const [reportSettings, setReportSettings] = useState<ReportSettings>({
    projectName: 'Weld Analysis Report',
    description: '',
    titleAlignment: 'center',
    descriptionAlignment: 'center',
    diagramSize: 'small',
    includeNodesTable: true,
    includeLinesTable: true,
    includeResults: true,
    includeExtremeDistances: true,
    includeAdditionalInfo: false,
    additionalInfo: [],
  });


  const linesWithCoords: LineWithCoords[] = useMemo(() => {
    return lines.map(line => {
      const start = nodes.find(n => n.id === line.startNodeId);
      const end = nodes.find(n => n.id === line.endNodeId);
      if (start && end) {
        return { ...line, start, end };
      }
      return null;
    }).filter((l): l is LineWithCoords => l !== null && l.start !== undefined && l.end !== undefined);
  }, [lines, nodes]);

  const handleUpdateNode = useCallback((nodeId: number, newX: number, newY: number) => {
    setNodes(prevNodes =>
      prevNodes.map(node =>
        node.id === nodeId ? { ...node, x: parseFloat(newX.toFixed(2)), y: parseFloat(newY.toFixed(2)) } : node
      )
    );
  }, []);

  const handleLineClick = useCallback((lineId: number) => {
    setSelectedElement({ type: 'line', id: lineId });
    setDrawingMode('node'); // Switch to node mode to avoid confusion
    setLineStartNodeId(null);
  }, []);

  const handleNodeClick = useCallback((nodeId: number) => {
    if (drawingMode === 'line') {
      if (!lineStartNodeId) { // First click for a new line
        setLineStartNodeId(nodeId);
        setSelectedElement({ type: 'node', id: nodeId });
      } else { // Second click, completing the line
        if (lineStartNodeId !== nodeId) { // Avoid line to self
            const lineExists = lines.some(
                line => (line.startNodeId === lineStartNodeId && line.endNodeId === nodeId) ||
                        (line.startNodeId === nodeId && line.endNodeId === lineStartNodeId)
            );
            if (!lineExists) {
                const newLine: Line = { id: Date.now(), startNodeId: lineStartNodeId, endNodeId: nodeId };
                setLines(prev => [...prev, newLine]);
            }
        }
        setLineStartNodeId(null);
        setSelectedElement(null);
      }
    } else { // In 'node' mode, clicking a node now starts a line
      setDrawingMode('line');
      setLineStartNodeId(nodeId);
      setSelectedElement({ type: 'node', id: nodeId });
    }
  }, [drawingMode, lineStartNodeId, lines]);

  const handleCanvasBackgroundClick = useCallback((point: { x: number, y: number }) => {
    setSelectedElement(null);

    let finalPoint = point;
    if (snapToGrid) {
      finalPoint = {
        x: Math.round(point.x / gridSize) * gridSize,
        y: Math.round(point.y / gridSize) * gridSize,
      };
    }
    
    if (drawingMode === 'node') {
      // Check if clicking on an existing line to split it
      const lineToSplit = linesWithCoords.find(line => distToSegment(finalPoint, line.start, line.end) < 5);

      if (lineToSplit) {
        const newNode: Node = { id: Date.now(), x: parseFloat(finalPoint.x.toFixed(2)), y: parseFloat(finalPoint.y.toFixed(2)) };
        setNodes(prev => [...prev, newNode]);
        
        const newLine1: Line = { id: Date.now() + 1, startNodeId: lineToSplit.startNodeId, endNodeId: newNode.id };
        const newLine2: Line = { id: Date.now() + 2, startNodeId: newNode.id, endNodeId: lineToSplit.endNodeId };
        
        setLines(prev => [...prev.filter(l => l.id !== lineToSplit.id), newLine1, newLine2]);
        setSelectedElement({type: 'node', id: newNode.id});
      } else {
        // Add a new standalone node
        const newNode: Node = {
          id: Date.now(),
          x: parseFloat(finalPoint.x.toFixed(2)),
          y: parseFloat(finalPoint.y.toFixed(2)),
        };
        setNodes(prev => [...prev, newNode]);
        setSelectedElement({type: 'node', id: newNode.id});
      }
    } else if (drawingMode === 'line') {
      const newNode: Node = {
        id: Date.now(),
        x: parseFloat(finalPoint.x.toFixed(2)),
        y: parseFloat(finalPoint.y.toFixed(2)),
      };
      
      setNodes(prev => [...prev, newNode]); // Add the new node regardless
      
      if (!lineStartNodeId) { // This is the first node of the line
        setLineStartNodeId(newNode.id);
        setSelectedElement({ type: 'node', id: newNode.id });
      } else { // This is the second node, complete the line
        const newLine: Line = { id: Date.now() + 1, startNodeId: lineStartNodeId, endNodeId: newNode.id };
        
        const lineExists = lines.some(
            line => (line.startNodeId === lineStartNodeId && line.endNodeId === newNode.id) ||
                    (line.startNodeId === newNode.id && line.endNodeId === lineStartNodeId)
        );
        if (!lineExists) {
            setLines(prev => [...prev, newLine]);
            setSelectedElement({ type: 'line', id: newLine.id });
        }
        
        setLineStartNodeId(null); // Reset for the next line
      }
    }
  }, [drawingMode, snapToGrid, gridSize, linesWithCoords, lineStartNodeId, lines]);
  
  const handleReset = useCallback(() => {
    setNodes([]);
    setLines([]);
    setSelectedElement(null);
    setLineStartNodeId(null);
    setDrawingMode('node');
  }, []);

  const handleDeleteNode = (nodeId: number) => {
    if (selectedElement?.type === 'node' && selectedElement.id === nodeId) {
        setSelectedElement(null);
    }
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setLines(prev => prev.filter(l => l.startNodeId !== nodeId && l.endNodeId !== nodeId));
    if (lineStartNodeId === nodeId) {
        setLineStartNodeId(null);
    }
  };

  const handleDeleteLine = (lineId: number) => {
    const lineToRemove = lines.find(l => l.id === lineId);
    if (!lineToRemove) return;

    if (selectedElement?.type === 'line' && selectedElement.id === lineId) {
        setSelectedElement(null);
    }

    const remainingLines = lines.filter(l => l.id !== lineId);
    
    const nodesToCheck = [lineToRemove.startNodeId, lineToRemove.endNodeId];
    const orphanedNodeIds = new Set<number>();

    nodesToCheck.forEach(nodeId => {
        const isStillConnected = remainingLines.some(l => l.startNodeId === nodeId || l.endNodeId === nodeId);
        if (!isStillConnected) {
            orphanedNodeIds.add(nodeId);
        }
    });
    
    if (orphanedNodeIds.size > 0) {
        const nodeIndexMap = new Map(nodes.map((node, index) => [node.id, index + 1]));
        const nodeLabels = Array.from(orphanedNodeIds).map(id => `N${nodeIndexMap.get(id)}`).join(', ');

        if (window.confirm(`Line removed. The following node(s) are no longer connected: ${nodeLabels}. Do you want to remove them as well?`)) {
             setNodes(prev => prev.filter(n => !orphanedNodeIds.has(n.id)));
        }
    }
    
    setLines(remainingLines);
  };

  const handleDownloadPdf = async () => {
    if (view === 'report' && lines.length === 0) return;
    setIsDownloading(true);

    await new Promise(resolve => setTimeout(resolve, 50));

    const printElement = document.getElementById('print-view-content');
    if (!printElement) {
        setIsDownloading(false);
        return;
    }
    
    const canvas = await html2canvas(printElement, { scale: 3 });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const imgRatio = imgProps.height / imgProps.width;
    let imgHeight = pdfWidth * imgRatio;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;
    }
    
    pdf.save('weld-analysis-report.pdf');
    setIsDownloading(false);
  };
  
  const handleReportSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setReportSettings(prev => ({ ...prev, [name]: checked }));
    } else {
        setReportSettings(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddInfoItem = () => {
    setReportSettings(prev => ({
        ...prev,
        additionalInfo: [...prev.additionalInfo, { id: Date.now(), title: '', description: '' }]
    }));
  };

  const handleUpdateInfoItem = (id: number, field: 'title' | 'description', value: string) => {
      setReportSettings(prev => ({
          ...prev,
          additionalInfo: prev.additionalInfo.map(item => item.id === id ? { ...item, [field]: value } : item)
      }));
  };
  
  const handleDeleteInfoItem = (id: number) => {
      setReportSettings(prev => ({
          ...prev,
          additionalInfo: prev.additionalInfo.filter(item => item.id !== id)
      }));
  };

  const results: CalculationResults | null = useMemo(() => {
    if (nodes.length < 2 || lines.length === 0) {
      return null;
    }
    return calculateWeldProperties(nodes, lines);
  }, [nodes, lines]);

  return (
    <>
      <div className="min-h-screen flex flex-col p-4 sm:p-6 lg:p-8">
        <header className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-[var(--dark-gray)] tracking-wider">Advanced Welding Line Calculator</h1>
            <p className="text-lg text-[var(--medium-gray)] mt-1">Draw, edit, and analyze weld lines with precision.</p>
          </div>
           <div className="flex flex-col items-end gap-4">
              <div className="flex items-center bg-[var(--light-blue)] rounded-lg p-1">
                 <button onClick={() => setView('editor')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${view === 'editor' ? 'bg-white text-[var(--dark-gray)] shadow' : 'text-[var(--medium-gray)] hover:bg-[#b8d8d5]'}`}>Editor</button>
                 <button onClick={() => setView('report')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${view === 'report' ? 'bg-white text-[var(--dark-gray)] shadow' : 'text-[var(--medium-gray)] hover:bg-[#b8d8d5]'}`}>Report</button>
                 <button onClick={() => setView('verification')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${view === 'verification' ? 'bg-white text-[var(--dark-gray)] shadow' : 'text-[var(--medium-gray)] hover:bg-[#b8d8d5]'}`}>Verification</button>
              </div>
              {view === 'report' && (
                <button
                  onClick={handleDownloadPdf}
                  disabled={(view === 'report' && lines.length === 0) || isDownloading}
                  className="px-6 py-2 bg-[var(--dark-gray)] hover:bg-[var(--medium-gray)] text-white font-semibold rounded-lg shadow-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--dark-gray)] disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isDownloading ? 'Downloading...' : 'Download as PDF'}
                </button>
              )}
          </div>
        </header>

        {view === 'editor' && (
          <main className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="flex flex-col gap-4">
                <DrawingCanvas 
                    nodes={nodes} 
                    linesWithCoords={linesWithCoords} 
                    onCanvasBackgroundClick={handleCanvasBackgroundClick}
                    onNodeClick={handleNodeClick}
                    onLineClick={handleLineClick}
                    results={results}
                    showOrigin={showOrigin}
                    showExtremeDistances={showExtremeDistances}
                    selectedElement={selectedElement}
                    snapToGrid={snapToGrid}
                    gridSize={gridSize}
                    drawingMode={drawingMode}
                    lineStartNodeId={lineStartNodeId}
                    centerViewTrigger={centerViewTrigger}
                />
                <div className="flex flex-wrap items-center justify-between p-4 bg-white rounded-lg shadow-md border border-[var(--light-blue)] gap-4">
                    <div className="flex items-center space-x-4">
                        <button onClick={() => setDrawingMode('node')} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${drawingMode === 'node' ? 'bg-[var(--dark-gray)] text-white' : 'bg-[var(--light-blue)] text-[var(--medium-gray)] hover:bg-[#b8d8d5]'}`}>Add Node</button>
                        <button onClick={() => setDrawingMode('line')} className={`px-4 py-2 rounded-lg font-semibold transition-colors ${drawingMode === 'line' ? 'bg-[var(--dark-gray)] text-white' : 'bg-[var(--light-blue)] text-[var(--medium-gray)] hover:bg-[#b8d8d5]'}`}>Add Line</button>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                          <input type="checkbox" id="showOrigin" checked={showOrigin} onChange={() => setShowOrigin(prev => !prev)} className="h-4 w-4 rounded border-[var(--medium-gray)] text-[var(--dark-gray)] focus:ring-[var(--dark-gray)] cursor-pointer" />
                          <label htmlFor="showOrigin" className="ml-2 block text-sm text-[var(--dark-gray)] select-none cursor-pointer">Show Origin</label>
                      </div>
                      <div className="flex items-center">
                          <input type="checkbox" id="showExtremeDistances" checked={showExtremeDistances} onChange={() => setShowExtremeDistances(prev => !prev)} className="h-4 w-4 rounded border-[var(--medium-gray)] text-[var(--dark-gray)] focus:ring-[var(--dark-gray)] cursor-pointer" />
                          <label htmlFor="showExtremeDistances" className="ml-2 block text-sm text-[var(--dark-gray)] select-none cursor-pointer">Show Extremes</label>
                      </div>
                       <div className="flex items-center">
                          <input type="checkbox" id="snapToGrid" checked={snapToGrid} onChange={() => setSnapToGrid(prev => !prev)} className="h-4 w-4 rounded border-[var(--medium-gray)] text-[var(--dark-gray)] focus:ring-[var(--dark-gray)] cursor-pointer" />
                          <label htmlFor="snapToGrid" className="ml-2 block text-sm text-[var(--dark-gray)] select-none cursor-pointer">Snap to Grid</label>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        {snapToGrid && (
                          <div className="flex items-center space-x-3 text-sm">
                              <span className="text-[var(--dark-gray)]">Grid:</span>
                              {[1, 5, 10].map(size => (
                                  <div key={size} className="flex items-center">
                                      <input type="radio" id={`grid-${size}`} name="gridSize" value={size} checked={gridSize === size} onChange={() => setGridSize(size)} className="h-4 w-4 border-[var(--medium-gray)] text-[var(--dark-gray)] focus:ring-[var(--dark-gray)] cursor-pointer"/>
                                      <label htmlFor={`grid-${size}`} className="ml-1 text-[var(--medium-gray)] cursor-pointer">{size}mm</label>
                                  </div>
                              ))}
                          </div>
                        )}
                      <button
                          onClick={() => setCenterViewTrigger(c => c + 1)}
                          disabled={nodes.length === 0}
                          className="px-6 py-2 bg-[var(--medium-gray)] hover:bg-[var(--dark-gray)] text-white font-semibold rounded-lg shadow-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--medium-gray)] disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                          Center View
                      </button>
                      <button
                          onClick={handleReset}
                          className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                          Reset
                      </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-8">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1">
                  <NodesTable nodes={nodes} onUpdateNode={handleUpdateNode} selectedElement={selectedElement} onDeleteNode={handleDeleteNode} />
                </div>
                <div className="flex-1">
                  <LinesTable lines={lines} nodes={nodes} selectedElement={selectedElement} onDeleteLine={handleDeleteLine} />
                </div>
              </div>
              <ResultsDisplay results={results} />
            </div>
          </main>
        )}
        
        {view === 'report' && (
           <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="lg:col-span-1 bg-white rounded-lg shadow-lg p-6 border border-[var(--light-blue)] h-fit">
                    <h2 className="text-2xl font-bold text-[var(--dark-gray)] mb-6 border-b border-b-[var(--light-blue)] pb-4">Report Configuration</h2>
                    <div className="space-y-6">
                        <div>
                            <label htmlFor="projectName" className="block text-sm font-medium text-[var(--medium-gray)] mb-1">Project Name</label>
                            <input type="text" name="projectName" id="projectName" value={reportSettings.projectName} onChange={handleReportSettingsChange} className="w-full p-2 border bg-white border-[var(--medium-gray)] rounded-md shadow-sm focus:ring-[var(--dark-gray)] focus:border-[var(--dark-gray)]" />
                             <div className="flex justify-around mt-2 text-xs">
                                {(['left', 'center', 'right'] as const).map(align => (
                                    <div key={`title-${align}`} className="flex items-center">
                                        <input type="radio" id={`title-align-${align}`} name="titleAlignment" value={align} checked={reportSettings.titleAlignment === align} onChange={handleReportSettingsChange} className="h-3 w-3 border-[var(--medium-gray)] text-[var(--dark-gray)] focus:ring-[var(--dark-gray)] cursor-pointer"/>
                                        <label htmlFor={`title-align-${align}`} className="ml-1 text-[var(--medium-gray)] capitalize cursor-pointer">{align}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-[var(--medium-gray)] mb-1">Description</label>
                            <textarea name="description" id="description" rows={4} value={reportSettings.description} onChange={handleReportSettingsChange} className="w-full p-2 border bg-white border-[var(--medium-gray)] rounded-md shadow-sm focus:ring-[var(--dark-gray)] focus:border-[var(--dark-gray)]"></textarea>
                             <div className="flex justify-around mt-2 text-xs">
                                {(['left', 'center', 'right'] as const).map(align => (
                                    <div key={`desc-${align}`} className="flex items-center">
                                        <input type="radio" id={`desc-align-${align}`} name="descriptionAlignment" value={align} checked={reportSettings.descriptionAlignment === align} onChange={handleReportSettingsChange} className="h-3 w-3 border-[var(--medium-gray)] text-[var(--dark-gray)] focus:ring-[var(--dark-gray)] cursor-pointer"/>
                                        <label htmlFor={`desc-align-${align}`} className="ml-1 text-[var(--medium-gray)] capitalize cursor-pointer">{align}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                         <div>
                            <h3 className="text-sm font-medium text-[var(--medium-gray)] mb-2">Report Content</h3>
                            <div className="space-y-2">
                                <div className="flex items-center">
                                    <input id="includeNodesTable" name="includeNodesTable" type="checkbox" checked={reportSettings.includeNodesTable} onChange={handleReportSettingsChange} className="h-4 w-4 text-[var(--dark-gray)] border-[var(--medium-gray)] rounded focus:ring-[var(--dark-gray)]"/>
                                    <label htmlFor="includeNodesTable" className="ml-2 block text-sm text-[var(--dark-gray)] cursor-pointer">Nodes Table</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="includeLinesTable" name="includeLinesTable" type="checkbox" checked={reportSettings.includeLinesTable} onChange={handleReportSettingsChange} className="h-4 w-4 text-[var(--dark-gray)] border-[var(--medium-gray)] rounded focus:ring-[var(--dark-gray)]"/>
                                    <label htmlFor="includeLinesTable" className="ml-2 block text-sm text-[var(--dark-gray)] cursor-pointer">Lines Table</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="includeResults" name="includeResults" type="checkbox" checked={reportSettings.includeResults} onChange={handleReportSettingsChange} className="h-4 w-4 text-[var(--dark-gray)] border-[var(--medium-gray)] rounded focus:ring-[var(--dark-gray)]"/>
                                    <label htmlFor="includeResults" className="ml-2 block text-sm text-[var(--dark-gray)] cursor-pointer">Calculation Results</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="includeExtremeDistances" name="includeExtremeDistances" type="checkbox" checked={reportSettings.includeExtremeDistances} onChange={handleReportSettingsChange} className="h-4 w-4 text-[var(--dark-gray)] border-[var(--medium-gray)] rounded focus:ring-[var(--dark-gray)]"/>
                                    <label htmlFor="includeExtremeDistances" className="ml-2 block text-sm text-[var(--dark-gray)] cursor-pointer">Extreme Distances on Diagram</label>
                                </div>
                                <div className="flex items-center">
                                    <input id="includeAdditionalInfo" name="includeAdditionalInfo" type="checkbox" checked={reportSettings.includeAdditionalInfo} onChange={handleReportSettingsChange} className="h-4 w-4 text-[var(--dark-gray)] border-[var(--medium-gray)] rounded focus:ring-[var(--dark-gray)]"/>
                                    <label htmlFor="includeAdditionalInfo" className="ml-2 block text-sm text-[var(--dark-gray)] cursor-pointer">Additional Info Table</label>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-[var(--medium-gray)] mb-2">Diagram Size</h3>
                            <div className="flex space-x-4">
                                {['small', 'medium', 'large'].map(size => (
                                    <div key={size} className="flex items-center">
                                        <input type="radio" id={`size-${size}`} name="diagramSize" value={size} checked={reportSettings.diagramSize === size} onChange={handleReportSettingsChange} className="h-4 w-4 border-[var(--medium-gray)] text-[var(--dark-gray)] focus:ring-[var(--dark-gray)]"/>
                                        <label htmlFor={`size-${size}`} className="ml-2 block text-sm text-[var(--dark-gray)] capitalize cursor-pointer">{size}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {reportSettings.includeAdditionalInfo && (
                            <div className="space-y-4 pt-4 border-t border-[var(--light-blue)]">
                                <h3 className="text-sm font-medium text-[var(--medium-gray)]">Additional Info Items</h3>
                                {reportSettings.additionalInfo.map((item) => (
                                    <div key={item.id} className="p-3 bg-[#f7fcfc] rounded-md border border-[var(--light-blue)] space-y-2 relative">
                                        <button onClick={() => handleDeleteInfoItem(item.id)} className="absolute top-1 right-1 text-red-400 hover:text-red-600 text-xs font-bold">X</button>
                                        <input type="text" value={item.title} onChange={(e) => handleUpdateInfoItem(item.id, 'title', e.target.value)} className="w-full p-1 border bg-white border-[var(--medium-gray)] rounded-md shadow-sm focus:ring-[var(--dark-gray)] focus:border-[var(--dark-gray)] text-sm" placeholder="Title (e.g., Designer)" />
                                        <textarea value={item.description} onChange={(e) => handleUpdateInfoItem(item.id, 'description', e.target.value)} className="w-full p-1 border bg-white border-[var(--medium-gray)] rounded-md shadow-sm focus:ring-[var(--dark-gray)] focus:border-[var(--dark-gray)] text-sm" rows={2} placeholder="Description (e.g., John Doe)"></textarea>
                                    </div>
                                ))}
                                <button onClick={handleAddInfoItem} className="w-full py-2 bg-[var(--light-blue)] text-[var(--dark-gray)] font-semibold rounded-lg hover:bg-[#b8d8d5] transition-colors text-sm">
                                    + Add Info Item
                                </button>
                            </div>
                        )}
                    </div>
               </div>
               <div className="lg:col-span-2">
                    <h2 className="text-2xl font-bold text-[var(--dark-gray)] mb-4 text-center">Live Preview</h2>
                    <div className="bg-white shadow-2xl border border-[var(--light-blue)] aspect-[1/1.414] w-full max-w-3xl mx-auto overflow-y-auto">
                        <PrintView nodes={nodes} linesWithCoords={linesWithCoords} results={results} settings={reportSettings} />
                    </div>
               </div>
           </main>
        )}
        
        {view === 'verification' && (
            <VerificationPage />
        )}
      </div>
      {(isDownloading && view === 'report') && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '210mm', background: 'white' }}>
            <div id="print-view-content">
                <PrintView nodes={nodes} linesWithCoords={linesWithCoords} results={results} settings={reportSettings} />
            </div>
        </div>
      )}
    </>
  );
}