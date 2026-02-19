import passlib.handlers.bcrypt
import bcrypt

# Patching passlib to work with newer bcrypt
try:
    _bcrypt = bcrypt
    version = getattr(_bcrypt, "__version__", None) or getattr(_bcrypt, "__about__", None)
    if not hasattr(passlib.handlers.bcrypt._bcrypt, "__about__"):
        class MockAbout:
            __version__ = version or "4.0.1"
        passlib.handlers.bcrypt._bcrypt.__about__ = MockAbout()
    print("Passlib patched successfully for bcrypt compatibility.")
except Exception as e:
    print(f"Failed to patch passlib: {e}")
