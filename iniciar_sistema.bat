@echo off
title Sistema de Demandas de Licitacao - IAD/UFJF
echo Iniciando o servidor do Sistema de Demandas do IAD...
cd /d "%~dp0"
start http://localhost:8080
python app.py
pause
