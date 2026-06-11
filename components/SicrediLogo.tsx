import React from 'react';

interface SicrediLogoProps {
  className?: string;
}

// Cores do símbolo (pinwheel) da marca Sicredi, em gradiente do verde-limão ao verde-escuro
const PETAL_COLORS = ['#C8F23A', '#9FDB28', '#74C62E', '#4FAE32', '#2E9A3B', '#1F7A38', '#175C2E'];
const PETAL_PATH = 'M0,0 C-4,-10 -16,-18 -2,-28 C14,-22 16,-10 0,0 Z';

export const SicrediLogo: React.FC<SicrediLogoProps> = ({ className }) => (
  <svg
    viewBox="0 0 220 60"
    className={className}
    role="img"
    aria-label="Sicredi"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g transform="translate(28,30)">
      {PETAL_COLORS.map((color, i) => (
        <path
          key={i}
          d={PETAL_PATH}
          fill={color}
          stroke="#06281A"
          strokeWidth="0.6"
          strokeLinejoin="round"
          transform={`rotate(${i * (360 / PETAL_COLORS.length)})`}
        />
      ))}
      <circle r="2.5" fill="#06281A" />
    </g>
    <text
      x="58"
      y="40"
      fontFamily="Arial, Helvetica, sans-serif"
      fontWeight="800"
      fontSize="32"
      letterSpacing="-1"
      fill="#8DC63F"
    >
      Sicredi
    </text>
  </svg>
);
