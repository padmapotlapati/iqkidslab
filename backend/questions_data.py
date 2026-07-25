"""Kids IQ Test — Question Bank (v2).

Design:
  - 9 primary skill categories (+ creativity bonus)
  - 4 age groups: 3-5, 6-8, 9-12, 13-16
  - ~80 high-quality questions per age group (~320 total)
  - Difficulty 1..5 mapped to Easy (1-2) / Medium (3) / Hard (4-5)
  - Every assessment session selects 20 questions

Each question has:
  id, age_group, category, question_type, difficulty, difficulty_label,
  prompt, image, options, answer, explanation, estimated_time, points, tags,
  language, status
"""

# The 9 required + 1 optional bonus category
CATEGORIES = [
    "memory",
    "logical_reasoning",
    "pattern_recognition",
    "visual_intelligence",       # "Visual Skills"
    "attention",                 # "Attention & Focus"
    "processing_speed",
    "problem_solving",
    "mathematical_thinking",     # "Math Reasoning"
    "language_skills",
    "creativity",                # bonus – not required
]

CATEGORY_LABELS = {
    "memory": "Memory",
    "logical_reasoning": "Logical Reasoning",
    "pattern_recognition": "Pattern Recognition",
    "visual_intelligence": "Visual Skills",
    "attention": "Attention & Focus",
    "processing_speed": "Processing Speed",
    "problem_solving": "Problem Solving",
    "mathematical_thinking": "Math Reasoning",
    "language_skills": "Language Skills",
    "creativity": "Creativity",
}

# Time budget per question (seconds), scales with age
QUESTION_TIME = {"3-5": 30, "6-8": 25, "9-12": 22, "13-16": 20}

# Every assessment is exactly 20 questions per the product spec
SESSION_LENGTH = {"3-5": 20, "6-8": 20, "9-12": 20, "13-16": 20}


def _label(diff: int) -> str:
    if diff <= 2: return "Easy"
    if diff == 3: return "Medium"
    return "Hard"


def _q(qid, age, cat, qtype, diff, prompt, options, answer, explanation,
       image="", time=20, points=10, tags=None):
    return {
        "id": qid, "age_group": age, "category": cat, "question_type": qtype,
        "difficulty": diff, "difficulty_label": _label(diff),
        "prompt": prompt, "image": image, "options": options,
        "answer": answer, "explanation": explanation,
        "estimated_time": time, "points": points,
        "tags": tags or [], "language": "en", "status": "active",
    }


