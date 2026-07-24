import React from 'react';

interface RondonTexMarkProps {
  className?: string;
}

// Marca textual do RondonTex (patrocinador master): "Rondon" em verde e "TEX"
// em claro, para boa leitura no fundo escuro. Aproximação de marca — pode ser
// trocada pela imagem oficial quando disponível. Escala com o font-size.
export const RondonTexMark: React.FC<RondonTexMarkProps> = ({ className }) => (
  <span className={`font-black italic tracking-tighter leading-none whitespace-nowrap ${className ?? ''}`} role="img" aria-label="RondonTex">
    <span style={{ color: '#39a559' }} className="[text-shadow:0_0_14px_rgba(57,165,89,0.45)]">Rondon</span>
    <span className="text-white">TEX</span>
  </span>
);
