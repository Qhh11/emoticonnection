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

from langchain_core.prompts import PromptTemplate
import weaviate.classes.query as wq
from weaviate.classes.query import Filter

try:
    from weaviate_client import WeaviateManager
    from model import ConversationRecord
except ImportError:
    from app.weaviate_client import WeaviateManager
    from app.model import ConversationRecord

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class EmotionDataPoint:
    """Single emotion data point for time series analysis."""
    timestamp: str
    emotion: str
    intensity: float  # 0-1 scale
    sentiment_score: float  # -1 to 1 scale
    trigger_context: Optional[str] = None


@dataclass
class EmotionWordCloud:
    """Word cloud data structure."""
    words: Dict[str, int]  # word -> frequency
    top_emotions: List[str]
    total_count: int


@dataclass
class EmotionTrend:
    """Emotion trend over time."""
    period: str  # 'daily', 'weekly', 'monthly'
    data_points: List[Dict[str, Any]]  # [{date, avg_score, dominant_emotion}]
    trend_direction: str  # 'improving', 'declining', 'stable'
    volatility: float  # 0-1 scale


@dataclass
class TriggerAnalysis:
    """Common trigger scenario analysis."""
    trigger_type: str  # e.g., 'work', 'relationships', 'health'
    frequency: int
    associated_emotions: List[str]
    example_contexts: List[str]
    impact_score: float  # -1 to 1


@dataclass
class EmotionSummary:
    """Complete emotion analytics summary."""
    user_id: str
    period_type: Literal['weekly', 'monthly']
    start_date: str
    end_date: str
    
    # Core metrics
    average_mood_score: float  # -1 to 1
    mood_stability: float  # 0-1, higher is more stable
    total_interactions: int
    
    # Analysis components
    emotion_distribution: Dict[str, float]  # emotion -> percentage
    emotion_trend: EmotionTrend
    word_cloud: EmotionWordCloud
    triggers: List[TriggerAnalysis]
    
    # AI-generated content
    summary_text: str
    key_insights: List[str]
    suggestions: List[str]
    trend_prediction: str


class EmotionAnalytics:
    """
    Analytics engine for emotion data processing and report generation.
    """
    
    # Emotion categories and their sentiment scores
    EMOTION_SCORES = {
        # Positive emotions
        'happy': 0.8, 'joyful': 0.9, 'excited': 0.7, 'grateful': 0.8,
        'content': 0.6, 'hopeful': 0.5, 'peaceful': 0.6, 'loved': 0.9,
        'proud': 0.7, 'confident': 0.6, 'optimistic': 0.7,
        
        # Neutral emotions
        'neutral': 0.0, 'calm': 0.2, 'curious': 0.1, 'surprised': 0.0,
        'thoughtful': 0.1, 'reflective': 0.1,
        
        # Negative emotions
        'sad': -0.6, 'anxious': -0.5, 'stressed': -0.6, 'frustrated': -0.5,
        'angry': -0.7, 'disappointed': -0.5, 'lonely': -0.6, 'worried': -0.4,
        'overwhelmed': -0.7, 'depressed': -0.9, 'fearful': -0.6, 'guilty': -0.5,
        'jealous': -0.4, 'ashamed': -0.6, 'hurt': -0.7
    }
    
    # Trigger categories
    TRIGGER_CATEGORIES = [
        'work', 'relationships', 'health', 'family', 'finance',
        'social', 'personal_growth', 'daily_routine', 'unexpected_events'
    ]

    def __init__(self, weaviate_manager: WeaviateManager, gemini_client):
        """Initialize with database and AI client."""
        self.weaviate_manager = weaviate_manager
        self.gemini_client = gemini_client
        
    def _call_gemini(self, prompt: str) -> str:
        """Call Gemini API for text generation."""
        from google.genai import types
        
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
                model="gemini-2.5-flash",
                contents=prompt,
                config=gen_cfg
            )
            return response.text
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            raise

    def fetch_user_conversations(
        self, 
        user_id: str, 
        start_date: str, 
        end_date: str
    ) -> List[Dict[str, Any]]:
        """
        Fetch user conversations within the specified date range.
        
        Args:
            user_id: User identifier
            start_date: ISO format start date
            end_date: ISO format end date
            
        Returns:
            List of conversation records
        """
        if not self.weaviate_manager or not self.weaviate_manager.client:
            raise RuntimeError("Weaviate client not initialized")
            
        if not self.weaviate_manager.client.is_connected():
            self.weaviate_manager.client.connect()
            
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
            
            conversations = []
            for obj in response.objects:
                conversations.append(obj.properties)
                
            return conversations
            
        except Exception as e:
            logger.error(f"Error fetching conversations: {e}")
            raise

    def analyze_emotions_from_text(self, conversations: List[Dict]) -> List[EmotionDataPoint]:
        """
        Analyze emotions from conversation texts using Gemini.
        
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
            
            prompt = f"""分析以下用户消息的情绪状态。对每条消息，返回JSON格式:

