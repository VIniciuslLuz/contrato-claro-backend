@echo off
echo Corrigindo repositorio Git...
echo.

echo 1. Mudando para o repositorio correto...
git remote set-url origin https://github.com/VIniciuslLuz/contrato-claro-backend.git

echo 2. Verificando repositorio...
git remote -v

echo 3. Fazendo push para o repositorio correto...
git push -u origin main

echo.
echo Pronto! Backend enviado para o GitHub correto.
pause
