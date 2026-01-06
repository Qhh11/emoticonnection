# 📘 EmotionConnect 

EmotionConnect 是一个面向年轻人与学生群体的 **情绪支持应用**。
通过 AI 与 Peer（真人）双聊天系统、情绪分析、匿名树洞社区、积分体系等模块，为用户提供安全、匿名、温暖的在线情绪陪伴体验。



---

# � 目录

1. [项目简介](#项目简介)
2. [核心功能模块](#核心功能模块)
   * [情绪记录 Emotion Diary](#情绪记录-emotion-diary)
   * [AI 聊天 aiChat](#ai-聊天-aichat)
   * [匹配聊天 Peer Chat](#匹配聊天-peer-chat)
   * [匿名树洞社区 Emotion Hub](#匿名树洞社区-emotion-hub)
   * [情绪分析与可视化 Emotion Insight](#情绪分析与可视化-emotion-insight)
   * [积分体系与个性化 Personalization](#积分体系与个性化-personalization)
3. [用户系统](#用户系统)
4. [安全与伦理设计](#安全与伦理设计)
5. [推荐产品流程（User Journey）](#推荐产品流程user-journey)
6. [技术架构（前端/后端/AI）](#技术架构前端后端ai)
7. [后续开发路线图](#后续开发路线图)

---

# 🧭 项目简介

EmotionConnect 旨在构建一个：

* **安全、匿名、无评判**
* **AI + Peer 双模式支持**
* **有结构化情绪教育意义**
* **具备用户成长体系**

的情绪陪伴平台。

核心理念：

> “让每个人都能被倾听，也能成为他人的光。”

App 通过引导用户表达、记录、反思与分析情绪，从而在日常生活中持续提升情绪识别能力（Emotional Literacy）。

---

# 🧩 核心功能模块

## 1. 情绪记录 Emotion Diary

每日记录用户的情绪状态与背后触发事件。

### 🔹 功能点

* **三种输入方式**：文本、语音、图片
* **标签系统（主情绪 + 副情绪 + 身体感受 + 事件类型）**
  * 主情绪：开心/悲伤/焦虑
  * 副情绪：愉悦、紧张、无助、暴躁
  * 身体感受：疲惫、轻松、头胀
  * 事件类型：人际 / 学习 / 恋爱 / 家庭
* **理想陪伴方式**：记录用户当下需要“倾听/建议/陪伴”
* 支持当日回顾、未来情绪趋势预测（依赖 AI）

---

## 2. AI 聊天 aiChat

提供五种专业化情绪应对模式：

### 🔹 2.1 倾诉模式（Venting）

* AI 不评价、不建议
* 只倾听
* 遵循人本主义倾听技巧（反映情绪、复述感受）

### 🔹 2.2 分析模式（Analytic）

* 提供结构化分析，包括：
  * 触发因素
  * 情绪链路
  * 需求推断
  * 可控与不可控因素

### 🔹 2.3 陪伴模式（Chill）

* 更轻松的闲聊语气
* 作为用户的“陪伴者，而非顾问”

### 🔹 2.4 稳定模式（Stabilize）

* 帮助用户在情绪高 arousal 状态下平稳下来
* 包含：呼吸引导、grounding 技巧、短时注意力切换方法

### 🔹 2.5 正念模式（Mindfulness）

* 1–3 分钟练习
* 呼吸、身体扫描、自我慈悲练习

---

## 3. 匹配聊天 Peer Chat

提供用户与真实用户之间的匿名一对一聊天。

### 🔹 匹配参数

* 情绪相似度（主权重）
* 当前需求（想倾诉 / 想倾听）
* 聊天偏好（短聊 / 长聊）
* 年龄区间（可选）

### 🔹 匹配后功能

* 匿名聊天
* AI 自动分析聊天内容并提示安全边界
* 聊天结束后可选择：
  * 👍 点赞
  * ⭐ 收藏
  * 🚫 屏蔽
  * 🔄 继续匹配

---

## 4. 匿名树洞社区 Emotion Hub

一个沉浸式匿名情绪社区。

### 🔹 功能点

* 发布匿名情绪动态
* 浏览他人动态
* 情绪分类：
  * 焦虑、人际、学业压力、开心、失眠、失落
* 支持评论、点赞
* 系统每天推荐一条“需要你回应的树洞”

### 🔹 “反向树洞”

* 用户被动收到“别人需要帮助”的动态
* 强化“我也可以支援别人”的意义感
* 积极心理学的助人结构设计

---

## 5. 情绪分析与可视化 Emotion Insight

基于用户一段时间的输入自动生成：

### 🔹 周/月度总结

* 情绪波动曲线
* 高频情绪词云
* 常见触发情境
* 心情平均得分
* 建议与趋势预测

---

## 6. 积分体系与个性化 Personalization

通过游戏化机制帮助用户坚持使用。

### 🔹 积分来源

* 每天完成情绪记录
* 回复他人树洞
* 使用正念练习
* 完成每日任务

### 🔹 积分用途

* 兑换头像
* 兑换 AI 风格（如：温柔型、理性型）
* 个性化个人主页主题

---

# 👤 用户系统

* First Login：设置基本档案
* MBTI 测试
* 个人主页
* 账号设置

---

# 🛡️ 安全与伦理设计

EmotionConnect 将情绪安全作为最高优先级。

### 🔹 对话安全边界提示

AI 识别高风险内容并提醒：

* 不提供诊断
* 不提供自残方法
* 鼓励用户寻求专业帮助
* 提供危机热线信息（需本地化）

### 🔹 内容审核机制

* 社区内容自动审核
* 敏感词识别
* 举报系统

### 🔹 数据与隐私

* 全程匿名
* 所有数据本地加密
* 用户可选择自动清除历史记录

---

# 🌈 推荐产品流程（User Journey）

1. **登录 → 设置心情 → 选择模式（AI / Peer）**
2. **聊天或记录 → 系统自动分析 → 积分奖励**
3. **浏览树洞 → 回应他人 → 获得成就感**
4. **每周生成情绪报告 → 引导下一周目标**

---

# 🛠 技术架构（前端 / 后端 / AI）

通用架构：

```plaintext
EmotionConnect/
│
├── frontend/ (React Native / Flutter)
│   ├── Emotion Diary UI
│   ├── Chat UI
│   ├── Visualization
│
├── backend/
│   ├── auth-service
│   ├── user-profile-service
│   ├── matching-service
│   ├── diary-service
│   ├── community-service
│   ├── analytics-service
│
├── ai/                   
│   ├── llm-router (mode selection)
│   ├── emotions-classifier
│   ├── safety-filter
│   ├── keyword extractor
│   ├── mood prediction model
│
└── database/
    ├── user_profiles
    ├── chats
    ├── diary_entries
    ├── community_posts
    └── emotion_logs
```

---

# 🗓️ 后续开发路线图（Roadmap）

### 🟢 Phase 1（基础核心）

* 情绪记录
* AI 倾诉与分析模式
* 树洞基础浏览 & 发布
* 匹配算法 V1（情绪标签 + 偏好）

### 🟡 Phase 2（进阶体验）

* 情绪可视化分析
* 正念练习模块
* 积分体系 + 头像系统
* Peer Chat 双向评价系统

### 🔴 Phase 3（生态构建）

* 反向树洞
* AI 风格商店
* 情感成长曲线
* 社区排名与勋章系统

---

# 🚀 快速开始 (Getting Started)

## 环境要求

* Python 3.9+
* Node.js 16+
* PostgreSQL
* Qdrant (可选，用于向量检索)

## 安装步骤

### 1. 克隆项目

```bash
git clone https://github.com/your-repo/emotionconnect.git
cd emotionconnect
```

### 2. 后端设置 (Backend)

```bash
cd backend
# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入 GEMINI_API_KEY 等信息
```

### 3. 运行后端

```bash
uvicorn app.main:app --reload
```
API 文档地址: http://localhost:8000/docs

### 4. 前端设置 (Frontend)

```bash
cd frontend
npm install
npm start (alternative: npm run dev)
```

---

# 🤝 贡献指南 (Contributing)

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

---

# 📄 许可证 (License)

Distributed under the MIT License. See `LICENSE` for more information.

