@echo off
setlocal enabledelayedexpansion

:: Muda para o diretório raiz do projeto, independente de onde o script é executado
cd /d "%~dp0.."
echo Diretório atual: %cd%

:: Verifica se os diretórios necessários existem
if not exist "backend" (
    echo Erro: Diretório 'backend' não encontrado.
    goto error
)

if not exist "backend\downloads" (
    echo Criando diretório 'backend\downloads'...
    mkdir "backend\downloads"
)

:: Verifica/cria diretório público para o frontend
if not exist "public\backend" (
    echo Criando diretório 'public\backend'...
    mkdir "public\backend"
)

:: Executa os scripts Python
echo Executando extract.py...
python backend\extract.py
if %errorlevel% neq 0 (
    echo Erro ao executar extract.py
    goto error
)

echo Executando load.py...
python backend\load.py
if %errorlevel% neq 0 (
    echo Erro ao executar load.py
    goto error
)

echo Executando transform.py...
python backend\transform.py
if %errorlevel% neq 0 (
    echo Erro ao executar transform.py
    goto error
)

echo Executando gerar_df_csv.py...
python backend\gerar_df_csv.py
if %errorlevel% neq 0 (
    echo Erro ao executar gerar_df_csv.py
    goto error
)

:: Copia o arquivo processado para a pasta pública
echo Copiando dados processados para o frontend...
copy /Y "backend\df.csv" "public\backend\"
if %errorlevel% neq 0 (
    echo Erro ao copiar o arquivo df.csv para a pasta pública
    goto error
)

echo Processo concluído com sucesso!
goto end

:error
echo Processo concluído com erros.

:end
pause
endlocal