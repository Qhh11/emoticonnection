# EmotionConnect — 产品需求文档（PRD）

> **EmotionConnect** 是一个以“情绪理解”为核心的 **AI 情绪陪伴 + 匿名匹配聊天应用**。
> 本 README 文档为项目的《需求文档（PRD）》主文件，用于指导整个产品的设计与开发。

---

## 📘 1. 项目简介（Overview）

EmotionConnect 致力于为现代年轻人提供一个 **温柔、匿名、无压力** 的情绪栖息空间。
通过 Gemini AI、情绪识别、匿名匹配聊天和情绪日记系统，平台让用户获得稳定、可依赖的情感支持。

### ✨ 核心价值

* 让每个用户都能被理解
* 提供情绪安全的社交场景
* 用 AI 陪伴与洞察支持心理健康
* 为匿名社交创造温柔体验

---

## 🌟 2. 核心功能（Key Features）

EmotionConnect 包含 4 大功能模块：

### 2.1 🤖 AI 情绪陪伴聊天（AI Chat）

* 多轮自然对话
* 情绪分析（焦虑/难过/疲惫/开心等）
* 温柔陪伴型 AI 人格
* 安全过滤 & 情绪危机识别
* 建议与内容生成（安慰/冥想/呼吸练习）
* 支持短期 + 长期记忆

---

### 2.2 👥 匿名匹配聊天（Peer Chat）

* 随机/智能匹配（embedding-based）
* 真人聊天
* 实时 WebSocket 聊天
* 匿名，不暴露身份
* 可随时结束交谈

---

### 2.3 📓 情绪日记（Emotion Diary）

* 文本输入（日记）
* AI 自动摘要
* 自动情绪分类
* 情绪趋势图（周/月）
* 用户情绪模式发现

---

### 2.4 🎧 情绪推荐（Recommendation）

* 基于情绪推荐音乐、句子、文章
* 支持 RAG 检索增强
* 推荐会随着用户习惯自动优化

---

## 🌟 3. 用户流程（User Flow）

1. 注册 / 匿名进入
2. 用户选择：

   * 与 AI 聊天
   * 匹配聊天
   * 写情绪日记
3. AI 分析情绪并提供支持
4. 用户查看情绪趋势与洞察
5. 平台不断优化匹配 & 推荐

---

## 🌟 4. 项目目标（Goals）

### 🎯 Must-have（第一阶段）

* AI 聊天（Gemini）
* 情绪识别（LLM 分类）
* 匿名聊天（WebSocket）
* 用户系统
* 日记 + 摘要 + 分类

### 🎯 Should-have（第二阶段）

* 用户画像 embedding
* 智能匹配
* 情绪推荐系统

### 🎯 Could-have（未来）

* 多 AI 角色
* 更深的心理洞察模型
* 多媒体推荐（视频/播客）

---

## 🌟 5. 功能需求（Functional Requirements）

### 5.1 AI Chat

| 编号  | 需求            |
| --- | ------------- |
| FR1 | 多轮上下文对话       |
| FR2 | 情绪识别          |
| FR3 | AI 人格（温柔、理解型） |
| FR4 | 内容建议（安慰/冥想）   |
| FR5 | 对话历史存储        |
| FR6 | 安全过滤（自伤/暴力）   |

---

### 5.2 匹配聊天

| 编号   | 需求               |
| ---- | ---------------- |
| FR7  | 匹配队列管理           |
| FR8  | WebSocket 实时通信   |
| FR9  | 用户 embedding 存储  |
| FR10 | 相似度匹配（embedding） |
| FR11 | 自动开场白            |

---

### 5.3 情绪日记

| 编号   | 需求    |
| ---- | ----- |
| FR12 | 文本输入  |
| FR13 | 自动摘要  |
| FR14 | 情绪分类  |
| FR15 | 情绪趋势图 |

---

### 5.4 推荐系统

| 编号   | 需求          |
| ---- | ----------- |
| FR16 | 基于情绪推荐      |
| FR17 | 支持 RAG 内容检索 |
| FR18 | 个性化推荐       |

---

## 🌟 6. 非功能性需求（NFR）

### 6.1 性能

* AI 回复速度 < 1 秒（Gemini Flash）
* WebSocket 延迟 < 150ms

### 6.2 安全

* 敏感内容自动过滤
* 匿名匹配无身份暴露

### 6.3 可维护性

* 项目模块化
* 支持热更新（Dev 模式）

### 6.4 可扩展性

后期可加入：

* vLLM
* 自建 embedding 模型
* 离线模式

---

## 🌟 7. 系统架构（Architecture Overview）

```plaintext
Frontend (React / React Native)
      │
      ▼
API Server (FastAPI)
      │
      ├── AI Chat Service (Gemini)
      ├── Peer Matching Service (WebSocket)
      ├── Emotion Diary Service
      ├── Recommendation Service (RAG)
      ├── Embedding Pipeline
      ├── Qdrant (vector DB)
      └── PostgreSQL
```

---

## 🌟 8. 项目目录结构（Project Structure）

```plaintext
emotionconnect/
│
├── backend/               ← FastAPI 后端服务
│   ├── api/               ← API 路由（Chat/Match/Diary/User…）
│   ├── core/              ← AI 核心逻辑
│   ├── db/                ← PostgreSQL ORM & Session
│   ├── main.py            ← 后端入口
│   └── requirements.txt
│
├── services/              ← WebSocket 实时聊天
│
├── ai/                    ← Prompt / Embedding / RAG / 配置
│
├── vector-db/             ← Qdrant
│
├── database/              ← SQL schema & migrations
│
├── frontend/              ← React Native / React
│
├── infra/                 ← Docker & 部署
│
└── docs/                  ← PRD、TechDoc、API 文档
```

---

## 🌟 9. 技术栈（Tech Stack）

| 层级   | 技术                                  |
| ---- | ----------------------------------- |
| AI   | Gemini 2.0 Flash / Gemini Embedding |
| API  | FastAPI                             |
| 实时聊天 | WebSocket                           |
| 数据库  | PostgreSQL                          |
| 向量库  | Qdrant                              |
| 前端   | React Native / React                |
| 部署   | Docker Compose                      |
