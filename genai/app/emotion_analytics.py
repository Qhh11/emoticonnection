"""
Emotion Analytics Module
Generates comprehensive emotion analysis reports including:
- Weekly/Monthly summaries
- Emotion fluctuation curves
- High-frequency emotion word clouds
- Common trigger scenarios
- Average mood scores
- Suggestions and trend predictions
"""

import json
import os
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional, Literal
from collections import Counter
from dataclasses import dataclass, asdict

# Dynamic import handling for model and weaviate_client
try:
    from model import (EmotionDataPoint, EmotionWordCloud, EmotionTrend,
                        TriggerAnalysis, EmotionSummary, ConversationRecord)
    from weaviate_client import WeaviateManager
except ImportError:
    # For dynamic imports from other directories
    import sys
    import os
    from pathlib import Path
    
    # Get the directory containing this file
    current_dir = Path(__file__).parent
    
    # Add current directory to sys.path temporarily
    if str(current_dir) not in sys.path:
        sys.path.insert(0, str(current_dir))
    
    try:
        from model import (EmotionDataPoint, EmotionWordCloud, EmotionTrend,
                            TriggerAnalysis, EmotionSummary, ConversationRecord)
        from weaviate_client import WeaviateManager
    finally:
        # Clean up sys.path
        if str(current_dir) in sys.path:
            sys.path.remove(str(current_dir))

from google.genai import types
from google import genai
from openai import OpenAI

from langchain_core.prompts import PromptTemplate
import weaviate.classes.query as wq
from weaviate.classes.query import Filter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)



