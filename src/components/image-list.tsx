'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImageCheckResult } from '@/lib/image-checker';
import { 
  AlertCircle, 
  CheckCircle, 
  FileImage, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  Download
} from 'lucide-react';

interface ImageListProps {
  results: ImageCheckResult[];
  onSelectResult: (result: ImageCheckResult) => void;
  onExport: (format: 'csv' | 'json') => void;
}

export function ImageList({ results, onSelectResult, onExport }: ImageListProps) {
  const [filter, setFilter] = useState<'all' | 'healthy' | 'corrupted'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Filtrar e pesquisar resultados
  const filteredResults = useMemo(() => {
    return results.filter((item) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'healthy' && item.status === 'healthy') ||
        (filter === 'corrupted' && item.status === 'corrupted');
      
      const matchesSearch = item.fileName
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      return matchesFilter && matchesSearch;
    });
  }, [results, filter, searchQuery]);

  // Resetar página quando mudar o filtro ou pesquisa
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filteredResults.length / itemsPerPage));
  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredResults.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredResults, currentPage]);

  // Gerenciamento de miniaturas (ObjectURLs) apenas para os itens da página atual
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  useEffect(() => {
    const urls: Record<string, string> = {};
    
    paginatedResults.forEach((item) => {
      if (item.status === 'healthy') {
        try {
          urls[item.fileName] = URL.createObjectURL(item.fileRef);
        } catch (e) {
          console.error('Falha ao criar miniatura:', e);
        }
      }
    });

    setThumbnails(urls);

    return () => {
      Object.values(urls).forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [paginatedResults]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4 w-full">
      {/* Barra de Filtro, Pesquisa e Ações */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <Tabs 
          value={filter} 
          onValueChange={(val) => setFilter(val as any)} 
          className="w-full md:w-auto"
        >
          <TabsList className="grid grid-cols-3 w-full md:w-[320px] rounded-xl">
            <TabsTrigger value="all" className="rounded-lg font-medium text-xs">Todas</TabsTrigger>
            <TabsTrigger value="healthy" className="rounded-lg font-medium text-xs">Saudáveis</TabsTrigger>
            <TabsTrigger value="corrupted" className="rounded-lg font-medium text-xs">Corrompidas</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex w-full md:w-auto items-center gap-3">
          <div className="relative flex-1 md:w-[260px]">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-muted-foreground/60" />
            <Input
              placeholder="Buscar pelo nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl"
            />
          </div>

          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport('csv')}
              disabled={results.length === 0}
              className="h-10 rounded-xl font-medium gap-1.5"
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport('json')}
              disabled={results.length === 0}
              className="h-10 rounded-xl font-medium gap-1.5"
            >
              <Download className="h-4 w-4" />
              JSON
            </Button>
          </div>
        </div>
      </div>

      {/* Tabela de Resultados */}
      <div className="rounded-2xl border bg-background/50 backdrop-blur-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[80px] font-bold">Miniatura</TableHead>
              <TableHead className="font-bold">Nome do Arquivo</TableHead>
              <TableHead className="font-bold">Formato</TableHead>
              <TableHead className="font-bold">Tamanho</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="font-bold">Detalhe/Erro</TableHead>
              <TableHead className="w-[80px] text-right font-bold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedResults.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <FileImage className="h-10 w-10 text-muted-foreground/45" />
                    <p className="font-medium text-sm">Nenhum resultado encontrado</p>
                    <p className="text-xs text-muted-foreground/80">Importe imagens ou pastas para exibir a análise.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedResults.map((item, idx) => {
                const isHealthy = item.status === 'healthy';
                const thumbnailSrc = thumbnails[item.fileName];

                return (
                  <TableRow 
                    key={`${item.fileName}-${idx}`}
                    className="cursor-pointer hover:bg-accent/40 transition-colors duration-200"
                    onClick={() => onSelectResult(item)}
                  >
                    {/* Miniatura */}
                    <TableCell className="p-3">
                      <div className="h-10 w-10 rounded-lg border bg-accent/40 overflow-hidden flex items-center justify-center relative shrink-0">
                        {isHealthy && thumbnailSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img 
                            src={thumbnailSrc} 
                            alt="Miniatura" 
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-rose-500/80" />
                        )}
                      </div>
                    </TableCell>
                    
                    {/* Nome do arquivo */}
                    <TableCell className="font-semibold max-w-[200px] truncate">
                      {item.fileName}
                    </TableCell>
                    
                    {/* Formato */}
                    <TableCell className="font-medium uppercase text-xs tracking-wider">
                      {item.fileType}
                    </TableCell>
                    
                    {/* Tamanho */}
                    <TableCell className="font-medium text-xs text-muted-foreground">
                      {formatSize(item.fileSize)}
                    </TableCell>
                    
                    {/* Status */}
                    <TableCell>
                      <Badge 
                        variant={isHealthy ? 'default' : 'destructive'}
                        className={`rounded-lg py-0.5 px-2.5 font-bold text-xs gap-1 border-0
                          ${isHealthy ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}
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
                    </TableCell>
                    
                    {/* Detalhe/Erro */}
                    <TableCell className="max-w-[240px] truncate text-xs font-medium">
                      {isHealthy ? (
                        <span className="text-muted-foreground">
                          {item.dimensions ? `${item.dimensions.width}x${item.dimensions.height} px` : 'OK'}
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400 font-semibold">
                          {item.errorReason}
                        </span>
                      )}
                    </TableCell>
                    
                    {/* Ações */}
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-accent/80 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectResult(item);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      {filteredResults.length > itemsPerPage && (
        <div className="flex items-center justify-between px-2 pt-2">
          <p className="text-xs text-muted-foreground">
            Exibindo <span className="font-semibold text-foreground">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
            <span className="font-semibold text-foreground">
              {Math.min(currentPage * itemsPerPage, filteredResults.length)}
            </span>{' '}
            de <span className="font-semibold text-foreground">{filteredResults.length}</span> imagens.
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-semibold px-2">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
