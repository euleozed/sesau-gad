import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileSearch, Plus, Trash2, Edit } from 'lucide-react';
import { processQueries, Process } from '@/services/supabase';

const Processes = () => {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [processNumber, setProcessNumber] = useState('');
  const [processSubject, setProcessSubject] = useState('');
  const [processStatus, setProcessStatus] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProcessId, setCurrentProcessId] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<any>(null);
  
  // Load processes and statistics from Supabase on component mount
  useEffect(() => {
    const fetchData = async () => {
      // Fetch processes
      const { data: processesData, error: processesError } = await processQueries.getAllProcesses();
      if (processesError) {
        console.error('Erro ao carregar processos:', processesError);
        return;
      }
      setProcesses(processesData || []);

      // Fetch statistics
      const { data: statsData, error: statsError } = await processQueries.getProcessStatistics();
      if (statsError) {
        console.error('Erro ao carregar estatísticas:', statsError);
        return;
      }
      setStatistics(statsData);
    };

    fetchData();
  }, []);

  const handleAddProcess = async () => {
    if (!processNumber.trim() || !processSubject.trim() || !processStatus.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    const processData = {
      processo: processNumber,
      objeto: processSubject,
      status: processStatus,
    };

    const { error } = await processQueries.upsertProcess(processData);

    if (error) {
      console.error('Erro ao adicionar ou atualizar processo:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao salvar o processo.",
        variant: "destructive",
      });
    } else {
      toast({
        title: isEditing ? "Processo atualizado" : "Processo adicionado",
        description: `Processo ${processNumber} ${isEditing ? 'atualizado' : 'adicionado'} com sucesso.`,
      });

      // Reset form and close dialog
      resetForm();
      setIsDialogOpen(false);

      // Reload processes and statistics
      const { data: processesData } = await processQueries.getAllProcesses();
      const { data: statsData } = await processQueries.getProcessStatistics();
      setProcesses(processesData || []);
      setStatistics(statsData);
    }
  };

  const openEditDialog = (process: Process) => {
    setProcessNumber(process.processo);
    setProcessSubject(process.objeto);
    setProcessStatus(process.status);
    setCurrentProcessId(process.id);
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    resetForm();
    setIsEditing(false);
    setCurrentProcessId(null);
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setProcessNumber('');
    setProcessSubject('');
    setProcessStatus('');
    setIsEditing(false);
    setCurrentProcessId(null);
  };

  const deleteProcess = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este processo?")) {
      const { error } = await processQueries.deleteProcess(id);
      if (error) {
        console.error('Erro ao excluir processo:', error);
        toast({
          title: "Erro",
          description: "Ocorreu um erro ao excluir o processo.",
          variant: "destructive",
        });
      } else {
        setProcesses(processes.filter(process => process.id !== id));
        toast({
          title: "Processo excluído",
          description: "O processo foi removido com sucesso.",
        });

        // Update statistics after deletion
        const { data: statsData } = await processQueries.getProcessStatistics();
        setStatistics(statsData);
      }
    }
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-sei-800">Processos</h1>
        <Button onClick={openAddDialog} className="bg-sei-600 hover:bg-sei-700">
          <Plus className="h-4 w-4 mr-2" /> Cadastrar Processo
        </Button>
      </div>

      {statistics && (
        <Card className="border-sei-100 shadow-md mb-6">
          <CardHeader>
            <CardTitle>Estatísticas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{statistics.total}</p>
                <p className="text-sm text-muted-foreground">Total de Processos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{statistics.activeCount}</p>
                <p className="text-sm text-muted-foreground">Processos Ativos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{statistics.inactiveCount}</p>
                <p className="text-sm text-muted-foreground">Processos Inativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-sei-100 shadow-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileSearch className="h-5 w-5 text-sei-600" />
            <CardTitle>Processos Cadastrados</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {processes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileSearch className="h-12 w-12 mx-auto mb-3 text-sei-300" />
              <p>Nenhum processo cadastrado.</p>
              <p>Clique em "Cadastrar Processo" para adicionar.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número do Processo</TableHead>
                  <TableHead>Objeto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processes.map((process) => (
                  <TableRow key={process.id}>
                    <TableCell className="font-medium">{process.processo}</TableCell>
                    <TableCell>{process.objeto}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-sm ${
                        process.status === 'ativo' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {process.status === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => openEditDialog(process)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteProcess(process.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Processo' : 'Cadastrar Processo'}</DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Edite as informações do processo abaixo.'
                : 'Insira as informações do processo que deseja cadastrar.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="process-number">
                Número do Processo
              </label>
              <Input
                id="process-number"
                value={processNumber}
                onChange={(e) => setProcessNumber(e.target.value)}
                placeholder="Ex: 00000.000000/0000-00"
                className="border-sei-200"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="process-subject">
                Objeto
              </label>
              <Textarea
                id="process-subject"
                value={processSubject}
                onChange={(e) => setProcessSubject(e.target.value)}
                placeholder="Descreva o objeto do processo"
                className="border-sei-200"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="process-status">
                Status
              </label>
              <select
                id="process-status"
                value={processStatus}
                onChange={(e) => setProcessStatus(e.target.value)}
                className="w-full rounded-md border border-sei-200 bg-background px-3 py-2"
              >
                <option value="">Selecione o status</option>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline" 
              onClick={() => setIsDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleAddProcess}
              className="bg-sei-600 hover:bg-sei-700"
            >
              {isEditing ? 'Salvar Alterações' : 'Adicionar Processo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Processes;
