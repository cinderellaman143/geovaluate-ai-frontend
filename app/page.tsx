# backend/main.py

import os
import json
import logging
import time
import asyncio
from functools import wraps
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ValidationError
from typing import List
import google.generativeai as genai

# --- Timing Decorator ---
def timed(func):
    """This decorator prints the execution time of the function it decorates."""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start = time.time()
        result = await func(*args, **kwargs)
        duration = time.time() - start
        logger.info(f"⏱️ Function '{func.__name__}' took {duration:.2f}s")
        return result
    return wrapper

# --- Pydantic Models for Structured Data ---
class AnalysisRequest(BaseModel):
    address: str

class ReraListing(BaseModel):
    project_name: str = Field(..., description="The name of the RERA-approved project.")
    developer: str = Field(..., description="The name of the developer or builder.")
    details: str = Field(..., description="A brief summary of the project's details or key features.")
    source_url: str = Field(..., description="The direct URL to the listing or project page.")

class ReraResponse(BaseModel):
    listings: List[ReraListing]

# --- FastAPI Application Setup ---
app = FastAPI(
    title="GeoValuate AI API (Simple RERA Search)",
    version="1.0.4", # Version update for improved async handling
)

# --- Timing Middleware ---
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    logger.info(f"⏱️ Request '{request.method} {request.url.path}' took {process_time:.2f}s")
    return response

# --- CORS Middleware ---
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# --- Logging Configuration ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Simplified Prompt for Gemini ---
RERA_PROMPT = """
You are a real estate search assistant. Your task is to find RERA-approved residential property listings for a given location in India.

**Location to Search:**
{address}

**Instructions:**
1.  Perform a web search to find 3-5 RERA-approved residential projects or land listings currently available in or very near the specified location.
2.  For each listing, extract the project name, the developer, a brief summary of details, and the source URL.
3.  If you cannot find any RERA-approved listings, return an empty list.

**Output Format:**
Your final output MUST be a single, valid JSON object that strictly conforms to this Pydantic schema. Do not include any other text or notes.

{schema}
"""

# --- API Endpoint ---
@app.post("/api/find-rera-listings", response_model=ReraResponse)
@timed # Apply the timing decorator to this specific function
async def find_rera_listings(request: AnalysisRequest):
    logger.info(f"Received RERA search request for: {request.address}")
    
    try:
        if "GEMINI_API_KEY" not in os.environ:
            raise RuntimeError("GEMINI_API_KEY environment variable not set.")
        genai.configure(api_key=os.environ["GEMINI_API_KEY"])
        model = genai.GenerativeModel('gemini-1.5-flash')

        try:
            schema_json = ReraResponse.schema_json(indent=2)  # Pydantic v1
        except AttributeError:
            schema_json = json.dumps(ReraResponse.model_json_schema(), indent=2)  # Pydantic v2

        prompt = RERA_PROMPT.format(address=request.address, schema=schema_json)

        # Run the synchronous SDK call in a separate thread to avoid blocking the event loop
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, model.generate_content, prompt)

        cleaned_response_text = response.text.strip().replace("```json", "").replace("```", "").strip()
        response_data = json.loads(cleaned_response_text)
        validated_response = ReraResponse(**response_data)

        logger.info(f"✅ Found {len(validated_response.listings)} listings for {request.address}")
        return validated_response

    except Exception as e:
        logger.error(f"❌ Error in RERA search: {e}")
        raise HTTPException(status_code=500, detail="An error occurred while communicating with the AI model.")


@app.get("/")
def read_root():
    return {"status": "GeoValuate AI API (Simple RERA Search) is running"}
