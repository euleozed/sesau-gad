import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    // Aqui você deve incluir a lógica para buscar os dados do seu banco
    // Por exemplo:
    // const processData = await db.query('SELECT * FROM processes');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `Você é um assistente especializado em análise de processos do SEI. 
          Sua função é analisar dados de processos e fornecer insights sobre CPFs que geram documentos 
          e tempos de produção.`
        },
        {
          role: "user",
          content: `${query}\n\nDados dos processos: [Aqui você deve inserir os dados do banco]`
        }
      ],
    });

    return NextResponse.json({
      response: completion.choices[0].message.content
    });
  } catch (error) {
    console.error('Erro na API:', error);
    return NextResponse.json(
      { error: 'Erro ao processar a consulta' },
      { status: 500 }
    );
  }
} 