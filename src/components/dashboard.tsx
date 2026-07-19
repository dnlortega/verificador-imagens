'use client';

import React, { useState, useRef, useEffect } from 'react';
import { UploadZone } from '@/components/upload-zone';
import { StatsCards } from '@/components/stats-cards';
import { ImageList } from '@/components/image-list';
import { ImageDetailModal } from '@/components/image-detail-modal';
import { checkMediaFile, ImageCheckResult, detectMissingSequences, MissingSequenceResult } from '@/lib/image-checker';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { ThemeToggle } from '@/components/theme-toggle';
import { 
  Play, 
  Trash2, 
  AlertTriangle, 
  Clock, 
  Cpu, 
  Sparkles,
  Settings2,
  History,
  Copy,
  ChevronDown,
  ChevronUp,
  FileImage,
  AlertOctagon,
  Calendar,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface HistoryEntry {
  id: string;
  date: string;
  total: number;
  healthy: number;
  corrupted: number;
}

function LivePreviewItem({ item }: { item: ImageCheckResult }) {
  const [src, setSrc] = useState<string>('');

  useEffect(() => {
    if (item.status === 'healthy') {
      try {
        const url = URL.createObjectURL(item.fileRef);
        setSrc(url);
        return () => URL.revokeObjectURL(url);
      } catch (e) {
        console.error('Falha ao criar ObjectURL de LivePreview:', e);
      }
    }
  }, [item]);

  const isHealthy = item.status === 'healthy';

  return (
    <div 
      className={`aspect-square rounded-2xl border overflow-hidden flex items-center justify-center relative animate-in zoom-in-75 duration-500 transition-all shadow-sm group
        ${isHealthy ? 'border-emerald-500/20 bg-emerald-500/5 hover:shadow-emerald-500/20 hover:-translate-y-1' : 'border-rose-500/35 bg-rose-500/10 hover:shadow-rose-500/20 hover:-translate-y-1'}
      `}
      title={`${item.fileName} (${isHealthy ? 'OK' : item.errorReason})`}
    >
      {isHealthy && src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
      ) : (
        <AlertTriangle className="h-6 w-6 text-rose-500 animate-pulse drop-shadow-md" />
      )}
      
      <span className={`absolute bottom-2 right-2 h-3 w-3 rounded-full border-2 border-background shadow-sm
        ${isHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}
      `} />
    </div>
  );
}

