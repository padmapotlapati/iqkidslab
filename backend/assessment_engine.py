"""Adaptive test engine + weighted scoring."""
import random
from typing import List, Dict
from questions_data import get_questions_by_age, SESSION_LENGTH, CATEGORIES


def build_adaptive_session(age_group: str, seed: int = None) -> List[dict]:
    """Pick a balanced, randomized starting set. Adaptive difficulty applies at scoring time.

    Strategy:
      - Pull all questions for the age group
      - Ensure each category is represented if available
      - Start with difficulty ~2 (medium-low)
      - Cap length at SESSION_LENGTH[age_group]
      - Shuffle within selected pool
    """
    if seed is not None:
        random.seed(seed)
    pool = get_questions_by_age(age_group)
    if not pool:
        return []
    target = SESSION_LENGTH.get(age_group, 10)

    # Group by category
    by_cat: Dict[str, list] = {}
    for q in pool:
        by_cat.setdefault(q["category"], []).append(q)

    # Sort each category by difficulty ascending
    for cat in by_cat:
        by_cat[cat].sort(key=lambda x: x["difficulty"])

    # Round-robin pick to balance categories
    selected = []
    idx = 0
    cats = list(by_cat.keys())
    random.shuffle(cats)
    while len(selected) < target and any(by_cat[c] for c in cats):
        c = cats[idx % len(cats)]
        if by_cat[c]:
            selected.append(by_cat[c].pop(0))
        idx += 1

    # Shuffle final order but keep gentle ramp (sort by difficulty roughly)
    random.shuffle(selected)
    selected.sort(key=lambda q: q["difficulty"])
    return selected[:target]


def compute_weighted_score(questions: List[dict], answers: List[int], durations: List[int]) -> dict:
    """
    Weighted score based on:
      - accuracy (correct/total)
      - speed (avg time vs estimated_time)
      - difficulty of correctly answered questions
      - consistency (variance of correctness)
      - attention (based on speed variance & completion)

    Returns a rich profile including category scores, percentiles, strengths, growth.
    """
    total = len(questions)
    if total == 0:
        return {"error": "no questions"}

    # Per-category tallies
    cat_stats: Dict[str, Dict] = {c: {"correct": 0, "total": 0, "difficulty_earned": 0, "difficulty_max": 0, "time": 0} for c in CATEGORIES}

    total_correct = 0
    total_difficulty_earned = 0
    total_difficulty_max = 0
    total_points_earned = 0
    total_points_max = 0
    correct_flags = []
    speed_ratios = []

    for i, q in enumerate(questions):
        cat = q["category"]
        cat_stats[cat]["total"] += 1
        cat_stats[cat]["difficulty_max"] += q["difficulty"]
        total_difficulty_max += q["difficulty"]
        total_points_max += q["points"]

        ans_given = answers[i] if i < len(answers) else -1
        is_correct = ans_given == q["answer"]
        correct_flags.append(1 if is_correct else 0)

        dur = durations[i] if i < len(durations) else q["estimated_time"]
        cat_stats[cat]["time"] += dur
        est = max(1, q["estimated_time"])
        speed_ratios.append(min(2.0, est / max(1, dur)))  # higher = faster than expected

        if is_correct:
            total_correct += 1
            cat_stats[cat]["correct"] += 1
            cat_stats[cat]["difficulty_earned"] += q["difficulty"]
            total_difficulty_earned += q["difficulty"]
            total_points_earned += q["points"]

    accuracy = total_correct / total if total else 0
    difficulty_score = total_difficulty_earned / total_difficulty_max if total_difficulty_max else 0

    # Speed score: avg ratio capped 0..1.5 → normalize to 0..1
    avg_speed_ratio = sum(speed_ratios) / len(speed_ratios) if speed_ratios else 1.0
    speed_score = max(0.0, min(1.0, (avg_speed_ratio) / 1.5))

    # Consistency: 1 - std deviation of correctness
    if len(correct_flags) > 1:
        mean_c = sum(correct_flags) / len(correct_flags)
        var = sum((c - mean_c) ** 2 for c in correct_flags) / len(correct_flags)
        consistency = 1.0 - min(1.0, var * 4)  # var max at 0.25 for random -> 0
    else:
        consistency = 1.0

    # Attention: less variance in speed = better focus
    if len(speed_ratios) > 1:
        mean_s = sum(speed_ratios) / len(speed_ratios)
        var_s = sum((s - mean_s) ** 2 for s in speed_ratios) / len(speed_ratios)
        attention = max(0.0, 1.0 - min(1.0, var_s))
    else:
        attention = 1.0

    # Weighted overall (0..1)
    overall = (
        accuracy * 0.40
        + difficulty_score * 0.25
        + speed_score * 0.15
        + consistency * 0.10
        + attention * 0.10
    )
    overall_pct = round(overall * 100)

    # Estimated cognitive index (80 - 130 educational estimate, NOT clinical IQ)
    estimated_index = round(80 + overall * 50)

    # Percentile (heuristic, educational only)
    percentile = min(99, max(1, round(overall * 100)))

    # Category percentages + percentiles
    category_scores = {}
    for cat, s in cat_stats.items():
        if s["total"] == 0:
            continue
        cat_acc = s["correct"] / s["total"]
        cat_diff = s["difficulty_earned"] / s["difficulty_max"] if s["difficulty_max"] else 0
        cat_score = cat_acc * 0.65 + cat_diff * 0.35
        category_scores[cat] = {
            "correct": s["correct"],
            "total": s["total"],
            "percentage": round(cat_acc * 100),
            "score": round(cat_score * 100),
            "percentile": min(99, max(1, round(cat_score * 100))),
        }

    # Strengths & growth areas (top 3 / bottom 3 by score)
    sorted_cats = sorted(category_scores.items(), key=lambda x: x[1]["score"], reverse=True)
    strengths = [c for c, _ in sorted_cats[:3]]
    growth = [c for c, _ in sorted_cats[-3:][::-1] if _["score"] < 70]

    return {
        "overall_score": overall_pct,
        "estimated_index": estimated_index,
        "percentile": percentile,
        "accuracy": round(accuracy * 100),
        "speed_score": round(speed_score * 100),
        "difficulty_score": round(difficulty_score * 100),
        "consistency": round(consistency * 100),
        "attention": round(attention * 100),
        "total_correct": total_correct,
        "total_questions": total,
        "total_points_earned": total_points_earned,
        "total_points_max": total_points_max,
        "category_scores": category_scores,
        "strengths": strengths,
        "growth_areas": growth,
    }
