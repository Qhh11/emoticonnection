from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

from database.crud.user_crud import authenticate_user, create_user_with_password

app = FastAPI(title="EmotionConnect")

templates = Jinja2Templates(directory="app/templates")


@app.get("/", include_in_schema=False)
def root() -> RedirectResponse:
    return RedirectResponse(url="/login", status_code=302)


@app.get("/register", response_class=HTMLResponse, include_in_schema=False)
def register_page(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        "register.html",
        {"request": request, "error": None, "success": None},
    )


@app.post("/register", response_class=HTMLResponse, include_in_schema=False)
def register_submit(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    email: Optional[str] = Form(None),
    nickname: Optional[str] = Form(None),
) -> HTMLResponse:
    user_id = create_user_with_password(
        username=username.strip(),
        password=password,
        email=(email.strip() if email else None),
        nickname=(nickname.strip() if nickname else ""),
    )

    if not user_id:
        return templates.TemplateResponse(
            "register.html",
            {"request": request, "error": "User already exists", "success": None},
            status_code=400,
        )

    return templates.TemplateResponse(
        "register.html",
        {"request": request, "error": None, "success": f"Registration successful (user_id={user_id})"},
    )


@app.get("/login", response_class=HTMLResponse, include_in_schema=False)
def login_page(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(
        "login.html",
        {"request": request, "error": None, "success": None},
    )


@app.post("/login", response_class=HTMLResponse, include_in_schema=False)
def login_submit(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
) -> HTMLResponse:
    user = authenticate_user(username=username.strip(), password=password)
    if not user:
        return templates.TemplateResponse(
            "login.html",
            {"request": request, "error": "Invalid username or password", "success": None},
            status_code=401,
        )

    nickname = user.get("nickname") or user.get("username")
    user_id = str(user.get("_id"))
    return templates.TemplateResponse(
        "login.html",
        {
            "request": request,
            "error": None,
            "success": f"Login successful: {nickname} (user_id={user_id}, {datetime.utcnow().isoformat()}Z)",
        },
    )
