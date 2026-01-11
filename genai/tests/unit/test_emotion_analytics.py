"""
Unit tests for Emotion Analytics module.
Tests the emotion analysis, report generation, and data processing functions.

9 Core Emotions:
- bored (无聊/丧丧) - Snoozy
- fear (恐惧/怕怕) - Scaredy  
- joy (快乐/乐乐) - Sunny
- sadness (忧伤/忧忧) - Bluey
- disgust (厌恶/厌厌) - Yucky
- anxiety (焦虑/焦焦) - Jitters
- anger (愤怒/怒怒) - Grumpy
- embarrassment (尴尬/尬尬) - Blushy
- envy (羡慕/慕慕) - Sparkle
"""

import sys
import os
import unittest
import json
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import datetime, timezone, timedelta
from dataclasses import asdict

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

# Mock WeaviateManager before importing
with patch('app.weaviate_client.WeaviateManager'):
    from app.emotion_analytics import (
        EmotionAnalytics,
        EmotionDataPoint,
        EmotionTrend,
        EmotionWordCloud,
        TriggerAnalysis,
        EmotionSummary,
        generate_weekly_emotion_report,
        generate_monthly_emotion_report,
    )


class TestEmotionDataPoint(unittest.TestCase):
    """Tests for EmotionDataPoint dataclass."""
    
    def test_create_emotion_data_point(self):
        """Test creating an EmotionDataPoint instance."""
        dp = EmotionDataPoint(
            timestamp="2025-12-25T10:00:00Z",
            emotion="joy",
            intensity=0.8,
            sentiment_score=0.7,
            trigger_context="received good news"
        )
        
        self.assertEqual(dp.timestamp, "2025-12-25T10:00:00Z")
        self.assertEqual(dp.emotion, "joy")
        self.assertEqual(dp.intensity, 0.8)
        self.assertEqual(dp.sentiment_score, 0.7)
        self.assertEqual(dp.trigger_context, "received good news")
    
    def test_emotion_data_point_optional_trigger(self):
        """Test EmotionDataPoint with no trigger context."""
        dp = EmotionDataPoint(
            timestamp="2025-12-25T10:00:00Z",
            emotion="bored",
            intensity=0.5,
            sentiment_score=0.0
        )
        
        self.assertIsNone(dp.trigger_context)


