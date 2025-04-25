import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { Key, Save, FileText } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const Credentials = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [setor, setSetor] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const supabaseUrl = "https://yxerhuojxxxckatylftd.supabase.co";
  const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4ZXJodW9qeHh4Y2thdHlsZnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MDk3NDQsImV4cCI6MjA2MDM4NTc0NH0.u2NNzl2E3nI2H5OWquif0C3EL3SKEydwxtmiGoqwjMs";
  const supabase = createClient(supabaseUrl, supabaseKey);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const userData = {
        cpf: username,
        password: password,
        setor: setor
    };

    await insertUserData(userData);

    // Simulate API call
    setTimeout(() => {
      // Store in localStorage for demo purposes
      localStorage.setItem('sei-credentials', JSON.stringify(userData));
      
      toast({
        title: "Credenciais salvas",
        description: "Suas credenciais foram salvas com sucesso.",
      });
      setIsSaving(false);
    }, 1000);
  };

  // Load saved credentials if they exist
  React.useEffect(() => {
    const savedCredentials = localStorage.getItem('sei-credentials');
    if (savedCredentials) {
      try {
        const { username: savedUsername, password: savedPassword, setor: savedSetor } = JSON.parse(savedCredentials);
        setUsername(savedUsername);
        setPassword(savedPassword);
        setSetor(savedSetor);
      } catch (error) {
        console.error('Error parsing saved credentials:', error);
      }
    }
  }, []);

  async function insertUserData(userData) {
    const { data, error } = await supabase
        .from('users') // nome da tabela
        .upsert([
            { 
                cpf: userData.cpf, // cpf como chave única
                password: userData.password, // senha
                setor: userData.setor // setor
            }
        ]);

    if (error) {
        console.error('Erro ao inserir ou atualizar dados:', error);
    } else {
        console.log('Dados inseridos ou atualizados com sucesso:', data);
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-sei-800">Credenciais</h1>
      </div>

      <div className="max-w-2xl mx-auto">
        <Card className="border-sei-100 shadow-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-sei-600" />
              <CardTitle className="text-xl">Cadastrar Credenciais</CardTitle>
            </div>
            <CardDescription>
              Insira suas credenciais de acesso ao Sistema Eletrônico de Informações (SEI)
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="username">
                  Usuário
                </label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  // placeholder="Seu usuário do SEI"
                  required
                  className="border-sei-200"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="password">
                  Senha
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  // placeholder="Sua senha do SEI"
                  required
                  className="border-sei-200"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="setor">
                  Setor
                </label>
                <Input
                  id="setor"
                  value={setor}
                  onChange={(e) => setSetor(e.target.value)}
                  // placeholder="Seu setor no SEI"
                  // icon={FileText}
                  className="border-sei-200"
                />
              </div>
            </CardContent>
            
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full bg-sei-600 hover:bg-sei-700"
                disabled={isSaving}
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span> Salvando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save className="h-4 w-4" /> Salvar Credenciais
                  </span>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </Layout>
  );
};

export default Credentials;

