FROM python:3.11-slim

# 安装系统依赖（包括 Rust 工具链）
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    && curl https://sh.rustup.rs -sSf | sh -s -- -y \
    && apt-get clean

# 把 Rust 加入 PATH
ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /app

# 复制 backend 和 database
COPY backend/ ./backend
COPY database/ ./database
COPY genai/ ./genai

# 安装依赖
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 设置 Python 路径
ENV PYTHONPATH="/app/backend:/app/database"

# 启动服务（根据你的入口文件）
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]