import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';

interface WheelSegment {
  id: number;
  text: string;
  color: string;
}

interface SpinningWheelProps {
  segments: WheelSegment[];
  onResult?: (segment: WheelSegment) => void;
}

export function SpinningWheel({ segments, onResult }: SpinningWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<WheelSegment | null>(null);
  
  const wheelRef = useRef<HTMLDivElement>(null);
  
  const segmentAngle = 360 / segments.length;
  
  const spin = () => {
    if (isSpinning) return;
    
    setIsSpinning(true);
    setResult(null);
    
    // Random spin between 3-6 full rotations plus random angle
    const randomSpins = Math.floor(Math.random() * 4) + 3;
    const randomAngle = Math.random() * 360;
    const totalRotation = rotation + (randomSpins * 360) + randomAngle;
    
    setRotation(totalRotation);
    
    // Calculate which segment wins (accounting for pointer at top)
    const normalizedAngle = (360 - (totalRotation % 360)) % 360;
    const winningIndex = Math.floor(normalizedAngle / segmentAngle);
    const winningSegment = segments[winningIndex];
    
    // Wait for animation to complete
    setTimeout(() => {
      setIsSpinning(false);
      setResult(winningSegment);
      onResult?.(winningSegment);
    }, 3000);
  };
  
  return (
    <div className="flex flex-col items-center gap-8 p-8">
      <div className="relative">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 z-10">
          <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-red-500"></div>
        </div>
        
        {/* Wheel */}
        <motion.div
          ref={wheelRef}
          className="relative w-80 h-80 rounded-full border-4 border-gray-800 shadow-lg overflow-hidden"
          animate={{ rotate: rotation }}
          transition={{ duration: 3, ease: "easeOut" }}
        >
          {segments.map((segment, index) => {
            const startAngle = index * segmentAngle;
            const endAngle = (index + 1) * segmentAngle;
            
            // Create SVG path for segment
            const centerX = 160;
            const centerY = 160;
            const radius = 160;
            
            const startAngleRad = (startAngle * Math.PI) / 180;
            const endAngleRad = (endAngle * Math.PI) / 180;
            
            const x1 = centerX + radius * Math.cos(startAngleRad);
            const y1 = centerY + radius * Math.sin(startAngleRad);
            const x2 = centerX + radius * Math.cos(endAngleRad);
            const y2 = centerY + radius * Math.sin(endAngleRad);
            
            const largeArcFlag = segmentAngle > 180 ? 1 : 0;
            
            const pathData = [
              `M ${centerX} ${centerY}`,
              `L ${x1} ${y1}`,
              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              'Z'
            ].join(' ');
            
            // Text position
            const textAngle = startAngle + segmentAngle / 2;
            const textAngleRad = (textAngle * Math.PI) / 180;
            const textRadius = radius * 0.7;
            const textX = centerX + textRadius * Math.cos(textAngleRad);
            const textY = centerY + textRadius * Math.sin(textAngleRad);
            
            return (
              <svg
                key={segment.id}
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 320 320"
              >
                <path
                  d={pathData}
                  fill={segment.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <text
                  x={textX}
                  y={textY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="14"
                  fontWeight="bold"
                  transform={`rotate(${textAngle}, ${textX}, ${textY})`}
                >
                  {segment.text}
                </text>
              </svg>
            );
          })}
          
          {/* Center circle */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-gray-800 rounded-full border-4 border-white shadow-lg"></div>
          </div>
        </motion.div>
      </div>
      
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={spin}
          disabled={isSpinning}
          className="px-8 py-3 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none transition-colors"
        >
          {isSpinning ? 'Spinning...' : 'Spin the Wheel!'}
        </button>
        
        {result && (
          <div className="text-center p-4 bg-green-100 rounded-lg border border-green-300">
            <h3 className="font-bold text-green-800 mb-2">Winner!</h3>
            <p className="text-green-700">{result.text}</p>
          </div>
        )}
      </div>
    </div>
  );
}
