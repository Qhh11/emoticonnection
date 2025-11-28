import sys
import os
import unittest
import json
from unittest.mock import patch, MagicMock, mock_open

# Add the project root to sys.path to allow imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

# Import the module to be tested
from app.main import call_gemini_api, check_environment_variables


class TestGeminiAPI(unittest.TestCase):
    def setUp(self):
        self.mock_config = {
            "generation_config": {
                "temperature": 0.7,
                "top_p": 0.95,
                "top_k": 64,
                "max_output_tokens": 8192,
            },
            "safety_settings": [
                {
                    "category": "HARM_CATEGORY_HARASSMENT",
                    "threshold": "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        }

    @patch('app.main.genai.Client')
    @patch('builtins.open', new_callable=mock_open)
    @patch('json.load')
    @patch('app.main.GEMINI_API_KEY', 'fake_test_key')
    def test_call_gemini_api_success(self, mock_json_load, mock_file, mock_client_cls):
        mock_json_load.return_value = self.mock_config
        
        mock_client_instance = mock_client_cls.return_value
        mock_response = MagicMock()
        mock_response.text = "Generated content response"
        mock_client_instance.models.generate_content.return_value = mock_response
        
        result = call_gemini_api("Test prompt")
        
        self.assertEqual(result, "Generated content response")
        mock_client_cls.assert_called_once_with(api_key="fake_test_key")
        
        args, kwargs = mock_client_instance.models.generate_content.call_args
        self.assertEqual(kwargs['model'], "gemini-2.5-flash")
        self.assertEqual(kwargs['contents'], "Test prompt")

    @patch('app.main.GEMINI_API_KEY', None)
    def test_check_environment_variables_missing_key(self):
        with self.assertRaises(RuntimeError):
            check_environment_variables()

    @patch('app.main.genai.Client')
    @patch('builtins.open', new_callable=mock_open)
    @patch('json.load')
    @patch('app.main.GEMINI_API_KEY', 'fake_test_key')
    def test_call_gemini_api_failure(self, mock_json_load, mock_file, mock_client_cls):
        mock_json_load.return_value = self.mock_config
        
        mock_client_instance = mock_client_cls.return_value
        mock_client_instance.models.generate_content.side_effect = Exception("Google API Error")
        
        with self.assertRaises(Exception) as context:
            call_gemini_api("Test prompt")
            
        self.assertIn("Google API Error", str(context.exception))

if __name__ == '__main__':
    unittest.main()

