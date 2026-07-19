export interface ImageCheckResult {
  fileName: string;
  fileSize: number;
  fileType: string;
  status: 'healthy' | 'corrupted';
  errorReason?: string;
  dimensions?: { width: number; height: number };
  fileRef: File; // Referência ao arquivo para visualizações futuras no modal
}

function readBytesSlice(file: File, start: number, end: number): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    const slice = file.slice(start, end);
    reader.readAsArrayBuffer(slice);
  });
}

function readAsTextSlice(file: File, start: number, end: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    const slice = file.slice(start, end);
    reader.readAsText(slice);
  });
}

async function checkMagicBytes(file: File): Promise<{ isValid: boolean; detectedType?: string; errorReason?: string }> {
  try {
    // Ler os primeiros 12 bytes
    const headerBuffer = await readBytesSlice(file, 0, 12);
    const headerArr = new Uint8Array(headerBuffer);

    // Converter para hexadecimal para facilitar comparação de cabeçalhos longos
    const toHex = (arr: Uint8Array) => Array.from(arr).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    const headerHex = toHex(headerArr);

    // E os últimos 2 bytes (para verificar fim do JPEG)
    let footerArr: Uint8Array | null = null;
    if (file.size > 2) {
      const footerBuffer = await readBytesSlice(file, file.size - 2, file.size);
      footerArr = new Uint8Array(footerBuffer);
    }

    // 1. JPEG: FF D8 (Start of Image)
    if (headerArr[0] === 0xFF && headerArr[1] === 0xD8) {
      // Opcional: checar se termina com FF D9 (End of Image)
      // Se não terminar, pode estar corrompida ou truncada
      if (footerArr && (footerArr[0] !== 0xFF || footerArr[1] !== 0xD9)) {
        return { isValid: false, detectedType: 'JPEG', errorReason: 'Imagem JPEG truncada (marcador final FF D9 ausente)' };
      }
      return { isValid: true, detectedType: 'JPEG' };
    }

    // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
    if (headerHex.startsWith('89 50 4E 47 0D 0A 1A 0A')) {
      return { isValid: true, detectedType: 'PNG' };
    }

    // 3. GIF: GIF87a (47 49 46 38 37 61) ou GIF89a (47 49 46 38 39 61)
    if (headerHex.startsWith('47 49 46 38 37 61') || headerHex.startsWith('47 49 46 38 39 61')) {
      return { isValid: true, detectedType: 'GIF' };
    }

    // 4. WebP: RIFF (52 49 46 46) nos bytes 0-3 e WEBP (57 45 42 50) nos bytes 8-11
    const isWebP = headerArr[0] === 0x52 && headerArr[1] === 0x49 && headerArr[2] === 0x46 && headerArr[3] === 0x46 &&
                   headerArr[8] === 0x57 && headerArr[9] === 0x45 && headerArr[10] === 0x42 && headerArr[11] === 0x50;
    if (isWebP) {
      return { isValid: true, detectedType: 'WEBP' };
    }

    // 5. SVG: checar se possui conteúdo XML com a tag <svg>
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      const textSlice = await readAsTextSlice(file, 0, Math.min(file.size, 1000));
      if (textSlice.toLowerCase().includes('<svg')) {
        return { isValid: true, detectedType: 'SVG' };
      }
      return { isValid: false, detectedType: 'SVG', errorReason: 'Arquivo SVG inválido (tag <svg> não encontrada)' };
    }

    // 6. BMP: 42 4D (BM)
    if (headerArr[0] === 0x42 && headerArr[1] === 0x4D) {
      return { isValid: true, detectedType: 'BMP' };
    }

    return { isValid: false, errorReason: 'Assinatura mágica desconhecida ou formato não suportado' };
  } catch (err) {
    return { isValid: false, errorReason: 'Erro ao ler os cabeçalhos do arquivo: ' + (err as Error).message };
  }
}

