"""
FastAPI application for PhishGuard AI.
Exposes REST endpoints for real-time email scanning, batch inspection,
verified model performance metrics, and privacy-respecting scan history.
"""

from __future__ import annotations

import collections
import logging
import time
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator, Dict, List, Optional

from fastapi import (
    FastAPI,
    File,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.config import (
    CORS_ORIGINS,
    MAX_CONTENT_LENGTH,
    RATE_LIMIT_REQUESTS_PER_MINUTE,
)
from backend.database import (
    clear_history,
    delete_scan_record,
    fetch_scan_history,
    init_db,
)
from backend.schemas import (
    BatchPredictResponse,
    DeleteResponse,
    PredictRequest,
    PredictResponse,
    ScanHistoryResponse,
)
from backend.service import model_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("PhishGuard.API")


# =========================================================================
# APPLICATION LIFECYCLE
# =========================================================================

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Startup and shutdown lifecycle handler."""
    logger.info("Initializing PhishGuard AI SQLite Database...")
    init_db()

    logger.info("Loading Machine Learning artifacts (joblib pipeline & metrics.json)...")
    try:
        model_service.load()
    except Exception as e:
        logger.error(f"Failed to load ML artifacts: {e}", exc_info=True)
        raise e

    logger.info("PhishGuard AI Backend is operational and ready to receive requests.")
    yield
    logger.info("Shutting down PhishGuard AI Backend.")


app = FastAPI(
    title="PhishGuard AI — Threat Detection API",
    description="High-precision Phishing Email Classification, Threat Feature Extraction, and Explainability Service.",
    version="1.0.0",
    lifespan=lifespan,
)


# =========================================================================
# MIDDLEWARE: CORS, SIZE LIMIT, RATE LIMITING
# =========================================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory sliding-window IP rate limiter
_RATE_LIMIT_STORAGE: Dict[str, collections.deque] = collections.defaultdict(collections.deque)


@app.middleware("http")
async def security_and_rate_limit_middleware(request: Request, call_next: Any) -> Response:
    # 1. Check Content-Length size limit
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_CONTENT_LENGTH:
        return JSONResponse(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            content={
                "error": {
                    "code": 413,
                    "message": f"Payload exceeds maximum allowed limit of {MAX_CONTENT_LENGTH // (1024*1024)} MB.",
                    "type": "PayloadTooLarge",
                }
            },
        )

    # 2. Rate limiting (except for static/health routes)
    if not request.url.path.startswith("/api/health"):
        client_ip = request.client.host if request.client else "127.0.0.1"
        now = time.time()
        window_start = now - 60.0  # 1-minute window
        queue = _RATE_LIMIT_STORAGE[client_ip]

        # Purge timestamps older than 60 seconds
        while queue and queue[0] < window_start:
            queue.popleft()

        if len(queue) >= RATE_LIMIT_REQUESTS_PER_MINUTE:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": {
                        "code": 429,
                        "message": "Rate limit exceeded. Please wait before submitting more requests.",
                        "type": "TooManyRequests",
                    }
                },
            )
        queue.append(now)

    response = await call_next(request)
    return response


# =========================================================================
# API ROUTES
# =========================================================================

@app.get("/api/health", tags=["System"])
async def health_check() -> Dict[str, Any]:
    """Health check and model readiness status."""
    return {
        "status": "healthy" if model_service.is_ready else "degraded",
        "model_loaded": model_service.is_ready,
        "champion_model": model_service.metrics.get("champion_model", "Unknown"),
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
    }


@app.post("/api/predict", response_model=PredictResponse, tags=["Inference"])
async def predict_single_email(payload: PredictRequest) -> PredictResponse:
    """
    Analyzes an email for phishing threats.
    Returns prediction label, calibrated probability, confidence band,
    handcrafted feature values, local linear explainability, and static URL risk diagnostics.
    """
    try:
        result = model_service.predict(
            text=payload.text,
            subject=payload.subject,
            sender=payload.sender,
            save_content=payload.save_content,
        )
        return result
    except Exception as e:
        logger.error(f"Prediction failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference error: {str(e)}",
        )


@app.post("/api/predict/batch", response_model=BatchPredictResponse, tags=["Inference"])
async def predict_batch_emails(
    file: Optional[UploadFile] = File(default=None),
    files: Optional[List[UploadFile]] = File(default=None),
) -> BatchPredictResponse:
    """
    Accepts a CSV file with email texts or multiple uploaded .eml files.
    Returns threat assessments for each item in the batch.
    """
    # 1. CSV Upload Mode
    if file is not None and (file.filename or "").lower().endswith(".csv"):
        contents = await file.read()
        try:
            return model_service.process_batch_csv(contents)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to process CSV file: {str(e)}",
            )

    # 2. Multiple .eml Files Mode
    eml_items = files or ([file] if file else [])
    eml_buffers = []
    for f in eml_items:
        if f.filename and f.filename.lower().endswith(".eml"):
            data = await f.read()
            eml_buffers.append((f.filename, data))

    if eml_buffers:
        try:
            return model_service.process_batch_eml(eml_buffers)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to process .eml files: {str(e)}",
            )

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Please upload either a .csv file containing an email column or one or more .eml files.",
    )


@app.get("/api/metrics", tags=["Intelligence"])
async def get_model_evaluation_metrics() -> Dict[str, Any]:
    """
    Returns authentic, verified evaluation metrics computed from model training on the held-out test set:
    accuracy, precision, recall, F1, ROC-AUC, confusion matrix, ROC coordinates, and model comparisons.
    """
    if not model_service.metrics:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Evaluation metrics are not loaded.",
        )
    return model_service.metrics


@app.get("/api/history", response_model=ScanHistoryResponse, tags=["Audit History"])
async def get_history(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    verdict: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
) -> ScanHistoryResponse:
    """
    Returns paginated audit trail of previous scans stored in SQLite.
    Supports filtering by verdict (Phishing/Safe) and searching by subject, sender, or SHA-256 hash.
    """
    total, items = fetch_scan_history(limit=limit, offset=offset, verdict=verdict, search=search)
    return ScanHistoryResponse(total=total, limit=limit, offset=offset, items=items)


@app.delete("/api/history/{record_id}", response_model=DeleteResponse, tags=["Audit History"])
async def delete_history_item(record_id: int) -> DeleteResponse:
    """Deletes a scan entry from the SQLite audit log."""
    deleted = delete_scan_record(record_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan record with ID {record_id} not found.",
        )
    return DeleteResponse(success=True, message=f"Record {record_id} successfully deleted.")


@app.post("/api/history/clear", response_model=DeleteResponse, tags=["Audit History"])
async def clear_all_history_records() -> DeleteResponse:
    """Clears all audit scan history."""
    count = clear_history()
    return DeleteResponse(success=True, message=f"Audit history cleared ({count} records deleted).")
