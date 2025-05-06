'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export function AIAgent() {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await fetch('/api/ai-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      const data = await result.json();
      setResponse(data.response);
    } catch (error) {
      console.error('Erro ao processar a consulta:', error);
      setResponse('Ocorreu um erro ao processar sua consulta.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6 max-w-2xl mx-auto mt-8">
      <h2 className="text-2xl font-bold mb-4">Assistente de Análise de Processos</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: Quais CPFs mais produzem documentos?"
            className="w-full"
          />
        </div>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Processando...' : 'Enviar Pergunta'}
        </Button>
      </form>
      {response && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Resposta:</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{response}</p>
        </div>
      )}
    </Card>
  );
} 