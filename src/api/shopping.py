"""Persist each account's demo price targets and in-app notifications."""
import json
from typing import Optional, Literal
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, ConfigDict
from src.api.auth_deps import get_current_user
from src.database.models import User
from src.database.connection import get_connection

router = APIRouter(prefix='/api/shopping-state')


class Target(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)
    id: str = Field(max_length=100)
    productId: str = Field(pattern=r'^prod-\d+$')
    targetPrice: float = Field(gt=0, le=1000000)
    currency: Literal['INR', 'USD'] = 'INR'
    isTracking: bool = True
    addedAt: str = Field(max_length=100)
    lastNotifiedAt: Optional[str] = Field(default=None, max_length=100)
    note: Optional[str] = Field(default=None, max_length=1000)


class Notification(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)
    id: str = Field(max_length=100)
    trackingId: str = Field(max_length=100)
    productId: str = Field(pattern=r'^prod-\d+$')
    productName: str = Field(max_length=500)
    productImage: str = Field(max_length=2000)
    alertType: Literal['target_reached', 'price_drop']
    currentPrice: float = Field(ge=0, le=1000000)
    previousPrice: Optional[float] = None
    targetPrice: Optional[float] = None
    storeName: str = Field(max_length=100)
    message: str = Field(max_length=2000)
    timestamp: str = Field(max_length=100)
    isRead: bool = False
    deliveryStatus: str = Field(default='in_app_delivered', max_length=100)


class ShoppingState(BaseModel):
    trackedProducts: list[Target] = Field(default_factory=list, max_length=100)
    alerts: list[Notification] = Field(default_factory=list, max_length=200)


@router.get('')
def get_shopping_state(user: User = Depends(get_current_user)):
    with get_connection() as conn:
        row = conn.execute('SELECT state_json FROM user_shopping_state WHERE user_id = ?', (user.id,)).fetchone()
    return json.loads(row[0]) if row else {'trackedProducts': [], 'alerts': []}


@router.put('')
def save_shopping_state(state: ShoppingState, user: User = Depends(get_current_user)):
    payload = state.model_dump()
    with get_connection() as conn:
        conn.execute('''INSERT INTO user_shopping_state (user_id,state_json) VALUES (?,?)
            ON CONFLICT(user_id) DO UPDATE SET state_json=excluded.state_json, updated_at=CURRENT_TIMESTAMP''', (user.id, json.dumps(payload, allow_nan=False)))
    return {'success': True}
