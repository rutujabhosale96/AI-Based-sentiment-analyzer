import logging
import re
from datetime import datetime
from .db import get_db

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# Simple keyword-based sentiment analyzer
# No PyTorch / HuggingFace needed!
# ─────────────────────────────────────────────

POSITIVE_WORDS = set([
    "good", "great", "excellent", "amazing", "wonderful", "fantastic", "awesome",
    "love", "like", "happy", "best", "perfect", "brilliant", "superb", "nice",
    "beautiful", "enjoy", "positive", "incredible", "outstanding", "pleased",
    "glad", "joy", "fun", "success", "recommend", "helpful", "easy", "fast",
    "clean", "impressive", "comfortable", "friendly", "reliable", "efficient",
    "useful", "delightful", "refreshing", "satisfied", "worth", "win", "bright",
    "hopeful", "excited", "grateful", "thankful", "loyal", "innovative", "smooth",
])

NEGATIVE_WORDS = set([
    "bad", "terrible", "awful", "horrible", "worst", "hate", "dislike", "poor",
    "disappointing", "disappointed", "boring", "ugly", "slow", "difficult", "broken",
    "fail", "failure", "error", "problem", "issue", "waste", "useless", "annoying",
    "frustrating", "mediocre", "painful", "sad", "angry", "upset", "negative",
    "wrong", "danger", "dangerous", "fear", "scared", "rude", "offensive",
    "confusing", "unreliable", "cheap", "lousy", "horrible", "disgusting", "regret",
    "avoid", "never", "complaint", "unhappy", "refuse", "reject",
])

NEGATION_WORDS = {"not", "no", "never", "n't", "don't", "doesn't",
                  "didn't", "won't", "can't", "cannot", "hardly", "barely"}


def analyze_text(text: str) -> dict:
    """
    Analyze sentiment using keyword matching — no ML models needed.
    Returns dict with label, confidence, and scores.
    """
    words = re.findall(r"\b\w+\b", text.lower())

    pos_count = 0
    neg_count = 0
    total_words = len(words)

    i = 0
    while i < len(words):
        word = words[i]
        # Check if previous word was a negation
        negated = (i > 0 and words[i - 1] in NEGATION_WORDS)

        if word in POSITIVE_WORDS:
            if negated:
                neg_count += 1
            else:
                pos_count += 1
        elif word in NEGATIVE_WORDS:
            if negated:
                pos_count += 1
            else:
                neg_count += 1
        i += 1

    total_sentiment = pos_count + neg_count

    if total_sentiment == 0:
        # No sentiment words found → neutral
        scores = {"positive": 0.1, "negative": 0.1, "neutral": 0.8}
        label = "neutral"
        confidence = 80.0
    else:
        pos_score = round(pos_count / (total_sentiment + 1e-9), 4)
        neg_score = round(neg_count / (total_sentiment + 1e-9), 4)
        neu_score = round(max(0, 1 - pos_score - neg_score), 4)

        # Re-normalize
        total = pos_score + neg_score + neu_score
        scores = {
            "positive": round(pos_score / total, 4),
            "negative": round(neg_score / total, 4),
            "neutral":  round(neu_score / total, 4),
        }

        label = max(scores, key=scores.get)
        confidence = round(scores[label] * 100, 1)

    return {
        "label": label,
        "confidence": confidence,
        "scores": scores,
    }


def analyze_and_store(text: str, source: str = "manual", metadata: dict = None) -> dict:
    """Analyze sentiment and store result in in-memory DB."""
    result = analyze_text(text)
    db = get_db()

    document = {
        "text": text,
        "source": source,
        "label": result["label"],
        "confidence": result["confidence"],
        "scores": result["scores"],
        "metadata": metadata or {},
        "created_at": datetime.utcnow().isoformat(),
    }

    insert_result = db["analyses"].insert_one(document)
    document["id"] = str(insert_result.inserted_id)
    document.pop("_id", None)
    return document


def bulk_analyze(texts: list, source: str = "bulk") -> list:
    """Analyze multiple texts and store all results."""
    results = []
    for text in texts:
        if text.strip():
            results.append(analyze_and_store(text.strip(), source=source))
    return results


def get_all_analyses(limit: int = 100) -> list:
    """Retrieve recent analyses from in-memory DB."""
    db = get_db()
    docs = list(db["analyses"].find({}))
    for doc in docs:
        doc.pop("_id", None)
    docs.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return docs[:limit]


def get_summary_stats() -> dict:
    """Compute aggregate sentiment statistics."""
    db = get_db()
    total = db["analyses"].count_documents({})
    counts = {"positive": 0, "negative": 0, "neutral": 0}
    all_docs = list(db["analyses"].find({}))

    for doc in all_docs:
        label = doc.get("label", "neutral")
        counts[label] = counts.get(label, 0) + 1

    avg_confidence = 0.0
    if all_docs:
        avg_confidence = round(
            sum(doc.get("confidence", 0) for doc in all_docs) / len(all_docs), 1
        )

    return {
        "total": total,
        "counts": counts,
        "avg_confidence": avg_confidence,
        "percentages": {
            k: round((v / total * 100), 1) if total > 0 else 0
            for k, v in counts.items()
        },
    }


def clear_all_analyses():
    """Delete all analyses."""
    db = get_db()
    db["analyses"].delete_many({})
