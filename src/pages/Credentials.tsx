
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { Key, Save } from 'lucide-react';

const Credentials = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    // Simulate API call
    setTimeout(() => {
      // Store in localStorage for demo purposes
      // In a real app, this would be stored more securely
      localStorage.setItem('sei-credentials', JSON.stringify({ username, password }));
      
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
        const { username: savedUsername, password: savedPassword } = JSON.parse(savedCredentials);
        setUsername(savedUsername);
        setPassword(savedPassword);
      } catch (error) {
        console.error('Error parsing saved credentials:', error);
      }
    }
  }, []);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-sei-800">Credenciais do SEI</h1>
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
                  placeholder="Seu usuário do SEI"
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
                  placeholder="Sua senha do SEI"
                  required
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
