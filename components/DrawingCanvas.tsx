import React, { useState, useRef, useCallback, MouseEvent, useMemo, useEffect } from 'react';
import type { Node, LineWithCoords, CalculationResults, SelectedElement, DrawingMode } from '../types';

interface DrawingCanvasProps {
  nodes: Node[];
  linesWithCoords: LineWithCoords[];
  onCanvasBackgroundClick: (point: {x: number, y: number}) => void;
  onNodeClick: (nodeId: number) => void;
  onLineClick: (lineId: number) => void;
  results: CalculationResults | null;
  showOrigin: boolean;
  showExtremeDistances: boolean;
  selectedElement: SelectedElement | null;
  snapToGrid: boolean;
  gridSize: number;
  drawingMode: DrawingMode;
  lineStartNodeId: number | null;
  centerViewTrigger: number;
}

const SNAP_RADIUS = 10;
const EPSILON = 0.01; // To handle floating point inaccuracies for zero checks

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ 
    nodes, 
    linesWithCoords, 
    onCanvasBackgroundClick,
    onNodeClick,
    onLineClick, 
    results, 
    showOrigin, 
    showExtremeDistances,
    selectedElement, 
    snapToGrid, 
    gridSize,
    drawingMode,
    lineStartNodeId,
    centerViewTrigger
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  
  const [viewTransform, setViewTransform] = useState({ k: 1, x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [snappedNode, setSnappedNode] = useState<Node | null>(null);

  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  
  const centroid = results?.centroid;
  const extremeDistances = results?.extremeDistances;

  const boundingBox = useMemo(() => {
    if (nodes.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(node => {
        minX = Math.min(minX, node.x);
        minY = Math.min(minY, node.y);
        maxX = Math.max(maxX, node.x);
        maxY = Math.max(maxY, node.y);
    });
    return { minX, minY, maxX, maxY };
  }, [nodes]);

  useEffect(() => {
    if (svgRef.current) {
      const { width, height } = svgRef.current.getBoundingClientRect();
      setViewTransform(prev => ({ ...prev, x: width / 2, y: height / 2 }));
    }
  }, []); // Center on initial render

  useEffect(() => {
    if (centerViewTrigger === 0) return; // Don't run on initial mount

    if (!svgRef.current || !boundingBox) {
        if (svgRef.current) {
            const { width, height } = svgRef.current.getBoundingClientRect();
            setViewTransform({ k: 1, x: width / 2, y: height / 2 });
        }
        return;
    }
    const { width, height } = svgRef.current.getBoundingClientRect();
    
    const { minX, minY, maxX, maxY } = boundingBox;

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    const effectiveWidth = contentWidth === 0 ? 100 : contentWidth;
    const effectiveHeight = contentHeight === 0 ? 100 : contentHeight;

    const scaleX = width / effectiveWidth;
    const scaleY = height / effectiveHeight;
    const newScale = Math.min(scaleX, scaleY) * 0.9;

    const contentCenterX = minX + contentWidth / 2;
    const contentCenterY = minY + contentHeight / 2;

    const newX = width / 2 - contentCenterX * newScale;
    const newY = height / 2 - contentCenterY * newScale;

    setViewTransform({
        k: newScale,
        x: newX,
        y: newY
    });

  }, [centerViewTrigger, boundingBox]);

  const getSVGPoint = useCallback((screenX: number, screenY: number): { x: number; y: number } => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const svgPoint = svgRef.current.createSVGPoint();
    svgPoint.x = screenX;
    svgPoint.y = screenY;
    const invertedMatrix = gRef.current?.getScreenCTM()?.inverse();
    if (invertedMatrix) {
      const worldPoint = svgPoint.matrixTransform(invertedMatrix);
      return { x: worldPoint.x, y: worldPoint.y };
    }
    return { x: 0, y: 0 };
  }, []);

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning.current) {
        const dx = event.clientX - panStart.current.x;
        const dy = event.clientY - panStart.current.y;
        setViewTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        panStart.current = { x: event.clientX, y: event.clientY };
        return;
    }
    
    const worldPos = getSVGPoint(event.clientX, event.clientY);
    
    let closestNode: Node | null = null;
    let minDistance = SNAP_RADIUS / viewTransform.k;

    for (const node of nodes) {
      const distance = Math.hypot(node.x - worldPos.x, node.y - worldPos.y);
      if (distance < minDistance) {
        minDistance = distance;
        closestNode = node;
      }
    }
    setSnappedNode(closestNode);

    if (closestNode) {
        setCursorPos({ x: closestNode.x, y: closestNode.y });
    } else if (snapToGrid && drawingMode === 'node') {
        setCursorPos({
            x: Math.round(worldPos.x / gridSize) * gridSize,
            y: Math.round(worldPos.y / gridSize) * gridSize,
        });
    } else {
        setCursorPos(worldPos);
    }
  };

  const handleMouseDown = (event: MouseEvent<SVGSVGElement>) => {
    if (event.button === 1) { // Middle mouse button
      isPanning.current = true;
      panStart.current = { x: event.clientX, y: event.clientY };
      event.preventDefault();
    }
  };

  const handleMouseUp = (event: MouseEvent<SVGSVGElement>) => {
    if (event.button === 1) {
      isPanning.current = false;
    }
  };

  const handleMouseLeave = () => {
    setCursorPos(null);
    setSnappedNode(null);
    isPanning.current = false;
  };

  const handleWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const { deltaY } = event;
    const scaleFactor = deltaY > 0 ? 0.9 : 1.1;
    const mousePos = getSVGPoint(event.clientX, event.clientY);
    
    const newScale = viewTransform.k * scaleFactor;
    
    // To zoom towards the mouse cursor
    const newX = mousePos.x - (mousePos.x - viewTransform.x) * scaleFactor;
    const newY = mousePos.y - (mousePos.y - viewTransform.y) * scaleFactor;

    setViewTransform({
        k: newScale,
        x: newX,
        y: newY
    });
  };

  const handleBackgroundClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (event.button !== 0 || event.detail > 1) return;
    if (isPanning.current) return;
    
    const point = getSVGPoint(event.clientX, event.clientY);
    onCanvasBackgroundClick(point);
  };

  const gridLines = useMemo(() => {
    if (!svgRef.current) return null;
    const { width, height } = svgRef.current.getBoundingClientRect();
    
    const viewTopLeft = getSVGPoint(0, 0);
    const viewBottomRight = getSVGPoint(width, height);

    const lines = [];
    const majorGridSize = gridSize * 5;

    // Vertical lines
    const startX = Math.floor(viewTopLeft.x / gridSize) * gridSize;
    for (let i = startX; i < viewBottomRight.x; i += gridSize) {
      const isMajor = Math.abs(i % majorGridSize) < 0.001;
      lines.push(
        <line
          key={`v-${i}`}
          x1={i} y1={viewTopLeft.y}
          x2={i} y2={viewBottomRight.y}
          stroke={isMajor ? "#d1d5db" : "#e5e7eb"}
          strokeWidth={(isMajor ? 1 : 0.5) / viewTransform.k}
        />
      );
    }
    
    // Horizontal lines
    const startY = Math.floor(viewTopLeft.y / gridSize) * gridSize;
    for (let i = startY; i < viewBottomRight.y; i += gridSize) {
      const isMajor = Math.abs(i % majorGridSize) < 0.001;
      lines.push(
        <line
          key={`h-${i}`}
          x1={viewTopLeft.x} y1={i}
          x2={viewBottomRight.x} y2={i}
          stroke={isMajor ? "#d1d5db" : "#e5e7eb"}
          strokeWidth={(isMajor ? 1 : 0.5) / viewTransform.k}
        />
      );
    }

    return lines;
  }, [viewTransform, gridSize, getSVGPoint]);
  
  const lineStartNode = useMemo(() => {
    if (!lineStartNodeId) return null;
    return nodes.find(n => n.id === lineStartNodeId);
  }, [lineStartNodeId, nodes]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 flex-grow aspect-w-1 aspect-h-1 border border-gray-200">
      <svg
        ref={svgRef}
        className="w-full h-full cursor-crosshair bg-gray-50/50 rounded"
        onClick={handleBackgroundClick}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      >
        <rect width="100%" height="100%" fill="#f9fafb" />
        
        <g ref={gRef} transform={`translate(${viewTransform.x} ${viewTransform.y}) scale(${viewTransform.k})`}>
          {gridLines}
          {showOrigin && (
            <>
              <line x1="-10000" y1="0" x2="10000" y2="0" stroke="#9ca3af" strokeWidth={0.75 / viewTransform.k} strokeDasharray={`${4 / viewTransform.k} ${2 / viewTransform.k}`} />
              <line x1="0" y1="-10000" x2="0" y2="10000" stroke="#9ca3af" strokeWidth={0.75 / viewTransform.k} strokeDasharray={`${4 / viewTransform.k} ${2 / viewTransform.k}`} />
              <text x={5 / viewTransform.k} y={-5 / viewTransform.k} fontSize={10 / viewTransform.k} fill="#6b7280" className="select-none">Y</text>
              <text x={-15 / viewTransform.k} y={15 / viewTransform.k} fontSize={10 / viewTransform.k} fill="#6b7280" className="select-none">X</text>
            </>
          )}

          {linesWithCoords.map((line) => {
            const isSelected = selectedElement?.type === 'line' && selectedElement.id === line.id;
            const length = Math.hypot(line.end.x - line.start.x, line.end.y - line.start.y);
            return line.start && line.end && (
            <g key={line.id} onClick={(e) => { e.stopPropagation(); onLineClick(line.id); }} className="cursor-pointer">
              <line
                  x1={line.start.x} y1={line.start.y}
                  x2={line.end.x} y2={line.end.y}
                  stroke="transparent" strokeWidth={10 / viewTransform.k} strokeLinecap="round"
              />
              <line
                x1={line.start.x} y1={line.start.y}
                x2={line.end.x} y2={line.end.y}
                stroke={isSelected ? "#ec4899" : "#0ea5e9"} 
                strokeWidth={(isSelected ? 3 : 2) / viewTransform.k} 
                strokeLinecap="round"
              />
              <text
                x={(line.start.x + line.end.x) / 2}
                y={(line.start.y + line.end.y) / 2}
                fontSize={8 / viewTransform.k}
                fill="#1f2937"
                textAnchor="middle"
                dy={-4 / viewTransform.k}
                className="select-none"
              >
                {length.toFixed(1)}
              </text>
            </g>
          )})}
          
           {showExtremeDistances && centroid && extremeDistances && boundingBox && (
                <g className="dimension-lines" stroke="#3b82f6" strokeWidth={0.75 / viewTransform.k} fill="#3b82f6">
                    {/* Top */}
                    {extremeDistances.cTop > EPSILON && <>
                        <line x1={centroid.x} y1={centroid.y} x2={centroid.x} y2={boundingBox.maxY} strokeDasharray={`${3/viewTransform.k} ${2/viewTransform.k}`} />
                        <line x1={centroid.x - 5/viewTransform.k} y1={boundingBox.maxY} x2={centroid.x + 5/viewTransform.k} y2={boundingBox.maxY} />
                        <text x={centroid.x + 5/viewTransform.k} y={(centroid.y + boundingBox.maxY)/2} fontSize={8 / viewTransform.k} className="select-none">c-top: {extremeDistances.cTop.toFixed(1)}</text>
                    </>}
                    
                    {/* Bottom */}
                    {extremeDistances.cBottom > EPSILON && <>
                        <line x1={centroid.x} y1={centroid.y} x2={centroid.x} y2={boundingBox.minY} strokeDasharray={`${3/viewTransform.k} ${2/viewTransform.k}`} />
                        <line x1={centroid.x - 5/viewTransform.k} y1={boundingBox.minY} x2={centroid.x + 5/viewTransform.k} y2={boundingBox.minY} />
                        <text x={centroid.x + 5/viewTransform.k} y={(centroid.y + boundingBox.minY)/2} fontSize={8 / viewTransform.k} className="select-none">c-bot: {extremeDistances.cBottom.toFixed(1)}</text>
                    </>}

                    {/* Right */}
                    {extremeDistances.cRight > EPSILON && <>
                        <line x1={centroid.x} y1={centroid.y} x2={boundingBox.maxX} y2={centroid.y} strokeDasharray={`${3/viewTransform.k} ${2/viewTransform.k}`} />
                        <line x1={boundingBox.maxX} y1={centroid.y - 5/viewTransform.k} x2={boundingBox.maxX} y2={centroid.y + 5/viewTransform.k} />
                        <text x={(centroid.x + boundingBox.maxX)/2} y={centroid.y - 5/viewTransform.k} fontSize={8 / viewTransform.k} textAnchor="middle" className="select-none">c-right: {extremeDistances.cRight.toFixed(1)}</text>
                    </>}
                    
                    {/* Left */}
                    {extremeDistances.cLeft > EPSILON && <>
                        <line x1={centroid.x} y1={centroid.y} x2={boundingBox.minX} y2={centroid.y} strokeDasharray={`${3/viewTransform.k} ${2/viewTransform.k}`} />
                        <line x1={boundingBox.minX} y1={centroid.y - 5/viewTransform.k} x2={boundingBox.minX} y2={centroid.y + 5/viewTransform.k} />
                        <text x={(centroid.x + boundingBox.minX)/2} y={centroid.y - 5/viewTransform.k} fontSize={8 / viewTransform.k} textAnchor="middle" className="select-none">c-left: {extremeDistances.cLeft.toFixed(1)}</text>
                    </>}
                </g>
            )}

          {nodes.map((node, index) => {
            const isSelected = selectedElement?.type === 'node' && selectedElement.id === node.id;
            return (
            <g key={node.id} onClick={(e) => { e.stopPropagation(); onNodeClick(node.id); }} className="cursor-pointer">
              <circle
                cx={node.x} cy={node.y} r={(isSelected ? 5 : 4) / viewTransform.k}
                fill={isSelected ? "#ec4899" : "#f97316"} 
                stroke="#ffffff" strokeWidth={1.5 / viewTransform.k}
              />
              <text
                x={node.x} y={node.y}
                fontSize={8 / viewTransform.k}
                fill="#c2410c"
                textAnchor="middle"
                dy={-8 / viewTransform.k}
                className="select-none"
              >
                N{index + 1}
              </text>
            </g>
          )})}
          {centroid && (
            <g>
              <line x1={centroid.x - 8/viewTransform.k} y1={centroid.y} x2={centroid.x + 8/viewTransform.k} y2={centroid.y} stroke="#e11d48" strokeWidth={2/viewTransform.k} />
              <line x1={centroid.x} y1={centroid.y - 8/viewTransform.k} x2={centroid.x} y2={centroid.y + 8/viewTransform.k} stroke="#e11d48" strokeWidth={2/viewTransform.k} />
              <circle cx={centroid.x} cy={centroid.y} r={4/viewTransform.k} fill="none" stroke="#e11d48" strokeWidth={2/viewTransform.k} />
            </g>
          )}

          {lineStartNode && cursorPos && (
            <line
                x1={lineStartNode.x} y1={lineStartNode.y}
                x2={cursorPos.x} y2={cursorPos.y}
                stroke="#10b981"
                strokeWidth={1.5 / viewTransform.k}
                strokeDasharray={`${4 / viewTransform.k} ${2 / viewTransform.k}`}
            />
          )}

          {snappedNode && (
            <circle cx={snappedNode.x} cy={snappedNode.y} r={SNAP_RADIUS / viewTransform.k}
              fill="none" stroke="#10b981" strokeWidth={2 / viewTransform.k} strokeDasharray={`${4 / viewTransform.k} ${2 / viewTransform.k}`}
            />
          )}
          {!snappedNode && snapToGrid && drawingMode === 'node' && cursorPos && (
             <circle cx={cursorPos.x} cy={cursorPos.y} r={3 / viewTransform.k}
              fill="none" stroke="#10b981" strokeWidth={1.5 / viewTransform.k}
            />
          )}
          
          {cursorPos && (
             <g transform={`translate(${cursorPos.x}, ${cursorPos.y})`}>
                <rect x={10 / viewTransform.k} y={10 / viewTransform.k} width={110 / viewTransform.k} height={20 / viewTransform.k} fill="rgba(255, 255, 255, 0.8)" rx={3/viewTransform.k} />
                <text x={15 / viewTransform.k} y={24 / viewTransform.k} fontSize={10 / viewTransform.k} fill="#4b5563" className="font-mono select-none">
                    X:{cursorPos.x.toFixed(1)}, Y:{cursorPos.y.toFixed(1)}
                </text>
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};

export default DrawingCanvas;