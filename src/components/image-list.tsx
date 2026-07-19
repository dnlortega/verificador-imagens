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
import { Card, CardContent } from '@/components/ui/card';
import { ImageCheckResult, repairJpegBytes, repairImageViaCanvas } from '@/lib/image-checker';
import { toast } from 'sonner';
import { 
  AlertCircle, 
  CheckCircle, 
  FileImage, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  Download,
  LayoutGrid,
  List,
  AlertTriangle,
  Clock,
  Sparkles,
  Wrench
} from 'lucide-react';

interface ImageListProps {
  results: ImageCheckResult[];
  onSelectResult: (result: ImageCheckResult) => void;
  onExport: (format: 'csv' | 'json') => void;
}

export function ImageList({ results, onSelectResult, onExport }: ImageListProps) {
  const [filter, setFilter] = useState<'all' | 'healthy' | 'corrupted'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'gallery'>('gallery'); // Galeria agora é o padrão
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = viewMode === 'table' ? 8 : 16; // Mais itens por página na galeria

  // Filtrar e pesquisar resultados
  const filteredResults = useMemo(() => {
    const list = results.filter((item) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'healthy' && item.status === 'healthy') ||
        (filter === 'corrupted' && item.status === 'corrupted');
      
      const matchesSearch = item.fileName
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      return matchesFilter && matchesSearch;
    });

    return list.sort((a, b) => a.fileName.localeCompare(b.fileName, undefined, { numeric: true, sensitivity: 'base' }));
  }, [results, filter, searchQuery]);

  // Separar itens para a galeria
  const healthyItems = useMemo(() => {
    return filteredResults.filter(r => r.status === 'healthy');
  }, [filteredResults]);

  const corruptedItems = useMemo(() => {
    return filteredResults.filter(r => r.status === 'corrupted');
  }, [filteredResults]);

  // Resetar página ao alterar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery, viewMode]);

  // Paginação para tabela ou galeria geral
  const totalPages = Math.max(1, Math.ceil(filteredResults.length / itemsPerPage));
  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredResults.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredResults, currentPage, itemsPerPage]);

  // Gerenciamento de ObjectURLs em lote para a página atual (evita estouro de RAM)
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  useEffect(() => {
    const urls: Record<string, string> = {};
    
    // Gerar URLs apenas para itens saudáveis visíveis nesta página
    paginatedResults.forEach((item) => {
      if (item.status === 'healthy') {
        try {
          urls[item.fileName] = URL.createObjectURL(item.fileRef);
        } catch (e) {
          console.error('Falha ao criar ObjectURL na listagem:', e);
        }
      }
    });

    setThumbnails(urls);

    // Revogar ObjectURLs antigos
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
      {/* Barra de Filtro, Pesquisa e Alternador de Modos */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <Tabs 
            value={filter} 
            onValueChange={(val) => setFilter(val as any)} 
            className="w-full sm:w-auto"
          >
            <TabsList className="grid grid-cols-3 w-full sm:w-[320px] rounded-xl">
              <TabsTrigger value="all" className="rounded-lg font-medium text-xs">Todas</TabsTrigger>
              <TabsTrigger value="healthy" className="rounded-lg font-medium text-xs">Saudáveis</TabsTrigger>
              <TabsTrigger value="corrupted" className="rounded-lg font-medium text-xs">Corrompidas</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Alternador de Layout */}
          <div className="flex bg-muted rounded-xl p-1 shrink-0">
            <Button
              variant={viewMode === 'gallery' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setViewMode('gallery')}
              title="Visualizar em Galeria"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setViewMode('table')}
              title="Visualizar em Tabela"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex w-full lg:w-auto items-center gap-3">
          <div className="relative flex-1 lg:w-[260px]">
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
              size="icon"
              onClick={() => onExport('csv')}
              disabled={results.length === 0}
              className="h-10 w-10 rounded-xl"
              title="Exportar CSV"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onExport('json')}
              disabled={results.length === 0}
              className="h-10 w-10 rounded-xl"
              title="Exportar JSON"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Modo de Visualização 1: Tabela */}
      {viewMode === 'table' && (
        <div className="rounded-2xl border bg-background/40 backdrop-blur-md overflow-hidden animate-in fade-in-50 duration-300">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[80px] font-bold">Miniatura</TableHead>
                <TableHead className="font-bold">Nome do Arquivo</TableHead>
                <TableHead className="font-bold">Formato</TableHead>
                <TableHead className="font-bold">Tamanho</TableHead>
                <TableHead className="font-bold">Duração (ms)</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="font-bold">Detalhe/Erro</TableHead>
                <TableHead className="w-[80px] text-right font-bold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedResults.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-48 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FileImage className="h-10 w-10 text-muted-foreground/45" />
                      <p className="font-medium text-sm">Nenhum resultado encontrado</p>
                      <p className="text-xs text-muted-foreground/80">Modifique a busca ou faça novos uploads.</p>
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
                      
                      {/* Duração */}
                      <TableCell className="font-medium text-xs text-muted-foreground font-mono">
                        {item.durationMs}ms
                      </TableCell>
                      
                      {/* Status */}
                      <TableCell>
                        <Badge 
                          variant={isHealthy ? 'default' : 'destructive'}
                          className={`rounded-lg py-0.5 px-2.5 font-bold text-xs gap-1 border-0
                            ${isHealthy ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'}
                          `}
                        >
                          {isHealthy ? 'Saudável' : 'Corrompida'}
                        </Badge>
                      </TableCell>
                      
                      {/* Detalhe/Erro */}
                      <TableCell className="max-w-[240px] truncate text-xs font-semibold">
                        {isHealthy ? (
                          <span className="text-muted-foreground font-normal">
                            {item.dimensions ? `${item.dimensions.width}x${item.dimensions.height} px` : 'OK'}
                          </span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400">
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
      )}

      {/* Modo de Visualização 2: Galeria Visual (Exibição Premium Detalhada) */}
      {viewMode === 'gallery' && (
        <div className="space-y-6 animate-in fade-in-50 duration-300">
          {/* Seção 1: Fotos com Erros (Danificadas) - Em Destaque no topo para o usuário ver logo */}
          {paginatedResults.some(r => r.status === 'corrupted') && (filter === 'all' || filter === 'corrupted') && (
            <div className="space-y-3">
              <h3 className="text-sm font-extrabold text-rose-500 uppercase tracking-wider flex items-center gap-1.5 pl-1">
                <AlertTriangle className="h-4 w-4 animate-bounce" />
                Arquivos Danificados Detectados ({corruptedItems.length})
              </h3>

              <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-500">
                <textarea 
                  readOnly 
                  className="w-full h-28 p-3 text-[11px] font-mono bg-rose-500/5 border border-rose-500/20 rounded-xl text-rose-700 dark:text-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-500/30 resize-y shadow-inner cursor-text"
                  value={corruptedItems.map(item => item.fileName).join('\n')}
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  title="Clique para selecionar e copiar todos os nomes"
                  placeholder="Nenhum arquivo corrompido detectado..."
                />
                <p className="text-[10px] text-rose-500/70 mt-1 pl-1 font-semibold">
                  Clique dentro da caixa acima para selecionar todos os nomes e copiar (Ctrl+C).
                </p>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {paginatedResults.filter(r => r.status === 'corrupted').map((item, idx) => (
                  <Card 
                    key={`failed-${idx}`}
                    className="border border-rose-500/25 bg-rose-500/5 hover:bg-rose-500/10 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 rounded-xl overflow-hidden"
                    onClick={() => onSelectResult(item)}
                  >
                    <CardContent className="p-4 flex flex-col justify-between min-h-[150px] relative">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
                            <AlertCircle className="h-5 w-5" />
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground font-semibold">
                            {formatSize(item.fileSize)}
                          </span>
                        </div>
                        <p className="font-bold text-sm truncate max-w-full text-foreground" title={item.fileName}>
                          {item.fileName}
                        </p>
                        <p className="text-xs text-rose-700 dark:text-rose-300 font-semibold line-clamp-3 leading-relaxed">
                          {item.errorReason}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-rose-500/10 flex items-center justify-between">
                        <span className="text-[9px] font-bold text-muted-foreground">FORMATO: {item.fileType} ({item.durationMs}ms)</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 rounded-lg text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-500/10 border-0 shrink-0"
                          title="Tentar Corrigir e Baixar"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const toastId = toast.loading(`Corrigindo ${item.fileName}...`);
                            try {
                              let repairedBlob: Blob;
                              if (item.fileType === 'JPEG' && item.errorReason?.toLowerCase().includes('truncada')) {
                                repairedBlob = await repairJpegBytes(item.fileRef);
                              } else {
                                repairedBlob = await repairImageViaCanvas(item.fileRef);
                              }
                              const url = URL.createObjectURL(repairedBlob);
                              const link = document.createElement('a');
                              link.href = url;
                              const ext = item.fileType === 'JPEG' && item.errorReason?.toLowerCase().includes('truncada') ? 'jpg' : 'png';
                              const baseName = item.fileName.substring(0, item.fileName.lastIndexOf('.')) || item.fileName;
                              link.setAttribute('download', `${baseName}-reparada.${ext}`);
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              URL.revokeObjectURL(url);
                              toast.success('Imagem corrigida com sucesso!', { id: toastId });
                            } catch (err) {
                              toast.error(`Falha no reparo: ${(err as Error).message}`, { id: toastId });
                            }
                          }}
                        >
                          <Wrench className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Seção 2: Fotos Íntegras (Saudáveis) */}
          {paginatedResults.some(r => r.status === 'healthy') && (filter === 'all' || filter === 'healthy') && (
            <div className="space-y-3">
              <h3 className="text-sm font-extrabold text-emerald-500 uppercase tracking-wider flex items-center gap-1.5 pl-1">
                <CheckCircle className="h-4 w-4" />
                Imagens Íntegras ({healthyItems.length})
              </h3>
              
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                {paginatedResults.filter(r => r.status === 'healthy').map((item, idx) => {
                  const thumbnailSrc = thumbnails[item.fileName];
                  return (
                    <div 
                      key={`ok-${idx}`}
                      className="group border rounded-xl overflow-hidden aspect-square bg-accent/30 relative cursor-pointer hover:border-emerald-500/50 hover:shadow-sm transition-all duration-200 hover:-translate-y-0.5"
                      onClick={() => onSelectResult(item)}
                    >
                      {thumbnailSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={thumbnailSrc} 
                          alt={item.fileName} 
                          className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <FileImage className="h-6 w-6 text-muted-foreground/60" />
                        </div>
                      )}

                      {/* Tooltip Overlay no hover */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-2 text-white">
                        <p className="text-[10px] font-bold truncate max-w-full">{item.fileName}</p>
                        <p className="text-[8px] opacity-80 mt-0.5">
                          {item.dimensions ? `${item.dimensions.width}x${item.dimensions.height}` : 'Imagem OK'}
                        </p>
                        <p className="text-[8px] opacity-80 font-mono mt-0.5">{item.durationMs}ms</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Estado Vazio na Galeria */}
          {filteredResults.length === 0 && (
            <div className="h-48 text-center text-muted-foreground border border-dashed rounded-2xl flex flex-col items-center justify-center space-y-2">
              <FileImage className="h-10 w-10 text-muted-foreground/45" />
              <p className="font-medium text-sm">Nenhum resultado encontrado</p>
              <p className="text-xs text-muted-foreground/80">Altere o filtro ou envie novos arquivos.</p>
            </div>
          )}
        </div>
      )}

      {/* Paginação */}
      {filteredResults.length > itemsPerPage && (
        <div className="flex items-center justify-between px-2 pt-2 border-t mt-4">
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
