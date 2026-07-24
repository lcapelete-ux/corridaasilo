// Prepara um arquivo (foto/print/PDF) para ser salvo como comprovante.
//
// Fotos de celular chegam com vários MB. Com centenas de inscritos, guardar
// cada comprovante como base64 numa coluna de texto do Supabase estoura a
// cota gratuita do banco rápido. Por isso: imagens são redimensionadas e
// recomprimidas no próprio navegador e o arquivo (imagem já comprimida, ou
// PDF/outro tipo direto) é enviado ao Cloudinary — o banco guarda só a URL
// resultante (texto curto), não o arquivo inteiro.

const MAX_DIMENSION = 1600;   // maior lado da imagem, em pixels
const JPEG_QUALITY = 0.72;
const MAX_PASSTHROUGH_BYTES = 4 * 1024 * 1024; // 4 MB para arquivos não-imagem (ex.: PDF)

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// Envia o arquivo (já comprimido, se for imagem) para o Cloudinary via upload
// unsigned e devolve a URL pública. Nada de credencial sensível no navegador:
// o preset "unsigned" só permite criar arquivos novos, com regras definidas
// no painel do Cloudinary.
const uploadToCloudinary = async (blob: Blob, filename: string): Promise<string> => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Envio de comprovante indisponível no momento. Contate a organização.');
  }
  const formData = new FormData();
  formData.append('file', blob, filename);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  let res: Response;
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
      method: 'POST',
      body: formData,
    });
  } catch {
    throw new Error('Sem conexão para enviar o arquivo. Verifique sua internet e tente novamente.');
  }
  if (!res.ok) {
    throw new Error('Falha ao enviar o arquivo. Tente novamente em instantes.');
  }
  const data = await res.json();
  return data.secure_url as string;
};

// Reconhece um comprovante em PDF tanto no formato antigo (base64 salvo
// direto no banco) quanto no novo (URL do Cloudinary terminando em .pdf).
export const isPdfProof = (url?: string | null): boolean =>
  !!url && (url.startsWith('data:application/pdf') || /\.pdf(\?|#|$)/i.test(url));

// Deixa um logo consistente na exibição: se a imagem está no Cloudinary,
// insere transformações que APARAM a borda uniforme (branco/transparente) com
// e_trim e ajustam a altura — assim logos com moldura branca ou muito
// espaçamento passam a preencher o espaço igual aos demais, SEM re-enviar.
// URLs que não são do Cloudinary (base64 legado, assets do site) voltam iguais.
export const cloudinaryLogoUrl = (url?: string | null, height = 160): string => {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url || '';
  // e_trim: remove borda de cor uniforme · c_fit,h_: normaliza a altura
  return url.replace('/upload/', `/upload/e_trim/c_fit,h_${height}/`);
};

const canvasToPng = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Não foi possível processar o logo.'))), 'image/png'),
  );

// Prepara um LOGO já enquadrado para envio: detecta as bordas reais do logo
// (recorta o branco/transparente em volta), adiciona uma margem uniforme e
// padroniza o tamanho — tudo no navegador, antes de subir. Preserva
// transparência (exporta PNG). SVG (vetorial) passa direto.
export const prepareLogoFile = async (file: File): Promise<string> => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Envie um arquivo de imagem (PNG, JPG ou SVG).');
  }
  if (file.type === 'image/svg+xml') {
    if (file.size > MAX_PASSTHROUGH_BYTES) throw new Error('Arquivo muito grande.');
    return uploadToCloudinary(file, file.name);
  }

  const originalDataUrl = await readAsDataURL(file);
  let img: HTMLImageElement;
  try {
    img = await loadImage(originalDataUrl);
  } catch {
    if (file.size > MAX_PASSTHROUGH_BYTES) throw new Error('Imagem muito grande.');
    return uploadToCloudinary(file, file.name);
  }

  // 1) Desenha num canvas de tamanho controlado (limita a varredura de pixels)
  const MAX_DRAW = 1000;
  const s = Math.min(1, MAX_DRAW / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * s));
  const h = Math.max(1, Math.round(img.height * s));
  const src = document.createElement('canvas');
  src.width = w;
  src.height = h;
  const sctx = src.getContext('2d', { willReadFrequently: true });
  if (!sctx) return uploadToCloudinary(file, file.name);
  sctx.drawImage(img, 0, 0, w, h);

  // 2) Descobre o retângulo do conteúdo (bounding box), ignorando a borda de
  //    cor uniforme. O fundo é inferido pelos 4 cantos.
  let data: Uint8ClampedArray;
  try {
    data = sctx.getImageData(0, 0, w, h).data;
  } catch {
    const blob = await canvasToPng(src); // canvas "tainted" (raro): sobe sem recorte
    return uploadToCloudinary(blob, 'logo.png');
  }
  const at = (x: number, y: number) => (y * w + x) * 4;
  const corners = [at(0, 0), at(w - 1, 0), at(0, h - 1), at(w - 1, h - 1)];
  const transparentBg = corners.every((i) => data[i + 3] < 16);
  const bg = corners.reduce(
    (a, i) => [a[0] + data[i], a[1] + data[i + 1], a[2] + data[i + 2]],
    [0, 0, 0],
  ).map((v) => v / 4);
  const isContent = (i: number): boolean => {
    const a = data[i + 3];
    if (transparentBg) return a > 20;              // fundo transparente
    if (a < 20) return false;
    const dr = data[i] - bg[0], dg = data[i + 1] - bg[1], db = data[i + 2] - bg[2];
    return dr * dr + dg * dg + db * db > 900;       // difere do fundo (~30/canal)
  };

  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (isContent(at(x, y))) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  // Nada detectado (imagem "vazia"): sobe sem recorte
  if (maxX < minX || maxY < minY) {
    const blob = await canvasToPng(src);
    return uploadToCloudinary(blob, 'logo.png');
  }

  // 3) Recorte + margem uniforme (8% do maior lado do conteúdo)
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  const pad = Math.round(Math.max(cw, ch) * 0.08);
  const ox = Math.max(0, minX - pad), oy = Math.max(0, minY - pad);
  const ex = Math.min(w - 1, maxX + pad), ey = Math.min(h - 1, maxY + pad);
  const rw = ex - ox + 1, rh = ey - oy + 1;

  // 4) Canvas final padronizado (maior lado até 320px), preservando aspecto
  const TARGET = 320;
  const fs = Math.min(1, TARGET / Math.max(rw, rh));
  const ow = Math.max(1, Math.round(rw * fs));
  const oh = Math.max(1, Math.round(rh * fs));
  const out = document.createElement('canvas');
  out.width = ow;
  out.height = oh;
  const octx = out.getContext('2d');
  if (!octx) {
    const blob = await canvasToPng(src);
    return uploadToCloudinary(blob, 'logo.png');
  }
  // Fundo opaco (ex.: logo em fundo branco) mantém o branco; transparente fica transparente
  if (!transparentBg) {
    octx.fillStyle = `rgb(${bg[0] | 0}, ${bg[1] | 0}, ${bg[2] | 0})`;
    octx.fillRect(0, 0, ow, oh);
  }
  octx.drawImage(src, ox, oy, rw, rh, 0, 0, ow, oh);
  const blob = await canvasToPng(out);
  return uploadToCloudinary(blob, 'logo.png');
};

