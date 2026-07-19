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
        className={`relative flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-2xl transition-all duration-300 min-h-[300px] text-center cursor-pointer select-none
          ${isDragActive 
            ? 'border-primary bg-primary/5 scale-[0.99] shadow-inner' 
            : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-accent/30'
          }
          ${isProcessing ? 'opacity-60 cursor-not-allowed' : ''}
        `}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={isProcessing ? undefined : triggerFileInput}
      >
        <div className="flex flex-col items-center space-y-4 max-w-md">
          <div className="p-4 rounded-full bg-primary/10 text-primary animate-pulse">
            <Upload className="h-10 w-10" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-semibold tracking-tight">
              Arraste e solte seus arquivos aqui
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Arraste imagens individuais ou uma <strong className="text-foreground">pasta inteira</strong> para verificação instantânea.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4" onClick={(e) => e.stopPropagation()}>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={triggerFileInput}
              disabled={isProcessing}
              className="h-10 px-4 rounded-xl gap-2 font-medium"
            >
              <ImageIcon className="h-4 w-4" />
              Selecionar Imagens
            </Button>
            
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={triggerFolderInput}
              disabled={isProcessing}
              className="h-10 px-4 rounded-xl gap-2 font-medium"
            >
              <FolderOpen className="h-4 w-4" />
              Selecionar Pasta
            </Button>
          </div>

          <div className="text-xs text-muted-foreground/75 pt-6">
            Formatos suportados: JPEG, PNG, WEBP, GIF, BMP, SVG (Max. recomendado: 200MB por arquivo)
          </div>
        </div>
      </Card>
    </div>
  );
}
