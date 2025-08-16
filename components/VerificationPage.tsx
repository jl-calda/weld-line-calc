import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { calculateWeldProperties } from '../services/calculationService';
import PrintView from './PrintView';
import type { VerificationExample, ReportSettings, Node, Line, LineWithCoords, ManualCalculations } from '../types';

interface SummaryResult {
  exampleTitle: string;
  property: string;
  appValue: number;
  manualValue: number;
  isMatch: boolean;
}

const VerticalLineDiagram = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full">
        <line x1="50" y1="10" x2="50" y2="90" stroke="#516163" strokeWidth="4" strokeLinecap="round" />
        <circle cx="50" cy="10" r="5" fill="#323B3C" />
        <circle cx="50" cy="90" r="5" fill="#323B3C" />
    </svg>
);

const HorizontalLineDiagram = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full">
        <line x1="10" y1="50" x2="90" y2="50" stroke="#516163" strokeWidth="4" strokeLinecap="round" />
        <circle cx="10" cy="50" r="5" fill="#323B3C" />
        <circle cx="90" cy="50" r="5" fill="#323B3C" />
    </svg>
);

const TeeJointDiagram = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full">
        <line x1="10" y1="50" x2="90" y2="50" stroke="#516163" strokeWidth="4" strokeLinecap="round" />
        <line x1="10" y1="50" x2="10" y2="90" stroke="#516163" strokeWidth="4" strokeLinecap="round" />
        <circle cx="10" cy="50" r="5" fill="#323B3C" />
        <circle cx="90" cy="50" r="5" fill="#323B3C" />
        <circle cx="10" cy="90" r="5" fill="#323B3C" />
    </svg>
);

const RectangularWeldDiagram = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect x="15" y="30" width="70" height="40" stroke="#516163" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="15" cy="30" r="5" fill="#323B3C" />
        <circle cx="85" cy="30" r="5" fill="#323B3C" />
        <circle cx="15" cy="70" r="5" fill="#323B3C" />
        <circle cx="85" cy="70" r="5" fill="#323B3C" />
    </svg>
);

const TwoVerticalLinesDiagram = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full">
        <line x1="30" y1="10" x2="30" y2="90" stroke="#516163" strokeWidth="4" strokeLinecap="round" />
        <line x1="70" y1="10" x2="70" y2="90" stroke="#516163" strokeWidth="4" strokeLinecap="round" />
        <circle cx="30" cy="10" r="5" fill="#323B3C" />
        <circle cx="30" cy="90" r="5" fill="#323B3C" />
        <circle cx="70" cy="10" r="5" fill="#323B3C" />
        <circle cx="70" cy="90" r="5" fill="#323B3C" />
    </svg>
);

const TwoHorizontalLinesDiagram = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full">
        <line x1="10" y1="30" x2="90" y2="30" stroke="#516163" strokeWidth="4" strokeLinecap="round" />
        <line x1="10" y1="70" x2="90" y2="70" stroke="#516163" strokeWidth="4" strokeLinecap="round" />
        <circle cx="10" cy="30" r="5" fill="#323B3C" />
        <circle cx="90" cy="30" r="5" fill="#323B3C" />
        <circle cx="10" cy="70" r="5" fill="#323B3C" />
        <circle cx="90" cy="70" r="5" fill="#323B3C" />
    </svg>
);

const CShapeDiagram = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full">
        <path d="M 70 20 L 30 20 L 30 80 L 70 80" stroke="#516163" strokeWidth="4" fill="none" strokeLinecap="round" />
        <circle cx="70" cy="20" r="5" fill="#323B3C" />
        <circle cx="30" cy="20" r="5" fill="#323B3C" />
        <circle cx="30" cy="80" r="5" fill="#323B3C" />
        <circle cx="70" cy="80" r="5" fill="#323B3C" />
    </svg>
);

