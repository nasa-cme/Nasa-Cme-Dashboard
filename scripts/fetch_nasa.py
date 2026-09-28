#!/usr/bin/env python3
"""
fetch_nasa.py — Pipeline automatizado de coleta de dados CME da NASA DONKI API.

Este script:
  1. Consulta a API DONKI CME (https://api.nasa.gov/DONKI/CME)
  2. Normaliza os campos para o formato do banco Supabase
  3. Envia os dados ao Supabase em lotes (batch upsert)
  4. Realiza deduplicação antes do upsert para evitar erro PostgreSQL 21000
  5. Registra cada execução na tabela 'execucoes' com status e métricas
  6. Em caso de falha parcial, encerra com sys.exit(1) para visibilidade no GitHub Actions

Variáveis de ambiente necessárias:
  - SUPABASE_URL: URL do projeto Supabase
  - SUPABASE_KEY: Chave de serviço (service_role) do Supabase
  - NASA_API_KEY: Chave da API da NASA (opcional, padrão: DEMO_KEY)

Tabelas esperadas no Supabase:
  - cme_events: tabela principal com os eventos CME normalizados
  - execucoes: tabela de registro de execuções do pipeline
"""

import os
import sys
import json
import logging
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any

import requests
from supabase import create_client, Client

# ---------------------------------------------------------------------------
# Configuração de logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------
NASA_API_BASE = "https://api.nasa.gov/DONKI/CME"
BATCH_SIZE = 50  # Tamanho de cada lote para upsert
MAX_RETRIES = 3  # Tentativas de retry para a API da NASA
REQUEST_TIMEOUT = 30  # Timeout em segundos

# Status possíveis para a tabela execucoes
STATUS_CONCLUIDO = "concluido"
STATUS_ERRO_PARCIAL = "erro_parcial"
STATUS_ERRO_CRITICO = "erro_critico"


# ---------------------------------------------------------------------------
# Funções auxiliares
# ---------------------------------------------------------------------------

def get_env_var(name: str, default: str | None = None, required: bool = False) -> str:
    """Obtém variável de ambiente com validação."""
    value = os.environ.get(name, default)
    if required and not value:
        logger.error(f"Variável de ambiente obrigatória '{name}' não definida.")
        sys.exit(1)
    return value or ""


def generate_record_hash(record: dict[str, Any]) -> str:
    """
    Gera um hash único para um registro CME.
    Usado para deduplicação antes do upsert.
    """
    # Campos que identificam unicamente um evento
    key_fields = {
        "activity_id": record.get("activity_id"),
        "start_time": record.get("start_time"),
        "source_location": record.get("source_location"),
    }
    key_string = json.dumps(key_fields, sort_keys=True, default=str)
    return hashlib.sha256(key_string.encode()).hexdigest()


def pick_best_analysis(analyses: list[dict] | None) -> dict | None:
    """Seleciona a melhor análise CME (isMostAccurate ou a última)."""
    if not analyses:
        return None
    most_accurate = next((a for a in analyses if a.get("isMostAccurate")), None)
    return most_accurate or analyses[-1]


def is_earth_directed(analysis: dict | None) -> bool:
    """Heurística simples para detectar CMEs direcionados à Terra."""
    if not analysis:
        return False
    lat = analysis.get("latitude")
    lon = analysis.get("longitude")
    if lat is None or lon is None:
        return False
    return abs(lat) < 30 and abs(lon) < 30


def normalize_event(raw: dict) -> dict:
    """
    Normaliza um registro bruto da API DONKI para o formato do banco.
    """
    analysis = pick_best_analysis(raw.get("cmeAnalyses"))
    
    return {
        "activity_id": raw.get("activityID"),
        "start_time": raw.get("startTime"),
        "source_location": raw.get("sourceLocation") or None,
        "note": raw.get("note") or None,
        "instruments": [i.get("displayName") for i in (raw.get("instruments") or []) if i.get("displayName")],
        "speed": analysis.get("speed") if analysis else None,
        "type": analysis.get("type") if analysis else None,
        "is_earth_directed": is_earth_directed(analysis),
        "latitude": analysis.get("latitude") if analysis else None,
        "longitude": analysis.get("longitude") if analysis else None,
        "half_angle": analysis.get("halfAngle") if analysis else None,
        "link": raw.get("link") or None,
        "linked_events": [e.get("activityID") for e in (raw.get("linkedEvents") or []) if e and e.get("activityID")],
        "record_hash": generate_record_hash(raw),
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }


