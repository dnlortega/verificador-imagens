export interface ImageCheckResult {
  fileName: string;
  fileSize: number;
  fileType: string;
  status: 'healthy' | 'corrupted';
  errorReason?: string;
  dimensions?: { width: number; height: number };
  durationMs: number; // Tempo de execução da análise
  fileRef: File; // Referência ao arquivo para preview
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
    const headerBuffer = await readBytesSlice(file, 0, 12);
    const headerArr = new Uint8Array(headerBuffer);

    // Converter para hexadecimal para facilitar comparação
    const toHex = (arr: Uint8Array) => Array.from(arr).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    const headerHex = toHex(headerArr);

    let footerArr: Uint8Array | null = null;
    if (file.size > 2) {
      const footerBuffer = await readBytesSlice(file, file.size - 2, file.size);
      footerArr = new Uint8Array(footerBuffer);
    }

    // --- DETECÇÃO DE FORMATOS NÃO-IMAGEM (SPOOFING / RENOMEAÇÕES MALICIOSAS) ---
    // 1. PDF: %PDF (25 50 44 46)
    if (headerHex.startsWith('25 50 44 46')) {
      return { isValid: false, detectedType: 'PDF', errorReason: 'O arquivo é na verdade um documento PDF (.pdf) renomeado' };
    }
    // 2. ZIP / Office moderno: PK (50 4B 03 04)
    if (headerHex.startsWith('50 4B 03 04')) {
      return { isValid: false, detectedType: 'ZIP/Office', errorReason: 'O arquivo é um arquivo compactado (.zip) ou documento de escritório (.docx/.xlsx) renomeado' };
    }
    // 3. EXE / DLL: MZ (4D 5A)
    if (headerHex.startsWith('4D 5A')) {
      return { isValid: false, detectedType: 'EXECUTÁVEL', errorReason: 'O arquivo é um programa executável (.exe/.dll) perigoso renomeado' };
    }
    // 4. RAR: Rar! (52 61 72 21 1A 07)
    if (headerHex.startsWith('52 61 72 21 1A 07')) {
      return { isValid: false, detectedType: 'RAR', errorReason: 'O arquivo é um arquivo compactado RAR (.rar) renomeado' };
    }

    // --- VALIDAÇÃO DE FORMATOS DE IMAGEM SUPORTADOS ---
    // 1. JPEG: FF D8 (Start of Image)
    if (headerArr[0] === 0xFF && headerArr[1] === 0xD8) {
      // Checar marcador final FF D9 (End of Image)
      if (footerArr && (footerArr[0] !== 0xFF || footerArr[1] !== 0xD9)) {
        return { isValid: false, detectedType: 'JPEG', errorReason: 'Estrutura JPEG incompleta: arquivo truncado ou cortado no meio (falta o marcador FF D9)' };
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

    // 4. WebP: RIFF (52 49 46 46) e WEBP (57 45 42 50)
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
      return { isValid: false, detectedType: 'SVG', errorReason: 'Arquivo XML/SVG malformado: tag de inicialização <svg> não encontrada' };
    }

    // 6. BMP: 42 4D (BM)
    if (headerArr[0] === 0x42 && headerArr[1] === 0x4D) {
      return { isValid: true, detectedType: 'BMP' };
    }

    return { isValid: false, errorReason: `Assinatura binária desconhecida (${headerHex.slice(0, 11)}...). Provavelmente não é uma imagem.` };
  } catch (err) {
    return { isValid: false, errorReason: 'Falha crítica ao ler a estrutura binária: ' + (err as Error).message };
  }
}

