"""
Unit tests for Emotion Analytics module.
Tests the emotion analysis, report generation, and data processing functions.
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
            emotion="happy",
            intensity=0.8,
            sentiment_score=0.7,
            trigger_context="received good news"
        )
        
        self.assertEqual(dp.timestamp, "2025-12-25T10:00:00Z")
        self.assertEqual(dp.emotion, "happy")
        self.assertEqual(dp.intensity, 0.8)
        self.assertEqual(dp.sentiment_score, 0.7)
        self.assertEqual(dp.trigger_context, "received good news")
    
    def test_emotion_data_point_optional_trigger(self):
        """Test EmotionDataPoint with no trigger context."""
        dp = EmotionDataPoint(
            timestamp="2025-12-25T10:00:00Z",
            emotion="neutral",
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
        
        # Sample data points
        self.sample_data_points = [
            EmotionDataPoint("2025-12-20T10:00:00Z", "happy", 0.8, 0.7, "work success"),
            EmotionDataPoint("2025-12-21T10:00:00Z", "sad", 0.6, -0.5, "personal issue"),
            EmotionDataPoint("2025-12-22T10:00:00Z", "neutral", 0.5, 0.0, None),
            EmotionDataPoint("2025-12-23T10:00:00Z", "anxious", 0.7, -0.4, "work deadline"),
            EmotionDataPoint("2025-12-24T10:00:00Z", "happy", 0.9, 0.8, "holiday"),
            EmotionDataPoint("2025-12-25T10:00:00Z", "grateful", 0.85, 0.9, "family"),
        ]
    
    def test_calculate_emotion_distribution(self):
        """Test emotion distribution calculation."""
        distribution = self.analytics.calculate_emotion_distribution(self.sample_data_points)
        
        self.assertIn("happy", distribution)
        self.assertAlmostEqual(distribution["happy"], 33.33, places=1)  # 2 out of 6
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
        
        # Expected: (0.7 - 0.5 + 0.0 - 0.4 + 0.8 + 0.9) / 6 = 0.25
        expected = (0.7 - 0.5 + 0.0 - 0.4 + 0.8 + 0.9) / 6
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
            EmotionDataPoint("2025-12-20T10:00:00Z", "happy", 0.8, 0.5, None),
            EmotionDataPoint("2025-12-21T10:00:00Z", "happy", 0.8, 0.5, None),
            EmotionDataPoint("2025-12-22T10:00:00Z", "happy", 0.8, 0.5, None),
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
        """Test trend detection for improving mood."""
        # Create data with improving trend
        improving_data = [
            EmotionDataPoint("2025-12-20T10:00:00Z", "sad", 0.7, -0.6, None),
            EmotionDataPoint("2025-12-21T10:00:00Z", "sad", 0.6, -0.4, None),
            EmotionDataPoint("2025-12-22T10:00:00Z", "neutral", 0.5, 0.0, None),
            EmotionDataPoint("2025-12-23T10:00:00Z", "happy", 0.6, 0.3, None),
            EmotionDataPoint("2025-12-24T10:00:00Z", "happy", 0.7, 0.5, None),
            EmotionDataPoint("2025-12-25T10:00:00Z", "happy", 0.8, 0.7, None),
        ]
        
        trend = self.analytics.generate_emotion_trend(improving_data)
        
        self.assertIsInstance(trend, EmotionTrend)
        self.assertEqual(trend.trend_direction, "improving")
        self.assertEqual(len(trend.data_points), 6)
    
    def test_generate_emotion_trend_declining(self):
        """Test trend detection for declining mood."""
        declining_data = [
            EmotionDataPoint("2025-12-20T10:00:00Z", "happy", 0.8, 0.7, None),
            EmotionDataPoint("2025-12-21T10:00:00Z", "happy", 0.7, 0.5, None),
            EmotionDataPoint("2025-12-22T10:00:00Z", "neutral", 0.5, 0.0, None),
            EmotionDataPoint("2025-12-23T10:00:00Z", "sad", 0.6, -0.3, None),
            EmotionDataPoint("2025-12-24T10:00:00Z", "sad", 0.7, -0.5, None),
            EmotionDataPoint("2025-12-25T10:00:00Z", "sad", 0.8, -0.7, None),
        ]
        
        trend = self.analytics.generate_emotion_trend(declining_data)
        
        self.assertEqual(trend.trend_direction, "declining")
    
    def test_generate_emotion_trend_stable(self):
        """Test trend detection for stable mood."""
        stable_data = [
            EmotionDataPoint("2025-12-20T10:00:00Z", "neutral", 0.5, 0.1, None),
            EmotionDataPoint("2025-12-21T10:00:00Z", "neutral", 0.5, 0.0, None),
            EmotionDataPoint("2025-12-22T10:00:00Z", "neutral", 0.5, 0.1, None),
            EmotionDataPoint("2025-12-23T10:00:00Z", "neutral", 0.5, -0.1, None),
            EmotionDataPoint("2025-12-24T10:00:00Z", "neutral", 0.5, 0.0, None),
            EmotionDataPoint("2025-12-25T10:00:00Z", "neutral", 0.5, 0.1, None),
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
        """Test trigger analysis."""
        data_with_triggers = [
            EmotionDataPoint("2025-12-20T10:00:00Z", "anxious", 0.7, -0.5, "work deadline"),
            EmotionDataPoint("2025-12-21T10:00:00Z", "stressed", 0.8, -0.6, "work meeting"),
            EmotionDataPoint("2025-12-22T10:00:00Z", "happy", 0.8, 0.7, "family dinner"),
            EmotionDataPoint("2025-12-23T10:00:00Z", "sad", 0.6, -0.4, "relationships conflict"),
            EmotionDataPoint("2025-12-24T10:00:00Z", "grateful", 0.9, 0.8, "family time"),
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
        
        # Mock emotion analysis
        mock_analyze.return_value = [
            EmotionDataPoint("2025-12-20T10:00:00Z", "happy", 0.8, 0.6, None),
            EmotionDataPoint("2025-12-21T10:00:00Z", "tired", 0.7, -0.3, "work"),
        ]
        
        # Mock word cloud response
        mock_call_gemini.return_value = json.dumps({
            "words": {"心情": 2, "工作": 1},
            "emotions": ["happy", "tired"]
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
    """Tests for emotion score mappings."""
    
    def test_emotion_scores_exist(self):
        """Test that emotion scores are defined."""
        self.assertIn('happy', EmotionAnalytics.EMOTION_SCORES)
        self.assertIn('sad', EmotionAnalytics.EMOTION_SCORES)
        self.assertIn('neutral', EmotionAnalytics.EMOTION_SCORES)
        self.assertIn('anxious', EmotionAnalytics.EMOTION_SCORES)
    
    def test_positive_emotion_scores(self):
        """Test that positive emotions have positive scores."""
        positive_emotions = ['happy', 'joyful', 'excited', 'grateful', 'hopeful']
        for emotion in positive_emotions:
            self.assertGreater(
                EmotionAnalytics.EMOTION_SCORES.get(emotion, 0), 
                0, 
                f"{emotion} should have positive score"
            )
    
    def test_negative_emotion_scores(self):
        """Test that negative emotions have negative scores."""
        negative_emotions = ['sad', 'anxious', 'angry', 'frustrated', 'depressed']
        for emotion in negative_emotions:
            self.assertLess(
                EmotionAnalytics.EMOTION_SCORES.get(emotion, 0), 
                0, 
                f"{emotion} should have negative score"
            )
    
    def test_neutral_emotion_score(self):
        """Test neutral emotion score."""
        self.assertEqual(EmotionAnalytics.EMOTION_SCORES['neutral'], 0.0)


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
            emotion_distribution={"happy": 60.0, "sad": 40.0},
            emotion_trend=EmotionTrend("daily", [], "stable", 0.2),
            word_cloud=EmotionWordCloud({"test": 5}, ["happy"], 5),
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
