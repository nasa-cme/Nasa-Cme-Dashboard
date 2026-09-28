# NASACME3 — CME Watch Dashboard

## Projeto

Dashboard baseado em browser para visualização de eventos de Massa de Coroa (CME) da API DONKI da NASA.

## Estrutura

```
NASACME3/
├── index.html              # Shell da aplicação
├── style.css               # Estilos globais, efeitos CRT
├── script.js               # Integração com API, renderização de gráficos
├── scripts/
│   └── fetch_nasa.py       # Pipeline de coleta de dados (GitHub Actions)
├── supabase/
│   └── migrations/
│       └── 001_create_tables.sql  # Migração inicial das tabelas
└── .github/
    └── workflows/
        └── update-data.yml # Workflow de atualização automatizada
```

## Pipeline de Dados

O pipeline é executado automaticamente via GitHub Actions (cron diário às 06:00 UTC) ou manualmente via `workflow_dispatch`.

### Variáveis de Ambiente (Secrets do GitHub)

| Nome | Descrição | Obrigatório |
|------|-----------|-------------|
| `SUPABASE_URL` | URL do projeto Supabase | Sim |
| `SUPABASE_SERVICE_KEY` | Chave de serviço (service_role) do Supabase | Sim |
| `NASA_API_KEY` | Chave da API da NASA (padrão: DEMO_KEY) | Não |

### Tabelas do Supabase

- **cme_events**: Armazena os eventos CME normalizados
- **execucoes**: Registra cada execução do pipeline com status e métricas

### Status de Execução

- `concluido`: Pipeline executado com sucesso
- `erro_parcial`: Alguns lotes falharam, mas dados foram gravados
- `erro_critico`: Falha total, nenhum dado gravado

## Convenções

- Código JavaScript sem build step (vanilla JS)
- Pipeline Python com tipagem e logging estruturado
- Commits em português
- Mensagens de erro descritivas para facilitar debug
