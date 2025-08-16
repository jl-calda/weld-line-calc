import React from 'react';
import type { Node, SelectedElement } from '../types';

interface NodesTableProps {
  nodes: Node[];
  onUpdateNode: (nodeId: number, newX: number, newY: number) => void;
  selectedElement: SelectedElement | null;
  onDeleteNode: (nodeId: number) => void;
}

const EditableCell: React.FC<{ value: number; onChange: (newValue: number) => void }> = ({ value, onChange }) => {
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const newValue = parseFloat(e.target.value);
        if (!isNaN(newValue)) {
            onChange(newValue);
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
        }
    };

    return (
        <input
            type="number"
            defaultValue={value}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full bg-gray-100/50 text-orange-600 font-mono p-1 rounded border-transparent focus:bg-white focus:border-blue-500 focus:ring-0 transition"
        />
    );
}

const NodesTable: React.FC<NodesTableProps> = ({ nodes, onUpdateNode, selectedElement, onDeleteNode }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 h-full flex flex-col border border-gray-200">
      <h2 className="text-xl font-bold text-blue-600 mb-4">Nodes (mm)</h2>
      <div className="flex-grow overflow-y-auto pr-2">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-white border-b-2 border-gray-200">
            <tr>
              <th className="p-2 text-gray-500 font-semibold">ID</th>
              <th className="p-2 text-gray-500 font-semibold">X</th>
              <th className="p-2 text-gray-500 font-semibold">Y</th>
              <th className="p-2 text-gray-500 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map((node, index) => {
              const isSelected = selectedElement?.type === 'node' && selectedElement.id === node.id;
              return (
              <tr key={node.id} className={`border-t border-gray-200 transition-colors ${isSelected ? 'bg-blue-100' : 'hover:bg-gray-50/50'}`}>
                <td className="p-2 font-mono text-orange-600">{index + 1}</td>
                <td className="p-1">
                    <EditableCell 
                        value={node.x}
                        onChange={(newX) => onUpdateNode(node.id, newX, node.y)}
                    />
                </td>
                <td className="p-1">
                    <EditableCell 
                        value={node.y}
                        onChange={(newY) => onUpdateNode(node.id, node.x, newY)}
                    />
                </td>
                <td className="p-1 text-center">
                    <button onClick={() => onDeleteNode(node.id)} className="text-red-500 hover:text-red-700 font-semibold text-xs" title="Delete Node">
                        X
                    </button>
                </td>
              </tr>
            )})}
             {nodes.length === 0 && (
                <tr>
                    <td colSpan={4} className="text-center p-4 text-gray-400">No nodes added yet.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NodesTable;