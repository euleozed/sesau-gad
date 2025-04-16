
import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileSearch, Plus, Trash2, Eye, Edit } from 'lucide-react';

interface Process {
  id: string;
  number: string;
  subject: string;
  createdAt: string;
}

const Processes = () => {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [processNumber, setProcessNumber] = useState('');
  const [processSubject, setProcessSubject] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProcessId, setCurrentProcessId] = useState<string | null>(null);
  
  // Load processes from localStorage on component mount
  useEffect(() => {
    const savedProcesses = localStorage.getItem('sei-processes');
    if (savedProcesses) {
      try {
        setProcesses(JSON.parse(savedProcesses));
      } catch (error) {
        console.error('Error parsing saved processes:', error);
      }
    }
  }, []);

  // Save processes to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('sei-processes', JSON.stringify(processes));
  }, [processes]);

  const handleAddProcess = () => {
    if (!processNumber.trim() || !processSubject.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }

    if (isEditing && currentProcessId) {
      // Update existing process
      setProcesses(processes.map(process => 
        process.id === currentProcessId 
          ? { ...process, number: processNumber, subject: processSubject }
          : process
      ));
      
      toast({
        title: "Processo atualizado",
        description: `Processo ${processNumber} atualizado com sucesso.`,
      });
    } else {
      // Add new process
      const newProcess: Process = {
        id: Date.now().toString(),
        number: processNumber,
        subject: processSubject,
        createdAt: new Date().toISOString(),
      };
      
      setProcesses([...processes, newProcess]);
      
      toast({
        title: "Processo adicionado",
        description: `Processo ${processNumber} adicionado com sucesso.`,
      });
    }

    // Reset form and close dialog
    resetForm();
    setIsDialogOpen(false);
  };

  const openEditDialog = (process: Process) => {
    setProcessNumber(process.number);
    setProcessSubject(process.subject);
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
    setIsEditing(false);
    setCurrentProcessId(null);
  };

  const deleteProcess = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este processo?")) {
      setProcesses(processes.filter(process => process.id !== id));
      
      toast({
        title: "Processo excluído",
        description: "O processo foi removido com sucesso.",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-sei-800">Processos</h1>
        <Button onClick={openAddDialog} className="bg-sei-600 hover:bg-sei-700">
          <Plus className="h-4 w-4 mr-2" /> Cadastrar Processo
        </Button>
      </div>

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
                  <TableHead>Data de Cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processes.map((process) => (
                  <TableRow key={process.id}>
                    <TableCell className="font-medium">{process.number}</TableCell>
                    <TableCell>{process.subject}</TableCell>
                    <TableCell>{formatDate(process.createdAt)}</TableCell>
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