# =========================================================================
# AGE 3-5 — 80 questions
# =========================================================================
_A5 = [
    # ---- Memory (9) ----
    _q("a5-m01","3-5","memory","multiple_choice",1,"How many legs does a dog have?",["2","3","4","5"],2,"Dogs walk on four legs.","🐕",20,10),
    _q("a5-m02","3-5","memory","memory_cards",1,"You saw: Apple, Banana, Cherry. Which was FIRST?",["Apple","Banana","Cherry","Grape"],0,"Apple was first.","🍎🍌🍒",25,10),
    _q("a5-m03","3-5","memory","memory_cards",1,"You saw: Sun, Moon, Star. Which was LAST?",["Sun","Moon","Star","Cloud"],2,"Star was last.","☀️🌙⭐",25,10),
    _q("a5-m04","3-5","memory","multiple_choice",1,"What sound does a cow make?",["Meow","Moo","Bark","Chirp"],1,"Cows say moo.","🐄",20,10),
    _q("a5-m05","3-5","memory","multiple_choice",2,"What color is grass?",["Blue","Green","Red","Purple"],1,"Grass is green.","🌱",20,10),
    _q("a5-m06","3-5","memory","multiple_choice",2,"Which animal lives in water?",["Cat","Dog","Fish","Bird"],2,"Fish live in water.","🐟",20,10),
    _q("a5-m07","3-5","memory","memory_cards",2,"You saw: Red, Blue, Green, Yellow. Which came SECOND?",["Red","Blue","Green","Yellow"],1,"Blue was second.","🔴🔵🟢🟡",30,12),
    _q("a5-m08","3-5","memory","multiple_choice",1,"What do bees make?",["Milk","Honey","Bread","Water"],1,"Bees make honey.","🐝",20,10),
    _q("a5-m09","3-5","memory","multiple_choice",2,"Which one is a farm animal?",["Lion","Cow","Shark","Tiger"],1,"Cows live on farms.","🐄",20,10),

    # ---- Logical Reasoning (9) ----
    _q("a5-l01","3-5","logical_reasoning","multiple_choice",1,"Which is BIGGEST?",["Ant","Cat","Elephant","Mouse"],2,"Elephant is the biggest.","🐘",20,10),
    _q("a5-l02","3-5","logical_reasoning","multiple_choice",2,"Which animal says WOOF?",["Cat","Cow","Dog","Duck"],2,"Dogs bark woof.","🐶",20,10),
    _q("a5-l03","3-5","logical_reasoning","multiple_choice",1,"Which is SMALLEST?",["Mouse","Dog","Elephant","Horse"],0,"A mouse is smallest.","🐭",20,10),
    _q("a5-l04","3-5","logical_reasoning","multiple_choice",2,"You wear a jacket when it is:",["Hot","Sunny","Cold","Sandy"],2,"Jackets keep us warm when it is cold.","🧥",25,12),
    _q("a5-l05","3-5","logical_reasoning","multiple_choice",2,"Which one is NOT a shape?",["Circle","Apple","Square","Triangle"],1,"Apple is a fruit.","🍎",25,12),
    _q("a5-l06","3-5","logical_reasoning","multiple_choice",2,"Which does NOT fly?",["Bird","Airplane","Fish","Butterfly"],2,"Fish swim, they do not fly.","🐟",25,12),
    _q("a5-l07","3-5","logical_reasoning","multiple_choice",3,"Which is HEAVIEST?",["Feather","Rock","Leaf","Paper"],1,"Rocks are heavy.","🪨",25,13),
    _q("a5-l08","3-5","logical_reasoning","multiple_choice",2,"Ice is very:",["Hot","Cold","Sunny","Warm"],1,"Ice is cold.","🧊",20,10),
    _q("a5-l09","3-5","logical_reasoning","multiple_choice",3,"If it is night, we can see the:",["Sun","Moon","Rainbow","Flower"],1,"The Moon shines at night.","🌙",25,12),

    # ---- Pattern Recognition (9) ----
    _q("a5-p01","3-5","pattern_recognition","pattern_completion",1,"Circle, Square, Circle, Square, ?",["Circle","Triangle","Star","Square"],0,"Pattern repeats.","🔵🟨🔵🟨❓",25,10),
    _q("a5-p02","3-5","pattern_recognition","pattern_completion",1,"Red, Blue, Red, Blue, ?",["Yellow","Red","Green","Blue"],3,"Alternates red/blue.","🔴🔵🔴🔵❓",25,10),
    _q("a5-p03","3-5","pattern_recognition","pattern_completion",2,"🍎🍌🍎🍌 ?",["🍎","🍌","🍒","🍇"],0,"Apple comes next.","",25,11),
    _q("a5-p04","3-5","pattern_recognition","pattern_completion",2,"1, 2, 1, 2, ?",["3","1","2","4"],1,"Alternates 1 and 2.","",25,11),
    _q("a5-p05","3-5","pattern_recognition","pattern_completion",2,"⭐🌙⭐🌙 ?",["⭐","🌙","☀️","🌈"],0,"Star comes next.","",25,11),
    _q("a5-p06","3-5","pattern_recognition","pattern_completion",3,"Up, Down, Up, Down, ?",["Left","Up","Right","Down"],1,"Up follows Down.","",25,12),
    _q("a5-p07","3-5","pattern_recognition","pattern_completion",3,"A, B, A, B, ?",["A","B","C","D"],0,"A comes next.","",25,12),
    _q("a5-p08","3-5","pattern_recognition","shape_matching",2,"Which is ODD one out?",["Ball","Orange","Balloon","Book"],3,"Book is not round.","",30,12),
    _q("a5-p09","3-5","pattern_recognition","pattern_completion",3,"Big, Small, Big, Small, ?",["Small","Big","Tiny","Huge"],1,"Big follows Small.","",25,12),

    # ---- Visual Skills (9) ----
    _q("a5-v01","3-5","visual_intelligence","color_recognition",1,"What color is the sky on a sunny day?",["Green","Blue","Pink","Black"],1,"Sunny sky is blue.","☀️",20,10),
    _q("a5-v02","3-5","visual_intelligence","image_selection",2,"Which one is round?",["Book","Wheel","Table","Door"],1,"Wheels are round.","",20,10),
    _q("a5-v03","3-5","visual_intelligence","color_recognition",1,"A banana is:",["Red","Yellow","Blue","Purple"],1,"Bananas are yellow.","🍌",20,10),
    _q("a5-v04","3-5","visual_intelligence","color_recognition",1,"An apple is often:",["Red","Blue","Black","White"],0,"Apples are red.","🍎",20,10),
    _q("a5-v05","3-5","visual_intelligence","shape_matching",2,"How many corners does a triangle have?",["2","3","4","5"],1,"3 corners.","🔺",25,11),
    _q("a5-v06","3-5","visual_intelligence","shape_matching",2,"A square has how many sides?",["3","4","5","6"],1,"4 sides.","⬜",25,11),
    _q("a5-v07","3-5","visual_intelligence","color_recognition",2,"Snow looks:",["Green","White","Purple","Orange"],1,"Snow is white.","❄️",20,10),
    _q("a5-v08","3-5","visual_intelligence","image_selection",3,"Which is tallest?",["Ant","Cat","Giraffe","Cow"],2,"Giraffe is tallest.","🦒",25,12),
    _q("a5-v09","3-5","visual_intelligence","image_selection",2,"Which shape has no corners?",["Triangle","Square","Circle","Star"],2,"Circle has no corners.","⚪",25,11),

    # ---- Attention & Focus (9) ----
    _q("a5-a01","3-5","attention","focus_challenge",2,"How many apples? 🍎🍎🍎",["1","2","3","4"],2,"Three apples.","🍎🍎🍎",25,11),
    _q("a5-a02","3-5","attention","focus_challenge",2,"How many stars? ⭐⭐⭐⭐",["3","4","5","6"],1,"Four stars.","⭐⭐⭐⭐",25,11),
    _q("a5-a03","3-5","attention","focus_challenge",2,"How many balloons? 🎈🎈",["1","2","3","4"],1,"Two balloons.","🎈🎈",25,11),
    _q("a5-a04","3-5","attention","focus_challenge",3,"How many hearts? ❤️❤️❤️❤️❤️",["3","4","5","6"],2,"Five hearts.","❤️❤️❤️❤️❤️",30,12),
    _q("a5-a05","3-5","attention","odd_one_out",3,"Which is different? 🐶🐶🐱🐶",["First","Second","Third","Fourth"],2,"Third is a cat.","",30,12),
    _q("a5-a06","3-5","attention","odd_one_out",3,"Which is different? ⚪⚪⚪⚫",["First","Second","Third","Fourth"],3,"Last is black.","",30,12),
    _q("a5-a07","3-5","attention","focus_challenge",2,"How many bananas? 🍌🍌🍌🍌🍌🍌",["4","5","6","7"],2,"Six bananas.","🍌🍌🍌🍌🍌🍌",30,12),
    _q("a5-a08","3-5","attention","odd_one_out",3,"Which color is different? 🔴🔴🔵🔴",["First","Second","Third","Fourth"],2,"Third is blue.","",30,12),
    _q("a5-a09","3-5","attention","focus_challenge",3,"How many circles? ⚫⚫⚫⚫⚫⚫⚫",["6","7","8","9"],1,"Seven.","⚫⚫⚫⚫⚫⚫⚫",30,12),

    # ---- Processing Speed (8) ----
    _q("a5-sp01","3-5","processing_speed","reaction_speed",2,"Quick! Which is bigger: 🐘 or 🐜?",["🐜","🐘","Same","Cannot say"],1,"Elephant is bigger.","",15,12),
    _q("a5-sp02","3-5","processing_speed","reaction_speed",2,"Quick! Which is a fruit?",["Chair","Apple","Sock","Cup"],1,"Apple.","🍎",15,12),
    _q("a5-sp03","3-5","processing_speed","reaction_speed",2,"Quick! Which is red?",["Grass","Fire truck","Sky","Snow"],1,"Fire trucks are red.","🚒",15,12),
    _q("a5-sp04","3-5","processing_speed","reaction_speed",2,"Quick! Which flies?",["Fish","Cat","Bird","Rock"],2,"Birds fly.","🐦",15,12),
    _q("a5-sp05","3-5","processing_speed","reaction_speed",3,"Quick! Which is round?",["Book","Ball","Box","Pencil"],1,"Ball.","⚽",15,12),
    _q("a5-sp06","3-5","processing_speed","reaction_speed",2,"Quick! Which is hot?",["Ice","Sun","Snow","Water"],1,"The Sun.","☀️",15,12),
    _q("a5-sp07","3-5","processing_speed","reaction_speed",3,"Quick! Which is a vegetable?",["Apple","Banana","Carrot","Cake"],2,"Carrot.","🥕",15,12),
    _q("a5-sp08","3-5","processing_speed","reaction_speed",3,"Quick! Which is smaller: 🐜 or 🐘?",["🐜","🐘","Same","None"],0,"Ant is tiny.","",15,12),

    # ---- Problem Solving (9) ----
    _q("a5-ps01","3-5","problem_solving","multiple_choice",2,"What do you use to draw?",["Fork","Crayon","Spoon","Cup"],1,"A crayon.","✏️",20,10),
    _q("a5-ps02","3-5","problem_solving","multiple_choice",2,"It is raining. Take:",["Sunglasses","Umbrella","Fan","Book"],1,"Umbrella.","☔",20,10),
    _q("a5-ps03","3-5","problem_solving","multiple_choice",2,"You are thirsty. Drink:",["Sand","Water","Rock","Paper"],1,"Water.","💧",20,10),
    _q("a5-ps04","3-5","problem_solving","multiple_choice",2,"You are cold. Wear a:",["Swimsuit","Sweater","Hat only","Shorts"],1,"Sweater.","🧥",20,10),
    _q("a5-ps05","3-5","problem_solving","multiple_choice",3,"Bird uses ___ to fly.",["Feet","Wings","Teeth","Tail"],1,"Wings.","🕊️",25,12),
    _q("a5-ps06","3-5","problem_solving","multiple_choice",2,"You have a sandwich. You eat it with your:",["Feet","Eyes","Mouth","Hair"],2,"Mouth.","🥪",20,10),
    _q("a5-ps07","3-5","problem_solving","multiple_choice",3,"To read a book you need your:",["Ears","Nose","Eyes","Feet"],2,"Eyes.","👀",20,10),
    _q("a5-ps08","3-5","problem_solving","multiple_choice",2,"You sleep at:",["Morning","Noon","Night","Never"],2,"Night.","🌙",20,10),
    _q("a5-ps09","3-5","problem_solving","multiple_choice",3,"To open a door, you:",["Kick","Turn the knob","Blow","Sing"],1,"Turn the knob.","🚪",25,12),

    # ---- Math Reasoning (9) ----
    _q("a5-mth01","3-5","mathematical_thinking","multiple_choice",1,"1 + 1 = ?",["1","2","3","4"],1,"Two.","",20,10),
    _q("a5-mth02","3-5","mathematical_thinking","multiple_choice",1,"2 + 2 = ?",["3","4","5","6"],1,"Four.","",20,10),
    _q("a5-mth03","3-5","mathematical_thinking","multiple_choice",2,"3 + 1 = ?",["3","4","5","6"],1,"Four.","",20,10),
    _q("a5-mth04","3-5","mathematical_thinking","multiple_choice",2,"How many fingers on one hand?",["3","4","5","6"],2,"Five.","🖐️",20,10),
    _q("a5-mth05","3-5","mathematical_thinking","multiple_choice",2,"What comes after 3? 1, 2, 3, __",["2","3","4","5"],2,"Four.","",20,10),
    _q("a5-mth06","3-5","mathematical_thinking","multiple_choice",3,"2 + 3 = ?",["4","5","6","7"],1,"Five.","",20,10),
    _q("a5-mth07","3-5","mathematical_thinking","multiple_choice",3,"3 - 1 = ?",["1","2","3","4"],1,"Two.","",20,10),
    _q("a5-mth08","3-5","mathematical_thinking","multiple_choice",2,"How many eyes do you have?",["1","2","3","4"],1,"Two.","👀",20,10),
    _q("a5-mth09","3-5","mathematical_thinking","multiple_choice",3,"What number is between 4 and 6?",["3","5","7","8"],1,"Five.","",25,11),

    # ---- Language Skills (9) ----
    _q("a5-ln01","3-5","language_skills","multiple_choice",1,"Which is a fruit?",["Chair","Apple","Car","Shoe"],1,"Apple.","🍎",20,10),
    _q("a5-ln02","3-5","language_skills","multiple_choice",2,"'Big' is opposite of:",["Large","Small","Wide","Fast"],1,"Small.","",20,10),
    _q("a5-ln03","3-5","language_skills","multiple_choice",2,"'Hot' is opposite of:",["Warm","Cold","Sunny","Nice"],1,"Cold.","",20,10),
    _q("a5-ln04","3-5","language_skills","multiple_choice",2,"'Day' is opposite of:",["Night","Sun","Sky","Rain"],0,"Night.","",20,10),
    _q("a5-ln05","3-5","language_skills","multiple_choice",1,"Which letter starts CAT?",["A","B","C","D"],2,"C.","",20,10),
    _q("a5-ln06","3-5","language_skills","multiple_choice",1,"Which letter starts DOG?",["A","B","C","D"],3,"D.","",20,10),
    _q("a5-ln07","3-5","language_skills","multiple_choice",2,"Which word starts with 'S'?",["Cat","Sun","Bear","Egg"],1,"Sun.","☀️",20,10),
    _q("a5-ln08","3-5","language_skills","multiple_choice",3,"'Fast' is opposite of:",["Quick","Slow","Speedy","Rapid"],1,"Slow.","",25,12),
    _q("a5-ln09","3-5","language_skills","multiple_choice",3,"Which is a color?",["Dog","Blue","Table","Cup"],1,"Blue is a color.","🔵",20,10),

    # ---- Creativity (bonus 3) ----
    _q("a5-cr01","3-5","creativity","multiple_choice",2,"A box could become a:",["Nothing","Toy car","Rock","Drink"],1,"Boxes can be many things!","",25,11),
    _q("a5-cr02","3-5","creativity","multiple_choice",3,"A stick could be a:",["Only wood","Magic wand","Only trash","Nothing"],1,"Imagination!","🪄",25,12),
    _q("a5-cr03","3-5","creativity","multiple_choice",3,"A pillow could become a:",["Only pillow","Fort wall","Rock","Cup"],1,"Fort walls!","",25,12),
]