export function checkImageLoading(file: File): Promise<{ isValid: boolean; errorReason?: string; dimensions?: { width: number; height: number } }> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      if (img.naturalWidth === 0 || img.naturalHeight === 0) {
        URL.revokeObjectURL(objectUrl);
        resolve({ isValid: false, errorReason: 'Dimensões de imagem inválidas (0x0)' });
        return;
      }

      // Validar renderização via Canvas para capturar corrupções parciais
      try {
        const canvas = document.createElement('canvas');
        const maxCanvasSize = 2048;
        let width = img.naturalWidth;
        let height = img.naturalHeight;
        
        if (width > maxCanvasSize || height > maxCanvasSize) {
          const ratio = Math.min(maxCanvasSize / width, maxCanvasSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          resolve({ isValid: true, dimensions: { width: img.naturalWidth, height: img.naturalHeight } });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(objectUrl);
        resolve({ isValid: true, dimensions: { width: img.naturalWidth, height: img.naturalHeight } });
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        resolve({ isValid: false, errorReason: 'Falha na renderização de Canvas (imagem corrompida): ' + (err as Error).message });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ isValid: false, errorReason: 'Navegador falhou em decodificar a imagem' });
    };

    img.src = objectUrl;
  });
}

export async function checkImageFile(file: File): Promise<ImageCheckResult> {
  const result: ImageCheckResult = {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type || 'unknown',
    status: 'healthy',
    fileRef: file,
  };

  if (file.size < 4) {
    result.status = 'corrupted';
    result.errorReason = 'Arquivo vazio ou muito pequeno para ser uma imagem';
    return result;
  }

  try {
    // 1. Validar Magic Bytes
    const magicCheck = await checkMagicBytes(file);
    if (magicCheck.detectedType) {
      result.fileType = magicCheck.detectedType;
    }

    if (!magicCheck.isValid) {
      result.status = 'corrupted';
      result.errorReason = magicCheck.errorReason || 'Assinatura binária de arquivo corrompida';
      return result;
    }

    // 2. Validar carregamento no DOM + Renderização Canvas
    const loadCheck = await checkImageLoading(file);
    if (!loadCheck.isValid) {
      result.status = 'corrupted';
      result.errorReason = loadCheck.errorReason || 'Falha de renderização ou decodificação';
      return result;
    }

    result.dimensions = loadCheck.dimensions;
  } catch (err) {
    result.status = 'corrupted';
    result.errorReason = 'Erro geral na análise: ' + (err as Error).message;
  }

  return result;
}

export interface MissingSequenceResult {
  pattern: string;
  min: number;
  max: number;
  missingFiles: string[];
}

export function detectMissingSequences(fileNames: string[]): MissingSequenceResult[] {
  const groups: Record<string, { num: number; rawNumStr: string; name: string }[]> = {};
  
  // Regex para capturar o padrão do nome do arquivo com número sequencial
  const regex = /^(.*?)(0*\d+)([^0-9]*\.[a-zA-Z0-9]+)$/;

  for (const name of fileNames) {
    const match = name.match(regex);
    if (match) {
      const prefix = match[1];
      const numStr = match[2];
      const suffix = match[3];
      const num = parseInt(numStr, 10);
      
      const key = `${prefix}{NUM}${suffix}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push({ num, rawNumStr: numStr, name });
    }
  }

  const results: MissingSequenceResult[] = [];

  for (const [key, items] of Object.entries(groups)) {
    if (items.length < 2) continue;

    items.sort((a, b) => a.num - b.num);

    const min = items[0].num;
    const max = items[items.length - 1].num;
    
    const existingNums = new Set(items.map(item => item.num));
    const missingFiles: string[] = [];
    const paddingLength = items[0].rawNumStr.length;
    const displayPattern = key.replace('{NUM}', '*');

    for (let i = min; i <= max; i++) {
      if (!existingNums.has(i)) {
        const paddedNum = String(i).padStart(paddingLength, '0');
        const originalKeyFormat = key.replace('{NUM}', paddedNum);
        missingFiles.push(originalKeyFormat);
      }
    }

    if (missingFiles.length > 0) {
      results.push({
        pattern: displayPattern,
        min,
        max,
        missingFiles
      });
    }
  }

  return results;
}
