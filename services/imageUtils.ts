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
