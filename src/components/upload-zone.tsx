'use client';

import React, { useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FolderOpen, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  isProcessing: boolean;
}

export function UploadZone({ onFilesSelected, isProcessing }: UploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const processFileList = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    
    const filesArray = Array.from(fileList);
    // Filtrar apenas arquivos de imagem/vídeo comuns ou pela extensão
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.mp4', '.mov'];
    const validFiles = filesArray.filter(file => {
      const name = file.name.toLowerCase();
      return file.type.startsWith('image/') || file.type.startsWith('video/') || allowedExtensions.some(ext => name.endsWith(ext));
    });

    if (validFiles.length === 0) {
      toast.error('Nenhum arquivo de imagem ou vídeo válido foi encontrado.');
      return;
    }

    if (validFiles.length < filesArray.length) {
      toast.info(`Selecionados ${validFiles.length} arquivos válidos de ${filesArray.length} totais.`);
    }

    onFilesSelected(validFiles);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (isProcessing) {
      toast.error('Aguarde o processamento atual terminar antes de enviar novas imagens.');
      return;
    }

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFileList(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isProcessing) {
      toast.error('Aguarde o processamento atual terminar.');
      return;
    }
    processFileList(e.target.files);
    // Resetar input para permitir selecionar o mesmo arquivo novamente
    if (e.target) e.target.value = '';
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const triggerFolderInput = () => {
    folderInputRef.current?.click();
  };

  return (
    <div className="w-full relative group perspective-1000">
      <input
        id="file-upload"
        type="file"
        ref={fileInputRef}
        className="sr-only absolute pointer-events-none"
        multiple
        accept="image/*,video/mp4,video/quicktime,.bmp,.mp4,.mov"
        onChange={handleFileChange}
      />
      <input
        id="folder-upload"
        type="file"
        ref={folderInputRef}
        className="sr-only absolute pointer-events-none"
        {...({ webkitdirectory: "true", directory: "true" } as any)}
        multiple
        onChange={handleFileChange}
      />

      {/* Orbital Glow Effect */}
      <div className={`absolute -inset-1 rounded-[2rem] blur-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-1000 z-0 bg-gradient-to-r from-emerald-500 via-indigo-500 to-emerald-500 bg-[length:200%_auto] animate-[gradient_4s_linear_infinite] ${isDragActive ? 'opacity-100 scale-105' : ''}`} />

      <Card
        className={`relative z-10 flex flex-col items-center justify-center p-12 md:p-16 border-[1.5px] border-dashed rounded-[2rem] transition-all duration-700 min-h-[350px] text-center cursor-pointer select-none overflow-hidden bg-background/60 backdrop-blur-3xl shadow-2xl
          ${isDragActive 
            ? 'border-emerald-500 bg-emerald-500/5 scale-[1.02] shadow-[0_0_80px_-15px_rgba(16,185,129,0.3)]' 
            : 'border-white/10 hover:border-emerald-500/40 hover:bg-white/5 dark:hover:bg-white/5 shadow-black/20'
          }
          ${isProcessing ? 'opacity-50 cursor-not-allowed grayscale-[0.8] blur-[2px]' : ''}
        `}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50" />

        <div className="flex flex-col items-center space-y-8 max-w-lg relative z-20">
          
          {/* Animated Icon Ring */}
          <div className="relative">
            <div className={`absolute inset-0 rounded-full transition-transform duration-700 ${isDragActive ? 'scale-150 bg-emerald-500/20 animate-ping' : 'scale-100 bg-emerald-500/0'}`} />
            <div className={`p-5 rounded-3xl transition-all duration-700 relative z-10 backdrop-blur-md border border-white/10 shadow-xl
              ${isDragActive ? 'bg-emerald-500 text-white shadow-emerald-500/40 translate-y-[-10px]' : 'bg-background text-emerald-500 group-hover:shadow-emerald-500/20'}`}>
              <Upload className={`w-10 h-10 transition-transform duration-700 ${isDragActive ? 'animate-bounce' : 'group-hover:-translate-y-1'}`} />
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground via-foreground to-muted-foreground transition-all duration-300">
              {isDragActive ? 'Solte para Iniciar Análise' : 'Arraste Arquivos ou Pastas'}
            </h3>
            <p className="text-sm md:text-base text-muted-foreground/80 leading-relaxed font-medium px-4 max-w-sm mx-auto">
              Processamento paralelo via WebWorkers para detecção instantânea na sua própria máquina.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4 w-full" onClick={(e) => e.stopPropagation()}>
            <Button 
              asChild
              variant="outline" 
              size="lg" 
              disabled={isProcessing}
              className={`flex-1 min-w-[160px] h-14 rounded-2xl transition-all duration-500 border-white/10 bg-background/50 backdrop-blur-md hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-500 shadow-sm cursor-pointer group/btn ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
            >
              <label htmlFor="file-upload" className="flex items-center justify-center w-full font-bold tracking-wide">
                <ImageIcon className="h-5 w-5 mr-3 transition-transform group-hover/btn:scale-110" />
                Arquivos
              </label>
            </Button>
            
            <Button 
              asChild
              variant="outline" 
              size="lg" 
              disabled={isProcessing}
              className={`flex-1 min-w-[160px] h-14 rounded-2xl transition-all duration-500 border-white/10 bg-background/50 backdrop-blur-md hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-400 shadow-sm cursor-pointer group/btn ${isProcessing ? 'pointer-events-none opacity-50' : ''}`}
            >
              <label htmlFor="folder-upload" className="flex items-center justify-center w-full font-bold tracking-wide">
                <FolderOpen className="h-5 w-5 mr-3 transition-transform group-hover/btn:scale-110" />
                Pasta Inteira
              </label>
            </Button>
          </div>

          <div className="flex items-center gap-3 pt-6 text-[11px] font-bold tracking-widest text-muted-foreground/50 uppercase">
            <span className="w-12 h-px bg-white/10" />
            Formatos: JPG, PNG, MP4, MOV (Até 4GB)
            <span className="w-12 h-px bg-white/10" />
          </div>
        </div>
      </Card>
    </div>
  );
}

