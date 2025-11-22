# app/main.py
"""MindMate Backend API - Simplified & Clean"""
import logging
from pathlib import Path
from datetime import datetime
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings
from app.core.logging_config import setup_logging, get_logger
from app.db.session import initialize_database, check_db_health, check_redis_health, get_db

# Setup beautiful logging
setup_logging(
    level="DEBUG" if settings.DEBUG else "INFO",
    use_color=True
)
logger = get_logger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    description="MindMate Mental Health Platform API",
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    debug=settings.DEBUG,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list + [
        "http://127.0.0.1:8000", "http://localhost:8000",
        "http://127.0.0.1:3000", "http://localhost:3000",
        "http://127.0.0.1:5173", "http://localhost:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Session Middleware
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
)

# Initialize Database
try:
    logger.info("🔌 Initializing database connection...")
    initialize_database()
    logger.info("✅ Database initialized successfully")
except Exception as e:
    logger.error(f"❌ Database initialization failed: {e}")
    logger.warning("⚠️  Application may not function properly without database")

# Include API routes
from app.api.v1.router import router as api_router, load_all_routers

logger.info("📦 Loading API routers...")
try:
    load_all_routers()
    app.include_router(api_router, prefix="/api")
    logger.info("✅ API routers loaded")
    
    # Verify assessment router is loaded
    assessment_routes = [r for r in api_router.routes if hasattr(r, 'path') and 'assessment' in str(r.path)]
    logger.info(f"📊 Assessment routes found: {len(assessment_routes)}")
    if assessment_routes:
        for route in assessment_routes[:5]:  # Log first 5 routes
            methods = getattr(route, 'methods', set())
            path = getattr(route, 'path', 'unknown')
            logger.info(f"   {', '.join(methods):15} {path}")
except Exception as e:
    logger.error(f"❌ Failed to load API routers: {e}", exc_info=True)
    raise

# ============================================================================
# HEALTH CHECK ENDPOINTS
# ============================================================================

@app.get("/api/health", tags=["Health"])
async def health_check():
    """Comprehensive health check"""
    try:
        db_status = check_db_health()
        redis_status = check_redis_health()
        
        health_data = {
            "status": "healthy" if db_status else "degraded",
            "timestamp": datetime.now().isoformat(),
            "version": settings.APP_VERSION,
            "database": "✅ Connected" if db_status else "❌ Disconnected",
            "redis": "✅ Connected" if redis_status else "⚠️  Optional (not required)",
        }
        
        return health_data
    except Exception as e:
        logger.error(f"Health check error: {e}")
        raise HTTPException(status_code=500, detail="Health check failed")

# ============================================================================
# FRONTEND SERVING
# ============================================================================

def setup_frontend():
    """Setup static file serving for frontend"""
    possible_paths = [
        Path(__file__).parent.parent / "frontend" / "dist",
        Path(__file__).parent.parent.parent / "frontend" / "dist",
        Path(__file__).parent.parent / "dist",
    ]
    
    frontend_path = None
    for path in possible_paths:
        if path.exists() and path.is_dir():
            frontend_path = str(path)
            logger.info(f"🎨 Frontend found: {frontend_path}")
            break
    
    if frontend_path:
        # Serve static files
        app.mount("/static", StaticFiles(directory=frontend_path), name="static")
        
        assets_path = Path(frontend_path) / "assets"
        if assets_path.exists():
            app.mount("/assets", StaticFiles(directory=str(assets_path)), name="assets")
        
        @app.get("/", include_in_schema=False)
        async def serve_index():
            index_file = Path(frontend_path) / "index.html"
            if index_file.exists():
                return FileResponse(index_file)
            return JSONResponse({"message": "Frontend build found but index.html missing"})
        
        @app.get("/favicon.ico", include_in_schema=False)
        async def favicon():
            """Handle favicon requests"""
            favicon_path = Path(frontend_path) / "favicon.ico"
            if favicon_path.exists():
                return FileResponse(favicon_path)
            # Return 204 No Content if favicon doesn't exist (browsers will stop requesting)
            return JSONResponse(content={}, status_code=204)
        
        @app.get("/{path:path}", include_in_schema=False)
        async def catch_all(path: str):
            if path.startswith("api/"):
                raise HTTPException(status_code=404, detail="API endpoint not found")
            
            requested_file = Path(frontend_path) / path
            if requested_file.exists() and requested_file.is_file():
                return FileResponse(requested_file)
            
            index_file = Path(frontend_path) / "index.html"
            if index_file.exists():
                return FileResponse(index_file)
            raise HTTPException(status_code=404)
        
        logger.info("✅ Frontend serving configured")
    else:
        logger.warning("⚠️  Frontend build directory not found - API only mode")
        
        @app.get("/", include_in_schema=False)
        async def api_info():
            return {
                "message": f"{settings.APP_NAME} API",
                "version": settings.APP_VERSION,
                "docs": "/docs",
                "health": "/api/health",
                "note": "Frontend not found - build React app to serve frontend"
            }

setup_frontend()

