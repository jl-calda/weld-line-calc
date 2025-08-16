import React, { useMemo } from 'react';
import type { Line, Node, SelectedElement } from '../types';

interface LinesTableProps {
  lines: Line[];
  nodes: Node[];
  selectedElement: SelectedElement | null;
  onDeleteLine: (lineId: number) => void;
}

const LinesTable: React.FC<LinesTableProps> = ({ lines, nodes, selectedElement, onDeleteLine }) => {
  
  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);
  const nodeIndexMap = useMemo(() => new Map(nodes.map((node, index) => [node.id, index + 1])), [nodes]);
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 h-full flex flex-col border border-[var(--light-blue)]">
      <h2 className="text-xl font-bold text-[var(--dark-gray)] mb-4">Lines</h2>
       <div className="flex-grow overflow-y-auto pr-2">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-white border-b-2 border-[var(--light-blue)]">
            <tr>
              <th className="p-2 text-[var(--medium-gray)] font-semibold">ID</th>
              <th className="p-2 text-[var(--medium-gray)] font-semibold">Length (mm)</th>
              <th className="p-2 text-[var(--medium-gray)] font-semibold">Start</th>
              <th className="p-2 text-[var(--medium-gray)] font-semibold">End</th>
              <th className="p-2 text-[var(--medium-gray)] font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => {
              const isSelected = selectedElement?.type === 'line' && selectedElement.id === line.id;
              const startNode = nodeMap.get(line.startNodeId);
              const endNode = nodeMap.get(line.endNodeId);
              let length = 0;
              if (startNode && endNode) {
                length = Math.hypot(endNode.x - startNode.x, endNode.y - startNode.y);
              }

              return (
              <tr key={line.id} className={`border-t border-[var(--light-blue)] transition-colors ${isSelected ? 'bg-[var(--light-blue)]' : 'hover:bg-[#f7fcfc]'}`}>
                <td className="p-2 font-mono text-[var(--dark-gray)]">L{index + 1}</td>
                <td className="p-2 font-mono text-[var(--dark-gray)]">{length.toFixed(1)}</td>
                <td className="p-2 font-mono text-[var(--dark-gray)]">N{nodeIndexMap.get(line.startNodeId) ?? '?'}</td>
                <td className="p-2 font-mono text-[var(--dark-gray)]">N{nodeIndexMap.get(line.endNodeId) ?? '?'}</td>
                <td className="p-1 text-center">
                    <button onClick={() => onDeleteLine(line.id)} className="text-red-500 hover:text-red-700 font-semibold text-xs" title="Delete Line">
                        X
                    </button>
                </td>
              </tr>
            )})}
            {lines.length === 0 && (
                <tr>
                    <td colSpan={5} className="text-center p-4 text-[var(--medium-gray)]">No lines drawn yet.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LinesTable;