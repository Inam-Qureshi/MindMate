# Mental Health Conditions & Diseases - Specialist Coverage

This document lists all mental health conditions, disorders, and issues that specialists can address in the MindMate platform.

## 📋 Mental Health Specialties (Conditions/Diseases)

Based on `MentalHealthSpecialtyEnum` in the codebase, specialists can address the following **15 conditions**:

### 1. **Depression**
   - Description: Major Depressive Disorder and related mood disorders
   - Code: `depression`

### 2. **Anxiety**
   - Description: Generalized Anxiety Disorder, panic attacks, phobias
   - Code: `anxiety`

### 3. **OCD (Obsessive-Compulsive Disorder)**
   - Description: Obsessive-Compulsive Disorder treatment
   - Code: `ocd`

### 4. **PTSD (Post-Traumatic Stress Disorder)**
   - Description: Post-Traumatic Stress Disorder and trauma therapy
   - Code: `ptsd`

### 5. **ADHD (Attention-Deficit/Hyperactivity Disorder)**
   - Description: Attention-Deficit/Hyperactivity Disorder
   - Code: `adhd`

### 6. **Bipolar Disorder**
   - Description: Bipolar I & II disorder management
   - Code: `bipolar_disorder`

### 7. **Eating Disorders**
   - Description: Anorexia, Bulimia, Binge Eating Disorder
   - Code: `eating_disorders`

### 8. **Substance Abuse**
   - Description: Addiction and substance use disorders
   - Code: `substance_abuse`

### 9. **Relationship Issues**
   - Description: Couples therapy and relationship counseling
   - Code: `relationship_issues`

### 10. **Grief & Loss**
    - Description: Bereavement and grief counseling
    - Code: `grief_loss`

### 11. **Stress Management**
    - Description: Stress reduction and coping strategies
    - Code: `stress_management`

### 12. **Panic Disorder**
    - Description: Panic disorder and panic attack management
    - Code: `panic_disorder`

### 13. **Social Anxiety**
    - Description: Social phobia and social anxiety treatment
    - Code: `social_anxiety`

### 14. **Insomnia**
    - Description: Sleep disorders and insomnia treatment
    - Code: `insomnia`

### 15. **Anger Management**
    - Description: Anger control and emotional regulation
    - Code: `anger_management`

---

## 📚 Specialization Areas (Legacy/Additional)

Based on `SpecializationEnum`, there are also these **12 specialization areas**:

1. **Anxiety Disorders** (`anxiety_disorders`)
2. **Depression** (`depression`)
3. **Trauma & PTSD** (`trauma_ptsd`)
4. **Couples Therapy** (`couples_therapy`)
5. **Family Therapy** (`family_therapy`)
6. **Addiction** (`addiction`)
7. **Eating Disorders** (`eating_disorders`)
8. **ADHD** (`adhd`)
9. **Bipolar Disorder** (`bipolar_disorder`)
10. **OCD** (`ocd`)
11. **Personality Disorders** (`personality_disorders`)
12. **Grief Counseling** (`grief_counseling`)
13. **Personal Development** (`personal_development`)

---

## 🛠️ Therapy Methods Available

Specialists can use the following **12 therapy methods** to treat these conditions:

1. **CBT** - Cognitive Behavioral Therapy
2. **DBT** - Dialectical Behavior Therapy
3. **ACT** - Acceptance and Commitment Therapy
4. **Psychoanalysis**
5. **EMDR** - Eye Movement Desensitization and Reprocessing
6. **Humanistic Therapy**
7. **Family Therapy**
8. **Group Therapy**
9. **Mindfulness**
10. **Psychodynamic Therapy**
11. **Solution-Focused Therapy**
12. **Narrative Therapy**

---

## 📊 Summary

- **Total Mental Health Conditions**: 15
- **Total Specialization Areas**: 13
- **Total Therapy Methods**: 12

---

## 📍 Location in Codebase

- **Backend Models**: `/app/models/specialist.py`
  - `MentalHealthSpecialtyEnum` (lines 118-134)
  - `SpecializationEnum` (lines 47-61)
  - `TherapyMethodEnum` (lines 136-150)

- **Backend API**: `/app/api/v1/endpoints/specialist_profile.py`
  - `get_specialty_description()` function (lines 307-326)
  - `get_dropdown_options()` endpoint (line 424)

- **Frontend**: Uses these enums via API endpoint `/api/specialists/dropdown-options`

---

## 🔄 API Endpoint

To get the complete list with descriptions:
```
GET /api/specialists/dropdown-options
```

Returns:
- `mental_health_specialties`: Array of all conditions with descriptions
- `therapy_methods`: Array of all therapy methods with descriptions

---

*Last Updated: Based on codebase analysis*
*File Location: `/app/models/specialist.py`*