export function Dashboard() {
  const [results, setResults] = useState<ImageCheckResult[]>([]);
  const [missingSequences, setMissingSequences] = useState<MissingSequenceResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentFileChecking, setCurrentFileChecking] = useState('');
  
  // Configurações
  const [concurrency, setConcurrency] = useState<number>(12); // Padrão agora é 12 para agilizar
  const [enableSequenceDetection, setEnableSequenceDetection] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMissing, setShowMissing] = useState(true);
  const [showHistoryList, setShowHistoryList] = useState(true);
  
  // Histórico
  const [analysisHistory, setAnalysisHistory] = useState<HistoryEntry[]>([]);

  // Estatísticas de performance
  const [processedCount, setProcessedCount] = useState(0);
  const [healthyCount, setHealthyCount] = useState(0);
  const [corruptedCount, setCorruptedCount] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [eta, setEta] = useState(0);

  // Controle de cancelamento e tempo
  const cancelRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);

  // Modal de Detalhes
  const [selectedResult, setSelectedResult] = useState<ImageCheckResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Carregar histórico local
  useEffect(() => {
    try {
      const stored = localStorage.getItem('pixelarmor_history');
      if (stored) {
        setAnalysisHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Falha ao ler o histórico:', e);
    }
  }, []);

  // Salvar entrada no histórico
  const saveToHistory = (total: number, healthy: number, corrupted: number) => {
    try {
      const newEntry: HistoryEntry = {
        id: Math.random().toString(36).substring(2, 9),
        date: new Date().toLocaleString('pt-BR'),
        total,
        healthy,
        corrupted
      };
      const updated = [newEntry, ...analysisHistory].slice(0, 5); // Guardar apenas as 5 últimas
      setAnalysisHistory(updated);
      localStorage.setItem('pixelarmor_history', JSON.stringify(updated));
    } catch (e) {
      console.error('Falha ao salvar no histórico:', e);
    }
  };

  const handleFilesSelected = async (files: File[]) => {
    setIsProcessing(true);
    cancelRef.current = false;
    setTotalFiles(files.length);
    setProcessedCount(0);
    setHealthyCount(0);
    setCorruptedCount(0);
    setProgress(0);
    const initialResults: ImageCheckResult[] = files.map(file => ({
      fileName: file.name,
      fileRef: file,
      status: 'pending',
      fileType: file.type || 'DESCONHECIDO',
      fileSize: file.size,
      durationMs: 0
    }));
    setResults(initialResults);
    setMissingSequences([]);
    
    startTimeRef.current = Date.now();
    toast.success(`Iniciando análise ágil de ${files.length} imagens...`);

    let activeWorkers = 0;
    let nextIndex = 0;
    
    let localProcessed = 0;
    let localHealthy = 0;
    let localCorrupted = 0;

    const workerPool: Worker[] = [];
    try {
      const numWorkers = Math.min(concurrency, files.length, 16);
      for (let i = 0; i < numWorkers; i++) {
        workerPool.push(new Worker(new URL('../lib/worker.ts', import.meta.url)));
      }
    } catch(e) {
      console.warn("Workers not supported, using fallback", e);
    }

    const processNext = async (workerIndex: number): Promise<void> => {
      if (cancelRef.current || nextIndex >= files.length) {
        return;
      }

      const currentIndex = nextIndex++;
      const file = files[currentIndex];
      activeWorkers++;
      setCurrentFileChecking(file.name);

      try {
        let result: ImageCheckResult;
        if (workerPool.length > 0) {
          const worker = workerPool[workerIndex];
          result = await new Promise((resolve, reject) => {
            worker.onmessage = (e) => {
              if (e.data.type === 'SUCCESS') {
                const res = e.data.result;
                res.fileRef = file;
                resolve(res);
              } else {
                reject(new Error(e.data.error));
              }
            };
            worker.onerror = (e) => reject(e);
            worker.postMessage({ file, index: currentIndex });
          });
        } else {
          result = await checkMediaFile(file);
        }
        
        // Atualizar o resultado específico na array para o usuário ver carregando um por um
        setResults(prev => {
          const newArray = [...prev];
          newArray[currentIndex] = result;
          return newArray;
        });

        localProcessed++;
        if (result.status === 'healthy') {
          localHealthy++;
        } else {
          localCorrupted++;
        }

        // Atualizar estatísticas e velocidade
        setProcessedCount(localProcessed);
        setHealthyCount(localHealthy);
        setCorruptedCount(localCorrupted);
        setProgress(Math.round((localProcessed / files.length) * 100));

        if (startTimeRef.current) {
          const elapsedSeconds = (Date.now() - startTimeRef.current) / 1000;
          const currentSpeed = elapsedSeconds > 0 ? localProcessed / elapsedSeconds : 0;
          setSpeed(currentSpeed);
          
          const remainingFiles = files.length - localProcessed;
          const currentEta = currentSpeed > 0 ? remainingFiles / currentSpeed : 0;
          setEta(currentEta);
        }
      } catch (err) {
        console.error('Erro ao processar arquivo:', file.name, err);
      } finally {
        activeWorkers--;
        if (nextIndex < files.length && !cancelRef.current) {
          await processNext(workerIndex);
        }
      }
    };

    // Inicializar os workers
    const initialWorkers: Promise<void>[] = [];
    const limit = Math.min(concurrency, files.length);
    for (let i = 0; i < limit; i++) {
      initialWorkers.push(processNext(i % (workerPool.length || 1)));
    }

    await Promise.all(initialWorkers);
    
    // Terminar os workers e limpar memória
    workerPool.forEach(w => w.terminate());

    setIsProcessing(false);
    setCurrentFileChecking('');

    // Detectar imagens ausentes na ordem numérica dos arquivos
    if (enableSequenceDetection) {
      const fileNames = files.map(f => f.name);
      const missing = detectMissingSequences(fileNames);
      setMissingSequences(missing);
    } else {
      setMissingSequences([]);
    }

    if (cancelRef.current) {
      toast.warning('A análise foi cancelada pelo usuário.');
    } else {
      toast.success(`Análise concluída! ${localHealthy} saudáveis, ${localCorrupted} corrompidas.`);
      saveToHistory(files.length, localHealthy, localCorrupted);
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
    toast.info('Dados de visualização resetados.');
  };

  const handleClearHistory = () => {
    setAnalysisHistory([]);
    localStorage.removeItem('pixelarmor_history');
    toast.success('Histórico de análises removido do navegador.');
  };

  const handleSelectResult = (result: ImageCheckResult) => {
    setSelectedResult(result);
    setIsModalOpen(true);
  };

  const copyCorruptedDeleteCommand = () => {
    const corruptedFiles = results.filter(r => r.status === 'corrupted');
    if (corruptedFiles.length === 0) return;
    // Cria comando no formato Windows
    const command = `del /F /Q ${corruptedFiles.map(r => `"${r.fileName}"`).join(' ')}`;
    navigator.clipboard.writeText(command);
    toast.success('Comando CMD (del) copiado com sucesso! Cole no terminal.');
  };

  const downloadDeleteScript = (os: 'win' | 'mac') => {
    const corruptedFiles = results.filter(r => r.status === 'corrupted');
    if (corruptedFiles.length === 0) return;

    let content = '';
    let filename = '';
    
    if (os === 'win') {
      content = `@echo off\nREM PixelArmor Cleaner Script\n\n`;
      content += corruptedFiles.map(r => `del /F /Q "${r.fileName}"`).join('\n');
      content += `\n\necho.\necho Limpeza de imagens corrompidas concluída.\npause`;
      filename = 'pixelarmor-clean.bat';
    } else {
      content = `#!/bin/bash\n# PixelArmor Cleaner Script\n\n`;
      content += corruptedFiles.map(r => `rm -f "${r.fileName}"`).join('\n');
      content += `\n\necho "Limpeza de imagens corrompidas concluída."\n`;
      filename = 'pixelarmor-clean.sh';
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Script de exclusão (${os}) exportado com sucesso!`);
  };

  const handleExport = (format: 'csv' | 'json') => {
    if (results.length === 0) return;

    let content = '';
    let mimeType = 'text/plain';
    let filename = `relatorio-pixelarmor-${Date.now()}`;

    if (format === 'json') {
      const exportData = results.map(({ fileName, fileSize, fileType, status, errorReason, dimensions, durationMs }) => ({
        fileName,
        fileSize,
        fileType,
        status,
        durationMs,
        errorReason: errorReason || null,
        dimensions: dimensions ? `${dimensions.width}x${dimensions.height}` : null
      }));
      content = JSON.stringify(exportData, null, 2);
      mimeType = 'application/json';
      filename += '.json';
    } else if (format === 'csv') {
      const headers = ['Nome', 'Tamanho (Bytes)', 'Formato', 'Status', 'Tempo de Análise (ms)', 'Motivo do Erro', 'Dimensões'];
      const rows = results.map(item => [
        `"${item.fileName.replace(/"/g, '""')}"`,
        item.fileSize,
        item.fileType,
        item.status === 'healthy' ? 'Saudavel' : 'Corrompido',
        item.durationMs,
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

  // Filtrar as últimas imagens corrompidas para exibir em tempo real na barra lateral
  const realTimeCorruptedList = results.filter(r => r.status === 'corrupted');

  return (
    <div className="space-y-6 md:space-y-8 max-w-6xl mx-auto px-4 py-6 md:py-10 relative z-10">
      {/* Cabeçalho do App Minimalista */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b pb-6 relative">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
              PixelArmor
            </h1>
            <Badge variant="outline" className="rounded-md font-mono text-[10px] uppercase text-muted-foreground">
              V2
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed max-w-2xl font-medium">
            Validador avançado de imagens com decodificação local otimizada e análise profunda de assinaturas de arquivo contra corrupções e arquivos fantasmas.
          </p>
        </div>
        
        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
          <ThemeToggle />
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setShowConfig(!showConfig);
              setShowHistory(false);
            }}
            className={`rounded-xl h-10 w-10 transition-all duration-200
              ${showConfig ? 'bg-primary/10 text-primary border-primary/30' : ''}
            `}
            title="Configurações de Otimização"
          >
            <Settings2 className="h-5 w-5" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setShowHistory(!showHistory);
              setShowConfig(false);
            }}
            className={`rounded-xl h-10 w-10 transition-all duration-200
              ${showHistory ? 'bg-primary/10 text-primary border-primary/30' : ''}
            `}
            title="Histórico de Verificações"
          >
            <History className="h-5 w-5" />
          </Button>

          {results.length > 0 && !isProcessing && (
            <Button
              variant="destructive"
              size="icon"
              onClick={handleClear}
              className="rounded-xl h-10 w-10 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-0"
              title="Limpar Resultados"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Painel de Configurações Colapsável */}
      {showConfig && (
        <Card className="border border-primary/20 bg-background/50 backdrop-blur-lg rounded-2xl animate-in fade-in-50 slide-in-from-top-4 duration-300">
          <CardContent className="p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Settings2 className="h-4 w-4" /> Configurações de Otimização
            </h3>
            
            <div className="space-y-3.5 max-w-md pt-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold">Nível de Concorrência de Fila</span>
                <Badge variant="outline" className="font-mono bg-accent font-bold">
                  {concurrency} Workers Simultâneos
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Determina quantas imagens o navegador analisará ao mesmo tempo. Valores maiores aceleram a análise, mas podem usar mais CPU. Recomendado: 12.
              </p>
              <Slider
                value={[concurrency]}
                onValueChange={(val) => {
                  if (Array.isArray(val) && val.length > 0) {
                    setConcurrency(val[0]);
                  }
                }}
                min={1}
                max={24}
                step={1}
                className="py-2"
              />
              
              <div className="pt-4 mt-2 border-t border-primary/10 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold">Análise de Sequência Numérica</p>
                  <p className="text-[10px] text-muted-foreground max-w-[200px]">Avisa se houver fotos faltando na numeração da pasta.</p>
                </div>
                <Button 
                  variant={enableSequenceDetection ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setEnableSequenceDetection(!enableSequenceDetection)}
                  className={`h-7 text-xs rounded-lg ${enableSequenceDetection ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}`}
                >
                  {enableSequenceDetection ? 'Ativado' : 'Desativado'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historico de Analises */}
      {showHistory && (
        <Card className="border border-border bg-transparent shadow-none rounded-xl overflow-hidden">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <h2 className="text-lg font-medium tracking-tight text-foreground">
                Histórico de Processamento
              </h2>
              {analysisHistory.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setAnalysisHistory([]);
                    localStorage.removeItem('pixelarmor_history');
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Limpar
                </Button>
              )}
            </div>
            
            {showHistoryList && (
              analysisHistory.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Nenhum registro encontrado.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {analysisHistory.map((item) => (
                    <div key={item.id} className="p-4 rounded-lg border border-border bg-card space-y-3">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{item.date}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div>
                          <p className="text-muted-foreground mb-1">Total</p>
                          <p className="font-semibold text-foreground">{item.total}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Bons</p>
                          <p className="font-semibold text-emerald-500">{item.healthy}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Falhas</p>
                          <p className="font-semibold text-rose-500">{item.corrupted}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Zone */}
      <UploadZone onFilesSelected={handleFilesSelected} isProcessing={isProcessing} />

      {/* Progress & Cancel Panel */}
      {isProcessing && (
        <Card className="border border-border bg-card shadow-sm rounded-xl">
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-muted-foreground animate-spin" />
                  <span className="truncate max-w-[320px] font-mono">{currentFileChecking}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Processando {processedCount} de {totalFiles}
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCancel}
                className="rounded-xl border-rose-500/30 text-rose-500 hover:bg-rose-500/10 hover:text-rose-500 transition-all duration-200"
                title="Parar Verificação"
              >
                <XCircle className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-2">
              <Progress value={progress} className="h-2.5 rounded-full" />
              <div className="flex justify-between text-xs text-muted-foreground font-semibold pb-2">
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

            {/* Rolo de Filme em Tempo Real das imagens analisadas */}
            {results.length > 0 && (
              <div className="space-y-2.5 pt-4 border-t border-primary/10 animate-in fade-in-50 duration-300">
                <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider pl-0.5">
                  Fila de Processamento Visual (Tempo Real)
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {results.slice(-8).map((item, idx) => (
                    <LivePreviewItem key={`${item.fileName}-${idx}`} item={item} />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Grid Lateral de Imagens Corrompidas em Tempo Real */}
      {isProcessing && realTimeCorruptedList.length > 0 && (
        <Card className="border border-rose-500/20 bg-rose-500/5 rounded-2xl animate-in fade-in-50 duration-200">
          <CardContent className="p-5 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <AlertOctagon className="h-4.5 w-4.5" /> Danos Detectados em Tempo Real ({realTimeCorruptedList.length})
            </h4>
            <div className="max-h-[120px] overflow-y-auto space-y-1.5 pr-2 font-mono text-[10px] text-rose-700 dark:text-rose-300">
              {realTimeCorruptedList.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-1 border-b border-rose-500/10 last:border-0">
                  <span className="font-semibold truncate max-w-[350px]">{item.fileName}</span>
                  <span className="opacity-75 italic text-right truncate max-w-[200px]">{item.errorReason}</span>
                </div>
              ))}
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

          {/* Ações rápidas do relatório */}
          {results.length > 0 && !isProcessing && corruptedCount > 0 && (
            <div className="flex flex-wrap gap-2.5 items-center bg-accent/25 border p-4 rounded-2xl">
              <span className="text-xs text-muted-foreground font-semibold">
                Ações Rápidas de Correção:
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={copyCorruptedDeleteCommand}
                className="h-9 w-9 rounded-xl hover:border-rose-500/20 hover:text-rose-600 dark:hover:text-rose-400 transition-all duration-200"
                title="Copiar Comando de Exclusão (CMD)"
              >
                <Copy className="h-4 w-4" />
              </Button>

              <div className="h-6 w-px bg-border/50 mx-1"></div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadDeleteScript('win')}
                className="rounded-xl hover:bg-rose-500/10 hover:text-rose-600 transition-all font-mono text-xs border-primary/20"
                title="Baixar Script .bat para Windows"
              >
                .BAT (Win)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadDeleteScript('mac')}
                className="rounded-xl hover:bg-rose-500/10 hover:text-rose-600 transition-all font-mono text-xs border-primary/20"
                title="Baixar Script .sh para Mac/Linux"
              >
                .SH (Mac)
              </Button>
            </div>
          )}

          {/* Alerta de imagens ausentes na sequência */}
          {missingSequences.length > 0 && !isProcessing && (
            <Card className="border border-amber-500/25 bg-amber-500/5 dark:bg-amber-950/10 backdrop-blur-md rounded-2xl animate-in fade-in-50 duration-300">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-3 border-b pb-2">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-5 w-5 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-amber-800 dark:text-amber-400">
                        Imagens Ausentes na Sequência Numérica
                      </h3>
                      <p className="text-xs text-amber-700/80 dark:text-amber-500/80 leading-relaxed">
                        Detectamos que a pasta analisada possui sequências numéricas e que algumas imagens estão faltando na ordem.
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowMissing(!showMissing)}
                    className="h-8 w-8 rounded-lg border-0 shrink-0 hover:bg-amber-500/10"
                    title={showMissing ? "Ocultar Lista" : "Exibir Lista"}
                  >
                    {showMissing ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>

                {showMissing && (
                  <div className="space-y-3.5 pt-2 animate-in fade-in duration-300">
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
                              className="border-amber-500/20 bg-amber-500/5 text-amber-700 dark:text-amber-400 text-xs py-0.5 px-2.5 font-medium rounded-lg"
                            >
                              {file}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Resultados Detalhados */}
          {results.length > 0 && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between pl-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold tracking-tight">Relatório de Análise</h2>
                  {corruptedCount > 0 && (
                    <Badge variant="outline" className="rounded-full gap-1 border-rose-500/25 bg-rose-500/5 text-rose-600 dark:text-rose-400 font-bold text-[10px] px-2.5 py-0.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {corruptedCount} falhas
                    </Badge>
                  )}
                </div>
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