# =========================================================================
# AGE 6-8 — 80 questions
# =========================================================================
_A8 = [
    # ---- Memory (9) ----
    _q("a8-m01","6-8","memory","multiple_choice",2,"How many days are in a week?",["5","6","7","8"],2,"Seven days.","",20,10),
    _q("a8-m02","6-8","memory","multiple_choice",2,"Which is NOT a rainbow color?",["Red","Blue","Brown","Green"],2,"Brown is not.","🌈",25,11),
    _q("a8-m03","6-8","memory","multiple_choice",2,"How many months in a year?",["10","11","12","13"],2,"Twelve.","",20,10),
    _q("a8-m04","6-8","memory","multiple_choice",2,"Which planet do we live on?",["Mars","Earth","Venus","Sun"],1,"Earth.","🌍",20,10),
    _q("a8-m05","6-8","memory","multiple_choice",2,"Water freezes into:",["Steam","Ice","Sand","Air"],1,"Ice.","🧊",20,10),
    _q("a8-m06","6-8","memory","memory_cards",3,"You saw: 5, 8, 2, 9, 3. Which was in the MIDDLE?",["5","8","2","9"],2,"2 was middle.","",30,13),
    _q("a8-m07","6-8","memory","multiple_choice",3,"The largest ocean is the:",["Atlantic","Arctic","Pacific","Indian"],2,"Pacific.","🌊",25,12),
    _q("a8-m08","6-8","memory","multiple_choice",2,"How many hours in a day?",["12","20","22","24"],3,"24 hours.","🕐",20,10),
    _q("a8-m09","6-8","memory","multiple_choice",3,"Which is the sun?",["Star","Planet","Moon","Comet"],0,"The Sun is a star.","☀️",25,12),

    # ---- Logical Reasoning (9) ----
    _q("a8-l01","6-8","logical_reasoning","multiple_choice",2,"If today is Monday, tomorrow is:",["Sunday","Tuesday","Friday","Wednesday"],1,"Tuesday.","",20,10),
    _q("a8-l02","6-8","logical_reasoning","multiple_choice",3,"Heavier: 1kg feathers or 1kg stones?",["Feathers","Stones","Same","Cannot tell"],2,"Same weight.","",25,13),
    _q("a8-l03","6-8","logical_reasoning","multiple_choice",3,"If it snows, the ground gets:",["Hot","Wet","White","Green"],2,"White.","❄️",25,12),
    _q("a8-l04","6-8","logical_reasoning","multiple_choice",3,"Sam is taller than Kim. Kim is taller than Lee. Tallest?",["Sam","Kim","Lee","Cannot say"],0,"Sam.","",30,14),
    _q("a8-l05","6-8","logical_reasoning","multiple_choice",3,"If A > B and B > C, then A is:",["Less than C","Same as C","More than C","Cannot say"],2,"Greater than C.","",30,14),
    _q("a8-l06","6-8","logical_reasoning","multiple_choice",2,"A doctor helps people who are:",["Happy","Sick","Sleeping","Running"],1,"Sick.","👩‍⚕️",20,10),
    _q("a8-l07","6-8","logical_reasoning","multiple_choice",3,"Yesterday was Sunday, day after tomorrow is:",["Monday","Tuesday","Wednesday","Thursday"],1,"Tuesday (Mon→Tue).","",30,14),
    _q("a8-l08","6-8","logical_reasoning","multiple_choice",4,"All roses are flowers. Some flowers are red. So roses may be:",["All red","Never red","Sometimes red","Not flowers"],2,"Sometimes red.","🌹",35,16),
    _q("a8-l09","6-8","logical_reasoning","multiple_choice",3,"Cows give ___",["Wool","Milk","Honey","Eggs"],1,"Milk.","🥛",20,10),

    # ---- Pattern Recognition (9) ----
    _q("a8-p01","6-8","pattern_recognition","number_series",2,"2, 4, 6, 8, ?",["9","10","11","12"],1,"+2 each time → 10.","",25,11),
    _q("a8-p02","6-8","pattern_recognition","alphabet_series",2,"A, C, E, G, ?",["H","I","J","K"],1,"Skip 1 → I.","",25,11),
    _q("a8-p03","6-8","pattern_recognition","pattern_completion",3,"1, 3, 6, 10, 15, ?",["18","20","21","25"],2,"+2,+3,+4,+5,+6 → 21.","",30,14),
    _q("a8-p04","6-8","pattern_recognition","number_series",2,"5, 10, 15, 20, ?",["22","23","25","30"],2,"+5 → 25.","",25,11),
    _q("a8-p05","6-8","pattern_recognition","number_series",3,"1, 4, 7, 10, ?",["11","12","13","14"],2,"+3 → 13.","",25,12),
    _q("a8-p06","6-8","pattern_recognition","alphabet_series",3,"B, D, F, H, ?",["I","J","K","L"],1,"Skip 1 → J.","",25,12),
    _q("a8-p07","6-8","pattern_recognition","pattern_completion",3,"🔺🔵🔺🔵🔺 ?",["🔺","🔵","🟢","🟡"],1,"Alternates.","",25,12),
    _q("a8-p08","6-8","pattern_recognition","number_series",3,"20, 18, 16, 14, ?",["10","11","12","13"],2,"−2 → 12.","",25,12),
    _q("a8-p09","6-8","pattern_recognition","number_series",4,"2, 4, 8, 16, ?",["24","28","30","32"],3,"×2 each → 32.","",30,14),

    # ---- Visual Skills (9) ----
    _q("a8-v01","6-8","visual_intelligence","spatial_intelligence",3,"How many sides does a hexagon have?",["5","6","7","8"],1,"6 sides.","⬡",25,12),
    _q("a8-v02","6-8","visual_intelligence","shape_matching",3,"Which shape has 3 sides?",["Square","Triangle","Circle","Rectangle"],1,"Triangle.","🔺",20,11),
    _q("a8-v03","6-8","visual_intelligence","shape_matching",2,"A pentagon has ___ sides.",["4","5","6","7"],1,"Five.","⭐",25,12),
    _q("a8-v04","6-8","visual_intelligence","shape_matching",3,"Which is a 3D shape?",["Square","Triangle","Cube","Circle"],2,"Cube.","🎲",25,12),
    _q("a8-v05","6-8","visual_intelligence","spatial_intelligence",3,"Cube has how many faces?",["4","5","6","8"],2,"Six.","🎲",25,12),
    _q("a8-v06","6-8","visual_intelligence","image_selection",2,"Which is NOT a square?",["⬛","🟥","🔵","🟦"],2,"Circle.","",25,11),
    _q("a8-v07","6-8","visual_intelligence","color_recognition",2,"Mixing red + yellow makes:",["Green","Orange","Purple","Pink"],1,"Orange.","🟠",25,12),
    _q("a8-v08","6-8","visual_intelligence","color_recognition",3,"Mixing blue + yellow makes:",["Red","Green","Purple","Brown"],1,"Green.","🟢",25,12),
    _q("a8-v09","6-8","visual_intelligence","shape_matching",3,"Which shape has curved sides?",["Square","Triangle","Circle","Star"],2,"Circle.","⚪",20,11),

    # ---- Attention & Focus (9) ----
    _q("a8-a01","6-8","attention","focus_challenge",3,"Which word is spelled correctly?",["Kat","Cat","Catt","Kaat"],1,"Cat.","",25,12),
    _q("a8-a02","6-8","attention","odd_one_out",3,"Odd number: 4, 8, 12, 15, 20",["4","8","15","20"],2,"15 is odd.","",25,12),
    _q("a8-a03","6-8","attention","odd_one_out",3,"Which does NOT belong: dog, cat, tiger, chair",["dog","cat","tiger","chair"],3,"Chair is not an animal.","🪑",25,12),
    _q("a8-a04","6-8","attention","focus_challenge",3,"Count the letter 'a' in 'banana'.",["2","3","4","5"],1,"Three a's.","",25,12),
    _q("a8-a05","6-8","attention","focus_challenge",3,"Which is spelled correctly?",["Frend","Freind","Friend","Frind"],2,"Friend.","",25,12),
    _q("a8-a06","6-8","attention","odd_one_out",4,"Odd: apple, banana, carrot, grape",["apple","banana","carrot","grape"],2,"Carrot is a vegetable.","🥕",25,13),
    _q("a8-a07","6-8","attention","focus_challenge",3,"How many 5s? 3 5 8 5 1 5 2",["1","2","3","4"],2,"Three.","",25,12),
    _q("a8-a08","6-8","attention","odd_one_out",3,"Odd: red, blue, tiger, green",["red","blue","tiger","green"],2,"Tiger isn't a color.","🐯",25,12),
    _q("a8-a09","6-8","attention","focus_challenge",4,"Count vowels in 'apple':",["1","2","3","4"],1,"a, e = 2.","",30,14),

    # ---- Processing Speed (8) ----
    _q("a8-sp01","6-8","processing_speed","reaction_speed",3,"Quick! 2+3 = ?",["4","5","6","7"],1,"5.","",12,15),
    _q("a8-sp02","6-8","processing_speed","reaction_speed",3,"Quick! 5+4 = ?",["8","9","10","11"],1,"9.","",12,15),
    _q("a8-sp03","6-8","processing_speed","reaction_speed",3,"Quick! 10−3 = ?",["6","7","8","9"],1,"7.","",12,15),
    _q("a8-sp04","6-8","processing_speed","reaction_speed",3,"Quick! Which is heavier: brick or feather?",["Brick","Feather","Same","Cannot say"],0,"Brick.","🧱",12,14),
    _q("a8-sp05","6-8","processing_speed","reaction_speed",3,"Quick! 6−2 = ?",["3","4","5","6"],1,"4.","",12,14),
    _q("a8-sp06","6-8","processing_speed","reaction_speed",4,"Quick! 3×3 = ?",["6","9","12","15"],1,"9.","",12,15),
    _q("a8-sp07","6-8","processing_speed","reaction_speed",4,"Quick! 4×2 = ?",["6","7","8","10"],2,"8.","",12,15),
    _q("a8-sp08","6-8","processing_speed","reaction_speed",4,"Quick! Half of 10 = ?",["3","4","5","6"],2,"5.","",12,15),

    # ---- Problem Solving (9) ----
    _q("a8-ps01","6-8","problem_solving","math_challenge",2,"You have 5 candies. You give 2 away. Left?",["2","3","4","5"],1,"3.","🍬",25,12),
    _q("a8-ps02","6-8","problem_solving","math_challenge",3,"12 stickers, 3 friends. Each gets:",["3","4","5","6"],1,"4.","",30,14),
    _q("a8-ps03","6-8","problem_solving","math_challenge",3,"You buy 3 pens at $2 each. Total?",["$4","$5","$6","$8"],2,"$6.","💵",25,13),
    _q("a8-ps04","6-8","problem_solving","math_challenge",3,"You have 10 apples, eat 3, buy 2 more. Now?",["7","8","9","10"],2,"9.","🍎",30,14),
    _q("a8-ps05","6-8","problem_solving","math_challenge",3,"A pizza cut into 8 slices. You eat 3. Left:",["3","4","5","6"],2,"5.","🍕",25,13),
    _q("a8-ps06","6-8","problem_solving","math_challenge",3,"6 birds on a tree, 2 fly away. Left:",["3","4","5","6"],1,"4.","🐦",25,13),
    _q("a8-ps07","6-8","problem_solving","math_challenge",3,"Book has 20 pages, you read 12. Left:",["6","7","8","9"],2,"8.","📖",25,13),
    _q("a8-ps08","6-8","problem_solving","math_challenge",4,"4 friends share 20 cookies. Each gets:",["4","5","6","7"],1,"5.","🍪",30,15),
    _q("a8-ps09","6-8","problem_solving","math_challenge",4,"You have $10, spend $3.50. Change:",["$5.50","$6.50","$7","$8.50"],1,"$6.50.","💵",30,15),

    # ---- Math Reasoning (9) ----
    _q("a8-mth01","6-8","mathematical_thinking","math_challenge",2,"3 × 4 = ?",["7","10","12","15"],2,"12.","",25,12),
    _q("a8-mth02","6-8","mathematical_thinking","math_challenge",3,"Half of 20 =",["8","10","12","15"],1,"10.","",25,13),
    _q("a8-mth03","6-8","mathematical_thinking","math_challenge",3,"Double 7 =",["12","13","14","16"],2,"14.","",25,13),
    _q("a8-mth04","6-8","mathematical_thinking","math_challenge",2,"7 + 8 =",["13","14","15","16"],2,"15.","",25,12),
    _q("a8-mth05","6-8","mathematical_thinking","math_challenge",2,"20 − 7 =",["12","13","14","15"],1,"13.","",25,12),
    _q("a8-mth06","6-8","mathematical_thinking","math_challenge",3,"6 × 5 =",["25","28","30","36"],2,"30.","",25,13),
    _q("a8-mth07","6-8","mathematical_thinking","math_challenge",3,"18 ÷ 3 =",["4","5","6","7"],2,"6.","",25,13),
    _q("a8-mth08","6-8","mathematical_thinking","math_challenge",3,"Which is bigger: 3/4 or 1/2 ?",["3/4","1/2","Equal","Cannot say"],0,"3/4 is bigger.","",30,14),
    _q("a8-mth09","6-8","mathematical_thinking","math_challenge",4,"9 × 6 =",["48","54","56","63"],1,"54.","",25,14),

    # ---- Language Skills (9) ----
    _q("a8-ln01","6-8","language_skills","word_matching",2,"Rhymes with CAT:",["Dog","Bat","Fish","Sun"],1,"Bat.","",20,10),
    _q("a8-ln02","6-8","language_skills","multiple_choice",3,"Opposite of HAPPY:",["Angry","Sad","Sleepy","Loud"],1,"Sad.","",20,11),
    _q("a8-ln03","6-8","language_skills","multiple_choice",2,"Synonym of BIG:",["Small","Huge","Tiny","Thin"],1,"Huge.","",20,11),
    _q("a8-ln04","6-8","language_skills","multiple_choice",2,"Opposite of HOT:",["Warm","Cold","Sunny","Nice"],1,"Cold.","",20,10),
    _q("a8-ln05","6-8","language_skills","word_matching",2,"Rhymes with STAR:",["Sky","Jar","Sun","Rocket"],1,"Jar.","",20,10),
    _q("a8-ln06","6-8","language_skills","multiple_choice",3,"Plural of MOUSE:",["Mouses","Mices","Mice","Mouse"],2,"Mice.","🐭",25,12),
    _q("a8-ln07","6-8","language_skills","multiple_choice",3,"Which is a NOUN?",["Run","Big","Table","Quickly"],2,"Table.","🪑",25,12),
    _q("a8-ln08","6-8","language_skills","multiple_choice",3,"Which is a VERB?",["Happy","Run","Blue","Cat"],1,"Run.","",25,12),
    _q("a8-ln09","6-8","language_skills","multiple_choice",4,"Synonym of QUICK:",["Slow","Fast","Weak","Old"],1,"Fast.","",25,13),

    # ---- Creativity (bonus 3) ----
    _q("a8-cr01","6-8","creativity","multiple_choice",3,"A cloud shaped like an elephant could also look like:",["Only elephant","A whale","A rock","Nothing"],1,"A whale.","☁️",25,12),
    _q("a8-cr02","6-8","creativity","multiple_choice",3,"A paperclip could become a:",["Only clip","Tiny hook","Rock","Cup"],1,"A hook.","",25,12),
    _q("a8-cr03","6-8","creativity","multiple_choice",3,"An empty jar can hold:",["Only air","Coins","Nothing","Water only"],1,"Many things.","",25,12),
]


