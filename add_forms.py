import json
import os

# Read the existing registry
registry_path = r"d:\FAP App\FAP_NextGen\src\data\forms\registry.json"

with open(registry_path, 'r', encoding='utf-8') as f:
    registry = json.load(f)

# New forms to add
new_forms = [
    {
        "form_id": "anthropometric_assessment_v1",
        "title": "Anthropometric Assessment",
        "auto_calculate": ["bmi", "whr", "bmi_category", "ibw"],
        "fields": [
            {
                "key": "assessment_date",
                "label": "Assessment Date",
                "type": "date",
                "required": True
            },
            {
                "key": "height_cm",
                "label": "Height (cm)",
                "type": "number",
                "required": True,
                "min": 40,
                "max": 250,
                "step": 0.1
            },
            {
                "key": "weight_kg",
                "label": "Weight (kg)",
                "type": "number",
                "required": True,
                "min": 1,
                "max": 300,
                "step": 0.1
            },
            {
                "key": "muac_cm",
                "label": "Mid-Upper Arm Circumference - MUAC (cm)",
                "type": "number",
                "min": 5,
                "max": 50,
                "step": 0.1,
                "help": "For children 6-59 months and pregnant women"
            },
            {
                "key": "waist_cm",
                "label": "Waist Circumference (cm)",
                "type": "number",
                "min": 30,
                "max": 200,
                "step": 0.1
            },
            {
                "key": "hip_cm",
                "label": "Hip Circumference (cm)",
                "type": "number",
                "min": 40,
                "max": 200,
                "step": 0.1
            },
            {
                "key": "head_circumference_cm",
                "label": "Head Circumference (cm)",
                "type": "number",
                "min": 25,
                "max": 70,
                "step": 0.1,
                "help": "For infants and children under 3 years"
            },
            {
                "key": "chest_circumference_cm",
                "label": "Chest Circumference (cm)",
                "type": "number",
                "min": 30,
                "max": 150,
                "step": 0.1
            }
        ]
    },
    {
        "form_id": "phq9_depression_screening_v1",
        "title": "PHQ-9 Depression Screening",
        "description": "Patient Health Questionnaire - 9 items",
        "auto_calculate": ["total_score", "severity"],
        "fields": [
            {
                "key": "screening_date",
                "label": "Screening Date",
                "type": "date",
                "required": True
            },
            {
                "key": "q1_interest",
                "label": "1. Little interest or pleasure in doing things",
                "type": "select",
                "required": True,
                "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
                "scores": [0, 1, 2, 3]
            },
            {
                "key": "q2_depressed",
                "label": "2. Feeling down, depressed, or hopeless",
                "type": "select",
                "required": True,
                "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
                "scores": [0, 1, 2, 3]
            },
            {
                "key": "q3_sleep",
                "label": "3. Trouble falling/staying asleep, or sleeping too much",
                "type": "select",
                "required": True,
                "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
                "scores": [0, 1, 2, 3]
            },
            {
                "key": "q4_energy",
                "label": "4. Feeling tired or having little energy",
                "type": "select",
                "required": True,
                "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
                "scores": [0, 1, 2, 3]
            },
            {
                "key": "q5_appetite",
                "label": "5. Poor appetite or overeating",
                "type": "select",
                "required": True,
                "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
                "scores": [0, 1, 2, 3]
            },
            {
                "key": "q6_self_worth",
                "label": "6. Feeling bad about yourself or that you are a failure",
                "type": "select",
                "required": True,
                "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
                "scores": [0, 1, 2, 3]
            },
            {
                "key": "q7_concentration",
                "label": "7. Trouble concentrating on things",
                "type": "select",
                "required": True,
                "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
                "scores": [0, 1, 2, 3]
            },
            {
                "key": "q8_movement",
                "label": "8. Moving or speaking slowly, or being fidgety/restless",
                "type": "select",
                "required": True,
                "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
                "scores": [0, 1, 2, 3]
            },
            {
                "key": "q9_self_harm",
                "label": "9. Thoughts of being better off dead or hurting yourself",
                "type": "select",
                "required": True,
                "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
                "scores": [0, 1, 2, 3]
            }
        ]
    },
    {
        "form_id": "gad7_anxiety_screening_v1",
        "title": "GAD-7 Anxiety Screening",
        "description": "Generalized Anxiety Disorder - 7 items",
        "auto_calculate": ["total_score", "severity"],
        "fields": [
            {
                "key": "screening_date",
                "label": "Screening Date",
                "type": "date",
                "required": True
            },
            {
                "key": "q1_nervous",
                "label": "1. Feeling nervous, anxious, or on edge",
                "type": "select",
                "required": True,
                "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
                "scores": [0, 1, 2, 3]
            },
            {
                "key": "q2_control_worry",
                "label": "2. Not being able to stop or control worrying",
                "type": "select",
                "required": True,
                "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
                "scores": [0, 1, 2, 3]
            },
            {
                "key": "q3_worry_much",
                "label": "3. Worrying too much about different things",
                "type": "select",
                "required": True,
                "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
                "scores": [0, 1, 2, 3]
            },
            {
                "key": "q4_relax",
                "label": "4. Trouble relaxing",
                "type": "select",
                "required": True,
                "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
                "scores": [0, 1, 2, 3]
            },
            {
                "key": "q5_restless",
                "label": "5. Being so restless that it's hard to sit still",
                "type": "select",
                "required": True,
                "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
                "scores": [0, 1, 2, 3]
            },
            {
                "key": "q6_irritable",
                "label": "6. Becoming easily annoyed or irritable",
                "type": "select",
                "required": True,
                "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
                "scores": [0, 1, 2, 3]
            },
            {
                "key": "q7_afraid",
                "label": "7. Feeling afraid as if something awful might happen",
                "type": "select",
                "required": True,
                "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
                "scores": [0, 1, 2, 3]
            }
        ]
    }
]

# Add new forms to registry
for form in new_forms:
    # Check if form already exists
    exists = any(f['form_id'] == form['form_id'] for f in registry)
    if not exists:
        registry.append(form)
        print(f"Added: {form['title']}")
    else:
        print(f"Skipped (already exists): {form['title']}")

# Write back to file
with open(registry_path, 'w', encoding='utf-8') as f:
    json.dump(registry, f, indent=4, ensure_ascii=False)

print(f"\n✅ Registry updated successfully!")
print(f"Total forms: {len(registry)}")
