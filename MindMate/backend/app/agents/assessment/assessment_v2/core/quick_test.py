"""Quick test to verify enhanced LLM parser works"""
import sys
from pathlib import Path
backend_path = Path(__file__).parent.parent.parent.parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

try:
    from app.agents.assessment.assessment_v2.core.question_metadata_extractor import QuestionMetadataExtractor
    from app.agents.assessment.assessment_v2.core.response_context_builder import ResponseContextBuilder
    from app.agents.assessment.assessment_v2.core.llm_response_parser import LLMResponseParser
    from app.agents.assessment.assessment_v2.modules import create_demographics_module
    from app.agents.assessment.assessment_v2.base_types import ResponseType
    
    # Test metadata extraction
    module = create_demographics_module()
    question = module.questions[0]  # First question
    
    print("Testing QuestionMetadataExtractor...")
    metadata = QuestionMetadataExtractor.extract_question_metadata(question, module)
    print(f"✓ Metadata extracted: {len(metadata)} fields")
    
    print("\nTesting ResponseContextBuilder...")
    context = ResponseContextBuilder.build_context(
        question=question,
        user_response="34",
        conversation_history=[],
        module=module
    )
    print(f"✓ Context built: {len(context)} sections")
    
    print("\nTesting LLMResponseParser...")
    parser = LLMResponseParser()
    processed = parser.parse_response(
        user_response="34",
        question=question,
        conversation_history=[],
        module=module
    )
    print(f"✓ Response parsed: {processed.selected_option} (confidence: {processed.confidence:.2f})")
    
    print("\n✅ All tests passed!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

