import type { Node, Line, CalculationResults } from '../types';

export function calculateWeldProperties(nodes: Node[], lines: Line[]): CalculationResults | null {
  if (lines.length === 0 || nodes.length === 0) {
    return null;
  }

  let totalLength = 0;
  let sumLx = 0;
  let sumLy = 0;
  
  let totalInertiaOx = 0;
  let totalInertiaOy = 0;
  let totalInertiaOxy = 0;

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  for (const line of lines) {
    const startNode = nodeMap.get(line.startNodeId);
    const endNode = nodeMap.get(line.endNodeId);

    if (!startNode || !endNode) {
      continue;
    }

    const x1 = startNode.x;
    const y1 = startNode.y;
    const x2 = endNode.x;
    const y2 = endNode.y;
    
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) {
        continue;
    }

    totalLength += length;
    
    // For Centroid Calculation
    const centroidX = (x1 + x2) / 2;
    const centroidY = (y1 + y2) / 2;
    sumLx += length * centroidX;
    sumLy += length * centroidY;

    // For Moment of Inertia Calculation about Origin (0,0) based on unit thickness.
    // The formula integral(y^2 * dL) results in units of length^3.
    const lineInertiaOx = (y1*y1 + y1*y2 + y2*y2) * length / 3;
    const lineInertiaOy = (x1*x1 + x1*x2 + x2*x2) * length / 3;
    const lineInertiaOxy = (x1*y1 + x2*y2 + (x1*y2 + x2*y1)/2) * length / 3;

    totalInertiaOx += lineInertiaOx;
    totalInertiaOy += lineInertiaOy;
    totalInertiaOxy += lineInertiaOxy;
  }
  
  if (totalLength === 0) {
      return null;
  }

  // Final Centroid of the whole system
  const centroidX = sumLx / totalLength;
  const centroidY = sumLy / totalLength;

  // Transfer Inertia from Origin to the System's Centroid using Parallel Axis Theorem
  // I_xx = I_Ox - A * Ȳ^2
  // Here, "Area" A is the total length, since we assume unit thickness.
  // The units are mm^3.
  const centroidalInertiaIxx_mm3 = totalInertiaOx - totalLength * centroidY * centroidY;
  const centroidalInertiaIyy_mm3 = totalInertiaOy - totalLength * centroidX * centroidX;
  const centroidalInertiaIxy_mm3 = totalInertiaOxy - totalLength * centroidX * centroidY;

  // Convert from mm^3 to cm^3 (1 cm^3 = 1,000 mm^3)
  const MM3_TO_CM3_CONVERSION = 1000;

  // Find bounding box for extreme distance calculation
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodes.forEach(node => {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x);
      maxY = Math.max(maxY, node.y);
  });
  
  const extremeDistances = {
      cTop: maxY - centroidY,
      cBottom: centroidY - minY,
      cLeft: centroidX - minX,
      cRight: maxX - centroidX,
  };

  return {
    centroid: {
      x: centroidX,
      y: centroidY,
    },
    inertia: {
      ixx: centroidalInertiaIxx_mm3 / MM3_TO_CM3_CONVERSION,
      iyy: centroidalInertiaIyy_mm3 / MM3_TO_CM3_CONVERSION,
      ixy: centroidalInertiaIxy_mm3 / MM3_TO_CM3_CONVERSION,
    },
    totalLength: totalLength,
    extremeDistances: extremeDistances,
  };
}