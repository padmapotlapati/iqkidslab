"""Expanded question bank for Kids IQ Test.

Each question:
  id: str (unique)
  age_group: "3-5" | "6-8" | "9-12" | "13-16"
  category: 10 categories (see CATEGORIES)
  question_type: kind of interaction
  difficulty: 1..5
  prompt: str
  image: optional emoji or short symbol shown as visual
  options: list[str]
  answer: int index
  explanation: str
  estimated_time: seconds
  points: base points
  tags: list[str]
  language: "en"
  status: "active"
"""

CATEGORIES = [
    "logical_reasoning",
    "visual_intelligence",
    "pattern_recognition",
    "memory",
    "attention",
    "processing_speed",
    "mathematical_thinking",
    "language_skills",
    "creativity",
    "problem_solving",
]

CATEGORY_LABELS = {
    "logical_reasoning": "Logical Reasoning",
    "visual_intelligence": "Visual Intelligence",
    "pattern_recognition": "Pattern Recognition",
    "memory": "Memory",
    "attention": "Attention",
    "processing_speed": "Processing Speed",
    "mathematical_thinking": "Mathematical Thinking",
    "language_skills": "Language Skills",
    "creativity": "Creativity",
    "problem_solving": "Problem Solving",
}

# Timers per age group (seconds per question)
QUESTION_TIME = {"3-5": 30, "6-8": 25, "9-12": 20, "13-16": 18}

# Total questions per session
SESSION_LENGTH = {"3-5": 10, "6-8": 12, "9-12": 15, "13-16": 15}


def _q(qid, age, cat, qtype, diff, prompt, options, answer, explanation, image="", time=20, points=10, tags=None):
    return {
        "id": qid, "age_group": age, "category": cat, "question_type": qtype,
        "difficulty": diff, "prompt": prompt, "image": image, "options": options,
        "answer": answer, "explanation": explanation, "estimated_time": time,
        "points": points, "tags": tags or [], "language": "en", "status": "active",
    }


