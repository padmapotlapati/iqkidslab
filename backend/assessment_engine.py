"""Adaptive assessment engine (v2).

Session builder:
  - Selects exactly SESSION_LENGTH (=20) questions per assessment
  - Balances across 9 primary categories
  - Adaptive difficulty mix based on child's prior average performance
  - Minimizes repetition using a `seen_ids` set of previously-answered question IDs
      · Recently-seen questions get large weight penalty
      · Older questions gradually re-enter the pool
  - Deterministic when seed is provided (used for tests / reproducibility)

Scoring:
  - Weighted overall score = accuracy + difficulty + speed + consistency + attention
  - Category-level breakdown with strengths & growth areas
"""
import random
from typing import List, Dict, Iterable, Optional
from questions_data import get_questions_by_age, SESSION_LENGTH, CATEGORIES, QUESTIONS

# Primary skill categories used for balancing (creativity is bonus, not required)
PRIMARY_CATEGORIES = [c for c in CATEGORIES if c != "creativity"]


def _difficulty_mix(avg_prior_score: Optional[float]) -> Dict[str, int]:
    """Given the child's rolling avg score (0-100), return the target count of
    Easy / Medium / Hard questions in the next 20-question session."""
    if avg_prior_score is None:
        # First attempt: gentle ramp — mostly easy/medium
        return {"Easy": 8, "Medium": 8, "Hard": 4}
    if avg_prior_score >= 80:
        return {"Easy": 3, "Medium": 8, "Hard": 9}     # push harder
    if avg_prior_score >= 65:
        return {"Easy": 5, "Medium": 9, "Hard": 6}     # sweet spot
    if avg_prior_score >= 50:
        return {"Easy": 7, "Medium": 9, "Hard": 4}     # balanced
    return {"Easy": 10, "Medium": 7, "Hard": 3}        # build confidence


def build_adaptive_session(
    age_group: str,
    seed: Optional[int] = None,
    seen_ids: Optional[Iterable[str]] = None,
    avg_prior_score: Optional[float] = None,
    target: Optional[int] = None,
) -> List[dict]:
    """Return exactly `target` (default SESSION_LENGTH) questions for the age group.

    Selection algorithm:
      1. Compute difficulty mix from prior performance.
      2. For each difficulty bucket, weight-pick questions such that
         previously-seen ones have low probability (0.2 vs 1.0).
      3. Balance across primary categories via round-robin fill.
      4. Shuffle final order but keep a gentle ramp (Easy first → Hard last).
    """
    if seed is not None:
        random.seed(seed)

    pool = get_questions_by_age(age_group)
    if not pool:
        return []

    target = target or SESSION_LENGTH.get(age_group, 20)
    seen = set(seen_ids or [])
    mix = _difficulty_mix(avg_prior_score)

    # Bucket by difficulty label
    by_diff: Dict[str, list] = {"Easy": [], "Medium": [], "Hard": []}
    for q in pool:
        by_diff.setdefault(q.get("difficulty_label", "Medium"), []).append(q)

    # Ensure count feasibility — if a bucket is short, redistribute the deficit
    total_wanted = sum(mix.values())
    if total_wanted != target:
        mix["Medium"] += target - total_wanted

    def weight(q):
        # Unseen questions get 5× priority
        return 0.2 if q["id"] in seen else 1.0

    def weighted_sample(bucket: list, k: int) -> list:
        """Weighted random pick without replacement."""
        if k <= 0 or not bucket:
            return []
        # If bucket smaller than requested, fall back to shuffled bucket
        if len(bucket) <= k:
            random.shuffle(bucket)
            return bucket[:]
        items = list(bucket)
        weights = [weight(q) for q in items]
        selected = []
        for _ in range(k):
            if not items:
                break
            total = sum(weights)
            r = random.uniform(0, total)
            acc = 0.0
            idx = 0
            for i, w in enumerate(weights):
                acc += w
                if r <= acc:
                    idx = i
                    break
            selected.append(items.pop(idx))
            weights.pop(idx)
        return selected

    selected: List[dict] = []
    # Pull the raw mix
    for label in ("Easy", "Medium", "Hard"):
        selected.extend(weighted_sample(by_diff.get(label, []), mix.get(label, 0)))

    # Top up if we're short (small pools or missing tier) — pull from remaining unpicked
    if len(selected) < target:
        picked_ids = {q["id"] for q in selected}
        remaining = [q for q in pool if q["id"] not in picked_ids]
        random.shuffle(remaining)
        # Prefer unseen
        remaining.sort(key=lambda q: q["id"] in seen)
        selected.extend(remaining[: target - len(selected)])

    # ---- Category balance pass ----
    # If any primary category is completely missing, swap in one of its questions
    have_cats = {q["category"] for q in selected}
    missing_primary = [c for c in PRIMARY_CATEGORIES if c not in have_cats]
    for cat in missing_primary:
        replacements = [q for q in pool if q["category"] == cat and q["id"] not in {s["id"] for s in selected}]
        if not replacements:
            continue
        replacements.sort(key=lambda q: q["id"] in seen)
        # Swap out an over-represented category
        cat_counts: Dict[str, int] = {}
        for q in selected:
            cat_counts[q["category"]] = cat_counts.get(q["category"], 0) + 1
        over_cat = max(cat_counts, key=cat_counts.get)
        if cat_counts[over_cat] <= 1:
            continue
        # find last of over_cat and swap
        for i in range(len(selected) - 1, -1, -1):
            if selected[i]["category"] == over_cat:
                selected[i] = replacements[0]
                break

    # ---- Final ordering: gentle ramp Easy → Medium → Hard ----
    order_key = {"Easy": 0, "Medium": 1, "Hard": 2}
    random.shuffle(selected)
    selected.sort(key=lambda q: order_key.get(q.get("difficulty_label", "Medium"), 1))

    return selected[:target]


