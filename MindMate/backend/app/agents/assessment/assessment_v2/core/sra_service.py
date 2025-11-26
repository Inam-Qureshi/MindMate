"""
Continuous SRA (Symptom Recognition and Analysis) Service
Processes all responses in real-time to extract symptoms and attributes
Works silently in the background throughout the entire workflow
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import re

from .symptom_database import get_symptom_database, SymptomDatabase
from ..base_types import SCIDQuestion, ProcessedResponse

logger = logging.getLogger(__name__)

# Try to import LLM client
try:
    from .llm.llm_client import LLMWrapper
except ImportError:
    try:
        from ..core.llm.llm_client import LLMWrapper
    except ImportError:
        try:
            from app.agents.assessment.assessment_v2.core.llm.llm_client import LLMWrapper
        except ImportError:
            LLMWrapper = None
            logger.debug("LLMWrapper not available - SRA service will use rule-based extraction only")


class SRAService:
    """
    Continuous Symptom Recognition and Analysis Service
    
    Processes all user responses in real-time to extract symptoms and their attributes.
    Works silently in the background throughout the entire assessment workflow.
    """
    
    def __init__(self, llm_client: Optional[Any] = None):
        """
        Initialize SRA service.
        
        Args:
            llm_client: LLM client instance (optional, will create if not provided)
        """
        self.symptom_db = get_symptom_database()
        self.llm_client = llm_client
        
        if LLMWrapper and not self.llm_client:
            try:
                self.llm_client = LLMWrapper()
            except Exception as e:
                logger.warning(f"Could not initialize LLM client: {e}")
                self.llm_client = None
        
        # Symptom keywords for rule-based extraction
        self.symptom_keywords = {
            "mood": ["sad", "depressed", "down", "hopeless", "empty", "guilty", "worthless", 
                    "irritable", "angry", "moody", "euphoric", "manic", "high", "elated"],
            "anxiety": ["anxious", "worried", "nervous", "fear", "panic", "afraid", "scared",
                       "restless", "on edge", "tense", "apprehensive"],
            "sleep": ["insomnia", "sleep", "trouble sleeping", "can't sleep", "wake up",
                     "sleeping too much", "hypersomnia", "nightmare", "nightmare"],
            "appetite": ["appetite", "eating", "weight", "hungry", "not hungry", "food",
                        "lost weight", "gained weight"],
            "energy": ["tired", "fatigue", "fatigued", "exhausted", "low energy", "lethargic", "sluggish",
                      "no energy", "energetic", "hyperactive", "constantly tired", "feel tired"],
            "concentration": ["concentrate", "focus", "attention", "distracted", "forgetful",
                            "memory", "remember", "brain fog"],
            "suicidal": ["suicide", "kill myself", "end my life", "want to die", "not worth living"],
            "self_harm": ["hurt myself", "cut", "burn", "self harm", "self-harm"],
            "panic": ["panic attack", "panic", "heart racing", "chest pain", "short of breath",
                     "dizzy", "sweating", "trembling"],
            "ocd": ["obsession", "compulsion", "ritual", "repetitive", "checking", "cleaning",
                   "counting", "intrusive thought"],
            "trauma": ["flashback", "nightmare", "trauma", "ptsd", "triggered", "reliving",
                      "avoid", "numb", "hypervigilant"],
            "adhd": ["attention", "hyperactive", "impulsive", "distracted", "can't focus",
                    "fidget", "restless"]
        }
        
        logger.debug("SRAService initialized")
    
    def process_response(
        self,
        session_id: str,
        user_response: str,
        question: SCIDQuestion,
        processed_response: ProcessedResponse,
        conversation_history: List[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Process user response to extract symptoms and attributes.

        This method is called for EVERY response in the assessment workflow.
        It extracts symptoms silently in the background.

        Args:
            session_id: Session identifier
            user_response: User's response text
            question: The question being answered
            processed_response: Processed response from response processor
            conversation_history: Previous conversation history

        Returns:
            Dictionary with extracted symptoms and attributes
        """
        try:
            extracted_symptoms = []

            # Extract symptoms using rule-based method (always available)
            rule_based_symptoms = self._extract_symptoms_rule_based(user_response, question)
            extracted_symptoms.extend(rule_based_symptoms)

            # Extract symptoms using LLM if available (enhances rule-based extraction)
            llm_symptoms = []
            if self.llm_client:
                try:
                    llm_symptoms = self._extract_symptoms_llm(user_response, question, conversation_history)
                except Exception as e:
                    logger.warning(f"LLM symptom extraction failed: {e}")
                    # Continue with rule-based only if LLM fails

            # Merge symptoms (prioritize LLM if available, fallback to rule-based)
            all_symptoms = llm_symptoms if llm_symptoms else rule_based_symptoms
            
            # Extract attributes from processed response (if available)
            extracted_fields = {}
            if processed_response and hasattr(processed_response, 'extracted_fields'):
                extracted_fields = processed_response.extracted_fields or {}
            
            # Add symptoms to database
            for symptom_data in all_symptoms:
                # Ensure symptom_data is a dictionary
                if not isinstance(symptom_data, dict):
                    logger.warning(f"Invalid symptom data format: {type(symptom_data)} - {symptom_data}")
                    continue
                
                symptom = self.symptom_db.add_symptom(
                    session_id=session_id,
                    symptom_name=symptom_data.get("name", ""),
                    category=symptom_data.get("category", ""),
                    severity=extracted_fields.get("severity") or symptom_data.get("severity", ""),
                    frequency=extracted_fields.get("frequency") or symptom_data.get("frequency", ""),
                    duration=extracted_fields.get("duration") or symptom_data.get("duration", ""),
                    triggers=extracted_fields.get("triggers") or symptom_data.get("triggers", []),
                    impact=extracted_fields.get("impact") or symptom_data.get("impact", ""),
                    context=f"Question: {question.simple_text[:100] if question and hasattr(question, 'simple_text') else 'General assessment'}",
                    confidence=symptom_data.get("confidence", processed_response.confidence if processed_response and hasattr(processed_response, 'confidence') else 1.0)
                )
                extracted_symptoms.append(symptom.to_dict())
            
            logger.debug(f"Extracted {len(extracted_symptoms)} symptoms from response in session {session_id}")
            
            return {
                "symptoms_extracted": len(extracted_symptoms),
                "symptoms": extracted_symptoms,
                "method": "llm" if llm_symptoms else "rule_based"
            }
            
        except Exception as e:
            logger.error(f"Error processing response for symptom extraction: {e}", exc_info=True)
            return {
                "symptoms_extracted": 0,
                "symptoms": [],
                "error": str(e)
            }
    
    def _extract_symptoms_rule_based(self, user_response: str, question: SCIDQuestion) -> List[Dict[str, Any]]:
        """
        Extract symptoms using rule-based keyword matching.
        
        Args:
            user_response: User's response text
            question: The question being answered
            
        Returns:
            List of symptom dictionaries
        """
        symptoms = []
        user_response_lower = user_response.lower()
        
        # Check for symptom keywords
        for category, keywords in self.symptom_keywords.items():
            for keyword in keywords:
                if keyword in user_response_lower:
                    # Extract symptom name and context
                    symptom_name = self._extract_symptom_name(user_response, keyword, category)
                    
                    symptoms.append({
                        "name": symptom_name,
                        "category": category,
                        "severity": self._extract_severity(user_response),
                        "frequency": self._extract_frequency(user_response),
                        "duration": self._extract_duration(user_response),
                        "confidence": 0.7  # Rule-based confidence
                    })
                    break  # Only add each category once per response
        
        return symptoms
    
    def _extract_symptoms_llm(
        self,
        user_response: str,
        question: SCIDQuestion,
        conversation_history: List[Dict[str, str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Extract symptoms using LLM.
        
        Args:
            user_response: User's response text
            question: The question being answered
            conversation_history: Previous conversation history
            
        Returns:
            List of symptom dictionaries
        """
        if not self.llm_client:
            return []
        
        try:
            system_prompt = """You are a symptom extraction specialist. Extract symptoms and their attributes from user responses.

Return JSON array with symptoms:
[
  {
    "name": "symptom name",
    "category": "mood|anxiety|sleep|appetite|energy|concentration|suicidal|self_harm|panic|ocd|trauma|adhd|other",
    "severity": "mild|moderate|severe|extreme",
    "frequency": "daily|weekly|occasional|rare",
    "duration": "weeks|months|years",
    "triggers": ["trigger1", "trigger2"],
    "impact": "minor|moderate|severe|extreme",
    "confidence": 0.0-1.0
  }
]

Only extract symptoms that are clearly mentioned. Return empty array if no symptoms found.
Return only valid JSON, no additional text."""
            
            question_text = question.simple_text if question and hasattr(question, 'simple_text') and question.simple_text else "General assessment question"

            prompt = f"""
USER RESPONSE: {user_response}

QUESTION: {question_text}

Extract symptoms and their attributes. Return JSON array:"""
            
            response = self.llm_client.generate_response(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.1,
                max_tokens=500
            )
            
            if not response.success:
                logger.warning(f"LLM symptom extraction failed: {response.error}")
                return []
            
            # Parse JSON response
            import json
            content = response.content.strip()
            
            # Remove code block markers if present
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            
            # Find JSON array
            if "[" in content:
                start_idx = content.find("[")
                end_idx = content.rfind("]") + 1
                content = content[start_idx:end_idx]
            
            # Use improved JSON parsing
            symptoms = self._parse_json_array(content)
            
            # Ensure symptoms is a list of dictionaries
            if not isinstance(symptoms, list):
                if isinstance(symptoms, dict):
                    symptoms = [symptoms]
                elif symptoms:
                    symptoms = [symptoms] if isinstance(symptoms, dict) else []
                else:
                    symptoms = []
            
            # Validate each symptom is a dict
            validated_symptoms = []
            for symptom in symptoms:
                if isinstance(symptom, dict):
                    validated_symptoms.append(symptom)
                elif isinstance(symptom, str):
                    # If symptom is a string, try to parse it
                    logger.warning(f"Unexpected symptom format (string): {symptom}")
                    # Skip string symptoms
                    continue
                else:
                    logger.warning(f"Unexpected symptom format: {type(symptom)}")
                    continue
            
            symptoms = validated_symptoms
            
            logger.debug(f"LLM extracted {len(symptoms)} symptoms")
            return symptoms
            
        except Exception as e:
            logger.warning(f"LLM symptom extraction error: {e}")
            return []
    
    def _parse_json_array(self, response_text: str) -> List[Dict[str, Any]]:
        """
        Parse JSON array from LLM response with improved error handling.
        
        Args:
            response_text: Raw LLM response text
            
        Returns:
            List of symptom dictionaries
        """
        import json
        
        if not response_text or not response_text.strip():
            return []
        
        original_text = response_text
        response_text = response_text.strip()
        
        # Remove markdown code blocks
        if response_text.startswith("```json"):
            response_text = response_text[7:].strip()
        elif response_text.startswith("```"):
            response_text = response_text[3:].strip()
        
        if response_text.endswith("```"):
            response_text = response_text[:-3].strip()
        
        # Remove LLM artifacts
        response_text = re.sub(r'<[^>]+>', '', response_text)
        
        # Find JSON array (look for [ ... ])
        start_idx = response_text.find('[')
        end_idx = response_text.rfind(']')
        
        # Check if there's a leading empty array followed by objects
        # Handle cases like: []\n{...} or [] {...} or [], {...}
        if start_idx >= 0:
            # Check if it starts with an empty array
            if response_text[start_idx:start_idx+2] == "[]":
                # Look for objects after the empty array
                remaining_text = response_text[start_idx + 2:].strip()
                # Remove leading comma, newline, or whitespace
                remaining_text = remaining_text.lstrip(',\n\r\t ')
                
                # Try to extract all JSON objects from remaining text
                objects = []
                brace_count = 0
                start_obj = -1
                
                for i, char in enumerate(remaining_text):
                    if char == '{':
                        if brace_count == 0:
                            start_obj = i
                        brace_count += 1
                    elif char == '}':
                        brace_count -= 1
                        if brace_count == 0 and start_obj >= 0:
                            obj_text = remaining_text[start_obj:i+1]
                            # Validate it's a valid JSON object
                            try:
                                json.loads(obj_text)  # Quick validation
                                objects.append(obj_text)
                            except json.JSONDecodeError:
                                pass  # Skip invalid objects
                            start_obj = -1
                
                if objects:
                    # Reconstruct as proper JSON array
                    response_text = '[' + ','.join(objects) + ']'
                    logger.debug(f"Reconstructed JSON array from {len(objects)} objects after removing leading empty array")
                else:
                    # No valid objects found, return empty array
                    response_text = '[]'
            elif start_idx >= 0 and end_idx > start_idx:
                # Normal case: extract the array
                response_text = response_text[start_idx:end_idx + 1]
            elif start_idx >= 0:
                # Found [ but no ], try to find matching ]
                brace_count = 0
                for i, char in enumerate(response_text[start_idx:], start_idx):
                    if char == '[':
                        brace_count += 1
                    elif char == ']':
                        brace_count -= 1
                        if brace_count == 0:
                            response_text = response_text[start_idx:i+1]
                            break
        elif '{' in response_text and '}' in response_text:
            # No array brackets, but might be a single object or multiple objects
            # Try to extract objects
            objects = []
            brace_count = 0
            start_obj = -1
            
            for i, char in enumerate(response_text):
                if char == '{':
                    if brace_count == 0:
                        start_obj = i
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0 and start_obj >= 0:
                        obj_text = response_text[start_obj:i+1]
                        objects.append(obj_text)
                        start_obj = -1
            
            if objects:
                # Try to parse as array of objects
                response_text = '[' + ','.join(objects) + ']'
                logger.debug(f"Reconstructed JSON array from {len(objects)} objects")
        
        # Try parsing
        try:
            symptoms = json.loads(response_text)
            if isinstance(symptoms, list):
                return symptoms
            return [symptoms] if symptoms else []
        except json.JSONDecodeError:
            # Try fixing common issues
            fixed_text = re.sub(r',(\s*[\]}])', r'\1', response_text)
            fixed_text = re.sub(r"'([^']*)':", r'"\1":', fixed_text)
            fixed_text = re.sub(r":\s*'([^']*)'", r': "\1"', fixed_text)
            
            try:
                symptoms = json.loads(fixed_text)
                if isinstance(symptoms, list):
                    return symptoms
                return [symptoms] if symptoms else []
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse JSON array from SRA response: {original_text[:200]}...")
                return []
    
    def _extract_symptom_name(self, user_response: str, keyword: str, category: str) -> str:
        """Extract symptom name from user response"""
        # Use category as base name
        category_names = {
            "mood": "Mood symptoms",
            "anxiety": "Anxiety symptoms",
            "sleep": "Sleep problems",
            "appetite": "Appetite changes",
            "energy": "Energy problems",
            "concentration": "Concentration problems",
            "suicidal": "Suicidal thoughts",
            "self_harm": "Self-harm behavior",
            "panic": "Panic attacks",
            "ocd": "OCD symptoms",
            "trauma": "Trauma symptoms",
            "adhd": "ADHD symptoms"
        }
        
        return category_names.get(category, keyword.title())
    
    def _extract_severity(self, user_response: str) -> str:
        """Extract severity from user response"""
        user_response_lower = user_response.lower()
        
        if any(word in user_response_lower for word in ["extreme", "severe", "very bad", "terrible", "awful"]):
            return "severe"
        elif any(word in user_response_lower for word in ["moderate", "somewhat", "quite", "pretty"]):
            return "moderate"
        elif any(word in user_response_lower for word in ["mild", "slight", "a little", "some"]):
            return "mild"
        
        return ""
    
    def _extract_frequency(self, user_response: str) -> str:
        """Extract frequency from user response"""
        user_response_lower = user_response.lower()
        
        if any(word in user_response_lower for word in ["daily", "every day", "always", "constantly"]):
            return "daily"
        elif any(word in user_response_lower for word in ["weekly", "few times", "several times"]):
            return "weekly"
        elif any(word in user_response_lower for word in ["occasional", "sometimes", "once in a while"]):
            return "occasional"
        elif any(word in user_response_lower for word in ["rare", "rarely", "seldom"]):
            return "rare"
        
        return ""
    
    def _extract_duration(self, user_response: str) -> str:
        """Extract duration from user response"""
        user_response_lower = user_response.lower()
        
        # Look for duration patterns
        if re.search(r'\d+\s*years?', user_response_lower):
            return "years"
        elif re.search(r'\d+\s*months?', user_response_lower):
            return "months"
        elif re.search(r'\d+\s*weeks?', user_response_lower):
            return "weeks"
        elif "year" in user_response_lower:
            return "years"
        elif "month" in user_response_lower:
            return "months"
        elif "week" in user_response_lower:
            return "weeks"
        
        return ""
    
    def get_symptoms_summary(self, session_id: str) -> Dict[str, Any]:
        """
        Get summary of all symptoms for a session.
        
        Args:
            session_id: Session identifier
            
        Returns:
            Dictionary with symptom summary
        """
        return self.symptom_db.get_symptoms_summary(session_id)
    
    def export_symptoms(self, session_id: str) -> List[Dict[str, Any]]:
        """
        Export symptoms for use by DA and TPA.

        Args:
            session_id: Session identifier

        Returns:
            List of symptom dictionaries
        """
        return self.symptom_db.export_symptoms(session_id)

    def check_for_clarification_needs(self, session_id: str) -> Dict[str, Any]:
        """
        Check if SRA needs clarification before providing comprehensive report to DA.

        Evaluates symptoms for:
        - Ambiguous severity levels
        - Unclear temporal patterns
        - Missing critical information
        - Conflicting symptom reports

        Args:
            session_id: Session identifier

        Returns:
            Dictionary with clarification assessment
        """
        try:
            symptoms = self.symptom_db.export_symptoms(session_id)

            clarification_needed = {
                "needs_clarification": False,
                "questions": [],
                "reasoning": "",
                "priority_level": "low"  # low, medium, high
            }

            if len(symptoms) < 2:
                clarification_needed["needs_clarification"] = True
                clarification_needed["questions"].append(
                    "Can you describe what symptoms you've been experiencing in more detail?"
                )
                clarification_needed["reasoning"] = "Limited symptom data collected"
                clarification_needed["priority_level"] = "high"
                return clarification_needed

            # Check for ambiguous severity
            unknown_severity = sum(1 for s in symptoms if not s.get("severity") or s.get("severity") == "")
            if unknown_severity > len(symptoms) * 0.5:
                clarification_needed["needs_clarification"] = True
                clarification_needed["questions"].append(
                    "On a scale of mild, moderate, or severe, how would you rate the intensity of your symptoms?"
                )
                clarification_needed["reasoning"] = "Many symptoms lack severity information"
                clarification_needed["priority_level"] = "medium"

            # Check for temporal ambiguity
            unknown_duration = sum(1 for s in symptoms if not s.get("duration") or s.get("duration") == "")
            if unknown_duration > len(symptoms) * 0.6:
                if len(clarification_needed["questions"]) < 3:
                    clarification_needed["needs_clarification"] = True
                    clarification_needed["questions"].append(
                        "How long have these symptoms been present (days, weeks, months, years)?"
                    )
                    clarification_needed["reasoning"] = "Missing duration information for most symptoms"
                    if clarification_needed["priority_level"] == "low":
                        clarification_needed["priority_level"] = "medium"

            # Limit to max 3 questions
            clarification_needed["questions"] = clarification_needed["questions"][:3]

            # Only set needs_clarification if we actually have questions
            clarification_needed["needs_clarification"] = len(clarification_needed["questions"]) > 0

            logger.info(f"SRA clarification assessment for {session_id}: needs={clarification_needed['needs_clarification']}, questions={len(clarification_needed['questions'])}")

            return clarification_needed

        except Exception as e:
            logger.error(f"Error checking clarification needs for session {session_id}: {e}")
            return {
                "needs_clarification": False,
                "questions": [],
                "reasoning": f"Error during assessment: {str(e)}",
                "priority_level": "low"
            }

    def get_clarification_question(self, session_id: str, question_index: int = 0) -> Optional[str]:
        """
        Get the next clarification question for SRA.

        Args:
            session_id: Session identifier
            question_index: Index of question to retrieve (0-based)

        Returns:
            Clarification question or None if no more questions
        """
        try:
            clarification_data = self.check_for_clarification_needs(session_id)

            if not clarification_data.get("needs_clarification", False):
                return None

            questions = clarification_data.get("questions", [])
            if question_index < len(questions):
                return questions[question_index]

            return None

        except Exception as e:
            logger.error(f"Error getting clarification question for session {session_id}: {e}")
            return None

    def get_comprehensive_symptom_report(self, session_id: str) -> Dict[str, Any]:
        """
        Get comprehensive symptom analysis report for DA.

        This method provides:
        - All collected symptoms with full details
        - Symptom clustering and patterns
        - Temporal analysis (onset, duration, frequency)
        - Severity assessment
        - Clinical correlations

        Args:
            session_id: Session identifier

        Returns:
            Comprehensive symptom analysis dictionary
        """
        try:
            # Get basic symptom data
            symptoms = self.symptom_db.export_symptoms(session_id)
            summary = self.symptom_db.get_symptoms_summary(session_id)

            # Analyze symptom patterns and clusters
            symptom_clusters = self._analyze_symptom_clusters(symptoms)
            temporal_patterns = self._analyze_temporal_patterns(symptoms)
            severity_assessment = self._assess_overall_severity(symptoms)
            clinical_correlations = self._identify_clinical_correlations(symptoms)

            # Generate comprehensive report
            report = {
                "symptoms": symptoms,
                "summary": summary,
                "clusters": symptom_clusters,
                "temporal_analysis": temporal_patterns,
                "severity_assessment": severity_assessment,
                "clinical_correlations": clinical_correlations,
                "report_generated_at": datetime.now().isoformat(),
                "confidence_score": self._calculate_report_confidence(symptoms),
                "recommendations": self._generate_sra_recommendations(symptoms)
            }

            logger.info(f"Generated comprehensive symptom report for session {session_id} with {len(symptoms)} symptoms")
            return report

        except Exception as e:
            logger.error(f"Failed to generate comprehensive symptom report for session {session_id}: {e}")
            return {
                "symptoms": symptoms if 'symptoms' in locals() else [],
                "summary": summary if 'summary' in locals() else {},
                "error": str(e),
                "report_generated_at": datetime.now().isoformat()
            }

    def _analyze_symptom_clusters(self, symptoms: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze symptom clusters and patterns"""
        clusters = {
            "mood_symptoms": [],
            "anxiety_symptoms": [],
            "cognitive_symptoms": [],
            "sleep_symptoms": [],
            "physical_symptoms": [],
            "behavioral_symptoms": []
        }

        for symptom in symptoms:
            category = symptom.get("category", "").lower()
            if "mood" in category or "depress" in category:
                clusters["mood_symptoms"].append(symptom)
            elif "anxiety" in category or "panic" in category or "worry" in category:
                clusters["anxiety_symptoms"].append(symptom)
            elif "cognitive" in category or "memory" in category or "focus" in category:
                clusters["cognitive_symptoms"].append(symptom)
            elif "sleep" in category or "insomnia" in category:
                clusters["sleep_symptoms"].append(symptom)
            elif "physical" in category or "pain" in category or "fatigue" in category:
                clusters["physical_symptoms"].append(symptom)
            elif "behavior" in category or "withdrawal" in category:
                clusters["behavioral_symptoms"].append(symptom)

        return {
            "clusters": clusters,
            "cluster_counts": {k: len(v) for k, v in clusters.items()},
            "dominant_cluster": max(clusters.items(), key=lambda x: len(x[1]))[0] if clusters else None
        }

    def _analyze_temporal_patterns(self, symptoms: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze temporal patterns in symptoms"""
        temporal_data = {
            "acute_symptoms": [],  # < 1 month
            "subacute_symptoms": [],  # 1-6 months
            "chronic_symptoms": [],  # > 6 months
            "frequency_patterns": {},
            "onset_patterns": []
        }

        for symptom in symptoms:
            duration = symptom.get("duration", "").lower()

            if any(word in duration for word in ["week", "weeks", "day", "days"]):
                temporal_data["acute_symptoms"].append(symptom)
            elif any(word in duration for word in ["month", "months"]) and not any(word in duration for word in ["year", "years"]):
                temporal_data["subacute_symptoms"].append(symptom)
            elif any(word in duration for word in ["year", "years"]):
                temporal_data["chronic_symptoms"].append(symptom)

            # Analyze frequency
            frequency = symptom.get("frequency", "").lower()
            if frequency not in temporal_data["frequency_patterns"]:
                temporal_data["frequency_patterns"][frequency] = []
            temporal_data["frequency_patterns"][frequency].append(symptom)

        return temporal_data

    def _assess_overall_severity(self, symptoms: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Assess overall severity of symptoms"""
        severity_scores = {"mild": 1, "moderate": 2, "severe": 3, "extreme": 4}
        impact_scores = {"minor": 1, "moderate": 2, "severe": 3, "extreme": 4}

        total_severity = 0
        total_impact = 0
        severity_breakdown = {"mild": 0, "moderate": 0, "severe": 0, "extreme": 0}

        for symptom in symptoms:
            severity = symptom.get("severity", "moderate").lower()
            impact = symptom.get("impact", "moderate").lower()

            severity_score = severity_scores.get(severity, 2)
            impact_score = impact_scores.get(impact, 2)

            total_severity += severity_score
            total_impact += impact_score

            severity_breakdown[severity] += 1

        avg_severity = total_severity / len(symptoms) if symptoms else 0
        avg_impact = total_impact / len(symptoms) if symptoms else 0

        # Determine overall severity level
        if avg_severity >= 3.5:
            overall_level = "extreme"
        elif avg_severity >= 2.5:
            overall_level = "severe"
        elif avg_severity >= 1.5:
            overall_level = "moderate"
        else:
            overall_level = "mild"

        return {
            "overall_severity_level": overall_level,
            "average_severity_score": avg_severity,
            "average_impact_score": avg_impact,
            "severity_breakdown": severity_breakdown,
            "total_symptoms": len(symptoms)
        }

    def _identify_clinical_correlations(self, symptoms: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Identify clinical correlations and patterns"""
        correlations = {
            "depression_indicators": [],
            "anxiety_indicators": [],
            "ptsd_indicators": [],
            "ocd_indicators": [],
            "bipolar_indicators": [],
            "psychosis_indicators": []
        }

        # Simple rule-based correlation detection
        for symptom in symptoms:
            name = symptom.get("name", "").lower()
            context = " ".join(symptom.get("context", [])).lower()

            # Depression indicators
            if any(word in name for word in ["sad", "depressed", "hopeless", "worthless", "suicidal"]):
                correlations["depression_indicators"].append(symptom)

            # Anxiety indicators
            if any(word in name for word in ["anxious", "panic", "worry", "fear", "nervous"]):
                correlations["anxiety_indicators"].append(symptom)

            # PTSD indicators
            if any(word in name for word in ["flashback", "nightmare", "trauma", "trigger", "avoidance"]):
                correlations["ptsd_indicators"].append(symptom)

            # OCD indicators
            if any(word in name for word in ["obsession", "compulsion", "ritual", "intrusive", "checking"]):
                correlations["ocd_indicators"].append(symptom)

            # Bipolar indicators
            if any(word in name for word in ["manic", "euphoric", "irritable", "hyperactive", "elevated"]):
                correlations["bipolar_indicators"].append(symptom)

            # Psychosis indicators
            if any(word in name for word in ["hallucination", "delusion", "paranoia", "disorganized"]):
                correlations["psychosis_indicators"].append(symptom)

        # Calculate correlation strengths
        correlation_strengths = {}
        for condition, symptoms_list in correlations.items():
            strength = len(symptoms_list) / len(symptoms) if symptoms else 0
            correlation_strengths[condition] = {
                "count": len(symptoms_list),
                "percentage": strength * 100,
                "strength": "strong" if strength > 0.3 else "moderate" if strength > 0.15 else "weak"
            }

        return {
            "correlations": correlations,
            "correlation_strengths": correlation_strengths,
            "primary_correlations": sorted(
                correlation_strengths.items(),
                key=lambda x: x[1]["count"],
                reverse=True
            )[:3]  # Top 3 correlations
        }

    def _calculate_report_confidence(self, symptoms: List[Dict[str, Any]]) -> float:
        """Calculate confidence score for the symptom report"""
        if not symptoms:
            return 0.0

        # Factors affecting confidence:
        # 1. Number of symptoms (more = higher confidence)
        # 2. Average confidence of individual symptoms
        # 3. Diversity of symptom categories
        # 4. Temporal consistency

        base_confidence = min(len(symptoms) / 10, 1.0)  # More symptoms = higher confidence

        avg_symptom_confidence = sum(s.get("confidence", 1.0) for s in symptoms) / len(symptoms)

        # Check category diversity
        categories = set(s.get("category", "") for s in symptoms if s.get("category"))
        category_diversity = len(categories) / max(1, len(symptoms) * 0.5)  # Expect ~2 categories per 10 symptoms

        confidence = (base_confidence * 0.4) + (avg_symptom_confidence * 0.4) + (category_diversity * 0.2)

        return min(confidence, 1.0)

    def _generate_sra_recommendations(self, symptoms: List[Dict[str, Any]]) -> List[str]:
        """Generate SRA recommendations for DA consideration"""
        recommendations = []

        if len(symptoms) < 3:
            recommendations.append("Limited symptom data - consider gathering more information")
        elif len(symptoms) > 15:
            recommendations.append("Extensive symptom presentation - prioritize most severe symptoms")

        # Check for temporal patterns
        acute_count = sum(1 for s in symptoms if any(word in s.get("duration", "").lower() for word in ["week", "weeks", "day", "days"]))
        if acute_count > len(symptoms) * 0.7:
            recommendations.append("Primarily acute symptoms - consider recent onset conditions")

        chronic_count = sum(1 for s in symptoms if any(word in s.get("duration", "").lower() for word in ["year", "years"]))
        if chronic_count > len(symptoms) * 0.5:
            recommendations.append("Primarily chronic symptoms - consider long-term conditions")

        return recommendations


# Global SRA service instance
_sra_service: Optional[SRAService] = None


def get_sra_service() -> SRAService:
    """Get global SRA service instance (singleton)"""
    global _sra_service
    if _sra_service is None:
        _sra_service = SRAService()
    return _sra_service


