"""
Base module class for SCID-CV V2
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from ..base_types import SCIDModule, ModuleDeploymentCriteria
import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


class BaseSCIDModule(ABC):
    """Base class for SCID-CV modules"""
    
    def __init__(self):
        """Initialize base module"""
        self.dsm_criteria_data = self._load_dsm_criteria()
    
    def _load_dsm_criteria(self) -> Dict[str, Any]:
        """Load DSM criteria from JSON file"""
        try:
            # Try to find dsm_criteria.json in assessment_v2/resources first
            current_dir = Path(__file__).parent
            # modules/base_module.py -> assessment_v2/modules -> assessment_v2
            assessment_v2_dir = current_dir.parent  # assessment_v2/modules -> assessment_v2
            dsm_file = assessment_v2_dir / "resources" / "dsm_criteria.json"
            
            if not dsm_file.exists():
                # Try parent assessment/resources as fallback
                assessment_dir = assessment_v2_dir.parent  # assessment_v2 -> assessment
                dsm_file = assessment_dir / "resources" / "dsm_criteria.json"
            
            if dsm_file.exists():
                with open(dsm_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return data.get("disorders", {})
            else:
                logger.warning(f"DSM criteria file not found. Tried: {dsm_file}")
                return {}
                
        except Exception as e:
            logger.error(f"Error loading DSM criteria: {e}")
            return {}
    
    def get_dsm_criteria(self, disorder_id: str) -> Dict[str, Any]:
        """Get DSM criteria for a specific disorder"""
        return self.dsm_criteria_data.get(disorder_id, {})
    
    @abstractmethod
    def create_module(self) -> SCIDModule:
        """Create and return the SCID module"""
        pass
    
    @abstractmethod
    def get_deployment_criteria(self) -> ModuleDeploymentCriteria:
        """Get deployment criteria for this module"""
        pass

