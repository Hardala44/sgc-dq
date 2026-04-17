
import os
import shutil
import tempfile
import pandas as pd
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

from core.services.import_service import ImportService
from core.models import ImportBatch

# Concurrency Lock File
LOCK_FILE = "import.lock"

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("FastAPI Import Service Started")
    yield
    # Shutdown
    if os.path.exists(LOCK_FILE):
        try:
            os.remove(LOCK_FILE)
            logger.info("Removed lock file on shutdown")
        except:
            pass

app = FastAPI(lifespan=lifespan)

@app.post("/imports/excel")
def import_excel(file: UploadFile = File(...), force: bool = False):
    # 1. Check Concurrency
    if os.path.exists(LOCK_FILE):
        raise HTTPException(status_code=409, detail="Another import is currently in progress. Please wait.")
    
    # Create Lock
    try:
        with open(LOCK_FILE, 'w') as f:
            f.write("locked")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to acquire lock: {str(e)}")

    temp_path = None
    try:
        # 2. Save Upload
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(file.file, tmp)
            temp_path = tmp.name
        
        # 3. Run Import
        service = ImportService(temp_path, force=force)
        try:
            stats, unresolved = service.run()
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            logger.exception("Import failed")
            raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

        # 4. Prepare Response
        response_data = {
            "status": "success",
            "stats": stats,
            "unresolved_aliases_count": len(unresolved),
            "unresolved_aliases": unresolved
        }
        
        # If unresolved, generate CSV content (optional if client wants to download)
        if unresolved:
            df = pd.DataFrame(unresolved)
            csv_content = df.to_csv(index=False)
            response_data["unresolved_aliases_csv"] = csv_content

        return JSONResponse(content=response_data)

    finally:
        # Cleanup
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        
        if os.path.exists(LOCK_FILE):
            os.remove(LOCK_FILE)
