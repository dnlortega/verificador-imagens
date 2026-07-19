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
import { AlertCircle, CheckCircle, FileImage, HardDrive, Maximize2, Wrench, Loader2, Film, Sparkles } from 'lucide-react';
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
    const toastId = toast.loading('Aplicando algoritmos de recuperação avançada...');
    
    try {
      let repairedBlob: Blob;
      let repairType = '';
      
      // Decidir tipo de reparo
      if (result.fileType === 'JPEG' && result.errorReason?.toLowerCase().includes('truncada')) {
        repairedBlob = await repairJpegBytes(result.fileRef);
        repairType = 'Injeção de Marcadores EOI';
      } else {
        repairedBlob = await repairImageViaCanvas(result.fileRef);
        repairType = 'Renderização Raster Acelerada';
      }
      
      // Criar download automático
      const url = URL.createObjectURL(repairedBlob);
      const link = document.createElement('a');
      link.href = url;
      const ext = repairType.includes('Raster') ? 'png' : 'jpg';
      const baseName = result.fileName.substring(0, result.fileName.lastIndexOf('.')) || result.fileName;
      link.setAttribute('download', `${baseName}-reparada.${ext}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Recuperação bem sucedida via: ${repairType}! O download iniciou.`, { id: toastId });
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(`Falha irreparável: ${(err as Error).message}`, { id: toastId });
    } finally {
      setIsRepairing(false);
    }
  };

  const isHealthy = result.status === 'healthy';
  const isVideo = result.fileType.includes('video') || result.fileType === 'MP4' || result.fileType === 'MOV' || result.fileName.toLowerCase().endsWith('.mp4');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl w-11/12 rounded-3xl overflow-hidden p-0 gap-0 bg-background/80 backdrop-blur-2xl border-0 shadow-2xl ring-1 ring-white/10">
        
        {/* Glow de fundo */}
        <div className={`absolute -top-40 -right-40 w-96 h-96 rounded-full blur-[100px] opacity-20 pointer-events-none ${isHealthy ? 'bg-emerald-500' : 'bg-rose-500'}`} />

        <div className="p-8 pb-6 border-b border-white/5 relative z-10">
          <DialogTitle className="flex items-start justify-between gap-4">
            <div className="space-y-1 overflow-hidden">
              <h2 className="text-xl md:text-2xl font-bold truncate pr-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
                {result.fileName}
              </h2>
              <DialogDescription className="text-sm font-medium text-muted-foreground/80 flex items-center gap-2">
                Análise Detalhada
                <span className="w-1 h-1 rounded-full bg-muted-foreground/40"></span>
                {result.durationMs}ms de processamento
              </DialogDescription>
            </div>
            
            <Badge 
              variant={isHealthy ? 'default' : 'destructive'}
              className={`rounded-xl py-1.5 px-3.5 font-bold text-sm gap-2 border shadow-inner shrink-0
                ${isHealthy ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/10' : 'bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-rose-500/10'}
              `}
            >
              {isHealthy ? (
                <><CheckCircle className="h-4 w-4" /> Saudável</>
              ) : (
                <><AlertCircle className="h-4 w-4" /> Corrompido</>
              )}
            </Badge>
          </DialogTitle>
        </div>

        <div className="grid gap-8 md:grid-cols-[1fr_350px] p-8 pt-6 relative z-10">
          
          {/* Coluna 1: Preview do Arquivo */}
          <div className="flex flex-col items-center justify-center rounded-2xl bg-black/40 shadow-inner border border-white/5 overflow-hidden aspect-square md:aspect-auto relative min-h-[300px] group">
            {isHealthy && imageUrl ? (
              isVideo ? (
                <video
                  src={imageUrl}
                  controls
                  className="w-full h-full object-contain rounded-xl"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt={result.fileName}
                  className="max-h-full max-w-full object-contain p-2 rounded-xl transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />
              )
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center relative w-full h-full">
                {/* Efeito de glitch/ruído no fundo quando corrompido */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
                
                <div className="w-20 h-20 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-4 ring-1 ring-rose-500/20 shadow-[0_0_40px_rgba(244,63,94,0.15)] relative">
                  {isVideo ? (
                    <Film className="h-10 w-10 text-rose-500/80" />
                  ) : (
                    <FileImage className="h-10 w-10 text-rose-500/80" />
                  )}
                  <AlertCircle className="h-6 w-6 text-rose-500 absolute -bottom-2 -right-2 bg-background rounded-full" />
                </div>
                
                <p className="text-base font-bold text-foreground">Pré-visualização Indisponível</p>
                <p className="text-sm text-muted-foreground mt-2 max-w-[240px] leading-relaxed">
                  Os dados essenciais deste arquivo estão comprometidos.
                </p>
              </div>
            )}
          </div>

          {/* Coluna 2: Informações Técnicas e Ações */}
          <div className="flex flex-col space-y-6 justify-between">
            <div className="space-y-5">
              <h4 className="text-xs font-bold tracking-[0.2em] uppercase text-muted-foreground/80 flex items-center gap-2">
                <Sparkles className="h-3 w-3" /> Ficha Técnica
              </h4>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4 bg-accent/30 p-3 rounded-xl border border-white/5">
                  <div className="p-2 rounded-lg bg-background/50 shadow-sm border border-white/5">
                    <HardDrive className="h-4 w-4 text-foreground/80" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Peso no Disco</p>
                    <p className="font-semibold text-sm text-foreground">{formatSize(result.fileSize)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-accent/30 p-3 rounded-xl border border-white/5">
                  <div className="p-2 rounded-lg bg-background/50 shadow-sm border border-white/5">
                    {isVideo ? <Film className="h-4 w-4 text-foreground/80" /> : <FileImage className="h-4 w-4 text-foreground/80" />}
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Assinatura Digital</p>
                    <p className="font-semibold text-sm text-foreground uppercase">{result.fileType}</p>
                  </div>
                </div>

                {result.dimensions && (
                  <div className="flex items-center gap-4 bg-accent/30 p-3 rounded-xl border border-white/5">
                    <div className="p-2 rounded-lg bg-background/50 shadow-sm border border-white/5">
                      <Maximize2 className="h-4 w-4 text-foreground/80" />
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-0.5">Resolução FÍSICA</p>
                      <p className="font-semibold text-sm text-foreground">
                        {result.dimensions.width} <span className="text-muted-foreground/50 mx-0.5">x</span> {result.dimensions.height}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Alertas e Botões de Ação */}
            <div className="pt-2 mt-auto">
              {!isHealthy ? (
                <div className="space-y-4">
                  <div className="p-4 border border-rose-500/30 bg-gradient-to-b from-rose-500/10 to-rose-500/5 rounded-2xl shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
                    <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-rose-500 mb-2">
                      <AlertCircle className="h-4 w-4" /> Laudo do Motor
                    </p>
                    <p className="text-sm font-medium leading-relaxed text-foreground/90">
                      {result.errorReason}
                    </p>
                  </div>
                  
                  {!isVideo && (
                    <Button
                      onClick={handleRepair}
                      disabled={isRepairing}
                      className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold tracking-wide shadow-[0_8px_30px_rgba(245,158,11,0.25)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(245,158,11,0.4)] border-0 flex items-center justify-center gap-2 group relative overflow-hidden"
                    >
                      {/* Efeito de brilho passando pelo botão */}
                      <div className="absolute inset-0 w-1/4 bg-white/20 -translate-x-[150%] skew-x-12 group-hover:translate-x-[500%] transition-transform duration-1000 ease-in-out" />
                      
                      {isRepairing ? (
                        <><Loader2 className="h-5 w-5 animate-spin" /> Restaurando Pixels...</>
                      ) : (
                        <><Wrench className="h-5 w-5" /> Iniciar Modo de Recuperação</>
                      )}
                    </Button>
                  )}
                  {isVideo && (
                    <div className="text-xs text-center text-muted-foreground/70 font-medium px-4">
                      Vídeos corrompidos por falta de moov exigem re-encode complexo (não suportado na versão atual).
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-5 border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-2xl shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                  <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-emerald-500 mb-2">
                    <CheckCircle className="h-4 w-4" /> Qualidade Garantida
                  </p>
                  <p className="text-sm leading-relaxed font-medium text-foreground/80">
                    Nenhuma anomalia estrutural encontrada. Arquivo apto para uso ou backup seguro em nuvem.
                  </p>
                </div>
              )}
            </div>
            
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
