import pandas as pd
import re
import os
import uuid
import shutil

def main():
    """
    Script para gerar o arquivo df.csv a partir do tabela_historico.csv
    e copiá-lo para a pasta pública acessível pelo frontend.
    """
    print("Iniciando geração do arquivo df.csv...")
    
    # Diretório base (onde o script está localizado)
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Diretório público onde os arquivos serão acessíveis pelo frontend
    public_dir = os.path.join(os.path.dirname(base_dir), 'public', 'backend')
    os.makedirs(public_dir, exist_ok=True)

    # Caminhos absolutos para os arquivos
    csv_path = os.path.join(base_dir, 'tabela_historico.csv')
    excel_path = os.path.join(base_dir, 'objetos.xlsx')
    output_path = os.path.join(base_dir, 'df.csv')
    
    # Verificar se os arquivos de entrada existem
    if not os.path.exists(csv_path):
        print(f"Erro: Arquivo tabela_historico.csv não encontrado em {csv_path}")
        return False
    
    if not os.path.exists(excel_path):
        print(f"Aviso: Arquivo objetos.xlsx não encontrado em {excel_path}. Objetos não serão incluídos.")
    
    try:
        # Carregar os dados com os tipos apropriados para preservar os zeros à esquerda
        print("Carregando tabela_historico.csv...")
        df = pd.read_csv(csv_path, dtype={
            'CPF': str,
            'Usuário': str  # Em alguns arquivos pode estar como Usuário
        })
        
        # Adicionar objetos se o arquivo existir
        if os.path.exists(excel_path):
            print("Carregando objetos.xlsx e adicionando objetos...")
            df_objetos = pd.read_excel(excel_path)
            # Merge através do número do processo para trazer o objeto
            df = pd.merge(df, df_objetos, on='Processo', how='left')
        
        # Renomear colunas
        print("Processando e transformando dados...")
        df.rename(columns={'objeto': 'Objeto',
                           'Usuário': 'CPF'}, inplace=True)
        
        # Garantir que CPF seja string e mantenha zeros à esquerda
        if 'CPF' in df.columns:
            df['CPF'] = df['CPF'].astype(str)
            # Garantir que CPFs com menos de 11 dígitos sejam preenchidos com zeros à esquerda
            df['CPF'] = df['CPF'].apply(lambda x: x.zfill(11) if x and x.isdigit() else x)
        
        # Substituir '/' por '-' na coluna 'Data/Hora'
        df['Data/Hora'] = df['Data/Hora'].str.replace('/', '-')
        
        # Converter a coluna 'Data/Hora' para formato datetime
        df['Data/Hora'] = pd.to_datetime(df['Data/Hora'], format='%d-%m-%Y %H:%M')
        
        # Função para extrair o Protocolo e o nome do documento
        def extrair_texto(descricao):
            # Expressão regular para extrair o protocolo (sequência de dígitos)
            protocolo = re.search(r'Documento (\d+)', descricao)
            
            # Expressão regular para extrair o nome do documento (conteúdo entre parênteses)
            documento = re.search(r'\((.*?)\)', descricao)
            
            # Expressão regular para identificar a movimentação e capturar a descrição completa
            movimentacao = re.search(r'\b(remetido)\b(.*?)(?=\s*\Z)', descricao)  # Captura tudo após "remetido" até o fim da linha
            
            # Se movimentação for encontrada, usamos ela
            if movimentacao:
                # Captura o texto completo da movimentação
                movimentacao_texto = movimentacao.group(0)
                return (protocolo.group(1) if protocolo else None, movimentacao_texto.strip())
            
            # Caso contrário, retornamos o nome do documento normal
            elif protocolo and documento:
                return protocolo.group(1), documento.group(1)
            
            return None, None
        
        # Aplicar a função para extrair protocolo e documento
        df['Protocolo'], df['Documento'] = zip(*df['Descrição'].apply(extrair_texto))
        
        # Filtrar o DataFrame para manter as linhas que contêm "remetido" ou "assinado"
        df = df[df['Descrição'].str.contains(r'remetido|assinado', case=False, na=False)]
        
        # Exclui todas as linhas onde a coluna 'Documento' contém valores vazios
        df = df.dropna(subset=['Documento'])
        
        # Adiciona uma coluna id unica
        df['id'] = [str(uuid.uuid4()) for _ in range(len(df))]
        
        # Garantir que os números de protocolo também sejam strings
        if 'Protocolo' in df.columns:
            df['Protocolo'] = df['Protocolo'].astype(str)
        
        # Salvar o DataFrame atualizado
        print(f"Salvando df.csv em {output_path}...")
        df.to_csv(output_path, index=False, encoding='utf-8', quoting=1)
        
        # Copiar para a pasta pública
        public_path = os.path.join(public_dir, 'df.csv')
        print(f"Copiando para pasta pública: {public_path}...")
        shutil.copy2(output_path, public_path)
        
        print("Processamento concluído com sucesso!")
        return True
    
    except Exception as e:
        print(f"Erro durante o processamento: {str(e)}")
        return False

if __name__ == "__main__":
    main() 