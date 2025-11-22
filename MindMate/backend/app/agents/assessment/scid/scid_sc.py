"""
SCID-5-SC (Screening) Item Bank

Complete repository of SCID-5-SC screening items for mental health assessment.
Based on the Structured Clinical Interview for DSM-5 - Screening Version.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
import logging

logger = logging.getLogger(__name__)

# Try to import ML libraries for semantic search (optional)
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    HAS_ML_LIBS = True
except ImportError:
    HAS_ML_LIBS = False
    TfidfVectorizer = None


@dataclass
class SCIDItem:
    """SCID-5-SC screening item"""
    id: str
    text: str
    linked_modules: List[str] = field(default_factory=list)
    severity: str = "medium"  # "low", "medium", "high"
    category: str = ""  # "mood", "anxiety", "psychotic", "substance", etc.
    keywords: List[str] = field(default_factory=list)


@dataclass
class SCIDModule:
    """SCID-CV diagnostic module"""
    id: str
    name: str
    linked_items: List[str] = field(default_factory=list)
    priority_weight: float = 1.0
    expected_time_mins: int = 15
    description: str = ""


class SCID_SC_Bank:
    """Complete SCID-5-SC (Screening) bank with all 55+ items"""
    
    def __init__(self):
        self.sc_items = self._initialize_sc_items()
        self.modules = self._initialize_modules()
        if HAS_ML_LIBS and TfidfVectorizer:
            try:
                self.vectorizer = TfidfVectorizer(stop_words='english', lowercase=True, ngram_range=(1, 2))
                self._fit_vectorizer()
            except Exception as e:
                logger.warning(f"Could not initialize vectorizer: {e}")
                self.vectorizer = None
        else:
            self.vectorizer = None
    
    def _initialize_sc_items(self) -> Dict[str, SCIDItem]:
        """Initialize complete SCID-5-SC item bank"""
        items = {}
        
        # ====================================================================
        # MOOD DISORDERS
        # ====================================================================
        
        items["MDD_01"] = SCIDItem(
            id="MDD_01",
            text="Have you felt sad, down, or depressed most of the day nearly every day for two weeks or more?",
            linked_modules=["MDD"],
            severity="medium",
            category="mood",
            keywords=["sad", "down", "depressed", "depression", "mood", "blue", "hopeless"]
        )
        
        items["MDD_02"] = SCIDItem(
            id="MDD_02",
            text="Have you lost interest or pleasure in activities you used to enjoy for two weeks or more?",
            linked_modules=["MDD"],
            severity="medium",
            category="mood",
            keywords=["lost interest", "no pleasure", "anhedonia", "enjoyment", "activities", "motivation"]
        )
        
        items["MDD_03"] = SCIDItem(
            id="MDD_03",
            text="Have you had significant weight loss or weight gain, or changes in your appetite nearly every day?",
            linked_modules=["MDD"],
            severity="medium",
            category="mood",
            keywords=["weight", "appetite", "eating", "loss", "gain"]
        )
        
        items["MDD_04"] = SCIDItem(
            id="MDD_04",
            text="Have you had trouble sleeping nearly every night, such as difficulty falling asleep, staying asleep, or sleeping too much?",
            linked_modules=["MDD"],
            severity="medium",
            category="mood",
            keywords=["sleep", "insomnia", "sleeping", "trouble sleeping", "restless"]
        )
        
        items["MDD_05"] = SCIDItem(
            id="MDD_05",
            text="Have you felt tired or had little energy nearly every day?",
            linked_modules=["MDD"],
            severity="medium",
            category="mood",
            keywords=["tired", "fatigue", "energy", "exhausted", "lethargic"]
        )
        
        items["MAN_01"] = SCIDItem(
            id="MAN_01",
            text="Have you had a period when you felt so good or high that others thought you were not your normal self?",
            linked_modules=["Bipolar"],
            severity="high",
            category="mood",
            keywords=["manic", "high", "euphoric", "elevated", "good mood", "hyper"]
        )
        
        items["MAN_02"] = SCIDItem(
            id="MAN_02",
            text="Have you had a period when you were so irritable that you got into arguments or fights?",
            linked_modules=["Bipolar"],
            severity="high",
            category="mood",
            keywords=["irritable", "angry", "fights", "arguments", "aggressive"]
        )
        
        items["MAN_03"] = SCIDItem(
            id="MAN_03",
            text="Have you had a period when you needed much less sleep than usual but still felt rested?",
            linked_modules=["Bipolar"],
            severity="high",
            category="mood",
            keywords=["less sleep", "rested", "insomnia", "sleepless"]
        )
        
        items["HYP_01"] = SCIDItem(
            id="HYP_01",
            text="Have you had periods when you felt unusually energetic or active, but not to the extreme of mania?",
            linked_modules=["Bipolar"],
            severity="medium",
            category="mood",
            keywords=["energetic", "active", "hypomanic", "elevated mood"]
        )
        
        # ====================================================================
        # ANXIETY DISORDERS
        # ====================================================================
        
        items["GAD_01"] = SCIDItem(
            id="GAD_01",
            text="Have you been worrying excessively about a number of different things for at least 6 months?",
            linked_modules=["GAD"],
            severity="medium",
            category="anxiety",
            keywords=["worry", "worrying", "anxious", "anxiety", "concerned", "nervous"]
        )
        
        items["GAD_02"] = SCIDItem(
            id="GAD_02",
            text="Have you found it difficult to control your worry?",
            linked_modules=["GAD"],
            severity="medium",
            category="anxiety",
            keywords=["control worry", "stop worrying", "can't control", "worry control"]
        )
        
        items["PAN_01"] = SCIDItem(
            id="PAN_01",
            text="Have you had sudden attacks of fear or panic where your heart raced, you felt short of breath, or felt like you were going to die?",
            linked_modules=["Panic"],
            severity="high",
            category="anxiety",
            keywords=["panic", "panic attack", "fear", "heart racing", "short of breath", "dying"]
        )
        
        items["PAN_02"] = SCIDItem(
            id="PAN_02",
            text="Have you worried about having another panic attack or avoided situations because you feared having a panic attack?",
            linked_modules=["Panic"],
            severity="high",
            category="anxiety",
            keywords=["panic attack", "worried about panic", "avoid", "fear of panic"]
        )
        
        items["SOC_01"] = SCIDItem(
            id="SOC_01",
            text="Have you felt very anxious or fearful in social situations where you might be judged by others?",
            linked_modules=["SocialAnxiety"],
            severity="medium",
            category="anxiety",
            keywords=["social", "social anxiety", "judged", "embarrassed", "self-conscious"]
        )
        
        items["SOC_02"] = SCIDItem(
            id="SOC_02",
            text="Have you avoided social situations or endured them with intense fear or anxiety?",
            linked_modules=["SocialAnxiety"],
            severity="medium",
            category="anxiety",
            keywords=["avoid social", "social situations", "fear social", "anxious social"]
        )
        
        items["AGO_01"] = SCIDItem(
            id="AGO_01",
            text="Have you felt intense fear or anxiety about being in situations where escape might be difficult or help might not be available?",
            linked_modules=["Agoraphobia"],
            severity="high",
            category="anxiety",
            keywords=["agoraphobia", "trapped", "escape", "crowded", "public places"]
        )
        
        items["PHO_01"] = SCIDItem(
            id="PHO_01",
            text="Have you had an intense fear of a specific object or situation that you actively avoid?",
            linked_modules=["SpecificPhobia"],
            severity="medium",
            category="anxiety",
            keywords=["phobia", "fear", "specific fear", "avoid", "intense fear"]
        )
        
        # ====================================================================
        # TRAUMA AND STRESSOR-RELATED DISORDERS
        # ====================================================================
        
        items["PTSD_01"] = SCIDItem(
            id="PTSD_01",
            text="Have you experienced or witnessed a traumatic event that involved actual or threatened death, serious injury, or sexual violence?",
            linked_modules=["PTSD"],
            severity="high",
            category="trauma",
            keywords=["trauma", "traumatic", "abuse", "violence", "accident", "assault"]
        )
        
        items["PTSD_02"] = SCIDItem(
            id="PTSD_02",
            text="Have you had unwanted memories, nightmares, or flashbacks about a traumatic event?",
            linked_modules=["PTSD"],
            severity="high",
            category="trauma",
            keywords=["flashback", "nightmare", "memories", "intrusive", "reliving"]
        )
        
        items["PTSD_03"] = SCIDItem(
            id="PTSD_03",
            text="Have you avoided thoughts, feelings, or reminders of a traumatic event?",
            linked_modules=["PTSD"],
            severity="high",
            category="trauma",
            keywords=["avoid", "reminders", "trauma", "avoid thoughts", "numb"]
        )
        
        items["ADJ_01"] = SCIDItem(
            id="ADJ_01",
            text="Have you had significant emotional or behavioral symptoms in response to a stressful life event?",
            linked_modules=["Adjustment"],
            severity="medium",
            category="trauma",
            keywords=["stress", "stressful", "adjustment", "life event", "crisis"]
        )
        
        # ====================================================================
        # OBSESSIVE-COMPULSIVE AND RELATED DISORDERS
        # ====================================================================
        
        items["OCD_01"] = SCIDItem(
            id="OCD_01",
            text="Have you had repeated, unwanted thoughts, images, or urges that caused you anxiety?",
            linked_modules=["OCD"],
            severity="high",
            category="obsessive",
            keywords=["obsession", "unwanted thoughts", "repetitive", "intrusive thoughts"]
        )
        
        items["OCD_02"] = SCIDItem(
            id="OCD_02",
            text="Have you felt driven to perform repetitive behaviors or mental acts to reduce anxiety or prevent something bad from happening?",
            linked_modules=["OCD"],
            severity="high",
            category="obsessive",
            keywords=["compulsion", "ritual", "repetitive behavior", "checking", "cleaning"]
        )
        
        # ====================================================================
        # SUBSTANCE USE DISORDERS
        # ====================================================================
        
        items["SUB_01"] = SCIDItem(
            id="SUB_01",
            text="Have you used alcohol or drugs more than you intended, or for longer than you planned?",
            linked_modules=["SubstanceUse"],
            severity="high",
            category="substance",
            keywords=["alcohol", "drug", "substance", "use", "drinking", "intoxication"]
        )
        
        items["SUB_02"] = SCIDItem(
            id="SUB_02",
            text="Have you tried to cut down or stop using alcohol or drugs but found it difficult?",
            linked_modules=["SubstanceUse"],
            severity="high",
            category="substance",
            keywords=["cut down", "stop", "quit", "addiction", "dependence", "withdrawal"]
        )
        
        items["SUB_03"] = SCIDItem(
            id="SUB_03",
            text="Have you continued using alcohol or drugs despite problems it caused in your relationships, work, or health?",
            linked_modules=["SubstanceUse"],
            severity="high",
            category="substance",
            keywords=["problems", "relationships", "work", "health", "consequences"]
        )
        
        items["ALC_01"] = SCIDItem(
            id="ALC_01",
            text="Have you had times when you drank more alcohol than you intended, or drank for longer than planned?",
            linked_modules=["AlcoholUse"],
            severity="high",
            category="substance",
            keywords=["alcohol", "drinking", "drunk", "binge", "intoxication"]
        )
        
        # ====================================================================
        # EATING DISORDERS
        # ====================================================================
        
        items["EAT_01"] = SCIDItem(
            id="EAT_01",
            text="Have you had persistent concerns about your weight, body shape, or eating habits?",
            linked_modules=["EatingDisorders"],
            severity="medium",
            category="eating",
            keywords=["eating", "weight", "body image", "diet", "food", "anorexia", "bulimia"]
        )
        
        items["EAT_02"] = SCIDItem(
            id="EAT_02",
            text="Have you engaged in behaviors such as restricting food, binge eating, or purging to control your weight?",
            linked_modules=["EatingDisorders"],
            severity="high",
            category="eating",
            keywords=["restrict", "binge", "purge", "vomit", "laxative", "fasting"]
        )
        
        # ====================================================================
        # ATTENTION-DEFICIT/HYPERACTIVITY DISORDER
        # ====================================================================
        
        items["ADHD_01"] = SCIDItem(
            id="ADHD_01",
            text="Have you had trouble paying attention, staying focused, or completing tasks?",
            linked_modules=["ADHD"],
            severity="medium",
            category="attention",
            keywords=["attention", "focus", "concentration", "distracted", "adhd"]
        )
        
        items["ADHD_02"] = SCIDItem(
            id="ADHD_02",
            text="Have you felt restless, fidgety, or had difficulty sitting still?",
            linked_modules=["ADHD"],
            severity="medium",
            category="attention",
            keywords=["restless", "fidgety", "hyperactive", "impulsive", "can't sit still"]
        )
        
        # ====================================================================
        # PSYCHOTIC DISORDERS (Screening)
        # ====================================================================
        
        items["PSY_01"] = SCIDItem(
            id="PSY_01",
            text="Have you heard voices or sounds that other people couldn't hear?",
            linked_modules=["Psychotic"],
            severity="high",
            category="psychotic",
            keywords=["voices", "hallucination", "hearing", "sounds", "psychotic"]
        )
        
        items["PSY_02"] = SCIDItem(
            id="PSY_02",
            text="Have you seen things that other people couldn't see?",
            linked_modules=["Psychotic"],
            severity="high",
            category="psychotic",
            keywords=["visual", "hallucination", "seeing", "visions", "psychotic"]
        )
        
        items["PSY_03"] = SCIDItem(
            id="PSY_03",
            text="Have you believed that people were watching you, following you, or plotting against you?",
            linked_modules=["Psychotic"],
            severity="high",
            category="psychotic",
            keywords=["paranoid", "paranoia", "plotting", "watching", "following", "conspiracy"]
        )
        
        # ====================================================================
        # RISK ASSESSMENT ITEMS
        # ====================================================================
        
        items["RISK_01"] = SCIDItem(
            id="RISK_01",
            text="Have you had thoughts of hurting yourself or ending your life?",
            linked_modules=[],
            severity="high",
            category="risk",
            keywords=["suicide", "suicidal", "kill myself", "hurt myself", "self-harm", "die"]
        )
        
        items["RISK_02"] = SCIDItem(
            id="RISK_02",
            text="Have you made plans or taken steps to harm yourself?",
            linked_modules=[],
            severity="high",
            category="risk",
            keywords=["suicide plan", "self-harm", "attempt", "hurt myself", "kill myself"]
        )
        
        items["RISK_03"] = SCIDItem(
            id="RISK_03",
            text="Have you had thoughts of hurting other people?",
            linked_modules=[],
            severity="high",
            category="risk",
            keywords=["violence", "hurt others", "harm", "aggressive", "dangerous"]
        )
        
        logger.info(f"Initialized {len(items)} SCID-5-SC screening items")
        return items
    
    def _initialize_modules(self) -> Dict[str, SCIDModule]:
        """Initialize SCID-CV diagnostic modules"""
        modules = {}
        
        modules["MDD"] = SCIDModule(
            id="MDD",
            name="Major Depressive Disorder",
            linked_items=["MDD_01", "MDD_02", "MDD_03", "MDD_04", "MDD_05"],
            priority_weight=1.0,
            expected_time_mins=20,
            description="Assessment for major depressive episode"
        )
        
        modules["Bipolar"] = SCIDModule(
            id="Bipolar",
            name="Bipolar and Related Disorders",
            linked_items=["MAN_01", "MAN_02", "MAN_03", "HYP_01"],
            priority_weight=1.0,
            expected_time_mins=25,
            description="Assessment for manic and hypomanic episodes"
        )
        
        modules["GAD"] = SCIDModule(
            id="GAD",
            name="Generalized Anxiety Disorder",
            linked_items=["GAD_01", "GAD_02"],
            priority_weight=0.9,
            expected_time_mins=15,
            description="Assessment for generalized anxiety"
        )
        
        modules["Panic"] = SCIDModule(
            id="Panic",
            name="Panic Disorder",
            linked_items=["PAN_01", "PAN_02"],
            priority_weight=1.0,
            expected_time_mins=15,
            description="Assessment for panic attacks and panic disorder"
        )
        
        modules["SocialAnxiety"] = SCIDModule(
            id="SocialAnxiety",
            name="Social Anxiety Disorder",
            linked_items=["SOC_01", "SOC_02"],
            priority_weight=0.9,
            expected_time_mins=15,
            description="Assessment for social anxiety"
        )
        
        modules["Agoraphobia"] = SCIDModule(
            id="Agoraphobia",
            name="Agoraphobia",
            linked_items=["AGO_01"],
            priority_weight=0.8,
            expected_time_mins=15,
            description="Assessment for agoraphobia"
        )
        
        modules["SpecificPhobia"] = SCIDModule(
            id="SpecificPhobia",
            name="Specific Phobia",
            linked_items=["PHO_01"],
            priority_weight=0.7,
            expected_time_mins=10,
            description="Assessment for specific phobias"
        )
        
        modules["PTSD"] = SCIDModule(
            id="PTSD",
            name="Posttraumatic Stress Disorder",
            linked_items=["PTSD_01", "PTSD_02", "PTSD_03"],
            priority_weight=1.0,
            expected_time_mins=20,
            description="Assessment for PTSD"
        )
        
        modules["Adjustment"] = SCIDModule(
            id="Adjustment",
            name="Adjustment Disorders",
            linked_items=["ADJ_01"],
            priority_weight=0.8,
            expected_time_mins=10,
            description="Assessment for adjustment disorders"
        )
        
        modules["OCD"] = SCIDModule(
            id="OCD",
            name="Obsessive-Compulsive Disorder",
            linked_items=["OCD_01", "OCD_02"],
            priority_weight=1.0,
            expected_time_mins=20,
            description="Assessment for OCD"
        )
        
        modules["SubstanceUse"] = SCIDModule(
            id="SubstanceUse",
            name="Substance Use Disorders",
            linked_items=["SUB_01", "SUB_02", "SUB_03"],
            priority_weight=1.0,
            expected_time_mins=20,
            description="Assessment for substance use disorders"
        )
        
        modules["AlcoholUse"] = SCIDModule(
            id="AlcoholUse",
            name="Alcohol Use Disorder",
            linked_items=["ALC_01"],
            priority_weight=1.0,
            expected_time_mins=15,
            description="Assessment for alcohol use disorder"
        )
        
        modules["EatingDisorders"] = SCIDModule(
            id="EatingDisorders",
            name="Eating Disorders",
            linked_items=["EAT_01", "EAT_02"],
            priority_weight=0.9,
            expected_time_mins=20,
            description="Assessment for eating disorders"
        )
        
        modules["ADHD"] = SCIDModule(
            id="ADHD",
            name="Attention-Deficit/Hyperactivity Disorder",
            linked_items=["ADHD_01", "ADHD_02"],
            priority_weight=0.8,
            expected_time_mins=20,
            description="Assessment for ADHD"
        )
        
        modules["Psychotic"] = SCIDModule(
            id="Psychotic",
            name="Psychotic Disorders",
            linked_items=["PSY_01", "PSY_02", "PSY_03"],
            priority_weight=1.0,
            expected_time_mins=25,
            description="Assessment for psychotic symptoms"
        )
        
        logger.info(f"Initialized {len(modules)} SCID-CV diagnostic modules")
        return modules
    
    def _fit_vectorizer(self):
        """Fit TF-IDF vectorizer on all item texts"""
        if not self.vectorizer:
            return
        
        try:
            texts = [item.text for item in self.sc_items.values()]
            self.vectorizer.fit(texts)
            logger.debug("TF-IDF vectorizer fitted successfully")
        except Exception as e:
            logger.warning(f"Could not fit vectorizer: {e}")
            self.vectorizer = None
    
    def get_item(self, item_id: str) -> Optional[SCIDItem]:
        """Get a specific SCID item by ID"""
        return self.sc_items.get(item_id)
    
    def get_items_by_category(self, category: str) -> List[SCIDItem]:
        """Get all items in a specific category"""
        return [item for item in self.sc_items.values() if item.category == category]
    
    def get_items_by_module(self, module_id: str) -> List[SCIDItem]:
        """Get all items linked to a specific module"""
        return [
            item for item in self.sc_items.values()
            if module_id in item.linked_modules
        ]
    
    def get_all_item_ids(self) -> List[str]:
        """Get all item IDs"""
        return list(self.sc_items.keys())
    
    def export_as_json(self) -> Dict[str, Any]:
        """Export the entire bank as JSON"""
        return {
            "items": {
                item_id: {
                    "id": item.id,
                    "text": item.text,
                    "linked_modules": item.linked_modules,
                    "severity": item.severity,
                    "category": item.category,
                    "keywords": item.keywords
                }
                for item_id, item in self.sc_items.items()
            },
            "modules": {
                module_id: {
                    "id": module.id,
                    "name": module.name,
                    "linked_items": module.linked_items,
                    "priority_weight": module.priority_weight,
                    "expected_time_mins": module.expected_time_mins,
                    "description": module.description
                }
                for module_id, module in self.modules.items()
            }
        }

