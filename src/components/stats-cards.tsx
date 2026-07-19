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
      <Card className="overflow-hidden glass-card transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:border-primary/30 group">
        <CardContent className="p-6 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10 flex items-center justify-between space-y-0 pb-2">
            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Total Encontrado</span>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-inner">
              <Files className="h-4 w-4" />
            </div>
          </div>
          <div className="pt-2 relative z-10">
            <div className="text-3xl font-bold tracking-tight">{total}</div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {processed} de {total} analisados ({total > 0 ? Math.round((processed / total) * 100) : 0}%)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Healthy Card */}
      <Card className="overflow-hidden glass-card transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:border-emerald-500/30 group">
        <CardContent className="p-6 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10 flex items-center justify-between space-y-0 pb-2">
            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Imagens Saudáveis</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 shadow-inner">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="pt-2 relative z-10">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
              {healthy}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {healthyPercent}% de taxa de integridade
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Corrupted Card */}
      <Card className="overflow-hidden glass-card transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:border-rose-500/30 group">
        <CardContent className="p-6 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10 flex items-center justify-between space-y-0 pb-2">
            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Imagens Corrompidas</span>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 shadow-inner">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="pt-2 relative z-10">
            <div className="text-3xl font-bold text-rose-600 dark:text-rose-400 tracking-tight">
              {corrupted}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {corruptedPercent}% das imagens analisadas
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Performance Card */}
      <Card className="overflow-hidden glass-card transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:border-indigo-500/30 group">
        <CardContent className="p-6 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10 flex items-center justify-between space-y-0 pb-2">
            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Velocidade & ETA</span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 shadow-inner">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="pt-2 relative z-10">
            <div className="text-3xl font-bold tracking-tight">
              {processed > 0 && total > processed ? `${speed.toFixed(1)}/s` : 'Ocioso'}
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-medium">
              {total > processed && speed > 0 ? `Restam aprox: ${formatTime(eta)}` : 'Análise finalizada'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
