# app/api/v1/__init__.py

"""
API v1 package.
"""

from .router import router, load_all_routers

__all__ = ["router", "load_all_routers"]

