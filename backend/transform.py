import pandas as pd
import re
import streamlit as st
import numpy as np
from datetime import datetime
import uuid
import os
# Diretório base (onde o script transform.py está localizado)
base_dir = os.path.dirname(os.path.abspath(__file__))

# Caminhos absolutos para os arquivos
csv_path = os.path.join(base_dir, 'tabela_historico.csv')
excel_path = os.path.join(base_dir, 'objetos.xlsx')

# Carregar os dados com os tipos apropriados para preservar os zeros à esquerda
df = pd.read_csv(csv_path, dtype={
    'CPF': str,
    'Usuário': str  # Em alguns arquivos pode estar como Usuário
})

df_objetos = pd.read_excel(excel_path)

# Merge através do número do processo para trazer o objeto
df = pd.merge(df, df_objetos, on='Processo', how='left')

# Renomear colunas
df.rename(columns={'objeto': 'Objeto',
                   'Usuário': 'CPF'}, inplace=True)
# df_usuarios.rename(columns={'CPF1': 'CPF',
#                             'nome1': 'Nome'}, inplace=True)

# Garantir que CPF seja string e mantenha zeros à esquerda
if 'CPF' in df.columns:
    df['CPF'] = df['CPF'].astype(str)
    # Garantir que CPFs com menos de 11 dígitos sejam preenchidos com zeros à esquerda
    df['CPF'] = df['CPF'].apply(lambda x: x.zfill(11) if x and x.isdigit() else x)

# Substituir '/' por '-' na coluna 'Data/Hora'
df['Data/Hora'] = df['Data/Hora'].str.replace('/', '-')

# # Separar a data e a hora, mantendo apenas a data
# df['Data/Hora'] = df['Data/Hora'].str.split(' ').str[0]

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
# df_andamento.drop(columns=['Órgao', 'data', 'id_nivel'], inplace=True)

# Exclui todas as linhas onde a coluna 'Documento' contém valores vazios
df = df.dropna(subset=['Documento'])

# Adiciona uma coluna id unica
df['id'] = [str(uuid.uuid4()) for _ in range(len(df))]

# Garantir que os números de protocolo também sejam strings
if 'Protocolo' in df.columns:
    df['Protocolo'] = df['Protocolo'].astype(str)

# Salvar o DataFrame atualizado em um novo arquivo CSV
# Usar quoting para garantir que strings sejam citadas corretamente e preservem zeros à esquerda
df.to_csv(r'./backend/df.csv', index=False, encoding='utf-8', quoting=1)
print(f"Arquivo atualizado salvo em: {r'./backend/df.csv'}")
