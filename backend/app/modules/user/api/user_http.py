# app/modules/user/api/user_http.py

from fastapi import APIRouter, HTTPException
from bson import ObjectId

from crud.user_crud import users, update_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/{user_id}")
def get_user_by_id(user_id: str):
    try:
        obj_id = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user_id")

    user = users.find_one({"_id": obj_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user["_id"] = str(user["_id"])
    user.pop("hashed_password", None)
    return user


@router.put("/{user_id}")
def update_user_by_id(user_id: str, payload: dict):
    success = update_user(user_id, payload)
    if not success:
        raise HTTPException(status_code=400, detail="Update failed")

    return {"success": True}
