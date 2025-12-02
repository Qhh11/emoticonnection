# EmotionConnect 数据库设计文档

## 📊 数据库架构

EmotionConnect 使用 **MongoDB** 作为主数据库，以灵活的文档模型存储用户数据、聊天记录、情绪日记和社区内容。

## 🗂️ 集合 (Collections)

### 1. users
存储用户账号信息、个人资料、偏好设置和积分系统。

**关键字段**：
- `username`, `email`, `hashed_password`
- `mbti`, `preferences`, `points`, `level`
- `unlocked_avatars`, `unlocked_ai_styles`

### 2. diary_entries
存储用户的情绪日记记录。

**关键字段**：
- `user_id`, `content`, `emotion_tags`
- `ai_analysis`, `mood_score`
- `desired_support_type`

### 3. chat_sessions
存储聊天会话（AI Chat 和 Peer Chat）。

**关键字段**：
- `session_type` (ai/peer)
- `user_id`, `peer_user_id`
- `ai_mode`, `match_score`
- `user_rating`, `peer_rating`

### 4. chat_messages
存储聊天消息内容。

**关键字段**：
- `session_id`, `sender_id`, `content`
- `safety_flag`, `safety_note`

### 5. community_posts
存储树洞社区帖子。

**关键字段**：
- `user_id`, `content`, `emotion_category`
- `anonymous_nickname`
- `likes_count`, `comments_count`
- `is_featured`, `is_need_response`

### 6. post_comments
存储帖子评论。

### 7. post_likes
存储点赞记录（帖子和评论）。

### 8. emotion_logs
细粒度情绪日志，用于趋势分析。

### 9. emotion_analytics
周报/月报情绪分析结果。

## 🚀 快速开始

### 1. 安装依赖

```bash
cd database
pip install -r requirements.txt
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，填入 MongoDB 连接信息
```

### 3. 初始化数据库

```bash
python init_db.py
```

这将创建所有集合和必要的索引。

## 📝 索引策略

- **用户集合**：username, email (唯一索引)
- **日记集合**：user_id + created_at, emotion_tags, 全文搜索
- **聊天会话**：user_id + started_at, session_type + status
- **社区帖子**：created_at, emotion_category, 全文搜索
- **情绪日志**：user_id + recorded_at

## 🔐 安全性

- 密码使用 bcrypt 加密存储
- 敏感数据（如邮箱）设置为可选字段
- 支持软删除（is_deleted 标记）
- 匿名昵称系统保护用户隐私

## 🛠️ 数据库维护

### 备份

```bash
mongodump --uri="mongodb://localhost:27017/emotionconnect" --out=/path/to/backup
```

### 恢复

```bash
mongorestore --uri="mongodb://localhost:27017/emotionconnect" /path/to/backup/emotionconnect
```

## 📈 扩展性考虑

- 使用 sharding 支持水平扩展
- 为高频查询字段创建复合索引
- 使用 TTL 索引自动清理过期数据
- 考虑使用 MongoDB Atlas 云服务获得自动备份和监控
