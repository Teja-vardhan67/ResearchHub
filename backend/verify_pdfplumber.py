import sys
try:
    import pdfplumber
    print("SUCCESS: pdfplumber imported successfully")
    print(f"pdfplumber version: {pdfplumber.__version__}")
except ImportError as e:
    print(f"FAILURE: {e}")
except Exception as e:
    print(f"ERROR: {e}")