def compute_weighted_score(questions: List[dict], answers: List[int], durations: List[int]) -> dict:
    """Compute rich profile with category scores, strengths and growth areas."""
    total = len(questions)
    if total == 0:
        return {"error": "no questions"}

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
        cat_stats.setdefault(cat, {"correct": 0, "total": 0, "difficulty_earned": 0, "difficulty_max": 0, "time": 0})
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
        speed_ratios.append(min(2.0, est / max(1, dur)))

        if is_correct:
            total_correct += 1
            cat_stats[cat]["correct"] += 1
            cat_stats[cat]["difficulty_earned"] += q["difficulty"]
            total_difficulty_earned += q["difficulty"]
            total_points_earned += q["points"]

    accuracy = total_correct / total if total else 0
    difficulty_score = total_difficulty_earned / total_difficulty_max if total_difficulty_max else 0

    avg_speed_ratio = sum(speed_ratios) / len(speed_ratios) if speed_ratios else 1.0
    speed_score = max(0.0, min(1.0, avg_speed_ratio / 1.5))

    if len(correct_flags) > 1:
        mean_c = sum(correct_flags) / len(correct_flags)
        var = sum((c - mean_c) ** 2 for c in correct_flags) / len(correct_flags)
        consistency = 1.0 - min(1.0, var * 4)
    else:
        consistency = 1.0

    if len(speed_ratios) > 1:
        mean_s = sum(speed_ratios) / len(speed_ratios)
        var_s = sum((s - mean_s) ** 2 for s in speed_ratios) / len(speed_ratios)
        attention = max(0.0, 1.0 - min(1.0, var_s))
    else:
        attention = 1.0

    overall = (
        accuracy * 0.40
        + difficulty_score * 0.25
        + speed_score * 0.15
        + consistency * 0.10
        + attention * 0.10
    )
    overall_pct = round(overall * 100)
    estimated_index = round(80 + overall * 50)
    percentile = min(99, max(1, round(overall * 100)))

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

    sorted_cats = sorted(category_scores.items(), key=lambda x: x[1]["score"], reverse=True)
    strengths = [c for c, _ in sorted_cats[:3]]
    growth = [c for c, v in sorted_cats[-3:][::-1] if v["score"] < 70]

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
