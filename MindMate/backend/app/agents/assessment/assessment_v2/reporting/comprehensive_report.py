"""
Comprehensive Assessment Report Generator

Creates a natural language report from all assessment data and results.
"""

import logging
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class ComprehensiveReportGenerator:
    """
    Generates comprehensive natural language reports from all assessment data.
    """
    
    def __init__(self):
        """Initialize the report generator"""
        pass
    
    def generate_report(
        self,
        session_id: str,
        session_state: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate a comprehensive natural language narrative summary from all assessment data.
        
        Format: "A patient [demographics] presents [concerns] and confirms [results]"
        
        Args:
            session_id: Assessment session identifier
            session_state: Optional session state dict (if not provided, will load from database)
            
        Returns:
            Natural language narrative summary string
        """
        try:
            # Load session data if not provided
            if not session_state:
                try:
                    from ..database import ModeratorDatabase
                except ImportError:
                    from app.agents.assessment.assessment_v2.database import ModeratorDatabase
                db = ModeratorDatabase()
                session_state = db.load_session_state(session_id)
            
            if not session_state:
                return "No assessment data found for this session."
            
            # Extract all module results
            module_results = session_state.get('module_results', {})
            
            # Build narrative summary
            narrative_parts = []
            
            # Start with patient demographics
            patient_description = self._build_patient_description(module_results)
            narrative_parts.append(patient_description)
            
            # Add presenting concerns
            presenting_info = self._build_presenting_info(module_results)
            if presenting_info:
                narrative_parts.append(presenting_info)
            
            # Add risk assessment data
            risk_info = self._build_risk_info(module_results)
            if risk_info:
                narrative_parts.append(risk_info)
            
            # Add SCID screening confirmations
            screening_info = self._build_screening_confirmation(module_results)
            if screening_info:
                narrative_parts.append(screening_info)
            
            # Add SCID-CV diagnostic confirmations
            diagnostic_info = self._build_diagnostic_confirmation(module_results)
            if diagnostic_info:
                narrative_parts.append(diagnostic_info)
            
            # Add SRA (Symptom Recognition) results
            sra_info = self._build_sra_results(module_results)
            if sra_info:
                narrative_parts.append(sra_info)
            
            # Add DA (Diagnostic Analysis) results
            da_info = self._build_da_results(module_results)
            if da_info:
                narrative_parts.append(da_info)
            
            # Add TPA (Treatment Planning) results
            tpa_info = self._build_tpa_results(module_results)
            if tpa_info:
                narrative_parts.append(tpa_info)
            
            # Combine into single narrative
            report = " ".join(narrative_parts)
            
            # Clean up formatting
            report = report.replace("  ", " ").replace(" .", ".").strip()
            
            return report
            
        except Exception as e:
            logger.error(f"Error generating comprehensive report: {e}", exc_info=True)
            return f"Error generating report: {str(e)}"
    
    def _build_patient_description(self, module_results: Dict[str, Any]) -> str:
        """Build patient description from demographics"""
        
        demo = module_results.get('demographics', {})
        
        parts = []
        
        # Age and gender
        age = demo.get('age')
        gender = demo.get('gender', '').lower() if demo.get('gender') else ''
        
        if age and gender:
            parts.append(f"A {age}-year-old {gender}")
        elif age:
            parts.append(f"A {age}-year-old patient")
        elif gender:
            parts.append(f"A {gender} patient")
        else:
            parts.append("A patient")
        
        # Occupation
        if demo.get('occupation'):
            parts.append(f"working as a {demo.get('occupation')}")
        
        # Education
        if demo.get('education_level'):
            education = demo.get('education_level').lower()
            if 'bachelor' in education:
                parts.append("with a bachelor's degree")
            elif 'master' in education or 'graduate' in education:
                parts.append("with a graduate degree")
            elif 'doctorate' in education or 'phd' in education:
                parts.append("with a doctoral degree")
            elif 'high school' in education or 'secondary' in education:
                parts.append("with a high school education")
        
        # Marital status
        if demo.get('marital_status'):
            status = demo.get('marital_status').lower()
            if status in ['single', 'married', 'divorced', 'widowed']:
                parts.append(f"who is {status}")
        
        description = " ".join(parts)
        if not description.endswith('.'):
            description += ","
        
        return description
    
    def _build_presenting_info(self, module_results: Dict[str, Any]) -> str:
        """Build presenting concern information"""
        
        concern = module_results.get('presenting_concern', {})
        if not concern:
            return ""
        
        parts = []
        
        # Primary concern
        primary = concern.get('primary_concern') or concern.get('presenting_concern', '')
        if primary:
            parts.append(f"presents with {primary.lower()}")
        
        # Duration
        duration = concern.get('hpi_duration') or concern.get('duration', '')
        if duration:
            parts.append(f"for {duration}")
        
        # Onset
        onset = concern.get('onset_timing') or concern.get('hpi_onset', '')
        if onset:
            parts.append(f"with onset {onset.lower()}")
        
        # Severity
        severity = concern.get('severity_assessment') or concern.get('hpi_severity') or concern.get('severity', '')
        if severity:
            parts.append(f"of {severity.lower()} severity")
        
        # Frequency
        frequency = concern.get('frequency_pattern') or concern.get('hpi_frequency', '')
        if frequency:
            parts.append(f"occurring {frequency.lower()}")
        
        # Functional impact
        impact = concern.get('functional_impact', '')
        if impact:
            parts.append(f"with functional impact: {impact.lower()}")
        
        if parts:
            return " ".join(parts) + "."
        
        return ""
    
    def _build_risk_info(self, module_results: Dict[str, Any]) -> str:
        """Build risk assessment information"""
        
        risk = module_results.get('risk_assessment', {})
        if not risk:
            return ""
        
        parts = []
        
        # Suicide ideation
        if risk.get('suicide_ideation'):
            parts.append("reports current suicidal ideation")
        elif risk.get('suicide_ideation') is False:
            parts.append("denies current suicidal ideation")
        
        # Past attempts
        if risk.get('past_attempts'):
            parts.append("with history of suicide attempts")
        elif risk.get('past_attempts') is False:
            parts.append("with no history of suicide attempts")
        
        # Self-harm
        if risk.get('self_harm_history') or risk.get('self_harm'):
            parts.append("reports history of self-harm behaviors")
        elif risk.get('self_harm_history') is False or risk.get('self_harm') is False:
            parts.append("denies history of self-harm")
        
        # Risk level
        risk_level = risk.get('risk_level', '').lower()
        if risk_level:
            parts.append(f"overall risk level assessed as {risk_level}")
        
        if parts:
            return "The patient " + ", ".join(parts) + "."
        
        return ""
    
    def _build_screening_confirmation(self, module_results: Dict[str, Any]) -> str:
        """Build SCID screening confirmation"""
        
        screening = module_results.get('scid_screening', {})
        if not screening:
            return ""
        
        parts = []
        
        # Positive screens
        responses = screening.get('responses', {})
        positive_items = []
        for item_id, response_data in responses.items():
            if isinstance(response_data, dict):
                is_yes = response_data.get('is_yes', False)
                if is_yes:
                    positive_items.append(item_id)
        
        if positive_items:
            parts.append(f"confirms positive screening responses on items {', '.join(positive_items)}")
            
            # Get item descriptions for context
            selected_items = screening.get('selected_items', [])
            if selected_items:
                positive_descriptions = []
                for item in selected_items:
                    if item.get('item_id') in positive_items:
                        category = item.get('category', 'unknown')
                        positive_descriptions.append(f"{item.get('item_id')} ({category})")
                
                if positive_descriptions:
                    categories = set([i.split('(')[1].rstrip(')') for i in positive_descriptions if '(' in i])
                    if categories:
                        parts.append(f"specifically indicating concerns in {', '.join(categories)}")
        else:
            parts.append("screens negative on all administered SCID-5-SC items")
        
        # Completion
        total = screening.get('total_items', 0)
        responded = screening.get('responded_items', 0)
        if total > 0:
            parts.append(f"with {responded} of {total} screening questions completed")
        
        if parts:
            return "The patient " + ", ".join(parts) + "."
        
        return ""
    
    def _build_diagnostic_confirmation(self, module_results: Dict[str, Any]) -> str:
        """Build SCID-CV diagnostic confirmation"""
        
        diagnostic = module_results.get('scid_cv_diagnostic', {})
        if not diagnostic:
            return ""
        
        parts = []
        
        module_name = diagnostic.get('module_name', 'SCID-CV assessment')
        result = diagnostic.get('result', {})
        
        # Criteria met
        if result.get('criteria_met'):
            parts.append(f"meets diagnostic criteria for {module_name}")
            
            # Diagnosis
            diagnosis = result.get('diagnosis', '')
            if diagnosis:
                parts.append(f"with diagnosis of {diagnosis}")
            
            # Severity
            severity = result.get('severity', '')
            if severity:
                parts.append(f"of {severity} severity")
            
            # Key symptoms
            symptoms = result.get('key_symptoms', [])
            if symptoms:
                symptom_list = ", ".join(symptoms[:5])  # Limit to 5
                parts.append(f"presenting with symptoms including {symptom_list}")
        else:
            parts.append(f"does not meet diagnostic criteria for {module_name}")
        
        # Questions completed
        questions = diagnostic.get('total_questions_answered', 0)
        if questions > 0:
            parts.append(f"based on {questions} diagnostic questions answered")
        
        if parts:
            return "The assessment confirms that the patient " + ", ".join(parts) + "."
        
        return ""
    
    def _generate_executive_summary(self, module_results: Dict[str, Any]) -> str:
        """Generate executive summary section"""
        
        completed_modules = list(module_results.keys())
        
        summary = "# COMPREHENSIVE ASSESSMENT REPORT\n\n"
        summary += f"**Assessment Date:** {datetime.now().strftime('%B %d, %Y')}\n\n"
        summary += "## EXECUTIVE SUMMARY\n\n"
        
        summary += f"This comprehensive mental health assessment was conducted through a structured interview process. "
        summary += f"The assessment included {len(completed_modules)} key components: "
        summary += ", ".join(self._format_module_names(completed_modules)) + ".\n\n"
        
        # Add quick highlights
        highlights = []
        
        if 'presenting_concern' in module_results:
            concern = module_results['presenting_concern']
            primary = concern.get('primary_concern') or concern.get('presenting_concern', 'N/A')
            if primary != 'N/A':
                highlights.append(f"Primary concern: {primary[:100]}...")
        
        if 'risk_assessment' in module_results:
            risk = module_results['risk_assessment']
            risk_level = risk.get('risk_level', 'unknown')
            if risk_level:
                highlights.append(f"Risk level: {risk_level}")
        
        if 'scid_cv_diagnostic' in module_results:
            cv_results = module_results['scid_cv_diagnostic']
            module_name = cv_results.get('module_name', 'SCID-CV Assessment')
            highlights.append(f"Diagnostic assessment completed: {module_name}")
        
        if highlights:
            summary += "**Key Highlights:**\n"
            for highlight in highlights:
                summary += f"- {highlight}\n"
            summary += "\n"
        
        return summary
    
    def _generate_demographics_section(self, demographics: Dict[str, Any]) -> str:
        """Generate demographics section"""
        
        section = "## DEMOGRAPHICS\n\n"
        
        parts = []
        
        if demographics.get('age'):
            parts.append(f"**Age:** {demographics['age']} years old")
        
        if demographics.get('gender'):
            parts.append(f"**Gender:** {demographics['gender'].capitalize()}")
        
        if demographics.get('education_level'):
            parts.append(f"**Education:** {demographics['education_level'].capitalize()}")
        
        if demographics.get('occupation'):
            parts.append(f"**Occupation:** {demographics['occupation']}")
        
        if demographics.get('marital_status'):
            parts.append(f"**Marital Status:** {demographics['marital_status'].capitalize()}")
        
        if parts:
            section += "\n".join(parts) + "\n"
        else:
            section += "Demographics information was not collected in this assessment.\n"
        
        return section
    
    def _generate_presenting_concern_section(self, concern: Dict[str, Any]) -> str:
        """Generate presenting concern section"""
        
        section = "## PRESENTING CONCERN\n\n"
        
        # Primary concern
        primary = concern.get('primary_concern') or concern.get('presenting_concern', '')
        if primary:
            section += f"**Primary Concern:** {primary}\n\n"
        
        # Onset and duration
        onset_info = []
        if concern.get('onset_timing') or concern.get('hpi_onset'):
            onset = concern.get('onset_timing') or concern.get('hpi_onset')
            onset_info.append(f"Onset: {onset}")
        
        if concern.get('hpi_duration'):
            onset_info.append(f"Duration: {concern.get('hpi_duration')}")
        
        if onset_info:
            section += "**Timeline:** " + ", ".join(onset_info) + "\n\n"
        
        # Severity
        severity = concern.get('severity_assessment') or concern.get('hpi_severity') or concern.get('severity', '')
        if severity:
            section += f"**Severity:** {severity.capitalize()}\n\n"
        
        # Frequency
        frequency = concern.get('frequency_pattern') or concern.get('hpi_frequency', '')
        if frequency:
            section += f"**Frequency:** {frequency.capitalize()}\n\n"
        
        # Functional impact
        impact = concern.get('functional_impact', '')
        if impact:
            section += f"**Functional Impact:** {impact}\n\n"
        
        # Additional details
        if concern.get('hpi_triggers'):
            section += f"**Triggers/Contributing Factors:** {concern.get('hpi_triggers')}\n\n"
        
        if concern.get('hpi_prior_episodes'):
            section += f"**Prior Episodes:** {concern.get('hpi_prior_episodes')}\n\n"
        
        return section
    
    def _generate_risk_assessment_section(self, risk: Dict[str, Any]) -> str:
        """Generate risk assessment section"""
        
        section = "## RISK ASSESSMENT\n\n"
        
        risk_level = risk.get('risk_level', 'unknown')
        section += f"**Overall Risk Level:** {risk_level.upper()}\n\n"
        
        # Suicide risk
        suicide_risk = []
        if risk.get('suicide_ideation'):
            suicide_risk.append("Current suicidal ideation reported")
        if risk.get('past_attempts'):
            suicide_risk.append("History of suicide attempts")
        if risk.get('suicide_plan'):
            suicide_risk.append("Specific plan identified")
        
        if suicide_risk:
            section += "**Suicide Risk:** " + "; ".join(suicide_risk) + "\n\n"
        else:
            section += "**Suicide Risk:** No current suicidal ideation or history of attempts reported.\n\n"
        
        # Self-harm
        if risk.get('self_harm_history') or risk.get('self_harm'):
            section += "**Self-Harm:** History of self-harm behaviors reported.\n\n"
        else:
            section += "**Self-Harm:** No history of self-harm reported.\n\n"
        
        # Protective factors
        if risk.get('protective_factors'):
            section += f"**Protective Factors:** {risk.get('protective_factors')}\n\n"
        
        # Recommendations
        if risk.get('recommendations'):
            section += "**Recommendations:**\n"
            for rec in risk.get('recommendations', []):
                section += f"- {rec}\n"
            section += "\n"
        
        return section
    
    def _generate_scid_screening_section(self, screening: Dict[str, Any]) -> str:
        """Generate SCID screening section"""
        
        section = "## SCID-5-SC SCREENING RESULTS\n\n"
        
        total_items = screening.get('total_items', 0)
        responded_items = screening.get('responded_items', 0)
        completion_rate = screening.get('completion_rate', 0)
        
        section += f"**Screening Completion:** {responded_items} of {total_items} questions completed ({completion_rate:.0%})\n\n"
        
        # Selected items
        selected_items = screening.get('selected_items', [])
        if selected_items:
            section += "**Screening Items Administered:**\n\n"
            for i, item in enumerate(selected_items[:10], 1):  # Limit to 10
                item_id = item.get('item_id', 'N/A')
                item_text = item.get('item_text', 'N/A')
                category = item.get('category', 'N/A')
                section += f"{i}. **{item_id}** ({category}): {item_text[:80]}...\n"
            section += "\n"
        
        # Positive screens
        responses = screening.get('responses', {})
        positive_screens = []
        for item_id, response_data in responses.items():
            if isinstance(response_data, dict):
                response = response_data.get('response') or response_data.get('normalized', '')
                is_yes = response_data.get('is_yes', False)
                if is_yes or (response and response.lower() in ['yes', 'y']):
                    positive_screens.append(item_id)
        
        if positive_screens:
            section += f"**Positive Screening Results:** {len(positive_screens)} items indicated potential concerns:\n"
            for item_id in positive_screens:
                section += f"- {item_id}\n"
            section += "\n"
        else:
            section += "**Positive Screening Results:** No significant concerns identified in screening items.\n\n"
        
        return section
    
    def _generate_scid_cv_section(self, cv_results: Dict[str, Any]) -> str:
        """Generate SCID-CV diagnostic section"""
        
        section = "## SCID-5-CV DIAGNOSTIC ASSESSMENT\n\n"
        
        module_name = cv_results.get('module_name', 'SCID-CV Module')
        section += f"**Assessment Module:** {module_name}\n\n"
        
        # Assessment details
        total_questions = cv_results.get('total_questions_answered', 0)
        if total_questions:
            section += f"**Questions Completed:** {total_questions}\n\n"
        
        # Diagnostic result
        result = cv_results.get('result', {})
        if result:
            criteria_met = result.get('criteria_met', False)
            diagnosis = result.get('diagnosis', '')
            severity = result.get('severity', '')
            confidence = result.get('confidence', 0)
            
            section += "**Diagnostic Findings:**\n\n"
            
            if criteria_met:
                section += f"The assessment indicates that diagnostic criteria are **MET** for {module_name}.\n\n"
                if diagnosis:
                    section += f"**Diagnosis:** {diagnosis}\n\n"
                if severity:
                    section += f"**Severity:** {severity}\n\n"
                if confidence:
                    section += f"**Confidence Level:** {confidence:.0%}\n\n"
            else:
                section += f"Diagnostic criteria for {module_name} are **NOT MET** based on the responses provided.\n\n"
                if confidence:
                    section += f"**Confidence Level:** {confidence:.0%}\n\n"
            
            # Key symptoms
            symptoms = result.get('key_symptoms', [])
            if symptoms:
                section += "**Key Symptoms Identified:**\n"
                for symptom in symptoms:
                    section += f"- {symptom}\n"
                section += "\n"
            
            # Recommendation
            recommendation = result.get('recommendation', '')
            if recommendation:
                section += f"**Recommendation:** {recommendation}\n\n"
        
        return section
    
    def _generate_clinical_summary(self, module_results: Dict[str, Any]) -> str:
        """Generate clinical summary and recommendations"""
        
        section = "## CLINICAL SUMMARY AND RECOMMENDATIONS\n\n"
        
        # Overall assessment
        section += "### Overall Assessment\n\n"
        
        # Build summary from all data
        summary_parts = []
        
        # Presenting concern summary
        if 'presenting_concern' in module_results:
            concern = module_results['presenting_concern']
            primary = concern.get('primary_concern') or concern.get('presenting_concern', '')
            if primary:
                summary_parts.append(f"The patient presents with: {primary[:150]}...")
        
        # Risk level
        if 'risk_assessment' in module_results:
            risk = module_results['risk_assessment']
            risk_level = risk.get('risk_level', '')
            if risk_level:
                summary_parts.append(f"Risk assessment indicates {risk_level} risk level.")
        
        # Screening results
        if 'scid_screening' in module_results:
            screening = module_results['scid_screening']
            positive_count = len([r for r in screening.get('responses', {}).values() 
                                 if isinstance(r, dict) and r.get('is_yes', False)])
            if positive_count > 0:
                summary_parts.append(f"SCID-5-SC screening identified {positive_count} areas of concern.")
        
        # Diagnostic results
        if 'scid_cv_diagnostic' in module_results:
            cv_results = module_results['scid_cv_diagnostic']
            result = cv_results.get('result', {})
            if result.get('criteria_met'):
                module_name = cv_results.get('module_name', 'diagnostic assessment')
                summary_parts.append(f"SCID-5-CV diagnostic assessment for {module_name} indicates criteria are met.")
        
        if summary_parts:
            section += " ".join(summary_parts) + "\n\n"
        else:
            section += "Assessment data has been collected and reviewed.\n\n"
        
        # Recommendations
        section += "### Recommendations\n\n"
        
        recommendations = []
        
        # Risk-based recommendations
        if 'risk_assessment' in module_results:
            risk = module_results['risk_assessment']
            risk_level = risk.get('risk_level', '')
            if risk_level and risk_level.lower() in ['high', 'critical']:
                recommendations.append("Immediate safety assessment and intervention recommended.")
            elif risk_level and risk_level.lower() == 'moderate':
                recommendations.append("Continued monitoring and support recommended.")
        
        # Diagnostic-based recommendations
        if 'scid_cv_diagnostic' in module_results:
            cv_results = module_results['scid_cv_diagnostic']
            result = cv_results.get('result', {})
            if result.get('criteria_met'):
                recommendations.append("Comprehensive treatment planning recommended based on diagnostic findings.")
                recommendations.append("Consider evidence-based interventions appropriate for the identified condition.")
            else:
                recommendations.append("Continued monitoring and supportive care recommended.")
        
        # General recommendations
        if 'presenting_concern' in module_results:
            concern = module_results['presenting_concern']
            severity = concern.get('severity_assessment') or concern.get('hpi_severity', '')
            if severity and severity.lower() in ['moderate', 'severe']:
                recommendations.append("Symptom severity warrants active treatment intervention.")
        
        if not recommendations:
            recommendations.append("Regular follow-up and supportive care recommended.")
            recommendations.append("Patient should be monitored for symptom changes.")
        
        for i, rec in enumerate(recommendations, 1):
            section += f"{i}. {rec}\n"
        
        section += "\n"
        
        # Follow-up
        section += "### Follow-Up\n\n"
        section += "A detailed treatment plan should be developed based on these assessment findings. "
        section += "Regular follow-up appointments are recommended to monitor progress and adjust interventions as needed.\n"
        
        return section
    
    def _build_sra_results(self, module_results: Dict[str, Any]) -> str:
        """Build SRA (Symptom Recognition and Analysis) results section"""
        
        sra = module_results.get('sra_symptom_recognition', {})
        if not sra:
            return ""
        
        parts = []
        
        # Final symptoms
        final_symptoms = sra.get('final_symptoms', [])
        if final_symptoms:
            symptom_names = [s.get('name', s) if isinstance(s, dict) else str(s) for s in final_symptoms[:5]]
            parts.append(f"confirmed symptoms including {', '.join(symptom_names)}")
        
        # Confirmed vs extracted
        confirmed = sra.get('confirmed_symptoms', [])
        extracted = sra.get('extracted_symptoms', [])
        if confirmed and extracted:
            parts.append(f"with {len(confirmed)} of {len(extracted)} extracted symptoms confirmed")
        
        # Patient additions
        additions = sra.get('patient_additions', [])
        if additions:
            parts.append(f"and added {len(additions)} additional symptoms")
        
        if parts:
            return "The symptom recognition analysis indicates the patient " + ", ".join(parts) + "."
        
        return ""
    
    def _build_da_results(self, module_results: Dict[str, Any]) -> str:
        """Build DA (Diagnostic Analysis) results section"""
        
        da = module_results.get('da_diagnostic_analysis', {})
        if not da:
            return ""
        
        parts = []
        
        # Primary diagnosis
        primary_diagnosis = da.get('primary_diagnosis', {})
        if isinstance(primary_diagnosis, dict):
            diagnosis_name = primary_diagnosis.get('diagnosis') or primary_diagnosis.get('name', '')
            if diagnosis_name:
                parts.append(f"received a diagnostic analysis indicating {diagnosis_name}")
            
            severity = primary_diagnosis.get('severity', '')
            if severity:
                parts.append(f"with {severity} severity")
        elif isinstance(primary_diagnosis, str) and primary_diagnosis:
            parts.append(f"received a diagnostic analysis indicating {primary_diagnosis}")
        
        # Confidence score
        confidence = da.get('confidence_score', 0)
        if confidence > 0:
            parts.append(f"with {confidence:.0%} confidence")
        
        # Differential diagnoses
        differential = da.get('differential_diagnoses', [])
        if differential:
            diff_names = [d.get('diagnosis', d.get('name', str(d))) if isinstance(d, dict) else str(d) 
                         for d in differential[:3]]
            parts.append(f"with differential diagnoses including {', '.join(diff_names)}")
        
        if parts:
            return "The diagnostic analysis confirms that " + ", ".join(parts) + "."
        
        return ""
    
    def _build_tpa_results(self, module_results: Dict[str, Any]) -> str:
        """Build TPA (Treatment Planning Agent) results section"""
        
        tpa = module_results.get('tpa_treatment_planning', {})
        if not tpa:
            return ""
        
        parts = []
        
        # Treatment plan
        treatment_plan = tpa.get('treatment_plan', {})
        if isinstance(treatment_plan, dict):
            # Primary intervention
            primary_intervention = treatment_plan.get('primary_intervention', {})
            if isinstance(primary_intervention, dict):
                intervention_name = primary_intervention.get('name') or primary_intervention.get('intervention', '')
                if intervention_name:
                    parts.append(f"a personalized treatment plan with primary intervention: {intervention_name}")
            elif isinstance(primary_intervention, str):
                parts.append(f"a personalized treatment plan with primary intervention: {primary_intervention}")
            
            # Complementary strategies
            complementary = treatment_plan.get('complementary_strategies', [])
            if complementary:
                parts.append(f"supported by {len(complementary)} complementary treatment strategies")
            
            # Follow-up schedule
            follow_up = treatment_plan.get('follow_up_schedule', {})
            if isinstance(follow_up, dict) and follow_up:
                parts.append(f"with recommended follow-up schedule")
            elif isinstance(follow_up, str) and follow_up:
                parts.append(f"with follow-up: {follow_up}")
            
            # Expected outcomes
            outcomes = treatment_plan.get('expected_outcomes', [])
            if outcomes:
                parts.append(f"with expected outcomes including improved {outcomes[0] if isinstance(outcomes[0], str) else 'symptoms'}")
        
        # Patient goals
        patient_goals = tpa.get('patient_goals', [])
        if patient_goals:
            parts.append(f"aligned with {len(patient_goals)} patient-identified goals")
        
        if parts:
            return "The treatment planning process has developed " + ", ".join(parts) + "."
        
        return ""
    
    def _format_module_names(self, module_names: List[str]) -> List[str]:
        """Format module names for display"""
        name_map = {
            'demographics': 'Demographics',
            'presenting_concern': 'Presenting Concern Assessment',
            'risk_assessment': 'Risk Assessment',
            'scid_screening': 'SCID-5-SC Screening',
            'scid_cv_diagnostic': 'SCID-5-CV Diagnostic Assessment',
            'sra_symptom_recognition': 'Symptom Recognition and Analysis',
            'da_diagnostic_analysis': 'Diagnostic Analysis',
            'tpa_treatment_planning': 'Treatment Planning'
        }
        
        return [name_map.get(name, name.replace('_', ' ').title()) for name in module_names]


def generate_comprehensive_report(session_id: str) -> str:
    """
    Convenience function to generate comprehensive assessment report.
    
    Args:
        session_id: Assessment session identifier
        
    Returns:
        Natural language report string
    """
    generator = ComprehensiveReportGenerator()
    return generator.generate_report(session_id)

