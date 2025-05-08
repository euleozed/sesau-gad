import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, LineChart, Line } from 'recharts';
import { FileCheck, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Importação do CSV com caminho correto para a pasta pública
const csvPath = '/backend/df.csv';

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

// Interface para os dados do CSV
interface CsvHistoricoItem {
  [key: string]: string;
  id: string;
  'Data/Hora': string;
  Unidade: string;
  CPF: string;
  Processo: string;
  Protocolo: string;
  Documento: string;
  Objeto: string;
}

const Dashboard = () => {
  const [totalProcesses, setTotalProcesses] = useState(0);
  const [historicoData, setHistoricoData] = useState<CsvHistoricoItem[]>([]);
  const [concludedCount, setConcludedCount] = useState<number>(0);
  const [uniqueProcesses, setUniqueProcesses] = useState<string[]>([]);
  const [selectedProcess, setSelectedProcess] = useState('');
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [maxResponseTimes, setMaxResponseTimes] = useState<{ unidade: string; maxDias: number }[]>([]);
  const [unitMetrics, setUnitMetrics] = useState<{ unidade: string; Dias_Maximo: number; Dias_Acumulados: number; Aparicao: number }[]>([]);
  const [userMetrics, setUserMetrics] = useState<UserMetric[]>([]);
  const [overdueProcessesCount, setOverdueProcessesCount] = useState<number>(0);
  const [overdueDocumentsCount, setOverdueDocumentsCount] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [documentMetrics, setDocumentMetrics] = useState<{ documento: string; maxDias: number }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Convertemos os dados do CSV para um array de objetos
        const response = await fetch(csvPath);
        
        if (!response.ok) {
          if (response.status === 404) {
            console.error('Arquivo CSV não encontrado. Certifique-se de que o arquivo existe em public/backend/df.csv');
            alert('Não foi possível carregar os dados. O arquivo de dados não foi encontrado. Execute o script de processamento para gerar os dados.');
          } else {
            console.error(`Erro ao carregar o arquivo CSV: ${response.status} ${response.statusText}`);
            alert(`Erro ao carregar os dados: ${response.status} ${response.statusText}`);
          }
          return;
        }
        

        
        const csvText = await response.text();
        
        // Parse CSV (melhorado para lidar com campos entre aspas)
        try {
          const lines = csvText.split('\n');
          const headers = lines[0].replace(/"/g, '').split(',');
          
          const parsedData: CsvHistoricoItem[] = [];
          
          for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;
            
            // Lidar com valores entre aspas que possam conter vírgulas
            const values: string[] = [];
            let line = lines[i];
            let inQuotes = false;
            let currentValue = '';
            
            for (let j = 0; j < line.length; j++) {
              const char = line[j];
              
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                values.push(currentValue.replace(/"/g, ''));
                currentValue = '';
              } else {
                currentValue += char;
              }
            }
            
            if (currentValue) {
              values.push(currentValue.replace(/"/g, ''));
            }
            
            // Criar objeto com os valores
            const item: Record<string, string> = {};
            headers.forEach((header, index) => {
              item[header] = values[index] || '';
            });
            
            parsedData.push(item as CsvHistoricoItem);
          }
          
          console.log('Dados CSV processados:', parsedData);
          setHistoricoData(parsedData);

          // Contagem de processos únicos
          const uniqueProcessCount = new Set(parsedData.map(item => item.Processo)).size;
          setTotalProcesses(uniqueProcessCount);

          // Calcula Processos Concluídos
          const concluidosSet = new Set<string>();
          parsedData.forEach(item => {
            if (item.Documento?.includes('Homologação')) {
              concluidosSet.add(item.Processo);
            }
          });
          setConcludedCount(concluidosSet.size);

          // Agrupa os processos
          const processosPorId = new Map<string, CsvHistoricoItem[]>();
          parsedData.forEach(item => {
            if (!processosPorId.has(item.Processo)) {
              processosPorId.set(item.Processo, []);
            }
            processosPorId.get(item.Processo)?.push(item);
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

          // Processos únicos com objetos
          const uniqueProcessData = parsedData.filter(item => item.Processo && item.Processo.trim() !== '');
          
          // Criar o conjunto de processos únicos com seus objetos
          const uniqueProcessesSet = new Set<string>();
          uniqueProcessData.forEach(item => {
            const processo = item.Processo;
            const objeto = item.Objeto || '(Sem objeto)';
            uniqueProcessesSet.add(`${processo} - ${objeto}`);
          });
          
          setUniqueProcesses(Array.from(uniqueProcessesSet));
          console.log('Processos únicos encontrados:', Array.from(uniqueProcessesSet));
        } catch (error) {
          console.error('Erro ao processar CSV:', error);
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
      } catch (error) {
        console.error('Erro ao carregar dados do CSV:', error);
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

  const calculateDocumentMetrics = (data: HistoricoItem[]) => {
    const docTimes: { [key: string]: { maxDias: number; lastDate: string } } = {};

    data.forEach(item => {
      if (item.Documento && typeof item.diasEntreDocumentos === 'number') {
        const dias = Math.abs(item.diasEntreDocumentos);
        if (!docTimes[item.Documento] || dias > docTimes[item.Documento].maxDias) {
          docTimes[item.Documento] = { maxDias: dias, lastDate: item['Data/Hora'] };
        }
      }
    });

    const sortedDocuments = Object.entries(docTimes)
      .filter(([documento]) => documento.trim() !== '')
      .map(([documento, { maxDias, lastDate }]) => ({
        documento,
        maxDias,
        lastDate,
      }))
      .sort((b, a) => (a.maxDias as number) - (b.maxDias as number)) // Sort by maxDias in descending order
      .slice(0, 10) // Take the top 10

    // Add the "Desde a última movimentação" as the 11th point
    sortedDocuments.push({
      documento: 'Desde a última movimentação',
      maxDias: 0, // or any other value you want to represent
      lastDate: new Date().toISOString(),
    });

    return sortedDocuments;
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

        // Calculate document metrics
        const docMetrics = calculateDocumentMetrics(processedData);
        setDocumentMetrics(docMetrics);

        console.log('Dados processados:', processedData);
        console.log('Tempos máximos:', maxTimes);
        console.log('Métricas por usuário:', userMetricsData);
      }
    }
  }, [selectedProcess, historicoData]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const filteredProcesses = uniqueProcesses.filter(processo =>
    processo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const downloadPDF = () => {
    const element = document.getElementById('history-table-container');
    if (element) {
      html2canvas(element, {
        scale: 2, // Aumenta a qualidade
        useCORS: true,
        logging: false,
        scrollY: -window.scrollY // Corrige o problema de scrolling
      }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('l', 'mm', 'a4'); // Orientação paisagem para tabelas
        
        // Configurações de página
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        // Calcular a altura proporcional da imagem
        const imgWidth = pageWidth - 20; // Margem de 10mm em cada lado
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Adicionar a imagem à primeira página
        pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
        
        // Se a imagem for maior que a altura da página, adicionar páginas adicionais
        let heightLeft = imgHeight;
        let position = 10;
        
        // Subtrai a altura da primeira página
        heightLeft -= (pageHeight - 20);
        position = 0 - (pageHeight - 20);
        
        // Adicionar páginas adicionais se necessário
        while (heightLeft > 0) {
          pdf.addPage();
          position += (pageHeight - 20);
          pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
          heightLeft -= (pageHeight - 20);
        }
        
        pdf.save(`histórico_${selectedProcess.split(' - ')[0]}.pdf`);
      });
    }
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
              {/* Botão de exportação desabilitado temporariamente
              <button 
                onClick={downloadPDF} 
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Exportar Histórico como PDF
              </button>
              */}
            </CardHeader>
            <CardContent>
              {processedData.length === 0 ? (
                <p>Nenhum dado disponível para o processo selecionado.</p>
              ) : (
                <div id="history-table-container" className="max-h-[475px] overflow-y-auto">
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
                        <TableRow
                          key={item.id}
                          style={{
                            backgroundColor: 
                              typeof item.diasEntreDocumentos === 'number' && 
                              Math.abs(item.diasEntreDocumentos) > 15 
                                ? '#dce9ef' 
                                : 'transparent',
                          }}
                        >
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