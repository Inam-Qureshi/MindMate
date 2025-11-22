"""
Centralized logging configuration for MindMate application.
Provides consistent, professional logging across all modules.
"""

import logging
import sys
from typing import Optional
from pathlib import Path


class ColoredFormatter(logging.Formatter):
    """Custom formatter with color support for console output."""
    
    # ANSI color codes
    COLORS = {
        'DEBUG': '\033[36m',      # Cyan
        'INFO': '\033[32m',       # Green
        'WARNING': '\033[33m',    # Yellow
        'ERROR': '\033[31m',      # Red
        'CRITICAL': '\033[35m',   # Magenta
    }
    RESET = '\033[0m'
    
    def __init__(self, fmt: str, use_color: bool = True):
        super().__init__(fmt)
        self.use_color = use_color and sys.stdout.isatty()
    
    def format(self, record: logging.LogRecord) -> str:
        # Save original values
        original_levelname = record.levelname
        original_name = record.name
        
        # Apply color to levelname
        if self.use_color and record.levelname in self.COLORS:
            record.levelname = f"{self.COLORS[record.levelname]}{record.levelname}{self.RESET}"
        
        # Shorten logger names for readability
        name_parts = record.name.split('.')
        if len(name_parts) > 3:
            # Keep only last 3 parts: app.agents.assessment.moderator -> assessment.moderator
            record.name = '.'.join(name_parts[-3:])
        
        # Format the record
        formatted = super().format(record)
        
        # Restore original values (important for handlers that might reuse the record)
        record.levelname = original_levelname
        record.name = original_name
        
        return formatted


def setup_logging(
    level: str = "INFO",
    format_string: Optional[str] = None,
    use_color: bool = True,
    log_file: Optional[Path] = None
) -> None:
    """
    Configure application-wide logging.
    
    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        format_string: Custom format string. Default: concise format
        use_color: Enable colored output for console
        log_file: Optional file path for file logging
    """
    # Default concise format
    if format_string is None:
        format_string = "%(asctime)s | %(levelname)-8s | %(name)-25s | %(message)s"
    
    # Convert string level to logging constant
    log_level = getattr(logging, level.upper(), logging.INFO)
    
    # Root logger configuration
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Remove existing handlers to avoid duplicates
    root_logger.handlers.clear()
    
    # Console handler with color support
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_formatter = ColoredFormatter(format_string, use_color=use_color)
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)
    
    # Optional file handler
    if log_file:
        log_file.parent.mkdir(parents=True, exist_ok=True)
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logging.DEBUG)  # Always log everything to file
        file_formatter = logging.Formatter(
            "%(asctime)s | %(levelname)-8s | %(name)-30s | %(filename)s:%(lineno)d | %(message)s"
        )
        file_handler.setFormatter(file_formatter)
        root_logger.addHandler(file_handler)
    
    # Set specific logger levels
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("fastapi").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    
    # Suppress noisy third-party loggers
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with shortened name.
    
    Args:
        name: Logger name (typically __name__)
    
    Returns:
        Configured logger instance
    """
    # Shorten logger names for better readability
    parts = name.split('.')
    if len(parts) > 3:
        # Keep last 3 parts for readability
        short_name = '.'.join(parts[-3:])
    else:
        short_name = name
    
    return logging.getLogger(short_name)

