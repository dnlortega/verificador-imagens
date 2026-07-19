'use client';

import React, { useState, useRef, useEffect } from 'react';
import { UploadZone } from '@/components/upload-zone';
import { StatsCards } from '@/components/stats-cards';
import { ImageList } from '@/components/image-list';
import { ImageDetailModal } from '@/components/image-detail-modal';
import { checkImageFile, ImageCheckResult, detectMissingSequences, MissingSequenceResult } from '@/lib/image-checker';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Trash2, 
  AlertTriangle, 
  Clock, 
  Cpu, 
  Sparkles 
} from 'lucide-react';
import { toast } from 'sonner';

export function Dashboard() {
  const [results, setResults] = useState<ImageCheckResult[]>([]);
  const [missingSequences, setMissingSequences] = useState<MissingSequenceResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFileChecking, setCurrentFileChecking] = useState('');
  
  // Estatísticas de performance
  const [processedCount, setProcessedCount] = useState(0);
  const [healthyCount, setHealthyCount] = useState(0);
  const [corruptedCount, setCorruptedCount] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [eta, setEta] = useState(0);

  // Controle de cancelamento
  const cancelRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);

  // Modal de Detalhes
  const [selectedResult, setSelectedResult] = useState<ImageCheckResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleFilesSelected = async (files: File[]) => {
    setIsProcessing(true);
    cancelRef.current = false;
    setTotalFiles(files.length);
    setProcessedCount(0);
    setHealthyCount(0);
    setCorruptedCount(0);
    setProgress(0);
    setResults([]);
    setMissingSequences([]);
    
    startTimeRef.current = Date.now();
    toast.success(`Iniciando análise de ${files.length} imagens...`);

    // Fila de processamento com concorrência limite (ex: 6 arquivos por vez)
    const CONCURRENCY_LIMIT = 6;
    const resultsBuffer: ImageCheckResult[] = [];
    let activeWorkers = 0;
    let nextIndex = 0;
    
    // Contadores locais para atualizar o estado de forma agregada e suave
    let localProcessed = 0;
    let localHealthy = 0;
    let localCorrupted = 0;

    const processNext = async (): Promise<void> => {
      if (cancelRef.current || nextIndex >= files.length) {
        return;
      }

      const currentIndex = nextIndex++;
      const file = files[currentIndex];
      activeWorkers++;
      setCurrentFileChecking(file.name);

      try {
        const result = await checkImageFile(file);
        resultsBuffer.push(result);
        
        localProcessed++;
        if (result.status === 'healthy') {
          localHealthy++;
        } else {
          localCorrupted++;
        }

        // Atualizar estatísticas em tempo real de forma eficiente
        if (localProcessed % 1 === 0 || localProcessed === files.length) {
          // Atualizar estados
          setProcessedCount(localProcessed);
          setHealthyCount(localHealthy);
          setCorruptedCount(localCorrupted);
          setProgress(Math.round((localProcessed / files.length) * 100));

          // Calcular performance (velocidade e ETA)
          if (startTimeRef.current) {
            const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
            const currentSpeed = elapsedSeconds > 0 ? localProcessed / elapsedSeconds : 0;
            setSpeed(currentSpeed);
            
            const remainingFiles = files.length - localProcessed;
            const currentEta = currentSpeed > 0 ? remainingFiles / currentSpeed : 0;
            setEta(currentEta);
          }
        }
      } catch (err) {
        console.error('Erro ao processar arquivo:', file.name, err);
      } finally {
        activeWorkers--;
        // Se ainda houver arquivos e não foi cancelado, puxa o próximo
        if (nextIndex < files.length && !cancelRef.current) {
          await processNext();
        }
      }
    };

    // Inicializar os workers
    const initialWorkers: Promise<void>[] = [];
    const limit = Math.min(CONCURRENCY_LIMIT, files.length);
    for (let i = 0; i < limit; i++) {
      initialWorkers.push(processNext());
    }

    await Promise.all(initialWorkers);

    setIsProcessing(false);
    setCurrentFileChecking('');
    setResults([...resultsBuffer]);

    // Detectar imagens ausentes na ordem numérica dos arquivos
    const fileNames = files.map(f => f.name);
    const missing = detectMissingSequences(fileNames);
    setMissingSequences(missing);

    if (cancelRef.current) {
      toast.warning('A análise foi cancelada pelo usuário.');
    } else {
      toast.success(`Análise concluída! ${localHealthy} saudáveis, ${localCorrupted} corrompidas.`);
    }
  };

  const handleCancel = () => {
    cancelRef.current = true;
    setIsProcessing(false);
  };

  const handleClear = () => {
    setResults([]);
    setMissingSequences([]);
    setTotalFiles(0);
    setProcessedCount(0);
    setHealthyCount(0);
    setCorruptedCount(0);
    setProgress(0);
    setSpeed(0);
    setEta(0);
    toast.info('Dados resetados com sucesso.');
  };

  const handleSelectResult = (result: ImageCheckResult) => {
    setSelectedResult(result);
    setIsModalOpen(true);
  };

  const handleExport = (format: 'csv' | 'json') => {
    if (results.length === 0) return;

    let content = '';
    let mimeType = 'text/plain';
    let filename = `relatorio-verificacao-${Date.now()}`;

    if (format === 'json') {
      const exportData = results.map(({ fileName, fileSize, fileType, status, errorReason, dimensions }) => ({
        fileName,
        fileSize,
        fileType,
        status,
        errorReason: errorReason || null,
        dimensions: dimensions ? `${dimensions.width}x${dimensions.height}` : null
      }));
      content = JSON.stringify(exportData, null, 2);
      mimeType = 'application/json';
      filename += '.json';
    } else if (format === 'csv') {
      const headers = ['Nome', 'Tamanho (Bytes)', 'Formato', 'Status', 'Motivo do Erro', 'Dimensões'];
      const rows = results.map(item => [
        `"${item.fileName.replace(/"/g, '""')}"`,
        item.fileSize,
        item.fileType,
        item.status === 'healthy' ? 'Saudavel' : 'Corrompido',
        `"${(item.errorReason || '').replace(/"/g, '""')}"`,
        item.dimensions ? `"${item.dimensions.width}x${item.dimensions.height}"` : ''
      ]);
      
      content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      mimeType = 'text/csv;charset=utf-8;';
      filename += '.csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Relatório exportado em ${format.toUpperCase()}!`);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 py-8">
      {/* Cabeçalho do App */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-indigo-500 to-purple-600 bg-clip-text text-transparent">
              PixelArmor
            </h1>
            <Badge variant="outline" className="rounded-full gap-1 border-primary/20 bg-primary/5 text-primary text-[10px] px-2 py-0.5">
              <Sparkles className="h-3 w-3" />
              100% Shadcn & Local
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Validador de imagens ultrarrápido com análise de assinaturas binárias (Magic Bytes) e renderização gráfica no Canvas.
          </p>
        </div>
        
        {results.length > 0 && !isProcessing && (
          <Button
            variant="destructive"
            onClick={handleClear}
            className="rounded-xl flex gap-2 font-medium text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-0"
          >
            <Trash2 className="h-4 w-4" />
            Limpar Resultados
          </Button>
        )}
      </div>

      {/* Upload Zone */}
      <UploadZone onFilesSelected={handleFilesSelected} isProcessing={isProcessing} />

      {/* Progress & Cancel Panel */}
      {isProcessing && (
        <Card className="border border-primary/10 bg-primary/5/20 backdrop-blur-md overflow-hidden relative">
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
              <div className="space-y-1">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-primary animate-spin" />
                  Verificando imagem: <span className="text-primary truncate max-w-[250px] inline-block align-bottom">{currentFileChecking}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Processando {processedCount} de {totalFiles} imagens...
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="rounded-xl font-bold border-rose-500/30 text-rose-500 hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
              >
                Parar Verificação
              </Button>
            </div>

            <div className="space-y-2">
              <Progress value={progress} className="h-2.5 rounded-full" />
              <div className="flex justify-between text-xs text-muted-foreground font-medium">
                <span className="flex items-center gap-1">
                  <Play className="h-3 w-3" />
                  Progresso: {progress}%
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Velocidade: {speed.toFixed(1)} imagens/s
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Dashboard */}
      {(totalFiles > 0 || results.length > 0) && (
        <div className="space-y-6">
          <StatsCards
            total={totalFiles}
            processed={processedCount}
            healthy={healthyCount}
            corrupted={corruptedCount}
            speed={speed}
            eta={eta}
          />

          {/* Alerta de imagens ausentes na sequência */}
          {missingSequences.length > 0 && (
            <Card className="border border-amber-500/25 bg-amber-500/5 dark:bg-amber-950/10 backdrop-blur-md rounded-2xl">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-5 w-5 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-amber-800 dark:text-amber-400">
                      Imagens Ausentes na Sequência Numérica
                    </h3>
                    <p className="text-xs text-amber-700/80 dark:text-amber-500/80 leading-relaxed">
                      Detectamos que os arquivos possuem sequências numéricas e que algumas imagens estão faltando na ordem.
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  {missingSequences.map((seq, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-amber-500/10 bg-amber-500/5/30 space-y-2.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-amber-800 dark:text-amber-300">
                          Padrão: <code className="bg-amber-500/10 px-1.5 py-0.5 rounded font-mono font-bold">{seq.pattern}</code>
                        </span>
                        <span className="text-amber-700/80 dark:text-amber-400/80">
                          Intervalo: <strong className="font-bold">{seq.min}</strong> a <strong className="font-bold">{seq.max}</strong>
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {seq.missingFiles.map((file, fileIdx) => (
                          <Badge 
                            key={fileIdx} 
                            variant="outline" 
                            className="border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-400 text-xs py-0.5 px-2 font-medium rounded-lg"
                          >
                            {file}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resultados Detalhados */}
          {results.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pl-1">
                <h2 className="text-lg font-bold tracking-tight">Relatório de Análise</h2>
                {corruptedCount > 0 && (
                  <Badge variant="outline" className="rounded-full gap-1 border-rose-500/25 bg-rose-500/5 text-rose-600 dark:text-rose-400 font-semibold text-[10px] px-2.5 py-0.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {corruptedCount} falhas detectadas
                  </Badge>
                )}
              </div>
              <ImageList
                results={results}
                onSelectResult={handleSelectResult}
                onExport={handleExport}
              />
            </div>
          )}
        </div>
      )}

      {/* Modal de Detalhes da Imagem */}
      <ImageDetailModal
        result={selectedResult}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