class EmotionAnalytics:
    """
    Analytics engine for emotion data processing and report generation.
    """
    
    # 9 Core Emotion Categories with metadata
    # 情绪 (Emotion) | 颜色 (Hex Code) | 中文昵称 | 英文昵称
    EMOTION_CONFIG = {
        'bored': {
            'cn_name': '无聊', 'cn_nickname': '丧丧', 'en_nickname': 'Snoozy',
            'color': '#4B4E91', 'score': -0.2
        },
        'fear': {
            'cn_name': '恐惧', 'cn_nickname': '怕怕', 'en_nickname': 'Scaredy',
            'color': '#9381BA', 'score': -0.6
        },
        'joy': {
            'cn_name': '快乐', 'cn_nickname': '乐乐', 'en_nickname': 'Sunny',
            'color': '#F9D849', 'score': 0.9
        },
        'sadness': {
            'cn_name': '忧伤', 'cn_nickname': '忧忧', 'en_nickname': 'Bluey',
            'color': '#3266B1', 'score': -0.7
        },
        'disgust': {
            'cn_name': '厌恶', 'cn_nickname': '厌厌', 'en_nickname': 'Yucky',
            'color': '#66B04C', 'score': -0.5
        },
        'anxiety': {
            'cn_name': '焦虑', 'cn_nickname': '焦焦', 'en_nickname': 'Jitters',
            'color': '#E67E22', 'score': -0.6
        },
        'anger': {
            'cn_name': '愤怒', 'cn_nickname': '怒怒', 'en_nickname': 'Grumpy',
            'color': '#D32F2F', 'score': -0.8
        },
        'embarrassment': {
            'cn_name': '尴尬', 'cn_nickname': '尬尬', 'en_nickname': 'Blushy',
            'color': '#D278A3', 'score': -0.3
        },
        'envy': {
            'cn_name': '羡慕', 'cn_nickname': '慕慕', 'en_nickname': 'Sparkle',
            'color': '#2BA8A4', 'score': -0.2
        },
    }
    
    # Emotion scores for calculation (extracted from config)
    EMOTION_SCORES = {key: val['score'] for key, val in EMOTION_CONFIG.items()}
    
    # Chinese to English mapping
    CN_TO_EN_EMOTION = {
        '无聊': 'bored', '丧丧': 'bored',
        '恐惧': 'fear', '怕怕': 'fear',
        '快乐': 'joy', '乐乐': 'joy',
        '忧伤': 'sadness', '忧忧': 'sadness',
        '厌恶': 'disgust', '厌厌': 'disgust',
        '焦虑': 'anxiety', '焦焦': 'anxiety',
        '愤怒': 'anger', '怒怒': 'anger',
        '尴尬': 'embarrassment', '尬尬': 'embarrassment',
        '羡慕': 'envy', '慕慕': 'envy',
    }
    
    # Trigger categories
    TRIGGER_CATEGORIES = [
        'work', 'relationships', 'health', 'family', 'finance',
        'social', 'personal_growth', 'daily_routine', 'unexpected_events'
    ]
    
    @classmethod
    def get_emotion_color(cls, emotion: str) -> str:
        """Get the color hex code for an emotion."""
        emotion_key = cls.normalize_emotion(emotion)
        return cls.EMOTION_CONFIG.get(emotion_key, {}).get('color', '#808080')
    
    @classmethod
    def get_emotion_nickname(cls, emotion: str, lang: str = 'cn') -> str:
        """Get the cute nickname for an emotion."""
        emotion_key = cls.normalize_emotion(emotion)
        config = cls.EMOTION_CONFIG.get(emotion_key, {})
        if lang == 'cn':
            return config.get('cn_nickname', emotion)
        return config.get('en_nickname', emotion)
    
    @classmethod
    def normalize_emotion(cls, emotion: str) -> str:
        """Normalize emotion string to standard English key."""
        emotion_lower = emotion.lower().strip()
        # Check if it's Chinese
        if emotion_lower in cls.CN_TO_EN_EMOTION:
            return cls.CN_TO_EN_EMOTION[emotion_lower]
        # Check if it's already a valid English key
        if emotion_lower in cls.EMOTION_CONFIG:
            return emotion_lower
        # Default mapping for common variations
        variations = {
            'happy': 'joy', 'sad': 'sadness', 'scared': 'fear',
            'anxious': 'anxiety', 'angry': 'anger', 'envious': 'envy',
            'disgusted': 'disgust', 'embarrassed': 'embarrassment',
            'boring': 'bored'
        }
        return variations.get(emotion_lower, emotion_lower)

    def __init__(self, weaviate_manager: WeaviateManager, gemini_client=None, deepseek_client=None, llm_provider: str = 'deepseek'):
        """
        Initialize with database and AI client(s).
        
        Args:
            weaviate_manager: Weaviate database manager
            gemini_client: Google Gemini client (optional)
            deepseek_client: DeepSeek/OpenAI client (optional)
            llm_provider: Which LLM to use - 'gemini' or 'deepseek' (default: 'deepseek')
        """
        self.weaviate_manager = weaviate_manager
        self.gemini_client = gemini_client
        self.deepseek_client = deepseek_client
        self.llm_provider = llm_provider.lower()
        
        # Validate that at least one client is provided
        if self.llm_provider == 'gemini' and not self.gemini_client:
            raise ValueError("Gemini client is required when llm_provider is 'gemini'")
        if self.llm_provider == 'deepseek' and not self.deepseek_client:
            raise ValueError("DeepSeek client is required when llm_provider is 'deepseek'")

    def _call_llm(self, prompt: str) -> str:
        """Call the configured LLM provider for text generation."""
        if self.llm_provider == 'gemini':
            return self._call_gemini(prompt)

        else:
            return self._call_deepseek(prompt)
        
    def _call_gemini(self, prompt: str) -> str:
        """Call Gemini API for text generation."""
        
        try:
            config_path = os.path.join(os.path.dirname(__file__), "gemini_config.json")
            if os.path.exists(config_path):
                with open(config_path, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
                gen_cfg = types.GenerateContentConfig(
                    **cfg.get("generation_config", {}),
                    safety_settings=[types.SafetySetting(**s) for s in cfg.get("safety_settings", [])],
                )
            else:
                gen_cfg = types.GenerateContentConfig(temperature=0.7)

            response = self.gemini_client.models.generate_content(
                model="gemini-2.5-flash-lite",
                contents=prompt,
                config=gen_cfg
            )
            return response.text
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            raise

    def _call_deepseek(self, prompt: str) -> str:
        """Call DeepSeek API for text generation."""
        try:
            # DeepSeek uses OpenAI-compatible API
            response = self.deepseek_client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": "你是一位专业的情绪分析助手，擅长分析文本中的情绪状态并提供专业建议。请始终返回JSON格式的结果。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=4096,
                stream=False
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"DeepSeek API error: {e}")
            raise

    def fetch_user_conversations(
        self, 
        user_id: str, 
        start_date: str, 
        end_date: str
    ) -> List[Dict[str, Any]]:
        """
        Fetch user conversations within the specified date range from both
        Conversations and AIConversations collections.
        
        Args:
            user_id: User identifier
            start_date: ISO format start date
            end_date: ISO format end date
            
        Returns:
            List of conversation records (merged and sorted by timestamp)
        """
        if not self.weaviate_manager or not self.weaviate_manager.client:
            raise RuntimeError("Weaviate client not initialized")
            
        if not self.weaviate_manager.client.is_connected():
            self.weaviate_manager.client.connect()
        
        all_conversations = []
        
        # 1. 从 Conversations 集合获取对话 (用户之间的对话)
        try:
            collection = self.weaviate_manager.client.collections.get("Conversations")
            
            response = collection.query.fetch_objects(
                filters=(
                    (Filter.by_property("userId1").equal(user_id) | 
                     Filter.by_property("userId2").equal(user_id)) &
                    Filter.by_property("timestamp").greater_or_equal(start_date) &
                    Filter.by_property("timestamp").less_or_equal(end_date)
                ),
                limit=1000,
                sort=wq.Sort.by_property("timestamp", ascending=True)
            )
            
            for obj in response.objects:
                conv = obj.properties.copy()
                conv['source'] = 'peer_chat'  # 标记来源
                all_conversations.append(conv)
            
            logger.info(f"Fetched {len(response.objects)} records from Conversations")
                
        except Exception as e:
            logger.warning(f"Error fetching from Conversations: {e}")
        
        # 2. 从 AIConversations 集合获取对话 (用户与AI的对话)
        try:
            ai_collection = self.weaviate_manager.client.collections.get("AIConversations")
            
            ai_response = ai_collection.query.fetch_objects(
                filters=(
                    Filter.by_property("userId").equal(user_id) &
                    Filter.by_property("timestamp").greater_or_equal(start_date) &
                    Filter.by_property("timestamp").less_or_equal(end_date)
                ),
                limit=1000,
                sort=wq.Sort.by_property("timestamp", ascending=True)
            )
            
            for obj in ai_response.objects:
                # 转换 AIConversations 格式为统一格式
                props = obj.properties
                conv = {
                    'timestamp': props.get('timestamp', ''),
                    'userQuery': props.get('userQuery', ''),
                    'llmResponse': props.get('aiResponse', ''),
                    'userId1': user_id,
                    'userId2': 'ai_assistant',
                    'source': 'ai_chat'  # 标记来源
                }
                all_conversations.append(conv)
            
            logger.info(f"Fetched {len(ai_response.objects)} records from AIConversations")
                
        except Exception as e:
            logger.warning(f"Error fetching from AIConversations: {e}")
        
        # 3. 标准化时间戳并按时间排序
        def normalize_timestamp(ts):
            """将时间戳转换为字符串以便排序"""
            if ts is None:
                return ''
            if isinstance(ts, datetime):
                return ts.strftime("%Y-%m-%dT%H:%M:%SZ")
            return str(ts)
        
        # 标准化所有时间戳
        for conv in all_conversations:
            conv['timestamp'] = normalize_timestamp(conv.get('timestamp'))
        
        # 按时间戳排序
        all_conversations.sort(key=lambda x: x.get('timestamp', ''))
        
        logger.info(f"Total conversations fetched: {len(all_conversations)}")
        return all_conversations

    def analyze_emotions_from_text(self, conversations: List[Dict]) -> List[EmotionDataPoint]:
        """
        Analyze emotions from conversation texts using Gemini with enhanced prompt engineering.
        
        Args:
            conversations: List of conversation records
            
        Returns:
            List of emotion data points
        """
        if not conversations:
            return []
            
        # Batch analyze for efficiency
        batch_size = 20
        all_data_points = []
        
        # 优化后的情绪定义，帮助模型更精准区分
        emotion_definitions = """
        请严格基于以下 9 种情绪进行分类（括号内为判断标准）：
        1. bored (无聊): 感到乏味、无趣、发呆、低能量、或是"没什么事"的平淡状态。
        2. fear (恐惧): 对当下具体威胁的害怕、惊吓、或是想要逃离的冲动。
        3. joy (快乐): 开心、兴奋、满足、感激、或是轻松愉悦的状态。
        4. sadness (忧伤): 失落、难过、想哭、遗憾、或是受到伤害的感觉。
        5. disgust (厌恶): 反感、恶心、鄙视、不仅是生理上的，也包括对某人某事的道德厌恶。
        6. anxiety (焦虑): 对未来的担忧、紧张、压力大、不知所措、或是"悬着一颗心"。
        7. anger (愤怒): 生气、暴躁、想要攻击、或是对不公的抗议。
        8. embarrassment (尴尬): 羞愧、社死现场、不好意思、或是想要找地缝钻进去。
        9. envy (羡慕): 嫉妒、酸葡萄心理、或是渴望拥有别人拥有的东西。
        """
        
        for i in range(0, len(conversations), batch_size):
            batch = conversations[i:i+batch_size]
            
            texts_for_analysis = []
            for conv in batch:
                timestamp = conv.get('timestamp', '')
                user_query = conv.get('userQuery', '')
                texts_for_analysis.append({
                    'timestamp': timestamp,
                    'text': user_query
                })
            
            # 这里的 Prompt 经过了重写，增加了 CoT (Chain of Thought) 和防御性指令
            prompt = f"""你是一位擅长共情和文本挖掘的心理分析专家。请分析以下用户对话片段的情绪状态。

            【分析指南】
            1. **语境分析**：结合标点符号（如"..."可能代表无语或犹豫）、Emoji（"😅"代表尴尬而非开心）、语气词（"切"代表不屑）。
            2. **区分易混淆情绪**：
               - "明天要考试了好慌" 是 anxiety (焦虑) 而不是 fear (恐惧)。
               - "不知道干嘛" 是 bored (无聊) 而不是 sadness (忧伤)。
            3. **触发源识别**：只有在用户明确提及原因时（如"因为工作被骂了"）才填写 trigger_context。如果用户只说"好烦"，trigger_context 应为 null。
            4. **情感打分**：
               - intensity (0.0-1.0): 情绪的强烈程度。0.1为微弱，0.9为极强。
               - sentiment_score (-1.0 到 1.0): -1.0(极度消极) 到 1.0(极度积极)。注意：anger 和 sadness 通常是负分，但 joy 是正分。
            
            {emotion_definitions}

            【待分析消息列表】
            {json.dumps(texts_for_analysis, ensure_ascii=False, indent=2)}

            请返回一个纯 JSON 数组（不要包含 Markdown 标记），每个对象包含：
            - timestamp: (保持原样)
            - reasoning: (简短分析这句话为什么被归为此类情绪，这有助于提高准确性)
            - emotion: (必须是上述9个英文单词之一)
            - intensity: (浮点数)
            - sentiment_score: (浮点数)
            - trigger_context: (简短描述触发原因，如果没有则为 null)
            """

            try:
                response = self._call_llm(prompt)
                # Parse JSON response
                response = response.strip()
                if response.startswith('```'):
                    # 移除可能的 markdown 代码块标记
                    response = response.split('\n', 1)[1]
                    response = response.rsplit('```', 1)[0]
                
                emotion_results = json.loads(response)
                
                for result in emotion_results:
                    # Normalize the emotion to our 9 categories
                    raw_emotion = result.get('emotion', 'bored')
                    normalized_emotion = self.normalize_emotion(raw_emotion)
                    
                    # 某些极端情况下模型可能返回 null 作为 trigger
                    trigger_ctx = result.get('trigger_context')
                    if trigger_ctx == 'null' or trigger_ctx == 'None':
                        trigger_ctx = None

                    all_data_points.append(EmotionDataPoint(
                        timestamp=result.get('timestamp', ''),
                        emotion=normalized_emotion,
                        intensity=float(result.get('intensity', 0.5)),
                        sentiment_score=float(result.get('sentiment_score', 0.0)),
                        trigger_context=trigger_ctx
                    ))
            except Exception as e:
                logger.warning(f"Batch emotion analysis failed: {e}")
                # Fallback: create neutral data points
                for conv in batch:
                    all_data_points.append(EmotionDataPoint(
                        timestamp=conv.get('timestamp', ''),
                        emotion='bored', # Fallback to bored/neutral
                        intensity=0.1,
                        sentiment_score=0.0,
                        trigger_context=None
                    ))
                    
        return all_data_points

    def calculate_emotion_distribution(
        self, 
        data_points: List[EmotionDataPoint]
    ) -> Dict[str, float]:
        """Calculate emotion distribution as percentages."""
        if not data_points:
            return {}
            
        emotion_counts = Counter(dp.emotion.lower() for dp in data_points)
        total = len(data_points)
        
        return {
            emotion: round(count / total * 100, 2)
            for emotion, count in emotion_counts.most_common()
        }

    def calculate_average_mood_score(
        self, 
        data_points: List[EmotionDataPoint]
    ) -> float:
        """Calculate average mood score from data points."""
        if not data_points:
            return 0.0
            
        scores = [dp.sentiment_score for dp in data_points]
        return round(sum(scores) / len(scores), 3)

    def calculate_mood_stability(
        self, 
        data_points: List[EmotionDataPoint]
    ) -> float:
        """
        Calculate mood stability (lower variance = higher stability).
        Returns value between 0 and 1.
        """
        if len(data_points) < 2:
            return 1.0
            
        scores = [dp.sentiment_score for dp in data_points]
        mean = sum(scores) / len(scores)
        variance = sum((s - mean) ** 2 for s in scores) / len(scores)
        
        # Convert variance to stability score (0-1)
        # Max expected variance is 1 (scores range from -1 to 1)
        stability = max(0, 1 - variance)
        return round(stability, 3)

    def generate_emotion_trend(
        self, 
        data_points: List[EmotionDataPoint],
        period: str = 'daily'
    ) -> EmotionTrend:
        """Generate emotion trend analysis."""
        if not data_points:
            return EmotionTrend(
                period=period,
                data_points=[],
                trend_direction='stable',
                volatility=0.0
            )
            
        # Group by date
        daily_data = {}
        for dp in data_points:
            try:
                date_str = dp.timestamp[:10] if dp.timestamp else 'unknown'
                if date_str not in daily_data:
                    daily_data[date_str] = []
                daily_data[date_str].append(dp)
            except:
                continue
        
        # Calculate daily averages
        trend_points = []
        scores_over_time = []
        
        for date, points in sorted(daily_data.items()):
            avg_score = sum(p.sentiment_score for p in points) / len(points)
            emotions = Counter(p.emotion for p in points)
            dominant = emotions.most_common(1)[0][0] if emotions else 'neutral'
            
            trend_points.append({
                'date': date,
                'avg_score': round(avg_score, 3),
                'dominant_emotion': dominant,
                'count': len(points)
            })
            scores_over_time.append(avg_score)
        
        # Determine trend direction
        if len(scores_over_time) >= 3:
            first_half = sum(scores_over_time[:len(scores_over_time)//2])
            second_half = sum(scores_over_time[len(scores_over_time)//2:])
            
            if second_half - first_half > 0.2:
                trend_direction = 'improving'
            elif first_half - second_half > 0.2:
                trend_direction = 'declining'
            else:
                trend_direction = 'stable'
        else:
            trend_direction = 'stable'
            
        # Calculate volatility
        if len(scores_over_time) >= 2:
            changes = [abs(scores_over_time[i] - scores_over_time[i-1]) 
                      for i in range(1, len(scores_over_time))]
            volatility = min(1.0, sum(changes) / len(changes))
        else:
            volatility = 0.0
            
        return EmotionTrend(
            period=period,
            data_points=trend_points,
            trend_direction=trend_direction,
            volatility=round(volatility, 3)
        )

    def generate_word_cloud(
        self, 
        conversations: List[Dict],
        data_points: List[EmotionDataPoint]
    ) -> EmotionWordCloud:
        """Generate emotion word cloud from conversations."""
        if not conversations:
            return EmotionWordCloud(words={}, top_emotions=[], total_count=0)
            
        # Combine all user queries
        all_text = " ".join(
            conv.get('userQuery', '') for conv in conversations
        )
        
        # Use Gemini to extract emotion-related keywords
        prompt = f"""从以下文本中提取与情绪相关的关键词和表达。
            返回JSON格式: {{"words": {{"词语1": 频次, "词语2": 频次, ...}}, "emotions": ["情绪1", "情绪2", ...]}}

            文本:
            {all_text[:5000]}

            只返回JSON，不要其他内容。"""

        try:
            response = self._call_llm(prompt)
            response = response.strip()
            if response.startswith('```'):
                response = response.split('\n', 1)[1]
                response = response.rsplit('```', 1)[0]
            
            result = json.loads(response)
            words = result.get('words', {})
            emotions = result.get('emotions', [])
            
        except Exception as e:
            logger.warning(f"Word cloud generation failed: {e}")
            # Fallback: count emotions from data points
            emotion_counts = Counter(dp.emotion for dp in data_points)
            words = dict(emotion_counts.most_common(20))
            emotions = list(emotion_counts.keys())[:5]
        
        return EmotionWordCloud(
            words=words,
            top_emotions=emotions[:10],
            total_count=sum(words.values())
        )

    def analyze_triggers(
        self, 
        data_points: List[EmotionDataPoint]
    ) -> List[TriggerAnalysis]:
        """Analyze common emotion triggers."""
        if not data_points:
            return []
            
        # Group by trigger context
        triggers_by_type = {}
        for dp in data_points:
            if dp.trigger_context:
                context = dp.trigger_context.lower()
                
                # Categorize trigger
                trigger_type = 'other'
                for category in self.TRIGGER_CATEGORIES:
                    if category.replace('_', ' ') in context:
                        trigger_type = category
                        break
                
                if trigger_type not in triggers_by_type:
                    triggers_by_type[trigger_type] = {
                        'count': 0,
                        'emotions': [],
                        'contexts': [],
                        'scores': []
                    }
                
                triggers_by_type[trigger_type]['count'] += 1
                triggers_by_type[trigger_type]['emotions'].append(dp.emotion)
                triggers_by_type[trigger_type]['contexts'].append(dp.trigger_context)
                triggers_by_type[trigger_type]['scores'].append(dp.sentiment_score)
        
        # Create TriggerAnalysis objects
        triggers = []
        for trigger_type, data in triggers_by_type.items():
            emotion_counts = Counter(data['emotions'])
            avg_impact = sum(data['scores']) / len(data['scores']) if data['scores'] else 0
            
            triggers.append(TriggerAnalysis(
                trigger_type=trigger_type,
                frequency=data['count'],
                associated_emotions=list(emotion_counts.keys())[:5],
                example_contexts=list(set(data['contexts']))[:3],
                impact_score=round(avg_impact, 3)
            ))
        
        # Sort by frequency
        triggers.sort(key=lambda x: x.frequency, reverse=True)
        return triggers[:10]

    def generate_summary_and_suggestions(
        self,
        user_id: str,
        period_type: str,
        data_points: List[EmotionDataPoint],
        emotion_distribution: Dict[str, float],
        average_mood: float,
        trend: EmotionTrend,
        triggers: List[TriggerAnalysis]
    ) -> Dict[str, Any]:
        """Generate AI summary, insights, suggestions, and predictions."""
        
        # Prepare context for Gemini
        context = f"""
用户ID: {user_id}
报告周期: {period_type}
数据点数量: {len(data_points)}

情绪分布:
{json.dumps(emotion_distribution, ensure_ascii=False, indent=2)}

平均心情得分: {average_mood} (范围: -1到1)

情绪趋势: {trend.trend_direction}
波动性: {trend.volatility}

主要触发情境:
{json.dumps([asdict(t) for t in triggers[:5]], ensure_ascii=False, indent=2)}
"""

        prompt = f"""作为一位专业的情绪分析师，请基于以下用户情绪数据生成一份{period_type}情绪报告。

{context}

请返回JSON格式:
{{
    "summary_text": "一段200字左右的整体情绪状态总结",
    "key_insights": ["洞察1", "洞察2", "洞察3"],
    "suggestions": ["建议1", "建议2", "建议3"],
    "trend_prediction": "对未来一段时间情绪趋势的预测和说明"
}}

请用温暖、支持的语气，提供实用的建议。只返回JSON，不要其他内容。"""

        try:
            response = self._call_llm(prompt)
            response = response.strip()
            if response.startswith('```'):
                response = response.split('\n', 1)[1]
                response = response.rsplit('```', 1)[0]
            
            return json.loads(response)
            
        except Exception as e:
            logger.error(f"Summary generation failed: {e}")
            return {
                "summary_text": "无法生成总结，请稍后重试。",
                "key_insights": [],
                "suggestions": ["保持积极心态", "适当运动", "与亲友交流"],
                "trend_prediction": "数据不足，无法预测趋势。"
            }

    def generate_report(
        self,
        user_id: str,
        period_type: Literal['daily', 'weekly', 'monthly'] = 'weekly',
        end_date: Optional[str] = None
    ) -> EmotionSummary:
        """
        Generate a complete emotion analytics report.
        
        Args:
            user_id: User identifier
            period_type: 'daily', 'weekly', or 'monthly'
            end_date: End date (ISO format), defaults to now
            
        Returns:
            Complete EmotionSummary
        """
        # Calculate date range
        if end_date:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        else:
            end_dt = datetime.now(timezone.utc)
            
        if period_type == 'daily':
            start_dt = end_dt - timedelta(days=1)
        elif period_type == 'weekly':
            start_dt = end_dt - timedelta(days=7)
        else:  # monthly
            start_dt = end_dt - timedelta(days=30)
            
        start_date = start_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        end_date_str = end_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        
        logger.info(f"Generating {period_type} report for user {user_id}")
        logger.info(f"Date range: {start_date} to {end_date_str}")
        
        # Fetch conversations
        conversations = self.fetch_user_conversations(user_id, start_date, end_date_str)
        
        if not conversations:
            return EmotionSummary(
                user_id=user_id,
                period_type=period_type,
                start_date=start_date,
                end_date=end_date_str,
                average_mood_score=0.0,
                mood_stability=1.0,
                total_interactions=0,
                emotion_distribution={},
                emotion_trend=EmotionTrend('daily', [], 'stable', 0.0),
                word_cloud=EmotionWordCloud({}, [], 0),
                triggers=[],
                summary_text="该时段内没有找到对话记录。",
                key_insights=[],
                suggestions=["开始记录你的心情和想法吧！"],
                trend_prediction="数据不足，无法预测。"
            )
        
        # Analyze emotions
        data_points = self.analyze_emotions_from_text(conversations)
        
        # Calculate metrics
        emotion_distribution = self.calculate_emotion_distribution(data_points)
        average_mood = self.calculate_average_mood_score(data_points)
        mood_stability = self.calculate_mood_stability(data_points)
        
        # Generate analytics components
        emotion_trend = self.generate_emotion_trend(data_points)
        word_cloud = self.generate_word_cloud(conversations, data_points)
        triggers = self.analyze_triggers(data_points)
        
        # Generate AI summary and suggestions
        ai_content = self.generate_summary_and_suggestions(
            user_id, period_type, data_points, emotion_distribution,
            average_mood, emotion_trend, triggers
        )
        
        return EmotionSummary(
            user_id=user_id,
            period_type=period_type,
            start_date=start_date,
            end_date=end_date_str,
            average_mood_score=average_mood,
            mood_stability=mood_stability,
            total_interactions=len(conversations),
            emotion_distribution=emotion_distribution,
            emotion_trend=emotion_trend,
            word_cloud=word_cloud,
            triggers=triggers,
            summary_text=ai_content.get('summary_text', ''),
            key_insights=ai_content.get('key_insights', []),
            suggestions=ai_content.get('suggestions', []),
            trend_prediction=ai_content.get('trend_prediction', '')
        )

    @staticmethod
    def to_json(summary: EmotionSummary) -> str:
        """Convert EmotionSummary to JSON string."""
        def convert(obj):
            if hasattr(obj, '__dict__'):
                return {k: convert(v) for k, v in obj.__dict__.items()}
            elif isinstance(obj, list):
                return [convert(i) for i in obj]
            elif isinstance(obj, dict):
                return {k: convert(v) for k, v in obj.items()}
            else:
                return obj
                
        return json.dumps(convert(summary), ensure_ascii=False, indent=2)


# Standalone function for easy access without creating instance
def emotion_summary_to_json(summary: EmotionSummary) -> str:
    """Convert EmotionSummary to JSON string (standalone function)."""
    return EmotionAnalytics.to_json(summary)


# Convenience functions for direct use
def _create_deepseek_client() -> OpenAI:
    """Create a DeepSeek client using OpenAI-compatible API."""
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        raise ValueError("DEEPSEEK_API_KEY environment variable is not set")
    return OpenAI(
        api_key=api_key,
        base_url="https://api.deepseek.com"
    )


def generate_daily_emotion_report(
    user_id: str,
    end_date: Optional[str] = None,
    weaviate_manager: Optional[WeaviateManager] = None,
    gemini_client = None,
    deepseek_client = None,
    llm_provider: str = 'deepseek'
) -> EmotionSummary:
    """
    Generate daily emotion report for a user.
    
    Args:
        user_id: User identifier
        end_date: End date (ISO format), defaults to now
        weaviate_manager: Optional WeaviateManager instance
        gemini_client: Optional Gemini client
        deepseek_client: Optional DeepSeek client
        llm_provider: LLM provider to use - 'gemini' or 'deepseek' (default: 'deepseek')
    """
    if weaviate_manager is None:
        weaviate_manager = WeaviateManager()
    
    if llm_provider == 'deepseek':
        if deepseek_client is None:
            deepseek_client = _create_deepseek_client()
        analytics = EmotionAnalytics(weaviate_manager, deepseek_client=deepseek_client, llm_provider='deepseek')
    else:
        if gemini_client is None:
            api_key = os.getenv("GEMINI_API_KEY")
            gemini_client = genai.Client(api_key=api_key)
        analytics = EmotionAnalytics(weaviate_manager, gemini_client=gemini_client, llm_provider='gemini')
        
    return analytics.generate_report(user_id, 'daily', end_date)


def generate_weekly_emotion_report(
    user_id: str,
    end_date: Optional[str] = None,
    weaviate_manager: Optional[WeaviateManager] = None,
    gemini_client = None,
    deepseek_client = None,
    llm_provider: str = 'deepseek'
) -> EmotionSummary:
    """
    Generate weekly emotion report for a user.
    
    Args:
        user_id: User identifier
        end_date: End date (ISO format), defaults to now
        weaviate_manager: Optional WeaviateManager instance
        gemini_client: Optional Gemini client
        deepseek_client: Optional DeepSeek client
        llm_provider: LLM provider to use - 'gemini' or 'deepseek' (default: 'deepseek')
    """
    if weaviate_manager is None:
        weaviate_manager = WeaviateManager()
    
    if llm_provider == 'deepseek':
        if deepseek_client is None:
            deepseek_client = _create_deepseek_client()
        analytics = EmotionAnalytics(weaviate_manager, deepseek_client=deepseek_client, llm_provider='deepseek')
    else:
        if gemini_client is None:
            api_key = os.getenv("GEMINI_API_KEY")
            gemini_client = genai.Client(api_key=api_key)
        analytics = EmotionAnalytics(weaviate_manager, gemini_client=gemini_client, llm_provider='gemini')
        
    return analytics.generate_report(user_id, 'weekly', end_date)


def generate_monthly_emotion_report(
    user_id: str,
    end_date: Optional[str] = None,
    weaviate_manager: Optional[WeaviateManager] = None,
    gemini_client = None,
    deepseek_client = None,
    llm_provider: str = 'deepseek'
) -> EmotionSummary:
    """
    Generate monthly emotion report for a user.
    
    Args:
        user_id: User identifier
        end_date: End date (ISO format), defaults to now
        weaviate_manager: Optional WeaviateManager instance
        gemini_client: Optional Gemini client
        deepseek_client: Optional DeepSeek client
        llm_provider: LLM provider to use - 'gemini' or 'deepseek' (default: 'deepseek')
    """
    if weaviate_manager is None:
        weaviate_manager = WeaviateManager()
    
    if llm_provider == 'deepseek':
        if deepseek_client is None:
            deepseek_client = _create_deepseek_client()
        analytics = EmotionAnalytics(weaviate_manager, deepseek_client=deepseek_client, llm_provider='deepseek')
    else:
        if gemini_client is None:
            api_key = os.getenv("GEMINI_API_KEY")
            gemini_client = genai.Client(api_key=api_key)
        analytics = EmotionAnalytics(weaviate_manager, gemini_client=gemini_client, llm_provider='gemini')
        
    return analytics.generate_report(user_id, 'monthly', end_date)


if __name__ == "__main__":
    # Test the analytics module
    from google import genai
    from dotenv import load_dotenv
    
    load_dotenv()
    
    # Set which LLM provider to use: 'gemini' or 'deepseek'
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini").lower()
    
    try:
        manager = WeaviateManager()
        
        if LLM_PROVIDER == 'deepseek':
            # Use DeepSeek
            print("Using DeepSeek API...")
            deepseek_client = _create_deepseek_client()
            analytics = EmotionAnalytics(manager, deepseek_client=deepseek_client, llm_provider='deepseek')
        else:
            # Use Gemini (default)
            print("Using Gemini API...")
            api_key = os.getenv("GEMINI_API_KEY")
            gemini_client = genai.Client(api_key=api_key)
            analytics = EmotionAnalytics(manager, gemini_client=gemini_client, llm_provider='gemini')
        
        # Generate a weekly report
        report = analytics.generate_report("test_user_123", "weekly")
        print(analytics.to_json(report))
        
    except Exception as e:
        print(f"Test failed: {e}")
    finally:
        try:
            manager.close()
        except:
            pass