const verificationExamples: VerificationExample[] = [
    {
        id: 'vertical-line',
        title: 'Vertical Line Weld',
        description: 'A single vertical weld line of 100mm length.',
        image: <VerticalLineDiagram />,
        nodes: [{id: 1, x: 0, y: 0}, {id: 2, x: 0, y: 100}],
        lines: [{id: 1, startNodeId: 1, endNodeId: 2}]
    },
    {
        id: 'horizontal-line',
        title: 'Horizontal Line Weld',
        description: 'A single horizontal weld line of 100mm length.',
        image: <HorizontalLineDiagram />,
        nodes: [{id: 1, x: 0, y: 0}, {id: 2, x: 100, y: 0}],
        lines: [{id: 1, startNodeId: 1, endNodeId: 2}]
    },
    {
        id: 'tee-joint',
        title: 'L-Shape Weld',
        description: 'Two 100mm lines forming an L-shape.',
        image: <TeeJointDiagram />,
        nodes: [{id: 1, x: 0, y: 0}, {id: 2, x: 0, y: 100}, {id: 3, x: 100, y: 0}],
        lines: [{id: 1, startNodeId: 1, endNodeId: 2}, {id: 2, startNodeId: 1, endNodeId: 3}]
    },
    {
        id: 'two-vertical-lines',
        title: 'Two Vertical Lines',
        description: 'Two 100mm vertical welds, 50mm apart.',
        image: <TwoVerticalLinesDiagram />,
        nodes: [
            {id: 1, x: 0, y: 0}, 
            {id: 2, x: 0, y: 100}, 
            {id: 3, x: 50, y: 0}, 
            {id: 4, x: 50, y: 100}
        ],
        lines: [
            {id: 1, startNodeId: 1, endNodeId: 2},
            {id: 2, startNodeId: 3, endNodeId: 4}
        ]
    },
    {
        id: 'two-horizontal-lines',
        title: 'Two Horizontal Lines',
        description: 'Two 100mm horizontal welds, 50mm apart.',
        image: <TwoHorizontalLinesDiagram />,
        nodes: [
            {id: 1, x: 0, y: 0},
            {id: 2, x: 100, y: 0},
            {id: 3, x: 0, y: 50},
            {id: 4, x: 100, y: 50}
        ],
        lines: [
            {id: 1, startNodeId: 1, endNodeId: 2},
            {id: 2, startNodeId: 3, endNodeId: 4}
        ]
    },
    {
        id: 'c-shape',
        title: 'C-Shape Weld',
        description: 'A C-shaped weld with 100mm height and 50mm flanges.',
        image: <CShapeDiagram />,
        nodes: [
            {id: 1, x: 0, y: 0},
            {id: 2, x: 50, y: 0},
            {id: 3, x: 0, y: 100},
            {id: 4, x: 50, y: 100}
        ],
        lines: [
            {id: 1, startNodeId: 1, endNodeId: 2}, // top flange
            {id: 2, startNodeId: 1, endNodeId: 3}, // vertical spine
            {id: 3, startNodeId: 3, endNodeId: 4}, // bottom flange
        ]
    },
    {
        id: 'rectangle',
        title: 'Rectangular Weld',
        description: 'A rectangular weld of 100mm by 50mm.',
        image: <RectangularWeldDiagram />,
        nodes: [
            {id: 1, x: 0, y: 0}, 
            {id: 2, x: 100, y: 0}, 
            {id: 3, x: 100, y: 50}, 
            {id: 4, x: 0, y: 50}
        ],
        lines: [
            {id: 1, startNodeId: 1, endNodeId: 2}, 
            {id: 2, startNodeId: 2, endNodeId: 3},
            {id: 3, startNodeId: 3, endNodeId: 4},
            {id: 4, startNodeId: 4, endNodeId: 1}
        ]
    }
];

