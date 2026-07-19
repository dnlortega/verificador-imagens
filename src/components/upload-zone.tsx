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
    // Filtrar apenas arquivos de imagem comuns ou pela extensão
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const imageFiles = filesArray.filter(file => {
      const name = file.name.toLowerCase();
      return file.type.startsWith('image/') || imageExtensions.some(ext => name.endsWith(ext));
    });

    if (imageFiles.length === 0) {
      toast.error('Nenhuma imagem válida foi encontrada nos arquivos selecionados.');
      return;
    }

    if (imageFiles.length < filesArray.length) {
      toast.info(`Selecionados ${imageFiles.length} imagens de ${filesArray.length} arquivos totais.`);
    }

    onFilesSelected(imageFiles);
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
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        accept="image/*,.bmp"
        onChange={handleFileChange}
      />
      <input
        type="file"
        ref={folderInputRef}
        className="hidden"
        {...({
          webkitdirectory: "",
          directory: "",
          multiple: true
        } as any)}
        onChange={handleFileChange}
      />

      <Card
        className={`relative flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-3xl transition-all duration-500 min-h-[300px] text-center cursor-pointer select-none glass-card overflow-hidden group
          ${isDragActive 
            ? 'border-primary bg-primary/10 scale-[1.02] glow-effect' 
            : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-white/5 dark:hover:bg-white/5'
          }
          ${isProcessing ? 'opacity-60 cursor-not-allowed grayscale-[0.5]' : ''}
        `}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={isProcessing ? undefined : triggerFileInput}
      >
        {/* Subtle background glow circle on hover */}
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/0 via-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

        <div className="flex flex-col items-center space-y-6 max-w-md relative z-10">
          <div className={`p-5 rounded-2xl transition-all duration-500 ${isDragActive ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110 animate-bounce' : 'bg-primary/10 text-primary group-hover:bg-primary/20'}`}>
            <Upload className="h-10 w-10" />
          </div>
          
          <div className="space-y-3">
            <h3 className="text-2xl font-semibold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
              Arraste e solte seus arquivos aqui
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed px-4">
              Arraste imagens individuais ou uma <strong className="text-foreground font-medium">pasta inteira</strong> para verificação instantânea na nuvem.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4" onClick={(e) => e.stopPropagation()}>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={triggerFileInput}
              disabled={isProcessing}
              className="rounded-xl hover:scale-105 duration-300 border-primary/20 hover:bg-primary/10 shadow-sm"
              title="Selecionar Imagens"
            >
              <ImageIcon className="h-5 w-5 mr-2" />
              Imagens
            </Button>
            
            <Button 
              variant="outline" 
              size="lg" 
              onClick={triggerFolderInput}
              disabled={isProcessing}
              className="rounded-xl hover:scale-105 duration-300 border-primary/20 hover:bg-primary/10 shadow-sm"
              title="Selecionar Pasta"
            >
              <FolderOpen className="h-5 w-5 mr-2" />
              Pasta
            </Button>
          </div>

          <div className="text-xs text-muted-foreground/60 pt-6 font-medium">
            Formatos: JPEG, PNG, WEBP, GIF, BMP, SVG (Max: 200MB/arquivo)
          </div>
        </div>
      </Card>
    </div>
  );
}

