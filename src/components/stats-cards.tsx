'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldCheck, ShieldAlert, Files, Activity } from 'lucide-react';

interface StatsCardsProps {
  total: number;
  healthy: number;
  corrupted: number;
  processed: number;
  speed: number; // Imagens/segundo
  eta: number; // Segundos restantes
}

export function StatsCards({ total, healthy, corrupted, processed, speed, eta }: StatsCardsProps) {
  const healthyPercent = processed > 0 ? Math.round((healthy / processed) * 100) : 0;
  const corruptedPercent = processed > 0 ? Math.round((corrupted / processed) * 100) : 0;
  
  const formatTime = (seconds: number) => {
    if (seconds === Infinity || isNaN(seconds) || seconds <= 0) return 'Concluído';
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.ceil(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="grid gap-4 md:grid-cols-4 w-full">
      {/* Total Card */}
      <Card className="overflow-hidden border bg-background/50 backdrop-blur-md transition-all duration-300 hover:shadow-md hover:border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <span className="text-sm font-medium text-muted-foreground">Total Encontrado</span>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Files className="h-4 w-4" />
            </div>
          </div>
          <div className="pt-2">
            <div className="text-2xl font-bold tracking-tight">{total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {processed} de {total} analisados ({total > 0 ? Math.round((processed / total) * 100) : 0}%)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Healthy Card */}
      <Card className="overflow-hidden border bg-background/50 backdrop-blur-md transition-all duration-300 hover:shadow-md hover:border-emerald-500/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <span className="text-sm font-medium text-muted-foreground">Imagens Saudáveis</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="pt-2">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
              {healthy}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {healthyPercent}% de taxa de integridade
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Corrupted Card */}
      <Card className="overflow-hidden border bg-background/50 backdrop-blur-md transition-all duration-300 hover:shadow-md hover:border-rose-500/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <span className="text-sm font-medium text-muted-foreground">Imagens Corrompidas</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="pt-2">
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 tracking-tight">
              {corrupted}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {corruptedPercent}% das imagens analisadas
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Performance Card */}
      <Card className="overflow-hidden border bg-background/50 backdrop-blur-md transition-all duration-300 hover:shadow-md hover:border-indigo-500/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <span className="text-sm font-medium text-muted-foreground">Velocidade & ETA</span>
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="pt-2">
            <div className="text-2xl font-bold tracking-tight">
              {processed > 0 && total > processed ? `${speed.toFixed(1)}/s` : 'Ocioso'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {total > processed && speed > 0 ? `Restam aprox: ${formatTime(eta)}` : 'Análise finalizada'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