# ============================================================================
# MEDIA FILES SERVING
# ============================================================================

def setup_media_serving():
    """Setup static file serving for uploaded media files"""
    possible_upload_paths = [
        Path(__file__).parent.parent / "uploads",
        Path(__file__).parent / "uploads",
        Path.cwd() / "uploads",
    ]
    
    upload_path = None
    for path in possible_upload_paths:
        if path.exists() and path.is_dir():
            upload_path = str(path)
            logger.info(f"📁 Media uploads directory found: {upload_path}")
            break
    
    if upload_path:
        # Serve media files at /media/ path
        app.mount("/media", StaticFiles(directory=upload_path), name="media")
        logger.info("✅ Media files serving configured at /media/")
    else:
        logger.warning("⚠️  Uploads directory not found - media files may not be accessible")

setup_media_serving()

# ============================================================================
# EXCEPTION HANDLERS
# ============================================================================

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors with detailed logging"""
    errors = exc.errors()
    error_details = []
    
    for error in errors:
        field = ".".join(str(loc) for loc in error["loc"])
        error_msg = error.get("msg", "Validation error")
        error_type = error.get("type", "unknown")
        
        # Extract input value safely (handle non-serializable types)
        input_value = error.get("input")
        if input_value is not None:
            # Convert to string if not JSON serializable
            try:
                import json
                json.dumps(input_value)
                serializable_input = input_value
            except (TypeError, ValueError):
                serializable_input = str(input_value)
        else:
            serializable_input = None
        
        # Extract error context safely (handle ValueError objects)
        ctx = error.get("ctx", {})
        serializable_ctx = {}
        for key, value in ctx.items():
            if isinstance(value, Exception):
                serializable_ctx[key] = str(value)
            else:
                try:
                    import json
                    json.dumps(value)
                    serializable_ctx[key] = value
                except (TypeError, ValueError):
                    serializable_ctx[key] = str(value)
        
        error_details.append({
            "field": field,
            "message": error_msg,
            "type": error_type,
            "input": serializable_input,
            "context": serializable_ctx if serializable_ctx else None
        })
    
    # Log detailed validation errors
    logger.warning(
        f"⚠️  Validation error on {request.url.path}: {len(errors)} field(s) failed validation"
    )
    for detail in error_details:
        logger.warning(f"  - {detail['field']}: {detail['message']} (type: {detail['type']})")
    
    # Log request body for debugging (first 500 chars)
    try:
        body = await request.body()
        if body:
            body_str = body.decode('utf-8')[:500]
            logger.debug(f"Request body preview: {body_str}")
    except Exception:
        pass
    
    # Create serializable error list for response
    serializable_errors = []
    for error in errors:
        serializable_error = {
            "type": error.get("type"),
            "loc": error.get("loc"),
            "msg": error.get("msg"),
            "input": str(error.get("input")) if error.get("input") is not None else None
        }
        # Handle context safely
        ctx = error.get("ctx", {})
        if ctx:
            serializable_ctx = {}
            for key, value in ctx.items():
                if isinstance(value, Exception):
                    serializable_ctx[key] = str(value)
                else:
                    serializable_ctx[key] = value
            serializable_error["ctx"] = serializable_ctx
        serializable_errors.append(serializable_error)
    
    return JSONResponse(
        status_code=422,
        content={
            "detail": serializable_errors,
            "message": "Validation failed",
            "errors": error_details,
            "status_code": 422
        }
    )

@app.exception_handler(HTTPException)
async def http_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    logger.error(f"❌ HTTP {exc.status_code} on {request.url.path}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "status_code": exc.status_code}
    )

@app.exception_handler(Exception)
async def general_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions"""
    logger.error(f"💥 Unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "status_code": 500}
    )

# ============================================================================
# STARTUP & SHUTDOWN
# ============================================================================

@app.on_event("startup")
async def startup():
    """Application startup"""
    db_status = check_db_health()
    redis_status = check_redis_health()
    
    logger.info("=" * 60)
    logger.info(f"🚀 {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info("=" * 60)
    logger.info(f"🌐 Server: http://{settings.HOST}:{settings.PORT}")
    logger.info(f"📚 Docs: http://{settings.HOST}:{settings.PORT}/docs")
    logger.info(f"💚 Health: http://{settings.HOST}:{settings.PORT}/api/health")
    logger.info(f"🗄️  Database: {'✅ Connected' if db_status else '❌ Disconnected'}")
    logger.info(f"💾 Redis: {'✅ Connected' if redis_status else '⚠️  Optional'}")
    logger.info(f"🐛 Debug Mode: {'ON' if settings.DEBUG else 'OFF'}")
    logger.info("=" * 60)

@app.on_event("shutdown")
async def shutdown():
    """Application shutdown"""
    logger.info(f"👋 Shutting down {settings.APP_NAME}")

# ============================================================================
# DEVELOPMENT SERVER
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    logger.info(f"🔧 Starting development server...")
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        log_level="info" if not settings.DEBUG else "debug",
        reload=settings.DEBUG,
    )