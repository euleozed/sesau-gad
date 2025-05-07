import React, { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import Papa from 'papaparse';
import Layout from '@/components/Layout';

interface Processo {
  numero_processo: string;
  objeto: string;
  dias_desde_ultima_movimentacao: number;
  data_ultima_movimentacao: string;
  unidade: string;
}

const Processos = () => {
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const carregarProcessos = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Iniciando carregamento do arquivo CSV...');
        
        const response = await fetch('/backend/df.csv');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            console.log('Colunas encontradas:', results.meta.fields);
            
            // Primeiro, vamos identificar os processos homologados
            const processosHomologados = new Set<string>();
            results.data.forEach((row: any) => {
              if (row['Processo'] && row['Documento']?.includes('Homologação')) {
                processosHomologados.add(row['Processo']);
              }
            });

            // Criar um Map para armazenar os objetos dos processos
            const objetosMap = new Map<string, string>();
            results.data.forEach((row: any) => {
              if (row['Processo'] && row['Objeto'] && !objetosMap.has(row['Processo'])) {
                objetosMap.set(row['Processo'], row['Objeto']);
              }
            });

            // Converter os dados para o formato necessário
            const dados = results.data.map((row: any) => ({
              processo: row['Processo'],
              data_hora: new Date(row['Data/Hora']),
              unidade: row['Unidade']
            })).filter(row => row.processo && row.data_hora);

            // Agrupar por processo e encontrar a última movimentação
            const processosAgrupados = dados.reduce((acc: { [key: string]: any }, curr) => {
              if (!acc[curr.processo] || acc[curr.processo].data_hora < curr.data_hora) {
                acc[curr.processo] = curr;
              }
              return acc;
            }, {});

            // Calcular dias desde a última movimentação
            const dataHoje = new Date();
            const processosAtrasados = Object.values(processosAgrupados)
              .map((processo: any) => {
                const diffTime = Math.abs(dataHoje.getTime() - processo.data_hora.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                return {
                  numero_processo: processo.processo,
                  objeto: objetosMap.get(processo.processo) || 'Objeto não encontrado',
                  dias_desde_ultima_movimentacao: diffDays,
                  data_ultima_movimentacao: processo.data_hora.toLocaleDateString('pt-BR'),
                  unidade: processo.unidade
                };
              })
              .filter(processo => 
                processo.dias_desde_ultima_movimentacao > 15 && 
                !processosHomologados.has(processo.numero_processo)
              )
              .sort((a, b) => b.dias_desde_ultima_movimentacao - a.dias_desde_ultima_movimentacao);

            console.log('Processos atrasados encontrados:', processosAtrasados.length);
            setProcessos(processosAtrasados);
            setLoading(false);
          },
          error: (error) => {
            console.error('Erro ao fazer parse do CSV:', error);
            setError('Erro ao processar o arquivo CSV');
            setLoading(false);
          }
        });
      } catch (error) {
        console.error('Erro ao carregar os processos:', error);
        setError('Erro ao carregar os dados dos processos');
        setLoading(false);
      }
    };

    carregarProcessos();
  }, []);

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Processos Atrasados</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="text-center py-4">
                Carregando processos...
              </div>
            )}
            {error && (
              <div className="text-center py-4 text-red-500">
                {error}
              </div>
            )}
            {!loading && !error && (
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número do Processo</TableHead>
                      <TableHead>Objeto</TableHead>
                      <TableHead>Última Movimentação</TableHead>
                      <TableHead>Dias Parado</TableHead>
                      <TableHead>Unidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          Nenhum processo atrasado encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      processos.map((processo, index) => (
                        <TableRow key={index}>
                          <TableCell>{processo.numero_processo}</TableCell>
                          <TableCell>{processo.objeto}</TableCell>
                          <TableCell>{processo.data_ultima_movimentacao}</TableCell>
                          <TableCell>{processo.dias_desde_ultima_movimentacao}</TableCell>
                          <TableCell>{processo.unidade}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Processos; 