/**
 * Exemplo de Integração do Frontend (Vite + React) com o Sistema de Impressão
 * 
 * Este arquivo mostra como enviar pedidos para impressão a partir do seu
 * frontend React que já consome o Supabase.
 */

import { createClient } from '@supabase/supabase-js';

// Tipos
interface PrintStation {
  id: string;
  name: string;
  token: string;
}

interface PrintJob {
  id: string;
  station_id: string;
  payload: string;
  status: 'pending' | 'printing' | 'printed' | 'error';
  created_at: string;
}

// Cliente Supabase (você já deve ter isso no seu projeto)
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ============================================================================
// EXEMPLO 1: Classe de Serviço de Impressão
// ============================================================================

export class PrintService {
  /**
   * Envia um pedido para impressão em uma estação específica
   */
  static async sendToPrint(stationToken: string, content: string): Promise<PrintJob> {
    // 1. Busca a estação pelo token
    const { data: station, error: stationError } = await supabase
      .from('print_stations')
      .select('id, name')
      .eq('token', stationToken)
      .single();

    if (stationError || !station) {
      throw new Error(`Estação não encontrada: ${stationToken}`);
    }

    // 2. Cria o job de impressão
    const { data: job, error: jobError } = await supabase
      .from('print_jobs')
      .insert({
        station_id: station.id,
        payload: content,
        status: 'pending'
      })
      .select()
      .single();

    if (jobError || !job) {
      throw new Error('Erro ao criar job de impressão');
    }

    console.log(`✅ Job ${job.id} enviado para ${station.name}`);
    return job as PrintJob;
  }

  /**
   * Lista todas as estações disponíveis
   */
  static async listStations(): Promise<PrintStation[]> {
    const { data, error } = await supabase
      .from('print_stations')
      .select('id, name, token')
      .order('name');

    if (error) {
      throw new Error('Erro ao listar estações');
    }

    return (data as PrintStation[]) || [];
  }

  /**
   * Verifica o status de um job
   */
  static async getJobStatus(jobId: string): Promise<PrintJob> {
    const { data, error } = await supabase
      .from('print_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !data) {
      throw new Error('Job não encontrado');
    }

    return data as PrintJob;
  }

