import React, { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { FileCheck, Users, FileText, Calendar, Calculator } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ProducaoItem {
  id_unidade: string;
  Textbox32: string;
  Ano: string;
  Textbox24: string;
  Mes: string;
  Textbox44: string;
  IdDocumento1: string;
  Documento1: string;
  Documento: string;
  IdDocumento: string;
  protocolo_formatado: string;
  Textbox17: string;
  Nome: string;
  Setor: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#d53e4f', '#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854'];

const Producao = () => {
  const [producaoData, setProducaoData] = useState<ProducaoItem[]>([]);
  const [filteredData, setFilteredData] = useState<ProducaoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para filtros
  const [selectedSetor, setSelectedSetor] = useState<string>('todos');
  const [selectedNomes, setSelectedNomes] = useState<string[]>([]);
  const [selectedAnos, setSelectedAnos] = useState<string[]>([]);
  const [selectedMeses, setSelectedMeses] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showAllNomes, setShowAllNomes] = useState<boolean>(true);
  
  // Estados para dados filtrados
  const [setores, setSetores] = useState<string[]>([]);
  const [nomes, setNomes] = useState<string[]>([]);
  const [anos, setAnos] = useState<string[]>([]);
  const [meses, setMeses] = useState<string[]>([]);
  const [documentStats, setDocumentStats] = useState<{documento: string; count: number}[]>([]);
  const [documentByMonthStats, setDocumentByMonthStats] = useState<{mes: string; count: number}[]>([]);
  const [documentTypeByMonthStats, setDocumentTypeByMonthStats] = useState<{mes: string; documento: string; count: number}[]>([]);
  
  // Métricas
  const [totalDocuments, setTotalDocuments] = useState<number>(0);
  const [uniqueUsersCount, setUniqueUsersCount] = useState<number>(0);
  const [uniqueMonthsCount, setUniqueMonthsCount] = useState<number>(0);
  const [docsPerUserAvg, setDocsPerUserAvg] = useState<number>(0);
  const [docsPerMonthAvg, setDocsPerMonthAvg] = useState<number>(0);
  const [docsPerUserPerMonthAvg, setDocsPerUserPerMonthAvg] = useState<number>(0);

  // Função para carregar os dados de produção consolidados
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Tentar carregar o arquivo de produção consolidada primeiro
        let response = await fetch('/backend/producao_consolidada.csv');
        
        if (!response.ok) {
          // Se o arquivo consolidado não existir, tentar carregar o arquivo do GAD como fallback
          console.log('Arquivo consolidado não encontrado, tentando carregar producao_gad.csv');
          response = await fetch('/backend/producao_gad.csv');
          
          if (!response.ok) {
            throw new Error('Nenhum arquivo de produção encontrado. Execute o script de processamento.');
          }
        }
        
        const csvText = await response.text();
        
        // Parse CSV melhorado para lidar com campos entre aspas
        const lines = csvText.split('\n');
        const headers = lines[0].replace(/"/g, '').split(',');
        
        const parsedData: ProducaoItem[] = [];
        
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
          
          parsedData.push(item as unknown as ProducaoItem);
        }
        
        setProducaoData(parsedData);
        setFilteredData(parsedData);
        
        // Extrair lista de setores únicos
        const uniqueSetores = [...new Set(parsedData.map(item => item.Setor || item.id_unidade))].filter(Boolean);
        setSetores(uniqueSetores);
        
        // Extrair lista de anos únicos
        const uniqueAnos = [...new Set(parsedData.map(item => item.Ano))].filter(Boolean);
        setAnos(uniqueAnos);
        
        // Extrair lista de meses únicos
        const uniqueMeses = [...new Set(parsedData.map(item => item.Mes))].filter(Boolean);
        setMeses(uniqueMeses);
        
        // Inicialmente, definir o total de documentos
        setTotalDocuments(parsedData.length);
        
        // Calcula o número de usuários únicos
        setUniqueUsersCount(new Set(parsedData.map(item => item.Nome)).size);
        
        // Calcula o número de meses únicos
        setUniqueMonthsCount(uniqueMeses.length);
        
        // Calcular estatísticas de documentos
        calculateDocumentStats(parsedData);
        calculateDocumentByMonthStats(parsedData);
        calculateDocumentTypeByMonthStats(parsedData);
        calculateAverages(parsedData);
      } catch (error) {
        console.error('Erro ao carregar dados de produção:', error);
        setError((error as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filtrar e atualizar dados quando os filtros mudam
  useEffect(() => {
    let filtered = producaoData;
    
    // Filtrar por setor
    if (selectedSetor && selectedSetor !== 'todos') {
      filtered = filtered.filter(item => (item.Setor || item.id_unidade) === selectedSetor);
    }
    
    // Extrair nomes únicos após filtrar por setor
    const uniqueNomes = [...new Set(filtered.map(item => item.Nome))].filter(Boolean);
    setNomes(uniqueNomes);
    
    // Filtrar por nomes selecionados
    if (selectedNomes.length > 0 && !selectedNomes.includes('todos')) {
      filtered = filtered.filter(item => selectedNomes.includes(item.Nome));
    }
    
    // Filtrar por anos
    if (selectedAnos.length > 0 && !selectedAnos.includes('todos')) {
      filtered = filtered.filter(item => selectedAnos.includes(item.Ano));
    }
    
    // Filtrar por meses
    if (selectedMeses.length > 0 && !selectedMeses.includes('todos')) {
      filtered = filtered.filter(item => selectedMeses.includes(item.Mes));
    }
    
    // Filtrar por termo de busca (em qualquer campo)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        Object.values(item).some(value => 
          value && value.toString().toLowerCase().includes(term)
        )
      );
    }
    
    setFilteredData(filtered);
    
    // Atualizar estatísticas com base nos dados filtrados
    setTotalDocuments(new Set(filtered.map(item => item.protocolo_formatado)).size);
    setUniqueUsersCount(new Set(filtered.map(item => item.Nome)).size);
    setUniqueMonthsCount(new Set(filtered.map(item => item.Mes)).size);
    
    calculateDocumentStats(filtered);
    calculateDocumentByMonthStats(filtered);
    calculateDocumentTypeByMonthStats(filtered);
    calculateAverages(filtered);
    
  }, [producaoData, selectedSetor, selectedNomes, selectedAnos, selectedMeses, searchTerm]);

  // Função para calcular médias
  const calculateAverages = (data: ProducaoItem[]) => {
    const userCount = new Set(data.map(item => item.Nome)).size;
    const monthCount = new Set(data.map(item => item.Mes)).size;
    const totalDocs = new Set(data.map(item => item.protocolo_formatado)).size;
    
    // Evitar divisão por zero
    const docsPerUser = userCount > 0 ? Math.round(totalDocs / userCount) : 0;
    const docsPerMonth = monthCount > 0 ? Math.round(totalDocs / monthCount) : 0;
    const docsPerUserPerMonth = userCount > 0 && monthCount > 0 
      ? Math.round(docsPerMonth / userCount) 
      : 0;
    
    setDocsPerUserAvg(docsPerUser);
    setDocsPerMonthAvg(docsPerMonth);
    setDocsPerUserPerMonthAvg(docsPerUserPerMonth);
  };

  // Função para calcular estatísticas de documentos
  const calculateDocumentStats = (data: ProducaoItem[]) => {
    const documentCounts: {[key: string]: number} = {};
    
    data.forEach(item => {
      const docType = item.Documento1 || 'Não especificado';
      
      if (!documentCounts[docType]) {
        documentCounts[docType] = 0;
      }
      
      documentCounts[docType]++;
    });
    
    // Converter para array e ordenar por contagem
    const sortedStats = Object.entries(documentCounts)
      .map(([documento, count]) => ({ documento, count }))
      .sort((a, b) => b.count - a.count);
    
    setDocumentStats(sortedStats);
  };
  
  // Função para calcular estatísticas de documentos por mês
  const calculateDocumentByMonthStats = (data: ProducaoItem[]) => {
    const monthCounts: {[key: string]: number} = {};
    
    data.forEach(item => {
      const mes = item.Mes || 'Não especificado';
      
      if (!monthCounts[mes]) {
        monthCounts[mes] = 0;
      }
      
      monthCounts[mes]++;
    });
    
    // Converter para array e ordenar por mês
    const sortedStats = Object.entries(monthCounts)
      .map(([mes, count]) => ({ mes, count }))
      .sort((a, b) => Number(a.mes) - Number(b.mes));
    
    setDocumentByMonthStats(sortedStats);
  };
  
  // Função para calcular estatísticas de tipos de documentos por mês
  const calculateDocumentTypeByMonthStats = (data: ProducaoItem[]) => {
    // Agrupar por mês e tipo de documento
    const typeByMonthCounts: {[key: string]: {[key: string]: number}} = {};
    
    data.forEach(item => {
      const mes = item.Mes || 'Não especificado';
      const docType = item.Documento1 || 'Não especificado';
      
      if (!typeByMonthCounts[mes]) {
        typeByMonthCounts[mes] = {};
      }
      
      if (!typeByMonthCounts[mes][docType]) {
        typeByMonthCounts[mes][docType] = 0;
      }
      
      typeByMonthCounts[mes][docType]++;
    });
    
    // Converter para array e ordenar
    const flatStats: {mes: string; documento: string; count: number}[] = [];
    
    Object.entries(typeByMonthCounts).forEach(([mes, docTypes]) => {
      Object.entries(docTypes).forEach(([documento, count]) => {
        flatStats.push({ mes, documento, count });
      });
    });
    
    // Ordenar por mês e depois por contagem
    const sortedStats = flatStats.sort((a, b) => {
      if (a.mes === b.mes) {
        return b.count - a.count;
      }
      return Number(a.mes) - Number(b.mes);
    });
    
    setDocumentTypeByMonthStats(sortedStats);
  };

  // Função para limpar todos os filtros
  const clearFilters = () => {
    setSelectedSetor('todos');
    setSelectedNomes([]);
    setSelectedAnos([]);
    setSelectedMeses([]);
    setSearchTerm('');
  };

  // Agrupar documentos por nome e contar
  const documentosPorNome = filteredData.reduce((acc, item) => {
    const nome = item.Nome || 'Não especificado';
    
    if (!acc[nome]) {
      acc[nome] = { nome, count: 0 };
    }
    
    acc[nome].count++;
    return acc;
  }, {} as {[key: string]: {nome: string, count: number}});

  // Converter para array e ordenar por contagem
  const documentosPorNomeArray = Object.values(documentosPorNome)
    .sort((a, b) => b.count - a.count);

  // Dados para o gráfico de tipos de documentos
  const documentTypeChartData = documentStats.slice(0, 10).map((item, index) => ({
    name: item.documento,
    value: item.count,
    color: COLORS[index % COLORS.length]
  }));
  
  // Dados para o gráfico de documentos por mês
  const documentByMonthChartData = documentByMonthStats.map((item, index) => ({
    name: item.mes,
    Quantidade: item.count
  }));
  
  // Preparar dados para o gráfico de tipos de documento por mês
  const processDocumentTypeByMonth = () => {
    // Agrupar por mês
    const monthGroups: { [key: string]: { [key: string]: number } } = {};
    
    documentTypeByMonthStats.forEach(item => {
      if (!monthGroups[item.mes]) {
        monthGroups[item.mes] = {};
      }
      
      monthGroups[item.mes][item.documento] = item.count;
    });
    
    // Calcular total por mês
    const totalsByMonth: { [key: string]: number } = {};
    Object.entries(monthGroups).forEach(([month, docs]) => {
      totalsByMonth[month] = Object.values(docs).reduce((sum, count) => sum + count, 0);
    });
    
    // Converter para formato adequado para gráficos
    const chartData = Object.entries(monthGroups).map(([month, docs]) => {
      const dataPoint: any = { mes: month, total: totalsByMonth[month] };
      
      // Adicionar os 5 tipos de documento mais comuns
      Object.entries(docs)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([docType, count]) => {
          dataPoint[docType] = count;
        });
        
      return dataPoint;
    }).sort((a, b) => Number(a.mes) - Number(b.mes));
    
    return chartData;
  };
  
  // Preparar dados para a tabela pivot
  const preparePivotTableData = () => {
    // Agrupar por tipo de documento e mês
    const docTypeByMonth = {} as { [key: string]: { [key: string]: number } };
    
    // Inicializar com todos os documentos e meses como 0
    documentStats.forEach(({ documento }) => {
      docTypeByMonth[documento] = {};
      meses.forEach(mes => {
        docTypeByMonth[documento][mes] = 0;
      });
    });
    
    // Preencher com valores reais
    documentTypeByMonthStats.forEach(({ documento, mes, count }) => {
      if (docTypeByMonth[documento]) {
        docTypeByMonth[documento][mes] = count;
      }
    });
    
    // Converter para array
    const pivotData = Object.entries(docTypeByMonth).map(([documento, mesCounts]) => {
      const row: any = { documento };
      
      Object.entries(mesCounts).forEach(([mes, count]) => {
        row[`mes_${mes}`] = count;
      });
      
      // Adicionar total por documento
      row.total = Object.values(mesCounts).reduce((sum, count) => sum + (count as number), 0);
      
      return row;
    });
    
    // Ordenar por total (maior para menor)
    return pivotData.sort((a, b) => b.total - a.total);
  };
  
  const documentTypeByMonthChartData = processDocumentTypeByMonth();
  const pivotTableData = preparePivotTableData();

  // Para ordenar meses em ordem crescente a opção de seleção do mês
  const sortedMonthData = documentByMonthChartData.sort((a, b) => Number(a.name) - Number(b.name));

  // Para ordenar dados da tabela pivot por tipo de documento em ordem crescente
  const sortedPivotData = pivotTableData.sort((a, b) => a.documento.localeCompare(b.documento));

  // Para ordenar nomes de servidores em ordem alfabética crescente
  const sortedNomeData = documentosPorNomeArray.sort((a, b) => a.nome.localeCompare(b.nome));

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <p>Carregando dados de produção...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-full">
          <p className="text-red-500 mb-4">Erro: {error}</p>
          <p>Por favor, execute o script de processamento para gerar os arquivos necessários.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-sei-800">Produção por Setor</h1>
      </div>
      
      <h6 className="text-center text-gray-500 mb-2">DADOS ATUALIZADOS DE JANEIRO 2024 A ABRIL 2025</h6>
      <hr className="mb-6" />

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Filtre os dados de produção por setor, nome, período ou termo de busca</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col space-y-1">
              <Label htmlFor="setor">Filtrar por Setor</Label>
              <Select 
                value={selectedSetor} 
                onValueChange={setSelectedSetor}
              >
                <SelectTrigger id="setor">
                  <SelectValue placeholder="Selecione um setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os setores</SelectItem>
                  {setores.map((setor) => (
                    <SelectItem key={setor} value={setor}>
                      {setor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col space-y-1">
              <Label htmlFor="busca">Busca geral</Label>
              <div className="flex space-x-2">
                <Input
                  id="busca"
                  placeholder="Digite para buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button 
                  onClick={clearFilters}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                >
                  Limpar
                </button>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col space-y-1">
              <Label htmlFor="nome">Filtrar por Nome</Label>
              <Select 
                value={selectedNomes[0] || 'todos'}
                onValueChange={(value) => setSelectedNomes(value !== 'todos' ? [value] : [])}
                disabled={!selectedSetor || selectedSetor === 'todos'}
              >
                <SelectTrigger id="nome">
                  <SelectValue placeholder="Selecione um nome" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os nomes</SelectItem>
                  {nomes.sort((a, b) => a.localeCompare(b)).map((nome) => (
                    <SelectItem key={nome} value={nome}>
                      {nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col space-y-1">
              <Label htmlFor="ano">Filtrar por Ano</Label>
              <Select 
                value={selectedAnos[0] === 'todos' || selectedAnos.length === 0 ? 'todos' : selectedAnos[0]}
                onValueChange={(value) => setSelectedAnos(value ? [value] : [])}
              >
                <SelectTrigger id="ano">
                  <SelectValue placeholder="Selecione um ano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os anos</SelectItem>
                  {anos.map((ano) => (
                    <SelectItem key={ano} value={ano}>
                      {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col space-y-1">
              <Label htmlFor="mes">Filtrar por Mês</Label>
              <Select 
                value={selectedMeses[0] === 'todos' || selectedMeses.length === 0 ? 'todos' : selectedMeses[0]}
                onValueChange={(value) => setSelectedMeses(value ? [value] : [])}
              >
                <SelectTrigger id="mes">
                  <SelectValue placeholder="Selecione um mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os meses</SelectItem>
                  {[...meses].sort((a, b) => Number(a) - Number(b)).map((mes) => (
                    <SelectItem key={mes} value={mes}>
                      {mes}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas Resumidas */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card className="border-sei-100">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-sei-100 p-3 rounded-full">
              <FileText className="h-6 w-6 text-sei-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total de Documentos
              </p>
              <h3 className="text-2xl font-bold">{totalDocuments}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-sei-100">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-sei-100 p-3 rounded-full">
              <Users className="h-6 w-6 text-sei-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Usuários
              </p>
              <h3 className="text-2xl font-bold">{uniqueUsersCount}</h3>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-sei-100">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-sei-100 p-3 rounded-full">
              <Calendar className="h-6 w-6 text-sei-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Média de Docs/Mês
              </p>
              <h3 className="text-2xl font-bold">{docsPerMonthAvg}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-sei-100">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="bg-sei-100 p-3 rounded-full">
              <Calculator className="h-6 w-6 text-sei-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Média de Docs/Servidor
              </p>
              <h3 className="text-2xl font-bold">{docsPerUserAvg}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de documentos por mês */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Produção de Documentos por Mês</CardTitle>
          <CardDescription>
            Evolução mensal da quantidade de documentos produzidos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sortedMonthData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} documentos`, 'Quantidade']} />
                <Line 
                  type="monotone" 
                  dataKey="Quantidade" 
                  stroke="#0c93e4" 
                  strokeWidth={2}
                  activeDot={{ r: 8 }}
                  dot={{ r: 4 }}
                  label={{ 
                    position: 'top', 
                    fill: '#333',
                    fontSize: 12
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico Comparativo de Documentos por Tipo e Mês */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Comparativo de Documentos por Mês</CardTitle>
          <CardDescription>
            Distribuição dos tipos de documentos por mês com total mensal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={documentTypeByMonthChartData}
                layout="horizontal"
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                barGap={8}
                barCategoryGap={20}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="mes" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                {documentStats.slice(0, 5).map((docType, index) => (
                  <Bar
                    key={index}
                    dataKey={docType.documento}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#ff7300"
                  strokeWidth={3}
                  name="Total"
                  dot={{ fill: '#ff7300', r: 4 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <hr className="mb-8" />

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Gráfico de Tipos de Documentos */}
        {/* <Card>
          <CardHeader>
            <CardTitle>Tipos de Documentos</CardTitle>
            <CardDescription>Distribuição dos 10 tipos de documentos mais frequentes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={documentTypeChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {documentTypeChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} documentos`, 'Quantidade']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card> */}

        {/* Gráfico de Documentos por Nome
        <Card>
          <CardHeader>
            <CardTitle>Produção por Nome</CardTitle>
            <CardDescription>Quantidade de documentos produzidos por cada usuário</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sortedNomeData.slice(0, 10)}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                >
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="nome" 
                    type="category" 
                    width={120}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip formatter={(value) => [`${value} documentos`, 'Quantidade']} />
                  <Legend />
                  <Bar dataKey="count" name="Documentos" fill="#0c93e4" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card> */}
      </div>

      {/* Tabela de Dados Detalhados */}
      <Card>
        <CardHeader>
          <CardTitle>Tabela de Documentos por Tipo e Mês</CardTitle>
          <CardDescription>
            Quantidades detalhadas de cada tipo de documento por mês
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead>Tipo de Documento</TableHead>
                  {meses.filter(mes => !selectedMeses.length || selectedMeses.includes(mes))
                    .sort((a, b) => Number(a) - Number(b))
                    .map(mes => (
                      <TableHead key={mes} className="text-center">{mes}</TableHead>
                    ))
                  }
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPivotData.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{row.documento}</TableCell>
                    {meses.filter(mes => !selectedMeses.length || selectedMeses.includes(mes))
                      .sort((a, b) => Number(a) - Number(b))
                      .map(mes => (
                        <TableCell key={mes} className="text-center">
                          {row[`mes_${mes}`] || 0}
                        </TableCell>
                      ))
                    }
                    <TableCell className="text-right font-semibold">{row.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default Producao; 