# =========================================================================
# AGE 9-12 — 80 questions
# =========================================================================
_A12 = [
    # ---- Memory (9) ----
    _q("a12-m01","9-12","memory","multiple_choice",2,"Planets in our solar system:",["7","8","9","10"],1,"8 planets.","🪐",22,12),
    _q("a12-m02","9-12","memory","multiple_choice",3,"Capital of France:",["London","Berlin","Paris","Madrid"],2,"Paris.","🇫🇷",20,12),
    _q("a12-m03","9-12","memory","multiple_choice",3,"Capital of Japan:",["Beijing","Tokyo","Seoul","Bangkok"],1,"Tokyo.","🇯🇵",22,13),
    _q("a12-m04","9-12","memory","multiple_choice",3,"Longest river in the world:",["Nile","Amazon","Yangtze","Ganges"],0,"Nile.","",25,13),
    _q("a12-m05","9-12","memory","multiple_choice",3,"Chemical symbol for water:",["W","H2O","O2","HO"],1,"H₂O.","💧",22,12),
    _q("a12-m06","9-12","memory","memory_cards",3,"Sequence: 4, 9, 1, 7, 5. Which was 3rd?",["4","9","1","7"],2,"1.","",30,14),
    _q("a12-m07","9-12","memory","multiple_choice",2,"Largest continent by area:",["Africa","Asia","Europe","Australia"],1,"Asia.","",22,12),
    _q("a12-m08","9-12","memory","multiple_choice",4,"Currency of Japan:",["Dollar","Yen","Euro","Rupee"],1,"Yen.","💴",22,13),
    _q("a12-m09","9-12","memory","multiple_choice",3,"How many continents?",["5","6","7","8"],2,"Seven.","🌍",22,12),

    # ---- Logical Reasoning (9) ----
    _q("a12-l01","9-12","logical_reasoning","logic_puzzle",3,"All Blooks are Croops, all Croops are Drips. Then all Blooks are:",["Not Drips","Sometimes Drips","Drips","Cannot say"],2,"Transitive.","",40,15),
    _q("a12-l02","9-12","logical_reasoning","math_challenge",3,"3x + 6 = 15. x = ?",["2","3","4","5"],1,"x = 3.","",35,15),
    _q("a12-l03","9-12","logical_reasoning","story_logic",3,"Anna > Bob, Bob > Chris. Shortest?",["Anna","Bob","Chris","Cannot say"],2,"Chris.","",30,14),
    _q("a12-l04","9-12","logical_reasoning","logic_puzzle",4,"Some cats are black. All black things absorb heat. So:",["All cats absorb heat","Some cats absorb heat","No cats absorb heat","Cannot say"],1,"Some cats.","",40,17),
    _q("a12-l05","9-12","logical_reasoning","multiple_choice",3,"If A=1, B=2, C=3, then CAB =",["123","312","213","321"],1,"3-1-2.","",30,14),
    _q("a12-l06","9-12","logical_reasoning","logic_puzzle",4,"5 people in a race. You pass 2nd place. You are now in:",["1st","2nd","3rd","4th"],1,"2nd.","🏁",35,16),
    _q("a12-l07","9-12","logical_reasoning","multiple_choice",3,"Which does NOT belong: Triangle, Square, Circle, Cylinder",["Triangle","Square","Circle","Cylinder"],3,"Cylinder is 3D.","",30,14),
    _q("a12-l08","9-12","logical_reasoning","story_logic",4,"John is older than Mary. Mary is older than Alex. Youngest?",["John","Mary","Alex","Same age"],2,"Alex.","",30,15),
    _q("a12-l09","9-12","logical_reasoning","logic_puzzle",4,"If P → Q is true and Q is false, then P is:",["True","False","Unknown","Both"],1,"False.","",40,17),

    # ---- Pattern Recognition (9) ----
    _q("a12-p01","9-12","pattern_recognition","number_series",3,"1, 4, 9, 16, 25, ?",["30","36","42","49"],1,"n² → 36.","",30,14),
    _q("a12-p02","9-12","pattern_recognition","pattern_completion",3,"Triangle(3), Square(4), Pentagon(5), Hexagon(?)",["5","6","7","8"],1,"6 sides.","",25,12),
    _q("a12-p03","9-12","pattern_recognition","number_series",4,"2, 6, 12, 20, 30, ?",["36","40","42","44"],2,"+4,+6,+8,+10,+12 → 42.","",35,17),
    _q("a12-p04","9-12","pattern_recognition","number_series",4,"1, 1, 2, 3, 5, 8, ?",["11","12","13","15"],2,"Fibonacci → 13.","",35,17),
    _q("a12-p05","9-12","pattern_recognition","alphabet_series",3,"A, D, G, J, ?",["K","L","M","N"],2,"+3 → M.","",30,14),
    _q("a12-p06","9-12","pattern_recognition","number_series",3,"3, 6, 12, 24, ?",["36","42","48","50"],2,"×2 → 48.","",30,15),
    _q("a12-p07","9-12","pattern_recognition","number_series",4,"100, 81, 64, 49, ?",["30","32","36","42"],2,"n² desc → 36.","",35,17),
    _q("a12-p08","9-12","pattern_recognition","alphabet_series",4,"Z, X, V, T, ?",["Q","R","S","U"],1,"Skip 1 back → R.","",30,15),
    _q("a12-p09","9-12","pattern_recognition","number_series",3,"5, 10, 20, 40, ?",["50","60","70","80"],3,"×2 → 80.","",30,14),

    # ---- Visual Skills (9) ----
    _q("a12-v01","9-12","visual_intelligence","spatial_intelligence",3,"A cube has how many faces?",["4","5","6","8"],2,"6.","🎲",25,13),
    _q("a12-v02","9-12","visual_intelligence","visual_puzzle",4,"Fold a square in half → you get:",["Triangle","Rectangle","Circle","Pentagon"],1,"Rectangle.","",30,15),
    _q("a12-v03","9-12","visual_intelligence","spatial_intelligence",3,"A rectangle has ___ right angles.",["2","3","4","5"],2,"4.","",25,13),
    _q("a12-v04","9-12","visual_intelligence","spatial_intelligence",4,"Cube has how many edges?",["8","10","12","14"],2,"12.","🎲",30,15),
    _q("a12-v05","9-12","visual_intelligence","spatial_intelligence",4,"Cube has how many vertices?",["4","6","8","12"],2,"8.","🎲",30,15),
    _q("a12-v06","9-12","visual_intelligence","visual_puzzle",4,"Rotate letter M 180° → looks like:",["M","W","N","Z"],1,"W.","",30,14),
    _q("a12-v07","9-12","visual_intelligence","shape_matching",3,"Octagon has ___ sides.",["6","7","8","10"],2,"8.","",25,13),
    _q("a12-v08","9-12","visual_intelligence","spatial_intelligence",4,"Which is a 3D shape?",["Triangle","Sphere","Square","Pentagon"],1,"Sphere.","🌐",25,13),
    _q("a12-v09","9-12","visual_intelligence","visual_puzzle",4,"A cylinder has ___ flat faces.",["1","2","3","4"],1,"2.","",30,14),

    # ---- Attention & Focus (9) ----
    _q("a12-a01","9-12","attention","focus_challenge",3,"Count letter 'e' in: 'Every elephant enjoys eating early'",["4","5","6","7"],2,"6 e's.","",40,15),
    _q("a12-a02","9-12","attention","odd_one_out",3,"Odd: Apple, Banana, Carrot, Grape",["Apple","Banana","Carrot","Grape"],2,"Carrot.","🥕",22,12),
    _q("a12-a03","9-12","attention","odd_one_out",4,"Odd: 3, 5, 7, 9, 12",["3","5","7","12"],3,"12 is even.","",25,14),
    _q("a12-a04","9-12","attention","focus_challenge",4,"How many 'a' in 'antarctica'?",["2","3","4","5"],1,"3.","",30,14),
    _q("a12-a05","9-12","attention","odd_one_out",3,"Odd: Rose, Tulip, Oak, Lily",["Rose","Tulip","Oak","Lily"],2,"Oak is a tree.","🌳",22,13),
    _q("a12-a06","9-12","attention","focus_challenge",4,"How many 2's? 1 2 3 2 4 2 5 2 6",["3","4","5","6"],1,"4.","",30,14),
    _q("a12-a07","9-12","attention","focus_challenge",4,"Which is spelled correctly?",["Recieve","Receive","Reccieve","Receeve"],1,"Receive.","",30,14),
    _q("a12-a08","9-12","attention","odd_one_out",4,"Odd: 16, 25, 36, 40, 49",["16","25","40","49"],2,"40 is not a perfect square.","",30,15),
    _q("a12-a09","9-12","attention","focus_challenge",4,"Odd letter: A, B, D, F, H",["A","B","D","H"],0,"A is a vowel; others consonants.","",30,15),

    # ---- Processing Speed (8) ----
    _q("a12-sp01","9-12","processing_speed","reaction_speed",3,"Quick! 9 × 8 = ?",["64","72","81","56"],1,"72.","",12,15),
    _q("a12-sp02","9-12","processing_speed","reaction_speed",4,"Quick! 12 × 12 = ?",["124","136","144","156"],2,"144.","",12,16),
    _q("a12-sp03","9-12","processing_speed","reaction_speed",3,"Quick! 100 − 47 = ?",["47","53","57","63"],1,"53.","",12,15),
    _q("a12-sp04","9-12","processing_speed","reaction_speed",4,"Quick! 15 × 4 = ?",["50","55","60","65"],2,"60.","",12,15),
    _q("a12-sp05","9-12","processing_speed","reaction_speed",4,"Quick! Half of 46 = ?",["21","22","23","24"],2,"23.","",12,15),
    _q("a12-sp06","9-12","processing_speed","reaction_speed",4,"Quick! 7 × 9 = ?",["56","63","64","72"],1,"63.","",12,15),
    _q("a12-sp07","9-12","processing_speed","reaction_speed",4,"Quick! 81 ÷ 9 = ?",["7","8","9","10"],2,"9.","",12,15),
    _q("a12-sp08","9-12","processing_speed","reaction_speed",4,"Quick! 25% of 80 = ?",["10","15","20","25"],2,"20.","",12,16),

    # ---- Problem Solving (9) ----
    _q("a12-ps01","9-12","problem_solving","math_challenge",3,"Train at 60 km/h. Distance in 2.5 hrs?",["120","130","150","180"],2,"150 km.","🚂",35,15),
    _q("a12-ps02","9-12","problem_solving","math_challenge",3,"12 apples / 4 kids = each gets:",["2","3","4","6"],1,"3.","🍎",25,13),
    _q("a12-ps03","9-12","problem_solving","math_challenge",4,"Shirt cost $25, tax 10%. Total:",["$25","$26","$27.50","$28"],2,"$27.50.","",35,16),
    _q("a12-ps04","9-12","problem_solving","math_challenge",4,"Rectangle 8 × 5. Area:",["13","30","40","48"],2,"40.","",25,14),
    _q("a12-ps05","9-12","problem_solving","math_challenge",4,"Book 240 pages. Read 1/4. Left:",["120","150","180","200"],2,"180.","📖",30,15),
    _q("a12-ps06","9-12","problem_solving","math_challenge",4,"5 people share $75. Each gets:",["$10","$12","$15","$20"],2,"$15.","💵",30,15),
    _q("a12-ps07","9-12","problem_solving","math_challenge",4,"Perimeter of square, side 9:",["27","32","36","45"],2,"36.","",25,14),
    _q("a12-ps08","9-12","problem_solving","math_challenge",4,"Car 40 mph, travels 120 miles. Hours:",["2","3","4","5"],1,"3.","🚗",30,15),
    _q("a12-ps09","9-12","problem_solving","math_challenge",5,"Sale: $80 shirt, 25% off. Final price:",["$50","$55","$60","$65"],2,"$60.","🛍️",35,17),

    # ---- Math Reasoning (9) ----
    _q("a12-mth01","9-12","mathematical_thinking","math_challenge",3,"15% of 200 = ?",["20","25","30","35"],2,"30.","",30,14),
    _q("a12-mth02","9-12","mathematical_thinking","math_challenge",3,"Perimeter of square (side 7):",["21","28","35","49"],1,"28.","",25,14),
    _q("a12-mth03","9-12","mathematical_thinking","math_challenge",4,"√81 = ?",["7","8","9","10"],2,"9.","",25,14),
    _q("a12-mth04","9-12","mathematical_thinking","math_challenge",4,"2/3 + 1/6 = ?",["3/6","4/6","5/6","6/6"],2,"5/6.","",35,16),
    _q("a12-mth05","9-12","mathematical_thinking","math_challenge",3,"5² = ?",["10","20","25","30"],2,"25.","",22,13),
    _q("a12-mth06","9-12","mathematical_thinking","math_challenge",4,"0.5 as a fraction:",["1/5","1/4","1/2","1/3"],2,"1/2.","",25,14),
    _q("a12-mth07","9-12","mathematical_thinking","math_challenge",4,"Area of triangle: base 10, height 6:",["16","30","60","36"],1,"30.","",30,15),
    _q("a12-mth08","9-12","mathematical_thinking","math_challenge",4,"20% of 250:",["30","40","50","60"],2,"50.","",25,14),
    _q("a12-mth09","9-12","mathematical_thinking","math_challenge",5,"3⁴ = ?",["27","54","64","81"],3,"81.","",30,16),

    # ---- Language Skills (9) ----
    _q("a12-ln01","9-12","language_skills","word_matching",3,"Synonym of BEGIN:",["End","Start","Stop","Finish"],1,"Start.","",22,12),
    _q("a12-ln02","9-12","language_skills","multiple_choice",3,"Which is a VERB?",["Happy","Run","Blue","Cat"],1,"Run.","",22,12),
    _q("a12-ln03","9-12","language_skills","multiple_choice",3,"Which is an ADJECTIVE?",["Quickly","Beautiful","Elephant","Read"],1,"Beautiful.","",22,13),
    _q("a12-ln04","9-12","language_skills","multiple_choice",3,"Antonym of ANCIENT:",["Old","Modern","Wise","Broken"],1,"Modern.","",22,13),
    _q("a12-ln05","9-12","language_skills","multiple_choice",4,"Plural of GOOSE:",["Gooses","Geeses","Geese","Gooss"],2,"Geese.","🦢",25,14),
    _q("a12-ln06","9-12","language_skills","multiple_choice",4,"Synonym of ENORMOUS:",["Tiny","Huge","Old","Full"],1,"Huge.","",22,13),
    _q("a12-ln07","9-12","language_skills","multiple_choice",4,"Which is an ADVERB?",["Quickly","Chair","Blue","Book"],0,"Quickly.","",22,14),
    _q("a12-ln08","9-12","language_skills","multiple_choice",4,"'A stitch in time saves' — what?",["Two","Nine","Ten","Twelve"],1,"Nine.","",25,14),
    _q("a12-ln09","9-12","language_skills","multiple_choice",4,"Metaphor: 'Time is money' means time is:",["Coins","Valuable","Green","Slow"],1,"Valuable.","",30,15),

    # ---- Creativity (bonus 2) ----
    _q("a12-cr01","9-12","creativity","multiple_choice",3,"Most creative use of a paperclip:",["Hold paper","Bookmark","Tiny sculpture wire","Trash"],2,"Sculpture wire.","",30,14),
    _q("a12-cr02","9-12","creativity","multiple_choice",4,"Which is divergent thinking?",["One answer only","Copying","5 uses for a spoon","Silence"],2,"5 uses.","",30,15),
]