const performManualCalculations = (example: VerificationExample): ManualCalculations => {
    const calcs: ManualCalculations = {};
    
    switch (example.id) {
        case 'vertical-line': {
            const d = 100;
            calcs.centroidX = { label: 'Centroid X (X̄)', formula: 'x̄ = 0', substitution: 'By definition for a vertical line on the Y-axis.', result: 0 };
            calcs.centroidY = { label: 'Centroid Y (Ȳ)', formula: 'ȳ = d / 2', substitution: `${d} / 2`, result: d / 2 };
            calcs.Ixx = { label: 'Moment of Inertia Ixx', formula: 'Ixx = d³ / 12', substitution: `${d}³ / 12`, result: Math.pow(d, 3) / 12 };
            calcs.Iyy = { label: 'Moment of Inertia Iyy', formula: 'Iyy = 0 (by analogy)', substitution: 'Iyy is 0 for a line with no width on the Y-axis.', result: 0 };
            calcs.Ixy = { label: 'Product of Inertia Ixy', formula: 'Ixy = 0 (symmetry)', substitution: 'Ixy is 0 for a line on an axis of symmetry.', result: 0 };
            break;
        }
        case 'horizontal-line': {
            const b = 100;
            calcs.centroidX = { label: 'Centroid X (X̄)', formula: 'x̄ = b / 2', substitution: `${b} / 2`, result: b / 2 };
            calcs.centroidY = { label: 'Centroid Y (Ȳ)', formula: 'ȳ = 0', substitution: 'By definition for a horizontal line on the X-axis.', result: 0 };
            calcs.Ixx = { label: 'Moment of Inertia Ixx', formula: 'Ixx = 0 (by analogy)', substitution: 'Ixx is 0 for a line with no height on the X-axis.', result: 0 };
            calcs.Iyy = { label: 'Moment of Inertia Iyy', formula: 'Iyy = b³ / 12', substitution: `${b}³ / 12`, result: Math.pow(b, 3) / 12 };
            calcs.Ixy = { label: 'Product of Inertia Ixy', formula: 'Ixy = 0 (symmetry)', substitution: 'Ixy is 0 for a line on an axis of symmetry.', result: 0 };
            break;
        }
        case 'tee-joint': { // L-Shape
            const b = 100, d = 100;
            const cX = Math.pow(b, 2) / (2 * (b + d));
            const cY = Math.pow(d, 2) / (2 * (b + d));

            calcs.centroidX = { label: 'Centroid X (X̄)', formula: 'x̄ = b² / [2(b+d)]', substitution: `${b}² / [2(${b}+${d})]`, result: cX };
            calcs.centroidY = { label: 'Centroid Y (Ȳ)', formula: 'ȳ = d² / [2(b+d)]', substitution: `${d}² / [2(${b}+${d})]`, result: cY };

            // Perpendicular Axis Theorem: I = I_centroidal + A*d^2
            // Vertical line part
            const ixx_vert_centroidal = Math.pow(d, 3) / 12;
            const ixx_vert_transfer = d * Math.pow(d/2 - cY, 2);
            const ixx_vert = ixx_vert_centroidal + ixx_vert_transfer;

            // Horizontal line part
            const ixx_horiz_centroidal = 0; // line of no height
            const ixx_horiz_transfer = b * Math.pow(0 - cY, 2);
            const ixx_horiz = ixx_horiz_centroidal + ixx_horiz_transfer;
            
            // Iyy
            const iyy_vert = 0 + d * Math.pow(0 - cX, 2);
            const iyy_horiz = (Math.pow(b, 3) / 12) + b * Math.pow(b/2 - cX, 2);
            
            // Ixy
            const ixy_vert = 0 + d * (0 - cX) * (d/2 - cY);
            const ixy_horiz = 0 + b * (b/2 - cX) * (0 - cY);
            
            calcs.Ixx = { label: 'Moment of Inertia Ixx', formula: 'Ixx column is blank in ref. Using Parallel Axis Theorem.', substitution: `Vertical: [${d}³/12 + ${d}*(${d/2}-${cY.toFixed(1)})²] + Horizontal: [0 + ${b}*(${0}-${cY.toFixed(1)})²]`, result: ixx_vert + ixx_horiz };
            calcs.Iyy = { label: 'Moment of Inertia Iyy', formula: 'Iyy column is blank in ref. Using Parallel Axis Theorem.', substitution: `Vertical: [0 + ${d}*(${0}-${cX.toFixed(1)})²] + Horizontal: [${b}³/12 + ${b}*(${b/2}-${cX.toFixed(1)})²]`, result: iyy_vert + iyy_horiz };
            calcs.Ixy = { label: 'Product of Inertia Ixy', formula: 'Ixy column is blank in ref. Using Parallel Axis Theorem.', substitution: `[${d}*(${0}-${cX.toFixed(1)})*(${d/2}-${cY.toFixed(1)})] + [${b}*(${b/2}-${cX.toFixed(1)})*(${0}-${cY.toFixed(1)})]`, result: ixy_vert + ixy_horiz };
            break;
        }
        case 'two-vertical-lines': {
            const b = 50, d = 100;
            calcs.centroidX = { label: 'Centroid X (X̄)', formula: 'x̄ = b / 2', substitution: `${b} / 2`, result: b / 2 };
            calcs.centroidY = { label: 'Centroid Y (Ȳ)', formula: 'ȳ = d / 2', substitution: `${d} / 2`, result: d / 2 };
            calcs.Ixx = { label: 'Moment of Inertia Ixx', formula: 'Ixx = d³ / 6', substitution: `${d}³ / 6`, result: Math.pow(d, 3) / 6 };
            const iyy = 2 * (d * Math.pow(b/2, 2));
            calcs.Iyy = { label: 'Moment of Inertia Iyy', formula: 'Iyy (from Parallel Axis Theorem)', substitution: `2 * [0 + ${d} * (${b}/2)²]`, result: iyy };
            calcs.Ixy = { label: 'Product of Inertia Ixy', formula: 'Ixy = 0 (symmetry)', substitution: 'Ixy is 0 for a shape with two axes of symmetry.', result: 0 };
            break;
        }
        case 'two-horizontal-lines': {
            const b = 100, d = 50;
            calcs.centroidX = { label: 'Centroid X (X̄)', formula: 'x̄ = b / 2', substitution: `${b} / 2`, result: b / 2 };
            calcs.centroidY = { label: 'Centroid Y (Ȳ)', formula: 'ȳ = d / 2', substitution: `${d} / 2`, result: d / 2 };
            calcs.Ixx = { label: 'Moment of Inertia Ixx', formula: 'Ixx = b.d² / 2', substitution: `${b} * ${d}² / 2`, result: b * Math.pow(d, 2) / 2 };
            const iyy = 2 * (Math.pow(b, 3) / 12);
            calcs.Iyy = { label: 'Moment of Inertia Iyy', formula: 'Iyy (from Parallel Axis Theorem)', substitution: `2 * [${b}³ / 12]`, result: iyy };
            calcs.Ixy = { label: 'Product of Inertia Ixy', formula: 'Ixy = 0 (symmetry)', substitution: 'Ixy is 0 for a shape with two axes of symmetry.', result: 0 };
            break;
        }
        case 'c-shape': {
            const b = 50, d = 100;
            const cX = Math.pow(b, 2) / (2 * b + d);
            calcs.centroidX = { label: 'Centroid X (X̄)', formula: 'x̄ = b² / (2b + d)', substitution: `${b}² / (2*${b} + ${d})`, result: cX };
            calcs.centroidY = { label: 'Centroid Y (Ȳ)', formula: 'ȳ = d / 2', substitution: `${d} / 2`, result: d / 2 };
            const ixx = Math.pow(d, 2) * (d + 6*b) / 12;
            calcs.Ixx = { label: 'Moment of Inertia Ixx', formula: 'Ixx = d²(d + 6b) / 12', substitution: `${d}² * (${d} + 6*${b}) / 12`, result: ixx };
            const iyy_spine = 0 + d * Math.pow(0 - cX, 2);
            const iyy_flanges = 2 * (Math.pow(b, 3) / 12 + b * Math.pow(b/2 - cX, 2));
            const iyy = iyy_spine + iyy_flanges;
            calcs.Iyy = { label: 'Moment of Inertia Iyy', formula: 'Iyy (from Parallel Axis Theorem)', substitution: `Spine: [${d}*(0-${cX.toFixed(1)})²] + Flanges: [2*(${b}³/12 + ${b}*(${b}/2-${cX.toFixed(1)})²)]`, result: iyy };
            calcs.Ixy = { label: 'Product of Inertia Ixy', formula: 'Ixy = 0 (symmetry)', substitution: 'Ixy is 0 due to symmetry about the horizontal centroidal axis.', result: 0 };
            break;
        }
        case 'rectangle': {
            const b = 100, d = 50;
            calcs.centroidX = { label: 'Centroid X (X̄)', formula: 'x̄ = b / 2', substitution: `${b} / 2`, result: b / 2 };
            calcs.centroidY = { label: 'Centroid Y (Ȳ)', formula: 'ȳ = d / 2', substitution: `${d} / 2`, result: d / 2 };
            calcs.Ixx = { label: 'Moment of Inertia Ixx', formula: 'Ixx = d²(3b+d)/6', substitution: `${d}² * (3*${b} + ${d}) / 6`, result: Math.pow(d, 2) * (3 * b + d) / 6 };
            calcs.Iyy = { label: 'Moment of Inertia Iyy', formula: 'Iyy = b²(3d+b)/6 (by analogy)', substitution: `${b}² * (3*${d} + ${b}) / 6`, result: Math.pow(b, 2) * (3 * d + b) / 6 };
            calcs.Ixy = { label: 'Product of Inertia Ixy', formula: 'Ixy = 0 (symmetry)', substitution: 'Ixy is 0 for a shape with two axes of symmetry.', result: 0 };
            break;
        }
    }
    return calcs;
}