def fetch_nasa_data(
    api_key: str,
    start_date: str,
    end_date: str,
) -> list[dict]:
    """
    Busca dados CME da API DONKI da NASA.
    """
    url = f"{NASA_API_BASE}"
    params = {
        "startDate": start_date,
        "endDate": end_date,
        "api_key": api_key,
    }

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            logger.info(f"Consultando API NASA (tentativa {attempt}/{MAX_RETRIES})...")
            response = requests.get(url, params=params, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            data = response.json()
            logger.info(f"API retornou {len(data)} registros.")
            return data
        except requests.exceptions.RequestException as e:
            logger.warning(f"Tentativa {attempt} falhou: {e}")
            if attempt == MAX_RETRIES:
                raise


def deduplicate_records(records: list[dict]) -> list[dict]:
    """
    Remove duplicatas baseado no record_hash.
    Evita o erro PostgreSQL 21000 (unique_violation) durante o upsert.
    """
    seen_hashes = set()
    unique_records = []
    duplicates_count = 0

    for record in records:
        record_hash = record.get("record_hash")
        if record_hash in seen_hashes:
            duplicates_count += 1
            continue
        seen_hashes.add(record_hash)
        unique_records.append(record)

    if duplicates_count > 0:
        logger.info(f"Removidos {duplicates_count} registros duplicados.")

    return unique_records


def upsert_batch(supabase: Client, records: list[dict]) -> int:
    """
    Realiza upsert de um lote de registros no Supabase.
    Retorna o número de registros processados com sucesso.
    """
    try:
        result = supabase.table("cme_events").upsert(
            records,
            on_conflict="activity_id",
        ).execute()
        return len(result.data) if result.data else 0
    except Exception as e:
        logger.error(f"Erro no upsert do lote: {e}")
        raise


def register_execution(
    supabase: Client,
    registros_processados: int,
    lotes: int,
    erros: int,
    status: str,
    detalhes: str | None = None,
) -> None:
    """
    Registra a execução na tabela 'execucoes'.
    """
    execution_data = {
        "executed_at": datetime.now(timezone.utc).isoformat(),
        "registros_processados": registros_processados,
        "lotes": lotes,
        "erros": erros,
        "status": status,
        "detalhes": detalhes,
    }

    try:
        supabase.table("execucoes").insert(execution_data).execute()
        logger.info(f"Execução registrada com status: {status}")
    except Exception as e:
        logger.error(f"Falha ao registrar execução: {e}")
        # Não falhamos o pipeline inteiro por causa do registro de execução


# ---------------------------------------------------------------------------
# Pipeline principal
# ---------------------------------------------------------------------------

def run_pipeline() -> None:
    """
    Executa o pipeline completo de coleta e armazenamento de dados.
    """
    logger.info("=" * 60)
    logger.info("Iniciando pipeline de coleta de dados CME")
    logger.info("=" * 60)

    # 1. Configuração
    supabase_url = get_env_var("SUPABASE_URL", required=True)
    supabase_key = get_env_var("SUPABASE_KEY", required=True)
    nasa_api_key = get_env_var("NASA_API_KEY", default="DEMO_KEY")

    # 2. Inicializar cliente Supabase
    try:
        supabase: Client = create_client(supabase_url, supabase_key)
        logger.info("Cliente Supabase inicializado com sucesso.")
    except Exception as e:
        logger.error(f"Falha ao inicializar cliente Supabase: {e}")
        register_execution(supabase, 0, 0, 1, STATUS_ERRO_CRITICO, str(e))
        sys.exit(1)

    # 3. Definir período de busca (últimos 30 dias por padrão)
    end_date = datetime.now(timezone.utc).date()
    start_date = end_date - timedelta(days=30)
    start_str = start_date.isoformat()
    end_str = end_date.isoformat()

    logger.info(f"Período de busca: {start_str} a {end_str}")

    # 4. Buscar dados da API NASA
    try:
        raw_data = fetch_nasa_data(nasa_api_key, start_str, end_str)
    except Exception as e:
        logger.error(f"Falha crítica ao buscar dados da NASA: {e}")
        register_execution(supabase, 0, 0, 1, STATUS_ERRO_CRITICO, str(e))
        sys.exit(1)

    if not raw_data:
        logger.info("Nenhum dado retornado pela API. Registrando execução.")
        register_execution(supabase, 0, 0, 0, STATUS_CONCLUIDO, "Nenhum dado no período")
        return

    # 5. Normalizar dados
    logger.info("Normalizando registros...")
    normalized_records = [normalize_event(raw) for raw in raw_data]
    logger.info(f"{len(normalized_records)} registros normalizados.")

    # 6. Deduplicação
    logger.info("Realizando deduplicação...")
    unique_records = deduplicate_records(normalized_records)
    logger.info(f"{len(unique_records)} registros únicos após deduplicação.")

    # 7. Upsert em lotes
    logger.info(f"Enviando dados ao Supabase em lotes de {BATCH_SIZE}...")
    total_processed = 0
    total_batches = 0
    total_errors = 0
    error_messages = []

    for i in range(0, len(unique_records), BATCH_SIZE):
        batch = unique_records[i : i + BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        total_batches += 1

        try:
            processed = upsert_batch(supabase, batch)
            total_processed += processed
            logger.info(f"Lote {batch_num}: {processed} registros processados.")
        except Exception as e:
            total_errors += 1
            error_msg = f"Lote {batch_num}: {str(e)}"
            error_messages.append(error_msg)
            logger.error(f"Erro no lote {batch_num}: {e}")

    # 8. Determinar status final
    if total_errors == 0:
        status = STATUS_CONCLUIDO
        detalhes = None
    elif total_processed > 0:
        status = STATUS_ERRO_PARCIAL
        detalhes = "; ".join(error_messages)
    else:
        status = STATUS_ERRO_CRITICO
        detalhes = "; ".join(error_messages)

    # 9. Registrar execução
    register_execution(
        supabase,
        registros_processados=total_processed,
        lotes=total_batches,
        erros=total_errors,
        status=status,
        detalhes=detalhes,
    )

    # 10. Resultado final
    logger.info("=" * 60)
    logger.info(f"Pipeline concluído com status: {status}")
    logger.info(f"  - Registros processados: {total_processed}")
    logger.info(f"  - Lotes: {total_batches}")
    logger.info(f"  - Erros: {total_errors}")
    logger.info("=" * 60)

    # 11. Exit code para o GitHub Actions
    if status == STATUS_ERRO_CRITICO:
        logger.error("Pipeline falhou criticamente. Encerrando com exit code 1.")
        sys.exit(1)
    elif status == STATUS_ERRO_PARCIAL:
        logger.warning("Pipeline concluiu com erros parciais. Encerrando com exit code 1.")
        sys.exit(1)
    else:
        logger.info("Pipeline concluído com sucesso.")
        sys.exit(0)


if __name__ == "__main__":
    run_pipeline()