QUESTIONS = [
    # ============ AGE 3-5 ============
    _q("a5-p1", "3-5", "pattern_recognition", "pattern_completion", 1, "Which shape comes next? Circle, Square, Circle, Square, ?", ["Circle", "Triangle", "Star", "Square"], 0, "The pattern repeats Circle then Square.", "🔵🟨🔵🟨❓", 20, 10, ["shapes"]),
    _q("a5-p2", "3-5", "pattern_recognition", "pattern_completion", 1, "Red, Blue, Red, Blue, ?", ["Yellow", "Red", "Green", "Blue"], 3, "Alternating red and blue.", "🔴🔵🔴🔵❓", 20, 10),
    _q("a5-p3", "3-5", "pattern_recognition", "shape_matching", 2, "Which is the ODD one out?", ["Ball", "Orange", "Balloon", "Book"], 3, "Ball, orange and balloon are round; a book is not.", "", 25, 12),
    _q("a5-m1", "3-5", "memory", "memory_cards", 1, "You saw: Apple, Banana, Cherry. Which was in the MIDDLE?", ["Apple", "Banana", "Cherry", "Grape"], 1, "Banana was the middle fruit.", "🍎🍌🍒", 30, 10),
    _q("a5-m2", "3-5", "memory", "multiple_choice", 1, "How many legs does a dog have?", ["2", "3", "4", "5"], 2, "Dogs walk on four legs.", "🐕", 20, 10),
    _q("a5-l1", "3-5", "logical_reasoning", "multiple_choice", 1, "Which one is BIGGEST?", ["Ant", "Cat", "Elephant", "Mouse"], 2, "An elephant is the largest here.", "🐘", 20, 10),
    _q("a5-l2", "3-5", "logical_reasoning", "multiple_choice", 2, "Which animal says WOOF?", ["Cat", "Cow", "Dog", "Duck"], 2, "Dogs bark 'woof'.", "🐶", 20, 10),
    _q("a5-a1", "3-5", "attention", "focus_challenge", 2, "How many red apples do you see? 🍎🍎🍎", ["1", "2", "3", "4"], 2, "There are 3 apples.", "🍎🍎🍎", 25, 12),
    _q("a5-a2", "3-5", "attention", "focus_challenge", 2, "How many stars? ⭐⭐⭐⭐", ["3", "4", "5", "6"], 1, "Count the stars.", "⭐⭐⭐⭐", 25, 12),
    _q("a5-v1", "3-5", "visual_intelligence", "color_recognition", 1, "What color is the sky on a sunny day?", ["Green", "Blue", "Pink", "Black"], 1, "The sunny sky is blue.", "☀️", 20, 10),
    _q("a5-v2", "3-5", "visual_intelligence", "image_selection", 2, "Which one is round?", ["Book", "Wheel", "Table", "Door"], 1, "A wheel is round.", "", 20, 10),
    _q("a5-ps1", "3-5", "problem_solving", "multiple_choice", 2, "What do you use to draw a picture?", ["Fork", "Crayon", "Spoon", "Cup"], 1, "A crayon is used for drawing.", "✏️", 20, 10),
    _q("a5-ps2", "3-5", "problem_solving", "multiple_choice", 2, "It is raining. What do you take with you?", ["Sunglasses", "Umbrella", "Fan", "Book"], 1, "An umbrella keeps you dry.", "☔", 20, 10),
    _q("a5-mth1", "3-5", "mathematical_thinking", "multiple_choice", 1, "1 + 1 = ?", ["1", "2", "3", "4"], 1, "One plus one is two.", "", 20, 10),
    _q("a5-mth2", "3-5", "mathematical_thinking", "multiple_choice", 2, "2 + 2 = ?", ["3", "4", "5", "6"], 1, "Two plus two is four.", "", 20, 10),
    _q("a5-ln1", "3-5", "language_skills", "multiple_choice", 1, "Which one is a fruit?", ["Chair", "Apple", "Car", "Shoe"], 1, "An apple is a fruit.", "🍎", 20, 10),
    _q("a5-cr1", "3-5", "creativity", "multiple_choice", 2, "You have a box. What could you turn it into?", ["Nothing", "A toy car", "A rock", "A drink"], 1, "Boxes can become toy cars, houses and more!", "", 25, 12),
    _q("a5-sp1", "3-5", "processing_speed", "reaction_speed", 2, "Quick! Which is bigger: 🐘 or 🐜 ?", ["🐜", "🐘", "Same", "Cannot say"], 1, "Elephant is bigger.", "", 15, 12),

    # ============ AGE 6-8 ============
    _q("a8-l1", "6-8", "logical_reasoning", "multiple_choice", 2, "If today is Monday, what day is tomorrow?", ["Sunday", "Tuesday", "Friday", "Wednesday"], 1, "Tuesday follows Monday.", "", 20, 10),
    _q("a8-l2", "6-8", "logical_reasoning", "multiple_choice", 3, "Which is heavier: 1kg of feathers or 1kg of stones?", ["Feathers", "Stones", "Same weight", "Cannot tell"], 2, "Both are 1kg — same weight.", "", 25, 15),
    _q("a8-p1", "6-8", "pattern_recognition", "number_series", 2, "Complete the pattern: 2, 4, 6, 8, ?", ["9", "10", "11", "12"], 1, "Add 2 each time.", "", 25, 12),
    _q("a8-p2", "6-8", "pattern_recognition", "alphabet_series", 2, "A, C, E, G, ?", ["H", "I", "J", "K"], 1, "Skip one letter each step.", "", 25, 12),
    _q("a8-p3", "6-8", "pattern_recognition", "pattern_completion", 3, "1, 3, 6, 10, 15, ?", ["18", "20", "21", "25"], 2, "Add 2, 3, 4, 5, 6...", "", 30, 15),
    _q("a8-m1", "6-8", "memory", "multiple_choice", 2, "How many days are in a week?", ["5", "6", "7", "8"], 2, "Seven days a week.", "", 20, 10),
    _q("a8-m2", "6-8", "memory", "multiple_choice", 2, "Which is NOT a color of the rainbow?", ["Red", "Blue", "Brown", "Green"], 2, "Brown is not in the rainbow.", "🌈", 25, 12),
    _q("a8-a1", "6-8", "attention", "focus_challenge", 3, "Which word is spelled correctly?", ["Kat", "Cat", "Catt", "Kaat"], 1, "The correct spelling is 'Cat'.", "", 25, 12),
    _q("a8-a2", "6-8", "attention", "odd_one_out", 3, "Find the odd number: 4, 8, 12, 15, 20", ["4", "8", "15", "20"], 2, "15 is odd; others are even.", "", 25, 12),
    _q("a8-ps1", "6-8", "problem_solving", "math_challenge", 2, "You have 5 candies. You give 2 to a friend. How many are left?", ["2", "3", "4", "5"], 1, "5 minus 2 equals 3.", "🍬", 25, 12),
    _q("a8-ps2", "6-8", "problem_solving", "math_challenge", 3, "You have 12 stickers to share equally with 3 friends. Each gets?", ["3", "4", "5", "6"], 1, "12 ÷ 3 = 4.", "", 30, 15),
    _q("a8-mth1", "6-8", "mathematical_thinking", "math_challenge", 2, "3 x 4 = ?", ["7", "10", "12", "15"], 2, "Three fours make twelve.", "", 25, 12),
    _q("a8-mth2", "6-8", "mathematical_thinking", "math_challenge", 3, "Half of 20 is:", ["8", "10", "12", "15"], 1, "20 ÷ 2 = 10.", "", 25, 15),
    _q("a8-v1", "6-8", "visual_intelligence", "spatial_intelligence", 3, "How many sides does a hexagon have?", ["5", "6", "7", "8"], 1, "A hexagon has 6 sides.", "⬡", 25, 12),
    _q("a8-v2", "6-8", "visual_intelligence", "shape_matching", 3, "Which shape has 3 sides?", ["Square", "Triangle", "Circle", "Rectangle"], 1, "A triangle has 3 sides.", "🔺", 20, 12),
    _q("a8-ln1", "6-8", "language_skills", "word_matching", 2, "Which word rhymes with 'CAT'?", ["Dog", "Bat", "Fish", "Sun"], 1, "'Bat' rhymes with 'cat'.", "", 20, 10),
    _q("a8-ln2", "6-8", "language_skills", "multiple_choice", 3, "The opposite of 'HAPPY' is:", ["Angry", "Sad", "Sleepy", "Loud"], 1, "'Sad' is the opposite of happy.", "", 20, 10),
    _q("a8-cr1", "6-8", "creativity", "multiple_choice", 3, "A cloud that looks like an elephant... what could it also be?", ["Only an elephant", "A tree", "A whale", "A rock"], 2, "Great imaginations see many shapes in clouds!", "☁️", 25, 12),
    _q("a8-sp1", "6-8", "processing_speed", "reaction_speed", 3, "Quick! Which is 2+3?", ["4", "5", "6", "7"], 1, "2+3=5.", "", 12, 15),

    # ============ AGE 9-12 ============
    _q("a12-l1", "9-12", "logical_reasoning", "logic_puzzle", 3, "If all Blooks are Croops, and all Croops are Drips, then all Blooks are:", ["Not Drips", "Sometimes Drips", "Drips", "Cannot say"], 2, "By transitive logic, Blooks are Drips.", "", 40, 15),
    _q("a12-l2", "9-12", "logical_reasoning", "math_challenge", 3, "If 3x + 6 = 15, what is x?", ["2", "3", "4", "5"], 1, "3x=9, so x=3.", "", 40, 15),
    _q("a12-l3", "9-12", "logical_reasoning", "story_logic", 4, "Anna is taller than Bob. Bob is taller than Chris. Who is shortest?", ["Anna", "Bob", "Chris", "Cannot say"], 2, "Chris is shortest.", "", 30, 18),
    _q("a12-p1", "9-12", "pattern_recognition", "number_series", 3, "1, 4, 9, 16, 25, ?", ["30", "36", "42", "49"], 1, "Squares: 6² = 36.", "", 30, 15),
    _q("a12-p2", "9-12", "pattern_recognition", "pattern_completion", 3, "Triangle(3), Square(4), Pentagon(5), Hexagon(?)", ["5", "6", "7", "8"], 1, "Hexagon has 6 sides.", "", 25, 12),
    _q("a12-p3", "9-12", "pattern_recognition", "number_series", 4, "2, 6, 12, 20, 30, ?", ["36", "40", "42", "44"], 2, "Differences: 4, 6, 8, 10, 12 → next is 42.", "", 35, 18),
    _q("a12-m1", "9-12", "memory", "multiple_choice", 2, "How many planets are in our solar system?", ["7", "8", "9", "10"], 1, "There are 8 planets since Pluto was reclassified.", "🪐", 25, 12),
    _q("a12-m2", "9-12", "memory", "multiple_choice", 3, "What is the capital of France?", ["London", "Berlin", "Paris", "Madrid"], 2, "Paris is the capital of France.", "🇫🇷", 20, 12),
    _q("a12-a1", "9-12", "attention", "focus_challenge", 3, "Count the letter 'e' in: 'Every elephant enjoys eating early'", ["4", "5", "6", "7"], 2, "There are 6 e's.", "", 40, 15),
    _q("a12-a2", "9-12", "attention", "odd_one_out", 3, "Which word does NOT belong: Apple, Banana, Carrot, Grape", ["Apple", "Banana", "Carrot", "Grape"], 2, "Carrot is a vegetable; the rest are fruits.", "", 20, 12),
    _q("a12-ps1", "9-12", "problem_solving", "math_challenge", 3, "A train travels 60 km/h. How far in 2.5 hours?", ["120 km", "130 km", "150 km", "180 km"], 2, "60 × 2.5 = 150.", "", 40, 15),
    _q("a12-ps2", "9-12", "problem_solving", "math_challenge", 4, "You have 12 apples to share equally among 4 kids. Each gets?", ["2", "3", "4", "6"], 1, "12/4 = 3.", "", 25, 15),
    _q("a12-mth1", "9-12", "mathematical_thinking", "math_challenge", 3, "What is 15% of 200?", ["20", "25", "30", "35"], 2, "15% of 200 is 30.", "", 40, 15),
    _q("a12-mth2", "9-12", "mathematical_thinking", "math_challenge", 3, "Perimeter of a square with side 7 is:", ["21", "28", "35", "49"], 1, "4 × 7 = 28.", "", 30, 15),
    _q("a12-v1", "9-12", "visual_intelligence", "spatial_intelligence", 4, "A cube has how many faces?", ["4", "5", "6", "8"], 2, "A cube has 6 faces.", "🎲", 25, 15),
    _q("a12-v2", "9-12", "visual_intelligence", "visual_puzzle", 4, "If you fold a square in half, you get:", ["Triangle", "Rectangle", "Circle", "Pentagon"], 1, "You get a rectangle.", "", 30, 15),
    _q("a12-ln1", "9-12", "language_skills", "word_matching", 3, "A synonym of 'BEGIN' is:", ["End", "Start", "Stop", "Finish"], 1, "'Start' means begin.", "", 20, 12),
    _q("a12-ln2", "9-12", "language_skills", "multiple_choice", 3, "Which is a verb?", ["Happy", "Run", "Blue", "Cat"], 1, "'Run' is an action verb.", "", 20, 12),
    _q("a12-cr1", "9-12", "creativity", "multiple_choice", 3, "Which of these is the MOST creative use of a paperclip?", ["Hold paper", "Bookmark", "Tiny sculpture wire", "Trash it"], 2, "Turning a paperclip into art is creative!", "", 30, 15),
    _q("a12-sp1", "9-12", "processing_speed", "reaction_speed", 3, "Quick! 9 × 8 = ?", ["64", "72", "81", "56"], 1, "9 × 8 = 72.", "", 12, 15),
    _q("a12-sp2", "9-12", "processing_speed", "reaction_speed", 4, "Which is fastest: bike, plane, car?", ["Bike", "Plane", "Car", "Same"], 1, "Planes are fastest.", "", 10, 12),

    # ============ AGE 13-16 ============
    _q("a16-l1", "13-16", "logical_reasoning", "logic_puzzle", 4, "If some Zoggs are Boffs and all Boffs are Cluggs, which MUST be true?", ["All Zoggs are Cluggs", "Some Zoggs are Cluggs", "No Zoggs are Cluggs", "All Cluggs are Zoggs"], 1, "Only 'some Zoggs are Cluggs' must be true.", "", 45, 20),
    _q("a16-l2", "13-16", "logical_reasoning", "multiple_choice", 4, "If A > B and B > C, then:", ["A < C", "A = C", "A > C", "Cannot say"], 2, "By transitivity, A > C.", "", 30, 18),
    _q("a16-l3", "13-16", "logical_reasoning", "logic_puzzle", 5, "All roses are flowers. Some flowers fade quickly. So:", ["All roses fade quickly", "Some roses may fade quickly", "No roses fade", "Roses are not flowers"], 1, "We only know SOME flowers fade — roses may or may not.", "", 45, 22),
    _q("a16-p1", "13-16", "pattern_recognition", "number_series", 4, "2, 6, 12, 20, 30, ?", ["40", "42", "44", "46"], 1, "Add 4, 6, 8, 10, 12 → 42.", "", 40, 18),
    _q("a16-p2", "13-16", "pattern_recognition", "number_series", 4, "Fibonacci: 1, 1, 2, 3, 5, 8, ?", ["11", "12", "13", "15"], 2, "Add the previous two: 5+8=13.", "", 40, 20),
    _q("a16-p3", "13-16", "pattern_recognition", "pattern_completion", 5, "3, 6, 11, 18, 27, ?", ["36", "38", "40", "42"], 1, "Differences 3,5,7,9,11 → next 38.", "", 45, 22),
    _q("a16-m1", "13-16", "memory", "multiple_choice", 3, "Who wrote 'Romeo and Juliet'?", ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"], 1, "Shakespeare wrote Romeo and Juliet.", "📖", 25, 15),
    _q("a16-m2", "13-16", "memory", "multiple_choice", 3, "The chemical symbol for Gold is:", ["Go", "Gd", "Au", "Ag"], 2, "Gold is Au (from Latin 'aurum').", "", 25, 15),
    _q("a16-a1", "13-16", "attention", "odd_one_out", 4, "Find the odd one: 121, 144, 169, 200, 225", ["121", "144", "200", "225"], 2, "200 is not a perfect square.", "", 40, 18),
    _q("a16-a2", "13-16", "attention", "focus_challenge", 4, "Count the vowels in: 'Extraordinary'", ["4", "5", "6", "7"], 1, "E, a, o, i, a, y — 5 vowels (a,e,i,o,u only) = 5.", "", 35, 18),
    _q("a16-ps1", "13-16", "problem_solving", "math_challenge", 4, "A shirt costs $40 after a 20% discount. Original price?", ["$48", "$50", "$52", "$60"], 1, "$40 / 0.8 = $50.", "", 45, 20),
    _q("a16-ps2", "13-16", "problem_solving", "math_challenge", 4, "A rectangle has area 48 and length 8. Its width is:", ["4", "5", "6", "8"], 2, "48/8 = 6.", "", 30, 18),
    _q("a16-mth1", "13-16", "mathematical_thinking", "math_challenge", 4, "What is √144?", ["10", "11", "12", "14"], 2, "12 × 12 = 144.", "", 25, 18),
    _q("a16-mth2", "13-16", "mathematical_thinking", "math_challenge", 5, "If f(x) = 2x + 3, then f(5) is:", ["8", "10", "13", "16"], 2, "2×5+3 = 13.", "", 30, 20),
    _q("a16-v1", "13-16", "visual_intelligence", "spatial_intelligence", 4, "How many edges does a cube have?", ["8", "10", "12", "16"], 2, "A cube has 12 edges.", "", 35, 18),
    _q("a16-v2", "13-16", "visual_intelligence", "visual_puzzle", 5, "A 3D shape with 4 triangular faces is a:", ["Cube", "Prism", "Tetrahedron", "Sphere"], 2, "A tetrahedron has 4 triangular faces.", "", 40, 20),
    _q("a16-ln1", "13-16", "language_skills", "word_matching", 4, "Which word is a synonym for 'ephemeral'?", ["Eternal", "Fleeting", "Solid", "Ancient"], 1, "'Fleeting' means short-lived.", "", 25, 18),
    _q("a16-ln2", "13-16", "language_skills", "multiple_choice", 4, "'Ubiquitous' means:", ["Rare", "Everywhere", "Small", "Loud"], 1, "'Ubiquitous' means present everywhere.", "", 25, 18),
    _q("a16-cr1", "13-16", "creativity", "multiple_choice", 4, "Which shows the most divergent thinking?", ["Answering only literally", "Inventing 5 new uses for a spoon", "Copying an answer", "Not answering"], 1, "Divergent thinking produces many ideas.", "", 30, 18),
    _q("a16-sp1", "13-16", "processing_speed", "reaction_speed", 4, "Quick! 17 + 24 = ?", ["39", "40", "41", "42"], 2, "17+24=41.", "", 12, 18),
    _q("a16-sp2", "13-16", "processing_speed", "reaction_speed", 4, "Which is larger: 3² or 2³ ?", ["3²", "2³", "Equal", "Cannot say"], 0, "9 > 8.", "", 12, 18),
]


def get_questions_by_age(age_group: str):
    return [q for q in QUESTIONS if q["age_group"] == age_group and q["status"] == "active"]


def public_view(q):
    """Strip answer/explanation for client-facing question."""
    return {k: v for k, v in q.items() if k not in ("answer", "explanation")}