// Migra um valor antigo (base64 salvo direto no banco) para o Cloudinary,
// devolvendo a URL. Se já for URL (ou estiver vazio), devolve como está —
// seguro de chamar de novo em cima de algo já migrado.
export const migrateBase64ToCloudinary = async (value?: string | null): Promise<string | null> => {
  if (!value || !value.startsWith('data:')) return value ?? null;
  const blob = await (await fetch(value)).blob();
  const filename = blob.type === 'application/pdf' ? 'migrado.pdf' : 'migrado.jpg';
  return uploadToCloudinary(blob, filename);
};

const readAsDataURL = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.readAsDataURL(file);
  });

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Arquivo de imagem inválido.'));
    img.src = src;
  });

// Comprime (se for imagem) e envia ao Cloudinary; retorna a URL pública salva no banco.
export const prepareProofFile = async (file: File): Promise<string> => {
  const isImage = file.type.startsWith('image/');

  if (!isImage) {
    if (file.size > MAX_PASSTHROUGH_BYTES) {
      throw new Error('Arquivo muito grande (máx. 4 MB). Envie uma foto do comprovante ou um PDF menor.');
    }
    return uploadToCloudinary(file, file.name);
  }

  // Imagem: desenha num canvas reduzido e reexporta como JPEG comprimido antes de enviar
  const originalDataUrl = await readAsDataURL(file);
  let img: HTMLImageElement;
  try {
    img = await loadImage(originalDataUrl);
  } catch {
    // Se não conseguir decodificar (formato exótico), envia o arquivo original
    if (file.size > MAX_PASSTHROUGH_BYTES) {
      throw new Error('Imagem muito grande. Tente novamente com uma foto menor.');
    }
    return uploadToCloudinary(file, file.name);
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const targetW = Math.max(1, Math.round(img.width * scale));
  const targetH = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // Sem canvas disponível: envia o arquivo original se couber
    if (file.size > MAX_PASSTHROUGH_BYTES) {
      throw new Error('Não foi possível processar a imagem neste dispositivo.');
    }
    return uploadToCloudinary(file, file.name);
  }
  // Fundo branco para JPEGs a partir de PNGs com transparência
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const compressedBlob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Não foi possível comprimir a imagem.')),
      'image/jpeg',
      JPEG_QUALITY
    );
  });

  return uploadToCloudinary(compressedBlob, 'comprovante.jpg');
};
