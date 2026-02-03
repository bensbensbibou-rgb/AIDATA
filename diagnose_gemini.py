#!/usr/bin/env python3
"""
Professional diagnostic script to identify available Gemini models
"""
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

# Configure API
api_key = os.getenv("GEMINI_API_KEY", "").strip()
if not api_key:
    print("ERROR: No GEMINI_API_KEY found")
    exit(1)

genai.configure(api_key=api_key)

print("=" * 80)
print("GEMINI API DIAGNOSTIC REPORT")
print("=" * 80)
print()

# List all available models
print("Available Models:")
print("-" * 80)

try:
    models = genai.list_models()
    for model in models:
        # Check if model supports generateContent
        if 'generateContent' in model.supported_generation_methods:
            print(f"✓ {model.name}")
            print(f"  Display Name: {model.display_name}")
            print(f"  Description: {model.description}")
            print(f"  Methods: {', '.join(model.supported_generation_methods)}")
            print()
except Exception as e:
    print(f"ERROR listing models: {e}")
    import traceback
    traceback.print_exc()

print("=" * 80)
print("DIAGNOSTIC COMPLETE")
print("=" * 80)
