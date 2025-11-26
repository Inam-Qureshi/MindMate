"""
General LLM Wrapper for Assessment Modules
==========================================

A clean, robust LLM wrapper that provides:
- Consistent API interface across all modules
- Automatic retry logic and circuit breaker
- Response parsing and cleaning
- Error handling and fallbacks
- Rate limiting and caching
- Environment-based configuration

Usage:
    llm = LLMWrapper()
    response = llm.generate_response(prompt, system_prompt)
    data = llm.extract_structured_data(text, schema)
"""

import os
import time
import json
import logging
import hashlib
import requests
from typing import Dict, Any, Optional, List, Union
from dataclasses import dataclass
from datetime import datetime
import re
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
try:
    env_path = Path(__file__).parent.parent.parent.parent.parent.parent / ".env"
    load_dotenv(env_path)
except ImportError:
    # dotenv not available, try to load .env manually
    try:
        env_path = Path(__file__).parent.parent.parent.parent.parent.parent / ".env"
        if env_path.exists():
            with open(env_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        # Remove quotes if present
                        value = value.strip('\"\'')
                        os.environ[key] = value
            logger.info("Loaded environment variables from .env file manually")
    except Exception as e:
        logger.warning(f"Failed to load .env file manually: {e}")
        pass
except Exception:
    # path issues, try manual loading
    try:
        env_path = Path(__file__).parent.parent.parent.parent.parent.parent / ".env"
        if env_path.exists():
            with open(env_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        # Remove quotes if present
                        value = value.strip('\"\'')
                        os.environ[key] = value
            logger.info("Loaded environment variables from .env file manually")
    except Exception as e:
        logger.warning(f"Failed to load .env file manually: {e}")
        pass

logger = logging.getLogger(__name__)


@dataclass
class LLMConfig:
    """Configuration for LLM wrapper"""
    model: str = "llama-3.1-8b-instant"
    api_key: str = ""
    base_url: str = "https://api.groq.com"  # Base URL without /openai/v1 path
    max_tokens: int = 800
    temperature: float = 0.7
    timeout: int = 30  # Reduced from 120 to 30 seconds
    max_retries: int = 2  # Reduced from 3 to 2
    retry_delay: float = 0.5  # Reduced from 1.0 to 0.5
    enable_cache: bool = True
    cache_ttl: int = 1800  # 30 minutes
    rate_limit_per_minute: int = 20
    provider: str = "groq"  # groq, openrouter, or fallback
    fallback_providers: List[str] = None  # Chain of fallback providers

    def __post_init__(self):
        if self.fallback_providers is None:
            self.fallback_providers = ["groq", "openrouter", "rule_based"]


@dataclass
class LLMResponse:
    """Structured response from LLM"""
    content: str
    success: bool
    error: Optional[str] = None
    tokens_used: Optional[int] = None
    response_time: float = 0.0
    cached: bool = False


class ResponseCache:
    """Simple in-memory response cache with TTL"""
    
    def __init__(self, max_size: int = 100, ttl_seconds: int = 1800):
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.access_times: Dict[str, float] = {}
    
    def _generate_key(self, prompt: str, system_prompt: str, **kwargs) -> str:
        """Generate cache key from prompt and parameters"""
        key_data = f"{prompt}:{system_prompt}:{json.dumps(kwargs, sort_keys=True)}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[str]:
        """Get cached response if valid"""
        if key not in self.cache:
            return None
        
        if time.time() - self.access_times[key] > self.ttl_seconds:
            del self.cache[key]
            del self.access_times[key]
            return None
        
        return self.cache[key]["content"]
    
    def set(self, key: str, content: str, metadata: Dict[str, Any] = None):
        """Cache response with metadata"""
        if len(self.cache) >= self.max_size:
            # Remove oldest entry
            oldest_key = min(self.access_times, key=self.access_times.get)
            del self.cache[oldest_key]
            del self.access_times[oldest_key]
        
        self.cache[key] = {
            "content": content,
            "metadata": metadata or {},
            "cached_at": time.time()
        }
        self.access_times[key] = time.time()


class CircuitBreaker:
    """Circuit breaker for API calls"""
    
    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    
    def call(self, func, *args, **kwargs):
        """Execute function with circuit breaker protection"""
        if self.state == "OPEN":
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = "HALF_OPEN"
            else:
                raise Exception("Circuit breaker is OPEN - API temporarily unavailable")
        
        try:
            result = func(*args, **kwargs)
            if self.state == "HALF_OPEN":
                self.state = "CLOSED"
                self.failure_count = 0
            return result
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = time.time()
            if self.failure_count >= self.failure_threshold:
                self.state = "OPEN"
            raise e


class RateLimiter:
    """Simple rate limiter"""
    
    def __init__(self, max_requests_per_minute: int = 20):
        self.max_requests = max_requests_per_minute
        self.requests = []
    
    def acquire(self):
        """Acquire rate limit slot"""
        now = time.time()
        # Remove requests older than 1 minute
        self.requests = [req_time for req_time in self.requests if now - req_time < 60]
        
        if len(self.requests) >= self.max_requests:
            # Wait until we can make a request
            sleep_time = 60 - (now - self.requests[0]) + 0.1
            if sleep_time > 0:
                time.sleep(sleep_time)
                self.requests = []
        
        self.requests.append(now)


class LLMWrapper:
    """
    General LLM wrapper providing clean, robust API access
    
    Features:
    - Automatic retry with exponential backoff
    - Circuit breaker for fault tolerance
    - Response caching for efficiency
    - Rate limiting to respect API limits
    - Clean response parsing
    - Comprehensive error handling
    """
    
    def __init__(self, config: Optional[LLMConfig] = None):
        """Initialize LLM wrapper with configuration"""
        self.config = config or self._load_config()
        self.cache = ResponseCache(ttl_seconds=self.config.cache_ttl) if self.config.enable_cache else None
        self.circuit_breaker = CircuitBreaker()
        self.rate_limiter = RateLimiter(self.config.rate_limit_per_minute)
        
        # Metrics
        self.request_count = 0
        self.success_count = 0
        self.cache_hits = 0
        self.total_response_time = 0.0
        
        # Reduce log verbosity for cleaner output
        if not any([os.getenv("GROQ_API_KEY"), os.getenv("OPENROUTER_API_KEY")]):
            logger.info("No LLM API keys found - using rule-based analysis only")
        else:
            logger.debug(f"LLMWrapper initialized | Primary: {self.config.provider} | Fallbacks: {self.config.fallback_providers}")

    def _get_provider_config(self, provider: str) -> LLMConfig:
        """Get configuration for a specific provider"""
        if provider == "groq":
            groq_key = os.getenv("GROQ_API_KEY", "")
            return LLMConfig(
                model=os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
                api_key=groq_key,
                base_url=os.getenv("GROQ_BASE_URL", "https://api.groq.com"),
                max_tokens=int(os.getenv("GROQ_MAX_TOKENS", "800")),
                temperature=float(os.getenv("GROQ_TEMPERATURE", "0.7")),
                timeout=int(os.getenv("GROQ_TIMEOUT", "30")),
                max_retries=int(os.getenv("GROQ_MAX_RETRIES", "2")),
                enable_cache=self.config.enable_cache,
                rate_limit_per_minute=int(os.getenv("GROQ_RATE_LIMIT", "20")),
                provider="groq"
            )
        elif provider == "openrouter":
            openrouter_key = os.getenv("OPENROUTER_API_KEY", "")
            return LLMConfig(
                model=os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-pro-exp-03-25:free"),
                api_key=openrouter_key,
                base_url=os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
                max_tokens=int(os.getenv("OPENROUTER_MAX_TOKENS", "800")),
                temperature=float(os.getenv("OPENROUTER_TEMPERATURE", "0.7")),
                timeout=int(os.getenv("OPENROUTER_TIMEOUT", "30")),
                max_retries=int(os.getenv("OPENROUTER_MAX_RETRIES", "2")),
                enable_cache=self.config.enable_cache,
                rate_limit_per_minute=int(os.getenv("OPENROUTER_RATE_LIMIT", "20")),
                provider="openrouter"
            )
        else:
            # Rule-based fallback
            return LLMConfig(
                model="rule_based_fallback",
                api_key="",
                base_url="",
                max_tokens=self.config.max_tokens,
                temperature=self.config.temperature,
                timeout=self.config.timeout,
                max_retries=0,
                enable_cache=False,
                rate_limit_per_minute=10,
                provider="rule_based"
            )

    def _generate_with_provider(self, provider: str, messages: List[Dict[str, str]], **kwargs) -> LLMResponse:
        """Generate response using a specific provider"""
        provider_config = self._get_provider_config(provider)
        start_time = time.time()

        if provider == "rule_based":
            # Rule-based fallback - no API call needed
            return self._generate_rule_based_response(messages, **kwargs)

        # Temporarily switch config for this call
        original_config = self.config
        self.config = provider_config

        try:
            # Make API call with retries
            for attempt in range(provider_config.max_retries):
                try:
                    # Rate limiting
                    self.rate_limiter.acquire()

                    # Circuit breaker protection
                    result = self.circuit_breaker.call(
                        self._make_api_call,
                        messages,
                        **kwargs
                    )

                    # Extract content
                    content = result["choices"][0]["message"]["content"]
                    content = self._clean_response(content)

                    response_time = time.time() - start_time
                    return LLMResponse(
                        content=content,
                        success=True,
                        tokens_used=result.get("usage", {}).get("total_tokens"),
                        response_time=response_time
                    )

                except Exception as e:
                    logger.warning(f"{provider} API call attempt {attempt + 1} failed: {e}")
                    if attempt == provider_config.max_retries - 1:
                        raise e

                # Short backoff for faster failure
                time.sleep(provider_config.retry_delay * (attempt + 1))

        finally:
            # Restore original config
            self.config = original_config

        # This shouldn't be reached, but just in case
        raise Exception(f"All {provider} attempts failed")

    def _generate_rule_based_response(self, messages: List[Dict[str, str]], **kwargs) -> LLMResponse:
        """Generate rule-based response when LLM providers are unavailable"""
        start_time = time.time()

        # Extract the user message
        user_message = ""
        system_prompt = ""

        for msg in messages:
            if msg["role"] == "system":
                system_prompt = msg["content"]
            elif msg["role"] == "user":
                user_message = msg["content"]

        # Simple rule-based diagnostic analysis
        response_content = self._rule_based_diagnostic_analysis(user_message, system_prompt)

        return LLMResponse(
            content=response_content,
            success=True,
            response_time=time.time() - start_time
        )

    def _rule_based_diagnostic_analysis(self, user_message: str, system_prompt: str) -> str:
        """Rule-based diagnostic analysis as final fallback - returns JSON format expected by DA module"""
        # This is a rule-based system that returns JSON in the format expected by the DA module

        lower_message = user_message.lower()
        lower_system = system_prompt.lower()

        # Check for depression indicators
        depression_keywords = [
            "sad", "depressed", "hopeless", "worthless", "suicidal", "tired", "fatigue",
            "no energy", "no motivation", "can't sleep", "oversleep", "appetite change",
            "weight loss", "concentration", "decision making"
        ]

        # Check for anxiety indicators
        anxiety_keywords = [
            "anxious", "worried", "panic", "fear", "nervous", "restless", "tense",
            "racing heart", "sweating", "trembling", "avoid", "phobia"
        ]

        # Check for trauma indicators
        trauma_keywords = [
            "trauma", "ptsd", "flashback", "nightmare", "trigger", "avoidance",
            "hypervigilant", "startle", "emotional numb"
        ]

        depression_score = sum(1 for keyword in depression_keywords if keyword in lower_message)
        anxiety_score = sum(1 for keyword in anxiety_keywords if keyword in lower_message)
        trauma_score = sum(1 for keyword in trauma_keywords if keyword in lower_message)

        # Determine primary concern and create structured diagnosis
        scores = {
            "depressive symptoms": depression_score,
            "anxiety symptoms": anxiety_score,
            "trauma-related symptoms": trauma_score
        }

        max_score = max(scores.values())

        if max_score >= 2:
            primary_concern = max(scores, key=scores.get)
            severity = "moderate" if max_score >= 3 else "mild"
            confidence = min(0.7, max_score / 5.0)  # Scale confidence based on symptom count

            # Create diagnosis based on primary concern
            if "depressive" in primary_concern:
                diagnosis_name = "Depressive Disorder"
                dsm5_code = "296.3"
                criteria = ["Depressed mood", "Anhedonia", "Fatigue", "Concentration issues"]
            elif "anxiety" in primary_concern:
                diagnosis_name = "Anxiety Disorder"
                dsm5_code = "300.02"
                criteria = ["Excessive anxiety", "Worry", "Restlessness", "Physical symptoms"]
            elif "trauma" in primary_concern:
                diagnosis_name = "Trauma-Related Disorder"
                dsm5_code = "309.81"
                criteria = ["Trauma exposure", "Intrusion symptoms", "Avoidance", "Arousal changes"]
            else:
                diagnosis_name = "Mental Health Concerns"
                dsm5_code = "To be determined"
                criteria = ["Reported symptoms present"]

            diagnosis_result = {
                "primary_diagnosis": {
                    "name": diagnosis_name,
                    "severity": severity,
                    "dsm5_code": dsm5_code,
                    "criteria_met": criteria[:max_score],  # Only include criteria we detected
                    "confidence": confidence
                },
                "differential_diagnoses": [
                    {"name": "Anxiety Disorder", "reason": "Anxiety symptoms present", "confidence": anxiety_score / max(1, max_score)},
                    {"name": "Depressive Disorder", "reason": "Mood symptoms present", "confidence": depression_score / max(1, max_score)},
                    {"name": "Adjustment Disorder", "reason": "Recent stressors may be contributing", "confidence": 0.3}
                ],
                "confidence": confidence,
                "reasoning": f"Rule-based analysis identified {primary_concern} based on {max_score} symptom indicators. This represents a preliminary assessment using pattern recognition and should be confirmed by a qualified mental health professional.",
                "matched_criteria": criteria[:max_score],
                "diagnostic_notes": f"Analysis performed using rule-based pattern matching. {max_score} symptoms detected from assessment data. Professional evaluation recommended for definitive diagnosis."
            }

        else:
            # No clear diagnosis pattern detected
            diagnosis_result = {
                "primary_diagnosis": {
                    "name": "Mental Health Assessment Completed",
                    "severity": "preliminary",
                    "dsm5_code": "Pending",
                    "criteria_met": ["Assessment completed"],
                    "confidence": 0.2
                },
                "differential_diagnoses": [
                    {"name": "No Clear Diagnosis", "reason": "Insufficient symptoms for specific diagnosis", "confidence": 0.5},
                    {"name": "Further Evaluation Needed", "reason": "Additional assessment may be required", "confidence": 0.3}
                ],
                "confidence": 0.2,
                "reasoning": "Rule-based analysis did not identify sufficient symptom patterns for a specific diagnosis. This may indicate mild symptoms, early-stage concerns, or the need for more detailed assessment.",
                "matched_criteria": ["Assessment completed"],
                "diagnostic_notes": "Rule-based analysis found limited symptom indicators. Professional evaluation recommended to determine if mental health concerns are present."
            }

        # Return as JSON string
        return json.dumps(diagnosis_result, indent=2)

    def _load_config(self) -> LLMConfig:
        """Load configuration from environment variables with fallback chain"""
        # Determine primary provider based on available API keys
        groq_key = os.getenv("GROQ_API_KEY", "")
        openrouter_key = os.getenv("OPENROUTER_API_KEY", "")

        # Default fallback chain: Groq -> OpenRouter -> Rule-based
        fallback_providers = ["groq", "openrouter", "rule_based"]

        # Determine primary provider
        if groq_key:
            primary_provider = "groq"
            default_model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
            default_base_url = os.getenv("GROQ_BASE_URL", "https://api.groq.com")
            rate_limit = int(os.getenv("GROQ_RATE_LIMIT", "20"))
            api_key = groq_key
        elif openrouter_key:
            primary_provider = "openrouter"
            default_model = os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-pro-exp-03-25:free")
            default_base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
            rate_limit = int(os.getenv("OPENROUTER_RATE_LIMIT", "20"))
            api_key = openrouter_key
        else:
            # No API keys available, fall back to rule-based
            primary_provider = "rule_based"
            default_model = "rule_based_fallback"
            default_base_url = ""
            rate_limit = 10
            api_key = ""

        # Normalize base URL - remove any existing /openai/v1 or /v1 paths
        # and ensure it's just the base domain
        default_base_url = default_base_url.rstrip("/")

        # Remove any existing API paths that might cause duplication
        if "/openai/v1" in default_base_url:
            default_base_url = default_base_url.split("/openai/v1")[0].rstrip("/")
        elif default_base_url.endswith("/v1"):
            default_base_url = default_base_url[:-3].rstrip("/")

        # Ensure it's just the base domain (e.g., https://api.groq.com or https://openrouter.ai/api/v1)
        default_base_url = default_base_url.rstrip("/")

        return LLMConfig(
            model=os.getenv("LLM_MODEL", default_model),
            api_key=api_key,
            base_url=default_base_url,
            max_tokens=int(os.getenv("LLM_MAX_TOKENS", "800")),
            temperature=float(os.getenv("LLM_TEMPERATURE", "0.7")),
            timeout=int(os.getenv("LLM_TIMEOUT", "30")),
            max_retries=int(os.getenv("LLM_MAX_RETRIES", "2")),
            enable_cache=os.getenv("LLM_ENABLE_CACHE", "true").lower() == "true",
            rate_limit_per_minute=rate_limit,
            provider=primary_provider,
            fallback_providers=fallback_providers
        )
    
    def _make_api_call(self, messages: List[Dict[str, str]], **kwargs) -> Dict[str, Any]:
        """Make API call to LLM service with improved error handling"""
        if not self.config.api_key:
            raise ValueError("API key not configured - set OPENROUTER_API_KEY or GROQ_API_KEY environment variable")
        
        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.config.model,
            "messages": messages,
            "max_tokens": kwargs.get("max_tokens", self.config.max_tokens),
            "temperature": kwargs.get("temperature", self.config.temperature),
            **{k: v for k, v in kwargs.items() if k not in ["max_tokens", "temperature"]}
        }
        
        try:
            # Construct the full endpoint URL
            # Groq API endpoint: https://api.groq.com/openai/v1/chat/completions
            # Ensure base_url is clean (no trailing slashes, no existing paths)
            base_url = self.config.base_url.rstrip("/")
            
            # Remove any existing /openai/v1 or /v1 from base_url to prevent duplication
            if "/openai/v1" in base_url:
                base_url = base_url.split("/openai/v1")[0].rstrip("/")
            elif base_url.endswith("/v1"):
                base_url = base_url[:-3].rstrip("/")
            
            # Construct the endpoint path
            endpoint = "/openai/v1/chat/completions"
            full_url = f"{base_url}{endpoint}"
            
            logger.debug(f"Making API call to: {full_url} (base_url: {self.config.base_url})")
            
            response = requests.post(
                full_url,
                headers=headers,
                json=payload,
                timeout=self.config.timeout
            )
            
            if response.status_code == 401:
                service_name = "OpenRouter" if "openrouter.ai" in self.config.base_url else "Groq"
                service_url = "https://openrouter.ai/keys" if "openrouter.ai" in self.config.base_url else "https://console.groq.com/keys"
                raise ValueError(f"Invalid API key - check {service_name}_API_KEY environment variable at {service_url}")
            elif response.status_code == 429:
                raise Exception("Rate limit exceeded - too many requests")
            elif response.status_code == 500:
                raise Exception("Server error - Groq API is experiencing issues")
            elif response.status_code != 200:
                raise Exception(f"API error {response.status_code}: {response.text}")
            
            return response.json()
            
        except requests.exceptions.Timeout:
            raise Exception(f"Request timeout after {self.config.timeout} seconds")
        except requests.exceptions.ConnectionError:
            raise Exception("Network connection error - check internet connection")
        except requests.exceptions.RequestException as e:
            raise Exception(f"Request failed: {str(e)}")
    
    def _clean_response(self, content: str) -> str:
        """Clean and normalize LLM response"""
        if not content:
            return ""
        
        # Remove various thinking/reasoning tags
        thinking_patterns = [
            r'<think>.*?</think>',
            r'<thinking>.*?</thinking>',
            r'<reasoning>.*?</reasoning>',
            r'<thought>.*?</thought>',
            r'<analysis>.*?</analysis>',
            r'<reflection>.*?</reflection>'
        ]
        
        for pattern in thinking_patterns:
            content = re.sub(pattern, '', content, flags=re.DOTALL | re.IGNORECASE)
        
        # Additional cleaning for incomplete thinking tags
        content = re.sub(r'<think>.*$', '', content, flags=re.DOTALL | re.IGNORECASE)
        content = re.sub(r'^.*</think>', '', content, flags=re.DOTALL | re.IGNORECASE)
        
        # Remove code block markers if they exist
        if content.startswith("```") and content.endswith("```"):
            lines = content.split('\n')
            if len(lines) > 2:
                content = '\n'.join(lines[1:-1])
        
        # Remove any remaining non-JSON content before the first {
        if '{' in content:
            first_brace = content.find('{')
            content = content[first_brace:]
        
        # Remove any content after the last }
        if '}' in content:
            last_brace = content.rfind('}')
            content = content[:last_brace + 1]
        
        # Clean up whitespace
        content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
        content = content.strip()
        
        return content
    
    def generate_response(
        self,
        prompt: str,
        system_prompt: str = "",
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        use_cache: bool = True
    ) -> LLMResponse:
        """
        Generate response from LLM with full error handling
        
        Args:
            prompt: User prompt
            system_prompt: System instructions
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            use_cache: Whether to use cached responses
        
        Returns:
            LLMResponse with content and metadata
        """
        start_time = time.time()
        self.request_count += 1
        
        # Check cache first
        if use_cache and self.cache:
            cache_key = self.cache._generate_key(
                prompt, system_prompt,
                max_tokens=max_tokens or self.config.max_tokens,
                temperature=temperature or self.config.temperature
            )
            cached_response = self.cache.get(cache_key)
            if cached_response:
                self.cache_hits += 1
                return LLMResponse(
                    content=cached_response,
                    success=True,
                    response_time=time.time() - start_time,
                    cached=True
                )
        
        # Prepare messages
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        
        # Try providers in fallback chain: Groq → OpenRouter → Rule-based
        for provider in self.config.fallback_providers:
            logger.info(f"Attempting to generate response with provider: {provider}")
            try:
                response = self._generate_with_provider(provider, messages, **{
                    "max_tokens": max_tokens,
                    "temperature": temperature
                })

                # Cache successful response (skip rule-based as it's not cacheable)
                if response.success and use_cache and self.cache and provider != "rule_based":
                    cache_key = self.cache._generate_key(
                        prompt, system_prompt,
                        max_tokens=max_tokens or self.config.max_tokens,
                        temperature=temperature or self.config.temperature
                    )
                    self.cache.set(cache_key, response.content, {
                        "tokens_used": response.tokens_used,
                        "model": self.config.model,
                        "provider": provider
                    })

                self.success_count += 1
                response.response_time = time.time() - start_time
                logger.info(f"Successfully generated response using {provider}")
                return response

            except Exception as e:
                logger.warning(f"Provider {provider} failed: {e}")
                continue

        # All providers failed
        logger.error("All LLM providers failed, returning error response")
        return LLMResponse(
            content="",
            success=False,
            error="All LLM providers (Groq, OpenRouter, Rule-based) failed",
            response_time=time.time() - start_time
        )
    
    def extract_structured_data(
        self,
        text: str,
        schema: Dict[str, Any],
        field_name: str = "data",
        temperature: float = 0.1
    ) -> Dict[str, Any]:
        """
        Extract structured data from text using LLM
        
        Args:
            text: Input text to extract from
            schema: Expected data schema
            field_name: Name of the field being extracted
            temperature: Sampling temperature (lower for more consistent extraction)
        
        Returns:
            Extracted data as dictionary
        """
        system_prompt = f"""You are a data extraction specialist. Extract {field_name} from the given text and return it as valid JSON matching the provided schema.

Rules:
- Return ONLY valid JSON
- Use null for missing values
- Be precise and conservative
- Follow the schema exactly"""

        prompt = f"""
TEXT TO EXTRACT FROM:
{text}

EXPECTED SCHEMA:
{json.dumps(schema, indent=2)}

Extract the {field_name} and return ONLY the JSON object:"""

        response = self.generate_response(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=temperature,
            max_tokens=500
        )
        
        if not response.success:
            logger.error(f"Failed to extract {field_name}: {response.error}")
            return {}
        
        try:
            # Clean and parse JSON
            content = response.content.strip()
            
            # Remove code block markers
            if content.startswith("```json"):
                content = content[7:]
            if content.endswith("```"):
                content = content[:-3]
            
            # Find JSON object
            if not content.startswith("{"):
                start_idx = content.find("{")
                if start_idx != -1:
                    content = content[start_idx:]
            
            if not content.endswith("}"):
                end_idx = content.rfind("}")
                if end_idx != -1:
                    content = content[:end_idx + 1]
            
            return json.loads(content)
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing failed for {field_name}: {e}")
            logger.error(f"Raw response: {response.content[:200]}")
            return {}
    
    def extract_simple_value(
        self,
        text: str,
        field_name: str,
        expected_type: str = "string",
        options: Optional[List[str]] = None,
        temperature: float = 0.1
    ) -> Any:
        """
        Extract a simple value from text
        
        Args:
            text: Input text
            field_name: Name of field to extract
            expected_type: Type of value (string, number, boolean)
            options: Valid options for the field
            temperature: Sampling temperature
        
        Returns:
            Extracted value or None
        """
        schema = {"value": expected_type}
        if options:
            schema["valid_options"] = options
        
        result = self.extract_structured_data(text, schema, field_name, temperature)
        return result.get("value")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get LLM wrapper statistics"""
        return {
            "model": self.config.model,
            "request_count": self.request_count,
            "success_count": self.success_count,
            "success_rate": (self.success_count / self.request_count) if self.request_count > 0 else 0,
            "cache_hits": self.cache_hits,
            "cache_hit_rate": (self.cache_hits / self.request_count) if self.request_count > 0 else 0,
            "avg_response_time": (self.total_response_time / self.success_count) if self.success_count > 0 else 0,
            "circuit_breaker_state": self.circuit_breaker.state,
            "cache_enabled": self.cache is not None
        }
    
    def health_check(self) -> Dict[str, Any]:
        """Check if LLM is available and working"""
        try:
            # Quick test with minimal tokens
            response = self.generate_response(
                prompt="Hi",
                system_prompt="Respond with just 'OK'",
                max_tokens=5,
                temperature=0.0,
                use_cache=False
            )
            
            return {
                "available": response.success,
                "response_time": response.response_time,
                "error": response.error if not response.success else None,
                "api_key_configured": bool(self.config.api_key)
            }
        except Exception as e:
            return {
                "available": False,
                "response_time": 0,
                "error": str(e),
                "api_key_configured": bool(self.config.api_key)
            }


# Global instance for easy access
_llm_instance: Optional[LLMWrapper] = None


def get_llm() -> LLMWrapper:
    """Get global LLM instance (singleton)"""
    global _llm_instance
    if _llm_instance is None:
        _llm_instance = LLMWrapper()
    return _llm_instance


def reset_llm():
    """Reset global LLM instance (useful for testing)"""
    global _llm_instance
    _llm_instance = None





