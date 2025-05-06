import os
import pandas as pd

# Definir o diretório onde os arquivos CSV estão armazenados
base_dir = os.path.dirname(os.path.abspath(__file__))
combined_csv_path = os.path.join(base_dir, 'tabela_historico.csv')
download_dir = os.path.join(base_dir, 'downloads')

# Inicializar uma lista vazia para armazenar todos os DataFrames
lista_dfs = []

# Percorrer o diretório de downloads e carregar todos os arquivos CSV em DataFrames
for file_name in os.listdir(download_dir):
    if file_name.endswith('.csv'):
        file_path = os.path.join(download_dir, file_name)
        
        # Identificar colunas que podem conter CPF ou números que começam com zero
        # Definir essas colunas como tipo string durante a leitura
        df = pd.read_csv(file_path, dtype={
            'CPF': str,
            'Usuário': str  # Em alguns arquivos pode estar como Usuário
        })
        
        lista_dfs.append(df)

# Concatenar todos os DataFrames em um único DataFrame
df = pd.concat(lista_dfs, ignore_index=True)

# Garantir que CPF seja string e mantenha zeros à esquerda
if 'CPF' in df.columns:
    df['CPF'] = df['CPF'].astype(str)
    # Garante que CPFs com menos de 11 dígitos sejam preenchidos com zeros à esquerda
    df['CPF'] = df['CPF'].apply(lambda x: x.zfill(11) if x.isdigit() else x)

# Se tiver a coluna Usuário em vez de CPF
if 'Usuário' in df.columns:
    df['Usuário'] = df['Usuário'].astype(str)
    # Garante que CPFs com menos de 11 dígitos sejam preenchidos com zeros à esquerda
    df['Usuário'] = df['Usuário'].apply(lambda x: x.zfill(11) if x.isdigit() else x)

# Salvar o DataFrame consolidado em um arquivo CSV
df.to_csv(combined_csv_path, index=False, encoding='utf-8')
print(f"Arquivo consolidado salvo em: {combined_csv_path}")
