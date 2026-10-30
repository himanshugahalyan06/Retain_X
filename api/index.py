"""
Vercel Serverless Function entrypoint for RetainX FastAPI application.
"""
import sys
import os

# Ensure repo root and src/ directory are on sys.path so imports like
# `from churnguard...` and `from api...` resolve correctly in Vercel runtime.
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
src_dir = os.path.join(root_dir, "src")

if root_dir not in sys.path:
    sys.path.insert(0, root_dir)
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)

from api.main import app

# Export handler for Vercel Serverless Function compatibility
handler = app

