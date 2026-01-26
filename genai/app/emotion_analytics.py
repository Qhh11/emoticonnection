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
    from model import (EmotionDataPoint, EmotionPair, EmotionWordCloud, EmotionTrend,
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
        from model import (EmotionDataPoint, EmotionPair, EmotionWordCloud, EmotionTrend,
                            TriggerAnalysis, EmotionSummary, ConversationRecord)
        from weaviate_client import WeaviateManager
    finally:
        # Clean up sys.path
        if str(current_dir) in sys.path:
            sys.path.remove(str(current_dir))

from google.genai import types
from google import genai

import weaviate.classes.query as wq
from weaviate.classes.query import Filter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)



class EmotionAnalytics:
    """
    Analytics engine for emotion data processing and report generation.
    """
    
    # ... (keeping EMOTION_CONFIG and other constants as they are)
    
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
    
    # TRIGGER_CATEGORIES and other methods above remain unchanged

    def __init__(self, weaviate_manager: WeaviateManager, gemini_client=None, llm_provider: str = 'gemini'):
        """
        Initialize with database and Gemini client.
        
        Args:
            weaviate_manager: Weaviate database manager
            gemini_client: Google Gemini client (required)
            llm_provider: Which LLM to use (currently only 'gemini' supported)
        """
        self.weaviate_manager = weaviate_manager
        self.gemini_client = gemini_client
        self.llm_provider = 'gemini'
        
        # Validate that Gemini client is provided
        if not self.gemini_client:
            raise ValueError("Gemini client is required for EmotionAnalytics")

    def _call_gemini(self, prompt: str, schema=None) -> str:
        """Call Gemini API for text generation with optional structured output."""
        
        try:
            config_path = os.path.join(os.path.dirname(__file__), "gemini_config.json")
            if os.path.exists(config_path):
                with open(config_path, "r", encoding="utf-8") as f:
                    cfg = json.load(f)
                gen_cfg_params = cfg.get("generation_config", {}).copy()
                
                # Disable AFC (Automatic Function Calling) to reduce latency for pure analytical tasks
                gen_cfg_params["tools"] = []
                
                if schema:
                    gen_cfg_params["response_mime_type"] = "application/json"
                    gen_cfg_params["response_schema"] = schema

                gen_cfg = types.GenerateContentConfig(
                    **gen_cfg_params,
                    safety_settings=[types.SafetySetting(**s) for s in cfg.get("safety_settings", [])],
                )
            else:
                gen_cfg = types.GenerateContentConfig(
                    temperature=0.1, # Lower temperature for better consistency
                    tools=[] # Explicitly disable tools for speed
                )

            client = genai.Client()
            response_text = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=gen_cfg
            )
            
            if response_text and response_text.text:
                return response_text.text.strip()
            
            logger.warning("Empty response from Gemini batch analysis")
            return "{}" if schema else ""
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            return "{}" if schema else ""

    def fetch_user_conversations(
        self, 
        user_id: str, 
        start_date: str, 
        end_date: str
    ) -> List[Dict[str, Any]]:
        """
        Fetch user conversations within the specified date range from
        ChatEmotions, AIConversations, and UserPosts collections.
        
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
        
        # 1. 从 ChatEmotions 集合获取聊天情感数据 (用户之间的对话情感分析)
        try:
            if self.weaviate_manager.client.collections.exists("ChatEmotions"):
                collection = self.weaviate_manager.client.collections.get("ChatEmotions")
                
                response = collection.query.fetch_objects(
                    filters=(
                        Filter.by_property("userId").equal(user_id) &
                        Filter.by_property("timestamp").greater_or_equal(start_date) &
                        Filter.by_property("timestamp").less_or_equal(end_date)
                    ),
                    limit=1000,
                    sort=wq.Sort.by_property("timestamp", ascending=True)
                )
            
                for obj in response.objects:
                    props = obj.properties
                    # 转换为统一格式，包含预标记的情感信息
                    conv = {
                        'timestamp': props.get('timestamp', ''),
                        'userQuery': props.get('content', ''),
                        'llmResponse': '',  # 聊天消息没有AI回复
                        'userId1': user_id,
                        'userId2': props.get('sessionId', ''),  # 使用sessionId标识对话
                        'source': 'chat_emotion',
                        'primaryEmotion': props.get('primaryEmotion', ''),
                        'primaryEmotionScore': props.get('primaryEmotionScore', 0),
                        'secondaryEmotion': props.get('secondaryEmotion', ''),
                        'secondaryEmotionScore': props.get('secondaryEmotionScore', 0)
                    }
                    all_conversations.append(conv)
                
                logger.info(f"Fetched {len(response.objects)} records from ChatEmotions")
            else:
                logger.info("ChatEmotions collection does not exist, skipping.")
                
        except Exception as e:
            logger.warning(f"Error fetching from ChatEmotions: {e}")
        
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
                props = obj.properties
                conv = {
                    'timestamp': props.get('timestamp', ''),
                    'userQuery': props.get('userQuery', ''),
                    'llmResponse': props.get('aiResponse', ''),
                    'userId1': user_id,
                    'userId2': 'ai_assistant',
                    'source': 'ai_chat' 
                }
                all_conversations.append(conv)
            
            logger.info(f"Fetched {len(ai_response.objects)} records from AIConversations")
                
        except Exception as e:
            logger.warning(f"Error fetching from AIConversations: {e}")
        
        # 3. 从 UserPosts 集合获取用户发布的帖子
        try:
            posts_collection = self.weaviate_manager.client.collections.get("UserPosts")
            
            posts_response = posts_collection.query.fetch_objects(
                filters=(
                    Filter.by_property("userId").equal(user_id) &
                    Filter.by_property("timestamp").greater_or_equal(start_date) &
                    Filter.by_property("timestamp").less_or_equal(end_date)
                ),
                limit=1000,
                sort=wq.Sort.by_property("timestamp", ascending=True)
            )
            
            for obj in posts_response.objects:
                props = obj.properties
                # 将帖子内容转换为对话格式，以便统一分析
                conv = {
                    'timestamp': props.get('timestamp', ''),
                    'userQuery': props.get('content', ''),
                    'llmResponse': '',  # 帖子没有回复
                    'userId1': user_id,
                    'userId2': 'self',  # 标记为自我表达
                    'source': 'user_post',
                    'emotion': props.get('emotion', ''),  # 保留用户标记的心情
                    'aiEmotion': props.get('aiEmotion', ''),  # 保留AI分析的心情
                    'tags': props.get('tags', []),  # 保留标签
                    'postId': props.get('postId', '')  # 保留帖子ID引用
                }
                all_conversations.append(conv)
            
            logger.info(f"Fetched {len(posts_response.objects)} records from UserPosts")
                
        except Exception as e:
            logger.warning(f"Error fetching from UserPosts: {e}")
        
        def normalize_timestamp(ts):
            if ts is None:
                return ''
            if isinstance(ts, datetime):
                return ts.strftime("%Y-%m-%dT%H:%M:%SZ")
            return str(ts)
        
        for conv in all_conversations:
            conv['timestamp'] = normalize_timestamp(conv.get('timestamp'))
        
        all_conversations.sort(key=lambda x: x.get('timestamp', ''))
        
        logger.info(f"Total conversations fetched: {len(all_conversations)}")
        return all_conversations

    def analyze_emotions_from_text(self, conversations: List[Dict]) -> List[EmotionDataPoint]:
            """
            Analyze emotions from English conversation texts using Gemini with advanced 
            prompt engineering, including CoT reasoning and linguistic nuance detection.
            
            For posts with pre-labeled emotions, use those directly. For other conversations,
            use AI analysis.
            """
            if not conversations:
                return []
                
            batch_size = 50 # Increased batch size to reduce network latency
            all_data_points = []
            
            # Enhanced emotion definitions for cross-cultural nuance
            emotion_definitions = """
            Classify strictly into these 9 categories:
            1. bored: Feeling weary, uninterested, low energy, or a "flat" neutral state.
            2. fear: Dread, fright, or an immediate urge to escape a specific threat.
            3. joy: Happiness, excitement, satisfaction, gratitude, or pleasant relaxation.
            4. sadness: Loss, grief, disappointment, regret, or feeling emotionally hurt.
            5. disgust: Strong aversion, revulsion, or moral contempt for a person or situation.
            6. anxiety: Future-oriented worry, tension, feeling overwhelmed, or "on edge."
            7. anger: Resentment, irritability, hostility, or protest against perceived injustice.
            8. embarrassment: Self-consciousness, shame, social awkwardness, or "cringe" moments.
            9. envy: Jealousy, resentment of another's success, or a painful desire for what others have.
            """
            
            # Separate conversations: those with pre-labeled emotions vs those needing analysis
            conversations_needing_analysis = []
            
            for conv in conversations:
                # Check if this has emotion already labeled
                source = conv.get('source', '')
                
                # Handle ChatEmotions (chat messages with AI emotion analysis)
                if source == 'chat_emotion':
                    primary_emotion = conv.get('primaryEmotion', '').strip()
                    
                    if primary_emotion:
                        # Use AI-analyzed emotion from chat
                        normalized_emotion = self.normalize_emotion(primary_emotion)
                        emotion_score = self.EMOTION_SCORES.get(normalized_emotion, 0.0)
                        
                        # Use emotion score as intensity (convert percentage to 0-1 scale)
                        primary_score = conv.get('primaryEmotionScore', 50)
                        intensity = min(1.0, primary_score / 100.0)
                        
                        all_data_points.append(EmotionDataPoint(
                            timestamp=conv.get('timestamp', ''),
                            emotion=normalized_emotion,
                            intensity=intensity,
                            sentiment_score=emotion_score,
                            trigger_context=f"chat in session {conv.get('userId2', '')}"
                        ))
                    else:
                        # No emotion labeled, need to analyze
                        conversations_needing_analysis.append(conv)
                
                # Handle UserPosts (posts with emotion tags)
                elif source == 'user_post':
                    # Use AI emotion if available, otherwise use user emotion, or analyze if neither exists
                    ai_emotion = conv.get('aiEmotion', '').strip()
                    user_emotion = conv.get('emotion', '').strip()
                    
                    if ai_emotion:
                        # Use AI-analyzed emotion from post creation
                        normalized_emotion = self.normalize_emotion(ai_emotion)
                        emotion_score = self.EMOTION_SCORES.get(normalized_emotion, 0.0)
                        
                        all_data_points.append(EmotionDataPoint(
                            timestamp=conv.get('timestamp', ''),
                            emotion=normalized_emotion,
                            intensity=0.6,  # Default intensity for pre-labeled
                            sentiment_score=emotion_score,
                            trigger_context=', '.join(conv.get('tags', [])) if conv.get('tags') else None
                        ))
                    elif user_emotion:
                        # Use user-selected emotion
                        normalized_emotion = self.normalize_emotion(user_emotion)
                        emotion_score = self.EMOTION_SCORES.get(normalized_emotion, 0.0)
                        
                        all_data_points.append(EmotionDataPoint(
                            timestamp=conv.get('timestamp', ''),
                            emotion=normalized_emotion,
                            intensity=0.5,  # Default intensity for user-selected
                            sentiment_score=emotion_score,
                            trigger_context=', '.join(conv.get('tags', [])) if conv.get('tags') else None
                        ))
                    else:
                        # No emotion labeled, need to analyze
                        conversations_needing_analysis.append(conv)
                else:
                    # Regular conversation, needs analysis
                    conversations_needing_analysis.append(conv)
            
            # Analyze conversations that don't have pre-labeled emotions
            for i in range(0, len(conversations_needing_analysis), batch_size):
                batch = conversations_needing_analysis[i:i+batch_size]
                texts_for_analysis = [
                    {'timestamp': conv.get('timestamp', ''), 'text': conv.get('userQuery', '')}
                    for conv in batch
                ]
                
                # Advanced Prompt Engineering: System instructions + Few-Shot Examples
                prompt = f"""You are an expert Psychologist and Linguistic Analyst specializing in empathy and text mining. 
                Analyze the emotional state of the following user messages.

                ### ANALYSIS GUIDELINES
                1. **Linguistic Nuance**: Consider punctuation ("..." can imply hesitation or speechless annoyance), emojis ("😅" often indicates embarrassment/awkwardness, not joy), and slang.
                2. **Distinguish Overlapping Emotions**:
                - "I'm worried about the test tomorrow" is ANXIETY (future worry), not FEAR (immediate threat).
                - "I have nothing to do" is BORED, not SADNESS.
                - "I wish I had her life" is ENVY, not ANGER.
                3. **Causal Trigger Extraction**: Only provide `trigger_context` if a specific cause is explicitly mentioned (e.g., "Upset because I failed"). If they just say "I'm so mad," `trigger_context` must be null.
                4. **Scoring Methodology**:
                - `intensity` (0.0 to 1.0): 0.1 is barely noticeable, 0.9 is overwhelming.
                - `sentiment_score` (-1.0 to 1.0): -1.0 is extremely negative, 1.0 is extremely positive. Note: Anger/Sadness are usually negative; Joy is positive.

                ### EMOTION TAXONOMY
                {emotion_definitions}

                ### EXAMPLES FOR CHAIN-OF-THOUGHT
                - Text: "I can't believe he got the promotion over me after all my hard work... 😒"
                Analysis: User expresses resentment toward a peer's success. Use of eye-roll emoji implies bitterness.
                Result: {{"emotion": "envy", "intensity": 0.7, "sentiment_score": -0.4, "trigger_context": "peer's promotion"}}

                - Text: "The presentation is in 10 minutes and my hands are shaking."
                Analysis: Physical symptoms of nervousness regarding an upcoming event.
                Result: {{"emotion": "anxiety", "intensity": 0.8, "sentiment_score": -0.3, "trigger_context": "upcoming presentation"}}

                ### MESSAGES TO ANALYZE
                {json.dumps(texts_for_analysis, indent=2)}

                ### OUTPUT INSTRUCTIONS
                Return ONLY a valid JSON array of objects. Each object MUST include:
                - timestamp: (identical to input)
                - reasoning: (one short sentence explaining the linguistic cues used for classification)
                - emotion: (one of the 9 English words above)
                - intensity: (float)
                - sentiment_score: (float)
                - trigger_context: (string or null)
                """

                try:
                    response = self._call_gemini(prompt)
                    response = response.strip()
                    
                    # Handling Markdown Code Blocks
                    if response.startswith('```'):
                        if '\n' in response:
                            response = response.split('\n', 1)[1]
                        response = response.rsplit('```', 1)[0].strip()
                    
                    emotion_results = json.loads(response)
                    
                    for result in emotion_results:
                        raw_emotion = result.get('emotion', 'bored').lower()
                        normalized_emotion = self.normalize_emotion(raw_emotion)
                        
                        # Clean up null values
                        trigger_ctx = result.get('trigger_context')
                        if str(trigger_ctx).lower() in ['null', 'none', '']:
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
                    # Fallback: create neutral data points in case of API failure
                    for conv in batch:
                        all_data_points.append(EmotionDataPoint(
                            timestamp=conv.get('timestamp', ''),
                            emotion='bored',
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
            """
            Generate emotion word cloud from conversations in English.
            Includes tags from user posts for enhanced context.
            """
            if not conversations:
                return EmotionWordCloud(words={}, top_emotions=[], total_count=0)
                
            # Combine all user queries
            all_text = " ".join(
                conv.get('userQuery', '') for conv in conversations
            )
            
            # Extract tags from user posts
            post_tags = []
            for conv in conversations:
                if conv.get('source') == 'user_post' and conv.get('tags'):
                    post_tags.extend(conv.get('tags', []))
            
            # Count tag frequencies
            tag_counter = Counter(post_tags)
            
            # Use LLM to extract emotion-related keywords and expressions
            prompt = f"""Extract emotion-related keywords and expressions from the following text.
                Return strictly in JSON format: {{"words": {{"word1": frequency, "word2": frequency, ...}}, "emotions": ["emotion1", "emotion2", ...]}}

                Text:
                {all_text[:5000]}

                Return ONLY the JSON object, no other text."""

            try:
                response = self._call_gemini(prompt)
                response = response.strip()
                
                # Clean Markdown formatting if necessary
                if response.startswith('```'):
                    if '\n' in response:
                        response = response.split('\n', 1)[1]
                    response = response.rsplit('```', 1)[0].strip()
                
                result = json.loads(response)
                words = result.get('words', {})
                emotions = result.get('emotions', [])
                
                # Merge post tags into words (boost their frequency)
                for tag, count in tag_counter.items():
                    if tag in words:
                        words[tag] += count
                    else:
                        words[tag] = count
                
            except Exception as e:
                logger.warning(f"Word cloud generation failed: {e}")
                # Fallback: count emotions directly from data points
                emotion_counts = Counter(dp.emotion for dp in data_points)
                words = dict(emotion_counts.most_common(20))
                emotions = list(emotion_counts.keys())[:5]
                
                # Add tags even in fallback
                for tag, count in tag_counter.items():
                    if tag in words:
                        words[tag] += count
                    else:
                        words[tag] = count
            
            return EmotionWordCloud(
                words=words,
                top_emotions=emotions[:10],
                total_count=sum(words.values())
            )

    def analyze_triggers(
        self, 
        data_points: List[EmotionDataPoint]
    ) -> List[TriggerAnalysis]:
        """Analyze common emotion triggers based on English categories."""
        if not data_points:
            return []
            
        # Group by trigger context
        triggers_by_type = {}
        for dp in data_points:
            if dp.trigger_context:
                # Standardize context to lowercase for better matching
                context = dp.trigger_context.lower()
                
                # Categorize trigger based on predefined English categories
                trigger_type = 'other'
                for category in self.TRIGGER_CATEGORIES:
                    # Match categories like 'work_stress' with text like 'work stress'
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
        
        # Sort by frequency to show the most common triggers first
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
            """Generate AI summary, insights, suggestions, and predictions in English."""
            
            # Prepare context for the LLM
            context = f"""
    User ID: {user_id}
    Report Period: {period_type}
    Number of Data Points: {len(data_points)}

    Emotion Distribution:
    {json.dumps(emotion_distribution, ensure_ascii=False, indent=2)}

    Average Mood Score: {average_mood} (Range: -1.0 to 1.0)

    Emotion Trend: {trend.trend_direction}
    Volatility: {trend.volatility}

    Primary Triggers/Contexts:
    {json.dumps([asdict(t) for t in triggers[:5]], ensure_ascii=False, indent=2)}
    """

            prompt = f"""As a professional emotional health analyst, please generate a {period_type} emotional report based on the following user data.

    {context}

    Please return the response strictly in JSON format:
    {{
        "summary_text": "A general summary of the emotional state (approx. 200 words)",
        "key_insights": ["Insight 1", "Insight 2", "Insight 3"],
        "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"],
        "trend_prediction": "Prediction and explanation of the emotional trend for the upcoming period"
    }}

    Use a warm, supportive, and empathetic tone. Provide practical and actionable advice. Return ONLY the JSON object."""

            try:
                response = self._call_gemini(prompt)
                response = response.strip()
                
                # Remove Markdown code blocks if present
                if response.startswith('```'):
                    if '\n' in response:
                        response = response.split('\n', 1)[1]
                    response = response.rsplit('```', 1)[0].strip()
                
                return json.loads(response)
                
            except Exception as e:
                logger.error(f"Summary generation failed: {e}")
                # Fallback response in English
                return {
                    "summary_text": "We were unable to generate your summary at this time. Please try again later.",
                    "key_insights": [],
                    "suggestions": [
                        "Maintain a positive mindset",
                        "Engage in physical activity",
                        "Connect with friends or family"
                    ],
                    "trend_prediction": "Insufficient data to make a prediction."
                }

    def generate_report(
        self,
        user_id: str,
        period_type: Literal['daily', 'weekly', 'monthly'] = 'weekly',
        end_date: Optional[str] = None,
        start_date: Optional[str] = None
    ) -> EmotionSummary:
        """
        Generate a complete emotion analytics report.

        Args:
            user_id: User identifier
            period_type: 'daily', 'weekly', or 'monthly'
            end_date: End date (ISO format with Z suffix), defaults to now
            start_date: Start date (ISO format with Z suffix). If provided with end_date,
                       overrides the period_type-based calculation.

        Returns:
            Complete EmotionSummary
        """
        # Calculate date range
        # If both start_date and end_date are provided, use them directly
        if start_date and end_date:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        else:
            # Default behavior: calculate based on period_type
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

        start_date_str = start_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        end_date_str = end_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

        logger.info(f"Generating {period_type} report for user {user_id}")
        logger.info(f"Date range: {start_date_str} to {end_date_str}")

        # Fetch conversations
        conversations = self.fetch_user_conversations(user_id, start_date_str, end_date_str)

        if not conversations:
            return EmotionSummary(
                user_id=user_id,
                period_type=period_type,
                start_date=start_date_str,
                end_date=end_date_str,
                average_mood_score=0.0,
                mood_stability=1.0,
                total_interactions=0,
                emotion_distribution={},
                emotion_trend=EmotionTrend('daily', [], 'stable', 0.0),
                word_cloud=EmotionWordCloud({}, [], 0),
                triggers=[],
                summary_text="No conversations found in this period.",
                key_insights=[],
                suggestions=["Start recording your moods and thoughts!"],
                trend_prediction="Insufficient data for reporting."
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
            start_date=start_date_str,
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
def generate_daily_emotion_report(
    user_id: str,
    end_date: Optional[str] = None,
    start_date: Optional[str] = None,
    weaviate_manager: Optional[WeaviateManager] = None,
    gemini_client=None,
    llm_provider: str = 'gemini'
) -> EmotionSummary:
    """
    Generate daily emotion report for a user.

    Args:
        user_id: User identifier
        end_date: End date (ISO format with Z suffix), defaults to now
        start_date: Start date (ISO format with Z suffix). If provided with end_date,
                   uses this exact range instead of calculating from period_type.
        weaviate_manager: Optional WeaviateManager instance
        gemini_client: Optional Gemini client
        llm_provider: LLM provider (currently only 'gemini' supported)
    """
    if weaviate_manager is None:
        weaviate_manager = WeaviateManager()

    if gemini_client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        gemini_client = genai.Client(api_key=api_key)

    analytics = EmotionAnalytics(weaviate_manager, gemini_client=gemini_client, llm_provider='gemini')
    return analytics.generate_report(user_id, 'daily', end_date=end_date, start_date=start_date)


def generate_weekly_emotion_report(
    user_id: str,
    end_date: Optional[str] = None,
    weaviate_manager: Optional[WeaviateManager] = None,
    gemini_client = None,
    llm_provider: str = 'gemini'
) -> EmotionSummary:
    """
    Generate weekly emotion report for a user.
    
    Args:
        user_id: User identifier
        end_date: End date (ISO format), defaults to now
        weaviate_manager: Optional WeaviateManager instance
        gemini_client: Optional Gemini client
        llm_provider: LLM provider (currently only 'gemini' supported)
    """
    if weaviate_manager is None:
        weaviate_manager = WeaviateManager()
    
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
    llm_provider: str = 'gemini'
) -> EmotionSummary:
    """
    Generate monthly emotion report for a user.
    
    Args:
        user_id: User identifier
        end_date: End date (ISO format), defaults to now
        weaviate_manager: Optional WeaviateManager instance
        gemini_client: Optional Gemini client
        llm_provider: LLM provider (currently only 'gemini' supported)
    """
    if weaviate_manager is None:
        weaviate_manager = WeaviateManager()
    
    if gemini_client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        gemini_client = genai.Client(api_key=api_key)
    
    analytics = EmotionAnalytics(weaviate_manager, gemini_client=gemini_client, llm_provider='gemini')
    return analytics.generate_report(user_id, 'monthly', end_date)