function checkCanvasPixelsForTruncation(img: HTMLImageElement): boolean {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    ctx.drawImage(img, 0, 0);

    // Amostra 1: Linha de pixels horizontal a 95% da altura
    const sampleHeight1 = Math.floor(img.naturalHeight * 0.95);
    // Amostra 2: Linha de pixels final (altura - 1)
    const sampleHeight2 = img.naturalHeight - 1;

    const getLineInfo = (y: number): { isUniform: boolean; r: number; g: number; b: number; a: number } => {
      if (y <= 0 || y >= img.naturalHeight) return { isUniform: false, r: 0, g: 0, b: 0, a: 0 };
      const imageData = ctx.getImageData(0, y, img.naturalWidth, 1);
      const data = imageData.data;

      const r = data[0];
      const g = data[1];
      const b = data[2];
      const a = data[3];

      for (let i = 4; i < data.length; i += 4) {
        if (data[i] !== r || data[i+1] !== g || data[i+2] !== b || data[i+3] !== a) {
          return { isUniform: false, r, g, b, a };
        }
      }
      return { isUniform: true, r, g, b, a };
    };

    const isFailureColor = (r: number, g: number, b: number, a: number): boolean => {
      const isGray = (r >= 120 && r <= 136) && (g >= 120 && g <= 136) && (b >= 120 && b <= 136);
      const isBlack = r === 0 && g === 0 && b === 0;
      const isTransparent = a === 0;
      return isGray || isBlack || isTransparent;
    };

    const line1 = getLineInfo(sampleHeight1);
    const line2 = getLineInfo(sampleHeight2);

    // Se uma das linhas de baixo for uniforme com a cor de falha
    if ((line1.isUniform && isFailureColor(line1.r, line1.g, line1.b, line1.a)) || 
        (line2.isUniform && isFailureColor(line2.r, line2.g, line2.b, line2.a))) {
      
      // Checamos a linha de cima (ex: a 10% da altura)
      const sampleTop = Math.floor(img.naturalHeight * 0.1);
      const topInfo = getLineInfo(sampleTop);
      
      // Se a linha de cima também for uniforme e tiver EXATAMENTE a mesma cor de falha da linha de baixo,
      // assumimos que é uma imagem sólida saudável de uma cor só (legítima).
      // Caso contrário, é um truncamento/corrupção!
      const targetColor = line2.isUniform ? line2 : line1;
      if (topInfo.isUniform && 
          topInfo.r === targetColor.r && 
          topInfo.g === targetColor.g && 
          topInfo.b === targetColor.b && 
          topInfo.a === targetColor.a) {
        return false; // Saudável
      }

      return true; // Corrompido
    }
  } catch (e) {
    console.error('Falha na análise de pixels para truncamento:', e);
  }
  return false;
}

// Otimização ágil com decodificação de imagem assíncrona nativa
export function checkImageLoading(file: File): Promise<{ isValid: boolean; errorReason?: string; dimensions?: { width: number; height: number } }> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      if (img.naturalWidth === 0 || img.naturalHeight === 0) {
        URL.revokeObjectURL(objectUrl);
        resolve({ isValid: false, errorReason: 'Cabeçalho lido, mas dimensões físicas da imagem são inválidas (0x0px)' });
        return;
      }

      // img.decode() faz a decodificação da imagem nativamente em segundo plano sem usar canvas físico!
      img.decode()
        .then(() => {
          // Validação avançada de pixels na parte inferior para pegar imagens cortadas
          const isTruncated = checkCanvasPixelsForTruncation(img);
          URL.revokeObjectURL(objectUrl);
          
          if (isTruncated) {
            resolve({
              isValid: false,
              errorReason: 'Imagem incompleta/truncada: detectado preenchimento cinza sólido ou pixels inválidos na metade inferior'
            });
          } else {
            resolve({ 
              isValid: true, 
              dimensions: { width: img.naturalWidth, height: img.naturalHeight } 
            });
          }
        })
        .catch((err) => {
          URL.revokeObjectURL(objectUrl);
          resolve({ 
            isValid: false, 
            errorReason: `Falha na decodificação de pixels (dados internos corrompidos): ${err.message || 'Dados inválidos'}` 
          });
        });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ isValid: false, errorReason: 'O decodificador do navegador rejeitou o arquivo (dados corrompidos ou extensão mentirosa)' });
    };

    img.src = objectUrl;
  });
}

