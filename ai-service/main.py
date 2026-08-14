"""
AI microservice for the Interview Platform.
Handles answer scoring, follow-up question generation, and resume matching.

Run locally:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import re

app = FastAPI(title="AI Interview Evaluation Service")

# Day 32: expanded filler word list — includes multi-word phrases, checked separately below
FILLER_WORDS = {
    "um", "uh", "uhh", "umm", "like", "actually", "basically", "literally",
    "you know", "sort of", "kind of", "i mean", "right", "so yeah",
}

# Day 31: hedging (uncertain) vs assertive (confident) language markers
HEDGING_PHRASES = {
    "i think", "maybe", "i guess", "probably", "not sure", "i'm not sure",
    "kind of", "sort of", "possibly", "might be", "i could be wrong",
}
CONFIDENT_PHRASES = {
    "definitely", "certainly", "i'm confident", "clearly", "for sure",
    "without a doubt", "i know", "absolutely",
}


class EvaluateRequest(BaseModel):
    question: str
    answer: str
    expected_keywords: List[str] = []
    persona: str = "friendly"  # Day 35: 'friendly' | 'strict' | 'technical'


class FollowUpRequest(BaseModel):
    previous_question: str
    previous_answer: str


class ResumeMatchRequest(BaseModel):
    resume_text: str
    job_description: str


def count_filler_words(text: str) -> int:
    text_lower = text.lower()
    words = re.findall(r"\b\w+\b", text_lower)
    single_word_count = sum(1 for w in words if w in FILLER_WORDS)
    # also count multi-word filler phrases directly against the raw text
    phrase_count = sum(text_lower.count(phrase) for phrase in FILLER_WORDS if " " in phrase)
    return single_word_count + phrase_count


def detect_sentiment(text: str) -> str:
    """
    Day 31: lightweight confidence/tone detection based on hedging vs assertive
    language markers. Not a full NLP sentiment model, but genuinely useful signal
    for interview coaching — candidates who hedge excessively read as less confident.
    """
    text_lower = text.lower()
    hedge_count = sum(text_lower.count(phrase) for phrase in HEDGING_PHRASES)
    confident_count = sum(text_lower.count(phrase) for phrase in CONFIDENT_PHRASES)

    if hedge_count > confident_count and hedge_count >= 2:
        return "uncertain"
    if confident_count > hedge_count:
        return "confident"
    return "neutral"


def keyword_coverage_score(answer: str, keywords: List[str]) -> float:
    if not keywords:
        return 50.0  # neutral baseline if no keywords defined
    answer_lower = answer.lower()
    hits = sum(1 for kw in keywords if kw.lower() in answer_lower)
    return round((hits / len(keywords)) * 100, 2)


def build_feedback(persona: str, filler_count: int, keyword_score: float, length_score: float, sentiment: str) -> str:
    """Day 35: same underlying scoring, but feedback tone/wording shifts per persona."""
    parts = []

    if persona == "strict":
        if filler_count > 3:
            parts.append(f"Too many filler words ({filler_count}) — this reads as unprepared. Cut them entirely.")
        if keyword_score < 40:
            parts.append("Missing core concepts. This answer would not pass a real technical screen.")
        if length_score < 30:
            parts.append("Far too brief. Expand with specifics and reasoning.")
        if sentiment == "uncertain":
            parts.append("You hedge too much — state your answer with conviction.")
        if not parts:
            parts.append("Acceptable. Keep answers this tight and precise.")

    elif persona == "technical":
        if keyword_score < 40:
            parts.append(f"Technical coverage is low ({keyword_score}%) — revisit the core concepts this question targets.")
        if filler_count > 3:
            parts.append(f"Filler word count: {filler_count}. Minor, but tighten delivery.")
        if length_score < 30:
            parts.append("Add more technical depth — walk through complexity, trade-offs, or edge cases.")
        if not parts:
            parts.append(f"Good technical coverage ({keyword_score}%) with solid depth.")

    else:  # friendly (default)
        if filler_count > 3:
            parts.append(f"Nice effort! Try to reduce filler words (detected {filler_count}) for a smoother delivery.")
        if keyword_score < 40:
            parts.append("You're on the right track, but try covering a few more key concepts expected here.")
        if length_score < 30:
            parts.append("Good start — consider elaborating a bit more to fully showcase your knowledge.")
        if sentiment == "uncertain":
            parts.append("You've got the right idea — try stating it a bit more confidently!")
        if not parts:
            parts.append("Great answer — clear structure and good coverage of key points!")

    return " ".join(parts)


@app.post("/evaluate")
def evaluate_answer(req: EvaluateRequest):
    """
    Baseline scoring logic (replace with a real LLM call / fine-tuned model).
    This keeps the endpoint functional out of the box; swap in an
    Anthropic/OpenAI API call here for real AI-generated feedback.
    """
    filler_count = count_filler_words(req.answer)
    keyword_score = keyword_coverage_score(req.answer, req.expected_keywords)
    sentiment = detect_sentiment(req.answer)

    length_score = min(len(req.answer.split()) / 50 * 100, 100)  # reward reasonably detailed answers
    final_score = round((keyword_score * 0.6) + (length_score * 0.4), 2)

    feedback = build_feedback(req.persona, filler_count, keyword_score, length_score, sentiment)

    return {
        "score": final_score,
        "feedback": feedback,
        "filler_word_count": filler_count,
        "sentiment": sentiment,
    }


@app.post("/follow-up")
def follow_up_question(req: FollowUpRequest):
    # Placeholder — replace with an LLM call using previous Q&A as context
    return {"question": f"Can you elaborate further on: '{req.previous_answer[:60]}...'?"}


@app.post("/resume-match")
def resume_match(req: ResumeMatchRequest):
    jd_words = set(re.findall(r"\b[a-zA-Z]{3,}\b", req.job_description.lower()))
    resume_words = set(re.findall(r"\b[a-zA-Z]{3,}\b", req.resume_text.lower()))

    overlap = jd_words & resume_words
    missing = list(jd_words - resume_words)[:10]
    match_score = round((len(overlap) / max(len(jd_words), 1)) * 100, 2)

    study_plan = [
        {
            "skill": skill,
            "suggestion": f"Spend focused time learning '{skill}' — add a small project or bullet point demonstrating it on your resume.",
        }
        for skill in missing[:6]
    ]

    return {
        "match_score": match_score,
        "missing_skills": missing,
        "suggestions": [f"Consider highlighting experience with '{skill}'" for skill in missing[:5]],
        "study_plan": study_plan,
    }


@app.get("/health")
def health():
    return {"status": "ok"}