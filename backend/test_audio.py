#!/usr/bin/env python3
"""快速测试 AudioService 初始化"""
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_path))

print("Testing AudioService initialization...")
print("=" * 60)

from app.modules.ai.core.audio import AudioService

print("\nCreating AudioService instance...")
service = AudioService()

print("\nResults:")
print(f"  OpenAI Client: {'✅ Available' if service.client else '❌ None'}")
print(f"  Gemini Model: {'✅ Available' if service.gemini_model else '❌ None'}")

if service.gemini_model:
    print(f"  Gemini Model Name: {service.gemini_model.model_name}")
else:
    print("\n⚠️  Gemini model not initialized!")
    print("  This will cause STT to fail!")
    
if not service.client and not service.gemini_model:
    print("\n❌ NO STT PROVIDER AVAILABLE - This is the problem!")
else:
    print("\n✅ At least one STT provider is available")

print("=" * 60)
