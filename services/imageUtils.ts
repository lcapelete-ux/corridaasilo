// Prepara um arquivo (foto/print/PDF) para ser salvo como comprovante.
//
// Fotos de celular chegam com vários MB. Guardar isso como base64 numa coluna
// de texto e mandar pela RPC do Supabase é lento e, acima de certo tamanho,
// falha ("o comprovante não vai"). Por isso, imagens são redimensionadas e
// recomprimidas no próprio navegador antes do envio; PDFs e outros arquivos
// passam direto (mas com um teto de tamanho para não estourar).

const MAX_DIMENSION = 1600;   // maior lado da imagem, em pixels
const JPEG_QUALITY = 0.72;
const MAX_PASSTHROUGH_BYTES = 4 * 1024 * 1024; // 4 MB para arquivos não-imagem (ex.: PDF)

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

/**
 * Retorna um data URL pronto para salvar. Imagens são redimensionadas/
 * comprimidas; PDFs e afins passam direto (respeitando o teto de tamanho).
 */
export const prepareProofFile = async (file: File): Promise<string> => {
  const isImage = file.type.startsWith('image/');

  if (!isImage) {
    if (file.size > MAX_PASSTHROUGH_BYTES) {
      throw new Error('Arquivo muito grande (máx. 4 MB). Envie uma foto do comprovante ou um PDF menor.');
    }
    return readAsDataURL(file);
  }

  // Imagem: desenha num canvas reduzido e exporta como JPEG comprimido
  const originalDataUrl = await readAsDataURL(file);
  let img: HTMLImageElement;
  try {
    img = await loadImage(originalDataUrl);
  } catch {
    // Se não conseguir decodificar (formato exótico), tenta enviar o original
    if (file.size > MAX_PASSTHROUGH_BYTES) {
      throw new Error('Imagem muito grande. Tente novamente com uma foto menor.');
    }
    return originalDataUrl;
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const targetW = Math.max(1, Math.round(img.width * scale));
  const targetH = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    // Sem canvas disponível: cai para o original se couber
    if (file.size > MAX_PASSTHROUGH_BYTES) {
      throw new Error('Não foi possível processar a imagem neste dispositivo.');
    }
    return originalDataUrl;
  }
  // Fundo branco para JPEGs a partir de PNGs com transparência
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(img, 0, 0, targetW, targetH);

  const compressed = canvas.toDataURL('image/jpeg', JPEG_QUALITY);

  // Se por algum motivo o "comprimido" ficou maior que o original pequeno,
  // usa o menor dos dois.
  return compressed.length < originalDataUrl.length ? compressed : originalDataUrl;
};
