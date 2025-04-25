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

const supabaseUrl = "https://yxerhuojxxxckatylftd.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4ZXJodW9qeHh4Y2thdHlsZnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MDk3NDQsImV4cCI6MjA2MDM4NTc0NH0.u2NNzl2E3nI2H5OWquif0C3EL3SKEydwxtmiGoqwjMs"; // Substitua pela sua chave
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

// Tipagem para as métricas por usuário
interface UserMetric {
  cpf: string;
  Dias_Maximo: number;
  Dias_Acumulados: number;
  Aparicao: number;
}

const Dashboard = () => {
  const [totalProcesses, setTotalProcesses] = useState(0);
  const [historicoData, setHistoricoData] = useState([]);
  const [uniqueProcesses, setUniqueProcesses] = useState([]);
  const [selectedProcess, setSelectedProcess] = useState('');
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [maxResponseTimes, setMaxResponseTimes] = useState<{ unidade: string; maxDias: number }[]>([]);
  const [unitMetrics, setUnitMetrics] = useState<{ unidade: string; Dias_Maximo: number; Dias_Acumulados: number; Aparicao: number }[]>([]);
  const [userMetrics, setUserMetrics] = useState<UserMetric[]>([]);

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
    };

    fetchData();
  }, []);

  const calculateMaxResponseTimes = (data) => {
    const unitTimes = {};
    
    data.forEach(item => {
      if (item.Unidade && typeof item.diasEntreDocumentos === 'number') {
        const dias = Math.abs(item.diasEntreDocumentos);
        if (!unitTimes[item.Unidade] || dias > unitTimes[item.Unidade]) {
          unitTimes[item.Unidade] = dias;
        }
      }
    });

    // Filter out empty unit names and sort by max days
    return Object.entries(unitTimes)
      .filter(([unidade]) => unidade.trim() !== '')
      .map(([unidade, maxDias]) => ({
        unidade,
        maxDias,
      }))
      .sort((a, b) => b.maxDias - a.maxDias);
  };

  useEffect(() => {
    if (selectedProcess && historicoData.length > 0) {
      const filteredData = historicoData.filter(
        item => `${item.Processo} - ${item.Objeto}` === selectedProcess
      );

      if (filteredData.length > 0) {
        const sortedData = [...filteredData].sort((a, b) => 
          new Date(b['Data/Hora']).getTime() - new Date(a['Data/Hora']).getTime()
        );

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
          const currentDate = new Date(item['Data/Hora']);
          
          let diasEntreDocumentos = null;
          if (index < array.length - 1) {
            const nextDate = new Date(array[index + 1]['Data/Hora']);
            const timeDiff = nextDate.getTime() - currentDate.getTime();
            if (formatDate(currentDate) !== formatDate(nextDate)) {
              diasEntreDocumentos = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
            }
          }
          
          const firstDate = new Date(array[array.length - 1]['Data/Hora']);
          const timeDiffTotal = currentDate.getTime() - firstDate.getTime();
          const diasAcumulados = Math.floor(timeDiffTotal / (1000 * 60 * 60 * 24));
          
          return {
            ...item,
            diasEntreDocumentos,
            diasAcumulados
          };
        });

        setProcessedData(processedData);
        
        // Calculate max response times from the processed data
        const maxTimes = calculateMaxResponseTimes(processedData);
        setMaxResponseTimes(maxTimes);

        // === agrupa por CPF ===
        const mapMetrics: Record<string, UserMetric> = processedData.reduce((acc, item) => {
          const cpf = item.CPF || '';
          const dias = typeof item.diasEntreDocumentos === 'number'
            ? Math.abs(item.diasEntreDocumentos)
            : 0;

          if (!acc[cpf]) {
            acc[cpf] = {
              cpf,
              Dias_Maximo: dias,
              Dias_Acumulados: dias,
              Aparicao: 1,
            };
          } else {
            acc[cpf].Dias_Maximo   = Math.max(acc[cpf].Dias_Maximo, dias);
            acc[cpf].Dias_Acumulados += dias;
            acc[cpf].Aparicao      += 1;
          }
          return acc;
        }, {} as Record<string, UserMetric>);

        // transforma em array e ordena (opcional)
        const metricsArray = Object.values(mapMetrics)
          .sort((a, b) => a.Dias_Maximo - b.Dias_Maximo);

        setUserMetrics(metricsArray);
      }
    } else {
      setProcessedData([]);
      setMaxResponseTimes([]);
      setUserMetrics([]);
    }
  }, [selectedProcess, historicoData]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

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
                Processos Concluídos
              </p>
              <h3 className="text-2xl font-bold">45</h3>
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
              <h3 className="text-2xl font-bold">45</h3>
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
                Pendentes
              </p>
              <h3 className="text-2xl font-bold">33</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <Select onValueChange={setSelectedProcess}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um Processo" />
          </SelectTrigger>
          <SelectContent>
            {uniqueProcesses.map((processo, index) => (
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
                {/* <CardDescription>Dias máximos entre documentos por unidade</CardDescription> */}
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
                
                <Bar dataKey="Dias_Maximo"   stackId="a" fill="orange"   name="Dias Máximo" />
                <Bar dataKey="Dias_Acumulados" stackId="a" fill="green" name="Dias Acumulados" />
                <Bar dataKey="Aparicao"      stackId="a" fill="blue"     name="Aparições" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </Layout>
  );
};

export default Dashboard;