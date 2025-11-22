"""
DSM Criteria Engine for SCID-CV V2
Tracks DSM-5 criteria fulfillment (backend only)
"""

import logging
from typing import Dict, List, Any, Optional, Tuple
from ..base_types import SCIDQuestion, ProcessedResponse, SCIDModule

logger = logging.getLogger(__name__)


class DSMCriteriaEngine:
    """DSM-5 criteria tracking engine (backend only)"""
    
    def __init__(self):
        """Initialize DSM criteria engine"""
        self.criteria_status: Dict[str, bool] = {}
    
    def update_criteria_status(
        self,
        question_id: str,
        processed_response: ProcessedResponse,
        module_id: str,
        dsm_criteria: Dict[str, Any]
    ) -> Dict[str, bool]:
        """
        Update DSM criteria status based on response.
        
        Args:
            question_id: Question ID that was answered
            processed_response: Processed response from user
            module_id: Module ID
            dsm_criteria: DSM criteria information from module
        
        Returns:
            Updated criteria status dict
        """
        try:
            # Update criteria from processed response
            if processed_response.dsm_criteria_mapping:
                self.criteria_status.update(processed_response.dsm_criteria_mapping)
            
            # Also update based on extracted fields if available
            extracted_fields = processed_response.extracted_fields
            if extracted_fields:
                # Map extracted fields to criteria if applicable
                # This is module-specific and can be extended
                pass
            
            return self.criteria_status.copy()
            
        except Exception as e:
            logger.error(f"Error updating criteria status: {e}")
            return self.criteria_status.copy()
    
    def can_stop_early(
        self,
        criteria_status: Dict[str, bool],
        dsm_criteria: Dict[str, Any],
        module_id: str
    ) -> Tuple[bool, str]:
        """
        Determine if assessment can stop early:
        - Criteria already met (diagnosis possible)
        - Criteria not possible (diagnosis not possible)
        
        Args:
            criteria_status: Current criteria status
            dsm_criteria: DSM criteria information
            module_id: Module ID
        
        Returns:
            Tuple of (can_stop, reason)
        """
        try:
            # Get criteria type and minimum count
            criteria_type = dsm_criteria.get("criteria_type", "symptom_count")
            minimum_criteria_count = dsm_criteria.get("minimum_criteria_count", 5)
            
            # Count met criteria
            met_criteria = [k for k, v in criteria_status.items() if v is True]
            met_count = len(met_criteria)
            
            # Count unmet criteria (explicitly False)
            unmet_criteria = [k for k, v in criteria_status.items() if v is False]
            unmet_count = len(unmet_criteria)
            
            # Check if diagnosis is possible (enough criteria met)
            if criteria_type == "symptom_count":
                if met_count >= minimum_criteria_count:
                    return True, f"Diagnostic criteria met ({met_count}/{minimum_criteria_count}+ criteria)"
            
            # Check if diagnosis is not possible
            # This is more complex and depends on required criteria
            required_criteria = [
                c for c in dsm_criteria.get("criteria", [])
                if c.get("required", False)
            ]
            
            if required_criteria:
                # Check if any required criteria are unmet
                required_criterion_ids = [c.get("criterion_id") for c in required_criteria]
                unmet_required = [
                    cid for cid in required_criterion_ids
                    if criteria_status.get(cid) is False
                ]
                
                if unmet_required:
                    # Check if diagnosis is still possible
                    # For now, we don't stop early if required criteria are unmet
                    # (might be answered in future questions)
                    pass
            
            return False, "Continue assessment"
            
        except Exception as e:
            logger.error(f"Error checking early stop: {e}")
            return False, "Continue assessment"
    
    def get_criteria_summary(
        self,
        criteria_status: Dict[str, bool],
        dsm_criteria: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Get criteria summary for backend processing.
        
        Args:
            criteria_status: Current criteria status
            dsm_criteria: DSM criteria information
        
        Returns:
            Criteria summary dict
        """
        try:
            met_criteria = [k for k, v in criteria_status.items() if v is True]
            unmet_criteria = [k for k, v in criteria_status.items() if v is False]
            unknown_criteria = [
                k for k in dsm_criteria.get("criteria", [])
                if k.get("criterion_id") not in criteria_status
            ]
            
            minimum_criteria_count = dsm_criteria.get("minimum_criteria_count", 5)
            met_count = len(met_criteria)
            
            return {
                "met_criteria": met_criteria,
                "unmet_criteria": unmet_criteria,
                "unknown_criteria": [c.get("criterion_id") for c in unknown_criteria],
                "met_count": met_count,
                "minimum_required": minimum_criteria_count,
                "criteria_met": met_count >= minimum_criteria_count,
                "progress_percentage": (met_count / minimum_criteria_count * 100) if minimum_criteria_count > 0 else 0
            }
            
        except Exception as e:
            logger.error(f"Error getting criteria summary: {e}")
            return {
                "met_criteria": [],
                "unmet_criteria": [],
                "unknown_criteria": [],
                "met_count": 0,
                "minimum_required": 0,
                "criteria_met": False,
                "progress_percentage": 0
            }
    
    def check_diagnosis_possible(
        self,
        criteria_status: Dict[str, bool],
        dsm_criteria: Dict[str, Any]
    ) -> Tuple[bool, str]:
        """
        Check if diagnosis is possible based on current criteria status.
        
        Args:
            criteria_status: Current criteria status
            dsm_criteria: DSM criteria information
        
        Returns:
            Tuple of (diagnosis_possible, reason)
        """
        try:
            criteria_type = dsm_criteria.get("criteria_type", "symptom_count")
            minimum_criteria_count = dsm_criteria.get("minimum_criteria_count", 5)
            
            met_criteria = [k for k, v in criteria_status.items() if v is True]
            met_count = len(met_criteria)
            
            if criteria_type == "symptom_count":
                if met_count >= minimum_criteria_count:
                    return True, f"Diagnosis possible: {met_count}/{minimum_criteria_count} criteria met"
                else:
                    return False, f"Diagnosis not yet possible: {met_count}/{minimum_criteria_count} criteria met"
            
            return False, "Unknown criteria type"
            
        except Exception as e:
            logger.error(f"Error checking diagnosis: {e}")
            return False, f"Error: {str(e)}"