  /**
   * Monitora o status de um job em tempo real
   */
  static async watchJob(
    jobId: string, 
    onUpdate: (job: PrintJob) => void
  ): Promise<() => void> {
    // Busca inicial
    const initialJob = await this.getJobStatus(jobId);
    onUpdate(initialJob);

    // Assina mudanças
    const channel = supabase
      .channel(`job-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'print_jobs',
          filter: `id=eq.${jobId}`
        },
        (payload) => {
          onUpdate(payload.new as PrintJob);
        }
      )
      .subscribe();

    // Retorna função para cancelar
    return () => {
      supabase.removeChannel(channel);
    };
  }
}

// ============================================================================
// EXEMPLO 2: Formatação de Tickets
// ============================================================================

export class TicketFormatter {
  /**
   * Formata um pedido para impressão
   */
  static formatPedido(pedido: any): string {
    const lineSeparator = '='.repeat(40);
    const dashSeparator = '-'.repeat(40);

    return `
${lineSeparator}
           PEDIDO #${pedido.numero}
${lineSeparator}

Data: ${new Date().toLocaleString('pt-BR')}
Mesa: ${pedido.mesa || 'Balcão'}
Cliente: ${pedido.cliente || 'Não informado'}

${dashSeparator}
ITENS
${dashSeparator}

${pedido.itens.map((item: any) => 
  `${item.quantidade}x ${item.nome.padEnd(25)} R$ ${item.total.toFixed(2)}`
).join('\n')}

${dashSeparator}

Subtotal: ${' '.repeat(24)} R$ ${pedido.subtotal.toFixed(2)}
${pedido.desconto > 0 ? `Desconto: ${' '.repeat(24)} R$ ${pedido.desconto.toFixed(2)}\n` : ''}
${pedido.taxa_servico > 0 ? `Taxa Serviço: ${' '.repeat(19)} R$ ${pedido.taxa_servico.toFixed(2)}\n` : ''}

TOTAL: ${' '.repeat(27)} R$ ${pedido.total.toFixed(2)}

${dashSeparator}

Forma de Pagamento: ${pedido.forma_pagamento}

${pedido.observacoes ? `Observações:\n${pedido.observacoes}\n\n` : ''}

${lineSeparator}
      Obrigado pela preferência!
${lineSeparator}


`;
  }

  /**
   * Formata pedido para cozinha (simplificado)
   */
  static formatPedidoCozinha(pedido: any): string {
    return `
========================================
   PEDIDO COZINHA #${pedido.numero}
========================================

Mesa: ${pedido.mesa || 'Balcão'}
Hora: ${new Date().toLocaleTimeString('pt-BR')}

----------------------------------------
ITENS
----------------------------------------

${pedido.itens.filter((item: any) => item.categoria === 'comida').map((item: any) => 
  `${item.quantidade}x ${item.nome}${item.observacao ? '\n   OBS: ' + item.observacao : ''}`
).join('\n\n')}

----------------------------------------

${pedido.observacoes ? `OBSERVAÇÕES GERAIS:\n${pedido.observacoes}\n\n` : ''}
========================================
`;
  }
}

// ============================================================================
// EXEMPLO 3: Hook React para Impressão
// ============================================================================

import { useState, useCallback } from 'react';

export function usePrint(stationToken: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastJobId, setLastJobId] = useState<string | null>(null);

  const print = useCallback(async (content: string) => {
    setLoading(true);
    setError(null);

    try {
      const job = await PrintService.sendToPrint(stationToken, content);
      setLastJobId(job.id);
      return job;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [stationToken]);

  const printPedido = useCallback(async (pedido: any) => {
    const content = TicketFormatter.formatPedido(pedido);
    return print(content);
  }, [print]);

  return {
    print,
    printPedido,
    loading,
    error,
    lastJobId
  };
}

// ============================================================================
// EXEMPLO 4: Componente React de Impressão
// ============================================================================

export function PrintButton({ 
  pedido, 
  stationToken 
}: { 
  pedido: any; 
  stationToken: string; 
}) {
  const { printPedido, loading, error } = usePrint(stationToken);
  const [status, setStatus] = useState<string>('');

  const handlePrint = async () => {
    try {
      const job = await printPedido(pedido);
      setStatus('Enviado para impressão!');

      // Monitora o status
      const unwatch = await PrintService.watchJob(job.id, (updatedJob) => {
        if (updatedJob.status === 'printed') {
          setStatus('✅ Impresso com sucesso!');
          setTimeout(() => unwatch(), 2000);
        } else if (updatedJob.status === 'error') {
          setStatus(`❌ Erro: ${updatedJob.error_message}`);
          setTimeout(() => unwatch(), 5000);
        }
      });
    } catch (err) {
      setStatus('Erro ao enviar para impressão');
    }
  };

  return (
    <div>
      <button onClick={handlePrint} disabled={loading}>
        {loading ? 'Enviando...' : '🖨️ Imprimir'}
      </button>
      {status && <p>{status}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

// ============================================================================
// EXEMPLO 5: Uso Direto em um Componente
// ============================================================================

export async function handleFinalizarPedido(pedido: any) {
  try {
    // 1. Salva o pedido no banco (seu fluxo normal)
    const { data: pedidoSalvo } = await supabase
      .from('pedidos')
      .insert(pedido)
      .select()
      .single();

    // 2. Envia para impressão no caixa
    await PrintService.sendToPrint(
      'token-caixa-01',
      TicketFormatter.formatPedido(pedidoSalvo)
    );

    // 3. Envia para impressão na cozinha (se houver itens de comida)
    const temComida = pedido.itens.some((i: any) => i.categoria === 'comida');
    if (temComida) {
      await PrintService.sendToPrint(
        'token-cozinha-01',
        TicketFormatter.formatPedidoCozinha(pedidoSalvo)
      );
    }

    alert('Pedido finalizado e enviado para impressão!');
  } catch (error) {
    console.error('Erro:', error);
    alert('Erro ao finalizar pedido');
  }
}

// ============================================================================
// EXEMPLO 6: Configuração de Tokens por Ambiente
// ============================================================================

export const PRINT_STATIONS = {
  caixa: 'token-caixa-01',
  cozinha: 'token-cozinha-01',
  bar: 'token-bar-01',
  delivery: 'token-delivery-01'
};

// Uso:
// await PrintService.sendToPrint(PRINT_STATIONS.caixa, ticket);
