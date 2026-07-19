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
        className={`relative z-10 flex flex-col items-center justify-center p-10 md:p-14 border border-dashed rounded-2xl transition-colors duration-300 min-h-[300px] text-center select-none bg-transparent shadow-none
          ${isDragActive 
            ? 'border-primary bg-accent/30' 
            : 'border-border hover:border-muted-foreground/50'
          }
          ${isProcessing ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
        `}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center space-y-6 max-w-sm relative z-20">
          
          {/* Ícone Simples */}
          <div className="p-4 rounded-full bg-accent text-muted-foreground">
            <Upload className="w-8 h-8" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-medium tracking-tight text-foreground">
              Selecione ou Arraste
            </h3>
            <p className="text-sm text-muted-foreground">
              Arquivos de mídia ou pastas inteiras.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 w-full" onClick={(e) => e.stopPropagation()}>
            {/* Input escondido fisicamente, mas ainda acessível para o navegador não bloquear */}
            <input
              id="file-upload"
              type="file"
              ref={fileInputRef}
              className="w-0 h-0 absolute opacity-0 overflow-hidden"
              multiple
              accept="image/*,video/mp4,video/quicktime,.bmp,.mp4,.mov"
              onChange={handleFileChange}
            />
            
            <input
              id="folder-upload"
              type="file"
              ref={folderInputRef}
              className="w-0 h-0 absolute opacity-0 overflow-hidden"
              {...({ webkitdirectory: "true", directory: "true" } as any)}
              multiple
              onChange={handleFileChange}
            />

            {/* Botão de Arquivos via Label */}
            <Button 
              asChild
              variant="outline" 
              size="sm" 
              disabled={isProcessing}
              className={`w-full sm:min-w-[140px] h-10 font-normal shadow-none border-border cursor-pointer ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <label htmlFor="file-upload" className="flex items-center justify-center w-full h-full">
                <ImageIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                Arquivos
              </label>
            </Button>
            
            {/* Botão de Pasta via Label */}
            <Button 
              asChild
              variant="outline" 
              size="sm" 
              disabled={isProcessing}
              className={`w-full sm:min-w-[140px] h-10 font-normal shadow-none border-border cursor-pointer ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <label htmlFor="folder-upload" className="flex items-center justify-center w-full h-full">
                <FolderOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                Pastas
              </label>
            </Button>
          </div>

          <div className="text-[11px] text-muted-foreground/60 pt-4">
            Formatos suportados: JPG, PNG, GIF, BMP, SVG, MP4, MOV
          </div>
        </div>
      </Card>
    </div>
  );
}

