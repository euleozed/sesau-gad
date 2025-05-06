import pandas as pd
import os
import glob
import shutil

# Diretório base onde estão todos os subdiretórios de documentos de produção
base_dir = os.path.dirname(os.path.abspath(__file__))

# Diretório público onde os arquivos serão acessíveis pelo frontend
public_dir = os.path.join(os.path.dirname(base_dir), 'public', 'backend')

# Define a função para processar uma pasta de documentos
def processar_pasta_documentos(nome_setor):
    """
    Processa todos os arquivos CSV em uma pasta de documentos de produção.
    
    Args:
        nome_setor (str): Nome do setor cujos documentos serão processados (gad, gecomp, sc, prot, nap, sg)
    
    Returns:
        bool: True se o processamento foi bem-sucedido, False caso contrário
    """
    print(f"Processando documentos de produção do setor: {nome_setor}")
    
    # Diretório para a pasta de documentos de produção do setor
    pasta_documentos = os.path.join(base_dir, f'documentos_producao_{nome_setor}')
    
    # Verificar se o diretório existe
    if not os.path.exists(pasta_documentos):
        print(f"Erro: Diretório '{pasta_documentos}' não encontrado.")
        return False
    
    # Criar o diretório de saída se não existir
    output_dir = os.path.join(base_dir, 'data', 'raw')
    os.makedirs(output_dir, exist_ok=True)
    
    # Arquivo de saída consolidado
    combined_csv_path = os.path.join(output_dir, f'producao_{nome_setor}.csv')
    
    # Lista todos os arquivos na pasta que terminam com .csv
    arquivos_csv = glob.glob(os.path.join(pasta_documentos, '*.csv'))
    
    if not arquivos_csv:
        print(f"Aviso: Nenhum arquivo CSV encontrado em '{pasta_documentos}'.")
        return False
    
    print(f"Encontrados {len(arquivos_csv)} arquivos CSV.")
    
    # Lista para armazenar os DataFrames
    lista_dfs = []
    
    # Processar cada arquivo CSV
    for caminho_arquivo in arquivos_csv:
        try:
            # Extrair o nome do arquivo sem o caminho e sem a extensão
            nome_arquivo = os.path.basename(caminho_arquivo)
            nome_servidor = os.path.splitext(nome_arquivo)[0]
            
            # Ler o arquivo CSV com os tipos apropriados
            df = pd.read_csv(caminho_arquivo, dtype={'CPF': str, 'Usuário': str})
            
            # Adicionar coluna com o nome do servidor
            df['Nome'] = nome_servidor
            df['Setor'] = nome_setor.upper()
            
            # Garantir que os CPFs mantenham zeros à esquerda
            for coluna in ['CPF', 'Usuário']:
                if coluna in df.columns:
                    df[coluna] = df[coluna].astype(str)
                    # Preencher valores numéricos com zeros à esquerda
                    df[coluna] = df[coluna].apply(lambda x: x.zfill(11) if x and x.isdigit() else x)
            
            # Adicionar ao DataFrame
            lista_dfs.append(df)
            
            # Salvar o arquivo processado de volta (opcional)
            df.to_csv(caminho_arquivo, index=False, encoding='utf-8', quoting=1)
            print(f"Processado: {nome_arquivo}")
            
        except Exception as e:
            print(f"Erro ao processar arquivo {caminho_arquivo}: {str(e)}")
    
    # Se temos DataFrames para concatenar
    if lista_dfs:
        try:
            # Concatenar todos os DataFrames
            df_combinado = pd.concat(lista_dfs, ignore_index=True)
            
            # Salvar o DataFrame consolidado
            df_combinado.to_csv(combined_csv_path, index=False, encoding='utf-8', quoting=1)
            print(f"Arquivo consolidado salvo em: {combined_csv_path}")
            
            # Copiar para a pasta pública
            os.makedirs(public_dir, exist_ok=True)
            public_file_path = os.path.join(public_dir, f'producao_{nome_setor}.csv')
            shutil.copy2(combined_csv_path, public_file_path)
            print(f"Arquivo copiado para pasta pública: {public_file_path}")
            
            return True
        except Exception as e:
            print(f"Erro ao consolidar arquivos: {str(e)}")
            return False
    else:
        print(f"Não há dados para processar para o setor {nome_setor}.")
        return False

