'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ImageCheckResult, repairJpegBytes, repairImageViaCanvas } from '@/lib/image-checker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, FileImage, HardDrive, Maximize2, Wrench, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ImageDetailModalProps {
  result: ImageCheckResult | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageDetailModal({ result, isOpen, onClose }: ImageDetailModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isRepairing, setIsRepairing] = useState(false);

  useEffect(() => {
    if (!result || !isOpen) {
      setImageUrl(null);
      return;
    }

    let objectUrl: string | null = null;
    try {
      objectUrl = URL.createObjectURL(result.fileRef);
      setImageUrl(objectUrl);
    } catch (e) {
      console.error('Falha ao criar ObjectURL:', e);
    }

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [result, isOpen]);

  if (!result) return null;

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleRepair = async () => {
    if (!result) return;
    setIsRepairing(true);
    const toastId = toast.loading('Tentando reparar pixels e dados da imagem localmente...');
    
    try {
      let repairedBlob: Blob;
      let repairType = '';
      
      // Decidir tipo de reparo
      if (result.fileType === 'JPEG' && result.errorReason?.toLowerCase().includes('truncada')) {
        repairedBlob = await repairJpegBytes(result.fileRef);
        repairType = 'Injeção de Fim de Imagem (FF D9)';
      } else {
        repairedBlob = await repairImageViaCanvas(result.fileRef);
        repairType = 'Recuperação Raster do Canvas';
      }
      
      // Criar download automático
      const url = URL.createObjectURL(repairedBlob);
      const link = document.createElement('a');
      link.href = url;
      const ext = repairType.includes('Canvas') ? 'png' : 'jpg';
      const baseName = result.fileName.substring(0, result.fileName.lastIndexOf('.')) || result.fileName;
      link.setAttribute('download', `${baseName}-reparada.${ext}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Imagem reparada via: ${repairType}! Download iniciado.`, { id: toastId });
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(`Falha no reparo: ${(err as Error).message}`, { id: toastId });
    } finally {
      setIsRepairing(false);
    }
  };

  const isHealthy = result.status === 'healthy';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl w-11/12 rounded-2xl overflow-hidden p-6 gap-6 bg-background/95 backdrop-blur-md border">
        <DialogHeader className="pb-2 border-b">
          <DialogTitle className="flex items-center gap-3 text-lg font-bold truncate pr-6">
            <span className="truncate max-w-[400px]">{result.fileName}</span>
            <Badge 
              variant={isHealthy ? 'default' : 'destructive'}
              className={`rounded-lg py-0.5 px-2.5 font-semibold text-xs gap-1 border-0
                ${isHealthy ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'}
              `}
            >
              {isHealthy ? (
                <>
                  <CheckCircle className="h-3.5 w-3.5" />
                  Saudável
                </>
              ) : (
                <>
                  <AlertCircle className="h-3.5 w-3.5" />
                  Corrompida
                </>
              )}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Resumo e detalhes técnicos detectados na análise local.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Coluna 1: Preview da Imagem */}
          <div className="flex flex-col items-center justify-center border rounded-xl bg-accent/25 overflow-hidden aspect-square relative min-h-[220px]">
            {isHealthy && imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={result.fileName}
                className="max-h-[240px] max-w-full object-contain rounded-lg shadow-sm transition-all duration-300 hover:scale-105"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-muted-foreground text-center">
                <AlertCircle className="h-12 w-12 text-rose-500/60 mb-2 animate-bounce" />
                <p className="text-sm font-semibold">Visualização Indisponível</p>
                <p className="text-xs text-muted-foreground/80 mt-1 max-w-[200px]">
                  Esta imagem está corrompida e o navegador não pôde decodificá-la.
                </p>
              </div>
            )}
          </div>

          {/* Coluna 2: Informações do arquivo */}
          <div className="flex flex-col justify-between space-y-4">
            <div className="space-y-3.5">
              <h4 className="text-sm font-bold tracking-wide uppercase text-muted-foreground">
                Metadados do Arquivo
              </h4>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 text-sm">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Tamanho</p>
                    <p className="font-semibold text-foreground">{formatSize(result.fileSize)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 text-sm">
                  <FileImage className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Tipo Detectado</p>
                    <p className="font-semibold text-foreground uppercase">{result.fileType}</p>
                  </div>
                </div>

                {result.dimensions && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Maximize2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground font-medium">Dimensões Originais</p>
                      <p className="font-semibold text-foreground">
                        {result.dimensions.width} x {result.dimensions.height} px
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Caixa de Erro + Opção de Correção */}
            {!isHealthy ? (
              <div className="space-y-3">
                <div className="p-4 border border-rose-500/20 bg-rose-500/5 text-rose-700 dark:text-rose-300 rounded-xl space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" /> Motivo da Falha:
                  </p>
                  <p className="text-sm font-medium leading-relaxed">
                    {result.errorReason}
                  </p>
                </div>
                
                <Button
                  onClick={handleRepair}
                  disabled={isRepairing}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-bold text-xs gap-2 shadow-md transition-all duration-300 hover:scale-[1.02] border-0"
                >
                  {isRepairing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Reparando Imagem...
                    </>
                  ) : (
                    <>
                      <Wrench className="h-4 w-4 animate-pulse" />
                      Tentar Corrigir e Baixar
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="p-4 border border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 rounded-xl space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4" /> Integridade Confirmada
                </p>
                <p className="text-xs leading-relaxed opacity-90">
                  O cabeçalho mágico foi validado com sucesso e a imagem foi decodificada sem erros estruturais de pixels em {result.durationMs}ms.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
