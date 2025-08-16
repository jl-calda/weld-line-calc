export interface Node {
  id: number;
  x: number;
  y: number;
}

export interface Line {
  id: number;
  startNodeId: number;
  endNodeId: number;
}

export interface LineWithCoords extends Line {
  start: Node;
  end: Node;
}

export interface Centroid {
  x: number;
  y: number;
}

export interface Inertia {
  ixx: number;
  iyy: number;
  ixy: number;
}

export interface ExtremeDistances {
  cTop: number;
  cBottom: number;
  cLeft: number;
  cRight: number;
}

export interface CalculationResults {
  centroid: Centroid;
  inertia: Inertia;
  totalLength: number;
  extremeDistances: ExtremeDistances;
}

export interface AdditionalInfoItem {
  id: number;
  title: string;
  description: string;
}

export interface ReportSettings {
  projectName: string;
  description: string;
  titleAlignment: 'left' | 'center' | 'right';
  descriptionAlignment: 'left' | 'center' | 'right';
  diagramSize: 'small' | 'medium' | 'large';
  includeNodesTable: boolean;
  includeLinesTable: boolean;
  includeResults: boolean;
  includeExtremeDistances: boolean;
  includeAdditionalInfo: boolean;
  additionalInfo: AdditionalInfoItem[];
  verificationData?: {
    example: VerificationExample;
    manualCalcs: ManualCalculations;
  }
}

export interface PrintViewProps {
  nodes: Node[];
  linesWithCoords: LineWithCoords[];
  results: CalculationResults | null;
  settings: ReportSettings;
}

export type SelectedElement = {
  type: 'node' | 'line';
  id: number;
};

export type DrawingMode = 'node' | 'line';

export interface VerificationExample {
  id: string;
  title: string;
  description: string;
  image: React.ReactNode;
  nodes: Node[];
  lines: Line[];
}

export interface ManualCalculations {
    [key: string]: {
        label: string;
        formula: string;
        substitution: string;
        result: number;
    };
}