# =========================================================================
# AGE 13-16 — 80 questions
# =========================================================================
_A16 = [
    # ---- Memory (9) ----
    _q("a16-m01","13-16","memory","multiple_choice",3,"Author of Romeo & Juliet:",["Dickens","Shakespeare","Austen","Twain"],1,"Shakespeare.","📖",22,14),
    _q("a16-m02","13-16","memory","multiple_choice",3,"Chemical symbol Gold:",["Go","Gd","Au","Ag"],2,"Au.","",22,14),
    _q("a16-m03","13-16","memory","multiple_choice",3,"Chemical symbol Silver:",["Si","Sv","Ag","Au"],2,"Ag.","",22,14),
    _q("a16-m04","13-16","memory","multiple_choice",4,"Year WWII ended:",["1942","1945","1948","1950"],1,"1945.","",22,14),
    _q("a16-m05","13-16","memory","multiple_choice",3,"Speed of light approx (km/s):",["30,000","300,000","3,000,000","300"],1,"300,000.","",25,15),
    _q("a16-m06","13-16","memory","memory_cards",4,"Sequence: 8, 3, 7, 1, 9, 4. Which was 4th?",["8","7","1","9"],2,"1.","",30,15),
    _q("a16-m07","13-16","memory","multiple_choice",4,"Author of 1984:",["Orwell","Huxley","Bradbury","Asimov"],0,"George Orwell.","",22,15),
    _q("a16-m08","13-16","memory","multiple_choice",4,"Element with symbol Fe:",["Fluorine","Iron","Francium","Fermium"],1,"Iron.","",22,14),
    _q("a16-m09","13-16","memory","multiple_choice",4,"Largest planet:",["Earth","Mars","Jupiter","Saturn"],2,"Jupiter.","🪐",22,14),

    # ---- Logical Reasoning (9) ----
    _q("a16-l01","13-16","logical_reasoning","logic_puzzle",4,"Some Zoggs are Boffs. All Boffs are Cluggs. MUST be true:",["All Zoggs are Cluggs","Some Zoggs are Cluggs","No Zoggs are Cluggs","All Cluggs are Zoggs"],1,"Some.","",40,18),
    _q("a16-l02","13-16","logical_reasoning","multiple_choice",4,"A > B, B > C → A ? C",["A < C","A = C","A > C","Cannot say"],2,"A > C.","",30,16),
    _q("a16-l03","13-16","logical_reasoning","logic_puzzle",5,"All roses are flowers. Some flowers fade quickly. So:",["All roses fade","Some roses may fade","No roses fade","Roses not flowers"],1,"Some may.","",40,20),
    _q("a16-l04","13-16","logical_reasoning","logic_puzzle",4,"P→Q, ¬Q. Then:",["P true","P false","Q true","Cannot say"],1,"P false.","",35,18),
    _q("a16-l05","13-16","logical_reasoning","story_logic",4,"Anne is younger than Ben. Ben is younger than Cal. Oldest?",["Anne","Ben","Cal","Same"],2,"Cal.","",25,15),
    _q("a16-l06","13-16","logical_reasoning","logic_puzzle",5,"If it rains, streets are wet. Streets are wet. Then:",["It rained","Might have rained","Did not rain","No conclusion"],1,"May have (other causes).","",40,20),
    _q("a16-l07","13-16","logical_reasoning","logic_puzzle",5,"There are 5 doors, only one truthful sign. Best strategy:",["Guess","Elimination","Coin flip","None"],1,"Elimination.","",40,20),
    _q("a16-l08","13-16","logical_reasoning","multiple_choice",4,"If x = y and y = z, then x ?",["> z","= z","< z","cannot say"],1,"= z.","",25,15),
    _q("a16-l09","13-16","logical_reasoning","logic_puzzle",5,"Statement: All A are B. Some B are C. So:",["All A are C","Some A are C","No A are C","Cannot conclude"],3,"Cannot conclude.","",40,22),

    # ---- Pattern Recognition (9) ----
    _q("a16-p01","13-16","pattern_recognition","number_series",4,"2, 6, 12, 20, 30, ?",["40","42","44","46"],1,"+4,+6,+8,+10,+12 → 42.","",35,18),
    _q("a16-p02","13-16","pattern_recognition","number_series",4,"1, 1, 2, 3, 5, 8, ?",["11","12","13","15"],2,"Fib → 13.","",30,17),
    _q("a16-p03","13-16","pattern_recognition","pattern_completion",5,"3, 6, 11, 18, 27, ?",["36","38","40","42"],1,"+3,+5,+7,+9,+11 → 38.","",40,20),
    _q("a16-p04","13-16","pattern_recognition","number_series",4,"1, 8, 27, 64, ?",["100","125","144","216"],1,"n³ → 125.","",35,18),
    _q("a16-p05","13-16","pattern_recognition","alphabet_series",4,"A, C, F, J, ?",["N","O","M","L"],1,"+2,+3,+4,+5 → O.","",35,18),
    _q("a16-p06","13-16","pattern_recognition","number_series",4,"2, 3, 5, 7, 11, 13, ?",["15","17","19","21"],1,"Primes → 17.","",35,19),
    _q("a16-p07","13-16","pattern_recognition","number_series",5,"1, 2, 6, 24, 120, ?",["360","540","720","900"],2,"n! → 720.","",40,22),
    _q("a16-p08","13-16","pattern_recognition","alphabet_series",4,"Z, W, T, Q, ?",["M","N","O","P"],1,"-3 → N.","",35,18),
    _q("a16-p09","13-16","pattern_recognition","number_series",5,"1, 4, 10, 22, 46, ?",["70","82","94","106"],2,"2n+2 → 94.","",40,22),

    # ---- Visual Skills (9) ----
    _q("a16-v01","13-16","visual_intelligence","spatial_intelligence",4,"Edges of a cube:",["8","10","12","16"],2,"12.","🎲",25,15),
    _q("a16-v02","13-16","visual_intelligence","visual_puzzle",5,"3D shape with 4 triangular faces:",["Cube","Prism","Tetrahedron","Sphere"],2,"Tetrahedron.","",30,18),
    _q("a16-v03","13-16","visual_intelligence","spatial_intelligence",4,"Cube has ___ vertices:",["6","8","10","12"],1,"8.","🎲",25,15),
    _q("a16-v04","13-16","visual_intelligence","spatial_intelligence",4,"Cylinder has ___ curved surface(s):",["0","1","2","3"],1,"1.","",25,15),
    _q("a16-v05","13-16","visual_intelligence","visual_puzzle",5,"Cross-section of a cone (vertical cut):",["Circle","Triangle","Ellipse","Square"],1,"Triangle.","",35,19),
    _q("a16-v06","13-16","visual_intelligence","spatial_intelligence",4,"Regular octahedron faces:",["6","8","10","12"],1,"8.","",30,17),
    _q("a16-v07","13-16","visual_intelligence","visual_puzzle",5,"Reflect '6' vertically → looks like:",["6","9","Unchanged","0"],0,"Same (vertical axis).","",30,17),
    _q("a16-v08","13-16","visual_intelligence","spatial_intelligence",5,"Cube has ___ diagonals:",["2","3","4","6"],2,"4 space diagonals.","🎲",35,19),
    _q("a16-v09","13-16","visual_intelligence","visual_puzzle",4,"Volume of cube (side 3):",["9","18","27","36"],2,"27.","",25,15),

    # ---- Attention & Focus (9) ----
    _q("a16-a01","13-16","attention","odd_one_out",4,"Odd: 121, 144, 169, 200, 225",["121","144","200","225"],2,"200 is not a perfect square.","",35,18),
    _q("a16-a02","13-16","attention","focus_challenge",4,"Vowels in 'Extraordinary' (a,e,i,o,u only):",["4","5","6","7"],1,"5.","",30,17),
    _q("a16-a03","13-16","attention","focus_challenge",4,"How many 3's in π's first digits 3.14159265358979?",["1","2","3","4"],1,"3 (3, 3, 3).","",30,17),
    _q("a16-a04","13-16","attention","odd_one_out",4,"Odd: 2, 3, 5, 7, 9",["2","3","5","9"],3,"9 is not prime.","",30,17),
    _q("a16-a05","13-16","attention","focus_challenge",4,"How many consonants in 'PROGRAMMING'?",["7","8","9","10"],1,"8.","",30,17),
    _q("a16-a06","13-16","attention","focus_challenge",5,"Missing letter: EL_PH_NT",["E, A","P, A","L, I","E, I"],1,"P, A → ELEPHANT.","",35,19),
    _q("a16-a07","13-16","attention","odd_one_out",4,"Odd: Mercury, Venus, Earth, Sirius",["Mercury","Venus","Earth","Sirius"],3,"Sirius is a star.","⭐",25,15),
    _q("a16-a08","13-16","attention","focus_challenge",4,"Which is spelled correctly?",["Occurence","Occurence","Occurrence","Ocurrence"],2,"Occurrence.","",30,17),
    _q("a16-a09","13-16","attention","odd_one_out",5,"Odd: 1024, 2048, 4096, 8000, 8192",["1024","2048","8000","8192"],2,"8000 isn't a power of 2.","",35,20),

    # ---- Processing Speed (8) ----
    _q("a16-sp01","13-16","processing_speed","reaction_speed",4,"Quick! 17 + 24 = ?",["39","40","41","42"],2,"41.","",12,17),
    _q("a16-sp02","13-16","processing_speed","reaction_speed",4,"Quick! Bigger: 3² or 2³ ?",["3²","2³","Equal","Cannot say"],0,"9 > 8.","",12,17),
    _q("a16-sp03","13-16","processing_speed","reaction_speed",4,"Quick! 144 ÷ 12 = ?",["10","11","12","13"],2,"12.","",12,17),
    _q("a16-sp04","13-16","processing_speed","reaction_speed",4,"Quick! 15 × 15 = ?",["215","225","235","245"],1,"225.","",12,17),
    _q("a16-sp05","13-16","processing_speed","reaction_speed",4,"Quick! 20% of 350 = ?",["60","65","70","75"],2,"70.","",12,17),
    _q("a16-sp06","13-16","processing_speed","reaction_speed",5,"Quick! √196 = ?",["12","13","14","16"],2,"14.","",12,18),
    _q("a16-sp07","13-16","processing_speed","reaction_speed",4,"Quick! 2⁶ = ?",["32","48","64","128"],2,"64.","",12,17),
    _q("a16-sp08","13-16","processing_speed","reaction_speed",5,"Quick! 45 × 11 = ?",["485","495","505","515"],1,"495.","",12,18),

    # ---- Problem Solving (9) ----
    _q("a16-ps01","13-16","problem_solving","math_challenge",4,"Shirt $40 after 20% off. Original:",["$48","$50","$52","$60"],1,"$50.","",35,18),
    _q("a16-ps02","13-16","problem_solving","math_challenge",4,"Rectangle area 48, length 8. Width:",["4","5","6","8"],2,"6.","",25,15),
    _q("a16-ps03","13-16","problem_solving","math_challenge",5,"Car goes 60 mph for 2 hrs, then 40 mph for 1 hr. Total distance:",["100","140","160","180"],2,"160.","",40,20),
    _q("a16-ps04","13-16","problem_solving","math_challenge",4,"Sum of angles in a triangle:",["90°","120°","180°","360°"],2,"180°.","",25,15),
    _q("a16-ps05","13-16","problem_solving","math_challenge",5,"Investment: $1000 at 5% simple interest 3 yrs. Interest:",["$100","$150","$200","$250"],1,"$150.","💵",40,20),
    _q("a16-ps06","13-16","problem_solving","math_challenge",5,"Probability of rolling a 6 on a fair die:",["1/2","1/3","1/6","1/12"],2,"1/6.","🎲",25,17),
    _q("a16-ps07","13-16","problem_solving","math_challenge",4,"Two cards from a deck: probability both hearts (approx):",["1/2","1/4","1/17","1/52"],2,"~1/17.","🃏",40,20),
    _q("a16-ps08","13-16","problem_solving","math_challenge",5,"Rectangle 12×5. Diagonal length:",["11","12","13","17"],2,"13.","",35,20),
    _q("a16-ps09","13-16","problem_solving","math_challenge",5,"Compound interest $500 @ 10% for 2 yrs:",["$550","$605","$610","$700"],1,"$605.","",40,22),

    # ---- Math Reasoning (9) ----
    _q("a16-mth01","13-16","mathematical_thinking","math_challenge",4,"√144 = ?",["10","11","12","14"],2,"12.","",22,14),
    _q("a16-mth02","13-16","mathematical_thinking","math_challenge",5,"f(x)=2x+3, f(5)=?",["8","10","13","16"],2,"13.","",25,17),
    _q("a16-mth03","13-16","mathematical_thinking","math_challenge",4,"Solve: 2x + 4 = 20. x =",["6","7","8","10"],2,"8.","",25,15),
    _q("a16-mth04","13-16","mathematical_thinking","math_challenge",4,"Slope of y = 3x + 4:",["1","2","3","4"],2,"3.","",25,15),
    _q("a16-mth05","13-16","mathematical_thinking","math_challenge",5,"log₁₀(1000) = ?",["1","2","3","4"],2,"3.","",25,17),
    _q("a16-mth06","13-16","mathematical_thinking","math_challenge",4,"sin(90°) = ?",["0","0.5","1","√2"],2,"1.","",25,15),
    _q("a16-mth07","13-16","mathematical_thinking","math_challenge",5,"Solve x² = 49:",["±5","±6","±7","±8"],2,"±7.","",25,17),
    _q("a16-mth08","13-16","mathematical_thinking","math_challenge",5,"5! = ?",["24","60","100","120"],3,"120.","",25,17),
    _q("a16-mth09","13-16","mathematical_thinking","math_challenge",5,"2⁵ × 2³ = ?",["16","64","128","256"],3,"256.","",25,18),

    # ---- Language Skills (9) ----
    _q("a16-ln01","13-16","language_skills","word_matching",4,"Synonym of EPHEMERAL:",["Eternal","Fleeting","Solid","Ancient"],1,"Fleeting.","",25,17),
    _q("a16-ln02","13-16","language_skills","multiple_choice",4,"UBIQUITOUS means:",["Rare","Everywhere","Small","Loud"],1,"Everywhere.","",25,17),
    _q("a16-ln03","13-16","language_skills","multiple_choice",4,"MELANCHOLY means:",["Happy","Sad","Sleepy","Angry"],1,"Sad.","",25,16),
    _q("a16-ln04","13-16","language_skills","multiple_choice",4,"Antonym of BENEVOLENT:",["Kind","Malicious","Gentle","Wise"],1,"Malicious.","",25,17),
    _q("a16-ln05","13-16","language_skills","multiple_choice",4,"Which is a METAPHOR?",["He is a lion","He runs fast","He is tall","He is like a lion"],0,"'Is a lion' is metaphor.","🦁",25,17),
    _q("a16-ln06","13-16","language_skills","multiple_choice",5,"'Break a leg' means:",["Injure","Good luck","Fall","Nothing"],1,"Good luck.","🎭",25,18),
    _q("a16-ln07","13-16","language_skills","multiple_choice",4,"PROLIFIC means:",["Rare","Productive","Small","Loud"],1,"Productive.","",25,17),
    _q("a16-ln08","13-16","language_skills","multiple_choice",5,"CONUNDRUM is a:",["Puzzle","Meal","Ship","Song"],0,"Puzzle.","🧩",25,18),
    _q("a16-ln09","13-16","language_skills","multiple_choice",5,"AMBIVALENT means:",["Certain","Having mixed feelings","Happy","Fast"],1,"Mixed feelings.","",25,18),

    # ---- Creativity (bonus 2) ----
    _q("a16-cr01","13-16","creativity","multiple_choice",4,"Most divergent-thinking activity:",["Answer literally","5 uses for spoon","Copy answer","Silence"],1,"5 uses.","",30,17),
    _q("a16-cr02","13-16","creativity","multiple_choice",4,"Which is convergent thinking?",["Brainstorming","Choosing best solution","Free association","Sketching"],1,"Convergent = pick best.","",30,17),
]


