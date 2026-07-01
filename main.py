from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
import asyncio
import uuid

# Initialize the API
app = FastAPI(title="Triage Agent Prototype", version="1.0")

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to your frontend's URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 1. Pydantic Models (Data Validation) ---

class WebhookPayload(BaseModel):
    channel: str = Field(..., example="whatsapp")
    sender_id: str = Field(..., example="1234567890")
    text: str = Field(..., example="I need help, my account is locked!")
    media_url: Optional[str] = None

class TriageResult(BaseModel):
    category: str
    urgency_score: int = Field(ge=1, le=10)
    requires_human: bool
    suggested_reply: Optional[str] = None

# --- Mock Database ---
# In a real build, this maps to your MySQL tables via an ORM like SQLAlchemy
leads_database: Dict[str, dict] = {}

# --- 2. Core AI Processing Logic ---

async def call_llm_triage(text: str, media_url: Optional[str] = None) -> TriageResult:
    """
    Simulates calling an LLM API (like OpenAI or Gemini).
    In a live version, you would use 'instructor' or native JSON mode here.
    """
    await asyncio.sleep(2) # Simulating network latency
    
    # Mocking simple routing logic for the prototype
    text_lower = text.lower()
    if "locked" in text_lower or "urgent" in text_lower:
        return TriageResult(
            category="urgent_support", urgency_score=9, requires_human=True
        )
    elif "price" in text_lower or "cost" in text_lower:
        return TriageResult(
            category="warm_lead", urgency_score=5, requires_human=False,
            suggested_reply="Our enterprise plans start at $99/mo. Would you like a demo?"
        )
    
    return TriageResult(category="general_inquiry", urgency_score=2, requires_human=True)


async def process_message_background(lead_id: str, payload: WebhookPayload):
    """
    The asynchronous worker that handles the AI routing without blocking the webhook.
    """
    try:
        # 1. Call the AI Model
        triage_data = await call_llm_triage(payload.text, payload.media_url)
        
        # 2. Update the Database
        leads_database[lead_id]["status"] = "triaged"
        leads_database[lead_id]["ai_analysis"] = triage_data.dict()
        
        # 3. Handle Auto-Replies vs Human Handoff
        if not triage_data.requires_human and triage_data.suggested_reply:
            print(f"[AUTO-REPLY via {payload.channel}] To {payload.sender_id}: {triage_data.suggested_reply}")
        else:
            print(f"[HUMAN HANDOFF] Lead {lead_id} added to the React dashboard queue.")
            
    except Exception as e:
        print(f"Error processing lead {lead_id}: {e}")
        leads_database[lead_id]["status"] = "failed"

# --- 3. API Endpoints ---

@app.post("/api/webhook/ingest", status_code=202)
async def ingest_webhook(payload: WebhookPayload, background_tasks: BackgroundTasks):
    """
    Receives messages, writes to the DB, and delegates AI processing to the background.
    """
    lead_id = str(uuid.uuid4())
    
    # Immediately persist raw data to prevent loss
    leads_database[lead_id] = {
        "id": lead_id,
        "raw_payload": payload.dict(),
        "status": "processing"
    }
    
    # Trigger background AI task
    background_tasks.add_task(process_message_background, lead_id, payload)
    
    # Return 202 Accepted immediately to the webhook provider
    return {"status": "accepted", "lead_id": lead_id}

@app.get("/api/leads/queue")
async def get_human_queue():
    """
    Endpoint for the React frontend to fetch leads requiring human review.
    """
    queue = [
        lead for lead in leads_database.values() 
        if lead.get("status") == "triaged" and lead.get("ai_analysis", {}).get("requires_human")
    ]
    # Sort by highest urgency score
    queue.sort(key=lambda x: x["ai_analysis"]["urgency_score"], reverse=True)
    return {"queue": queue}