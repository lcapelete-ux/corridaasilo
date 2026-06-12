import React from 'react';

interface SicrediMarkProps {
  className?: string;
}

// Cores do símbolo (pinwheel) da marca Sicredi, em gradiente do verde-limão ao verde-escuro
const PETAL_COLORS = ['#D6F76B', '#B8E94A', '#9ADB3C', '#7CC242', '#5EAA3A', '#458F37', '#2F6E2E'];
const PETAL_PATH = 'M0,0 C-4,-10 -16,-18 -2,-28 C14,-22 16,-10 0,0 Z';

export const SicrediMark: React.FC<SicrediMarkProps> = ({ className }) => (
  <span className={`inline-flex items-center gap-1.5 ${className ?? ''}`}>
    <svg viewBox="-30 -30 60 60" className="h-5 md:h-6 w-auto" role="img" aria-label="Sicredi" xmlns="http://www.w3.org/2000/svg">
      {PETAL_COLORS.map((color, i) => (
        <path
          key={i}
          d={PETAL_PATH}
          fill={color}
          stroke="#0B3D14"
          strokeWidth="1"
          strokeLinejoin="round"
          transform={`rotate(${i * (360 / PETAL_COLORS.length)})`}
        />
      ))}
      <circle r="3" fill="#0B3D14" />
    </svg>
    <span className="font-black italic text-[#9ADB3C] neon-text-green">Sicredi</span>
  </span>
);
