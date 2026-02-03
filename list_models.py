#!/usr/bin/env python3
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY", "").strip()
genai.configure(api_key=api_key)

print("AVAILABLE MODELS WITH generateContent SUPPORT:")
print("=" * 60)

for model in genai.list_models():
    if 'generateContent' in model.supported_generation_methods:
        print(model.name)

print("=" * 60)