# Combine all
QUESTIONS = _A5 + _A8 + _A12 + _A16


# Rebalance difficulty_label RELATIVE to each age group so every age group
# has a healthy mix of Easy / Medium / Hard (roughly bottom 33% / middle 34% / top 33%).
# This makes adaptive selection meaningful across all ages.
def _rebalance_difficulty_labels():
    """Split each age group's questions into balanced Easy / Medium / Hard buckets.
    Bottom ~33% by difficulty → Easy, middle ~34% → Medium, top ~33% → Hard."""
    from collections import defaultdict
    by_age = defaultdict(list)
    for q in QUESTIONS:
        by_age[q["age_group"]].append(q)
    for _age, qs in by_age.items():
        qs.sort(key=lambda x: (x["difficulty"], x["id"]))
        n = len(qs)
        easy_cut = n // 3
        hard_cut = n - n // 3
        for i, q in enumerate(qs):
            if i < easy_cut:
                q["difficulty_label"] = "Easy"
            elif i < hard_cut:
                q["difficulty_label"] = "Medium"
            else:
                q["difficulty_label"] = "Hard"


_rebalance_difficulty_labels()


# ---- Helpers -----------------------------------------------------------------
def get_questions_by_age(age_group: str):
    return [q for q in QUESTIONS if q["age_group"] == age_group and q["status"] == "active"]


def public_view(q):
    """Strip answer/explanation for client-facing question."""
    return {k: v for k, v in q.items() if k not in ("answer", "explanation")}


def question_index():
    return {q["id"]: q for q in QUESTIONS}