class TestEmotionAnalyticsCalculations(unittest.TestCase):
    """Tests for EmotionAnalytics calculation methods."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.mock_weaviate = MagicMock()
        self.mock_gemini = MagicMock()
        self.analytics = EmotionAnalytics(self.mock_weaviate, self.mock_gemini)
        
        # Sample data points using the 9 core emotions
        self.sample_data_points = [
            EmotionDataPoint("2025-12-20T10:00:00Z", "joy", 0.8, 0.9, "work success"),
            EmotionDataPoint("2025-12-21T10:00:00Z", "sadness", 0.6, -0.7, "personal issue"),
            EmotionDataPoint("2025-12-22T10:00:00Z", "bored", 0.5, -0.2, None),
            EmotionDataPoint("2025-12-23T10:00:00Z", "anxiety", 0.7, -0.6, "work deadline"),
            EmotionDataPoint("2025-12-24T10:00:00Z", "joy", 0.9, 0.9, "holiday"),
            EmotionDataPoint("2025-12-25T10:00:00Z", "envy", 0.85, -0.2, "family"),
        ]
    
    def test_calculate_emotion_distribution(self):
        """Test emotion distribution calculation."""
        distribution = self.analytics.calculate_emotion_distribution(self.sample_data_points)
        
        self.assertIn("joy", distribution)
        self.assertAlmostEqual(distribution["joy"], 33.33, places=1)  # 2 out of 6
        self.assertEqual(len(distribution), 5)  # 5 unique emotions
        
        # Sum should be approximately 100
        total = sum(distribution.values())
        self.assertAlmostEqual(total, 100, places=1)
    
    def test_calculate_emotion_distribution_empty(self):
        """Test emotion distribution with empty data."""
        distribution = self.analytics.calculate_emotion_distribution([])
        self.assertEqual(distribution, {})
    
    def test_calculate_average_mood_score(self):
        """Test average mood score calculation."""
        avg_score = self.analytics.calculate_average_mood_score(self.sample_data_points)
        
        # Expected: (0.9 - 0.7 - 0.2 - 0.6 + 0.9 - 0.2) / 6 = 0.0167
        expected = (0.9 - 0.7 - 0.2 - 0.6 + 0.9 - 0.2) / 6
        self.assertAlmostEqual(avg_score, expected, places=2)
    
    def test_calculate_average_mood_score_empty(self):
        """Test average mood score with empty data."""
        avg_score = self.analytics.calculate_average_mood_score([])
        self.assertEqual(avg_score, 0.0)
    
    def test_calculate_mood_stability(self):
        """Test mood stability calculation."""
        stability = self.analytics.calculate_mood_stability(self.sample_data_points)
        
        # Stability should be between 0 and 1
        self.assertGreaterEqual(stability, 0.0)
        self.assertLessEqual(stability, 1.0)
    
    def test_calculate_mood_stability_single_point(self):
        """Test mood stability with single data point."""
        single_point = [self.sample_data_points[0]]
        stability = self.analytics.calculate_mood_stability(single_point)
        
        # With single point, stability should be 1.0
        self.assertEqual(stability, 1.0)
    
    def test_calculate_mood_stability_stable_mood(self):
        """Test mood stability with consistent mood."""
        stable_points = [
            EmotionDataPoint("2025-12-20T10:00:00Z", "joy", 0.8, 0.5, None),
            EmotionDataPoint("2025-12-21T10:00:00Z", "joy", 0.8, 0.5, None),
            EmotionDataPoint("2025-12-22T10:00:00Z", "joy", 0.8, 0.5, None),
        ]
        stability = self.analytics.calculate_mood_stability(stable_points)
        
        # Very stable mood should have high stability score
        self.assertEqual(stability, 1.0)


class TestEmotionTrendGeneration(unittest.TestCase):
    """Tests for emotion trend generation."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.mock_weaviate = MagicMock()
        self.mock_gemini = MagicMock()
        self.analytics = EmotionAnalytics(self.mock_weaviate, self.mock_gemini)
    
    def test_generate_emotion_trend_improving(self):
        """Test trend detection for improving mood (sadness -> joy)."""
        # Create data with improving trend using 9 core emotions
        improving_data = [
            EmotionDataPoint("2025-12-20T10:00:00Z", "sadness", 0.7, -0.6, None),
            EmotionDataPoint("2025-12-21T10:00:00Z", "sadness", 0.6, -0.4, None),
            EmotionDataPoint("2025-12-22T10:00:00Z", "bored", 0.5, 0.0, None),
            EmotionDataPoint("2025-12-23T10:00:00Z", "joy", 0.6, 0.3, None),
            EmotionDataPoint("2025-12-24T10:00:00Z", "joy", 0.7, 0.5, None),
            EmotionDataPoint("2025-12-25T10:00:00Z", "joy", 0.8, 0.7, None),
        ]
        
        trend = self.analytics.generate_emotion_trend(improving_data)
        
        self.assertIsInstance(trend, EmotionTrend)
        self.assertEqual(trend.trend_direction, "improving")
        self.assertEqual(len(trend.data_points), 6)
    
    def test_generate_emotion_trend_declining(self):
        """Test trend detection for declining mood (joy -> sadness)."""
        declining_data = [
            EmotionDataPoint("2025-12-20T10:00:00Z", "joy", 0.8, 0.7, None),
            EmotionDataPoint("2025-12-21T10:00:00Z", "joy", 0.7, 0.5, None),
            EmotionDataPoint("2025-12-22T10:00:00Z", "bored", 0.5, 0.0, None),
            EmotionDataPoint("2025-12-23T10:00:00Z", "sadness", 0.6, -0.3, None),
            EmotionDataPoint("2025-12-24T10:00:00Z", "sadness", 0.7, -0.5, None),
            EmotionDataPoint("2025-12-25T10:00:00Z", "sadness", 0.8, -0.7, None),
        ]
        
        trend = self.analytics.generate_emotion_trend(declining_data)
        
        self.assertEqual(trend.trend_direction, "declining")
    
    def test_generate_emotion_trend_stable(self):
        """Test trend detection for stable mood (bored)."""
        stable_data = [
            EmotionDataPoint("2025-12-20T10:00:00Z", "bored", 0.5, 0.1, None),
            EmotionDataPoint("2025-12-21T10:00:00Z", "bored", 0.5, 0.0, None),
            EmotionDataPoint("2025-12-22T10:00:00Z", "bored", 0.5, 0.1, None),
            EmotionDataPoint("2025-12-23T10:00:00Z", "bored", 0.5, -0.1, None),
            EmotionDataPoint("2025-12-24T10:00:00Z", "bored", 0.5, 0.0, None),
            EmotionDataPoint("2025-12-25T10:00:00Z", "bored", 0.5, 0.1, None),
        ]
        
        trend = self.analytics.generate_emotion_trend(stable_data)
        
        self.assertEqual(trend.trend_direction, "stable")
    
    def test_generate_emotion_trend_empty(self):
        """Test trend generation with empty data."""
        trend = self.analytics.generate_emotion_trend([])
        
        self.assertEqual(trend.trend_direction, "stable")
        self.assertEqual(trend.data_points, [])
        self.assertEqual(trend.volatility, 0.0)


