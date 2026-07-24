"""Age-appropriate assessment question bank.
Skill categories: memory, logic, attention, pattern, problem_solving
"""

QUESTIONS = {
    "3-5": [
        {"id": "q1", "skill": "pattern", "prompt": "Which shape comes next? Circle, Square, Circle, Square, ?", "options": ["Circle", "Triangle", "Star", "Square"], "answer": 0},
        {"id": "q2", "skill": "memory", "prompt": "Look at these fruits. Apple, Banana, Cherry. Which fruit was in the MIDDLE?", "options": ["Apple", "Banana", "Cherry", "Grape"], "answer": 1},
        {"id": "q3", "skill": "logic", "prompt": "Which one is the biggest?", "options": ["Ant", "Cat", "Elephant", "Mouse"], "answer": 2},
        {"id": "q4", "skill": "attention", "prompt": "How many red apples? A B C D (imagine 3 red apples)", "options": ["1", "2", "3", "4"], "answer": 2},
        {"id": "q5", "skill": "pattern", "prompt": "Red, Blue, Red, Blue, ?", "options": ["Yellow", "Red", "Green", "Blue"], "answer": 3},
        {"id": "q6", "skill": "problem_solving", "prompt": "What do you use to draw a picture?", "options": ["Fork", "Crayon", "Spoon", "Cup"], "answer": 1},
        {"id": "q7", "skill": "logic", "prompt": "Which animal says 'Woof'?", "options": ["Cat", "Cow", "Dog", "Duck"], "answer": 2},
        {"id": "q8", "skill": "memory", "prompt": "A dog has how many legs?", "options": ["2", "3", "4", "5"], "answer": 2},
    ],
    "6-8": [
        {"id": "q1", "skill": "logic", "prompt": "If today is Monday, what day is tomorrow?", "options": ["Sunday", "Tuesday", "Friday", "Wednesday"], "answer": 1},
        {"id": "q2", "skill": "pattern", "prompt": "Complete the pattern: 2, 4, 6, 8, ?", "options": ["9", "10", "11", "12"], "answer": 1},
        {"id": "q3", "skill": "memory", "prompt": "Which of these is NOT a color of the rainbow?", "options": ["Red", "Blue", "Brown", "Green"], "answer": 2},
        {"id": "q4", "skill": "problem_solving", "prompt": "You have 5 candies. You give 2 to your friend. How many are left?", "options": ["2", "3", "4", "5"], "answer": 1},
        {"id": "q5", "skill": "attention", "prompt": "Which word is spelled correctly?", "options": ["Kat", "Cat", "Catt", "Kaat"], "answer": 1},
        {"id": "q6", "skill": "logic", "prompt": "Which is heavier: 1kg of feathers or 1kg of stones?", "options": ["Feathers", "Stones", "Same weight", "Cannot tell"], "answer": 2},
        {"id": "q7", "skill": "pattern", "prompt": "A, C, E, G, ?", "options": ["H", "I", "J", "K"], "answer": 1},
        {"id": "q8", "skill": "problem_solving", "prompt": "If it is raining, what should you bring?", "options": ["Sunglasses", "Umbrella", "Ice cream", "Book"], "answer": 1},
        {"id": "q9", "skill": "memory", "prompt": "How many days are in a week?", "options": ["5", "6", "7", "8"], "answer": 2},
    ],
    "9-12": [
        {"id": "q1", "skill": "logic", "prompt": "If all Blooks are Croops, and all Croops are Drips, then all Blooks are:", "options": ["Not Drips", "Sometimes Drips", "Drips", "Cannot say"], "answer": 2},
        {"id": "q2", "skill": "pattern", "prompt": "1, 4, 9, 16, 25, ?", "options": ["30", "36", "42", "49"], "answer": 1},
        {"id": "q3", "skill": "problem_solving", "prompt": "A train travels 60 km/h. How far in 2.5 hours?", "options": ["120 km", "130 km", "150 km", "180 km"], "answer": 2},
        {"id": "q4", "skill": "memory", "prompt": "What is the capital of France?", "options": ["London", "Berlin", "Paris", "Madrid"], "answer": 2},
        {"id": "q5", "skill": "attention", "prompt": "Which word does NOT belong: Apple, Banana, Carrot, Grape", "options": ["Apple", "Banana", "Carrot", "Grape"], "answer": 2},
        {"id": "q6", "skill": "logic", "prompt": "If 3x + 6 = 15, what is x?", "options": ["2", "3", "4", "5"], "answer": 1},
        {"id": "q7", "skill": "pattern", "prompt": "Which figure completes: Triangle, Square, Pentagon, ?", "options": ["Circle", "Hexagon", "Star", "Rectangle"], "answer": 1},
        {"id": "q8", "skill": "problem_solving", "prompt": "You have 12 apples to share equally among 4 kids. Each gets?", "options": ["2", "3", "4", "6"], "answer": 1},
        {"id": "q9", "skill": "memory", "prompt": "How many planets are in our solar system?", "options": ["7", "8", "9", "10"], "answer": 1},
        {"id": "q10", "skill": "attention", "prompt": "Count the letter 'e' in: 'Every elephant enjoys eating early'", "options": ["4", "5", "6", "7"], "answer": 2},
    ],
    "13-16": [
        {"id": "q1", "skill": "logic", "prompt": "If some Zoggs are Boffs and all Boffs are Cluggs, which must be true?", "options": ["All Zoggs are Cluggs", "Some Zoggs are Cluggs", "No Zoggs are Cluggs", "All Cluggs are Zoggs"], "answer": 1},
        {"id": "q2", "skill": "pattern", "prompt": "2, 6, 12, 20, 30, ?", "options": ["40", "42", "44", "46"], "answer": 1},
        {"id": "q3", "skill": "problem_solving", "prompt": "A shirt costs $40 after a 20% discount. What was the original price?", "options": ["$48", "$50", "$52", "$60"], "answer": 1},
        {"id": "q4", "skill": "memory", "prompt": "Who wrote 'Romeo and Juliet'?", "options": ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"], "answer": 1},
        {"id": "q5", "skill": "attention", "prompt": "Find the odd one out: 121, 144, 169, 200, 225", "options": ["121", "144", "200", "225"], "answer": 2},
        {"id": "q6", "skill": "logic", "prompt": "If A > B and B > C, then:", "options": ["A < C", "A = C", "A > C", "Cannot say"], "answer": 2},
        {"id": "q7", "skill": "pattern", "prompt": "Sequence: 1, 1, 2, 3, 5, 8, ?", "options": ["11", "12", "13", "15"], "answer": 2},
        {"id": "q8", "skill": "problem_solving", "prompt": "A rectangle has area 48 and length 8. Its width is:", "options": ["4", "5", "6", "8"], "answer": 2},
        {"id": "q9", "skill": "memory", "prompt": "The chemical symbol for Gold is:", "options": ["Go", "Gd", "Au", "Ag"], "answer": 2},
        {"id": "q10", "skill": "attention", "prompt": "Which word is a synonym for 'ephemeral'?", "options": ["Eternal", "Fleeting", "Solid", "Ancient"], "answer": 1},
    ],
}

SKILL_LABELS = {
    "memory": "Memory",
    "logic": "Logical Thinking",
    "attention": "Attention",
    "pattern": "Pattern Recognition",
    "problem_solving": "Problem Solving",
}


def get_questions(age_group: str):
    return QUESTIONS.get(age_group, [])
