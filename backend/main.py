from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api import ai_chat, emotion

app = FastAPI(title="EmotionConnect API")

# CORS 配置
# 允许跨域请求的来源列表
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:8000",
]

# 添加 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册 AI 聊天路由
# prefix="/api/ai-chat": 路由前缀
# tags=["ai-chat"]: 用于 API 文档分类
app.include_router(ai_chat.router, prefix="/api/ai-chat", tags=["ai-chat"])
app.include_router(emotion.router, prefix="/api/emotion", tags=["emotion"])

@app.get("/")
async def root():
    """
    根路由，用于检查 API 是否运行正常
    """
    return {"message": "Welcome to EmotionConnect API"}