export async function checkImageFile(file: File): Promise<ImageCheckResult> {
  const startTime = performance.now();
  
  const result: ImageCheckResult = {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type || 'unknown',
    status: 'healthy',
    durationMs: 0,
    fileRef: file,
  };

  if (file.size < 4) {
    result.status = 'corrupted';
    result.errorReason = 'Arquivo vazio ou menor do que 4 bytes (inviável para imagem)';
    result.durationMs = Math.round(performance.now() - startTime);
    return result;
  }

  try {
    // 1. Validar assinatura binária do arquivo (Magic Bytes)
    const magicCheck = await checkMagicBytes(file);
    if (magicCheck.detectedType) {
      result.fileType = magicCheck.detectedType;
    }

    if (!magicCheck.isValid) {
      result.status = 'corrupted';
      result.errorReason = magicCheck.errorReason || 'Assinatura binária de arquivo inválida';
      result.durationMs = Math.round(performance.now() - startTime);
      return result;
    }

    // 2. Validar carregamento no DOM + Decodificação assíncrona
    const loadCheck = await checkImageLoading(file);
    if (!loadCheck.isValid) {
      result.status = 'corrupted';
      result.errorReason = loadCheck.errorReason || 'Falha de renderização ou decodificação';
      result.durationMs = Math.round(performance.now() - startTime);
      return result;
    }

    result.dimensions = loadCheck.dimensions;
  } catch (err) {
    result.status = 'corrupted';
    result.errorReason = 'Exceção geral de processamento: ' + (err as Error).message;
  }

  result.durationMs = parseFloat((performance.now() - startTime).toFixed(1));
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

export async function repairJpegBytes(file: File): Promise<Blob> {
  const originalBuffer = await file.arrayBuffer();
  const originalArr = new Uint8Array(originalBuffer);
  
  // Criar novo array com tamanho original + 2 bytes para injetar FF D9
  const repairedArr = new Uint8Array(originalArr.length + 2);
  repairedArr.set(originalArr);
  repairedArr[originalArr.length] = 0xFF;
  repairedArr[originalArr.length + 1] = 0xD9;

  return new Blob([repairedArr], { type: 'image/jpeg' });
}

async function detectHealthyHeight(img: HTMLImageElement): Promise<number> {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return img.naturalHeight;

  ctx.drawImage(img, 0, 0);

  const width = img.naturalWidth;
  const height = img.naturalHeight;
  
  // Vamos ler a metade inferior (a partir dos 40% da altura) de uma vez
  const startY = Math.floor(height * 0.4);
  const scanHeight = height - startY;
  if (scanHeight <= 0) return height;

  let imageData;
  try {
    imageData = ctx.getImageData(0, startY, width, scanHeight);
  } catch (e) {
    console.error('Falha de segurança/CORS no getImageData de reparo:', e);
    return height;
  }
  
  const data = imageData.data;
  const rowBytes = width * 4;
  let healthyRowIndex = scanHeight - 1;

  // Lemos as linhas de baixo para cima
  for (let r = scanHeight - 1; r >= 0; r--) {
    const rowStart = r * rowBytes;
    const firstR = data[rowStart];
    const firstG = data[rowStart + 1];
    const firstB = data[rowStart + 2];
    const firstA = data[rowStart + 3];

    let isUniform = true;
    for (let c = 1; c < width; c++) {
      const pixelStart = rowStart + c * 4;
      if (
        data[pixelStart] !== firstR ||
        data[pixelStart + 1] !== firstG ||
        data[pixelStart + 2] !== firstB ||
        data[pixelStart + 3] !== firstA
      ) {
        isUniform = false;
        break;
      }
    }

    if (isUniform) {
      const isGray = (firstR >= 120 && firstR <= 136) && (firstG >= 120 && firstG <= 136) && (firstB >= 120 && firstB <= 136);
      const isBlack = firstR === 0 && firstG === 0 && firstB === 0;
      const isTransparent = firstA === 0;

      if (isGray || isBlack || isTransparent) {
        continue; // Linha corrompida detectada, continua subindo
      }
    }

    // Encontramos pixels de foto válidos (ruído/variação de cor)
    healthyRowIndex = r;
    break;
  }

  const healthyHeight = startY + healthyRowIndex + 1;
  return Math.max(10, Math.min(healthyHeight, height));
}

export function repairImageViaCanvas(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = async () => {
      try {
        const healthyHeight = await detectHealthyHeight(img);
        
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = healthyHeight; // Corta a barra cinza inferior
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Não foi possível obter contexto de rasterização 2D.'));
          return;
        }

        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(objectUrl);
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Falha ao exportar pixels rasterizados do canvas.'));
          }
        }, 'image/png');
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Decodificador gráfico rejeitou totalmente o arquivo de imagem.'));
    };

    img.src = objectUrl;
  });
}