def processar_todos_setores():
    """
    Processa documentos de produção de todos os setores disponíveis.
    """
    setores = ['gad', 'gecomp', 'sc', 'prot', 'nap', 'sg']
    resultados = {}
    
    for setor in setores:
        print(f"\n{'='*50}")
        print(f"Iniciando processamento do setor: {setor}")
        print(f"{'='*50}")
        sucesso = processar_pasta_documentos(setor)
        resultados[setor] = "Concluído com sucesso" if sucesso else "Falhou ou sem arquivos"
    
    # Exibir relatório final
    print("\n\nRELATÓRIO DE PROCESSAMENTO")
    print(f"{'='*30}")
    for setor, resultado in resultados.items():
        print(f"Setor {setor.upper()}: {resultado}")
    print(f"{'='*30}")

def processar_e_consolidar_todos():
    """
    Processa todos os setores e depois consolida todos em um único arquivo.
    """
    # Primeiro processa cada setor individualmente
    processar_todos_setores()
    
    # Diretório onde estão os arquivos consolidados por setor
    output_dir = os.path.join(base_dir, 'data', 'raw')
    
    # Verificar se o diretório existe
    if not os.path.exists(output_dir):
        print(f"Erro: Diretório de saída '{output_dir}' não encontrado.")
        return
    
    # Arquivo final consolidado com todos os setores
    final_csv_path = os.path.join(base_dir, 'producao_consolidada.csv')
    
    # Lista todos os arquivos de produção consolidados por setor
    arquivos_producao = glob.glob(os.path.join(output_dir, 'producao_*.csv'))
    
    if not arquivos_producao:
        print("Nenhum arquivo de produção encontrado para consolidação final.")
        return
    
    # Lista para armazenar os DataFrames
    lista_dfs_final = []
    
    # Carregar cada arquivo de produção
    for arquivo in arquivos_producao:
        try:
            df = pd.read_csv(arquivo, dtype={'CPF': str, 'Usuário': str})
            lista_dfs_final.append(df)
            print(f"Carregado para consolidação final: {os.path.basename(arquivo)}")
        except Exception as e:
            print(f"Erro ao carregar arquivo {arquivo}: {str(e)}")
    
    # Se temos DataFrames para consolidar
    if lista_dfs_final:
        try:
            # Concatenar todos os DataFrames
            df_final = pd.concat(lista_dfs_final, ignore_index=True)
            
            # Garantir que os CPFs mantenham zeros à esquerda
            for coluna in ['CPF', 'Usuário']:
                if coluna in df_final.columns:
                    df_final[coluna] = df_final[coluna].astype(str)
                    df_final[coluna] = df_final[coluna].apply(lambda x: x.zfill(11) if x and x.isdigit() else x)
            
            # Salvar o DataFrame final
            df_final.to_csv(final_csv_path, index=False, encoding='utf-8', quoting=1)
            print(f"\nArquivo final consolidado de todos os setores salvo em: {final_csv_path}")
            
            # Copiar o arquivo final para a pasta pública
            os.makedirs(public_dir, exist_ok=True)
            public_file_path = os.path.join(public_dir, 'producao_consolidada.csv')
            shutil.copy2(final_csv_path, public_file_path)
            print(f"Arquivo consolidado copiado para pasta pública: {public_file_path}")
            
            # Também copiar o arquivo df.csv para a pasta pública se existir
            df_csv_path = os.path.join(base_dir, 'df.csv')
            if os.path.exists(df_csv_path):
                df_public_path = os.path.join(public_dir, 'df.csv')
                shutil.copy2(df_csv_path, df_public_path)
                print(f"Arquivo df.csv copiado para pasta pública: {df_public_path}")
            else:
                print("Aviso: Arquivo df.csv não encontrado, não foi possível copiar para a pasta pública.")
            
        except Exception as e:
            print(f"Erro na consolidação final: {str(e)}")
    else:
        print("Não há dados para a consolidação final.")

# Executar o processamento completo
if __name__ == "__main__":
    # Certifique-se de que os diretórios necessários existem
    os.makedirs(os.path.join(base_dir, 'data', 'raw'), exist_ok=True)
    os.makedirs(public_dir, exist_ok=True)
    
    # Processar cada setor e depois consolidar tudo
    processar_e_consolidar_todos()