class TestTriggerAnalysis(unittest.TestCase):
    """Tests for trigger analysis."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.mock_weaviate = MagicMock()
        self.mock_gemini = MagicMock()
        self.analytics = EmotionAnalytics(self.mock_weaviate, self.mock_gemini)
    
    def test_analyze_triggers(self):
        """Test trigger analysis with 9 core emotions."""
        data_with_triggers = [
            EmotionDataPoint("2025-12-20T10:00:00Z", "anxiety", 0.7, -0.6, "work deadline"),
            EmotionDataPoint("2025-12-21T10:00:00Z", "anger", 0.8, -0.8, "work meeting"),
            EmotionDataPoint("2025-12-22T10:00:00Z", "joy", 0.8, 0.9, "family dinner"),
            EmotionDataPoint("2025-12-23T10:00:00Z", "sadness", 0.6, -0.7, "relationships conflict"),
            EmotionDataPoint("2025-12-24T10:00:00Z", "envy", 0.9, -0.2, "family time"),
        ]
        
        triggers = self.analytics.analyze_triggers(data_with_triggers)
        
        self.assertIsInstance(triggers, list)
        self.assertTrue(len(triggers) > 0)
        
        for trigger in triggers:
            self.assertIsInstance(trigger, TriggerAnalysis)
            self.assertIsInstance(trigger.frequency, int)
            self.assertIsInstance(trigger.associated_emotions, list)
    
    def test_analyze_triggers_empty(self):
        """Test trigger analysis with empty data."""
        triggers = self.analytics.analyze_triggers([])
        self.assertEqual(triggers, [])
    
    def test_analyze_triggers_no_context(self):
        """Test trigger analysis when no trigger context provided."""
        data_no_triggers = [
            EmotionDataPoint("2025-12-20T10:00:00Z", "happy", 0.7, 0.5, None),
            EmotionDataPoint("2025-12-21T10:00:00Z", "neutral", 0.5, 0.0, None),
        ]
        
        triggers = self.analytics.analyze_triggers(data_no_triggers)
        self.assertEqual(triggers, [])


class TestWordCloudGeneration(unittest.TestCase):
    """Tests for word cloud generation."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.mock_weaviate = MagicMock()
        self.mock_gemini = MagicMock()
        self.analytics = EmotionAnalytics(self.mock_weaviate, self.mock_gemini)
    
    @patch.object(EmotionAnalytics, '_call_gemini')
    def test_generate_word_cloud(self, mock_call_gemini):
        """Test word cloud generation."""
        mock_call_gemini.return_value = json.dumps({
            "words": {"开心": 5, "压力": 3, "感恩": 2},
            "emotions": ["happy", "stressed", "grateful"]
        })
        
        conversations = [
            {"userQuery": "今天很开心"},
            {"userQuery": "工作压力很大"},
            {"userQuery": "感谢家人的支持"},
        ]
        data_points = [
            EmotionDataPoint("2025-12-20T10:00:00Z", "happy", 0.8, 0.7, None),
        ]
        
        word_cloud = self.analytics.generate_word_cloud(conversations, data_points)
        
        self.assertIsInstance(word_cloud, EmotionWordCloud)
        self.assertIn("开心", word_cloud.words)
        self.assertEqual(word_cloud.words["开心"], 5)
    
    def test_generate_word_cloud_empty(self):
        """Test word cloud with empty conversations."""
        word_cloud = self.analytics.generate_word_cloud([], [])
        
        self.assertEqual(word_cloud.words, {})
        self.assertEqual(word_cloud.top_emotions, [])
        self.assertEqual(word_cloud.total_count, 0)