const VerificationCard: React.FC<{example: VerificationExample, onDownload: (example: VerificationExample) => void, isDownloading: boolean}> = ({ example, onDownload, isDownloading }) => {
    return (
        <div className="bg-white rounded-lg shadow-lg p-6 border border-[var(--light-blue)] flex flex-col items-center text-center transition-transform hover:scale-105">
            <h3 className="text-xl font-bold text-[var(--dark-gray)] mb-2">{example.title}</h3>
            <div className="w-32 h-32 my-4">{example.image}</div>
            <p className="text-[var(--medium-gray)] mb-6 flex-grow">{example.description}</p>
            <button 
                onClick={() => onDownload(example)}
                disabled={isDownloading}
                className="w-full mt-auto px-6 py-2 bg-[var(--dark-gray)] hover:bg-[var(--medium-gray)] text-white font-semibold rounded-lg shadow-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--dark-gray)] disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                Download Verification PDF
            </button>
        </div>
    );
};

const VerificationPage: React.FC = () => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [summaryData, setSummaryData] = useState<SummaryResult[]>([]);

    useEffect(() => {
        const data: SummaryResult[] = [];
        verificationExamples.forEach(example => {
            const appResults = calculateWeldProperties(example.nodes, example.lines);
            const manualCalcs = performManualCalculations(example);

            if (appResults && manualCalcs) {
                data.push({
                    exampleTitle: example.title,
                    property: 'Centroid X (mm)',
                    appValue: appResults.centroid.x,
                    manualValue: manualCalcs.centroidX.result,
                    isMatch: Math.abs(appResults.centroid.x - manualCalcs.centroidX.result) < 1e-9
                });
                data.push({
                    exampleTitle: example.title,
                    property: 'Centroid Y (mm)',
                    appValue: appResults.centroid.y,
                    manualValue: manualCalcs.centroidY.result,
                    isMatch: Math.abs(appResults.centroid.y - manualCalcs.centroidY.result) < 1e-9
                });
                data.push({
                    exampleTitle: example.title,
                    property: 'Ixx (cm³)',
                    appValue: appResults.inertia.ixx,
                    manualValue: manualCalcs.Ixx.result / 1000,
                    isMatch: Math.abs(appResults.inertia.ixx - (manualCalcs.Ixx.result / 1000)) < 1e-9
                });
            }
        });
        setSummaryData(data);
    }, []);

    const handleDownload = async (example: VerificationExample) => {
        setIsDownloading(true);

        const appResults = calculateWeldProperties(example.nodes, example.lines);
        if (!appResults) {
            alert('Calculation failed for this example.');
            setIsDownloading(false);
            return;
        }

        const linesWithCoords: LineWithCoords[] = example.lines.map(line => ({
            ...line,
            start: example.nodes.find(n => n.id === line.startNodeId)!,
            end: example.nodes.find(n => n.id === line.endNodeId)!
        }));

        const manualCalcs = performManualCalculations(example);

        const settings: ReportSettings = {
            projectName: `Verification Report: ${example.title}`,
            description: `This report verifies the application's calculations for a "${example.title}" against standard engineering formulas.`,
            titleAlignment: 'center',
            descriptionAlignment: 'left',
            diagramSize: 'medium',
            includeNodesTable: true,
            includeLinesTable: true,
            includeResults: true,
            includeExtremeDistances: true,
            includeAdditionalInfo: false,
            additionalInfo: [],
            verificationData: { example, manualCalcs }
        };

        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.top = '0';
        tempContainer.style.width = '210mm';
        tempContainer.style.background = 'white';
        document.body.appendChild(tempContainer);
        
        const root = ReactDOM.createRoot(tempContainer);
        root.render(<PrintView nodes={example.nodes} linesWithCoords={linesWithCoords} results={appResults} settings={settings} />);

        await new Promise(resolve => setTimeout(resolve, 100));

        const canvas = await html2canvas(tempContainer, { scale: 3 });
        const imgData = canvas.toDataURL('image/png');

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
            position = - (imgHeight - heightLeft);
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;
        }

        pdf.save(`verification-${example.id}.pdf`);

        root.unmount();
        document.body.removeChild(tempContainer);
        setIsDownloading(false);
    };

    return (
        <main className="flex-grow">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-[var(--dark-gray)]">Calculation Verification</h2>
                <p className="text-lg text-[var(--medium-gray)] mt-2">
                    A summary of verifications against standard formulas is below.
                    <br />
                    Click any card to download a detailed report with a full manual calculation breakdown.
                </p>
            </div>
            
            <div className="mb-12 bg-white rounded-lg shadow-lg p-6 border border-[var(--light-blue)] overflow-x-auto max-w-7xl mx-auto">
                <h2 className="text-2xl font-bold text-[var(--dark-gray)] mb-4 text-center">Verification Summary</h2>
                <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-[#f7fcfc] border-b-2 border-[var(--light-blue)]">
                        <tr>
                            <th className="p-3 font-semibold text-[var(--dark-gray)]">Shape</th>
                            <th className="p-3 font-semibold text-[var(--dark-gray)]">Property</th>
                            <th className="p-3 font-semibold text-[var(--dark-gray)] text-right">App Result</th>
                            <th className="p-3 font-semibold text-[var(--dark-gray)] text-right">Manual Result</th>
                            <th className="p-3 font-semibold text-[var(--dark-gray)] text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {verificationExamples.map((example) => {
                            const resultsForExample = summaryData.filter(d => d.exampleTitle === example.title);
                            if (resultsForExample.length === 0) return null;

                            return (
                                <React.Fragment key={example.id}>
                                    {resultsForExample.map((result, resultIndex) => (
                                        <tr key={`${example.id}-${result.property}`} className="border-t border-[var(--light-blue)]">
                                            {resultIndex === 0 && (
                                                <td rowSpan={3} className="p-3 font-semibold text-[var(--dark-gray)] border-r border-[var(--light-blue)] align-middle">{example.title}</td>
                                            )}
                                            <td className="p-3 text-[var(--medium-gray)]">{result.property}</td>
                                            <td className="p-3 font-mono text-right text-[var(--dark-gray)]">{result.appValue.toFixed(3)}</td>
                                            <td className="p-3 font-mono text-right text-[var(--dark-gray)]">{result.manualValue.toFixed(3)}</td>
                                            <td className={`p-3 text-center font-bold ${result.isMatch ? 'text-green-600' : 'text-red-600'}`}>
                                                {result.isMatch ? '✔ Match' : '✘ Mismatch'}
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {verificationExamples.map(example => (
                    <VerificationCard 
                        key={example.id} 
                        example={example}
                        onDownload={handleDownload}
                        isDownloading={isDownloading}
                    />
                ))}
            </div>
        </main>
    );
};

export default VerificationPage;