import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { FileCheck, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createClient } from '@supabase/supabase-js';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useParams } from 'react-router-dom';
import { processQueries } from '@/services/supabase';

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const COLORS = ['#0c93e4', '#064f83', '#36adf6', '#005d9e'];

const RadarChartComponent = ({ radarData }) => (
  <RadarChart outerRadius={90} width={730} height={250} data={radarData}>
    <PolarGrid />
    <PolarAngleAxis dataKey="unidade" />
    <PolarRadiusAxis />
    <Radar name="Max Dias" dataKey="maxDias" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
  </RadarChart>
);

interface UserMetric {
  cpf: string;
  Dias_Maximo: number;
  Dias_Acumulados: number;
  Aparicao: number;
}

interface HistoricoItem {
  id: string;
  'Data/Hora': string;
  Unidade: string;
  CPF: string;
  Processo: string;
  Protocolo: string;
  Documento: string;
  Objeto?: string;
  diasEntreDocumentos?: number;
  diasAcumulados?: number;
}

const Dashboard = () => {
  const [totalProcesses, setTotalProcesses] = useState(0);
  const [historicoData, setHistoricoData] = useState<any[]>([]);
  const [concludedCount, setConcludedCount] = useState<number>(0);
  const [uniqueProcesses, setUniqueProcesses] = useState([]);
  const [selectedProcess, setSelectedProcess] = useState('');
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [maxResponseTimes, setMaxResponseTimes] = useState<{ unidade: string; maxDias: number }[]>([]);
  const [unitMetrics, setUnitMetrics] = useState<{ unidade: string; Dias_Maximo: number; Dias_Acumulados: number; Aparicao: number }[]>([]);
  const [userMetrics, setUserMetrics] = useState<UserMetric[]>([]);
  const [overdueProcessesCount, setOverdueProcessesCount] = useState<number>(0);
  const [overdueDocumentsCount, setOverdueDocumentsCount] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      // Fetch all data and count distinct 'Processo'
      const { data: processData, error: processError } = await supabase
        .from('historico')
        .select('Processo');

      if (processError) {
        console.error('Erro ao carregar processos:', processError);
      } else {
        const uniqueProcessCount = new Set(processData.map(item => item.Processo)).size;
        setTotalProcesses(uniqueProcessCount);
      }

      // Fetch all historical data
      const { data: historicoData, error: historicoError } = await supabase
        .from('historico')
        .select('*')
        .order('"Data/Hora"', { ascending: false });

      if (historicoError) {
        console.error('Erro ao carregar histórico:', historicoError);
      } else {
        setHistoricoData(historicoData);

        // Calcula Processos Concluídos
        const concluidosSet = new Set<string>();
        historicoData.forEach(item => {
          if (item.Documento?.includes('Homologação')) {
            concluidosSet.add(item.Processo);
          }
        });
        setConcludedCount(concluidosSet.size);

        // Agrupa os processos
        const processosPorId = new Map();
        historicoData.forEach(item => {
          if (!processosPorId.has(item.Processo)) {
            processosPorId.set(item.Processo, []);
          }
          processosPorId.get(item.Processo).push(item);
        });

        // Para cada processo, calcula os dias desde a última movimentação
        let atrasados = 0;
        processosPorId.forEach((registros) => {
          if (registros.length > 0) {
            // Ordena os registros por data, mais recente primeiro
            registros.sort((a, b) => 
              new Date(b['Data/Hora']).getTime() - new Date(a['Data/Hora']).getTime()
            );

            const ultimaData = new Date(registros[0]['Data/Hora']);
            const hoje = new Date();
            const diasDesdeUltima = Math.floor(
              (hoje.getTime() - ultimaData.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (diasDesdeUltima > 15) {
              atrasados++;
            }
          }
        });

        setOverdueProcessesCount(atrasados);
      }

      // Fetch unique processes with objects
      const { data: uniqueProcessData, error: uniqueProcessError } = await supabase
        .from('historico')
        .select('Processo, Objeto')
        .neq('Processo', null);

      if (uniqueProcessError) {
        console.error('Erro ao carregar processos únicos:', uniqueProcessError);
      } else {
        const uniqueProcessesSet = new Set(uniqueProcessData.map(item => `${item.Processo} - ${item.Objeto}`));
        setUniqueProcesses(Array.from(uniqueProcessesSet));
      }

      // Processar dados para calcular a métrica de documentos atrasados
      if (processedData.length > 0) {
        const overdueDocsCount = processedData.reduce((count, item) => {
          if (item.diasEntreDocumentos > 15) {
            return count + 1;
          }
          return count;
        }, 0);
        setOverdueDocumentsCount(overdueDocsCount);
      }
    };

    fetchData();
  }, []);

  const calculateMaxResponseTimes = (data: HistoricoItem[]) => {
    const unitTimes: { [key: string]: number } = {};
    
    data.forEach(item => {
      if (item.Unidade && typeof item.diasEntreDocumentos === 'number') {
        const dias = Math.abs(item.diasEntreDocumentos);
        if (!unitTimes[item.Unidade] || dias > unitTimes[item.Unidade]) {
          unitTimes[item.Unidade] = dias;
        }
      }
    });

    return Object.entries(unitTimes)
      .filter(([unidade]) => unidade.trim() !== '')
      .map(([unidade, maxDias]) => ({
        unidade,
        maxDias: maxDias as number,
      }))
      .sort((a, b) => (b.maxDias as number) - (a.maxDias as number));
  };

  useEffect(() => {
    if (selectedProcess && historicoData.length > 0) {
      const processData = historicoData.filter(
        item => item.Processo === selectedProcess.split(' - ')[0]
      );

      if (processData.length > 0) {
        const sortedData = [...processData].sort((a, b) => {
          const dateA = new Date(a['Data/Hora'] as string).getTime();
          const dateB = new Date(b['Data/Hora'] as string).getTime();
          return dateB - dateA;
        });

        const currentDate = new Date();
        const lastRecord = {
          id: 'current',
          'Data/Hora': currentDate.toISOString(),
          Unidade: '',
          CPF: '',
          Processo: '',
          Protocolo: '',
          Documento: 'Desde a última movimentação'
        };

        const dataWithCurrent = [lastRecord, ...sortedData];
        const processedData = dataWithCurrent.map((item, index, array) => {
          const currentDate = new Date(item['Data/Hora'] as string).getTime();
          
          let diasEntreDocumentos: number | null = null;
          if (index < array.length - 1) {
            const nextDate = new Date(array[index + 1]['Data/Hora'] as string).getTime();
            const timeDiff = nextDate - currentDate;
            if (formatDate(new Date(currentDate)) !== formatDate(new Date(nextDate))) {
              diasEntreDocumentos = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
            }
          }
          
          const firstDate = new Date(array[array.length - 1]['Data/Hora'] as string).getTime();
          const timeDiffTotal = currentDate - firstDate;
          const diasAcumulados = Math.floor(timeDiffTotal / (1000 * 60 * 60 * 24));
          
          return {
            ...item,
            diasEntreDocumentos,
            diasAcumulados
          };
        });

        setProcessedData(processedData);
        
        // Atualiza os tempos máximos de resposta
        const maxTimes = calculateMaxResponseTimes(processedData);
        setMaxResponseTimes(maxTimes);

        // Calcula métricas por usuário
        const userMetricsData = processedData.reduce((acc, item) => {
          if (!item.CPF) return acc;

          const existingMetric = acc.find(metric => metric.cpf === item.CPF);
          
          if (existingMetric) {
            existingMetric.Aparicao += 1;
            if (item.diasEntreDocumentos) {
              const dias = Math.abs(item.diasEntreDocumentos);
              existingMetric.Dias_Maximo = Math.max(existingMetric.Dias_Maximo, dias);
              existingMetric.Dias_Acumulados += dias;
            }
          } else {
            acc.push({
              cpf: item.CPF,
              Dias_Maximo: item.diasEntreDocumentos ? Math.abs(item.diasEntreDocumentos) : 0,
              Dias_Acumulados: item.diasEntreDocumentos ? Math.abs(item.diasEntreDocumentos) : 0,
              Aparicao: 1
            });
          }
          return acc;
        }, [] as UserMetric[]);

        setUserMetrics(userMetricsData);

        console.log('Dados processados:', processedData);
        console.log('Tempos máximos:', maxTimes);
        console.log('Métricas por usuário:', userMetricsData);
      }
    }
  }, [selectedProcess, historicoData]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const filteredProcesses = uniqueProcesses.filter(processo =>
    processo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-sei-800">Dashboard</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card className="border-sei-100">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-sei-100 p-3 rounded-full">
              <FileCheck className="h-6 w-6 text-sei-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total de Processos
              </p>
              <h3 className="text-2xl font-bold">{totalProcesses}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-sei-100">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-sei-100 p-3 rounded-full">
              <CheckCircle className="h-6 w-6 text-sei-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Processos Homologados
              </p>
              <h3 className="text-2xl font-bold">{concludedCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-sei-100">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-sei-100 p-3 rounded-full">
              <Clock className="h-6 w-6 text-sei-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Em Andamento
              </p>
              <h3 className="text-2xl font-bold">{totalProcesses - concludedCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-sei-100">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-sei-100 p-3 rounded-full">
              <AlertTriangle className="h-6 w-6 text-sei-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Processos Atrasados
              </p>
              <h3 className="text-2xl font-bold">{overdueProcessesCount}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <input
          type="text"
          placeholder="Digite uma palavra-chave para filtrar processos"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4 p-2 border border-gray-300 rounded w-full"
        />
        <Select onValueChange={setSelectedProcess}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um Processo" />
          </SelectTrigger>
          <SelectContent>
            {filteredProcesses.map((processo, index) => (
              <SelectItem key={index} value={processo}>
                {processo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedProcess && (
        <>
          <Card className="border-sei-100 mt-6">
            <CardHeader>
              <CardTitle>Histórico do Processo</CardTitle>
              <CardDescription>Todos os registros do histórico do processo {selectedProcess}</CardDescription>
            </CardHeader>
            <CardContent>
              {processedData.length === 0 ? (
                <p>Nenhum dado disponível para o processo selecionado.</p>
              ) : (
                <div className="max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Unidade</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Protocolo</TableHead>
                        <TableHead>Documento</TableHead>
                        <TableHead>Dias entre Documentos</TableHead>
                        <TableHead>Dias Acumulados</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processedData.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{formatDate(item['Data/Hora'])}</TableCell>
                          <TableCell>{item.Unidade}</TableCell>
                          <TableCell>{item.CPF}</TableCell>
                          <TableCell>{item.Protocolo}</TableCell>
                          <TableCell>{item.Documento}</TableCell>
                          <TableCell>
                            {typeof item.diasEntreDocumentos === 'number' ? Math.abs(item.diasEntreDocumentos) : '-'}
                          </TableCell>
                          <TableCell>{item.diasAcumulados}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {maxResponseTimes.length > 0 && (
            <Card className="border-sei-100 mt-6">
              <CardHeader>
                <CardTitle>Tempo Máximo de Resposta por Unidade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={maxResponseTimes} cx="50%" cy="50%" outerRadius="80%">
                      <PolarGrid />
                      <PolarAngleAxis dataKey="unidade" />
                      <PolarRadiusAxis />
                      <Radar
                        name="Dias"
                        dataKey="maxDias"
                        stroke="#0c93e4"
                        fill="#0c93e4"
                        fillOpacity={0.6}
                      />
                      <Tooltip formatter={(value) => [`${value} dias`, 'Tempo Máximo']} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {userMetrics.length > 0 && (
        <Card className="border-sei-100 mt-6">
          <CardHeader>
            <CardTitle>Análise Temporal por Usuário</CardTitle>
            <CardDescription>
              • Laranja = indica o maior período (dias) para a produção de um documento
              <br />
              • Verde = indica os dias acumulados de cada servido envolvido no processo
              <br />
              • Azul = indica a quantidade de aparições do servidor no processso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart
                layout="vertical"
                data={userMetrics}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <XAxis type="number" />
                <YAxis dataKey="cpf" type="category" width={150} />
                <Tooltip formatter={(value) => [value, '']} />
                <Legend />
                <Bar dataKey="Dias_Maximo" stackId="a" fill="orange" name="Dias Máximo" />
                <Bar dataKey="Dias_Acumulados" stackId="a" fill="green" name="Dias Acumulados" />
                <Bar dataKey="Aparicao" stackId="a" fill="blue" name="Aparições" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </Layout>
  );
};

export default Dashboard;