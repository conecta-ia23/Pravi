from pydantic import BaseModel

class BotActivationRequest(BaseModel):
    session_id: str
    is_active: bool

class AdvisorMessageRequest(BaseModel):
    session_id: str
    message: str