class TestEmotionSummaryGeneration(unittest.TestCase):
    """Tests for complete emotion summary generation."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.mock_weaviate = MagicMock()
        self.mock_weaviate.client = MagicMock()
        self.mock_weaviate.client.is_connected.return_value = True
        
        self.mock_gemini = MagicMock()
        self.analytics = EmotionAnalytics(self.mock_weaviate, self.mock_gemini)
    
    @patch.object(EmotionAnalytics, 'fetch_user_conversations')
    @patch.object(EmotionAnalytics, 'analyze_emotions_from_text')
    @patch.object(EmotionAnalytics, 'generate_summary_and_suggestions')
    @patch.object(EmotionAnalytics, '_call_gemini')
    def test_generate_report_weekly(self, mock_call_gemini, mock_summary, mock_analyze, mock_fetch):
        """Test weekly report generation."""
        # Mock fetch conversations
        mock_fetch.return_value = [
            {"timestamp": "2025-12-20T10:00:00Z", "userQuery": "今天心情不错"},
            {"timestamp": "2025-12-21T10:00:00Z", "userQuery": "工作很累"},
        ]
        
        # Mock emotion analysis using 9 core emotions
        mock_analyze.return_value = [
            EmotionDataPoint("2025-12-20T10:00:00Z", "joy", 0.8, 0.9, None),
            EmotionDataPoint("2025-12-21T10:00:00Z", "anxiety", 0.7, -0.6, "work"),
        ]
        
        # Mock word cloud response
        mock_call_gemini.return_value = json.dumps({
            "words": {"心情": 2, "工作": 1},
            "emotions": ["joy", "anxiety"]
        })
        
        # Mock summary generation
        mock_summary.return_value = {
            "summary_text": "本周情绪总体稳定。",
            "key_insights": ["工作压力有所增加"],
            "suggestions": ["适当休息"],
            "trend_prediction": "预计情绪将保持稳定"
        }
        
        report = self.analytics.generate_report("test_user", "weekly")
        
        self.assertIsInstance(report, EmotionSummary)
        self.assertEqual(report.user_id, "test_user")
        self.assertEqual(report.period_type, "weekly")
        self.assertEqual(report.total_interactions, 2)
    
    @patch.object(EmotionAnalytics, 'fetch_user_conversations')
    def test_generate_report_no_data(self, mock_fetch):
        """Test report generation when no data available."""
        mock_fetch.return_value = []
        
        report = self.analytics.generate_report("test_user", "weekly")
        
        self.assertEqual(report.total_interactions, 0)
        self.assertEqual(report.emotion_distribution, {})
        self.assertIn("没有找到对话记录", report.summary_text)


class TestEmotionScores(unittest.TestCase):
    """Tests for the 9 core emotion score mappings."""
    
    def test_all_9_emotions_exist(self):
        """Test that all 9 core emotions are defined."""
        core_emotions = ['bored', 'fear', 'joy', 'sadness', 'disgust', 
                        'anxiety', 'anger', 'embarrassment', 'envy']
        for emotion in core_emotions:
            self.assertIn(emotion, EmotionAnalytics.EMOTION_SCORES,
                         f"{emotion} should be in EMOTION_SCORES")
    
    def test_positive_emotion_scores(self):
        """Test that joy has positive score (only positive emotion)."""
        self.assertGreater(EmotionAnalytics.EMOTION_SCORES['joy'], 0,
                          "joy should have positive score")
    
    def test_negative_emotion_scores(self):
        """Test that negative emotions have negative scores."""
        negative_emotions = ['sadness', 'fear', 'anger', 'anxiety', 'disgust']
        for emotion in negative_emotions:
            self.assertLess(
                EmotionAnalytics.EMOTION_SCORES.get(emotion, 0), 
                0, 
                f"{emotion} should have negative score"
            )
    
    def test_mild_negative_emotions(self):
        """Test mild negative emotions (bored, envy, embarrassment)."""
        mild_emotions = ['bored', 'envy', 'embarrassment']
        for emotion in mild_emotions:
            score = EmotionAnalytics.EMOTION_SCORES.get(emotion, 0)
            self.assertLess(score, 0, f"{emotion} should be negative")
            self.assertGreater(score, -0.5, f"{emotion} should be mild negative")


class TestEmotionConfig(unittest.TestCase):
    """Tests for emotion configuration with colors and nicknames."""
    
    def test_emotion_config_structure(self):
        """Test that EMOTION_CONFIG has correct structure."""
        for key, config in EmotionAnalytics.EMOTION_CONFIG.items():
            self.assertIn('cn_name', config)
            self.assertIn('cn_nickname', config)
            self.assertIn('en_nickname', config)
            self.assertIn('color', config)
            self.assertIn('score', config)
    
    def test_emotion_colors(self):
        """Test emotion colors are valid hex codes."""
        expected_colors = {
            'bored': '#4B4E91',
            'fear': '#9381BA',
            'joy': '#F9D849',
            'sadness': '#3266B1',
            'disgust': '#66B04C',
            'anxiety': '#E67E22',
            'anger': '#D32F2F',
            'embarrassment': '#D278A3',
            'envy': '#2BA8A4',
        }
        for emotion, expected_color in expected_colors.items():
            actual_color = EmotionAnalytics.EMOTION_CONFIG[emotion]['color']
            self.assertEqual(actual_color, expected_color,
                           f"{emotion} color mismatch")
    
    def test_chinese_nicknames(self):
        """Test Chinese nicknames."""
        expected_nicknames = {
            'bored': '丧丧',
            'fear': '怕怕',
            'joy': '乐乐',
            'sadness': '忧忧',
            'disgust': '厌厌',
            'anxiety': '焦焦',
            'anger': '怒怒',
            'embarrassment': '尬尬',
            'envy': '慕慕',
        }
        for emotion, expected_nickname in expected_nicknames.items():
            actual_nickname = EmotionAnalytics.EMOTION_CONFIG[emotion]['cn_nickname']
            self.assertEqual(actual_nickname, expected_nickname)
    
    def test_get_emotion_color(self):
        """Test get_emotion_color method."""
        self.assertEqual(EmotionAnalytics.get_emotion_color('joy'), '#F9D849')
        self.assertEqual(EmotionAnalytics.get_emotion_color('anger'), '#D32F2F')
        # Test with unknown emotion
        self.assertEqual(EmotionAnalytics.get_emotion_color('unknown'), '#808080')
    
    def test_get_emotion_nickname(self):
        """Test get_emotion_nickname method."""
        self.assertEqual(EmotionAnalytics.get_emotion_nickname('joy', 'cn'), '乐乐')
        self.assertEqual(EmotionAnalytics.get_emotion_nickname('joy', 'en'), 'Sunny')
        self.assertEqual(EmotionAnalytics.get_emotion_nickname('anger', 'cn'), '怒怒')
        self.assertEqual(EmotionAnalytics.get_emotion_nickname('anger', 'en'), 'Grumpy')


class TestEmotionNormalization(unittest.TestCase):
    """Tests for emotion normalization."""
    
    def test_normalize_english_emotions(self):
        """Test normalizing English emotion names."""
        self.assertEqual(EmotionAnalytics.normalize_emotion('happy'), 'joy')
        self.assertEqual(EmotionAnalytics.normalize_emotion('sad'), 'sadness')
        self.assertEqual(EmotionAnalytics.normalize_emotion('angry'), 'anger')
        self.assertEqual(EmotionAnalytics.normalize_emotion('anxious'), 'anxiety')
    
    def test_normalize_chinese_emotions(self):
        """Test normalizing Chinese emotion names."""
        self.assertEqual(EmotionAnalytics.normalize_emotion('快乐'), 'joy')
        self.assertEqual(EmotionAnalytics.normalize_emotion('忧伤'), 'sadness')
        self.assertEqual(EmotionAnalytics.normalize_emotion('愤怒'), 'anger')
        self.assertEqual(EmotionAnalytics.normalize_emotion('焦虑'), 'anxiety')
    
    def test_normalize_chinese_nicknames(self):
        """Test normalizing Chinese nicknames."""
        self.assertEqual(EmotionAnalytics.normalize_emotion('乐乐'), 'joy')
        self.assertEqual(EmotionAnalytics.normalize_emotion('忧忧'), 'sadness')
        self.assertEqual(EmotionAnalytics.normalize_emotion('怒怒'), 'anger')
        self.assertEqual(EmotionAnalytics.normalize_emotion('焦焦'), 'anxiety')
    
    def test_normalize_already_normalized(self):
        """Test that already normalized emotions stay the same."""
        for emotion in ['bored', 'fear', 'joy', 'sadness', 'disgust', 
                       'anxiety', 'anger', 'embarrassment', 'envy']:
            self.assertEqual(EmotionAnalytics.normalize_emotion(emotion), emotion)


class TestTriggerCategories(unittest.TestCase):
    """Tests for trigger category definitions."""
    
    def test_trigger_categories_exist(self):
        """Test that trigger categories are defined."""
        categories = EmotionAnalytics.TRIGGER_CATEGORIES
        
        self.assertIn('work', categories)
        self.assertIn('relationships', categories)
        self.assertIn('health', categories)
        self.assertIn('family', categories)
        self.assertIn('finance', categories)


class TestDataConversion(unittest.TestCase):
    """Tests for data conversion methods."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.mock_weaviate = MagicMock()
        self.mock_gemini = MagicMock()
        self.analytics = EmotionAnalytics(self.mock_weaviate, self.mock_gemini)
    
    def test_to_json(self):
        """Test converting EmotionSummary to JSON."""
        summary = EmotionSummary(
            user_id="test_user",
            period_type="weekly",
            start_date="2025-12-18T00:00:00Z",
            end_date="2025-12-25T00:00:00Z",
            average_mood_score=0.5,
            mood_stability=0.8,
            total_interactions=10,
            emotion_distribution={"joy": 60.0, "sadness": 40.0},
            emotion_trend=EmotionTrend("daily", [], "stable", 0.2),
            word_cloud=EmotionWordCloud({"test": 5}, ["joy"], 5),
            triggers=[],
            summary_text="Test summary",
            key_insights=["Insight 1"],
            suggestions=["Suggestion 1"],
            trend_prediction="Prediction"
        )
        
        json_str = self.analytics.to_json(summary)
        
        # Verify it's valid JSON
        parsed = json.loads(json_str)
        
        self.assertEqual(parsed["user_id"], "test_user")
        self.assertEqual(parsed["period_type"], "weekly")
        self.assertEqual(parsed["average_mood_score"], 0.5)


if __name__ == '__main__':
    unittest.main()