消息列表:
{json.dumps(texts_for_analysis, ensure_ascii=False, indent=2)}

请返回一个JSON数组，每个元素包含:
- timestamp: 原始时间戳
- emotion: 主要情绪 (happy, sad, anxious, angry, grateful, hopeful, frustrated, neutral, etc.)
- intensity: 情绪强度 (0.0-1.0)
- sentiment_score: 情感得分 (-1.0 到 1.0, 负数为消极，正数为积极)
- trigger_context: 可能的触发情境描述 (简短)

只返回JSON数组，不要其他文字。"""

            try:
                response = self._call_gemini(prompt)
                # Parse JSON response
                response = response.strip()
                if response.startswith('```'):
                    response = response.split('\n', 1)[1]
                    response = response.rsplit('```', 1)[0]
                
                emotion_results = json.loads(response)
                
                for result in emotion_results:
                    all_data_points.append(EmotionDataPoint(
                        timestamp=result.get('timestamp', ''),
                        emotion=result.get('emotion', 'neutral'),
                        intensity=float(result.get('intensity', 0.5)),
                        sentiment_score=float(result.get('sentiment_score', 0.0)),
                        trigger_context=result.get('trigger_context')
                    ))
            except Exception as e:
                logger.warning(f"Batch emotion analysis failed: {e}")
                # Fallback: create neutral data points
                for conv in batch:
                    all_data_points.append(EmotionDataPoint(
                        timestamp=conv.get('timestamp', ''),
                        emotion='neutral',
                        intensity=0.5,
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
            response = self._call_gemini(prompt)
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
            response = self._call_gemini(prompt)
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
        period_type: Literal['weekly', 'monthly'] = 'weekly',
        end_date: Optional[str] = None
    ) -> EmotionSummary:
        """
        Generate a complete emotion analytics report.
        
        Args:
            user_id: User identifier
            period_type: 'weekly' or 'monthly'
            end_date: End date (ISO format), defaults to now
            
        Returns:
            Complete EmotionSummary
        """
        # Calculate date range
        if end_date:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        else:
            end_dt = datetime.now(timezone.utc)
            
        if period_type == 'weekly':
            start_dt = end_dt - timedelta(days=7)
        else:
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

    def to_json(self, summary: EmotionSummary) -> str:
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


# Convenience functions for direct use
def generate_weekly_emotion_report(
    user_id: str,
    end_date: Optional[str] = None,
    weaviate_manager: Optional[WeaviateManager] = None,
    gemini_client = None
) -> EmotionSummary:
    """Generate weekly emotion report for a user."""
    from google import genai
    
    if weaviate_manager is None:
        weaviate_manager = WeaviateManager()
    if gemini_client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        gemini_client = genai.Client(api_key=api_key)
        
    analytics = EmotionAnalytics(weaviate_manager, gemini_client)
    return analytics.generate_report(user_id, 'weekly', end_date)


def generate_monthly_emotion_report(
    user_id: str,
    end_date: Optional[str] = None,
    weaviate_manager: Optional[WeaviateManager] = None,
    gemini_client = None
) -> EmotionSummary:
    """Generate monthly emotion report for a user."""
    from google import genai
    
    if weaviate_manager is None:
        weaviate_manager = WeaviateManager()
    if gemini_client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        gemini_client = genai.Client(api_key=api_key)
        
    analytics = EmotionAnalytics(weaviate_manager, gemini_client)
    return analytics.generate_report(user_id, 'monthly', end_date)


if __name__ == "__main__":
    # Test the analytics module
    from google import genai
    from dotenv import load_dotenv
    
    load_dotenv()
    
    try:
        manager = WeaviateManager()
        api_key = os.getenv("GEMINI_API_KEY")
        client = genai.Client(api_key=api_key)
        
        analytics = EmotionAnalytics(manager, client)
        
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
