# 📘 EmotionConnect 

**EmotiConnection** is a collaborative web application combining emotional journaling, AI conversations, and real-time peer support.

| Layer | Technologies |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Python, FastAPI, WebSockets |
| Data and AI | MongoDB, Google Gemini, Weaviate |

Start with [QUICKSTART.md](QUICKSTART.md) for setup and [EMOTICONNECTION_GUIDE_DETAIL.md](EMOTICONNECTION_GUIDE_DETAIL.md) for the detailed guide. Supply your own service credentials through local environment configuration.

This public migration excludes database backups and replaces known credentials throughout Git history. Original team attribution is retained; the source project is [EmotiConnection on LRZ GitLab](https://gitlab.lrz.de/genai/emoticonnection). The feature overview below describes the team's application; deployment and external AI services have not been retested during migration.

EmotionConnect is an **emotional support application designed for young people and students**.  

Through a dual support system of **AI + Peer (real human) chat**, emotion analytics, anonymous community features, and a gamified points system, the app provides users with a safe, anonymous, and warm online emotional companionship experience.



---

# 📂 Table of Contents

1. [Project Overview](#🧭-Project-Overview)
2. [Core Feature Modules](#core-feature-modules)
   * [Emotion Diary](#1-emotion-diary)
   * [AI Chat](#2-ai-chat)
   * [Peer Chat](#3-peer-chat)
   * [Anonymous Community – Emotion Hub](#4-anonymous-community--emotion-hub)
   * [Emotion Insight & Visualization](#5-emotion-insight--visualization)
   * [Points & Personalization System](#6-points--personalization-system)
3. [User System](#user-system)
4. [Safety & Ethical Design](#safety--ethical-design)
5. [Recommended User Journey](#recommended-user-journey)
6. [Technical Architecture](#technical-architecture)
7. [Development Roadmap](#development-roadmap)

---

# 🧭 Project Overview

EmotionConnect aims to build a platform that is:

* **Safe, anonymous, and judgment-free**
* Powered by both **AI and real peer support**
* Structured with emotional education value
* Equipped with a user growth and progression system

Core philosophy:

> "Let everyone be heard — and become a light for others."

The app guides users to express, record, reflect on, and analyze their emotions, helping improve emotional literacy in daily life.

---

# 🧩 Core Feature Modules

## 1. Emotion Diary

Allows users to record their emotional states and triggering events daily.

### 🔹 Features

* **Three input methods**: text, voice, image
* **Tagging system** (primary emotion + secondary emotion + physical sensation + event type)
  * Primary emotions: happy / sad / anxious
  * Secondary emotions: relieved, tense, helpless, irritable
  * Physical sensations: tired, relaxed, headache
  * Event types: relationships / academics / romantic / family
* **Preferred support type**: listening / advice / companionship
* Daily review and future emotion trend prediction (AI-powered)

---

## 2. AI Chat

Provides five structured emotional support modes:

### 🔹 2.1 Venting Mode

* No judgment or advice
* Pure listening
* Uses person-centered listening techniques (emotion reflection & paraphrasing)

### 🔹 2.2 Analytic Mode

Provides structured emotional analysis:

* Trigger factors
* Emotion chain mapping
* Need inference
* Controllable vs. uncontrollable elements

### 🔹 2.3 Chill Mode

* Casual and light conversation tone
* Acts as a companion rather than a counselor

### 🔹 2.4 Stabilize Mode

Helps users calm down during high-arousal emotional states.

Includes:

* Breathing guidance
* Grounding techniques
* Short attention-shifting exercises

### 🔹 2.5 Mindfulness Mode

1–3 minute guided exercises:

* Breathing practice
* Body scan
* Self-compassion practice

---

## 3. Peer Chat

Anonymous one-on-one matching between real users.

### 🔹 Matching Parameters

* Emotional similarity (primary weight)
* Current need (vent / listen)
* Chat preference (short / long conversation)
* Age range (optional)

### 🔹 After Matching

* Anonymous chat
* AI monitors for safety boundary reminders
* After chat options:
  * 👍 Like
  * ⭐ Favorite
  * 🚫 Block
  * 🔄 Rematch

---

## 4. Anonymous Community – Emotion Hub

An immersive anonymous emotional sharing space.

### 🔹 Features

* Post anonymous emotional updates
* Browse others' posts
* Emotion categories:
  * Anxiety, relationships, academic stress, happiness, insomnia, loss
* Like and comment system
* Daily recommendation: “Someone who needs your support”

### 🔹 Reverse Tree Hole Feature

Users receive posts from others who need help.

* Encourages helping behavior
* Builds meaning and positive psychology reinforcement
* Designed with prosocial engagement principles

---

## 5. Emotion Insight & Visualization

AI-generated summaries based on user activity:

### 🔹 Weekly / Monthly Reports

* Emotion fluctuation graph
* High-frequency emotion word cloud
* Common trigger situations
* Average mood score
* Suggestions & trend predictions

---

## 6. Points & Personalization System

Gamification mechanisms to encourage consistency.

### 🔹 Earn Points By:

* Completing daily emotion logs
* Responding to community posts
* Practicing mindfulness
* Completing daily tasks

### 🔹 Use Points To:

* Unlock avatars
* Unlock AI styles (gentle, rational, etc.)
* Customize profile themes

---

# 👤 User System

* First login profile setup
* MBTI test
* Personal homepage
* Account settings

---

# 🛡️ Safety & Ethical Design

EmotionConnect prioritizes emotional safety.

### 🔹 Safety Boundaries in Conversations

AI detects high-risk content and:

* Avoids medical diagnosis
* Does not provide self-harm instructions
* Encourages seeking professional help
* Provides crisis hotline information (localized)

### 🔹 Content Moderation

* Automated community content review
* Sensitive keyword detection
* Reporting system

### 🔹 Data & Privacy

* Fully anonymous
* Encrypted data storage
* Optional automatic deletion of history


---

# 🌈 Recommended User Journey

1. **Login → Set mood → Choose AI or Peer mode**
2. **Chat or record → System analysis → Earn points**
3. **Browse community → Respond to others → Gain meaning**
4. **Weekly emotion report → Set next week's goals**

---

# 🛠 Technical Architecture

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

# 🗓️ Development Roadmap

## 🟢 Phase 1 – Core Foundation

- Emotion Diary
- AI Venting & Analytic Modes
- Basic Anonymous Community (Browse & Post)
- Matching Algorithm V1 (Emotion Tags + Preferences)

## 🟡 Phase 2 – Enhanced Experience

- Emotion Visualization & Analytics
- Mindfulness Practice Module
- Points System & Avatar Customization
- Peer Chat Two-Way Rating System

## 🔴 Phase 3 – Ecosystem Expansion

- Reverse Tree Hole Feature
- AI Style Marketplace
- Emotional Growth Curve
- Community Rankings & Badge System

---
## 💎 VIP System

- Unlock Advanced AI Analytic Mode

# 🚀 Getting Started

## Environment requirements

* Python 3.9+
* Node.js 16+
* PostgreSQL
* Qdrant (optional)

## Installation

We have deployed our platform on Render, please refer to https://emoticonnection.onrender.com

Installation is only needed if the Website above is down.

### 1. clone the repo

```bash
git clone https://github.com/your-repo/emotionconnect.git
cd emotionconnect
```

### 2. Backend settings

```bash
cd backend
# create virtual env
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# install requirements
pip install -r requirements.txt

# setting environment variables
cp .env.example .env
# edit .env, fill in GEMINI_API_KEY and others...
```

### 3. Run the backend

```bash
uvicorn app.main:app --reload
```
API docs: http://localhost:8000/docs

### 4. Frontend application

```bash
cd frontend
npm install
npm start (alternative: npm run dev)
```

---

# 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

