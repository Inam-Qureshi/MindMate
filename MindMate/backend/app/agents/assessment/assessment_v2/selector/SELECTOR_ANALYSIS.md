# Selector Decision-Making Analysis

## Overview
This document analyzes the decision-making logic in both selectors:
1. **SCID-SC Items Selector** (`scid_sc_selector.py`) - Selects screening questions
2. **SCID-CV Module Selector** (`module_selector.py`) - Selects diagnostic modules

---

## 1. SCID-SC Items Selector Analysis

### Current Logic Flow

```
1. Data Collection
   ├─ Get session state from database
   ├─ Extract: demographics, presenting_concern, risk_assessment
   └─ Create AssessmentDataSummary object

2. Patient Summary Creation
   ├─ Build natural language summary
   └─ Format: "A 28 years old female is facing depression, anxiety..."

3. Selection Method (Two Paths)
   ├─ Path A: LLM-Based Selection (Primary)
   │  ├─ Create comprehensive prompt with all data
   │  ├─ LLM analyzes and selects items
   │  ├─ Parse JSON response
   │  └─ Validate items exist in SCID bank
   │
   └─ Path B: Rule-Based Selection (Fallback)
      ├─ Simple keyword matching
      ├─ Check concern_text for: sad, depressed, anxious, etc.
      ├─ Check risk_text for: suicide, harm, etc.
      └─ Return matching items with default score (7.0)
```

### Issues Identified

#### 1.1 No Hybrid Approach
- **Problem**: System uses EITHER LLM OR rule-based, never both
- **Impact**: Misses opportunity to combine strengths
- **Fix**: Implement hybrid scoring that combines both methods

#### 1.2 Rule-Based Too Simple
- **Problem**: Only basic keyword matching, no weighting or context
- **Impact**: Low accuracy, misses nuanced cases
- **Fix**: Add weighted scoring, context awareness, symptom severity consideration

#### 1.3 No Validation of LLM Responses
- **Problem**: LLM might return invalid item IDs or items not in bank
- **Impact**: Runtime errors or missing items
- **Fix**: Validate all item IDs against SCID bank before returning

#### 1.4 No Fallback on LLM Parse Failure
- **Problem**: If LLM JSON parsing fails, returns empty list
- **Impact**: No items selected even when rule-based could work
- **Fix**: Fallback to rule-based if LLM parsing fails

#### 1.5 No Scoring/Ranking System
- **Problem**: Items selected but not ranked by relevance
- **Impact**: Less relevant items might be shown first
- **Fix**: Implement relevance scoring and ranking

#### 1.6 No Consideration of SCID Item Categories
- **Problem**: Might select multiple items from same category
- **Impact**: Redundant questions, poor coverage
- **Fix**: Ensure diversity across categories

---

## 2. SCID-CV Module Selector Analysis

### Current Logic Flow

```
1. Data Collection
   ├─ Get all assessment data
   ├─ Create AssessmentDataCollection object
   └─ Convert to summary text

2. ReAct Approach (3 Steps)
   ├─ Step 1: Observation
   │  └─ Create summary of patient data
   │
   ├─ Step 2: Reasoning
   │  ├─ Path A: LLM Reasoning (Primary)
   │  │  ├─ Create detailed prompt
   │  │  ├─ LLM analyzes and selects modules
   │  │  └─ Parse JSON response
   │  │
   │  └─ Path B: Rule-Based (Fallback)
   │     ├─ Keyword matching against module keywords
   │     ├─ Check SCID-SC indicators (weighted +2)
   │     └─ Score and rank modules
   │
   └─ Step 3: Action
      ├─ Format selection result
      └─ Return with reasoning steps
```

### Issues Identified

#### 2.1 Similar Issues to SCID-SC Selector
- No hybrid approach
- Rule-based too simple
- No validation of module IDs
- No fallback on LLM failure

#### 2.2 Module Metadata Hardcoded
- **Problem**: Module info (keywords, indicators) hardcoded in code
- **Impact**: Hard to maintain, update, or extend
- **Fix**: Move to configuration file or database

#### 2.3 No Consideration of Module Dependencies
- **Problem**: Doesn't check if modules have prerequisites
- **Impact**: Might select incompatible modules
- **Fix**: Add dependency checking

#### 2.4 Scoring System Too Basic
- **Problem**: Simple count of matched keywords
- **Impact**: Doesn't reflect clinical importance
- **Fix**: Weighted scoring based on symptom severity, frequency, etc.

---

## 3. Recommended Improvements

### 3.1 Hybrid Selection Approach
Combine LLM and rule-based methods:
```python
def hybrid_selection(data, max_items):
    # Get LLM selections
    llm_items = llm_selection(data, max_items)
    
    # Get rule-based selections
    rule_items = rule_based_selection(data, max_items)
    
    # Combine and score
    combined = merge_and_score(llm_items, rule_items)
    
    # Rank and select top N
    return rank_and_select(combined, max_items)
```

### 3.2 Enhanced Rule-Based Scoring
```python
def enhanced_rule_scoring(item, data):
    score = 0.0
    
    # Base keyword matching (weighted)
    for keyword in item.keywords:
        if keyword in data.concern_text:
            score += keyword_weights[keyword]
    
    # Symptom severity weighting
    if data.severity == "severe":
        score *= 1.5
    elif data.severity == "moderate":
        score *= 1.2
    
    # Risk factor weighting
    if data.risk_level == "high":
        score *= 1.3
    
    # Category diversity bonus
    if category_not_selected_yet(item.category):
        score *= 1.1
    
    return score
```

### 3.3 Validation and Fallback
```python
def select_with_fallback(data, max_items):
    try:
        # Try LLM first
        items = llm_selection(data, max_items)
        
        # Validate items
        validated = validate_items(items)
        
        if len(validated) >= max_items * 0.7:  # 70% threshold
            return validated
        
    except Exception as e:
        logger.warning(f"LLM selection failed: {e}")
    
    # Fallback to rule-based
    rule_items = rule_based_selection(data, max_items)
    
    # If LLM partially worked, merge
    if 'items' in locals():
        return merge_selections(items, rule_items, max_items)
    
    return rule_items
```

### 3.4 Category Diversity
```python
def ensure_category_diversity(items, max_items):
    # Group by category
    by_category = group_by_category(items)
    
    # Select top item from each category
    diverse_items = []
    for category, category_items in by_category.items():
        diverse_items.append(max(category_items, key=lambda x: x.score))
    
    # Fill remaining slots with highest scores
    remaining = max_items - len(diverse_items)
    all_items = sorted(items, key=lambda x: x.score, reverse=True)
    
    for item in all_items:
        if item not in diverse_items and len(diverse_items) < max_items:
            diverse_items.append(item)
    
    return diverse_items
```

---

## 4. Testing Strategy

### 4.1 Accuracy Tests
- Test with known clinical cases
- Compare selections against expert recommendations
- Measure precision/recall

### 4.2 Edge Case Tests
- Empty/minimal data
- Conflicting symptoms
- Multiple comorbidities
- High-risk cases

### 4.3 Performance Tests
- Response time
- LLM failure handling
- Fallback effectiveness

---

## 5. Implementation Priority

1. **High Priority** (Fix Critical Issues)
   - Add validation and fallback logic
   - Fix LLM parse failure handling
   - Improve error messages

2. **Medium Priority** (Improve Accuracy)
   - Implement hybrid selection
   - Enhance rule-based scoring
   - Add category diversity

3. **Low Priority** (Optimize)
   - Move metadata to config
   - Add caching
   - Performance optimization

