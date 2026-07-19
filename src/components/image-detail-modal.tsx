'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ImageCheckResult } from '@/lib/image-checker';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, FileImage, HardDrive, Maximize2 } from 'lucide-react';

interface ImageDetailModalProps {
  result: ImageCheckResult | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageDetailModal({ result, isOpen, onClose }: ImageDetailModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!result || !isOpen) {
      setImageUrl(null);
      return;
    }

    // Se a imagem for saudável (ou mesmo se for tentar exibir a corrompida para inspeção), criamos a URL
    // Para SVG ou imagens parcialmente legíveis, o navegador pode tentar desenhar
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

  const isHealthy = result.status === 'healthy';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl w-11/12 rounded-2xl overflow-hidden p-6 gap-6 bg-background/95 backdrop-blur-md">
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

            {/* Caixa de Erro */}
            {!isHealthy && result.errorReason && (
              <div className="p-4 border border-rose-500/20 bg-rose-500/5 text-rose-700 dark:text-rose-300 rounded-xl space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" /> Motivo da Falha:
                </p>
                <p className="text-sm font-medium leading-relaxed">
                  {result.errorReason}
                </p>
              </div>
            )}
            
            {isHealthy && (
              <div className="p-4 border border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 rounded-xl space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4" /> Integridade Confirmada
                </p>
                <p className="text-xs leading-relaxed opacity-90">
                  O cabeçalho mágico foi validado com sucesso e a imagem foi renderizada completamente no Canvas sem erros de decodificação.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
